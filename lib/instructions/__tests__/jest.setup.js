// Jest Setup for Instructions System Tests
// Google-focused testing setup

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Mock console methods to reduce test noise
const originalConsole = { ...console };
global.console = {
  ...console,
  // Keep error and warn for debugging
  error: originalConsole.error,
  warn: originalConsole.warn,
  // Suppress info and debug in tests
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

// Mock Date.now for consistent timestamps
const mockTimestamp = 1641024000000; // 2022-01-01T12:00:00.000Z
global.Date.now = jest.fn(() => mockTimestamp);

// Mock crypto.randomUUID for consistent IDs
global.crypto = {
  ...global.crypto,
  randomUUID: jest.fn(() => 'mock-uuid-123456789')
};

// Mock fetch for HTTP requests
global.fetch = jest.fn();

// Setup global mocks for common modules
jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockReturnThis()
      }))
    })),
    rpc: jest.fn(() => Promise.resolve({ error: null })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      }))
    }
  }))
}));

// Mock OpenAI
jest.mock('@/lib/openai', () => ({
  getOpenAI: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'Mock AI response content'
            }
          }],
          usage: {
            total_tokens: 100
          }
        }))
      }
    }
  }))
}));

// Mock Google AI (Gemini)
jest.mock('@/lib/ai/gemini-analyzer', () => ({
  isGeminiAvailable: jest.fn(() => false), // Default to false to test OpenAI fallback
  analyzeWithGemini: jest.fn(() => Promise.resolve({
    content: 'Mock Gemini response',
    tokensUsed: 150,
    confidence: 0.9
  }))
}));

// Mock Next.js request/response
global.NextRequest = class {
  constructor(url, options = {}) {
    this.url = url || 'http://localhost/test';
    this.method = options.method || 'GET';
    this.headers = new Map(Object.entries(options.headers || {}));
    this._body = options.body;
  }
  
  async json() {
    return typeof this._body === 'string' ? JSON.parse(this._body) : this._body || {};
  }
};

global.NextResponse = {
  json: jest.fn((data, options) => ({
    json: () => Promise.resolve(data),
    status: options?.status || 200,
    headers: options?.headers || {}
  }))
};

// Mock URL constructor for request parsing
global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.searchParams = new URLSearchParams(url.split('?')[1] || '');
  }
};

// Common test utilities
global.testUtils = {
  // Create mock instruction
  createMockInstruction: (overrides = {}) => ({
    id: 'mock-instruction-id',
    type: 'global',
    scope: 'document',
    title: 'Mock Instruction',
    instruction: 'Mock instruction content',
    target: { selector: 'all', elementType: 'global' },
    isActive: true,
    priority: 5,
    executionOrder: 1,
    variables: [],
    conditions: [],
    preserveFormatting: true,
    variableSubstitution: true,
    contextAware: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-user',
    version: 1,
    ...overrides
  }),
  
  // Create mock execution context
  createMockContext: (overrides = {}) => ({
    templateId: 'mock-template',
    documentId: 'mock-document',
    currentContent: '<p>Mock content</p>',
    originalContent: '<p>Mock content</p>',
    variables: {},
    knowledgeDocuments: [],
    executionLevel: 0,
    parentInstructions: [],
    ...overrides
  }),
  
  // Create mock Google Docs result
  createMockGoogleDocsResult: (overrides = {}) => ({
    templateId: 'mock-template',
    fileName: 'Mock Document',
    transcription: '<h1>Mock Document</h1><p>Mock content</p>',
    placeholders: [],
    sections: [],
    tables: [],
    confidence: 0.85,
    metadata: { processingTimeMs: 1000 },
    ...overrides
  }),
  
  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
  }
};

// Setup test database (in-memory)
beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
  
  // Reset Date.now mock
  Date.now = jest.fn(() => mockTimestamp);
});

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests
});

console.log('🧪 Jest setup completed for Instructions System (Google-focused)');
console.log('📋 Mocks configured: Supabase, OpenAI, Gemini, Next.js');
console.log('🎯 Focus: Google Docs and Sheets integration testing');