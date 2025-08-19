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
      detectSessionInUrl: true,
      // Add retry and timeout options
      retryDelay: 2000,
      maxRetries: 3
    },
    global: {
      // Add custom fetch with timeout
      fetch: async (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          console.error('Fetch error for URL:', url, error);
          throw error;
        }
      }
    },
    realtime: {
      // Disable realtime for MVP
      params: {
        eventsPerSecond: 1
      }
    }
  });
}