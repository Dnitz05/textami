// __tests__/api/ai-docx-analyze.test.ts
// Tests for DOCX Analysis API - Core AI-first functionality
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai-docx/analyze/route'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Mock modules
jest.mock('@supabase/supabase-js')
jest.mock('openai')
jest.mock('pizzip')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('/api/ai-docx/analyze', () => {
  let mockSupabaseClient: any
  let mockOpenAIInstance: any
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabaseClient = {
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          download: jest.fn(),
          getPublicUrl: jest.fn()
        }))
      }
    }
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }
    mockOpenAI.mockImplementation(() => mockOpenAIInstance)
  })

  describe('POST /api/ai-docx/analyze', () => {
    it('should reject non-DOCX files', async () => {
      const formData = new FormData()
      const txtFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('docx', txtFile)

      const request = new NextRequest('http://localhost/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('File must be .docx format')
    })

    it('should reject requests without file', async () => {
      const formData = new FormData()
      
      const request = new NextRequest('http://localhost/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No file uploaded')
    })

    it('should handle DOCX file successfully', async () => {
      // Mock successful Supabase upload
      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'test-template/original.docx' },
        error: null
      })

      // Mock successful AI analysis
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              placeholders: [
                {
                  text: 'NOM_CLIENT',
                  variable: 'nom_client',
                  confidence: 85,
                  context: 'Client name field',
                  type: 'text'
                }
              ]
            })
          }
        }],
        model: 'gpt-4o'
      })

      // Mock PizZip document extraction
      const mockPizZip = require('pizzip')
      const mockZipInstance = {
        file: jest.fn(() => ({
          asText: () => '<w:document><w:p><w:t>Test document with NOM_CLIENT placeholder</w:t></w:p></w:document>'
        }))
      }
      mockPizZip.mockImplementation(() => mockZipInstance)

      const formData = new FormData()
      const docxFile = new File(['mock docx content'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      formData.append('docx', docxFile)

      const request = new NextRequest('http://localhost/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('templateId')
      expect(result.data).toHaveProperty('fileName', 'test.docx')
      expect(result.data).toHaveProperty('placeholders')
      expect(result.data.placeholders).toHaveLength(1)
      expect(result.data.placeholders[0]).toHaveProperty('text', 'NOM_CLIENT')
    })

    it('should handle storage failure gracefully', async () => {
      // Mock failed Supabase upload
      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' }
      })

      const formData = new FormData()
      const docxFile = new File(['mock content'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      formData.append('docx', docxFile)

      const request = new NextRequest('http://localhost/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('Storage required for DOCX processing')
    })

    it('should handle AI analysis failure gracefully', async () => {
      // Mock successful upload but failed AI
      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'test-template/original.docx' },
        error: null
      })

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      // Mock PizZip extraction
      const mockPizZip = require('pizzip')
      const mockZipInstance = {
        file: jest.fn(() => ({
          asText: () => '<w:document><w:p><w:t>Test document</w:t></w:p></w:document>'
        }))
      }
      mockPizZip.mockImplementation(() => mockZipInstance)

      const formData = new FormData()
      const docxFile = new File(['mock content'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      formData.append('docx', docxFile)

      const request = new NextRequest('http://localhost/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      // Should still succeed with OOXML extraction, but without AI placeholders
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.placeholders).toEqual([])
    })

    it('should handle malformed DOCX files', async () => {
      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'test-template/original.docx' },
        error: null
      })

      // Mock PizZip throwing error for corrupt file
      const mockPizZip = require('pizzip')
      mockPizZip.mockImplementation(() => {
        throw new Error('Could not find document.xml in DOCX file')
      })

      const formData = new FormData()
      const docxFile = new File(['invalid content'], 'corrupt.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      formData.append('docx', docxFile)

      const request = new NextRequest('http://localhost/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toContain('Failed to extract document content')
    })
  })
})