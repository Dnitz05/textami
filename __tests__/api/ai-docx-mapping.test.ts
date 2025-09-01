// __tests__/api/ai-docx-mapping.test.ts
// Tests for AI Mapping API - Intelligent placeholder-to-column matching
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai-docx/mapping/route'
import OpenAI from 'openai'

jest.mock('openai')

const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>

describe('/api/ai-docx/mapping', () => {
  let mockOpenAIInstance: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }
    mockOpenAI.mockImplementation(() => mockOpenAIInstance)
  })

  const samplePlaceholders = [
    {
      text: 'NOM_CLIENT',
      type: 'text',
      confidence: 85,
      reasoning: 'Client name field'
    },
    {
      text: 'DATA_CONTRACTE',
      type: 'date',
      confidence: 90,
      reasoning: 'Contract date field'
    },
    {
      text: 'IMPORT_TOTAL',
      type: 'number',
      confidence: 80,
      reasoning: 'Total amount field'
    }
  ]

  const sampleColumns = [
    {
      column: 'A',
      header: 'Client Name',
      dataType: 'string',
      sampleData: ['John Doe', 'Jane Smith'],
      aiDescription: 'Full name of the client'
    },
    {
      column: 'B',
      header: 'Contract Date',
      dataType: 'date',
      sampleData: ['2024-01-15', '2024-01-20'],
      aiDescription: 'Date when contract was signed'
    },
    {
      column: 'C',
      header: 'Total Amount',
      dataType: 'number',
      sampleData: [1500, 2300],
      aiDescription: 'Total contract value'
    }
  ]

  describe('POST /api/ai-docx/mapping', () => {
    it('should create intelligent mappings successfully', async () => {
      // Mock successful AI mapping response
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [
                {
                  placeholder: 'NOM_CLIENT',
                  excelColumn: 'A',
                  excelHeader: 'Client Name',
                  confidence: 95,
                  reasoning: 'Perfect semantic match between NOM_CLIENT and Client Name',
                  dataTypeMatch: true
                },
                {
                  placeholder: 'DATA_CONTRACTE',
                  excelColumn: 'B',
                  excelHeader: 'Contract Date',
                  confidence: 90,
                  reasoning: 'Strong match between DATA_CONTRACTE and Contract Date, both date types',
                  dataTypeMatch: true
                },
                {
                  placeholder: 'IMPORT_TOTAL',
                  excelColumn: 'C',
                  excelHeader: 'Total Amount',
                  confidence: 85,
                  reasoning: 'Good match between IMPORT_TOTAL and Total Amount, both numeric',
                  dataTypeMatch: true
                }
              ],
              unmappedPlaceholders: [],
              unmappedColumns: []
            })
          }
        }]
      })

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: samplePlaceholders,
          columns: sampleColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.proposals).toHaveLength(3)
      expect(result.overallConfidence).toBe(90) // (95 + 90 + 85) / 3
      expect(result.unmappedPlaceholders).toEqual([])
      expect(result.unmappedColumns).toEqual([])
      
      // Check specific mapping
      const clientMapping = result.proposals.find(p => p.placeholder === 'NOM_CLIENT')
      expect(clientMapping).toEqual({
        placeholder: 'NOM_CLIENT',
        excelColumn: 'A',
        excelHeader: 'Client Name',
        confidence: 95,
        reasoning: 'Perfect semantic match between NOM_CLIENT and Client Name',
        dataTypeMatch: true
      })
    })

    it('should reject requests without required data', async () => {
      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: samplePlaceholders
          // Missing columns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('Missing placeholders or columns data')
    })

    it('should handle empty placeholders array', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [],
              unmappedPlaceholders: [],
              unmappedColumns: ['A', 'B', 'C']
            })
          }
        }]
      })

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: [],
          columns: sampleColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.proposals).toEqual([])
      expect(result.overallConfidence).toBe(0)
      expect(result.unmappedColumns).toEqual(['A', 'B', 'C'])
    })

    it('should handle partial mappings with unmapped items', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [
                {
                  placeholder: 'NOM_CLIENT',
                  excelColumn: 'A', 
                  excelHeader: 'Client Name',
                  confidence: 95,
                  reasoning: 'Perfect match',
                  dataTypeMatch: true
                }
              ]
            })
          }
        }]
      })

      const placeholdersWithExtra = [
        ...samplePlaceholders,
        {
          text: 'ADREÇA_CLIENT',
          type: 'text',
          confidence: 75,
          reasoning: 'Client address field'
        }
      ]

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: placeholdersWithExtra,
          columns: sampleColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.proposals).toHaveLength(1)
      expect(result.unmappedPlaceholders).toContain('DATA_CONTRACTE')
      expect(result.unmappedPlaceholders).toContain('IMPORT_TOTAL')
      expect(result.unmappedPlaceholders).toContain('ADREÇA_CLIENT')
      expect(result.unmappedColumns).toContain('B')
      expect(result.unmappedColumns).toContain('C')
    })

    it('should handle AI API failures gracefully', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: samplePlaceholders,
          columns: sampleColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBe('AI mapping analysis failed')
      expect(result.details).toBe('OpenAI API rate limit exceeded')
    })

    it('should handle malformed AI responses', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'invalid json response'
          }
        }]
      })

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: samplePlaceholders,
          columns: sampleColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toBe('AI mapping analysis failed')
    })

    it('should validate confidence scores are within bounds', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [
                {
                  placeholder: 'NOM_CLIENT',
                  excelColumn: 'A',
                  excelHeader: 'Client Name',
                  confidence: 150, // Invalid - too high
                  reasoning: 'Perfect match',
                  dataTypeMatch: true
                },
                {
                  placeholder: 'DATA_CONTRACTE',
                  excelColumn: 'B',
                  excelHeader: 'Contract Date',
                  confidence: -10, // Invalid - negative
                  reasoning: 'Date match',
                  dataTypeMatch: true
                }
              ]
            })
          }
        }]
      })

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: samplePlaceholders,
          columns: sampleColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.proposals[0].confidence).toBe(100) // Capped at 100
      expect(result.proposals[1].confidence).toBe(0)   // Floored at 0
    })

    it('should handle mixed data types appropriately', async () => {
      const mixedPlaceholders = [
        { text: 'EMAIL_CONTACT', type: 'email', confidence: 85 },
        { text: 'TELEFON', type: 'phone', confidence: 80 },
        { text: 'PERCENTATGE', type: 'number', confidence: 75 }
      ]

      const mixedColumns = [
        {
          column: 'A',
          header: 'Contact Email',
          dataType: 'email',
          sampleData: ['john@example.com'],
          aiDescription: 'Email address'
        },
        {
          column: 'B', 
          header: 'Phone Number',
          dataType: 'string',
          sampleData: ['555-1234'],
          aiDescription: 'Phone contact'
        }
      ]

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              proposals: [
                {
                  placeholder: 'EMAIL_CONTACT',
                  excelColumn: 'A',
                  excelHeader: 'Contact Email',
                  confidence: 98,
                  reasoning: 'Exact email type match',
                  dataTypeMatch: true
                },
                {
                  placeholder: 'TELEFON',
                  excelColumn: 'B',
                  excelHeader: 'Phone Number',
                  confidence: 85,
                  reasoning: 'Phone number semantic match',
                  dataTypeMatch: false // phone vs string
                }
              ]
            })
          }
        }]
      })

      const request = new NextRequest('http://localhost/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: mixedPlaceholders,
          columns: mixedColumns
        })
      })

      const response = await POST(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.proposals).toHaveLength(2)
      expect(result.proposals[0].dataTypeMatch).toBe(true)
      expect(result.proposals[1].dataTypeMatch).toBe(false)
      expect(result.unmappedPlaceholders).toContain('PERCENTATGE')
    })
  })
})