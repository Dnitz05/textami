import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserProfile } from '@/lib/google/auth';
import { initializeGoogleConnection } from '@/lib/google/token-manager';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/security/auth-middleware';
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
    const cookieStore = cookies();
    const userId = cookieStore.get('google_auth_user_id')?.value;
    const storedState = cookieStore.get('google_auth_state')?.value;

    if (!userId) {
      log.error('No user ID found in OAuth session:', { ip: clientIp });
      return NextResponse.redirect(
        new URL('/dashboard?google_auth=error&message=Session_expired', request.url)
      );
    }

    if (!storedState || storedState !== state) {
      log.error('CSRF state validation failed:', { 
        userId: userId.substring(0, 8) + '...',
        ip: clientIp,
        hasStoredState: !!storedState,
        hasCallbackState: !!state
      });
      return NextResponse.redirect(
        new URL('/dashboard?google_auth=error&message=Security_validation_failed', request.url)
      );
    }

    try {
      // 6. Exchange authorization code for tokens
      log.debug('Exchanging authorization code for tokens:', {
        userId: userId.substring(0, 8) + '...',
        ip: clientIp
      });
      
      const tokens = await exchangeCodeForTokens(code);

      // 7. Validate tokens by getting user profile
      log.debug('Validating tokens with user profile request:', {
        userId: userId.substring(0, 8) + '...'
      });
      
      const profile = await getUserProfile(tokens.access_token);

      if (!profile.verified_email) {
        log.warn('Google account email not verified:', {
          userId: userId.substring(0, 8) + '...',
          email: profile.email
        });
        
        return NextResponse.redirect(
          new URL('/dashboard?google_auth=error&message=Email_not_verified', request.url)
        );
      }

      // 8. Initialize secure Google connection
      log.debug('Initializing encrypted Google connection:', {
        userId: userId.substring(0, 8) + '...',
        googleEmail: profile.email
      });
      
      await initializeGoogleConnection(userId, tokens);

      // 9. Clear temporary cookies securely
      const response = NextResponse.redirect(
        new URL('/dashboard?google_auth=success', request.url)
      );
      
      response.cookies.delete('google_auth_user_id');
      response.cookies.delete('google_auth_state');

      log.info('Google authentication completed successfully:', {
        userId: userId.substring(0, 8) + '...',
        googleEmail: profile.email,
        ip: clientIp
      });

      return response;
    } catch (tokenError) {
      log.error('Error processing Google OAuth tokens:', {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        userId: userId.substring(0, 8) + '...',
        ip: clientIp
      });
      
      // Clear temporary cookies securely
      const response = NextResponse.redirect(
        new URL(`/dashboard?google_auth=error&message=${encodeURIComponent('Authentication_failed')}`, request.url)
      );
      response.cookies.delete('google_auth_user_id');
      response.cookies.delete('google_auth_state');
      
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
    
    return response;
  }
}