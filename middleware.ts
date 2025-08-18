// middleware.ts
// Middleware DISABLED per MVP - evitar problemes deployment

import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Per MVP: middleware simple que passa tot
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Molt restrictiu per MVP
    '/api/protected/:path*',
  ],
}