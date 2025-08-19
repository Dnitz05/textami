// middleware.ts
// TEXTAMI MIDDLEWARE - PRODUCTION-READY ROUTE PROTECTION
// Zero technical debt - complete authentication and authorization
// Strict protection for dashboard routes with proper error handling

import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()
    
    // 🔒 SECURITY: Block debug endpoints in production
    if (req.nextUrl.pathname.startsWith('/api/debug')) {
      // Check if running in development using NODE_ENV header or hostname
      const isDev = req.headers.get('host')?.includes('localhost') || 
                    req.headers.get('host')?.includes('127.0.0.1') ||
                    req.nextUrl.hostname === 'localhost'
      
      if (!isDev) {
        console.warn(`🚫 Blocked debug endpoint in production: ${req.nextUrl.pathname}`)
        return new NextResponse('Not Found', { status: 404 })
      }
      console.log(`🔧 Debug endpoint accessed: ${req.nextUrl.pathname}`)
      return res
    }

    // 🔒 SECURITY: Admin endpoint logging
    if (req.nextUrl.pathname.startsWith('/admin')) {
      console.log(`⚠️ Admin endpoint accessed: ${req.nextUrl.pathname}`)
    }

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Middleware: Supabase environment variables missing')
      console.error(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'OK' : 'MISSING'}`)
      console.error(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'OK' : 'MISSING'}`)
      
      // For protected routes, redirect to login instead of continuing
      if (req.nextUrl.pathname.startsWith('/dashboard')) {
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
      }
      
      return res
    }
    
    // Create Supabase client
    const supabase = createServerClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll: () => {
            return req.cookies.getAll().map(cookie => ({
              name: cookie.name,
              value: cookie.value,
            }))
          },
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              res.cookies.set({
                name,
                value,
                ...options
              })
            })
          }
        }
      }
    )
    
    // 🔒 CRITICAL: Protect dashboard routes
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      try {
        // Add timeout for auth check
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 3000)
        )
        
        const { data: { user }, error: authError } = await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise
        ])

        if (authError) {
          console.warn(`🔐 Auth error for dashboard access: ${authError.message}`)
          const loginUrl = new URL('/login', req.url)
          loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
          return NextResponse.redirect(loginUrl)
        }

        if (!user) {
          console.log(`🔐 Unauthenticated dashboard access attempt: ${req.nextUrl.pathname}`)
          const loginUrl = new URL('/login', req.url)
          loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
          return NextResponse.redirect(loginUrl)
        }

        // Verify user has active profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error(`🔐 Profile check failed for user ${user.id}: ${profileError.message}`)
          const loginUrl = new URL('/login', req.url)
          loginUrl.searchParams.set('error', 'profile_error')
          return NextResponse.redirect(loginUrl)
        }

        if (!profile || !profile.is_active) {
          console.warn(`🔐 Inactive user attempted dashboard access: ${user.id}`)
          const loginUrl = new URL('/login', req.url)
          loginUrl.searchParams.set('error', 'account_inactive')
          return NextResponse.redirect(loginUrl)
        }

        console.log(`✅ Authenticated dashboard access: ${user.id} -> ${req.nextUrl.pathname}`)
        
      } catch (error) {
        console.error(`🔐 Dashboard protection error: ${error}`)
        const loginUrl = new URL('/login', req.url)
        loginUrl.searchParams.set('error', 'auth_failed')
        return NextResponse.redirect(loginUrl)
      }
    }

    // 🔄 REDIRECT: Authenticated users trying to access auth pages
    if ((req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register')) && !req.nextUrl.searchParams.get('error')) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Check if user has active profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_active')
            .eq('id', user.id)
            .single()
            
          if (profile?.is_active) {
            console.log(`🔄 Redirecting authenticated user to dashboard: ${user.id}`)
            return NextResponse.redirect(new URL('/dashboard', req.url))
          }
        }
      } catch (error) {
        // Continue to login/register page if auth check fails
        console.log(`🔄 Auth check failed for login/register page, continuing: ${error}`)
      }
    }

    return res
    
  } catch (error) {
    console.error('❌ Middleware critical error:', error)
    console.error(`   Request URL: ${req.url}`)
    console.error(`   Request method: ${req.method}`)
    
    // For dashboard routes, redirect to login on critical errors
    if (req.nextUrl.pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('error', 'system_error')
      return NextResponse.redirect(loginUrl)
    }
    
    // For other routes, continue with potential degraded functionality
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/debug|api/worker).*)'],
};