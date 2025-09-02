// hooks/useGoogleOAuth.ts
// Client-side Google OAuth hook with localStorage fallback

import { useState, useCallback } from 'react';
import { storeOAuthState, clearOAuthState } from '@/lib/oauth/client-state-manager';

interface UseGoogleOAuthResult {
  initiateGoogleAuth: (flow: 'signin' | 'connect') => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useGoogleOAuth(): UseGoogleOAuthResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateGoogleAuth = useCallback(async (flow: 'signin' | 'connect') => {
    setLoading(true);
    setError(null);

    // 🚨 CRITICAL: Force OAuth to production domain
    const currentHost = window.location.host;
    const isPreview = currentHost.includes('vercel.app') && !currentHost.includes('textami.vercel.app');
    
    if (isPreview) {
      console.log('🔄 HOOK: Redirecting OAuth initiation from preview to production:', {
        from: currentHost,
        to: 'textami.vercel.app'
      });
      
      const productionUrl = `https://textami.vercel.app${window.location.pathname}${window.location.search}`;
      window.location.href = productionUrl;
      return;
    }

    try {
      const endpoint = flow === 'signin' ? '/api/auth/google/signin' : '/api/auth/google';
      const method = flow === 'signin' ? 'POST' : 'GET';

      if (method === 'POST') {
        // For signin, get the auth URL via API
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to initiate Google authentication');
        }

        const data = await response.json();
        if (data.authUrl) {
          // Store state in localStorage before redirecting
          storeOAuthState(data.state, flow);
          window.location.href = data.authUrl;
        }
      } else {
        // For connect, try AJAX first
        const response = await fetch(endpoint, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.redirectUrl) {
            // Store state in localStorage before redirecting
            storeOAuthState(data.state, flow, data.userId);
            window.location.href = data.redirectUrl;
            return;
          }
        }

        // Fallback to direct redirect
        window.location.href = endpoint;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate Google authentication';
      setError(errorMessage);
      console.error('Google OAuth initiation error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initiateGoogleAuth,
    loading,
    error
  };
}

// Client-side callback handler for localStorage fallback
export function handleOAuthCallback() {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const state = urlParams.get('state');
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  // Don't process if we already have fallback params
  const hasCallbackParams = urlParams.has('ls_state');
  if (hasCallbackParams) {
    console.log('🔄 OAuth callback already has fallback params, skipping processing');
    return;
  }

  if (error || !code || !state) {
    clearOAuthState();
    return;
  }

  // Try to get OAuth state from localStorage
  try {
    const storedState = localStorage.getItem('textami_oauth_state');
    if (storedState) {
      const oauthState = JSON.parse(storedState);
      
      // If state matches and we have stored data, add to URL for server
      if (oauthState.state === state) {
        console.log('🚨 CRITICAL: Adding URL fallback params for OAuth callback:', {
          state: oauthState.state,
          flow: oauthState.flow,
          hasUserId: !!oauthState.userId
        });

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('ls_state', oauthState.state);
        currentUrl.searchParams.set('ls_flow', oauthState.flow);
        
        if (oauthState.userId) {
          currentUrl.searchParams.set('ls_user_id', oauthState.userId);
        }

        // Clear localStorage and redirect with enhanced params
        clearOAuthState();
        window.location.href = currentUrl.toString();
      } else {
        console.warn('🔄 State mismatch between localStorage and callback:', {
          stored: oauthState.state,
          callback: state
        });
      }
    } else {
      console.warn('🔄 No OAuth state found in localStorage for callback');
    }
  } catch (error) {
    console.warn('Failed to process OAuth localStorage fallback:', error);
    clearOAuthState();
  }
}