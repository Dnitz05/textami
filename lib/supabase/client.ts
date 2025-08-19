// lib/supabase/client.ts
// Basic Supabase client for future use
'use client'
import { createClient } from '@supabase/supabase-js'

// Simple client creation for future features
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(supabaseUrl, supabaseKey);
}