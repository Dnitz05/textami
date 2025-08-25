/**
 * @jest-environment node
 */
// __tests__/api/extract.test.ts
// Tests for GPT-5 document extraction API
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/extract/route';
import { ApiResponse, ExtractionResponse } from '../../lib/types';

// Mock OpenAI
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://test-signed-url.com' },
          error: null
        }),
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null
        })
      }))
    }
  }))
}));

describe('/api/extract', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when templateId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<ExtractionResponse>;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing templateId');
  });

  it('should return error when Supabase env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const request = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: JSON.stringify({ templateId: 'test-123' })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<ExtractionResponse>;

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Storage configuration required');
  });

  it('should handle mock mode correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: JSON.stringify({ 
        templateId: 'test-123',
        fileName: 'test.pdf'
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<ExtractionResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data?.templateId).toBe('test-123');
    expect(data.data?.markdown).toContain('INFORME TÈCNIC');
    expect(data.data?.tags).toBeInstanceOf(Array);
    expect(data.data?.sections).toBeInstanceOf(Array);
    expect(data.data?.tables).toBeInstanceOf(Array);
  });

  it('should process GPT-5 response correctly', async () => {
    // Mock GPT-5 response
    const mockGPTResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            markdown: '# Test Document\n\nContent here',
            json: {
              sections: [
                { id: 'intro', title: 'Introduction', markdown: 'Test content' }
              ],
              tables: [],
              tags: [
                { name: 'test_tag', example: 'Test Value', type: 'string', confidence: 0.9, page: 1 }
              ],
              signatura: {
                nom: 'Test User',
                carrec: 'Tester',
                data_lloc: 'Test Location'
              }
            }
          })
        }
      }]
    };

    const OpenAI = require('openai').default;
    const mockInstance = new OpenAI();
    mockInstance.chat.completions.create.mockResolvedValue(mockGPTResponse);

    const request = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST', 
      body: JSON.stringify({
        templateId: 'test-123',
        pdfUrl: 'https://test-pdf-url.com',
        fileName: 'test.pdf'
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<ExtractionResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data?.markdown).toBe('# Test Document\n\nContent here');
    expect(data.data?.tags).toHaveLength(1);
    expect(data.data?.tags?.[0].name).toBe('test_tag');
  });

  it('should validate response structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/extract', {
      method: 'POST',
      body: JSON.stringify({ 
        templateId: 'test-123',
        fileName: 'test.pdf'
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<ExtractionResponse>;

    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    
    if (data.success && data.data) {
      expect(data.data).toHaveProperty('templateId');
      expect(data.data).toHaveProperty('markdown');
      expect(data.data).toHaveProperty('sections');
      expect(data.data).toHaveProperty('tables'); 
      expect(data.data).toHaveProperty('tags');
      expect(data.data).toHaveProperty('metadata');
      
      expect(typeof data.data.templateId).toBe('string');
      expect(typeof data.data.markdown).toBe('string');
      expect(Array.isArray(data.data.sections)).toBe(true);
      expect(Array.isArray(data.data.tables)).toBe(true);
      expect(Array.isArray(data.data.tags)).toBe(true);
    }
  });
});