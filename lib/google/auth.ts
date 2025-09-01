import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthTokens, GoogleUserProfile, GOOGLE_SCOPES } from './types';

// Google OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://textami.vercel.app/api/auth/google/callback'
  : 'http://localhost:3000/api/auth/google/callback';

// Initialize OAuth2 Client
export function createGoogleOAuth2Client(): OAuth2Client {
  return new OAuth2Client({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  });
}

// Generate Google OAuth URL
export function getGoogleAuthUrl(): string {
  const oauth2Client = createGoogleOAuth2Client();
  
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: GOOGLE_SCOPES.join(' '),
    include_granted_scopes: true,
    prompt: 'consent', // Force consent to get refresh token
    state: generateState(), // CSRF protection
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
  if (error?.response?.data?.error) {
    const googleError = error.response.data.error;
    return new Error(`Google API Error: ${googleError.message} (Code: ${googleError.code})`);
  }
  
  if (error?.message) {
    return new Error(`Google API Error: ${error.message}`);
  }
  
  return new Error('Unknown Google API error occurred');
}