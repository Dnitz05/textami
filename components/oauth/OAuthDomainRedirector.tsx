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
      console.log('🔄 CLIENT: Redirecting OAuth from preview to production:', {
        from: currentHost,
        to: 'textami.vercel.app',
        path: window.location.pathname,
        search: window.location.search
      })

      // Preserve all URL params and redirect to production
      const productionUrl = window.location.href.replace(
        currentHost, 
        'textami.vercel.app'
      )
      
      window.location.href = productionUrl
    }
  }, [])

  return null // This component renders nothing
}