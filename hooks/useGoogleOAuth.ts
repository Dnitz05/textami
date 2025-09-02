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
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('ls_state', oauthState.state);
        currentUrl.searchParams.set('ls_flow', oauthState.flow);
        
        if (oauthState.userId) {
          currentUrl.searchParams.set('ls_user_id', oauthState.userId);
        }

        // Clear localStorage and redirect with enhanced params
        clearOAuthState();
        window.location.href = currentUrl.toString();
      }
    }
  } catch (error) {
    console.warn('Failed to process OAuth localStorage fallback:', error);
    clearOAuthState();
  }
}