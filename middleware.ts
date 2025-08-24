// middleware.ts
// TEXTAMI AI-FIRST - Minimal middleware for development
// Simplified approach - no complex auth for MVP

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // For AI-first MVP, just allow all requests
  // Future: Add authentication and rate limiting
  
  console.log(`📍 Request: ${req.method} ${req.nextUrl.pathname}`)
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}