// __tests__/utils/google-test-helpers.ts
// Testing utilities specifically for Google APIs and services

/**
 * Mock Google Auth Tokens for testing
 */
export const mockGoogleTokens = {
  access_token: 'mock_access_token_12345',
  refresh_token: 'mock_refresh_token_67890',
  scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets',
  token_type: 'Bearer',
  expiry_date: Date.now() + 3600000, // 1 hour from now
}

/**
 * Mock expired Google tokens for testing refresh logic
 */
export const mockExpiredGoogleTokens = {
  ...mockGoogleTokens,
  expiry_date: Date.now() - 3600000, // 1 hour ago (expired)
}

/**
 * Mock Google Drive files for testing
 */
export const mockGoogleDriveFiles = [
  {
    id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    name: 'Test Document 1',
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: '2024-01-15T10:30:00.000Z',
    size: '45678',
    webViewLink: 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    owners: [{
      displayName: 'John Doe',
      emailAddress: 'john@example.com'
    }]
  },
  {
    id: '2CyiNWt1YSB6oGNeMLvFeDkHmVVrqumsc85PnvE3vqnt',
    name: 'Contract Template',
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: '2024-01-20T14:45:00.000Z',
    size: '52341',
    webViewLink: 'https://docs.google.com/document/d/2CyiNWt1YSB6oGNeMLvFeDkHmVVrqumsc85PnvE3vqnt/edit',
    owners: [{
      displayName: 'Jane Smith',
      emailAddress: 'jane@example.com'
    }]
  }
]

/**
 * Mock Google Docs document structure
 */
export const mockGoogleDocument = {
  documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  title: 'Test Document 1',
  revisionId: 'ALm37BWB7dEBT-bFTdV6Tsa67P_A_LsHOhqMCl6VVcol5CDcWyLGWH-TCX4k',
  body: {
    content: [
      {
        paragraph: {
          elements: [
            {
              textRun: {
                content: 'Client Contract Template\n',
                textStyle: {
                  bold: true,
                  fontSize: {
                    magnitude: 18,
                    unit: 'PT'
                  }
                }
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
                content: 'Dear CLIENT_NAME, this contract is for AMOUNT euros and valid until CONTRACT_DATE.\n'
              }
            }
          ]
        }
      },
      {
        table: {
          rows: 2,
          columns: 2,
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
                              content: 'Description'
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          {
                            textRun: {
                              content: 'Amount'
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            },
            {
              tableCells: [
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          {
                            textRun: {
                              content: 'SERVICE_DESCRIPTION'
                            }
                          }
                        ]
                      }
                    }
                  ]
                },
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          {
                            textRun: {
                              content: 'SERVICE_AMOUNT'
                            }
                          }
                        ]
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  }
}

/**
 * Mock Google Sheets data
 */
export const mockGoogleSheet = {
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  properties: {
    title: 'Client Data'
  },
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
}

export const mockGoogleSheetData = [
  ['Client Name', 'Email', 'Contract Date', 'Amount', 'Service Description'],
  ['John Doe', 'john@example.com', '2024-02-15', '1500', 'Web Development'],
  ['Jane Smith', 'jane@example.com', '2024-02-20', '2300', 'Mobile App'],
  ['Bob Wilson', 'bob@example.com', '2024-02-25', '1800', 'UI Design']
]

/**
 * Mock successful Google API responses
 */
export const mockGoogleApiResponses = {
  driveFilesList: {
    data: {
      files: mockGoogleDriveFiles,
      nextPageToken: null
    }
  },
  
  docsGet: {
    data: mockGoogleDocument
  },
  
  sheetsGet: {
    data: mockGoogleSheet
  },
  
  sheetsValuesGet: {
    data: {
      values: mockGoogleSheetData,
      range: 'Clients!A1:E5',
      majorDimension: 'ROWS'
    }
  },
  
  userProfile: {
    data: {
      id: '12345678901234567890',
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
      verified_email: true
    }
  }
}

