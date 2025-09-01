// __tests__/api/google-drive-files.test.ts
// Tests for Google Drive Files API - Document listing and access
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/google/drive/files/route'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import {
  mockGoogleTokens,
  mockExpiredGoogleTokens,
  mockGoogleDriveFiles,
  mockGoogleApiResponses,
  mockGoogleApiErrors,
  createMockUserSession,
  createGoogleApiRequest,
  createMockSupabaseUser,
  expectedGoogleApiResponses
} from '../utils/google-test-helpers'

// Mock modules
jest.mock('@supabase/supabase-js')
jest.mock('googleapis')
jest.mock('google-auth-library')

// Mock security middleware
jest.mock('@/lib/security/auth-middleware', () => ({
  validateUserSession: jest.fn(),
  checkRateLimit: jest.fn()
}))

// Mock Google services
jest.mock('@/lib/google/token-manager')
jest.mock('@/lib/google/drive-client')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGoogle = google as jest.Mocked<typeof google>
const mockOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>

// Import mocked middleware
import { validateUserSession, checkRateLimit } from '@/lib/security/auth-middleware'
const mockValidateUserSession = validateUserSession as jest.MockedFunction<typeof validateUserSession>
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>

// Import mocked services
import { getValidGoogleTokens } from '@/lib/google/token-manager'
import { createGoogleDriveClient } from '@/lib/google/drive-client'

const mockGetValidGoogleTokens = getValidGoogleTokens as jest.MockedFunction<typeof getValidGoogleTokens>
const mockCreateGoogleDriveClient = createGoogleDriveClient as jest.MockedFunction<typeof createGoogleDriveClient>

