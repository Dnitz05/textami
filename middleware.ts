import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // With docmile.com domain, no cross-domain OAuth redirections needed

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
