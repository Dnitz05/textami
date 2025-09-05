import { NextRequest, NextResponse } from 'next/server';
import { validateUserSession } from '@/lib/security/auth-middleware';
import { getGoogleConnectionStatus, loadGoogleTokens } from '@/lib/google/token-manager';
import { createClient } from '@supabase/supabase-js';
import { log } from '@/lib/logger';

// Debug endpoint to diagnose Google authentication issues
export async function GET(request: NextRequest) {
  try {
    // Validate user session
    const { user, error: authError } = await validateUserSession(
      request,
      { allowAnonymous: false, logAccess: false }
    );
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Authentication required',
        authenticated: false
      });
    }

    const userId = user.id;
    
    // Create Supabase client to check real database
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let databaseCheck = null;
    if (supabaseUrl && supabaseServiceKey && supabaseUrl !== 'your_supabase_url_here') {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check what exists in the real database
      const { data: profileData, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      databaseCheck = {
        hasProfile: !!profileData,
        profileData: profileData ? {
          id: profileData.id?.substring(0, 8) + '...',
          email: profileData.email,
          google_connected: profileData.google_connected,
          google_connected_at: profileData.google_connected_at,
          has_google_tokens: !!profileData.google_tokens,
          has_google_refresh_token: !!profileData.google_refresh_token,
          google_tokens_type: typeof profileData.google_tokens,
          google_tokens_keys: profileData.google_tokens ? Object.keys(profileData.google_tokens) : null,
          full_name: profileData.full_name,
          created_at: profileData.created_at
        } : null,
        databaseError: dbError?.message || null
      };
    } else {
      databaseCheck = {
        error: 'Supabase not configured properly',
        supabaseUrl: supabaseUrl === 'your_supabase_url_here' ? 'placeholder' : 'configured',
        hasServiceKey: !!supabaseServiceKey
      };
    }

    // Check token manager functions
    let tokenManagerCheck = null;
    try {
      const connectionStatus = await getGoogleConnectionStatus(userId);
      const tokens = await loadGoogleTokens(userId);
      
      tokenManagerCheck = {
        connectionStatus,
        hasTokens: !!tokens,
        tokenInfo: tokens ? {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          isExpired: tokens.expiry_date ? tokens.expiry_date <= Date.now() : null,
          scope: tokens.scope
        } : null
      };
    } catch (tokenError) {
      tokenManagerCheck = {
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        stack: tokenError instanceof Error ? tokenError.stack : undefined
      };
    }

    // Environment check
    const envCheck = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_oauth_client_id',
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your_google_oauth_client_secret',
      googleClientIdPreview: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
      baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN || 'docmile.com',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not_set',
      nodeEnv: process.env.NODE_ENV
    };

    return NextResponse.json({
      userId: userId.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
      databaseCheck,
      tokenManagerCheck,
      envCheck,
      diagnosis: {
        message: "Check each section for issues. Common problems: Supabase not configured, tokens expired, database profile missing."
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}