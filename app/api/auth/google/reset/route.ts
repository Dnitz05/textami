import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/security/auth-middleware';
import { clearGoogleTokens } from '@/lib/google/token-manager';
import { createClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';

// POST /api/auth/google/reset - Clear corrupted Google tokens
export async function POST(request: NextRequest) {
  try {
    // Validate user session
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: true }
    );
    
    if (authError || !user) {
      return authResponse!;
    }

    // Clear Google tokens for this user
    await clearGoogleTokens(user.id);

    // Also direct database cleanup in case token-manager fails
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'your_supabase_url_here') {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('profiles')
          .update({
            google_tokens: null,
            google_refresh_token: null,
            google_connected: false,
            google_connected_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    } catch (dbError) {
      log.warn('Direct database cleanup failed (continuing anyway):', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
    }

    log.info('Google tokens cleared by user request:', {
      userId: user.id.substring(0, 8) + '...',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Google tokens cleared successfully. Please reconnect your Google account.' 
    });
  } catch (error) {
    log.error('Error clearing Google tokens:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { error: 'Failed to clear Google tokens' },
      { status: 500 }
    );
  }
}