// __tests__/utils/test-helpers.ts
// Testing utilities and helpers for Textami API tests

/**
 * Mock file creator for testing file uploads
 */
export const createMockFile = (
  content: string, 
  filename: string, 
  mimeType: string,
  size?: number
): File => {
  const blob = new Blob([content], { type: mimeType })
  const file = new File([blob], filename, { 
    type: mimeType,
    lastModified: Date.now()
  })
  
  // Override size if specified
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size })
  }
  
  return file
}

/**
 * Create mock DOCX file for testing
 */
export const createMockDocxFile = (filename = 'test.docx'): File => {
  return createMockFile(
    'PK mock docx content', 
    filename, 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

/**
 * Create mock Excel file for testing
 */
export const createMockExcelFile = (filename = 'test.xlsx'): File => {
  return createMockFile(
    'PK mock excel content',
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
}

/**
 * Create mock CSV file for testing
 */
export const createMockCsvFile = (filename = 'test.csv'): File => {
  const csvContent = `Name,Email,Age
John Doe,john@email.com,30
Jane Smith,jane@email.com,25`
  
  return createMockFile(csvContent, filename, 'text/csv')
}

/**
 * Mock FormData with file for API testing
 */
export const createMockFormDataWithFile = (file: File, fieldName = 'file'): FormData => {
  const formData = new FormData()
  formData.append(fieldName, file)
  return formData
}

/**
 * Sample test data generators
 */
export const sampleData = {
  placeholders: [
    {
      text: 'NOM_CLIENT',
      type: 'text',
      confidence: 85,
      context: 'Client name field',
      variable: 'nom_client'
    },
    {
      text: 'DATA_CONTRACTE', 
      type: 'date',
      confidence: 90,
      context: 'Contract date field',
      variable: 'data_contracte'
    },
    {
      text: 'IMPORT_TOTAL',
      type: 'number',
      confidence: 80,
      context: 'Total amount field',
      variable: 'import_total'
    }
  ],
  
  excelColumns: [
    {
      column: 'A',
      header: 'Client Name',
      dataType: 'string',
      sampleData: ['John Doe', 'Jane Smith', 'Bob Wilson'],
      confidence: 95,
      aiDescription: 'Full name of the client'
    },
    {
      column: 'B',
      header: 'Contract Date',
      dataType: 'date', 
      sampleData: ['2024-01-15', '2024-01-20', '2024-01-25'],
      confidence: 90,
      aiDescription: 'Date when contract was signed'
    },
    {
      column: 'C',
      header: 'Total Amount',
      dataType: 'number',
      sampleData: [1500, 2300, 1800],
      confidence: 85,
      aiDescription: 'Total contract value'
    }
  ],
  
  excelRows: [
    {
      'Client Name': 'John Doe',
      'Contract Date': '2024-01-15',
      'Total Amount': 1500
    },
    {
      'Client Name': 'Jane Smith',
      'Contract Date': '2024-01-20', 
      'Total Amount': 2300
    },
    {
      'Client Name': 'Bob Wilson',
      'Contract Date': '2024-01-25',
      'Total Amount': 1800
    }
  ],
  
  mappings: [
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
  ]
}

/**
 * Mock successful API responses
 */
export const mockResponses = {
  analyzeSuccess: {
    success: true,
    data: {
      templateId: 'template_123456789',
      fileName: 'test.docx',
      storageUrl: 'template_123456789/original.docx',
      transcription: '<div><h1>Test Document</h1><p>This is a test document with NOM_CLIENT placeholder.</p></div>',
      markdown: '# Test Document\n\nThis is a test document with NOM_CLIENT placeholder.',
      sections: [],
      tables: [],
      placeholders: sampleData.placeholders,
      confidence: 95,
      metadata: {
        extractionMethod: 'nodejs-ooxml-structured',
        processingTimeMs: 1500,
        elementsFound: {
          sections: 1,
          tables: 0,
          signatures: 0,
          paragraphs: 1
        }
      }
    }
  },
  
  excelSuccess: {
    success: true,
    fileName: 'test.xlsx',
    sheetName: 'Sheet1',
    totalRows: 3,
    totalColumns: 3,
    columns: sampleData.excelColumns,
    processingTime: 800
  },
  
  mappingSuccess: {
    success: true,
    proposals: sampleData.mappings,
    unmappedPlaceholders: [],
    unmappedColumns: [],
    overallConfidence: 90,
    processingTime: 1200
  },
  
  generateSuccess: {
    success: true,
    data: {
      templateId: 'template_123456789',
      totalRequested: 3,
      totalGenerated: 3,
      totalErrors: 0,
      documents: [
        {
          documentId: 'doc_1',
          fileName: 'doc_1.docx',
          downloadUrl: 'https://storage.url/outputs/doc_1.docx',
          rowIndex: 0,
          rowData: sampleData.excelRows[0],
          fileSize: 45678,
          generatedAt: new Date().toISOString()
        },
        {
          documentId: 'doc_2',
          fileName: 'doc_2.docx',
          downloadUrl: 'https://storage.url/outputs/doc_2.docx',
          rowIndex: 1,
          rowData: sampleData.excelRows[1],
          fileSize: 46123,
          generatedAt: new Date().toISOString()
        },
        {
          documentId: 'doc_3',
          fileName: 'doc_3.docx',
          downloadUrl: 'https://storage.url/outputs/doc_3.docx',
          rowIndex: 2,
          rowData: sampleData.excelRows[2],
          fileSize: 45892,
          generatedAt: new Date().toISOString()
        }
      ],
      errors: [],
      processingTime: 5400,
      batchId: 'batch_123456789'
    }
  }
}

/**
 * Mock error responses
 */
export const mockErrors = {
  fileRequired: {
    error: 'No file uploaded',
    status: 400
  },
  
  invalidFileType: {
    error: 'File must be .docx format',
    status: 400
  },
  
  storageError: {
    error: 'Storage required for DOCX processing',
    details: 'Upload failed',
    status: 500
  },
  
  aiError: {
    error: 'AI analysis failed',
    details: 'OpenAI API rate limit exceeded',
    status: 500
  },
  
  missingFields: {
    error: 'Missing required fields: templateId, frozenTemplateUrl, excelData, mappings',
    status: 400
  }
}

/**
 * Create NextRequest for testing
 */
export const createMockRequest = (
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  headers: Record<string, string> = {}
) => {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }
  
  if (body) {
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData, let browser set it with boundary
      delete requestInit.headers!['Content-Type']
      requestInit.body = body
    } else {
      requestInit.body = JSON.stringify(body)
    }
  }
  
  return new Request(url, requestInit)
}

/**
 * Async test wrapper for better error handling
 */
export const asyncTest = (testFn: () => Promise<void>) => {
  return async () => {
    try {
      await testFn()
    } catch (error) {
      console.error('Test failed with error:', error)
      throw error
    }
  }
}

/**
 * Wait for async operations in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Mock console methods for cleaner test output
 */
export const mockConsole = () => {
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  
  beforeEach(() => {
    console.log = jest.fn()
    console.error = jest.fn()  
    console.warn = jest.fn()
  })
  
  afterEach(() => {
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
  })
}

/**
 * Validate API response structure
 */
export const validateApiResponse = (response: any, expectedProps: string[]) => {
  expectedProps.forEach(prop => {
    expect(response).toHaveProperty(prop)
  })
}

/**
 * Generate random test data
 */
export const generateTestData = {
  templateId: () => `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  
  fileName: (extension = 'docx') => `test_${Date.now()}.${extension}`,
  
  clientName: () => {
    const names = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Johnson', 'Charlie Brown']
    return names[Math.floor(Math.random() * names.length)]
  },
  
  email: (name?: string) => {
    const baseEmail = name?.toLowerCase().replace(' ', '.') || 'user'
    return `${baseEmail}@example.com`
  },
  
  amount: (min = 1000, max = 5000) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}