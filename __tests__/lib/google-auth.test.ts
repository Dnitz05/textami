// __tests__/lib/google-auth.test.ts
// Tests for Google Authentication library - Core OAuth functionality
import { OAuth2Client } from 'google-auth-library'
import {
  createGoogleOAuth2Client,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  validateAccessToken,
  getUserProfile,
  shouldRefreshToken,
  createAuthenticatedClient,
  handleGoogleApiError
} from '@/lib/google/auth'
import {
  mockGoogleTokens,
  mockExpiredGoogleTokens,
  mockGoogleApiResponses,
  mockGoogleApiErrors
} from '../utils/google-test-helpers'

// Mock OAuth2Client
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: jest.fn(),
    getToken: jest.fn(),
    setCredentials: jest.fn(),
    refreshAccessToken: jest.fn(),
    getTokenInfo: jest.fn(),
    request: jest.fn(),
    on: jest.fn()
  }))
}))

const mockOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>

describe('Google Auth Library', () => {
  let mockOAuth2Instance: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockOAuth2Instance = {
      generateAuthUrl: jest.fn(),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
      getTokenInfo: jest.fn(),
      request: jest.fn(),
      on: jest.fn()
    }
    
    mockOAuth2Client.mockImplementation(() => mockOAuth2Instance)
    
    // Mock environment variables
    process.env.GOOGLE_CLIENT_ID = 'mock_client_id'
    process.env.GOOGLE_CLIENT_SECRET = 'mock_client_secret'
    process.env.NODE_ENV = 'development'
  })

  describe('createGoogleOAuth2Client', () => {
    it('should create OAuth2 client with correct configuration', () => {
      const client = createGoogleOAuth2Client()
      
      expect(mockOAuth2Client).toHaveBeenCalledWith({
        clientId: 'mock_client_id',
        clientSecret: 'mock_client_secret',
        redirectUri: 'http://localhost:3000/api/auth/google/callback'
      })
      expect(client).toBeDefined()
    })

    it('should use production redirect URI in production', () => {
      process.env.NODE_ENV = 'production'
      
      const client = createGoogleOAuth2Client()
      
      expect(mockOAuth2Client).toHaveBeenCalledWith({
        clientId: 'mock_client_id',
        clientSecret: 'mock_client_secret',
        redirectUri: 'https://textami.vercel.app/api/auth/google/callback'
      })
    })
  })

  describe('getGoogleAuthUrl', () => {
    it('should generate OAuth URL with correct parameters', () => {
      const mockUrl = 'https://accounts.google.com/oauth/authorize?client_id=mock_client_id'
      mockOAuth2Instance.generateAuthUrl.mockReturnValue(mockUrl)
      
      const url = getGoogleAuthUrl()
      
      expect(mockOAuth2Instance.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets',
        include_granted_scopes: true,
        prompt: 'consent',
        state: expect.stringMatching(/^[A-Za-z0-9]{32}$/) // 32 character random string
      })
      expect(url).toBe(mockUrl)
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens successfully', async () => {
      const authCode = 'mock_authorization_code'
      const mockTokenResponse = {
        tokens: {
          access_token: mockGoogleTokens.access_token,
          refresh_token: mockGoogleTokens.refresh_token,
          scope: mockGoogleTokens.scope,
          token_type: mockGoogleTokens.token_type,
          expiry_date: mockGoogleTokens.expiry_date
        }
      }
      
      mockOAuth2Instance.getToken.mockResolvedValue(mockTokenResponse)
      
      const tokens = await exchangeCodeForTokens(authCode)
      
      expect(mockOAuth2Instance.getToken).toHaveBeenCalledWith(authCode)
      expect(tokens).toEqual(mockGoogleTokens)
    })

    it('should handle token exchange errors', async () => {
      const authCode = 'invalid_code'
      mockOAuth2Instance.getToken.mockRejectedValue(new Error('Invalid authorization code'))
      
      await expect(exchangeCodeForTokens(authCode)).rejects.toThrow(
        'Failed to exchange authorization code: Error: Invalid authorization code'
      )
    })

    it('should handle missing access token in response', async () => {
      const authCode = 'mock_code'
      mockOAuth2Instance.getToken.mockResolvedValue({
        tokens: {
          // access_token missing
          refresh_token: 'refresh_token'
        }
      })
      
      await expect(exchangeCodeForTokens(authCode)).rejects.toThrow(
        'No access token received from Google'
      )
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'mock_refresh_token'
      const mockCredentials = {
        access_token: 'new_access_token',
        refresh_token: refreshToken, // Keep original
        scope: mockGoogleTokens.scope,
        token_type: 'Bearer',
        expiry_date: Date.now() + 3600000
      }
      
      mockOAuth2Instance.refreshAccessToken.mockResolvedValue({
        credentials: mockCredentials
      })
      
      const tokens = await refreshAccessToken(refreshToken)
      
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        refresh_token: refreshToken
      })
      expect(mockOAuth2Instance.refreshAccessToken).toHaveBeenCalled()
      expect(tokens.access_token).toBe('new_access_token')
      expect(tokens.refresh_token).toBe(refreshToken)
    })

    it('should handle refresh token errors', async () => {
      const refreshToken = 'invalid_refresh_token'
      mockOAuth2Instance.refreshAccessToken.mockRejectedValue(
        new Error('Invalid refresh token')
      )
      
      await expect(refreshAccessToken(refreshToken)).rejects.toThrow(
        'Failed to refresh access token: Error: Invalid refresh token'
      )
    })

    it('should preserve original refresh token if not provided in response', async () => {
      const refreshToken = 'original_refresh_token'
      mockOAuth2Instance.refreshAccessToken.mockResolvedValue({
        credentials: {
          access_token: 'new_access_token',
          // refresh_token not provided in response
          expiry_date: Date.now() + 3600000
        }
      })
      
      const tokens = await refreshAccessToken(refreshToken)
      
      expect(tokens.refresh_token).toBe(refreshToken) // Should keep original
    })
  })

  describe('validateAccessToken', () => {
    it('should validate active token successfully', async () => {
      const accessToken = 'valid_access_token'
      mockOAuth2Instance.getTokenInfo.mockResolvedValue({
        expiry_date: Date.now() + 3600000 // Valid for 1 hour
      })
      
      const isValid = await validateAccessToken(accessToken)
      
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        access_token: accessToken
      })
      expect(mockOAuth2Instance.getTokenInfo).toHaveBeenCalledWith(accessToken)
      expect(isValid).toBe(true)
    })

    it('should detect expired tokens', async () => {
      const accessToken = 'expired_access_token'
      mockOAuth2Instance.getTokenInfo.mockResolvedValue({
        expiry_date: Date.now() - 3600000 // Expired 1 hour ago
      })
      
      const isValid = await validateAccessToken(accessToken)
      
      expect(isValid).toBe(false)
    })

    it('should handle validation errors', async () => {
      const accessToken = 'invalid_access_token'
      mockOAuth2Instance.getTokenInfo.mockRejectedValue(
        new Error('Token validation failed')
      )
      
      const isValid = await validateAccessToken(accessToken)
      
      expect(isValid).toBe(false)
    })
  })

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const accessToken = 'valid_access_token'
      mockOAuth2Instance.request.mockResolvedValue(mockGoogleApiResponses.userProfile)
      
      const profile = await getUserProfile(accessToken)
      
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        access_token: accessToken
      })
      expect(mockOAuth2Instance.request).toHaveBeenCalledWith({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo'
      })
      expect(profile).toEqual({
        id: '12345678901234567890',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
        verified_email: true
      })
    })

    it('should handle profile fetch errors', async () => {
      const accessToken = 'invalid_access_token'
      mockOAuth2Instance.request.mockRejectedValue(
        new Error('Failed to fetch user profile')
      )
      
      await expect(getUserProfile(accessToken)).rejects.toThrow(
        'Failed to get user profile: Error: Failed to fetch user profile'
      )
    })
  })

  describe('shouldRefreshToken', () => {
    it('should detect tokens that need refresh', () => {
      const expiryDate = Date.now() + (3 * 60 * 1000) // Expires in 3 minutes
      
      const shouldRefresh = shouldRefreshToken(expiryDate)
      
      expect(shouldRefresh).toBe(true)
    })

    it('should not refresh tokens that are still valid', () => {
      const expiryDate = Date.now() + (10 * 60 * 1000) // Expires in 10 minutes
      
      const shouldRefresh = shouldRefreshToken(expiryDate)
      
      expect(shouldRefresh).toBe(false)
    })

    it('should refresh expired tokens', () => {
      const expiryDate = Date.now() - (1 * 60 * 1000) // Expired 1 minute ago
      
      const shouldRefresh = shouldRefreshToken(expiryDate)
      
      expect(shouldRefresh).toBe(true)
    })
  })

  describe('createAuthenticatedClient', () => {
    it('should create authenticated client with auto-refresh', async () => {
      const mockCallback = jest.fn()
      
      const client = await createAuthenticatedClient(mockGoogleTokens, mockCallback)
      
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({
        access_token: mockGoogleTokens.access_token,
        refresh_token: mockGoogleTokens.refresh_token,
        expiry_date: mockGoogleTokens.expiry_date
      })
      expect(mockOAuth2Instance.on).toHaveBeenCalledWith('tokens', expect.any(Function))
      expect(client).toBe(mockOAuth2Instance)
    })

    it('should handle token refresh callback', async () => {
      const mockCallback = jest.fn()
      let tokenCallback: Function
      
      mockOAuth2Instance.on.mockImplementation((event, callback) => {
        if (event === 'tokens') {
          tokenCallback = callback
        }
      })
      
      await createAuthenticatedClient(mockGoogleTokens, mockCallback)
      
      // Simulate token refresh
      const newTokens = {
        access_token: 'new_access_token',
        expiry_date: Date.now() + 3600000
      }
      
      await tokenCallback(newTokens)
      
      expect(mockCallback).toHaveBeenCalledWith({
        access_token: 'new_access_token',
        refresh_token: mockGoogleTokens.refresh_token, // Should preserve original
        scope: mockGoogleTokens.scope,
        token_type: mockGoogleTokens.token_type,
        expiry_date: newTokens.expiry_date
      })
    })
  })

  describe('handleGoogleApiError', () => {
    it('should handle Google API error with structured response', () => {
      const googleError = {
        response: {
          data: {
            error: {
              message: 'The caller does not have permission',
              code: 403
            }
          }
        }
      }
      
      const handledError = handleGoogleApiError(googleError)
      
      expect(handledError.message).toBe('Google API Error: The caller does not have permission (Code: 403)')
    })

    it('should handle error with simple message', () => {
      const simpleError = {
        message: 'Network timeout'
      }
      
      const handledError = handleGoogleApiError(simpleError)
      
      expect(handledError.message).toBe('Google API Error: Network timeout')
    })

    it('should handle unknown errors', () => {
      const unknownError = { someProperty: 'unknown' }
      
      const handledError = handleGoogleApiError(unknownError)
      
      expect(handledError.message).toBe('Unknown Google API error occurred')
    })

    it('should handle null/undefined errors', () => {
      const handledError1 = handleGoogleApiError(null)
      const handledError2 = handleGoogleApiError(undefined)
      
      expect(handledError1.message).toBe('Unknown Google API error occurred')
      expect(handledError2.message).toBe('Unknown Google API error occurred')
    })
  })

  describe('Environment Configuration', () => {
    it('should handle missing environment variables gracefully', () => {
      delete process.env.GOOGLE_CLIENT_ID
      delete process.env.GOOGLE_CLIENT_SECRET
      
      expect(() => createGoogleOAuth2Client()).not.toThrow()
      
      expect(mockOAuth2Client).toHaveBeenCalledWith({
        clientId: undefined,
        clientSecret: undefined,
        redirectUri: 'http://localhost:3000/api/auth/google/callback'
      })
    })
  })
})