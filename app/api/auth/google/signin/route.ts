import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google/auth';
import { generateSecureToken } from '@/lib/security/encryption';
import { log } from '@/lib/logger';

// GET /api/auth/google/signin - Public Google OAuth initiation for sign-in
export async function GET(request: NextRequest) {
  try {
    log.debug('🔑 Starting Google Sign-In OAuth flow');
    
    // Generate secure state token for CSRF protection
    const stateToken = generateSecureToken();
    
    // Get Google OAuth URL with custom state token
    const googleAuthUrl = getGoogleAuthUrl(stateToken);
    
    if (!googleAuthUrl) {
      log.error('❌ Failed to generate Google Auth URL');
      return NextResponse.json(
        { error: 'Failed to generate Google authentication URL' },
        { status: 500 }
      );
    }

    log.debug('✅ Google OAuth URL generated successfully');
    
    // Create response with redirect
    const response = NextResponse.redirect(googleAuthUrl);
    
    // Cross-domain compatible cookie settings for Vercel
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('google_signin_state', stateToken, {
      httpOnly: true,
      secure: isProduction,
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'lax' as const, // Lax for Vercel cross-domain compatibility  
      path: '/',
      ...(isProduction && { domain: '.vercel.app' }) // Share across Vercel subdomains
    });

    return response;
    
  } catch (error) {
    log.error('❌ Error in Google Sign-In OAuth initiation:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Failed to initiate Google sign-in' },
      { status: 500 }
    );
  }
}

// POST /api/auth/google/signin - Get sign-in URL without authentication
export async function POST(request: NextRequest) {
  try {
    log.debug('🔑 Getting Google Sign-In URL (POST)');
    
    // Generate secure state token for CSRF protection
    const stateToken = generateSecureToken();
    
    // Get Google OAuth URL with custom state token
    const googleAuthUrl = getGoogleAuthUrl(stateToken);
    
    if (!googleAuthUrl) {
      log.error('❌ Failed to generate Google Auth URL');
      return NextResponse.json(
        { error: 'Failed to generate Google authentication URL' },
        { status: 500 }
      );
    }

    log.debug('✅ Google OAuth URL generated for sign-in');
    
    // Return URL instead of redirecting (for AJAX calls)
    return NextResponse.json({ 
      success: true,
      authUrl: googleAuthUrl,
      state: stateToken
    });
    
  } catch (error) {
    log.error('❌ Error getting Google Sign-In URL:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'Failed to get Google sign-in URL' },
      { status: 500 }
    );
  }
}