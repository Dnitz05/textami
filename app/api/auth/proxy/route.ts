// Auth proxy to bypass network issues
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  console.log('Auth proxy called with action:', await request.clone().json().then(b => b.action));
  
  try {
    const body = await request.json();
    const { action, email, password } = body;

    // Debug environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Supabase URL available:', !!supabaseUrl);
    console.log('Supabase Key available:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Configuració de servidor incompleta' },
        { status: 500 }
      );
    }

    let response: NextResponse;

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          },
          remove(name: string, options: any) {
            request.cookies.delete(name);
            response.cookies.delete(name);
          },
        },
      }
    );

    if (action === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth proxy signin error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.log('Auth proxy signin success for:', email);
      response = NextResponse.json({ data });
      return response;
    }

    if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Auth proxy signup error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.log('Auth proxy signup success for:', email);
      response = NextResponse.json({ data });
      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth proxy unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}