/**
 * Mock Google API error responses
 */
export const mockGoogleApiErrors = {
  unauthorized: {
    response: {
      status: 401,
      data: {
        error: {
          code: 401,
          message: 'Request had invalid authentication credentials.',
          status: 'UNAUTHENTICATED'
        }
      }
    }
  },
  
  forbidden: {
    response: {
      status: 403,
      data: {
        error: {
          code: 403,
          message: 'The caller does not have permission',
          status: 'PERMISSION_DENIED'
        }
      }
    }
  },
  
  notFound: {
    response: {
      status: 404,
      data: {
        error: {
          code: 404,
          message: 'Requested entity was not found',
          status: 'NOT_FOUND'
        }
      }
    }
  },
  
  quotaExceeded: {
    response: {
      status: 429,
      data: {
        error: {
          code: 429,
          message: 'Quota exceeded for quota metric',
          status: 'RESOURCE_EXHAUSTED'
        }
      }
    }
  }
}

/**
 * Helper to create mock user session for Google API tests
 */
export const createMockUserSession = (overrides: any = {}) => ({
  user: {
    id: 'user_12345',
    email: 'test@example.com',
    ...overrides
  },
  session: {
    access_token: 'session_token_12345',
    refresh_token: 'session_refresh_12345'
  }
})

/**
 * Mock NextRequest for Google API endpoints
 */
export const createGoogleApiRequest = (
  url: string,
  method: 'GET' | 'POST' = 'POST',
  body?: any,
  headers: Record<string, string> = {}
) => {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'session=mock_session_token',
      ...headers
    }
  }
  
  if (body) {
    requestInit.body = JSON.stringify(body)
  }
  
  return new Request(url, requestInit)
}

/**
 * Helper to create mock Supabase user for Google tests
 */
export const createMockSupabaseUser = () => ({
  id: 'user_12345',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {
    google_tokens: mockGoogleTokens
  },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z'
})

/**
 * Sample expected responses for Google API tests
 */
export const expectedGoogleApiResponses = {
  docsAnalyzeSuccess: {
    success: true,
    data: {
      templateId: expect.stringMatching(/^google_doc_\d+_[a-z0-9]+$/),
      fileName: 'Test Document 1',
      sourceType: 'google-docs',
      googleDocId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      placeholders: expect.arrayContaining([
        expect.objectContaining({
          text: 'CLIENT_NAME',
          confidence: expect.any(Number)
        })
      ]),
      sections: expect.any(Array),
      tables: expect.any(Array),
      confidence: expect.any(Number),
      processing: expect.objectContaining({
        aiAnalyzer: expect.stringMatching(/^(openai|gemini)$/),
        processingTime: expect.any(Number)
      })
    }
  },
  
  driveFilesSuccess: {
    success: true,
    files: mockGoogleDriveFiles,
    totalFiles: mockGoogleDriveFiles.length
  },
  
  sheetsDataSuccess: {
    success: true,
    spreadsheetId: mockGoogleSheet.spreadsheetId,
    sheetName: 'Clients',
    totalRows: mockGoogleSheetData.length - 1, // Exclude header
    totalColumns: mockGoogleSheetData[0].length,
    columns: expect.arrayContaining([
      expect.objectContaining({
        column: 'A',
        header: 'Client Name',
        dataType: expect.any(String),
        sampleData: expect.any(Array)
      })
    ])
  }
}

/**
 * Utility to validate Google API response structure
 */
export const validateGoogleApiResponse = (response: any, expectedShape: any) => {
  Object.keys(expectedShape).forEach(key => {
    expect(response).toHaveProperty(key)
    if (typeof expectedShape[key] === 'object' && expectedShape[key] !== null) {
      if (Array.isArray(expectedShape[key])) {
        expect(Array.isArray(response[key])).toBe(true)
      } else {
        validateGoogleApiResponse(response[key], expectedShape[key])
      }
    }
  })
}