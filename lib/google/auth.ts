import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthTokens, GoogleUserProfile, GOOGLE_SCOPES } from './types';

// Google OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
// 🚨 CRITICAL: ALWAYS use production domain for OAuth callback
// Use environment variable if available, otherwise default to docmile.com
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'docmile.com';
const REDIRECT_URI = `https://${BASE_DOMAIN}/api/auth/google/callback`;

// Initialize OAuth2 Client
export function createGoogleOAuth2Client(): OAuth2Client {
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });
}

// Generate Google OAuth URL
export function getGoogleAuthUrl(customState?: string): string {
  const oauth2Client = createGoogleOAuth2Client();
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: GOOGLE_SCOPES.join(' '),
    include_granted_scopes: true,
    prompt: 'consent', // Force consent to get refresh token
    state: customState || generateState(), // Use custom state or generate one
  });

  return url;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<GoogleAuthTokens> {
  const oauth2Client = createGoogleOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      scope: tokens.scope || '',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || 0,
    };
  } catch (error) {
    throw new Error(`Failed to exchange authorization code: ${error}`);
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<GoogleAuthTokens> {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    return {
      access_token: credentials.access_token || '',
      refresh_token: credentials.refresh_token || refreshToken, // Keep original if not provided
      scope: credentials.scope || '',
      token_type: credentials.token_type || 'Bearer',
      expiry_date: credentials.expiry_date || 0,
    };
  } catch (error) {
    throw new Error(`Failed to refresh access token: ${error}`);
  }
}

// Validate access token
export async function validateAccessToken(accessToken: string): Promise<boolean> {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  try {
    const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
    return tokenInfo.expiry_date ? tokenInfo.expiry_date > Date.now() : false;
  } catch (error) {
    return false;
  }
}

// Get user profile information
export async function getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const oauth2Client = createGoogleOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  try {
    const userInfo = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const data = userInfo.data as any;
    
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
      verified_email: data.verified_email,
    };
  } catch (error) {
    throw new Error(`Failed to get user profile: ${error}`);
  }
}

// Check if tokens need refresh (expire within 5 minutes)
export function shouldRefreshToken(expiryDate: number): boolean {
  const now = Date.now();
  const fiveMinutesFromNow = now + (5 * 60 * 1000); // 5 minutes in milliseconds
  return expiryDate <= fiveMinutesFromNow;
}

// Create authenticated OAuth2 client with auto-refresh
export async function createAuthenticatedClient(
  tokens: GoogleAuthTokens,
  onTokenRefresh?: (newTokens: GoogleAuthTokens) => Promise<void>
): Promise<OAuth2Client> {
  const oauth2Client = createGoogleOAuth2Client();
  
  // Set initial credentials
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Set up automatic token refresh
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('Google tokens refreshed automatically');
    
    const updatedTokens: GoogleAuthTokens = {
      access_token: newTokens.access_token || tokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      scope: newTokens.scope || tokens.scope,
      token_type: newTokens.token_type || tokens.token_type,
      expiry_date: newTokens.expiry_date || tokens.expiry_date,
    };

    // Callback to save refreshed tokens
    if (onTokenRefresh) {
      await onTokenRefresh(updatedTokens);
    }
  });

  return oauth2Client;
}

// Generate random state for CSRF protection
function generateState(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to handle Google API errors
export function handleGoogleApiError(error: any): Error {
  // Enhanced error handling with detailed debugging
  console.log('🚨 Google API Error Debug:', {
    hasError: !!error,
    hasResponse: !!error?.response,
    status: error?.response?.status,
    statusText: error?.response?.statusText,
    hasData: !!error?.response?.data,
    errorData: error?.response?.data,
    errorMessage: error?.message,
    errorCode: error?.code,
    errorName: error?.name,
    errorConfig: error?.config ? {
      method: error.config.method,
      url: error.config.url,
      headers: error.config.headers ? Object.keys(error.config.headers) : [],
    } : undefined,
    fullError: JSON.stringify(error, null, 2).substring(0, 1000)
  });

  if (error?.response?.data?.error) {
    const googleError = error.response.data.error;
    
    // Specific handling for common Google API errors
    if (googleError.code === 403) {
      return new Error(`Google API Permission Error: ${googleError.message}. This usually means: 1) Insufficient OAuth scopes, 2) Expired token, 3) Document access restrictions, or 4) API quotas exceeded. Please re-authorize your Google account with proper permissions.`);
    }
    
    if (googleError.code === 404) {
      return new Error(`Google API Not Found Error: ${googleError.message}. The document may have been: 1) Deleted or moved, 2) Made private/restricted, or 3) The document ID is incorrect. Please verify the document exists and is accessible.`);
    }
    
    if (googleError.code === 401) {
      return new Error(`Google API Authentication Error: ${googleError.message}. Your Google authentication has expired or is invalid. Please re-authorize your account.`);
    }
    
    if (googleError.code === 429) {
      return new Error(`Google API Rate Limit Error: ${googleError.message}. Too many requests. Please wait a moment and try again.`);
    }
    
    if (googleError.code === 400) {
      return new Error(`Google API Bad Request Error: ${googleError.message}. This usually indicates an invalid document ID or malformed request parameters.`);
    }
    
    return new Error(`Google API Error: ${googleError.message} (Code: ${googleError.code})`);
  }
  
  // Handle HTTP status errors without detailed error object
  if (error?.response?.status === 403) {
    return new Error(`Google API 403 Forbidden: Access denied. This could be due to insufficient OAuth scopes, expired token, or document sharing restrictions. Please check your Google account authorization.`);
  }
  
  if (error?.response?.status === 404) {
    return new Error(`Google API 404 Not Found: Document not found or not accessible. Please verify the document ID and sharing permissions.`);
  }
  
  if (error?.response?.status === 401) {
    return new Error(`Google API 401 Unauthorized: Authentication failed. Please re-authorize your Google account.`);
  }
  
  if (error?.message) {
    return new Error(`Google API Error: ${error.message}`);
  }
  
  return new Error('Unknown Google API error occurred');
}
