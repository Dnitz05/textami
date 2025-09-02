// lib/oauth/client-state-manager.ts
// Client-side OAuth state management with localStorage fallback

export interface OAuthState {
  state: string;
  timestamp: number;
  flow: 'signin' | 'connect';
  userId?: string;
}

const STORAGE_KEY = 'textami_oauth_state';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Store OAuth state in localStorage for cross-domain fallback
 */
export function storeOAuthState(state: string, flow: 'signin' | 'connect', userId?: string): void {
  if (typeof window === 'undefined') return;
  
  const oauthState: OAuthState = {
    state,
    timestamp: Date.now(),
    flow,
    userId
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oauthState));
  } catch (error) {
    console.warn('Failed to store OAuth state in localStorage:', error);
  }
}

/**
 * Retrieve and validate OAuth state from localStorage
 */
export function getOAuthState(expectedState: string): OAuthState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const oauthState: OAuthState = JSON.parse(stored);
    
    // Check expiry
    if (Date.now() - oauthState.timestamp > STATE_EXPIRY_MS) {
      clearOAuthState();
      return null;
    }
    
    // Validate state token
    if (oauthState.state !== expectedState) {
      return null;
    }
    
    return oauthState;
  } catch (error) {
    console.warn('Failed to retrieve OAuth state from localStorage:', error);
    clearOAuthState();
    return null;
  }
}

/**
 * Clear OAuth state from localStorage
 */
export function clearOAuthState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear OAuth state from localStorage:', error);
  }
}

/**
 * Check if current environment supports localStorage
 */
export function supportsLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const testKey = '__test_localStorage__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}