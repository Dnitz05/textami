// __tests__/emergency-fixes/api-integration.test.ts
// CRITICAL: Integration tests for emergency hotfixes
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/security/auth-middleware', () => ({
  validateUserSession: jest.fn().mockResolvedValue({
    user: { id: 'test-user-123', email: 'test@example.com' },
    error: null,
    response: null
  }),
  checkRateLimit: jest.fn().mockReturnValue({
    allowed: true,
    response: null
  })
}));

jest.mock('@/lib/security/input-validation', () => ({
  validateRequestSchema: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    sanitizedData: {
      documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms0000',
      fileName: 'Test Document',
      useGemini: false,
      placeholders: [{ text: 'NAME', type: 'text', confidence: 85 }],
      columns: [{ column: 'A', header: 'Name', dataType: 'text' }]
    }
  })
}));

jest.mock('@/lib/google/token-manager', () => ({
  getValidGoogleTokens: jest.fn().mockResolvedValue({
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    expiry_date: Date.now() + 3600000
  })
}));

jest.mock('@/lib/google/docs-service', () => ({
  createGoogleDocsService: jest.fn().mockResolvedValue({
    parseDocumentContent: jest.fn().mockResolvedValue({
      html: '<h1>Test Document</h1><p>Content</p>',
      cleanedHtml: '<h1>Test Document</h1><p>Content</p>',
      structure: {
        headings: [{ text: 'Test Document', level: 1 }],
        tables: [],
        paragraphs: [{ text: 'Content' }]
      },
      metadata: {
        name: 'Test Google Doc',
        createdTime: '2025-01-01T00:00:00Z',
        modifiedTime: '2025-01-01T00:00:00Z'
      }
    })
  })
}));

jest.mock('@/lib/ai/google-docs-analyzer', () => ({
  analyzeGoogleDocsHTML: jest.fn().mockResolvedValue({
    placeholders: [
      { text: 'NAME', variable: 'name', confidence: 85, type: 'text', context: 'Person name' }
    ],
    sections: [
      { id: 'sec1', title: 'Test Document', type: 'heading1' }
    ],
    tables: [],
    transcription: '<h1>Test Document</h1><p>Content</p>',
    confidence: 90,
    metadata: { processingTimeMs: 1500 }
  })
}));

jest.mock('@/lib/ai/gemini-analyzer', () => ({
  isGeminiAvailable: jest.fn().mockReturnValue(false)
}));

// Mock OpenAI for the mapping endpoint
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                proposals: [
                  {
                    placeholder: 'NAME',
                    excelColumn: 'A',
                    excelHeader: 'Name',
                    confidence: 90,
                    reasoning: 'Direct semantic match',
                    dataTypeMatch: true
                  }
                ],
                unmappedPlaceholders: [],
                unmappedColumns: []
              })
            }
          }]
        })
      }
    }
  }));
});

