// lib/supabase/client.ts
// Client Supabase per a browser with error handling
'use client'
import { createBrowserClient } from '@supabase/ssr'

export const createBrowserSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    throw new Error('Supabase configuration error: Missing URL');
  }

  if (!supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
    throw new Error('Supabase configuration error: Missing API Key');
  }

  console.log('Creating Supabase client with URL:', supabaseUrl.substring(0, 30) + '...');

  return createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    realtime: {
      // Disable realtime for MVP to avoid edge runtime issues
      params: {
        eventsPerSecond: 1
      }
    }
  });
}