describe('/api/google/drive/files', () => {
  let mockSupabaseClient: any
  let mockGoogleDriveClient: any
  let mockOAuth2Instance: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Mock successful authentication by default
    mockValidateUserSession.mockResolvedValue({
      user: createMockSupabaseUser(),
      error: null,
      response: null
    })
    
    // Mock successful rate limiting by default
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      response: null
    })
    
    // Mock valid Google tokens by default
    mockGetValidGoogleTokens.mockResolvedValue(mockGoogleTokens)
    
    // Mock OAuth2 client instance
    mockOAuth2Instance = {
      setCredentials: jest.fn(),
      on: jest.fn()
    }
    mockOAuth2Client.mockImplementation(() => mockOAuth2Instance)
    
    // Mock Google Drive client
    mockGoogleDriveClient = {
      listFiles: jest.fn()
    }
    mockCreateGoogleDriveClient.mockResolvedValue(mockGoogleDriveClient)
  })

  describe('GET /api/google/drive/files', () => {
    it('should list Google Drive files successfully', async () => {
      // Mock successful file listing
      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: mockGoogleDriveFiles,
        nextPageToken: null,
        totalFiles: mockGoogleDriveFiles.length
      })

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(mockGoogleDriveFiles.length)
      expect(result.totalFiles).toBe(mockGoogleDriveFiles.length)
      expect(result.files[0]).toEqual(mockGoogleDriveFiles[0])
      
      // Verify Drive client was called correctly
      expect(mockGetValidGoogleTokens).toHaveBeenCalledWith(createMockSupabaseUser().id)
      expect(mockCreateGoogleDriveClient).toHaveBeenCalledWith(mockGoogleTokens, expect.any(Function))
      expect(mockGoogleDriveClient.listFiles).toHaveBeenCalledWith({
        mimeType: 'application/vnd.google-apps.document',
        maxResults: 50,
        pageToken: undefined,
        orderBy: 'modifiedTime desc'
      })
    })

    it('should handle pagination with pageToken', async () => {
      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: [mockGoogleDriveFiles[0]],
        nextPageToken: 'next_page_token_123',
        totalFiles: 1
      })

      const url = 'http://localhost/api/google/drive/files?pageToken=current_page_token_456&limit=10'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.nextPageToken).toBe('next_page_token_123')
      
      expect(mockGoogleDriveClient.listFiles).toHaveBeenCalledWith({
        mimeType: 'application/vnd.google-apps.document',
        maxResults: 10,
        pageToken: 'current_page_token_456',
        orderBy: 'modifiedTime desc'
      })
    })

    it('should handle file type filtering', async () => {
      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: mockGoogleDriveFiles,
        nextPageToken: null,
        totalFiles: mockGoogleDriveFiles.length
      })

      const url = 'http://localhost/api/google/drive/files?fileType=sheets'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(mockGoogleDriveClient.listFiles).toHaveBeenCalledWith({
        mimeType: 'application/vnd.google-apps.spreadsheet',
        maxResults: 50,
        pageToken: undefined,
        orderBy: 'modifiedTime desc'
      })
    })

    it('should handle search query', async () => {
      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: [mockGoogleDriveFiles[1]], // Contract Template
        nextPageToken: null,
        totalFiles: 1
      })

      const url = 'http://localhost/api/google/drive/files?search=contract'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.files).toHaveLength(1)
      expect(result.files[0].name).toBe('Contract Template')
      
      expect(mockGoogleDriveClient.listFiles).toHaveBeenCalledWith({
        mimeType: 'application/vnd.google-apps.document',
        maxResults: 50,
        pageToken: undefined,
        orderBy: 'modifiedTime desc',
        search: 'contract'
      })
    })

    it('should reject requests without valid authentication', async () => {
      mockValidateUserSession.mockResolvedValue({
        user: null,
        error: 'Authentication required',
        response: new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      })

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toBe('Authentication required')
    })

    it('should handle rate limiting', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        response: new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      })

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(429)
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('should handle expired Google tokens', async () => {
      mockGetValidGoogleTokens.mockResolvedValue(null) // No valid tokens

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('Google authentication required')
    })

    it('should handle Google Drive API errors', async () => {
      mockGoogleDriveClient.listFiles.mockRejectedValue(
        new Error('Google API Error: The caller does not have permission (Code: 403)')
      )

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('Failed to access Google Drive')
      expect(result.type).toBe('google_drive_error')
    })

    it('should handle quota exceeded errors', async () => {
      mockGoogleDriveClient.listFiles.mockRejectedValue(
        new Error('Google API Error: Quota exceeded for quota metric (Code: 429)')
      )

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(429)
      expect(result.error).toContain('Google API quota exceeded')
      expect(result.type).toBe('google_drive_error')
    })

    it('should validate limit parameter bounds', async () => {
      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: mockGoogleDriveFiles,
        nextPageToken: null,
        totalFiles: mockGoogleDriveFiles.length
      })

      // Test with limit too high
      const url = 'http://localhost/api/google/drive/files?limit=200'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(mockGoogleDriveClient.listFiles).toHaveBeenCalledWith({
        mimeType: 'application/vnd.google-apps.document',
        maxResults: 100, // Should be capped at 100
        pageToken: undefined,
        orderBy: 'modifiedTime desc'
      })
    })

    it('should return empty results when no files found', async () => {
      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: [],
        nextPageToken: null,
        totalFiles: 0
      })

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.files).toEqual([])
      expect(result.totalFiles).toBe(0)
      expect(result.nextPageToken).toBeNull()
    })

    it('should handle invalid file type parameter', async () => {
      const url = 'http://localhost/api/google/drive/files?fileType=invalid'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid file type parameter')
    })

    it('should include file metadata in response', async () => {
      const enrichedFiles = mockGoogleDriveFiles.map(file => ({
        ...file,
        capabilities: {
          canEdit: true,
          canComment: true,
          canShare: true
        },
        lastModifyingUser: {
          displayName: 'Test User',
          emailAddress: 'test@example.com'
        }
      }))

      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: enrichedFiles,
        nextPageToken: null,
        totalFiles: enrichedFiles.length
      })

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.files[0]).toHaveProperty('capabilities')
      expect(result.files[0]).toHaveProperty('lastModifyingUser')
      expect(result.files[0].capabilities.canEdit).toBe(true)
    })

    it('should handle network timeout errors', async () => {
      mockGoogleDriveClient.listFiles.mockRejectedValue(
        new Error('TIMEOUT: Request took too long')
      )

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('TIMEOUT: Request took too long')
      expect(result.type).toBe('google_drive_error')
    })

    it('should sort files by modified time descending by default', async () => {
      const sortedFiles = [...mockGoogleDriveFiles].sort((a, b) => 
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )

      mockGoogleDriveClient.listFiles.mockResolvedValue({
        files: sortedFiles,
        nextPageToken: null,
        totalFiles: sortedFiles.length
      })

      const request = new Request('http://localhost/api/google/drive/files', {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.files[0].name).toBe('Contract Template') // More recently modified
      expect(result.files[1].name).toBe('Test Document 1')
      
      expect(mockGoogleDriveClient.listFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: 'modifiedTime desc'
        })
      )
    })
  })
})