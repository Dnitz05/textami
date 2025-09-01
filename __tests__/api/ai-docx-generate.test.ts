// __tests__/api/ai-docx-generate.test.ts
// Tests for Mass Document Generation API - Core business functionality
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai-docx/generate/route'
import { createClient } from '@supabase/supabase-js'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

// Mock modules
jest.mock('@supabase/supabase-js')
jest.mock('docxtemplater')
jest.mock('pizzip')

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockDocxtemplater = Docxtemplater as jest.MockedClass<typeof Docxtemplater>
const mockPizZip = PizZip as jest.MockedClass<typeof PizZip>

describe('/api/ai-docx/generate', () => {
  let mockSupabaseClient: any
  let mockDocxInstance: any
  let mockZipInstance: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock Supabase client
    mockSupabaseClient = {
      storage: {
        from: jest.fn(() => ({
          download: jest.fn(),
          upload: jest.fn(),
          getPublicUrl: jest.fn()
        }))
      }
    }
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    
    // Mock docxtemplater instance
    mockDocxInstance = {
      setData: jest.fn(),
      render: jest.fn(),
      getZip: jest.fn(() => ({
        generate: jest.fn(() => Buffer.from('generated docx content'))
      }))
    }
    mockDocxtemplater.mockImplementation(() => mockDocxInstance)
    
    // Mock PizZip instance
    mockZipInstance = {}
    mockPizZip.mockImplementation(() => mockZipInstance)
  })

  const sampleRequestData = {
    templateId: 'test-template-123',
    frozenTemplateUrl: 'test-template/frozen.docx',
    excelData: [
      {
        'Client Name': 'John Doe',
        'Email': 'john@example.com',
        'Amount': 1500
      },
      {
        'Client Name': 'Jane Smith', 
        'Email': 'jane@example.com',
        'Amount': 2000
      }
    ],
    mappings: {
      'nom_client': 'Client Name',
      'email_client': 'Email',
      'import_total': 'Amount'
    },
    batchSize: 2
  }

  describe('POST /api/ai-docx/generate', () => {
    it('should generate documents successfully', async () => {
      // Mock successful template download
      const mockTemplateBlob = new Blob(['template content'])
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockTemplateBlob,
        error: null
      })

      // Mock successful document uploads
      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'outputs/generated-doc.docx' },
        error: null
      })

      // Mock public URL generation
      mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/outputs/generated-doc.docx' }
      })

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRequestData)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.totalRequested).toBe(2)
      expect(result.data.totalGenerated).toBe(2)
      expect(result.data.totalErrors).toBe(0)
      expect(result.data.documents).toHaveLength(2)
      
      // Check first document
      expect(result.data.documents[0]).toHaveProperty('documentId')
      expect(result.data.documents[0]).toHaveProperty('fileName')
      expect(result.data.documents[0]).toHaveProperty('downloadUrl')
      expect(result.data.documents[0].rowIndex).toBe(0)
      expect(result.data.documents[0].rowData).toEqual(sampleRequestData.excelData[0])
    })

    it('should reject requests without required fields', async () => {
      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'test-123'
          // Missing other required fields
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required fields')
    })

    it('should reject empty Excel data', async () => {
      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sampleRequestData,
          excelData: []
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Excel data must be a non-empty array')
    })

    it('should handle template download failures', async () => {
      // Mock failed template download
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: null,
        error: { message: 'Template not found' }
      })

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRequestData)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to retrieve frozen template')
    })

    it('should handle docxtemplater errors gracefully', async () => {
      // Mock successful template download
      const mockTemplateBlob = new Blob(['template'])
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockTemplateBlob,
        error: null
      })

      // Mock docxtemplater rendering failure
      mockDocxInstance.render.mockImplementation(() => {
        throw new Error('Template rendering failed')
      })

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRequestData)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200) // Still returns 200 but with errors
      expect(result.success).toBe(false) // No successful documents
      expect(result.data.totalGenerated).toBe(0)
      expect(result.data.totalErrors).toBe(2)
      expect(result.data.errors).toHaveLength(2)
      expect(result.data.errors[0].error).toContain('Template rendering failed')
    })

    it('should handle partial generation failures', async () => {
      // Mock successful template download
      const mockTemplateBlob = new Blob(['template'])
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockTemplateBlob,
        error: null
      })

      // Mock successful upload for first doc, failed for second
      mockSupabaseClient.storage.from().upload
        .mockResolvedValueOnce({
          data: { path: 'outputs/doc1.docx' },
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Storage full' }
        })

      mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/outputs/doc1.docx' }
      })

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRequestData)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true) // At least one document succeeded
      expect(result.data.totalGenerated).toBe(1)
      expect(result.data.totalErrors).toBe(1)
      expect(result.data.documents).toHaveLength(1)
      expect(result.data.errors).toHaveLength(1)
    })

    it('should respect batch size limits', async () => {
      const largeDataSet = Array.from({ length: 10 }, (_, i) => ({
        'Name': `Client ${i}`,
        'Amount': 1000 + i
      }))

      // Mock successful template download
      const mockTemplateBlob = new Blob(['template'])
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockTemplateBlob,
        error: null
      })

      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'outputs/doc.docx' },
        error: null
      })

      mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/outputs/doc.docx' }
      })

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sampleRequestData,
          excelData: largeDataSet,
          batchSize: 3 // Limit to 3 documents
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.totalRequested).toBe(3) // Limited by batchSize
      expect(result.data.documents).toHaveLength(3)
    })

    it('should handle missing Supabase configuration', async () => {
      // Mock missing environment variables
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleRequestData)
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Storage configuration required')

      // Restore environment variables
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    })

    it('should properly map data according to mappings', async () => {
      // Mock successful operations
      const mockTemplateBlob = new Blob(['template'])
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockTemplateBlob,
        error: null
      })

      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'outputs/doc.docx' },
        error: null
      })

      mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/outputs/doc.docx' }
      })

      const singleRowData = {
        ...sampleRequestData,
        excelData: [sampleRequestData.excelData[0]],
        batchSize: 1
      }

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(singleRowData)
      })

      await POST(request)

      // Verify docxtemplater was called with correctly mapped data
      expect(mockDocxInstance.setData).toHaveBeenCalledWith({
        nom_client: 'John Doe',
        email_client: 'john@example.com', 
        import_total: 1500
      })
    })

    it('should handle boolean and null values correctly', async () => {
      const mockTemplateBlob = new Blob(['template'])
      mockSupabaseClient.storage.from().download.mockResolvedValue({
        data: mockTemplateBlob,
        error: null
      })

      mockSupabaseClient.storage.from().upload.mockResolvedValue({
        data: { path: 'outputs/doc.docx' },
        error: null
      })

      mockSupabaseClient.storage.from().getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/outputs/doc.docx' }
      })

      const specialValuesData = {
        ...sampleRequestData,
        excelData: [{
          'Active': true,
          'Inactive': false,
          'Missing': null,
          'Undefined': undefined,
          'Empty': ''
        }],
        mappings: {
          'active': 'Active',
          'inactive': 'Inactive',
          'missing': 'Missing',
          'undefined': 'Undefined',
          'empty': 'Empty'
        }
      }

      const request = new NextRequest('http://localhost/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialValuesData)
      })

      await POST(request)

      expect(mockDocxInstance.setData).toHaveBeenCalledWith({
        active: 'true',
        inactive: 'false',
        missing: '',
        undefined: '',
        empty: ''
      })
    })
  })
})