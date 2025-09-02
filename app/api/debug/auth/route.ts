// Debug endpoint to check authentication state
import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/security/auth-middleware';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    log.debug('🔍 Starting auth debug check');

    // Extract all possible authentication sources
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('sb-access-token');
    const userIdCookie = request.cookies.get('sb-user-id');

    const cookieInfo = {
      'sb-access-token': sessionCookie?.value ? sessionCookie.value.substring(0, 20) + '...' : 'NOT_FOUND',
      'sb-user-id': userIdCookie?.value ? userIdCookie.value.substring(0, 20) + '...' : 'NOT_FOUND',
      authorization: authHeader ? authHeader.substring(0, 30) + '...' : 'NOT_FOUND'
    };

    log.debug('🍪 Cookies and headers:', cookieInfo);

    // Test authentication
    const { user, error } = await validateUserSession(request, { allowAnonymous: true });

    const debugInfo = {
      timestamp: new Date().toISOString(),
      cookies: cookieInfo,
      authentication: {
        isAuthenticated: !!user,
        userId: user?.id ? user.id.substring(0, 8) + '...' : 'NONE',
        email: user?.email || 'NONE',
        error: error || 'NONE'
      }
    };

    log.debug('🔍 Auth debug result:', debugInfo);

    return NextResponse.json({
      success: true,
      message: 'Authentication debug info',
      data: debugInfo
    });

  } catch (error) {
    log.error('❌ Auth debug failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Auth debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}