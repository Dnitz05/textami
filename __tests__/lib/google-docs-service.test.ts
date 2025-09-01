// __tests__/lib/google-docs-service.test.ts
// Tests for Google Docs Service - Document processing and structure analysis
import { OAuth2Client } from 'google-auth-library'
import {
  createGoogleDocsService,
  validateDocumentAccess
} from '@/lib/google/docs-service'
import {
  mockGoogleTokens,
  mockGoogleDocument,
  mockGoogleApiResponses,
  mockGoogleApiErrors
} from '../utils/google-test-helpers'

// Mock dependencies
jest.mock('google-auth-library')
jest.mock('googleapis', () => ({
  google: {
    docs: jest.fn(() => ({
      documents: {
        get: jest.fn()
      }
    }))
  }
}))
jest.mock('@/lib/google/auth')
jest.mock('@/lib/google/html-cleaner')

import { google } from 'googleapis'
import { createAuthenticatedClient, handleGoogleApiError } from '@/lib/google/auth'
import { cleanGoogleDocsHTML } from '@/lib/google/html-cleaner'

const mockGoogle = google as jest.Mocked<typeof google>
const mockOAuth2Client = OAuth2Client as jest.MockedClass<typeof OAuth2Client>
const mockCreateAuthenticatedClient = createAuthenticatedClient as jest.MockedFunction<typeof createAuthenticatedClient>
const mockHandleGoogleApiError = handleGoogleApiError as jest.MockedFunction<typeof handleGoogleApiError>
const mockCleanGoogleDocsHTML = cleanGoogleDocsHTML as jest.MockedFunction<typeof cleanGoogleDocsHTML>

