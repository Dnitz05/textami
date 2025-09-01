// Google Integration Tests
// Focused testing for Google Docs and Sheets integration with Instructions

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  enhanceGoogleDocsAnalysis, 
  enhanceGoogleSheetsAnalysis,
  hasInstructionsForTemplate 
} from '../analysis-integration';
import { 
  GoogleDocsIntegration,
  GoogleSheetsIntegration,
  applyInstructionsToAnalysis 
} from '../integration-hooks';
import { instructionProcessor } from '../instruction-processor';
import { createMockInstruction, createMockExecutionContext } from './instruction-service.test';

// Mock external dependencies
jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

jest.mock('../instruction-service', () => ({
  instructionService: {
    getInstructions: jest.fn(),
    executeInstruction: jest.fn()
  }
}));

describe('Google Docs Integration', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enhanceGoogleDocsAnalysis', () => {
    test('should enhance Google Docs analysis with instructions successfully', async () => {
      const mockOriginalResult = {
        templateId: 'test-template',
        transcription: '<h1>Test Document</h1><p>Content here</p>',
        placeholders: [
          { text: '[NAME]', variable: 'name', confidence: 0.9, context: 'greeting', type: 'text' }
        ],
        sections: [
          { id: 'section-1', title: 'Introduction', markdown: '# Introduction', type: 'heading1' }
        ],
        confidence: 0.85,
        metadata: { processingTimeMs: 1500 }
      };

      const options = {
        enableInstructions: true,
        instructionTypes: ['global', 'section'] as any,
        templateId: 'test-template',
        userId: 'test-user'
      };

      // Mock successful instruction processing
      jest.doMock('../instruction-processor', () => ({
        enhanceAIAnalysisWithInstructions: jest.fn().mockResolvedValue({
          ...mockOriginalResult,
          transcription: '<h1><strong>Test Document</strong></h1><p><em>Content here</em></p>',
          instructionProcessing: {
            successful: 2,
            executionTime: 3000,
            processingLog: []
          }
        })
      }));

      const result = await enhanceGoogleDocsAnalysis(mockOriginalResult, options);

      expect(result).toBeDefined();
      expect(result.sourceType).toBe('google-docs-enhanced');
      expect(result.enhancementMetadata).toBeDefined();
      expect(result.instructionProcessing).toBeDefined();
    });

    test('should handle missing template ID gracefully', async () => {
      const mockResult = {
        transcription: '<p>Test content</p>',
        placeholders: [],
        sections: []
      };

      const result = await enhanceGoogleDocsAnalysis(mockResult, {
        enableInstructions: true,
        userId: 'test-user'
        // Missing templateId
      });

      expect(result).toBeDefined();
      expect(result.instructionProcessing.enabled).toBe(false);
      expect(result.instructionProcessing.reason).toBe('missing-parameters');
    });

    test('should handle instruction processing errors', async () => {
      const mockResult = {
        templateId: 'test-template',
        transcription: '<p>Test content</p>',
        placeholders: []
      };

      // Mock instruction processing failure
      jest.doMock('../instruction-processor', () => ({
        enhanceAIAnalysisWithInstructions: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      }));

      const result = await enhanceGoogleDocsAnalysis(mockResult, {
        enableInstructions: true,
        templateId: 'test-template',
        userId: 'test-user'
      });

      expect(result).toBeDefined();
      expect(result.instructionProcessing.successful).toBe(0);
      expect(result.instructionProcessing.failed).toBe(1);
      expect(result.instructionProcessing.error).toContain('AI service unavailable');
    });
  });

  describe('enhanceGoogleSheetsAnalysis', () => {
    test('should enhance Google Sheets analysis with table instructions', async () => {
      const mockSheetsResult = {
        data: {
          headers: ['Name', 'Email', 'Phone'],
          data: [
            { Name: 'John Doe', Email: 'john@example.com', Phone: '123-456-7890' },
            { Name: 'Jane Smith', Email: 'jane@example.com', Phone: '098-765-4321' }
          ],
          rowCount: 2,
          columnCount: 3
        },
        spreadsheetInfo: {
          spreadsheetId: 'test-sheet-id',
          title: 'Test Spreadsheet'
        }
      };

      const result = await enhanceGoogleSheetsAnalysis(mockSheetsResult, {
        enableInstructions: true,
        templateId: 'test-template',
        userId: 'test-user',
        instructionTypes: ['global', 'table', 'cell']
      });

      expect(result).toBeDefined();
      expect(result.sourceType).toBe('google-sheets-enhanced');
      expect(result.enhancementMetadata).toBeDefined();
    });

    test('should convert sheets data to HTML for processing', async () => {
      const mockSheetsResult = {
        data: {
          headers: ['Col1', 'Col2'],
          data: [{ Col1: 'Value1', Col2: 'Value2' }],
          rowCount: 1,
          columnCount: 2
        }
      };

      const result = await enhanceGoogleSheetsAnalysis(mockSheetsResult, {
        enableInstructions: true,
        templateId: 'test-template', 
        userId: 'test-user'
      });

      expect(result).toBeDefined();
      expect(result.processedHTML).toBeDefined();
    });
  });
});

