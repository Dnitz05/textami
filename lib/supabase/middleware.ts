// lib/supabase/middleware.ts  
// Middleware per autenticació - SIMPLE
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll: (cookies) => {
          cookies.forEach((cookie) => {
            request.cookies.set(cookie.name, cookie.value)
            supabaseResponse.cookies.set(cookie.name, cookie.value, cookie.options)
          })
        },
      },
    }
  )

  // Refrescar la sessió d'usuari si és necessari
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return supabaseResponse
}