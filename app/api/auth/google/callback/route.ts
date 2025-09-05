import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserProfile } from '@/lib/google/auth';
import { initializeGoogleConnection } from '@/lib/google/token-manager';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/security/auth-middleware';
import { createServerClient } from '@supabase/ssr';
import { log } from '@/lib/logger';
import { logDomainInfo, isVercelPreview } from '@/lib/vercel/domain-utils';

// GET /api/auth/google/callback - Secure Google OAuth callback handler
// Handle both GET and HEAD requests for OAuth callback
export async function GET(request: NextRequest) {
  return handleOAuthCallback(request);
}

export async function HEAD(request: NextRequest) {
  // HEAD requests are Next.js prefetch/health checks - return 200 without processing
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  log.debug('✅ HEAD request to OAuth callback (Next.js prefetch) - returning 200:', {
    ip: clientIp,
    url: request.url,
    userAgent: request.headers.get('user-agent')?.substring(0, 50),
    referer: request.headers.get('referer')
  });
  
  return new Response(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

async function handleOAuthCallback(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  // 🚨 LOG DOMAIN INFORMATION FOR DEBUGGING
  logDomainInfo(request, 'OAuth Callback');
  
  try {
    // 1. Rate limiting - prevent callback abuse
    const { allowed } = checkRateLimit(
      `callback_${clientIp}`,
      10, // 10 callback attempts per hour per IP
      3600000
    );
    
    if (!allowed) {
      log.warn('OAuth callback rate limit exceeded:', { ip: clientIp });
        const rateLimitUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Too+many+attempts`;
        return NextResponse.redirect(rateLimitUrl);
    }

    // 2. Extract and validate callback parameters
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // 🚨 CRITICAL DEBUG: Log all callback parameters
    log.info('🔍 OAUTH CALLBACK DEBUG - All parameters:', {
      ip: clientIp,
      fullUrl: request.url,
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      codePreview: code ? code.substring(0, 20) + '...' : null,
      statePreview: state ? state.substring(0, 20) + '...' : null,
      errorValue: error,
      allParams: Object.fromEntries(url.searchParams.entries()),
      method: request.method,
      headers: {
        host: request.headers.get('host'),
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
        referer: request.headers.get('referer')
      }
    });

    // 3. Check for OAuth errors from Google
    if (error) {
      log.error('Google OAuth error received:', { 
        error, 
        ip: clientIp,
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      });
      const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=${encodeURIComponent(error)}`;
      return NextResponse.redirect(errorUrl);
    }

    // 4. Validate required parameters
    if (!code) {
      // Check if this was a user cancellation or other specific error
      const errorDescription = url.searchParams.get('error_description');
      const errorReason = url.searchParams.get('error_reason');
      
      log.error('❌ Missing authorization code in callback:', { 
        ip: clientIp,
        error: error || 'no_error_param',
        errorDescription: errorDescription || 'no_description',
        errorReason: errorReason || 'no_reason',
        allParams: Object.fromEntries(url.searchParams.entries()),
        possibleCause: !error ? 'direct_access_or_invalid_request' : 'oauth_error'
      });
      
      const errorMessage = error === 'access_denied' 
        ? 'User cancelled authentication'
        : 'Invalid callback parameters';
        
      const callbackErrorUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=${encodeURIComponent(errorMessage)}`;
      return NextResponse.redirect(callbackErrorUrl);
    }

    // 5. Validate session cookies and CSRF state
    const cookieStore = await cookies();
    const userId = cookieStore.get('google_auth_user_id')?.value;
    const signinState = cookieStore.get('google_signin_state')?.value;
    const storedState = cookieStore.get('google_auth_state')?.value || signinState;

    // Check if this is a signin flow - prioritize signin state or no user ID as signin
    const isSigninFlow = !userId || !!signinState;

    // Validate state token for CSRF protection
    if (!storedState) {
      log.error('No OAuth state found in cookies:', { 
        ip: clientIp,
        hasSigninState: !!signinState,
        allCookiesCount: cookieStore.getAll().length
      });
      const sessionExpiredUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Session+expired`;
      return NextResponse.redirect(sessionExpiredUrl);
    }

    if (storedState !== state) {
      log.error('CSRF state validation failed:', { 
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        ip: clientIp,
        hasStoredState: !!storedState,
        hasCallbackState: !!state,
        isSigninFlow
      });
        const securityErrorUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Security+validation+failed`;
        return NextResponse.redirect(securityErrorUrl);
    }

    try {
      // 6. Exchange authorization code for tokens with timeout
      log.debug('Exchanging authorization code for tokens:', {
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        ip: clientIp,
        isSigninFlow
      });
      
      const tokens = await Promise.race([
        exchangeCodeForTokens(code),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Token exchange timeout')), 10000))
      ]) as Awaited<ReturnType<typeof exchangeCodeForTokens>>;

      // 7. Validate tokens by getting user profile with timeout
      log.debug('Validating tokens with user profile request:', {
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        isSigninFlow
      });
      
      const profile = await Promise.race([
        getUserProfile(tokens.access_token),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('User profile request timeout')), 10000))
      ]) as Awaited<ReturnType<typeof getUserProfile>>;

      if (!profile.verified_email) {
        log.warn('Google account email not verified:', {
          userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
          email: profile.email,
          isSigninFlow
        });
        
        const emailNotVerifiedUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Email+not+verified`;
        return NextResponse.redirect(emailNotVerifiedUrl);
      }

      // 8. Handle user authentication/creation based on flow type
      let actualFinalUserId: string = userId || '';

      if (isSigninFlow) {
        // For signin flow, create or authenticate user with Supabase
        log.debug('Processing signin flow - creating/authenticating user:', {
          googleEmail: profile.email
        });

        // Create Supabase client for authentication
        const cookieStore = await cookies();
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            cookies: {
              getAll() {
                return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options);
                });
              },
            },
          }
        );

        try {
          // Try to find existing user or create new one
          let userData = null;
          
          // First try to find existing user by email
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(user => user.email === profile.email);
          
          if (existingUser) {
            // User exists, generate magic link for existing user
            userData = { user: existingUser };
            log.debug('Existing user found for Google signin:', {
              userId: existingUser.id.substring(0, 8) + '...',
              googleEmail: profile.email
            });
          } else {
            // Create new user
            const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
              email: profile.email,
              email_confirm: true,
              user_metadata: {
                name: profile.name,
                picture: profile.picture,
                google_id: profile.id,
                auth_provider: 'google'
              }
            });

            if (createError) {
              log.error('Failed to create user via Google signin:', {
                error: createError.message,
                googleEmail: profile.email
              });
              const userCreationFailedUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=User+creation+failed`;
              return NextResponse.redirect(userCreationFailedUrl);
            }

            userData = newUserData;
            log.debug('New user created via Google signin:', {
              userId: newUserData?.user?.id?.substring(0, 8) + '...',
              googleEmail: profile.email
            });
          }

          if (!userData?.user?.id) {
            log.error('No user ID available after Google signin:', { googleEmail: profile.email });
            const noUserIdUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=User+creation+failed`;
            return NextResponse.redirect(noUserIdUrl);
          }

          actualFinalUserId = userData.user.id;

          // Generate magic link for automatic login
          const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: profile.email,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard`,
            }
          });

          if (magicLinkError || !magicLinkData?.properties?.action_link) {
            log.error('Failed to generate magic link:', {
              error: magicLinkError?.message,
              userId: actualFinalUserId.substring(0, 8) + '...'
            });
            const magicLinkFailedUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Session+creation+failed`;
            return NextResponse.redirect(magicLinkFailedUrl);
          }

          log.info('✅ Magic link generated, redirecting for auto-login:', {
            userId: actualFinalUserId.substring(0, 8) + '...',
            email: profile.email,
            flow: 'magic-link-signin'
          });

          // Clean up temporary OAuth cookies
          const response = NextResponse.redirect(magicLinkData.properties.action_link);
          response.cookies.delete('google_auth_user_id');
          response.cookies.delete('google_auth_state'); 
          response.cookies.delete('google_signin_state');
          
          return response;
        } catch (authError) {
          log.error('Error during signin flow authentication:', {
            error: authError instanceof Error ? authError.message : 'Unknown error',
            googleEmail: profile.email
          });
          const authFailedUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Authentication+failed`;
          return NextResponse.redirect(authFailedUrl);
        }
      }

      // 9. Initialize secure Google connection
      // 🚨 CRITICAL VALIDATION BEFORE TOKEN STORAGE
      if (!actualFinalUserId || actualFinalUserId.trim() === '') {
        log.error('❌ CRITICAL: No valid userId for token storage:', {
          actualFinalUserId,
          isSigninFlow,
          ip: clientIp,
          googleEmail: profile.email
        });
        const criticalUserIdUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=User+creation+failed`;
        return NextResponse.redirect(criticalUserIdUrl);
      }

      if (!tokens || !tokens.access_token) {
        log.error('❌ CRITICAL: No valid tokens received:', {
          userId: actualFinalUserId.substring(0, 8) + '...',
          hasTokens: !!tokens,
          hasAccessToken: !!tokens?.access_token,
          ip: clientIp
        });
        const invalidTokensUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Invalid+tokens`;
        return NextResponse.redirect(invalidTokensUrl);
      }

      log.info('🚀 Initializing encrypted Google connection:', {
        userId: actualFinalUserId.substring(0, 8) + '...',
        googleEmail: profile.email,
        hasValidTokens: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        isSigninFlow,
        ip: clientIp
      });
      
      try {
        await initializeGoogleConnection(actualFinalUserId, tokens, profile.email);
        log.info('✅ Google connection initialized successfully:', {
          userId: actualFinalUserId.substring(0, 8) + '...',
          email: profile.email
        });
      } catch (tokenStorageError) {
        log.error('❌ CRITICAL: Failed to initialize Google connection:', {
          error: tokenStorageError instanceof Error ? tokenStorageError.message : 'Unknown error',
          userId: actualFinalUserId.substring(0, 8) + '...',
          email: profile.email,
          stack: tokenStorageError instanceof Error ? tokenStorageError.stack : undefined
        });
        
        // ROLLBACK user creation if this was a signin flow
        if (isSigninFlow && actualFinalUserId) {
          try {
            const supabase = createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!,
              { cookies: { getAll: () => [], setAll: () => {} } }
            );
            await supabase.auth.admin.deleteUser(actualFinalUserId);
            log.info('🗑️ Rolled back user creation due to token storage failure:', {
              userId: actualFinalUserId.substring(0, 8) + '...'
            });
          } catch (rollbackError) {
            log.error('❌ Failed to rollback user creation:', {
              error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
              userId: actualFinalUserId.substring(0, 8) + '...'
            });
          }
        }
        
        // REDIRECT WITH ERROR instead of continuing
        const tokenStorageFailedUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Connection+setup+failed`;
        const response = NextResponse.redirect(tokenStorageFailedUrl);
        
        // Clean up OAuth cookies
        response.cookies.delete('google_auth_user_id');
        response.cookies.delete('google_auth_state');
        response.cookies.delete('google_signin_state');
        
        return response;
      }

      // 10. ✅ Google connection established successfully - redirect to dashboard
      log.info('🎯 OAuth connection flow completed successfully:', {
        userId: actualFinalUserId.substring(0, 8) + '...',
        googleEmail: profile.email,
        ip: clientIp,
        flow: 'google-connection'
      });

      // Create success redirect to dashboard
      const successUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard`);
      successUrl.searchParams.set('google_auth', 'success');
      
      const response = NextResponse.redirect(successUrl.toString());
      
      // Clean up temporary OAuth cookies
      response.cookies.delete('google_auth_user_id');
      response.cookies.delete('google_auth_state');
      response.cookies.delete('google_signin_state');
      
      return response;
    } catch (tokenError) {
      log.error('Error processing Google OAuth tokens:', {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        userId: userId?.substring(0, 8) + '...',
        ip: clientIp,
        isSigninFlow
      });
      
      // Clear temporary cookies securely and redirect with simple URL
      const errorRedirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Authentication+failed`;
      const response = NextResponse.redirect(errorRedirectUrl);
      
      // Clean up OAuth cookies
      response.cookies.delete('google_auth_user_id');
      response.cookies.delete('google_auth_state');
      response.cookies.delete('google_signin_state');
      
      return response;
    }
  } catch (error) {
    log.error('Unexpected error in Google OAuth callback:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIp
    });
    
    // Clear temporary cookies in case of error and use simple redirect URL
    const errorRedirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.docmile.com'}/dashboard?google_auth=error&message=Unexpected+error`;
    const response = NextResponse.redirect(errorRedirectUrl);
    
    // Clean up OAuth cookies
    response.cookies.delete('google_auth_user_id');
    response.cookies.delete('google_auth_state');
    response.cookies.delete('google_signin_state');
    
    return response;
  }
}
