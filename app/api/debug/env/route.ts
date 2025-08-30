// app/api/debug/env/route.ts
// Temporary diagnostic endpoint to check environment variables
import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        NEXT_PUBLIC_SUPABASE_URL: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
            process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20) + '...' : 
            'NOT_FOUND'
        },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 
            'NOT_FOUND'
        },
        SUPABASE_SERVICE_ROLE_KEY: {
          exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          value: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
            process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...' : 
            'NOT_FOUND'
        },
        OPENAI_API_KEY: {
          exists: !!process.env.OPENAI_API_KEY,
          value: process.env.OPENAI_API_KEY ? 
            process.env.OPENAI_API_KEY.substring(0, 20) + '...' : 
            'NOT_FOUND'
        }
      }
    };

    log.debug('🔍 Environment Variables Check:', envCheck);

    return NextResponse.json({
      success: true,
      message: 'Environment variables diagnostic',
      data: envCheck
    });

  } catch (error) {
    log.error('❌ Environment check failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}