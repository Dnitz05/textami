// lib/supabase/middleware.ts  
// Robust authentication middleware
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
          });
        },
        remove(name: string, options: any) {
          request.cookies.delete(name);
          supabaseResponse.cookies.delete(name);
        },
      },
    }
  );

  try {
    // Refresh session if needed
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.warn('Auth error in middleware:', error.message);
    }

    // If accessing protected routes without authentication
    const isProtectedRoute = pathname.startsWith('/dashboard') || 
                           pathname.startsWith('/api/protected');
    
    const isAuthRoute = pathname.startsWith('/auth/');

    if (isProtectedRoute && !user) {
      // Redirect to login with return URL
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated user tries to access auth routes, redirect to dashboard
    if (isAuthRoute && user && !pathname.includes('callback')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return supabaseResponse;
  } catch (error) {
    console.error('Supabase middleware error:', error);
    
    // On critical errors, allow access but log the issue
    if (pathname.startsWith('/dashboard')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }
    
    return supabaseResponse;
  }
}