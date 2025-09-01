// __tests__/api/google-docs-analyze.test.ts
// Tests for Google Docs Analysis API - Core Google Docs functionality
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/google/docs/analyze/route'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import {
  mockGoogleTokens,
  mockExpiredGoogleTokens,
  mockGoogleDocument,
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
jest.mock('@/lib/google/docs-service')
jest.mock('@/lib/ai/google-docs-analyzer')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGoogle = google as jest.Mocked<typeof google>
const mockOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>

// Import mocked middleware
import { validateUserSession, checkRateLimit } from '@/lib/security/auth-middleware'
const mockValidateUserSession = validateUserSession as jest.MockedFunction<typeof validateUserSession>
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>

// Import mocked services
import { getValidGoogleTokens } from '@/lib/google/token-manager'
import { createGoogleDocsService } from '@/lib/google/docs-service'
import { analyzeGoogleDocsHTML } from '@/lib/ai/google-docs-analyzer'

const mockGetValidGoogleTokens = getValidGoogleTokens as jest.MockedFunction<typeof getValidGoogleTokens>
const mockCreateGoogleDocsService = createGoogleDocsService as jest.MockedFunction<typeof createGoogleDocsService>
const mockAnalyzeGoogleDocsHTML = analyzeGoogleDocsHTML as jest.MockedFunction<typeof analyzeGoogleDocsHTML>

