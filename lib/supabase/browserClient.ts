// lib/supabase/browserClient.ts
'use client'
import { createBrowserClient } from '@supabase/ssr'

export const createBrowserSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie
            .split(';')
            .map(c => c.trim())
            .filter(c => c.length > 0)
            .map(c => {
              const [name, ...v] = c.split('=')
              return { name, value: v.join('=') }
            })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              path: '/',
            }
            
            let cookieString = `${name}=${value}`
            
            if (cookieOptions.maxAge) {
              cookieString += `; Max-Age=${cookieOptions.maxAge}`
            }
            if (cookieOptions.expires) {
              cookieString += `; Expires=${cookieOptions.expires.toUTCString()}`
            }
            if (cookieOptions.path) {
              cookieString += `; Path=${cookieOptions.path}`
            }
            if (cookieOptions.domain) {
              cookieString += `; Domain=${cookieOptions.domain}`
            }
            if (cookieOptions.secure) {
              cookieString += '; Secure'
            }
            if (cookieOptions.sameSite) {
              cookieString += `; SameSite=${cookieOptions.sameSite}`
            }
            if (cookieOptions.httpOnly) {
              cookieString += '; HttpOnly'
            }

            document.cookie = cookieString
          })
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'sb-auth-token',
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null
            return localStorage.getItem(key)
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return
            localStorage.setItem(key, value)
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return
            localStorage.removeItem(key)
          },
        },
      }
    }
  )
}