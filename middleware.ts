// middleware.ts
// Simple middleware for MVP - no auth complexity

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // MVP: Just pass through all requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match API routes if needed in future
    '/api/protected/:path*',
  ],
};