describe('Integration Hooks', () => {

  describe('applyInstructionsToAnalysis', () => {
    test('should apply instructions to Google Docs analysis', async () => {
      const mockAnalysisResult = {
        templateId: 'test-template',
        transcription: '<p>Test content</p>',
        sourceType: 'google-docs'
      };

      const context = {
        userId: 'test-user',
        templateId: 'test-template',
        sourceType: 'google-docs' as const,
        enableInstructions: true
      };

      // Mock instruction availability check
      jest.doMock('../analysis-integration', () => ({
        hasInstructionsForTemplate: jest.fn().mockResolvedValue({
          hasInstructions: true,
          activeInstructions: 2,
          availableTypes: ['global', 'section']
        }),
        enhanceGoogleDocsAnalysis: jest.fn().mockResolvedValue({
          ...mockAnalysisResult,
          transcription: '<p><strong>Test content</strong></p>',
          instructionProcessing: { successful: 1 }
        })
      }));

      const result = await applyInstructionsToAnalysis(mockAnalysisResult, context);

      expect(result).toBeDefined();
      expect(result.integrationMetadata.hookApplied).toBe(true);
      expect(result.integrationMetadata.context.sourceType).toBe('google-docs');
    });

    test('should skip instructions when disabled', async () => {
      const mockResult = { transcription: '<p>Test</p>' };
      const context = {
        userId: 'test-user',
        sourceType: 'google-docs' as const,
        enableInstructions: false
      };

      const result = await applyInstructionsToAnalysis(mockResult, context);

      expect(result.instructionProcessing.enabled).toBe(false);
      expect(result.instructionProcessing.reason).toBe('disabled-by-context');
    });

    test('should handle missing template ID', async () => {
      const mockResult = { transcription: '<p>Test</p>' };
      const context = {
        userId: 'test-user',
        sourceType: 'google-docs' as const,
        enableInstructions: true
        // Missing templateId
      };

      const result = await applyInstructionsToAnalysis(mockResult, context);

      expect(result.instructionProcessing.enabled).toBe(false);
      expect(result.instructionProcessing.reason).toBe('no-template-id');
    });
  });

  describe('GoogleDocsIntegration', () => {
    test('should prepare context correctly', async () => {
      const mockRequest = new Request('http://localhost/api/test?enableInstructions=true&instructionTypes=global,section');
      const mockUser = { id: 'test-user' };
      const templateId = 'test-template';

      const context = await GoogleDocsIntegration.prepare(mockRequest, mockUser, templateId);

      expect(context.userId).toBe('test-user');
      expect(context.templateId).toBe('test-template');
      expect(context.sourceType).toBe('google-docs');
      expect(context.enableInstructions).toBe(true);
    });

    test('should wrap response with metadata', () => {
      const mockData = { 
        transcription: '<p>Test</p>',
        instructionProcessing: { successful: 1, executionTime: 1000 }
      };
      const context = {
        userId: 'test-user',
        templateId: 'test-template',
        sourceType: 'google-docs' as const,
        enableInstructions: true
      };

      const wrapped = GoogleDocsIntegration.wrap(mockData, context);

      expect(wrapped.success).toBe(true);
      expect(wrapped.data).toBe(mockData);
      expect(wrapped.instructionContext).toBeDefined();
      expect(wrapped.instructionContext.enabled).toBe(true);
      expect(wrapped.enhancedWithInstructions).toBe(true);
    });
  });

  describe('GoogleSheetsIntegration', () => {
    test('should prepare context for sheets', async () => {
      const mockRequest = new Request('http://localhost/api/sheets');
      const mockUser = { id: 'test-user' };
      const templateId = 'test-template';

      const context = await GoogleSheetsIntegration.prepare(mockRequest, mockUser, templateId);

      expect(context.sourceType).toBe('google-sheets');
      expect(context.userId).toBe('test-user');
    });
  });
});