describe('/api/google/docs/analyze', () => {
  let mockSupabaseClient: any
  let mockGoogleDocsService: any
  let mockOAuth2Instance: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
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
    
    // Mock Google Docs service
    mockGoogleDocsService = {
      parseDocumentContent: jest.fn()
    }
    mockCreateGoogleDocsService.mockResolvedValue(mockGoogleDocsService)
  })

  describe('POST /api/google/docs/analyze', () => {
    const validRequestBody = {
      documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      fileName: 'Test Document',
      useGemini: false
    }

    it('should analyze Google Doc successfully', async () => {
      // Mock successful document parsing
      mockGoogleDocsService.parseDocumentContent.mockResolvedValue({
        html: '<div><h1>Client Contract Template</h1><p>Dear CLIENT_NAME, this contract is for AMOUNT euros.</p></div>',
        cleanedHtml: '<div class="google-doc"><h1>Client Contract Template</h1><p>Dear CLIENT_NAME, this contract is for AMOUNT euros.</p></div>',
        structure: {
          headings: [{ level: 1, text: 'Client Contract Template', startIndex: 0, endIndex: 25 }],
          paragraphs: [{ text: 'Dear CLIENT_NAME, this contract is for AMOUNT euros.', startIndex: 26, endIndex: 78 }],
          tables: [],
          images: [],
          styles: { fontSize: 12, fontFamily: 'Arial', marginTop: 0, marginBottom: 0, lineHeight: 1.2 }
        },
        metadata: {
          id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          name: 'Test Document',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: '2024-01-01T00:00:00.000Z',
          modifiedTime: '2024-01-15T10:30:00.000Z',
          owners: [],
          permissions: []
        }
      })

      // Mock AI analysis
      mockAnalyzeGoogleDocsHTML.mockResolvedValue({
        templateId: 'google_doc_123456789_abcdefgh',
        fileName: 'Test Document',
        placeholders: [
          {
            text: 'CLIENT_NAME',
            variable: 'client_name',
            confidence: 95,
            context: 'Client name placeholder',
            type: 'text'
          },
          {
            text: 'AMOUNT',
            variable: 'amount',
            confidence: 90,
            context: 'Contract amount',
            type: 'number'
          }
        ],
        sections: [],
        tables: [],
        transcription: '<div class="google-doc"><h1>Client Contract Template</h1><p>Dear CLIENT_NAME, this contract is for AMOUNT euros.</p></div>',
        confidence: 92,
        metadata: {
          extractionMethod: 'google-docs-api',
          processingTimeMs: 2300,
          elementsFound: {
            sections: 1,
            tables: 0,
            signatures: 0,
            paragraphs: 1
          }
        }
      })

      // Mock successful template save
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { id: 'google_doc_123456789_abcdefgh', name: 'Test Document' },
        error: null
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        templateId: 'google_doc_123456789_abcdefgh',
        fileName: 'Test Document',
        sourceType: 'google-docs',
        googleDocId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        placeholders: expect.arrayContaining([
          expect.objectContaining({
            text: 'CLIENT_NAME',
            confidence: 95
          })
        ])
      })

      // Verify services were called correctly
      expect(mockGetValidGoogleTokens).toHaveBeenCalledWith(createMockSupabaseUser().id)
      expect(mockCreateGoogleDocsService).toHaveBeenCalledWith(mockGoogleTokens, expect.any(Function))
      expect(mockGoogleDocsService.parseDocumentContent).toHaveBeenCalledWith(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        expect.objectContaining({
          preserveFormatting: true,
          convertToSemantic: true,
          removeEmptyElements: true
        })
      )
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

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
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

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(429)
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('should reject requests with invalid document ID', async () => {
      const invalidRequestBody = {
        ...validRequestBody,
        documentId: 'invalid_doc_id'
      }

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        invalidRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toContain('documentId')
    })

    it('should handle expired Google tokens', async () => {
      mockGetValidGoogleTokens.mockResolvedValue(null) // No valid tokens

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('Google authentication required')
    })

    it('should handle Google API document access errors', async () => {
      mockGoogleDocsService.parseDocumentContent.mockRejectedValue(
        new Error('Google API Error: Requested entity was not found (Code: 404)')
      )

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Google Document not found or not accessible')
    })

    it('should handle document content extraction failures', async () => {
      mockGoogleDocsService.parseDocumentContent.mockResolvedValue({
        html: '<div></div>',
        cleanedHtml: null, // Extraction failed
        structure: {
          headings: [],
          paragraphs: [],
          tables: [],
          images: [],
          styles: { fontSize: 12, fontFamily: 'Arial', marginTop: 0, marginBottom: 0, lineHeight: 1.2 }
        },
        metadata: {
          id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          name: 'Test Document',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: '2024-01-01T00:00:00.000Z',
          modifiedTime: '2024-01-15T10:30:00.000Z',
          owners: [],
          permissions: []
        }
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('Failed to extract HTML content')
    })

    it('should handle AI analysis failures gracefully', async () => {
      // Mock successful document parsing but AI failure
      mockGoogleDocsService.parseDocumentContent.mockResolvedValue({
        html: '<div><p>Test content</p></div>',
        cleanedHtml: '<div><p>Test content</p></div>',
        structure: {
          headings: [],
          paragraphs: [{ text: 'Test content', startIndex: 0, endIndex: 12 }],
          tables: [],
          images: [],
          styles: { fontSize: 12, fontFamily: 'Arial', marginTop: 0, marginBottom: 0, lineHeight: 1.2 }
        },
        metadata: {
          id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          name: 'Test Document',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: '2024-01-01T00:00:00.000Z',
          modifiedTime: '2024-01-15T10:30:00.000Z',
          owners: [],
          permissions: []
        }
      })

      mockAnalyzeGoogleDocsHTML.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('OpenAI API rate limit exceeded')
      expect(result.type).toBe('google_docs_analysis_error')
    })

    it('should handle database save failures', async () => {
      // Mock successful analysis
      mockGoogleDocsService.parseDocumentContent.mockResolvedValue({
        html: '<div><p>Test</p></div>',
        cleanedHtml: '<div><p>Test</p></div>',
        structure: {
          headings: [],
          paragraphs: [],
          tables: [],
          images: [],
          styles: { fontSize: 12, fontFamily: 'Arial', marginTop: 0, marginBottom: 0, lineHeight: 1.2 }
        },
        metadata: {
          id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          name: 'Test Document',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: '2024-01-01T00:00:00.000Z',
          modifiedTime: '2024-01-15T10:30:00.000Z',
          owners: [],
          permissions: []
        }
      })

      mockAnalyzeGoogleDocsHTML.mockResolvedValue({
        templateId: 'google_doc_123456789_abcdefgh',
        fileName: 'Test Document',
        placeholders: [],
        sections: [],
        tables: [],
        transcription: '<div><p>Test</p></div>',
        confidence: 90,
        metadata: {
          extractionMethod: 'google-docs-api',
          processingTimeMs: 1000,
          elementsFound: {
            sections: 0,
            tables: 0,
            signatures: 0,
            paragraphs: 1
          }
        }
      })

      // Mock database failure
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to save template')
    })

    it('should use Gemini when requested and available', async () => {
      const geminiRequestBody = {
        ...validRequestBody,
        useGemini: true
      }

      // Mock Gemini availability
      jest.mock('@/lib/ai/gemini-analyzer', () => ({
        isGeminiAvailable: () => true,
        analyzeWithGemini: jest.fn()
      }))

      const { analyzeWithGemini } = require('@/lib/ai/gemini-analyzer')
      analyzeWithGemini.mockResolvedValue({
        templateId: 'google_doc_123456789_abcdefgh',
        fileName: 'Test Document',
        placeholders: [],
        sections: [],
        tables: [],
        transcription: '<div><p>Test</p></div>',
        confidence: 90,
        metadata: {
          extractionMethod: 'google-docs-api',
          processingTimeMs: 1200,
          elementsFound: {
            sections: 0,
            tables: 0,
            signatures: 0,
            paragraphs: 1
          }
        }
      })

      mockGoogleDocsService.parseDocumentContent.mockResolvedValue({
        html: '<div><p>Test</p></div>',
        cleanedHtml: '<div><p>Test</p></div>',
        structure: {
          headings: [],
          paragraphs: [],
          tables: [],
          images: [],
          styles: { fontSize: 12, fontFamily: 'Arial', marginTop: 0, marginBottom: 0, lineHeight: 1.2 }
        },
        metadata: {
          id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          name: 'Test Document',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: '2024-01-01T00:00:00.000Z',
          modifiedTime: '2024-01-15T10:30:00.000Z',
          owners: [],
          permissions: []
        }
      })

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { id: 'google_doc_123456789_abcdefgh', name: 'Test Document' },
        error: null
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/docs/analyze',
        'POST',
        geminiRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.processing.aiAnalyzer).toBe('gemini')
    })
  })

  describe('GET /api/google/docs/analyze', () => {
    it('should check document access successfully', async () => {
      mockGoogleDocsService.getDocumentStructure = jest.fn().mockResolvedValue({
        headings: [
          { level: 1, text: 'Introduction', startIndex: 0, endIndex: 12 },
          { level: 2, text: 'Overview', startIndex: 13, endIndex: 21 }
        ],
        paragraphs: [
          { text: 'This is a test document', startIndex: 22, endIndex: 45 }
        ],
        tables: [],
        images: [],
        styles: { fontSize: 12, fontFamily: 'Arial', marginTop: 0, marginBottom: 0, lineHeight: 1.2 }
      })

      const url = 'http://localhost/api/google/docs/analyze?documentId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
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
      expect(result.accessible).toBe(true)
      expect(result.preview).toEqual({
        headings: [
          { level: 1, text: 'Introduction', startIndex: 0, endIndex: 12 },
          { level: 2, text: 'Overview', startIndex: 13, endIndex: 21 }
        ],
        paragraphCount: 1,
        tableCount: 0,
        imageCount: 0
      })
    })

    it('should handle inaccessible documents gracefully', async () => {
      mockGoogleDocsService.getDocumentStructure = jest.fn().mockRejectedValue(
        new Error('Google API Error: The caller does not have permission (Code: 403)')
      )

      const url = 'http://localhost/api/google/docs/analyze?documentId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(200) // Still returns 200
      expect(result.success).toBe(false)
      expect(result.accessible).toBe(false)
      expect(result.error).toContain('The caller does not have permission')
    })

    it('should validate document ID parameter', async () => {
      const url = 'http://localhost/api/google/docs/analyze?documentId=invalid_id'
      const request = new Request(url, {
        method: 'GET',
        headers: {
          'Cookie': 'session=mock_session_token'
        }
      })

      const response = await GET(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid document ID')
    })
  })
})