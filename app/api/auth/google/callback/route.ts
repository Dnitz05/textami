import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserProfile } from '@/lib/google/auth';
import { initializeGoogleConnection } from '@/lib/google/token-manager';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/security/auth-middleware';
import { createServerClient } from '@supabase/ssr';
import { log } from '@/lib/logger';
import { createOAuthRedirectUrl, logDomainInfo, isVercelPreview } from '@/lib/vercel/domain-utils';

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
      return NextResponse.redirect(
        createOAuthRedirectUrl(request, '/dashboard', {
          google_auth: 'error',
          message: 'Too_many_attempts'
        })
      );
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
      return NextResponse.redirect(
        createOAuthRedirectUrl(request, '/dashboard', {
          google_auth: 'error',
          message: error
        })
      );
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
        ? 'User_cancelled_authentication'
        : 'Invalid_callback_parameters';
        
      return NextResponse.redirect(
        createOAuthRedirectUrl(request, '/dashboard', {
          google_auth: 'error',
          message: errorMessage
        })
      );
    }

    // 5. Validate session cookies and CSRF state with localStorage fallback
    const cookieStore = await cookies();
    const userId = cookieStore.get('google_auth_user_id')?.value;
    const signinState = cookieStore.get('google_signin_state')?.value;
    const storedState = cookieStore.get('google_auth_state')?.value || signinState;

    // 🚨 CRITICAL FALLBACK: Use URL state when cookies are missing
    let localStorageState: string | undefined;
    let localStorageUserId: string | undefined;
    let localStorageFlow: 'signin' | 'connect' | undefined;
    
    // ALWAYS check URL fallback parameters for cross-domain compatibility
    const lsState = url.searchParams.get('ls_state');
    const lsUserId = url.searchParams.get('ls_user_id'); 
    const lsFlow = url.searchParams.get('ls_flow') as 'signin' | 'connect' | undefined;
    
    if (lsState && state && lsState === state) {
      localStorageState = lsState;
      localStorageUserId = lsUserId || undefined;
      localStorageFlow = lsFlow;
      
      log.info('✅ Using URL fallback for OAuth state (CRITICAL FIX):', {
        ip: clientIp,
        hasUserId: !!localStorageUserId,
        flow: localStorageFlow,
        stateMatches: true
      });
    }

    // If no cookies but we have valid URL state, use it
    if (!storedState && localStorageState) {
      log.warn('🔄 No cookies found, using URL state fallback:', {
        ip: clientIp,
        cookieState: !!storedState,
        urlState: !!localStorageState,
        hasUserId: !!localStorageUserId
      });
    }
    
    const finalStoredState = storedState || localStorageState;
    const finalUserId = userId || localStorageUserId;

    // 🚨 CRITICAL DEBUG LOGGING FOR STATE VALIDATION
    log.info('🔍 OAUTH STATE VALIDATION DEBUG:', {
      ip: clientIp,
      callbackState: state,
      storedState: storedState,
      localStorageState: localStorageState,
      finalStoredState: finalStoredState,
      statesMatch: finalStoredState === state,
      stateComparison: {
        stored: finalStoredState ? finalStoredState.substring(0, 10) + '...' : 'NULL',
        callback: state ? state.substring(0, 10) + '...' : 'NULL',
        lengthMatch: finalStoredState?.length === state?.length,
        exactMatch: finalStoredState === state
      },
      cookieData: {
        hasUserId: !!userId,
        hasSigninState: !!signinState,
        hasAuthState: !!storedState,
        allCookiesCount: cookieStore.getAll().length
      },
      localStorageData: {
        hasLSState: !!localStorageState,
        hasLSUserId: !!localStorageUserId,
        lsFlow: localStorageFlow
      },
      domainInfo: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referrer: request.headers.get('referer')
      }
    });

    // Check if this is a signin flow - prioritize signin state or no user ID as signin
    const isSigninFlow = !finalUserId || !!signinState || localStorageFlow === 'signin';
    let treatAsSigninFlow: boolean = isSigninFlow;

    // For signin flows without cookies (cross-domain issues), validate with state token
    if (!finalUserId && !signinState && !finalStoredState) {
      log.error('No cookies or state found - possible cross-domain issue:', { 
        ip: clientIp,
        allCookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
        hasLocalStorageFallback: !!localStorageState
      });
      return NextResponse.redirect(
        createOAuthRedirectUrl(request, '/dashboard', {
          google_auth: 'error',
          message: 'Session_expired'
        })
      );
    }

    // If we have a valid state but no user ID, treat as signin flow
    if (!finalUserId && finalStoredState && finalStoredState === state) {
      log.info('Treating OAuth as signin flow due to missing user ID but valid state:', { 
        ip: clientIp,
        usingLocalStorage: !!localStorageState
      });
      treatAsSigninFlow = true;
    }

    if (!finalStoredState || finalStoredState !== state) {
      log.error('CSRF state validation failed:', { 
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        ip: clientIp,
        hasStoredState: !!storedState,
        hasCallbackState: !!state,
        isSigninFlow
      });
      return NextResponse.redirect(
        createOAuthRedirectUrl(request, '/dashboard', {
          google_auth: 'error',
          message: 'Security_validation_failed'
        })
      );
    }

    try {
      // 6. Exchange authorization code for tokens
      log.debug('Exchanging authorization code for tokens:', {
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        ip: clientIp,
        isSigninFlow
      });
      
      const tokens = await exchangeCodeForTokens(code);

      // 7. Validate tokens by getting user profile
      log.debug('Validating tokens with user profile request:', {
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        isSigninFlow
      });
      
      const profile = await getUserProfile(tokens.access_token);

      if (!profile.verified_email) {
        log.warn('Google account email not verified:', {
          userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
          email: profile.email,
          isSigninFlow
        });
        
        return NextResponse.redirect(
          new URL('/dashboard?google_auth=error&message=Email_not_verified', request.url)
        );
      }

      // 8. Handle user authentication/creation based on flow type
      let actualFinalUserId: string = finalUserId || '';

      if (treatAsSigninFlow) {
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
            // User exists, create session for them
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
              return NextResponse.redirect(
                new URL('/dashboard?google_auth=error&message=User_creation_failed', request.url)
              );
            }

            userData = newUserData;
            log.debug('New user created via Google signin:', {
              userId: newUserData?.user?.id?.substring(0, 8) + '...',
              googleEmail: profile.email
            });
          }

          if (!userData?.user?.id) {
            log.error('No user ID available after Google signin:', { googleEmail: profile.email });
            return NextResponse.redirect(
              new URL('/dashboard?google_auth=error&message=User_creation_failed', request.url)
            );
          }

          actualFinalUserId = userData.user.id;

          // Create session for the user
          const { error: sessionError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: profile.email,
          });

          if (sessionError) {
            log.error('Failed to generate session for user:', {
              error: sessionError.message,
              userId: actualFinalUserId.substring(0, 8) + '...'
            });
          }
        } catch (authError) {
          log.error('Error during signin flow authentication:', {
            error: authError instanceof Error ? authError.message : 'Unknown error',
            googleEmail: profile.email
          });
          return NextResponse.redirect(
            new URL('/dashboard?google_auth=error&message=Authentication_failed', request.url)
          );
        }
      }

      // 9. Initialize secure Google connection
      // 🚨 CRITICAL VALIDATION BEFORE TOKEN STORAGE
      if (!actualFinalUserId || actualFinalUserId.trim() === '') {
        log.error('❌ CRITICAL: No valid userId for token storage:', {
          actualFinalUserId,
          treatAsSigninFlow,
          ip: clientIp,
          googleEmail: profile.email
        });
        return NextResponse.redirect(
          createOAuthRedirectUrl(request, '/dashboard', {
            google_auth: 'error',
            message: 'User_creation_failed'
          })
        );
      }

      if (!tokens || !tokens.access_token) {
        log.error('❌ CRITICAL: No valid tokens received:', {
          userId: actualFinalUserId.substring(0, 8) + '...',
          hasTokens: !!tokens,
          hasAccessToken: !!tokens?.access_token,
          ip: clientIp
        });
        return NextResponse.redirect(
          createOAuthRedirectUrl(request, '/dashboard', {
            google_auth: 'error',
            message: 'Invalid_tokens'
          })
        );
      }

      log.info('🚀 Initializing encrypted Google connection:', {
        userId: actualFinalUserId.substring(0, 8) + '...',
        googleEmail: profile.email,
        hasValidTokens: !!tokens.access_token,
        treatAsSigninFlow,
        ip: clientIp
      });
      
      await initializeGoogleConnection(actualFinalUserId, tokens);

      // 10. Set up proper session and clean up temporary cookies
      const response = NextResponse.redirect(
        createOAuthRedirectUrl(request, '/dashboard', {
          google_auth: 'success'
        })
      );

      // For signin flow, create proper Supabase session cookies
      if (treatAsSigninFlow && actualFinalUserId) {
        // Create a simple session token (this is a simplified approach)
        response.cookies.set('sb-user-id', actualFinalUserId, {
          httpOnly: true,
          secure: true, // Always secure for session cookies
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'strict',
          path: '/'
        });
      }
      
      // Clear temporary OAuth cookies
      response.cookies.delete('google_auth_user_id');
      response.cookies.delete('google_auth_state');
      response.cookies.delete('google_signin_state');

      log.info('Google authentication completed successfully:', {
        userId: actualFinalUserId.substring(0, 8) + '...',
        googleEmail: profile.email,
        ip: clientIp,
        isSigninFlow,
        usedLocalStorageFallback: !!localStorageState
      });

      return response;
    } catch (tokenError) {
      log.error('Error processing Google OAuth tokens:', {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        userId: userId?.substring(0, 8) + '...',
        ip: clientIp,
        isSigninFlow
      });
      
      // Clear temporary cookies securely
      const response = NextResponse.redirect(
        new URL(`/dashboard?google_auth=error&message=${encodeURIComponent('Authentication_failed')}`, request.url)
      );
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
    
    // Clear temporary cookies in case of error
    const response = NextResponse.redirect(
      new URL('/dashboard?google_auth=error&message=Unexpected_error', request.url)
    );
    response.cookies.delete('google_auth_user_id');
    response.cookies.delete('google_auth_state');
    response.cookies.delete('google_signin_state');
    
    return response;
  }
}
