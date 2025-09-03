// lib/vercel/domain-utils.ts
// Vercel domain utilities for cross-domain OAuth

import { NextRequest } from 'next/server';

/**
 * Get the proper domain for redirects in Vercel environment
 */
export function getVercelDomain(request: NextRequest): string {
  // Get various possible domains
  const host = request.headers.get('host');
  const vercelUrl = request.headers.get('x-vercel-deployment-url');
  const forwardedHost = request.headers.get('x-forwarded-host');
  
  // For production, prefer docmile.com
  if (host?.includes('docmile.com') && !host.includes('git-')) {
    return `https://${host}`;
  }
  
  // For preview deployments, use the deployment URL
  if (vercelUrl && vercelUrl.includes('vercel.app')) {
    return `https://${vercelUrl}`;
  }
  
  // Fallback to forwarded host
  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }
  
  // Final fallback to current host
  if (host) {
    return `https://${host}`;
  }
  
  // Default fallback
  return 'https://docmile.com';
}

/**
 * Create a consistent redirect URL for OAuth flows
 */
export function createOAuthRedirectUrl(
  request: NextRequest, 
  path: string, 
  params?: Record<string, string>
): string {
  const domain = getVercelDomain(request);
  const url = new URL(path, domain);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

/**
 * Get the OAuth callback URL for the current environment
 */
export function getOAuthCallbackUrl(request: NextRequest): string {
  const domain = getVercelDomain(request);
  return `${domain}/api/auth/google/callback`;
}

/**
 * Check if current request is from a Vercel preview deployment
 */
export function isVercelPreview(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';
  const vercelUrl = request.headers.get('x-vercel-deployment-url') || '';
  
  return (
    host.includes('git-') || 
    vercelUrl.includes('git-') ||
    (host.includes('vercel.app') && !host.includes('docmile.com'))
  );
}

/**
 * Log domain information for debugging
 */
export function logDomainInfo(request: NextRequest, context: string): void {
  console.log(`🌐 Domain info for ${context}:`, {
    host: request.headers.get('host'),
    vercelUrl: request.headers.get('x-vercel-deployment-url'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
    isPreview: isVercelPreview(request),
    recommendedDomain: getVercelDomain(request)
  });
}
