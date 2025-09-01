// __tests__/api/google-sheets-data.test.ts
// Tests for Google Sheets Data API - Excel alternative processing
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/google/sheets/data/route'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import OpenAI from 'openai'
import {
  mockGoogleTokens,
  mockGoogleSheet,
  mockGoogleSheetData,
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
jest.mock('openai')

// Mock security middleware
jest.mock('@/lib/security/auth-middleware', () => ({
  validateUserSession: jest.fn(),
  checkRateLimit: jest.fn()
}))

// Mock Google services
jest.mock('@/lib/google/token-manager')
jest.mock('@/lib/google/sheets-service')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockGoogle = google as jest.Mocked<typeof google>
const mockOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

// Import mocked middleware
import { validateUserSession, checkRateLimit } from '@/lib/security/auth-middleware'
const mockValidateUserSession = validateUserSession as jest.MockedFunction<typeof validateUserSession>
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>

// Import mocked services
import { getValidGoogleTokens } from '@/lib/google/token-manager'
import { createGoogleSheetsService } from '@/lib/google/sheets-service'

const mockGetValidGoogleTokens = getValidGoogleTokens as jest.MockedFunction<typeof getValidGoogleTokens>
const mockCreateGoogleSheetsService = createGoogleSheetsService as jest.MockedFunction<typeof createGoogleSheetsService>

describe('/api/google/sheets/data', () => {
  let mockSupabaseClient: any
  let mockGoogleSheetsService: any
  let mockOpenAIInstance: any
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
    
    // Mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }
    mockOpenAI.mockImplementation(() => mockOpenAIInstance)
    
    // Mock Google Sheets service
    mockGoogleSheetsService = {
      getSpreadsheetData: jest.fn(),
      getSheetMetadata: jest.fn(),
      parseHeaders: jest.fn(),
      parseRows: jest.fn()
    }
    mockCreateGoogleSheetsService.mockResolvedValue(mockGoogleSheetsService)
  })

  describe('POST /api/google/sheets/data', () => {
    const validRequestBody = {
      spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      sheetName: 'Clients',
      range: 'A1:E100'
    }

    it('should analyze Google Sheets data successfully', async () => {
      // Mock successful spreadsheet data extraction
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: mockGoogleSheetData,
        range: 'Clients!A1:E5',
        majorDimension: 'ROWS'
      })

      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue({
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        title: 'Client Data',
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: 'Clients',
              gridProperties: {
                rowCount: 100,
                columnCount: 10
              }
            }
          }
        ]
      })

      // Mock AI column analysis
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              columns: [
                {
                  column: 'A',
                  dataType: 'string',
                  confidence: 95,
                  description: 'Full name of the client'
                },
                {
                  column: 'B',
                  dataType: 'email',
                  confidence: 98,
                  description: 'Email address'
                },
                {
                  column: 'C',
                  dataType: 'date',
                  confidence: 92,
                  description: 'Contract date'
                },
                {
                  column: 'D',
                  dataType: 'number',
                  confidence: 90,
                  description: 'Contract amount'
                },
                {
                  column: 'E',
                  dataType: 'string',
                  confidence: 85,
                  description: 'Service description'
                }
              ]
            })
          }
        }]
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.spreadsheetId).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
      expect(result.sheetName).toBe('Clients')
      expect(result.totalRows).toBe(4) // Excluding header
      expect(result.totalColumns).toBe(5)
      expect(result.columns).toHaveLength(5)
      
      // Check column analysis
      expect(result.columns[0]).toEqual({
        column: 'A',
        header: 'Client Name',
        dataType: 'string',
        sampleData: ['John Doe', 'Jane Smith', 'Bob Wilson'],
        confidence: 95,
        aiDescription: 'Full name of the client'
      })

      // Verify services were called correctly
      expect(mockGetValidGoogleTokens).toHaveBeenCalledWith(createMockSupabaseUser().id)
      expect(mockCreateGoogleSheetsService).toHaveBeenCalledWith(mockGoogleTokens, expect.any(Function))
      expect(mockGoogleSheetsService.getSpreadsheetData).toHaveBeenCalledWith(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        'Clients!A1:E100'
      )
    })

    it('should handle requests without optional parameters', async () => {
      const minimalRequestBody = {
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      }

      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: mockGoogleSheetData,
        range: 'Clients!A1:Z1000', // Default range
        majorDimension: 'ROWS'
      })

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              columns: [
                {
                  column: 'A',
                  dataType: 'string',
                  confidence: 90,
                  description: 'Client name'
                }
              ]
            })
          }
        }]
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        minimalRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.sheetName).toBe('Clients') // Should use first sheet
      
      // Should use default range
      expect(mockGoogleSheetsService.getSpreadsheetData).toHaveBeenCalledWith(
        '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        'Clients!A1:Z1000'
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
        'http://localhost/api/google/sheets/data',
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
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(429)
      expect(result.error).toBe('Rate limit exceeded')
    })

    it('should reject requests with invalid spreadsheet ID', async () => {
      const invalidRequestBody = {
        ...validRequestBody,
        spreadsheetId: 'invalid_spreadsheet_id'
      }

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        invalidRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toContain('spreadsheetId')
    })

    it('should handle expired Google tokens', async () => {
      mockGetValidGoogleTokens.mockResolvedValue(null) // No valid tokens

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toContain('Google authentication required')
    })

    it('should handle spreadsheet access errors', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockRejectedValue(
        new Error('Google API Error: The caller does not have permission (Code: 403)')
      )

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Failed to access Google Spreadsheet - check permissions')
    })

    it('should handle spreadsheet not found errors', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockRejectedValue(
        new Error('Google API Error: Requested entity was not found (Code: 404)')
      )

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('Google Spreadsheet not found or not accessible')
    })

    it('should handle empty spreadsheet data', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: [], // No data
        range: 'Clients!A1:E100',
        majorDimension: 'ROWS'
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No data found in the specified range')
    })

    it('should handle spreadsheet with headers only', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: [['Client Name', 'Email', 'Date', 'Amount']], // Only headers
        range: 'Clients!A1:D1',
        majorDimension: 'ROWS'
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Spreadsheet contains only headers - no data rows found')
    })

    it('should handle AI analysis failures gracefully', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: mockGoogleSheetData,
        range: 'Clients!A1:E5',
        majorDimension: 'ROWS'
      })

      // Mock AI failure
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Google Sheets AI analysis failed')
      expect(result.details).toBe('OpenAI API rate limit exceeded')
    })

    it('should handle malformed AI response', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: mockGoogleSheetData,
        range: 'Clients!A1:E5',
        majorDimension: 'ROWS'
      })

      // Mock malformed AI response
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }]
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Google Sheets AI analysis failed')
    })

    it('should handle range validation', async () => {
      const invalidRangeBody = {
        ...validRequestBody,
        range: 'Invalid:Range'
      }

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        invalidRangeBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid request data')
      expect(result.details).toContain('range')
    })

    it('should limit sample data to prevent oversized responses', async () => {
      // Create a large dataset
      const largeDataset = [
        ['Name', 'Email', 'Phone'],
        ...Array.from({ length: 1000 }, (_, i) => [`User ${i}`, `user${i}@test.com`, `555-000${i}`])
      ]

      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: largeDataset,
        range: 'Clients!A1:C1001',
        majorDimension: 'ROWS'
      })

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              columns: [
                {
                  column: 'A',
                  dataType: 'string',
                  confidence: 95,
                  description: 'User name'
                }
              ]
            })
          }
        }]
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.totalRows).toBe(1000) // Full count
      expect(result.columns[0].sampleData.length).toBeLessThanOrEqual(10) // Limited sample
    })

    it('should handle sheet name validation', async () => {
      const invalidSheetBody = {
        ...validRequestBody,
        sheetName: 'NonExistentSheet'
      }

      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockRejectedValue(
        new Error('Google API Error: Unable to parse range: NonExistentSheet!A1:E100 (Code: 400)')
      )

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        invalidSheetBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Invalid sheet name or range')
    })

    it('should return column-level confidence scores', async () => {
      mockGoogleSheetsService.getSheetMetadata.mockResolvedValue(mockGoogleSheet)
      mockGoogleSheetsService.getSpreadsheetData.mockResolvedValue({
        values: mockGoogleSheetData,
        range: 'Clients!A1:E5',
        majorDimension: 'ROWS'
      })

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              columns: [
                {
                  column: 'A',
                  dataType: 'string',
                  confidence: 95,
                  description: 'Client name'
                },
                {
                  column: 'B',
                  dataType: 'email',
                  confidence: 98,
                  description: 'Email address'
                },
                {
                  column: 'C',
                  dataType: 'date',
                  confidence: 85, // Lower confidence
                  description: 'Contract date'
                }
              ]
            })
          }
        }]
      })

      const request = createGoogleApiRequest(
        'http://localhost/api/google/sheets/data',
        'POST',
        validRequestBody
      )

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.columns[0].confidence).toBe(95)
      expect(result.columns[1].confidence).toBe(98)
      expect(result.columns[2].confidence).toBe(85)
    })
  })
})