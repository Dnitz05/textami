-- Add Google integration fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_tokens JSONB,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_connected_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected ON profiles(google_connected) WHERE google_connected = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_google_tokens ON profiles USING gin(google_tokens) WHERE google_tokens IS NOT NULL;

-- Add RLS policies for Google tokens (only user can access their own tokens)
CREATE POLICY "Users can view their own Google tokens" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own Google tokens" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Comment for documentation
COMMENT ON COLUMN profiles.google_tokens IS 'Encrypted Google OAuth2 tokens (access_token, refresh_token, etc.)';
COMMENT ON COLUMN profiles.google_refresh_token IS 'Google OAuth2 refresh token for token renewal';
COMMENT ON COLUMN profiles.google_connected IS 'Whether user has connected their Google account';
COMMENT ON COLUMN profiles.google_connected_at IS 'Timestamp when Google account was first connected';