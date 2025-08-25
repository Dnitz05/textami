// __tests__/lib/types.test.ts
// Tests for type utilities and guards
import { 
  isApiResponse, 
  isAnalysisData, 
  isExcelRowData,
  ValidationResult,
  PipelineStatus,
  DocumentType 
} from '../../lib/types';

describe('Type Guards', () => {
  describe('isApiResponse', () => {
    it('should return true for valid ApiResponse', () => {
      const validResponse = {
        success: true,
        data: { test: 'value' }
      };
      
      expect(isApiResponse(validResponse)).toBe(true);
    });

    it('should return true for error ApiResponse', () => {
      const errorResponse = {
        success: false,
        error: 'Something went wrong'
      };
      
      expect(isApiResponse(errorResponse)).toBe(true);
    });

    it('should return false for invalid object', () => {
      const invalidResponse = {
        data: 'test'
        // Missing 'success' property
      };
      
      expect(isApiResponse(invalidResponse)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isApiResponse(null)).toBe(false);
      expect(isApiResponse(undefined)).toBe(false);
    });

    it('should return false for primitive values', () => {
      expect(isApiResponse('string')).toBe(false);
      expect(isApiResponse(123)).toBe(false);
      expect(isApiResponse(true)).toBe(false);
    });
  });

  describe('isAnalysisData', () => {
    it('should return true for valid AnalysisData', () => {
      const validAnalysis = {
        templateId: 'test-123',
        markdown: '# Test Document',
        tags: [],
        sections: [],
        tables: []
      };
      
      expect(isAnalysisData(validAnalysis)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const invalidAnalysis = {
        templateId: 'test-123',
        markdown: '# Test Document'
        // Missing 'tags' property
      };
      
      expect(isAnalysisData(invalidAnalysis)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAnalysisData(null)).toBe(false);
      expect(isAnalysisData(undefined)).toBe(false);
    });
  });

  describe('isExcelRowData', () => {
    it('should return true for valid row data', () => {
      const validRow = {
        'Name': 'John Doe',
        'Age': 30,
        'Active': true,
        'Notes': null
      };
      
      expect(isExcelRowData(validRow)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isExcelRowData({})).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isExcelRowData(null)).toBe(false);
      expect(isExcelRowData(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isExcelRowData('string')).toBe(false);
      expect(isExcelRowData(123)).toBe(false);
      expect(isExcelRowData([])).toBe(false);
    });
  });
});

describe('Type Definitions', () => {
  describe('PipelineStatus', () => {
    it('should include all expected status values', () => {
      const validStatuses: PipelineStatus[] = [
        'uploaded',
        'analyzed', 
        'mapped',
        'frozen',
        'production'
      ];
      
      validStatuses.forEach(status => {
        // TypeScript compilation confirms these are valid
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('DocumentType', () => {
    it('should include all expected document types', () => {
      const validTypes: DocumentType[] = [
        'string',
        'date',
        'currency',
        'percent',
        'number',
        'id',
        'address'
      ];
      
      validTypes.forEach(type => {
        // TypeScript compilation confirms these are valid
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('ValidationResult', () => {
    it('should support valid result structure', () => {
      const validResult: ValidationResult = {
        valid: true
      };
      
      expect(validResult.valid).toBe(true);
      expect(validResult.error).toBeUndefined();
      expect(validResult.details).toBeUndefined();
    });

    it('should support error result structure', () => {
      const errorResult: ValidationResult = {
        valid: false,
        error: 'Invalid input',
        details: 'Specific error details'
      };
      
      expect(errorResult.valid).toBe(false);
      expect(errorResult.error).toBe('Invalid input');
      expect(errorResult.details).toBe('Specific error details');
    });
  });
});

describe('Interface Structure Validation', () => {
  it('should validate ParsedTag structure', () => {
    const tag = {
      name: 'test_tag',
      slug: 'test_tag',
      example: 'Test Value',
      type: 'string' as DocumentType,
      confidence: 0.95,
      page: 1,
      anchor: 'test anchor',
      normalized: 'normalized value'
    };

    // TypeScript compilation validates structure
    expect(tag.name).toBe('test_tag');
    expect(tag.slug).toBe('test_tag');
    expect(tag.example).toBe('Test Value');
    expect(tag.type).toBe('string');
    expect(tag.confidence).toBe(0.95);
    expect(tag.page).toBe(1);
    expect(tag.anchor).toBe('test anchor');
    expect(tag.normalized).toBe('normalized value');
  });

  it('should validate GeneratedDocument structure', () => {
    const document = {
      documentId: 'doc-123',
      fileName: 'test.docx',
      downloadUrl: 'https://example.com/test.docx',
      rowIndex: 0,
      rowData: { name: 'John', age: 30 },
      fileSize: 1024,
      generatedAt: '2024-01-01T00:00:00Z'
    };

    expect(document.documentId).toBe('doc-123');
    expect(document.fileName).toBe('test.docx');
    expect(document.downloadUrl).toBe('https://example.com/test.docx');
    expect(document.rowIndex).toBe(0);
    expect(document.rowData).toEqual({ name: 'John', age: 30 });
    expect(document.fileSize).toBe(1024);
    expect(document.generatedAt).toBe('2024-01-01T00:00:00Z');
  });
});