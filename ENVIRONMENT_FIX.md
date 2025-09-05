# Environment Variables Fix

Fixed missing Supabase environment variables in Vercel:

## Problem
- NEXT_PUBLIC_SUPABASE_URL only existed in Production 
- NEXT_PUBLIC_SUPABASE_ANON_KEY only existed in Production
- This caused "Needs re-authentication" errors in Preview/Development builds

## Solution  
Added missing variables to Preview and Development environments:
- NEXT_PUBLIC_SUPABASE_URL: https://ypunjalpaecspihjeces.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY: [Supabase anon key]

## Result
Google authentication should now work in all Vercel environments.

Date: $(date)