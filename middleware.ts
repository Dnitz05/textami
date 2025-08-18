// middleware.ts
// Authentication middleware for protected routes

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Handle Supabase auth for protected routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/protected')) {
      const response = await updateSession(request);
      
      // If response is a redirect (user not authenticated), return it
      if (response.headers.get('location')) {
        return response;
      }
      
      return response;
    }

    // For public routes, just continue
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    
    // On middleware errors, redirect to login for protected routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/protected')) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // For other routes, continue with warning
    console.warn('Middleware error on public route, continuing:', pathname);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/api/protected/:path*',
    // Auth routes to handle redirects
    '/auth/login',
    '/auth/signup',
  ],
};