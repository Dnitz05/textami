import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { log } from '@/lib/logger';

// POST /api/auth/session - Create Supabase session after Google OAuth
export async function POST(request: NextRequest) {
  try {
    const { email, user_id } = await request.json();
    
    if (!email || !user_id) {
      return NextResponse.json({
        error: 'Missing email or user_id'
      }, { status: 400 });
    }

    log.info('Creating Supabase session for OAuth user:', {
      userId: user_id.substring(0, 8) + '...',
      email
    });

    // Create Supabase admin client
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

    // Generate auth session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: '/dashboard',
      }
    });

    if (sessionError) {
      log.error('Failed to generate session:', {
        error: sessionError.message,
        userId: user_id.substring(0, 8) + '...'
      });
      return NextResponse.json({
        error: 'Failed to create session'
      }, { status: 500 });
    }

    // Return session info for frontend to use
    return NextResponse.json({
      success: true,
      session_url: sessionData?.properties?.action_link,
      user_id,
      email
    });

  } catch (error) {
    log.error('Error in session creation:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}