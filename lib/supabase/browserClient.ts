// lib/supabase/browserClient.ts
'use client'
import { createBrowserClient } from '@supabase/ssr'

export const createBrowserSupabaseClient = () => {
  // During build time, environment variables might not be available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Return a mock client for build time
    if (typeof window === 'undefined') {
      return null as any; // Build time - return null
    }
    throw new Error('Supabase environment variables not configured');
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}