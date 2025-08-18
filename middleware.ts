// middleware.ts
// Middleware per autenticació Supabase - SIMPLE

import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/template/:path*',
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}