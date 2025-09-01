import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google/auth';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateUserSession, checkRateLimit } from '@/lib/security/auth-middleware';
import { generateSecureToken } from '@/lib/security/encryption';
import { log } from '@/lib/logger';

// GET /api/auth/google - Secure Google OAuth initiation
export async function GET(request: NextRequest) {
  try {
    // 1. Validate user session
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: true }
    );
    
    if (authError || !user) {
      return authResponse!;
    }

    // 2. Rate limiting - prevent OAuth spam
    const { allowed, response: rateLimitResponse } = checkRateLimit(
      user.id,
      3, // 3 OAuth attempts per hour
      3600000
    );
    
    if (!allowed) {
      return rateLimitResponse!;
    }

    // 3. Generate secure state token for CSRF protection
    const stateToken = generateSecureToken(32);

    // 4. Generate Google OAuth URL
    const authUrl = getGoogleAuthUrl();
    
    log.info('Google OAuth initiated:', {
      userId: user.id.substring(0, 8) + '...',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    // 5. Store secure session data for callback
    const response = NextResponse.redirect(authUrl);
    response.cookies.set('google_auth_user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'lax',
      path: '/api/auth/google'
    });
    response.cookies.set('google_auth_state', stateToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'lax',
      path: '/api/auth/google'
    });

    return response;
  } catch (error) {
    log.error('Error in Google OAuth initiation:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}

// POST /api/auth/google - Secure connection status check
export async function POST(request: NextRequest) {
  try {
    // 1. Validate user session
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: false }
    );
    
    if (authError || !user) {
      return authResponse!;
    }

    // 2. Rate limiting
    const { allowed, response: rateLimitResponse } = checkRateLimit(
      user.id,
      20, // 20 status checks per minute
      60000
    );
    
    if (!allowed) {
      return rateLimitResponse!;
    }

    // 3. Get connection status
    const { getGoogleConnectionStatus } = await import('@/lib/google/token-manager');
    const status = await getGoogleConnectionStatus(user.id);

    log.debug('Google connection status checked:', {
      userId: user.id.substring(0, 8) + '...',
      connected: status.connected
    });

    return NextResponse.json({ status });
  } catch (error) {
    log.error('Error checking Google connection status:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to check Google connection status' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/google - Secure Google account disconnection
export async function DELETE(request: NextRequest) {
  try {
    // 1. Validate user session
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: true }
    );
    
    if (authError || !user) {
      return authResponse!;
    }

    // 2. Rate limiting
    const { allowed, response: rateLimitResponse } = checkRateLimit(
      user.id,
      5, // 5 disconnections per hour
      3600000
    );
    
    if (!allowed) {
      return rateLimitResponse!;
    }

    // 3. Disconnect Google account securely
    const { disconnectGoogleAccount } = await import('@/lib/google/token-manager');
    await disconnectGoogleAccount(user.id);

    log.info('Google account disconnected:', {
      userId: user.id.substring(0, 8) + '...',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Google account disconnected successfully' 
    });
  } catch (error) {
    log.error('Error disconnecting Google account:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: 'unknown'
    });
    return NextResponse.json(
      { error: 'Failed to disconnect Google account' },
      { status: 500 }
    );
  }
}