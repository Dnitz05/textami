// lib/supabase/browserClient.ts
'use client'
import { createBrowserClient } from '@supabase/ssr'

// SINGLETON PATTERN - Single Supabase client instance
let supabaseInstance: any = null;

export const createBrowserSupabaseClient = () => {
  // Return existing singleton instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // During build time, environment variables might not be available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Return a mock client for build time
    if (typeof window === 'undefined') {
      return null as any; // Build time - return null
    }
    throw new Error('Supabase environment variables not configured');
  }
  
  // Create and cache the singleton instance
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return supabaseInstance;
}

// Export singleton instance directly
export const getBrowserSupabaseClient = () => supabaseInstance;