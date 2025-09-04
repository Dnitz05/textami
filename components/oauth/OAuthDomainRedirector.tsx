// components/oauth/OAuthDomainRedirector.tsx
'use client'

import { useEffect } from 'react'

/**
 * Client-side component to handle OAuth domain redirects
 * Ensures all OAuth flows happen on production domain
 */
export default function OAuthDomainRedirector() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    const currentHost = window.location.host
    const isPreview = currentHost.includes('vercel.app') && !currentHost.includes('textami.vercel.app')
    const isOAuthFlow = window.location.pathname.startsWith('/api/auth/google') || 
                       window.location.search.includes('google_auth=') ||
                       window.location.search.includes('code=') ||
                       window.location.search.includes('state=')

    if (isPreview && isOAuthFlow) {
      // Check if already on the correct domain
      if (currentHost === 'www.docmile.com') {
        console.log('🔄 CLIENT: Already on correct domain, skipping redirection:', {
          host: currentHost,
          path: window.location.pathname,
          search: window.location.search
        });
        return;
      }

      // Check if redirection has already been attempted to prevent loops
      const hasRedirected = localStorage.getItem('oauth_redirected');
      if (hasRedirected) {
        console.log('🔄 CLIENT: Redirection already attempted, skipping to prevent loop:', {
          from: currentHost,
          to: 'www.docmile.com',
          path: window.location.pathname,
          search: window.location.search
        });
        return;
      }

      console.log('🔄 CLIENT: Redirecting OAuth from preview to production:', {
        from: currentHost,
        to: 'www.docmile.com',
        path: window.location.pathname,
        search: window.location.search
      });

      // Set redirection flag
      localStorage.setItem('oauth_redirected', 'true');

      // Preserve all URL params and redirect to production
      const productionUrl = window.location.href.replace(
        currentHost, 
        'www.docmile.com'
      );
      
      window.location.href = productionUrl;
    }
  }, [])

  return null // This component renders nothing
}
