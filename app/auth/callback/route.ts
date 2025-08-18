// app/auth/callback/route.ts
// Handle OAuth and email confirmation callbacks

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  try {
    if (error) {
      console.error('Auth callback error:', error, errorDescription);
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (code) {
      const supabase = await createServerSupabaseClient();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Code exchange error:', exchangeError);
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent('Error validant el codi d\'autenticació')}`
        );
      }

      if (data.user) {
        // Successful authentication
        console.log('User authenticated successfully:', data.user.email);
        return NextResponse.redirect(`${origin}${next}`);
      }
    }

    // If no code or error, redirect to login
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent('Paràmetres d\'autenticació no vàlids')}`);
  } catch (error) {
    console.error('Auth callback unexpected error:', error);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent('Error inesperat durant l\'autenticació')}`
    );
  }
}