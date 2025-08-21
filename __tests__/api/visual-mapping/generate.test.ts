// __tests__/api/visual-mapping/generate.test.ts
// TEXTAMI PHASE 2 - ESSENTIAL API TESTING
// FOCUS: Basic API endpoint tests only
// Critical path validation

import { POST } from '@/app/api/visual-mapping/generate/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/visual-mapping/templateGenerator', () => ({
  templateGenerator: {
    generateDocuments: jest.fn()
  }
}))

jest.mock('@/lib/supabase/serverClient', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: mockTemplate, error: null }))
          }))
        }))
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        download: jest.fn(() => ({ 
          data: new Blob(['mock excel data']), 
          error: null 
        }))
      }))
    }
  }))
}))

const mockTemplate = {
  id: 'test-template-123',
  name: 'Test Template',
  excel_file_path: 'test-excel-path.xlsx',
  mapping_metadata: {
    wordContent: '<p>Test content</p>'
  }
}

const mockMappings = [
  {
    id: 'mapping-1',
    excel_column_name: 'Name',
    excel_column_type: 'text',
    word_selection_text: 'Customer Name',
    word_paragraph_id: 'p-1',
    captured_styling: null,
    mapping_type: 'text',
    generated_variable_name: 'customerName',
    generated_syntax: '{customerName}',
    docxtemplater_module: 'text',
    module_value: 0
  }
]

const { templateGenerator } = require('@/lib/visual-mapping/templateGenerator')

// Mock XLSX import
jest.mock('xlsx', () => ({
  read: jest.fn(() => ({
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {}
    }
  })),
  utils: {
    sheet_to_json: jest.fn(() => [
      ['Name', 'Email'],
      ['John Doe', 'john@example.com'],
      ['Jane Smith', 'jane@example.com']
    ])
  }
}))

describe('POST /api/visual-mapping/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful generation
    templateGenerator.generateDocuments.mockResolvedValue({
      success: true,
      fileUrl: 'https://test-url.com/generated.docx',
      filename: 'generated-test.docx',
      format: 'docx',
      size: 12345,
      generatedAt: new Date(),
      statistics: {
        totalDocuments: 2,
        roiValue: 250,
        processingTime: 1500
      }
    })

    // Mock database responses
    const mockSupabase = require('@/lib/supabase/serverClient').createServerSupabaseClient()
    
    // Mock template fetch
    mockSupabase.from().select().eq().eq().single.mockResolvedValue({
      data: mockTemplate,
      error: null
    })
    
    // Mock mappings fetch  
    mockSupabase.from().select().eq().eq.mockResolvedValue({
      data: mockMappings,
      error: null
    })
  })

  test('should generate documents successfully with valid request', async () => {
    const request = new NextRequest('http://localhost:3000/api/visual-mapping/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-template-123',
        outputFormat: 'docx',
        filename: 'custom-filename.docx'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.fileUrl).toBe('https://test-url.com/generated.docx')
    expect(result.filename).toBe('generated-test.docx')
    expect(result.format).toBe('docx')
    expect(result.statistics.totalDocuments).toBe(2)
    expect(result.statistics.roiValue).toBe(250)
  })

  test('should return 400 for missing templateId', async () => {
    const request = new NextRequest('http://localhost:3000/api/visual-mapping/generate', {
      method: 'POST',
      body: JSON.stringify({
        outputFormat: 'docx'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('Template ID is required')
  })

  test('should return 400 for invalid output format', async () => {
    const request = new NextRequest('http://localhost:3000/api/visual-mapping/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-template-123',
        outputFormat: 'invalid'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('Output format must be docx or pdf')
  })

  test('should return 404 for non-existent template', async () => {
    const mockSupabase = require('@/lib/supabase/serverClient').createServerSupabaseClient()
    
    // Mock template not found
    mockSupabase.from().select().eq().eq().single.mockResolvedValue({
      data: null,
      error: { message: 'Not found' }
    })

    const request = new NextRequest('http://localhost:3000/api/visual-mapping/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'non-existent-template',
        outputFormat: 'docx'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(404)
    expect(result.error).toBe('Template not found or has no visual mappings')
  })

  test('should return 400 for template with no mappings', async () => {
    const mockSupabase = require('@/lib/supabase/serverClient').createServerSupabaseClient()
    
    // Mock empty mappings
    mockSupabase.from().select().eq().eq.mockResolvedValue({
      data: [],
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/visual-mapping/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-template-123',
        outputFormat: 'docx'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(400)
    expect(result.error).toBe('No active visual mappings found for template')
  })

  test('should return 500 when generation fails', async () => {
    // Mock generation failure
    templateGenerator.generateDocuments.mockResolvedValue({
      success: false,
      error: 'Generation engine failure',
      filename: '',
      format: 'docx',
      size: 0,
      generatedAt: new Date(),
      statistics: { totalDocuments: 0, roiValue: 0, processingTime: 0 }
    })

    const request = new NextRequest('http://localhost:3000/api/visual-mapping/generate', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-template-123',
        outputFormat: 'docx'
      })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(500)
    expect(result.error).toBe('Generation engine failure')
  })
})