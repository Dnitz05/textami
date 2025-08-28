// middleware.ts
// TEXTAMI - Supabase SSR Authentication Middleware

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it so that
  // users can't sign out.

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  console.log(`🔍 Middleware Debug:`, {
    pathname: req.nextUrl.pathname,
    hasUser: !!user,
    userEmail: user?.email,
    authError: authError?.message,
    cookies: req.cookies.getAll().map(c => c.name)
  })

  // Protected routes
  const protectedPaths = ['/dashboard', '/analyze', '/templates', '/knowledge', '/generator']
  const isProtectedPath = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path))

  // Redirect unauthenticated users trying to access protected routes
  if (isProtectedPath && !user) {
    console.log(`🚫 Redirecting unauthenticated user from protected route: ${req.nextUrl.pathname}`)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.searchParams.set('redirected', 'true')
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from landing page
  if (req.nextUrl.pathname === '/' && user) {
    console.log(`✅ Redirecting authenticated user to dashboard: ${user.email}`)
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  console.log(`🔐 Auth check: ${req.nextUrl.pathname} - User: ${user ? '✅ ' + user.email : '❌'}`)

  // IMPORTANT: You must return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next()
  // make sure to:
  // 1. Pass the request in it, like so: const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so: myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())

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