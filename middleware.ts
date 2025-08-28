// middleware.ts
// TEXTAMI - Supabase SSR Authentication Middleware

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Skip middleware for static files and API routes to improve performance
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Protected routes that need auth check
  const protectedPaths = ['/dashboard', '/analyze', '/templates', '/knowledge', '/generator']
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))
  
  // Skip auth check for public routes (landing page) to improve performance
  if (!isProtectedPath && req.nextUrl.pathname === '/') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only check auth for protected routes
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !user) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('redirected', 'true')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}