describe('Error Handling', () => {
  
  test('should handle Google API authentication errors', async () => {
    const mockResult = {
      templateId: 'test-template',
      transcription: '<p>Test</p>'
    };

    // Mock Google API authentication failure
    jest.doMock('../instruction-processor', () => ({
      enhanceAIAnalysisWithInstructions: jest.fn().mockRejectedValue(
        new Error('Google API Error: 401 Unauthorized')
      )
    }));

    const result = await enhanceGoogleDocsAnalysis(mockResult, {
      enableInstructions: true,
      templateId: 'test-template',
      userId: 'test-user'
    });

    expect(result.instructionProcessing.error).toContain('Google API Error');
  });

  test('should handle network timeouts gracefully', async () => {
    const mockResult = {
      templateId: 'test-template',
      transcription: '<p>Test</p>'
    };

    jest.doMock('../instruction-processor', () => ({
      enhanceAIAnalysisWithInstructions: jest.fn().mockRejectedValue(
        new Error('Network timeout after 30s')
      )
    }));

    const result = await enhanceGoogleDocsAnalysis(mockResult, {
      enableInstructions: true,
      templateId: 'test-template',
      userId: 'test-user'
    });

    expect(result).toBeDefined();
    expect(result.instructionProcessing.failed).toBe(1);
    expect(result.instructionProcessing.error).toContain('timeout');
  });

  test('should handle malformed Google Docs content', async () => {
    const mockResult = {
      templateId: 'test-template',
      transcription: '<invalid><html>Content</invalid>',
      placeholders: []
    };

    // Should not crash, should return graceful error
    const result = await enhanceGoogleDocsAnalysis(mockResult, {
      enableInstructions: true,
      templateId: 'test-template',
      userId: 'test-user'
    });

    expect(result).toBeDefined();
    // Should return original content if processing fails
    expect(result.transcription).toBeDefined();
  });
});

describe('Performance Tests', () => {
  
  test('should process large Google Docs within acceptable time', async () => {
    // Generate large document content
    const largeContent = '<div>' + '<p>Test paragraph.</p>'.repeat(1000) + '</div>';
    
    const mockResult = {
      templateId: 'test-template',
      transcription: largeContent,
      placeholders: []
    };

    const startTime = Date.now();
    
    const result = await enhanceGoogleDocsAnalysis(mockResult, {
      enableInstructions: true,
      templateId: 'test-template',
      userId: 'test-user',
      instructionTypes: ['global'] // Only global to speed up test
    });

    const processingTime = Date.now() - startTime;
    
    expect(result).toBeDefined();
    expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should handle Google Sheets with many rows efficiently', async () => {
    // Generate large sheets data
    const headers = ['Col1', 'Col2', 'Col3'];
    const data = Array.from({ length: 500 }, (_, i) => ({
      Col1: `Value1-${i}`,
      Col2: `Value2-${i}`,
      Col3: `Value3-${i}`
    }));

    const mockSheetsResult = {
      data: { headers, data, rowCount: 500, columnCount: 3 }
    };

    const startTime = Date.now();
    
    const result = await enhanceGoogleSheetsAnalysis(mockSheetsResult, {
      enableInstructions: true,
      templateId: 'test-template',
      userId: 'test-user',
      instructionTypes: ['global', 'table'] // Skip cell-level for performance
    });

    const processingTime = Date.now() - startTime;
    
    expect(result).toBeDefined();
    expect(processingTime).toBeLessThan(15000); // Should complete within 15 seconds
  });
});

// Integration test helpers
export function createMockGoogleDocsResult(overrides = {}) {
  return {
    templateId: 'mock-template',
    fileName: 'Mock Google Doc',
    transcription: '<h1>Mock Document</h1><p>Mock content here.</p>',
    markdown: '# Mock Document\n\nMock content here.',
    sections: [
      { id: 'section-1', title: 'Mock Document', markdown: '# Mock Document', type: 'heading1' }
    ],
    tables: [],
    placeholders: [
      { text: '[MOCK]', variable: 'mock_var', confidence: 0.9, context: 'test', type: 'text' }
    ],
    confidence: 0.85,
    metadata: { processingTimeMs: 1000, elementsFound: 2 },
    ...overrides
  };
}

export function createMockGoogleSheetsResult(overrides = {}) {
  return {
    data: {
      headers: ['Name', 'Value'],
      data: [
        { Name: 'Test1', Value: 'Value1' },
        { Name: 'Test2', Value: 'Value2' }
      ],
      rowCount: 2,
      columnCount: 2
    },
    spreadsheetInfo: {
      spreadsheetId: 'mock-sheet-id',
      title: 'Mock Spreadsheet',
      sheets: [
        { sheetId: 0, title: 'Sheet1', rowCount: 2, columnCount: 2 }
      ]
    },
    ...overrides
  };
}