describe('Google Docs Service', () => {
  let mockOAuth2Instance: any
  let mockDocsClient: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock OAuth2 client instance
    mockOAuth2Instance = {
      setCredentials: jest.fn(),
      on: jest.fn()
    }
    mockOAuth2Client.mockImplementation(() => mockOAuth2Instance)
    mockCreateAuthenticatedClient.mockResolvedValue(mockOAuth2Instance)
    
    // Mock Google Docs client
    mockDocsClient = {
      documents: {
        get: jest.fn()
      }
    }
    mockGoogle.docs.mockReturnValue(mockDocsClient)
    
    // Mock HTML cleaner
    mockCleanGoogleDocsHTML.mockReturnValue({
      cleanedHtml: '<div class="google-doc-clean"><h1>Test</h1><p>Content</p></div>',
      removedElements: [],
      preservedStyles: []
    })
    
    // Mock error handler
    mockHandleGoogleApiError.mockImplementation((error) => new Error(`Handled: ${error.message}`))
  })

  describe('createGoogleDocsService', () => {
    it('should create service instance successfully', async () => {
      const service = await createGoogleDocsService(mockGoogleTokens)
      
      expect(mockCreateAuthenticatedClient).toHaveBeenCalledWith(mockGoogleTokens, undefined)
      expect(mockGoogle.docs).toHaveBeenCalledWith({ version: 'v1', auth: mockOAuth2Instance })
      expect(service).toBeDefined()
    })

    it('should create service with token refresh callback', async () => {
      const onTokenRefresh = jest.fn()
      
      const service = await createGoogleDocsService(mockGoogleTokens, onTokenRefresh)
      
      expect(mockCreateAuthenticatedClient).toHaveBeenCalledWith(mockGoogleTokens, onTokenRefresh)
      expect(service).toBeDefined()
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed')
      mockCreateAuthenticatedClient.mockRejectedValue(authError)
      
      await expect(createGoogleDocsService(mockGoogleTokens)).rejects.toThrow('Handled: Authentication failed')
      expect(mockHandleGoogleApiError).toHaveBeenCalledWith(authError)
    })
  })

  describe('GoogleDocsService methods', () => {
    let service: any

    beforeEach(async () => {
      service = await createGoogleDocsService(mockGoogleTokens)
    })

    describe('exportToHTML', () => {
      it('should export document to HTML successfully', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: mockGoogleDocument
        })

        const html = await service.exportToHTML('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')

        expect(mockDocsClient.documents.get).toHaveBeenCalledWith({
          documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          includeTabsContent: true
        })
        expect(html).toContain('google-doc')
        expect(html).toContain('Client Contract Template')
        expect(html).toContain('CLIENT_NAME')
      })

      it('should handle empty document data', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: null
        })

        await expect(service.exportToHTML('doc_id')).rejects.toThrow('No document data received')
      })

      it('should handle API errors', async () => {
        const apiError = new Error('Document not found')
        mockDocsClient.documents.get.mockRejectedValue(apiError)

        await expect(service.exportToHTML('invalid_doc_id')).rejects.toThrow('Handled: Document not found')
        expect(mockHandleGoogleApiError).toHaveBeenCalledWith(apiError)
      })
    })

    describe('getDocumentStructure', () => {
      it('should analyze document structure successfully', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: mockGoogleDocument
        })

        const structure = await service.getDocumentStructure('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')

        expect(structure.headings).toHaveLength(1)
        expect(structure.headings[0]).toEqual({
          level: 1,
          text: 'Client Contract Template\n',
          startIndex: 0,
          endIndex: 25
        })
        
        expect(structure.paragraphs).toHaveLength(1)
        expect(structure.paragraphs[0].text).toContain('CLIENT_NAME')
        
        expect(structure.tables).toHaveLength(1)
        expect(structure.tables[0].rows).toBe(2)
        expect(structure.tables[0].columns).toBe(2)
      })

      it('should handle document without body', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: { ...mockGoogleDocument, body: null }
        })

        await expect(service.getDocumentStructure('doc_id')).rejects.toThrow('No document body received')
      })

      it('should handle empty document body', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: {
            ...mockGoogleDocument,
            body: { content: [] }
          }
        })

        const structure = await service.getDocumentStructure('doc_id')

        expect(structure.headings).toHaveLength(0)
        expect(structure.paragraphs).toHaveLength(0)
        expect(structure.tables).toHaveLength(0)
        expect(structure.images).toHaveLength(0)
      })
    })

    describe('parseDocumentContent', () => {
      it('should parse complete document content', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: mockGoogleDocument
        })

        const result = await service.parseDocumentContent('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')

        expect(result.html).toContain('google-doc')
        expect(result.cleanedHtml).toContain('google-doc-clean')
        expect(result.structure.headings).toHaveLength(1)
        expect(result.metadata).toEqual({
          id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          name: 'Test Document 1',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: expect.any(String),
          modifiedTime: expect.any(String),
          owners: [],
          permissions: []
        })

        expect(mockCleanGoogleDocsHTML).toHaveBeenCalledWith(
          expect.stringContaining('google-doc'),
          undefined
        )
      })

      it('should pass cleaning options', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: mockGoogleDocument
        })

        const cleaningOptions = {
          preserveFormatting: true,
          convertToSemantic: true,
          removeEmptyElements: true
        }

        await service.parseDocumentContent('doc_id', cleaningOptions)

        expect(mockCleanGoogleDocsHTML).toHaveBeenCalledWith(
          expect.any(String),
          cleaningOptions
        )
      })

      it('should handle documents without title', async () => {
        const docWithoutTitle = {
          ...mockGoogleDocument,
          title: undefined
        }
        
        mockDocsClient.documents.get.mockResolvedValue({
          data: docWithoutTitle
        })

        const result = await service.parseDocumentContent('doc_id')

        expect(result.metadata.name).toBe('Untitled Document')
      })
    })

    describe('HTML conversion', () => {
      it('should convert paragraphs with text styling', async () => {
        const docWithStyling = {
          ...mockGoogleDocument,
          body: {
            content: [
              {
                paragraph: {
                  elements: [
                    {
                      textRun: {
                        content: 'Bold text',
                        textStyle: {
                          bold: true
                        }
                      }
                    },
                    {
                      textRun: {
                        content: ' and italic text',
                        textStyle: {
                          italic: true
                        }
                      }
                    },
                    {
                      textRun: {
                        content: ' and underlined text',
                        textStyle: {
                          underline: true
                        }
                      }
                    }
                  ]
                }
              }
            ]
          }
        }

        mockDocsClient.documents.get.mockResolvedValue({
          data: docWithStyling
        })

        const html = await service.exportToHTML('doc_id')

        expect(html).toContain('<strong>Bold text</strong>')
        expect(html).toContain('<em> and italic text</em>')
        expect(html).toContain('<u> and underlined text</u>')
      })

      it('should convert headings correctly', async () => {
        const docWithHeadings = {
          ...mockGoogleDocument,
          body: {
            content: [
              {
                paragraph: {
                  elements: [
                    {
                      textRun: {
                        content: 'Heading 1\n'
                      }
                    }
                  ],
                  paragraphStyle: {
                    namedStyleType: 'HEADING_1'
                  }
                }
              },
              {
                paragraph: {
                  elements: [
                    {
                      textRun: {
                        content: 'Heading 2\n'
                      }
                    }
                  ],
                  paragraphStyle: {
                    namedStyleType: 'HEADING_2'
                  }
                }
              }
            ]
          }
        }

        mockDocsClient.documents.get.mockResolvedValue({
          data: docWithHeadings
        })

        const html = await service.exportToHTML('doc_id')

        expect(html).toContain('<h1>Heading 1\n</h1>')
        expect(html).toContain('<h2>Heading 2\n</h2>')
      })

      it('should handle section breaks', async () => {
        const docWithSectionBreak = {
          ...mockGoogleDocument,
          body: {
            content: [
              {
                paragraph: {
                  elements: [
                    {
                      textRun: {
                        content: 'Section 1'
                      }
                    }
                  ]
                }
              },
              {
                sectionBreak: {
                  sectionStyle: {}
                }
              },
              {
                paragraph: {
                  elements: [
                    {
                      textRun: {
                        content: 'Section 2'
                      }
                    }
                  ]
                }
              }
            ]
          }
        }

        mockDocsClient.documents.get.mockResolvedValue({
          data: docWithSectionBreak
        })

        const html = await service.exportToHTML('doc_id')

        expect(html).toContain('<p>Section 1</p>')
        expect(html).toContain('<hr class="section-break" />')
        expect(html).toContain('<p>Section 2</p>')
      })

      it('should handle empty paragraphs', async () => {
        const docWithEmptyParagraph = {
          ...mockGoogleDocument,
          body: {
            content: [
              {
                paragraph: {
                  elements: []
                }
              }
            ]
          }
        }

        mockDocsClient.documents.get.mockResolvedValue({
          data: docWithEmptyParagraph
        })

        const html = await service.exportToHTML('doc_id')

        expect(html).toContain('<p></p>')
      })

      it('should convert tables with cell content', async () => {
        mockDocsClient.documents.get.mockResolvedValue({
          data: mockGoogleDocument
        })

        const html = await service.exportToHTML('doc_id')

        expect(html).toContain('<table class="google-table">')
        expect(html).toContain('<tr>')
        expect(html).toContain('<td>Description</td>')
        expect(html).toContain('<td>Amount</td>')
        expect(html).toContain('<td>SERVICE_DESCRIPTION</td>')
        expect(html).toContain('<td>SERVICE_AMOUNT</td>')
        expect(html).toContain('</table>')
      })
    })
  })

  describe('validateDocumentAccess', () => {
    it('should validate accessible document', async () => {
      mockDocsClient.documents.get.mockResolvedValue({
        data: mockGoogleDocument
      })

      const isAccessible = await validateDocumentAccess('doc_id', mockGoogleTokens)

      expect(isAccessible).toBe(true)
    })

    it('should detect inaccessible document', async () => {
      mockDocsClient.documents.get.mockRejectedValue(
        new Error('Permission denied')
      )

      const isAccessible = await validateDocumentAccess('doc_id', mockGoogleTokens)

      expect(isAccessible).toBe(false)
    })

    it('should handle service creation errors', async () => {
      mockCreateAuthenticatedClient.mockRejectedValue(
        new Error('Auth failed')
      )

      const isAccessible = await validateDocumentAccess('doc_id', mockGoogleTokens)

      expect(isAccessible).toBe(false)
    })
  })

  describe('Edge cases and error handling', () => {
    let service: any

    beforeEach(async () => {
      service = await createGoogleDocsService(mockGoogleTokens)
    })

    it('should handle documents with inline objects', async () => {
      const docWithImage = {
        ...mockGoogleDocument,
        body: {
          content: [
            {
              paragraph: {
                elements: [
                  {
                    inlineObjectElement: {
                      inlineObjectId: 'image_1'
                    }
                  }
                ]
              }
            }
          ]
        },
        inlineObjects: {
          'image_1': {
            inlineObjectProperties: {
              embeddedObject: {
                imageProperties: {
                  contentUri: 'https://example.com/image.png'
                },
                title: 'Test Image',
                description: 'Alt text for image'
              }
            }
          }
        }
      }

      mockDocsClient.documents.get.mockResolvedValue({
        data: docWithImage
      })

      const html = await service.exportToHTML('doc_id')

      expect(html).toContain('<img src="https://example.com/image.png"')
      expect(html).toContain('alt="Alt text for image"')
      expect(html).toContain('title="Test Image"')
      expect(html).toContain('class="google-doc-image"')
    })

    it('should handle complex table structures', async () => {
      const docWithComplexTable = {
        ...mockGoogleDocument,
        body: {
          content: [
            {
              table: {
                tableRows: [
                  {
                    tableCells: [
                      {
                        content: [
                          {
                            paragraph: {
                              elements: [
                                {
                                  textRun: {
                                    content: 'Multi\nline\ncell'
                                  }
                                }
                              ]
                            }
                          }
                        ]
                      },
                      {
                        content: []  // Empty cell
                      }
                    ]
                  }
                ]
              }
            }
          ]
        }
      }

      mockDocsClient.documents.get.mockResolvedValue({
        data: docWithComplexTable
      })

      const structure = await service.getDocumentStructure('doc_id')

      expect(structure.tables).toHaveLength(1)
      expect(structure.tables[0].cells[0][0].text).toBe('Multi\nline\ncell')
      expect(structure.tables[0].cells[0][1].text).toBe('')
    })

    it('should handle mixed content types', async () => {
      const docWithMixedContent = {
        ...mockGoogleDocument,
        body: {
          content: [
            {
              paragraph: {
                elements: [
                  {
                    textRun: {
                      content: 'Text before image '
                    }
                  },
                  {
                    inlineObjectElement: {
                      inlineObjectId: 'img1'
                    }
                  },
                  {
                    textRun: {
                      content: ' text after image'
                    }
                  }
                ]
              }
            }
          ]
        },
        inlineObjects: {
          'img1': {
            inlineObjectProperties: {
              embeddedObject: {
                imageProperties: {
                  contentUri: 'https://example.com/test.png'
                }
              }
            }
          }
        }
      }

      mockDocsClient.documents.get.mockResolvedValue({
        data: docWithMixedContent
      })

      const html = await service.exportToHTML('doc_id')

      expect(html).toContain('Text before image')
      expect(html).toContain('<img src="https://example.com/test.png"')
      expect(html).toContain('text after image')
    })
  })
})