describe('Emergency Fixes - API Integration', () => {
  
  describe('Google Docs Analyze Endpoint with Unified Layer', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
      // Mock NextRequest with valid Google Doc ID format (44 chars alphanumeric)
      const mockBody = {
        documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms0000',
        fileName: 'Test Document',
        useGemini: false
      };
      
      mockRequest = {
        json: jest.fn().mockResolvedValue(mockBody),
        nextUrl: { pathname: '/api/google/docs/analyze' },
        headers: new Headers({ 'authorization': 'Bearer test-token' }),
        ip: '127.0.0.1',
        method: 'POST'
      } as any;

      // Clear all mocks
      jest.clearAllMocks();
    });

    test('should return unified response format', async () => {
      // Dynamic import to avoid module loading issues
      const { POST } = await import('../../app/api/google/docs/analyze/route');
      
      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Test response structure
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();

      // Test unified template structure
      const template = responseData.data;
      expect(template.templateId).toBeDefined();
      expect(template.fileName).toBeDefined();
      expect(template.sourceType).toBe('google-docs');
      
      // CRITICAL: These fields must exist for UI compatibility
      expect(template.transcription).toBeDefined();
      expect(template.markdown).toBeDefined(); // This was causing crashes
      expect(Array.isArray(template.placeholders)).toBe(true);
      expect(Array.isArray(template.sections)).toBe(true);
      expect(Array.isArray(template.tables)).toBe(true);
      
      // Test source-specific data
      expect(template.sourceData).toBeDefined();
      expect(template.metadata).toBeDefined();
    });

    test('should handle authentication errors gracefully', async () => {
      // Mock authentication failure
      const { validateUserSession } = await import('@/lib/security/auth-middleware');
      (validateUserSession as jest.Mock).mockResolvedValueOnce({
        user: null,
        error: 'Authentication required',
        response: Response.json({ error: 'Authentication required' }, { status: 401 })
      });

      const { POST } = await import('../../app/api/google/docs/analyze/route');
      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
    });

    test('should handle rate limiting', async () => {
      // Mock rate limiting
      const { checkRateLimit } = await import('@/lib/security/auth-middleware');
      (checkRateLimit as jest.Mock).mockReturnValueOnce({
        allowed: false,
        response: Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
      });

      const { POST } = await import('../../app/api/google/docs/analyze/route');
      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
    });
  });

  describe('Missing Endpoints Functionality', () => {
    test('Google Docs mapping endpoint should exist and respond', async () => {
      const mockMappingRequest = {
        json: jest.fn().mockResolvedValue({
          documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms0000',
          fileName: 'Test Document',
          placeholders: [{ text: 'NAME', type: 'text', confidence: 85 }],
          columns: [{ column: 'A', header: 'Name', dataType: 'text' }]
        }),
        nextUrl: { pathname: '/api/google/docs/mapping' },
        headers: new Headers({ 'authorization': 'Bearer test-token' }),
        ip: '127.0.0.1',
        method: 'POST'
      } as any;

      const { POST } = await import('../../app/api/google/docs/mapping/route');
      const response = await POST(mockMappingRequest);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.proposals)).toBe(true);
      expect(responseData.sourceType).toBe('google-docs');
    });

    test('Google Docs generate endpoint should exist and return placeholder', async () => {
      const mockGenerateRequest = {
        json: jest.fn().mockResolvedValue({
          documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms0000',
          fileName: 'Test Document',
          templateId: 'test-template-123',
          mappings: [{ placeholder: 'NAME', column: 'A' }],
          excelData: { columns: [{ sampleData: ['John', 'Jane'] }] }
        }),
        nextUrl: { pathname: '/api/google/docs/generate' },
        headers: new Headers({ 'authorization': 'Bearer test-token' }),
        ip: '127.0.0.1',
        method: 'POST'
      } as any;

      const { POST } = await import('../../app/api/google/docs/generate/route');
      const response = await POST(mockGenerateRequest);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.sourceType).toBe('google-docs');
      expect(responseData.generated).toBeDefined();
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should handle compatibility layer failures gracefully', async () => {
      // Mock compatibility layer failure by making unified system throw
      jest.doMock('@/lib/compatibility/unified-system', () => ({
        convertGoogleDocsToUnified: jest.fn().mockImplementation(() => {
          throw new Error('Compatibility layer failure');
        }),
        validateUnifiedTemplate: jest.fn().mockReturnValue(null),
        createFallbackTemplate: jest.fn().mockReturnValue({
          templateId: 'fallback-123',
          fileName: 'Fallback Document',
          sourceType: 'google-docs',
          transcription: '<div>Fallback content</div>',
          markdown: '# Fallback Document',
          placeholders: [],
          sections: [],
          tables: [],
          sourceData: { googleDocId: '' },
          metadata: { confidence: 0, processingTimeMs: 0, extractionMethod: 'fallback' }
        })
      }));

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms0000',
          fileName: 'Test Document'
        }),
        nextUrl: { pathname: '/api/google/docs/analyze' },
        headers: new Headers({ 'authorization': 'Bearer test-token' }),
        ip: '127.0.0.1',
        method: 'POST'
      } as any;

      const { POST } = await import('../../app/api/google/docs/analyze/route');
      const response = await POST(mockRequest);
      
      // Should still return 200 with fallback data
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      
      // Even with compatibility layer failure, should have basic structure
      expect(responseData.data).toBeDefined();
    });
  });
});

describe('Security Integration', () => {
  test('all Google Docs endpoints should validate user session', async () => {
    const mockUnauthenticatedRequest = {
      json: jest.fn().mockResolvedValue({
        documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms0000',
        fileName: 'Test Document'
      }),
      nextUrl: { pathname: '/api/google/docs/analyze' },
      headers: new Headers(),
      ip: '127.0.0.1',
      method: 'POST'
    } as any;

    // Mock authentication failure
    const { validateUserSession } = await import('@/lib/security/auth-middleware');
    (validateUserSession as jest.Mock).mockResolvedValue({
      user: null,
      error: 'Authentication required',
      response: Response.json({ error: 'Authentication required' }, { status: 401 })
    });

    // Test analyze endpoint
    const { POST: analyzePost } = await import('../../app/api/google/docs/analyze/route');
    const analyzeResponse = await analyzePost(mockUnauthenticatedRequest);
    expect(analyzeResponse.status).toBe(401);

    // Test mapping endpoint
    const { POST: mappingPost } = await import('../../app/api/google/docs/mapping/route');
    const mappingResponse = await mappingPost(mockUnauthenticatedRequest);
    expect(mappingResponse.status).toBe(401);

    // Test generate endpoint
    const { POST: generatePost } = await import('../../app/api/google/docs/generate/route');
    const generateResponse = await generatePost(mockUnauthenticatedRequest);
    expect(generateResponse.status).toBe(401);
  });
});