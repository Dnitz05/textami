// lib/security/encryption.ts
// Secure token encryption system for Google OAuth tokens
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'dev-key-32-chars-minimum-length';

// Ensure key is exactly 32 bytes
function getEncryptionKey(): Buffer {
  const key = ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for production');
  }
  
  // Hash the key to ensure it's exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt sensitive data (like Google OAuth tokens)
 */
export function encrypt(text: string): EncryptedData {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: '' // Not used for CBC mode
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(data: EncryptedData): string {
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(data.iv, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt Google OAuth tokens for secure storage
 */
export function encryptGoogleTokens(tokens: any): EncryptedData {
  const tokenString = JSON.stringify(tokens);
  return encrypt(tokenString);
}

/**
 * Decrypt Google OAuth tokens from storage
 */
export function decryptGoogleTokens(encryptedData: EncryptedData): any {
  const tokenString = decrypt(encryptedData);
  return JSON.parse(tokenString);
}

/**
 * Generate a secure random string for CSRF tokens
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for logging (one-way hash)
 */
export function hashForLogging(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
}