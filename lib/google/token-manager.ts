import { createClient } from '@supabase/supabase-js';
import { GoogleAuthTokens } from './types';
import { refreshAccessToken, shouldRefreshToken } from './auth';
import { encryptGoogleTokens, decryptGoogleTokens, EncryptedData } from '../security/encryption';
import { log } from '../logger';

// Lazy initialization of Supabase client
let supabaseClient: any = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing for token manager');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseClient;
}

// Token storage interface
interface StoredGoogleTokens extends GoogleAuthTokens {
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Save Google tokens to Supabase (encrypted)
export async function saveGoogleTokens(
  userId: string, 
  tokens: GoogleAuthTokens,
  email?: string
): Promise<void> {
  try {
    // 🚨 CRITICAL VALIDATION
    if (!userId || userId.trim() === '') {
      throw new Error('Invalid userId provided to saveGoogleTokens');
    }

    if (!tokens.access_token) {
      throw new Error('Invalid tokens provided - missing access_token');
    }

    log.info('🔐 Attempting to save Google tokens:', {
      userId: userId.substring(0, 8) + '...',
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenExpiryDate: tokens.expiry_date
    });

    // 🚨 ENSURE USER PROFILE EXISTS FIRST
    log.debug('🔍 Checking if user profile exists:', { userId: userId.substring(0, 8) + '...' });
    const { data: existingProfile, error: profileError } = await getSupabaseClient()
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    log.debug('🔍 Profile check result:', { 
      profileExists: !!existingProfile,
      profileError: profileError?.message,
      userId: userId.substring(0, 8) + '...'
    });

    if (profileError || !existingProfile) {
      log.warn('🔥 Profile not found, creating one:', {
        userId: userId.substring(0, 8) + '...',
        profileError: profileError?.message
      });

      // Create profile if it doesn't exist
      const profileData = {
        id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(email && { email })
      };

      const { error: insertError } = await getSupabaseClient()
        .from('profiles')
        .insert(profileData);

      if (insertError) {
        log.error('❌ Failed to create user profile:', {
          userId: userId.substring(0, 8) + '...',
          error: insertError.message,
          code: insertError.code
        });
        throw new Error(`Failed to create user profile: ${insertError.message}`);
      }
    }

    // Encrypt tokens before storing
    log.debug('🔐 Encrypting tokens before database storage:', {
      userId: userId.substring(0, 8) + '...',
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      tokenType: tokens.token_type
    });
    
    const encryptedTokens = encryptGoogleTokens(tokens);
    
    log.debug('🔐 Tokens encrypted successfully, proceeding with database update:', {
      userId: userId.substring(0, 8) + '...',
      hasEncryptedData: !!encryptedTokens,
      updateData: {
        hasEncryptedTokens: !!encryptedTokens,
        hasRefreshToken: !!tokens.refresh_token,
        google_connected: true,
        timestamp: new Date().toISOString()
      }
    });
    
    const { error, data } = await getSupabaseClient()
      .from('profiles')
      .update({
        google_tokens: encryptedTokens,
        google_refresh_token: tokens.refresh_token, // Keep for rotation logic
        google_connected: true,
        google_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();

    log.debug('💾 Database update completed:', {
      userId: userId.substring(0, 8) + '...',
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint,
      dataReturned: !!data,
      rowsAffected: data?.length || 0,
      updateSuccess: !error && !!data
    });

    if (error) {
      log.error('❌ Failed to save encrypted Google tokens:', {
        userId: userId.substring(0, 8) + '...',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to save Google tokens: ${error.message}`);
    }

    log.info('✅ Google tokens saved securely:', {
      userId: userId.substring(0, 8) + '...',
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      rowsUpdated: data?.length || 0
    });

  } catch (error) {
    log.error('💥 CRITICAL ERROR in saveGoogleTokens:', {
      userId: userId?.substring(0, 8) + '...' || 'NULL',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Load Google tokens from Supabase (decrypted)
export async function loadGoogleTokens(userId: string): Promise<GoogleAuthTokens | null> {
  try {
    log.debug('🔍 Loading Google tokens from database:', {
      userId: userId.substring(0, 8) + '...'
    });
    
    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('google_tokens, google_refresh_token, google_connected')
      .eq('id', userId)
      .single();

    log.debug('📊 Database query result for token loading:', {
      userId: userId.substring(0, 8) + '...',
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      hasData: !!data,
      hasTokens: !!data?.google_tokens,
      hasRefreshToken: !!data?.google_refresh_token,
      connected: data?.google_connected
    });

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
      log.info('Refreshing Google tokens for user (expiry check):', {
        userId: userId.substring(0, 8) + '...',
        expiryDate: new Date(tokens.expiry_date).toISOString(),
        currentTime: new Date().toISOString(),
        timeUntilExpiry: tokens.expiry_date - Date.now()
      });
      
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
        log.warn('Failed to refresh Google tokens - clearing invalid tokens:', {
          userId: userId.substring(0, 8) + '...',
          error: error instanceof Error ? error.message : 'Unknown refresh error'
        });
        // Remove invalid tokens and force re-authentication
        await clearGoogleTokens(userId);
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
    const { error } = await getSupabaseClient()
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
      log.debug('No tokens found when checking Google connection status:', {
        userId: userId.substring(0, 8) + '...'
      });
      return { connected: false };
    }

    const now = Date.now();
    const expiresAt = new Date(tokens.expiry_date);
    const needsReauth = !tokens.refresh_token || tokens.expiry_date <= now;
    
    // If tokens are expired and no refresh token, clear them automatically
    if (needsReauth && !tokens.refresh_token) {
      log.warn('Google tokens expired without refresh token - clearing:', {
        userId: userId.substring(0, 8) + '...',
        expiryDate: new Date(tokens.expiry_date).toISOString()
      });
      await clearGoogleTokens(userId);
      return { connected: false, needsReauth: true };
    }

    // Get user profile to get email
    const { data } = await getSupabaseClient()
      .from('profiles')
      .select('email, google_connected')
      .eq('id', userId)
      .single();

    return {
      connected: data?.google_connected || false,
      email: data?.email,
      expiresAt,
      needsReauth,
    };
  } catch (error) {
    log.error('Error getting Google connection status:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: userId.substring(0, 8) + '...'
    });
    return { connected: false };
  }
}

 // Initialize Google connection for user (after OAuth flow)
export async function initializeGoogleConnection(
  userId: string,
  tokens: GoogleAuthTokens,
  email?: string
): Promise<void> {
  try {
    // 🚨 CRITICAL VALIDATION
    if (!userId || userId.trim() === '') {
      throw new Error('Invalid userId provided to initializeGoogleConnection');
    }

    if (!tokens || !tokens.access_token) {
      throw new Error('Invalid tokens provided to initializeGoogleConnection');
    }

    log.info('🚀 Initializing Google connection:', {
      userId: userId.substring(0, 8) + '...',
      hasTokens: !!tokens,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token
    });

    // Save initial tokens (this handles profile creation if needed)
    await saveGoogleTokens(userId, tokens, email);
    
    log.info('✅ Google connection initialized successfully:', {
      userId: userId.substring(0, 8) + '...'
    });

  } catch (error) {
    log.error('💥 CRITICAL ERROR initializing Google connection:', {
      userId: userId?.substring(0, 8) + '...' || 'NULL',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      hasTokens: !!tokens,
      hasAccessToken: !!tokens?.access_token
    });
    throw error;
  }
}

// Disconnect Google account
export async function disconnectGoogleAccount(userId: string): Promise<void> {
  try {
    // Remove tokens
    await removeGoogleTokens(userId);
    
    // Update profile
    await getSupabaseClient()
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
    const { data: profiles, error } = await getSupabaseClient()
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
    const { error } = await getSupabaseClient()
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
