// __tests__/api/ai-docx-excel.test.ts
// Tests for Excel Analysis API - AI-powered column intelligence
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai-docx/excel/route'
import * as XLSX from 'xlsx'
import OpenAI from 'openai'

// Mock modules
jest.mock('xlsx')
jest.mock('openai')

const mockXLSX = XLSX as jest.Mocked<typeof XLSX>
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('/api/ai-docx/excel', () => {
  let mockOpenAIInstance: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
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

  describe('POST /api/ai-docx/excel', () => {
    it('should reject non-Excel files', async () => {
      const formData = new FormData()
      const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      formData.append('excel', txtFile)

      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('File must be Excel (.xlsx, .xls) or CSV')
    })

    it('should reject requests without file', async () => {
      const formData = new FormData()
      
      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No Excel file provided')
    })

    it('should analyze Excel file with AI successfully', async () => {
      // Mock Excel parsing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': {}
        }
      }
      
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Email', 'Age', 'Salary'], // Headers
        ['John Doe', 'john@email.com', 30, 50000],
        ['Jane Smith', 'jane@email.com', 25, 45000],
        ['Bob Wilson', 'bob@email.com', 35, 60000]
      ])
      
      mockXLSX.utils.encode_col.mockImplementation((idx) => 
        String.fromCharCode(65 + idx) // A, B, C, D
      )

      // Mock AI analysis response
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              columns: [
                {
                  column: 'A',
                  dataType: 'string',
                  confidence: 95,
                  description: 'Full name of the person'
                },
                {
                  column: 'B', 
                  dataType: 'email',
                  confidence: 98,
                  description: 'Email address'
                },
                {
                  column: 'C',
                  dataType: 'number',
                  confidence: 90,
                  description: 'Age in years'
                },
                {
                  column: 'D',
                  dataType: 'number', 
                  confidence: 92,
                  description: 'Annual salary'
                }
              ]
            })
          }
        }]
      })

      const formData = new FormData()
      const excelFile = new File(['mock excel'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      formData.append('excel', excelFile)

      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.fileName).toBe('test.xlsx')
      expect(result.sheetName).toBe('Sheet1')
      expect(result.totalRows).toBe(3)
      expect(result.totalColumns).toBe(4)
      expect(result.columns).toHaveLength(4)
      
      // Check first column analysis
      expect(result.columns[0]).toEqual({
        column: 'A',
        header: 'Name',
        dataType: 'string',
        sampleData: ['John Doe', 'Jane Smith', 'Bob Wilson'],
        confidence: 95,
        aiDescription: 'Full name of the person'
      })
    })

    it('should handle empty Excel files', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': {}
        }
      }
      
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue([])

      const formData = new FormData()
      const excelFile = new File(['empty'], 'empty.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      formData.append('excel', excelFile)

      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No data found in Excel file')
    })

    it('should handle Excel files without sheets', async () => {
      const mockWorkbook = {
        SheetNames: [],
        Sheets: {}
      }
      
      mockXLSX.read.mockReturnValue(mockWorkbook)

      const formData = new FormData()
      const excelFile = new File(['no sheets'], 'nosheets.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      formData.append('excel', excelFile)

      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('No sheets found in Excel file')
    })

    it('should handle AI analysis failures gracefully', async () => {
      // Mock Excel parsing success
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: { 'Sheet1': {} }
      }
      
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Email'],
        ['John', 'john@email.com']
      ])
      mockXLSX.utils.encode_col.mockImplementation((idx) => 
        String.fromCharCode(65 + idx)
      )

      // Mock AI failure
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API error')
      )

      const formData = new FormData()
      const excelFile = new File(['data'], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      formData.append('excel', excelFile)

      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Excel AI analysis failed')
    })

    it('should handle CSV files', async () => {
      // Mock CSV parsing
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: { 'Sheet1': {} }
      }
      
      mockXLSX.read.mockReturnValue(mockWorkbook)
      mockXLSX.utils.sheet_to_json.mockReturnValue([
        ['Product', 'Price'],
        ['Widget A', '19.99'],
        ['Widget B', '29.99']
      ])
      mockXLSX.utils.encode_col.mockImplementation((idx) => 
        String.fromCharCode(65 + idx)
      )

      // Mock AI response
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              columns: [
                { column: 'A', dataType: 'string', confidence: 90, description: 'Product name' },
                { column: 'B', dataType: 'number', confidence: 85, description: 'Product price' }
              ]
            })
          }
        }]
      })

      const formData = new FormData()
      const csvFile = new File(['data'], 'products.csv', { type: 'text/csv' })
      formData.append('excel', csvFile)

      const request = new NextRequest('http://localhost/api/ai-docx/excel', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.fileName).toBe('products.csv')
      expect(result.columns).toHaveLength(2)
    })
  })
})