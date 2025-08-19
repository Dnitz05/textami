// Debug route to check environment variables
import { NextResponse } from 'next/server';

export async function GET() {
  // Only run in development or with special header
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  return NextResponse.json({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌',
    supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌',
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}