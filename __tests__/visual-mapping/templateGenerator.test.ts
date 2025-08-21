// __tests__/visual-mapping/templateGenerator.test.ts
// TEXTAMI PHASE 2 - ESSENTIAL TESTING SUITE
// FOCUS: Basic tests only, no complex scenarios
// Core functionality validation

import { TemplateGenerator } from '@/lib/visual-mapping/templateGenerator'

// Mock Supabase
jest.mock('@/lib/supabase/serverClient', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => ({ data: { path: 'test-path' }, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test-url.com' } }))
      }))
    }
  }))
}))

// Mock Docxtemplater config
jest.mock('@/lib/docxtemplater/config', () => ({
  createDocxtemplater: jest.fn(() => ({
    render: jest.fn(),
    getZip: jest.fn(() => ({
      generate: jest.fn(() => Buffer.from('test-docx-content'))
    }))
  }))
}))

describe('TemplateGenerator', () => {
  let generator: TemplateGenerator
  
  const mockOptions = {
    templateId: 'test-template-123',
    outputFormat: 'docx' as const,
    excelData: [
      { 'Name': 'John Doe', 'Email': 'john@example.com', 'Amount': 1000 },
      { 'Name': 'Jane Smith', 'Email': 'jane@example.com', 'Amount': 1500 }
    ],
    visualMappings: [
      {
        id: 'mapping-1',
        excelColumn: { name: 'Name', type: 'text' },
        wordSelection: { text: 'Customer Name', paragraphId: 'p-1' },
        mappingType: 'text' as const,
        generatedVariableName: 'customerName',
        generatedSyntax: '{customerName}',
        docxtemplaterModule: 'text',
        moduleValue: 0
      },
      {
        id: 'mapping-2',
        excelColumn: { name: 'Email', type: 'text' },
        wordSelection: { text: 'Email Address', paragraphId: 'p-2', styling: { 'color': 'blue' } },
        mappingType: 'style' as const,
        generatedVariableName: 'customerEmail',
        generatedSyntax: '{customerEmail:style="color:blue"}',
        docxtemplaterModule: 'style',
        moduleValue: 500
      }
    ],
    wordContent: '<p data-paragraph-id="p-1">Hello <span data-mapping-id="mapping-1">Customer Name</span></p><p data-paragraph-id="p-2">Email: <span data-mapping-id="mapping-2">Email Address</span></p>'
  }

  beforeEach(() => {
    generator = new TemplateGenerator()
    jest.clearAllMocks()
  })

  describe('generateDocuments', () => {
    test('should generate documents successfully with valid input', async () => {
      const result = await generator.generateDocuments(mockOptions)
      
      expect(result.success).toBe(true)
      expect(result.fileUrl).toBe('https://test-url.com')
      expect(result.format).toBe('docx')
      expect(result.statistics.totalDocuments).toBe(2)
      expect(result.statistics.roiValue).toBe(500) // Only style module has value
    })

    test('should fail validation with missing mappings', async () => {
      const invalidOptions = { ...mockOptions, visualMappings: [] }
      
      const result = await generator.generateDocuments(invalidOptions)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed: No visual mappings provided')
    })

    test('should fail validation with missing Excel data', async () => {
      const invalidOptions = { ...mockOptions, excelData: [] }
      
      const result = await generator.generateDocuments(invalidOptions)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed: No Excel data provided')
    })

    test('should fail validation with missing Word content', async () => {
      const invalidOptions = { ...mockOptions, wordContent: '' }
      
      const result = await generator.generateDocuments(invalidOptions)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Validation failed: No Word content provided')
    })
  })

  describe('processValueByType', () => {
    test('should process text values correctly', () => {
      // Access private method for testing (TypeScript ignore)
      // @ts-ignore
      const result = generator.processValueByType('Hello World', 'text')
      expect(result).toBe('Hello World')
    })

    test('should process HTML values correctly', () => {
      // @ts-ignore
      const result = generator.processValueByType('<b>Bold Text</b>', 'html')
      expect(result).toBe('<b>Bold Text</b>')
    })

    test('should process image URLs correctly', () => {
      // @ts-ignore
      const result = generator.processValueByType('https://example.com/image.jpg', 'image')
      expect(result).toEqual({ url: 'https://example.com/image.jpg', width: 200, height: 150 })
    })

    test('should process styled text correctly', () => {
      // @ts-ignore
      const result = generator.processValueByType('Styled Text', 'style', { color: 'red', fontSize: '14px' })
      expect(result).toEqual({ text: 'Styled Text', style: 'color:red;fontSize:14px' })
    })
  })

  describe('calculateROI', () => {
    test('should calculate ROI correctly for mixed modules', () => {
      // @ts-ignore
      const roi = generator.calculateROI(mockOptions.visualMappings)
      expect(roi).toBe(500) // text: 0 + style: 500
    })

    test('should calculate ROI as 0 for text-only mappings', () => {
      const textOnlyMappings = [
        { ...mockOptions.visualMappings[0], docxtemplaterModule: 'text', moduleValue: 0 }
      ]
      // @ts-ignore
      const roi = generator.calculateROI(textOnlyMappings)
      expect(roi).toBe(0)
    })
  })

  describe('getContentType', () => {
    test('should return correct content type for DOCX', () => {
      // @ts-ignore
      const contentType = generator.getContentType('docx')
      expect(contentType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    })

    test('should return correct content type for PDF', () => {
      // @ts-ignore
      const contentType = generator.getContentType('pdf')
      expect(contentType).toBe('application/pdf')
    })

    test('should return default content type for unknown format', () => {
      // @ts-ignore
      const contentType = generator.getContentType('unknown')
      expect(contentType).toBe('application/octet-stream')
    })
  })
})