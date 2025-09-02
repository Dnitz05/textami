import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const host = request.headers.get('host') || ''
  
  // 🚨 CRITICAL: FORCE OAUTH FLOWS TO PRODUCTION DOMAIN
  if (url.pathname.startsWith('/api/auth/google')) {
    // If we're on a preview deployment, redirect to production domain
    if (host.includes('vercel.app') && !host.includes('textami.vercel.app')) {
      console.log('🔄 CRITICAL: Redirecting OAuth from preview to production:', {
        from: host,
        to: 'textami.vercel.app',
        path: url.pathname,
        params: url.search
      })
      
      url.hostname = 'textami.vercel.app'
      return NextResponse.redirect(url)
    }
  }

  // 🚨 REDIRECT OAUTH RESULTS TO PRODUCTION DOMAIN
  if ((url.pathname === '/dashboard' || url.pathname === '/') && url.searchParams.has('google_auth')) {
    if (host.includes('vercel.app') && !host.includes('textami.vercel.app')) {
      console.log('🔄 CRITICAL: Redirecting OAuth result from preview to production:', {
        from: host,
        to: 'textami.vercel.app', 
        googleAuth: url.searchParams.get('google_auth')
      })
      
      url.hostname = 'textami.vercel.app'
      return NextResponse.redirect(url)
    }
  }

  // Continue with Supabase session handling
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get('cookie')?.split('; ').map(cookie => {
            const [name, value] = cookie.split('=');
            return { name, value };
          }) || [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getSession(); // Refresh the session
  return supabaseResponse;
}

export const config = {
  matcher: ['/api/auth/google/:path*', '/dashboard', '/generator', '/templates', '/analyze', '/knowledge'],
};
