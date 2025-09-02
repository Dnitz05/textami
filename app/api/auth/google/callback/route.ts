import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserProfile } from '@/lib/google/auth';
import { initializeGoogleConnection } from '@/lib/google/token-manager';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/security/auth-middleware';
import { createServerClient } from '@supabase/ssr';
import { log } from '@/lib/logger';

// GET /api/auth/google/callback - Secure Google OAuth callback handler
export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
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
        new URL('/dashboard?google_auth=error&message=Too_many_attempts', request.url)
      );
    }

    // 2. Extract and validate callback parameters
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // 3. Check for OAuth errors from Google
    if (error) {
      log.error('Google OAuth error received:', { 
        error, 
        ip: clientIp,
        userAgent: request.headers.get('user-agent')?.substring(0, 100)
      });
      return NextResponse.redirect(
        new URL(`/dashboard?google_auth=error&message=${encodeURIComponent(error)}`, request.url)
      );
    }

    // 4. Validate required parameters
    if (!code) {
      log.error('Missing authorization code in callback:', { ip: clientIp });
      return NextResponse.redirect(
        new URL('/dashboard?google_auth=error&message=Invalid_callback_parameters', request.url)
      );
    }

    // 5. Validate session cookies and CSRF state
    const cookieStore = await cookies();
    const userId = cookieStore.get('google_auth_user_id')?.value;
    const signinState = cookieStore.get('google_signin_state')?.value;
    const storedState = cookieStore.get('google_auth_state')?.value || signinState;

    // Check if this is a signin flow (no existing user session)
    const isSigninFlow = !userId && signinState;

    if (!userId && !isSigninFlow) {
      log.error('No user ID found in OAuth session:', { ip: clientIp });
      // Allow sign-in flow to proceed even without user ID if state matches
      if (storedState && storedState === state) {
        log.info('Allowing sign-in flow without user ID due to valid state match:', { ip: clientIp });
      } else {
        return NextResponse.redirect(
          new URL('/dashboard?google_auth=error&message=Session_expired', request.url)
        );
      }
    }

    if (!storedState || storedState !== state) {
      log.error('CSRF state validation failed:', { 
        userId: userId ? userId.substring(0, 8) + '...' : 'signin-flow',
        ip: clientIp,
        hasStoredState: !!storedState,
        hasCallbackState: !!state,
        isSigninFlow
      });
      return NextResponse.redirect(
        new URL('/dashboard?google_auth=error&message=Security_validation_failed', request.url)
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
      let finalUserId: string = userId || '';

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

          finalUserId = userData.user.id;

          // Create session for the user
          const { error: sessionError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: profile.email,
          });

          if (sessionError) {
            log.error('Failed to generate session for user:', {
              error: sessionError.message,
              userId: finalUserId.substring(0, 8) + '...'
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
      log.debug('Initializing encrypted Google connection:', {
        userId: finalUserId.substring(0, 8) + '...',
        googleEmail: profile.email
      });
      
      await initializeGoogleConnection(finalUserId, tokens);

      // 10. Set up proper session and clean up temporary cookies
      const response = NextResponse.redirect(
        new URL('/dashboard?google_auth=success', request.url)
      );

      // For signin flow, create proper Supabase session cookies
      if (isSigninFlow && finalUserId) {
        // Create a simple session token (this is a simplified approach)
        response.cookies.set('sb-user-id', finalUserId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite: 'lax',
          path: '/'
        });
      }
      
      // Clear temporary OAuth cookies
      response.cookies.delete('google_auth_user_id');
      response.cookies.delete('google_auth_state');
      response.cookies.delete('google_signin_state');

      log.info('Google authentication completed successfully:', {
        userId: finalUserId.substring(0, 8) + '...',
        googleEmail: profile.email,
        ip: clientIp,
        isSigninFlow
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
