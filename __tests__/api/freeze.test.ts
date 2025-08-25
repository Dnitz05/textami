/**
 * @jest-environment node
 */
// __tests__/api/freeze.test.ts
// Tests for template freeze API
import { NextRequest } from 'next/server';
import { POST } from '../../app/api/freeze/route';
import { ApiResponse, FreezeResponse, ParsedTag } from '../../lib/types';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        download: jest.fn().mockResolvedValue({
          data: new Blob(['mock docx content'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
          error: null
        }),
        upload: jest.fn().mockResolvedValue({
          data: { path: 'frozen_template_123.docx' },
          error: null
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test-frozen-url.com' }
        })
      }))
    }
  }))
}));

// Mock PizZip
jest.mock('pizzip', () => {
  return jest.fn().mockImplementation(() => ({
    file: jest.fn().mockReturnValue({
      asText: () => '<w:document><w:body><w:p><w:r><w:t>Paquita Ferre SL</w:t></w:r></w:p></w:body></w:document>'
    }),
    generate: jest.fn().mockReturnValue(Buffer.from('mock frozen docx'))
  }));
});

describe('/api/freeze', () => {
  const mockTags: ParsedTag[] = [
    {
      name: 'nom_solicitant',
      slug: 'nom_solicitant', 
      example: 'Paquita Ferre SL',
      type: 'string',
      confidence: 0.95,
      page: 1,
      anchor: 'sol·licitada per'
    },
    {
      name: 'pressupost',
      slug: 'pressupost',
      example: '683,00 €',
      type: 'currency',
      confidence: 0.99,
      page: 1
    }
  ];

  const mockMappings = {
    'nom_solicitant': 'Nom Solicitant',
    'pressupost': 'Import Pressupost'
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/freeze', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<FreezeResponse>;

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing required fields: templateId, storageUrl, tags, mappings');
  });

  it('should return error when Supabase env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const request = new NextRequest('http://localhost:3000/api/freeze', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-123',
        storageUrl: 'test/template.docx',
        tags: mockTags,
        mappings: mockMappings
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<FreezeResponse>;

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Storage configuration required');
  });

  it('should successfully freeze template with exact matches', async () => {
    const request = new NextRequest('http://localhost:3000/api/freeze', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-123',
        storageUrl: 'test/template.docx',
        tags: mockTags,
        mappings: mockMappings
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<FreezeResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data?.templateId).toBe('test-123');
    expect(data.data?.frozenTemplateUrl).toBe('frozen_template_123.docx');
    expect(data.data?.replacements).toBeInstanceOf(Array);
    expect(data.data?.totalReplacements).toBeGreaterThanOrEqual(0);
    expect(data.data?.successfulReplacements).toBeGreaterThanOrEqual(0);
    expect(data.data?.manualReviewRequired).toBeInstanceOf(Array);
    expect(data.data?.frozenAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should handle tags without mappings', async () => {
    const unmappedTags = [
      ...mockTags,
      {
        name: 'unmapped_tag',
        slug: 'unmapped_tag',
        example: 'Some Value',
        type: 'string' as const,
        confidence: 0.8,
        page: 1
      }
    ];

    const request = new NextRequest('http://localhost:3000/api/freeze', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-123',
        storageUrl: 'test/template.docx',
        tags: unmappedTags,
        mappings: mockMappings // Only maps 2 of 3 tags
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<FreezeResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data?.totalReplacements).toBe(2); // Only mapped tags processed
  });

  it('should validate replacement methods', async () => {
    const request = new NextRequest('http://localhost:3000/api/freeze', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-123',
        storageUrl: 'test/template.docx',
        tags: mockTags,
        mappings: mockMappings
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<FreezeResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    if (data.data?.replacements) {
      data.data.replacements.forEach(replacement => {
        expect(replacement).toHaveProperty('original');
        expect(replacement).toHaveProperty('placeholder');
        expect(replacement).toHaveProperty('confidence');
        expect(replacement).toHaveProperty('method');
        expect(replacement).toHaveProperty('applied');
        
        expect(['exact_match', 'anchor_based', 'pattern_match', 'manual_required'])
          .toContain(replacement.method);
        expect(typeof replacement.applied).toBe('boolean');
        expect(replacement.confidence).toBeGreaterThanOrEqual(0);
        expect(replacement.confidence).toBeLessThanOrEqual(1);
      });
    }
  });

  it('should generate correct placeholder format', async () => {
    const request = new NextRequest('http://localhost:3000/api/freeze', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'test-123',
        storageUrl: 'test/template.docx', 
        tags: mockTags,
        mappings: mockMappings
      })
    });

    const response = await POST(request);
    const data = await response.json() as ApiResponse<FreezeResponse>;

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    if (data.data?.replacements) {
      data.data.replacements.forEach(replacement => {
        // Placeholder should be in format {{slug}}
        expect(replacement.placeholder).toMatch(/^{{[a-zA-Z_]+}}$/);
      });
    }
  });
});