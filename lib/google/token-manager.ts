import { createClient } from '@supabase/supabase-js';
import { GoogleAuthTokens } from './types';
import { refreshAccessToken, shouldRefreshToken } from './auth';
import { encryptGoogleTokens, decryptGoogleTokens, EncryptedData } from '../security/encryption';
import { log } from '../logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Token storage interface
interface StoredGoogleTokens extends GoogleAuthTokens {
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Save Google tokens to Supabase (encrypted)
export async function saveGoogleTokens(
  userId: string, 
  tokens: GoogleAuthTokens
): Promise<void> {
  try {
    // Encrypt tokens before storing
    const encryptedTokens = encryptGoogleTokens(tokens);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        google_tokens: encryptedTokens,
        google_refresh_token: tokens.refresh_token, // Keep for rotation logic
        google_connected: true,
        google_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      log.error('Failed to save encrypted Google tokens:', {
        userId: userId.substring(0, 8) + '...',
        error: error.message
      });
      throw new Error('Failed to save Google tokens');
    }

    log.debug('Google tokens saved securely:', {
      userId: userId.substring(0, 8) + '...',
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token
    });

    console.log('Google tokens saved successfully for user:', userId);
  } catch (error) {
    console.error('Error in saveGoogleTokens:', error);
    throw error;
  }
}

// Load Google tokens from Supabase (decrypted)
export async function loadGoogleTokens(userId: string): Promise<GoogleAuthTokens | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('google_tokens, google_refresh_token, google_connected')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('Database error loading Google tokens:', {
        userId: userId.substring(0, 8) + '...',
        error: error.message
      });
      return null;
    }

    if (!data?.google_tokens || !data?.google_connected) {
      log.debug('No Google tokens found for user:', {
        userId: userId.substring(0, 8) + '...',
        hasTokens: !!data?.google_tokens,
        connected: !!data?.google_connected
      });
      return null;
    }

    try {
      // Decrypt tokens
      const decryptedTokens = decryptGoogleTokens(data.google_tokens as EncryptedData);
      
      log.debug('Google tokens loaded and decrypted:', {
        userId: userId.substring(0, 8) + '...',
        hasAccessToken: !!decryptedTokens.access_token,
        hasRefreshToken: !!decryptedTokens.refresh_token
      });

      return decryptedTokens as GoogleAuthTokens;
    } catch (decryptError) {
      log.error('Failed to decrypt Google tokens - clearing corrupted data:', {
        userId: userId.substring(0, 8) + '...',
        error: decryptError instanceof Error ? decryptError.message : 'Decryption failed'
      });
      
      // Clear corrupted tokens
      await clearGoogleTokens(userId);
      return null;
    }
  } catch (error) {
    console.error('Error in loadGoogleTokens:', error);
    return null;
  }
}

// Get valid Google tokens (refresh if needed)
export async function getValidGoogleTokens(userId: string): Promise<GoogleAuthTokens | null> {
  try {
    const tokens = await loadGoogleTokens(userId);
    
    if (!tokens) {
      return null;
    }

    // Check if token needs refresh
    if (shouldRefreshToken(tokens.expiry_date)) {
      console.log('Refreshing Google tokens for user:', userId);
      
      if (!tokens.refresh_token) {
        console.error('No refresh token available for user:', userId);
        return null;
      }

      try {
        const refreshedTokens = await refreshAccessToken(tokens.refresh_token);
        
        // Save refreshed tokens
        await saveGoogleTokens(userId, refreshedTokens);
        
        return refreshedTokens;
      } catch (error) {
        console.error('Failed to refresh Google tokens:', error);
        // Remove invalid tokens
        await removeGoogleTokens(userId);
        return null;
      }
    }

    return tokens;
  } catch (error) {
    console.error('Error in getValidGoogleTokens:', error);
    return null;
  }
}

// Remove Google tokens from Supabase
export async function removeGoogleTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        google_tokens: null,
        google_refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error removing Google tokens:', error);
      throw new Error(`Failed to remove Google tokens: ${error.message}`);
    }

    console.log('Google tokens removed successfully for user:', userId);
  } catch (error) {
    console.error('Error in removeGoogleTokens:', error);
    throw error;
  }
}

// Check if user has valid Google tokens
export async function hasValidGoogleTokens(userId: string): Promise<boolean> {
  const tokens = await getValidGoogleTokens(userId);
  return tokens !== null;
}

// Get Google connection status
export async function getGoogleConnectionStatus(userId: string): Promise<{
  connected: boolean;
  email?: string;
  expiresAt?: Date;
  needsReauth?: boolean;
}> {
  try {
    const tokens = await loadGoogleTokens(userId);
    
    if (!tokens) {
      return { connected: false };
    }

    const now = Date.now();
    const expiresAt = new Date(tokens.expiry_date);
    const needsReauth = !tokens.refresh_token || tokens.expiry_date <= now;

    // Get user profile to get email
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    return {
      connected: true,
      email: data?.email,
      expiresAt,
      needsReauth,
    };
  } catch (error) {
    console.error('Error getting Google connection status:', error);
    return { connected: false };
  }
}

// Initialize Google connection for user (after OAuth flow)
export async function initializeGoogleConnection(
  userId: string,
  tokens: GoogleAuthTokens
): Promise<void> {
  try {
    // Save initial tokens
    await saveGoogleTokens(userId, tokens);
    
    // Update user profile to mark Google as connected
    await supabase
      .from('profiles')
      .update({
        google_connected: true,
        google_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log('Google connection initialized for user:', userId);
  } catch (error) {
    console.error('Error initializing Google connection:', error);
    throw error;
  }
}

// Disconnect Google account
export async function disconnectGoogleAccount(userId: string): Promise<void> {
  try {
    // Remove tokens
    await removeGoogleTokens(userId);
    
    // Update profile
    await supabase
      .from('profiles')
      .update({
        google_connected: false,
        google_connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    console.log('Google account disconnected for user:', userId);
  } catch (error) {
    console.error('Error disconnecting Google account:', error);
    throw error;
  }
}

// Bulk token refresh (for maintenance)
export async function refreshAllExpiredTokens(): Promise<{
  refreshed: number;
  failed: number;
  errors: string[];
}> {
  try {
    // Get all users with Google tokens
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, google_tokens, google_refresh_token')
      .not('google_tokens', 'is', null);

    if (error || !profiles) {
      throw new Error(`Failed to get profiles: ${error?.message}`);
    }

    let refreshed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      try {
        const tokens = profile.google_tokens as GoogleAuthTokens;
        
        if (shouldRefreshToken(tokens.expiry_date) && tokens.refresh_token) {
          const newTokens = await refreshAccessToken(tokens.refresh_token);
          await saveGoogleTokens(profile.id, newTokens);
          refreshed++;
        }
      } catch (error) {
        failed++;
        errors.push(`User ${profile.id}: ${error}`);
        
        // Remove invalid tokens
        await removeGoogleTokens(profile.id);
      }
    }

    return { refreshed, failed, errors };
  } catch (error) {
    console.error('Error in bulk token refresh:', error);
    throw error;
  }
}

// Clear Google tokens (for security cleanup)
export async function clearGoogleTokens(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        google_tokens: null,
        google_refresh_token: null,
        google_connected: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      log.error('Failed to clear Google tokens:', {
        userId: userId.substring(0, 8) + '...',
        error: error.message
      });
      throw new Error('Failed to clear Google tokens');
    }

    log.info('Google tokens cleared for security:', {
      userId: userId.substring(0, 8) + '...'
    });
  } catch (error) {
    log.error('Error in clearGoogleTokens:', error);
    throw error;
  }
}