// __tests__/emergency-fixes/unified-system.test.ts
// CRITICAL: Tests for emergency hotfixes applied to stabilize Phase 4
import { 
  convertDOCXToUnified,
  convertGoogleDocsToUnified, 
  validateUnifiedTemplate,
  createFallbackTemplate,
  UnifiedTemplate
} from '../../lib/compatibility/unified-system';

describe('Emergency Hotfixes - Unified System', () => {
  
  describe('convertDOCXToUnified', () => {
    test('should convert DOCX response to unified format', () => {
      const docxResponse = {
        templateId: 'test-docx-123',
        fileName: 'test.docx',
        transcription: '<h1>Test Document</h1><p>Content here</p>',
        markdown: '# Test Document\nContent here',
        placeholders: [
          { text: 'NAME', confidence: 85, type: 'text', context: 'Person name' }
        ],
        sections: [
          { id: 'sec1', title: 'Introduction', type: 'heading1' }
        ],
        tables: [],
        storageUrl: 'storage/path/test.docx',
        confidence: 95,
        metadata: {
          processingTimeMs: 1500,
          extractionMethod: 'docx-system',
          elementsFound: { sections: 1, tables: 0, signatures: 0, paragraphs: 2 }
        }
      };

      const result = convertDOCXToUnified(docxResponse);

      expect(result.templateId).toBe('test-docx-123');
      expect(result.sourceType).toBe('docx');
      expect(result.transcription).toBe('<h1>Test Document</h1><p>Content here</p>');
      expect(result.markdown).toBe('# Test Document\nContent here');
      expect(result.placeholders).toHaveLength(1);
      expect(result.placeholders[0].text).toBe('NAME');
      expect(result.sections).toHaveLength(1);
      expect(result.sourceData).toHaveProperty('storageUrl', 'storage/path/test.docx');
    });

    test('should handle missing optional fields gracefully', () => {
      const minimalResponse = {
        templateId: 'minimal-123',
        fileName: 'minimal.docx'
      };

      const result = convertDOCXToUnified(minimalResponse);

      expect(result.templateId).toBe('minimal-123');
      expect(result.transcription).toBe('');
      expect(result.markdown).toBeTruthy(); // Should extract from HTML
      expect(Array.isArray(result.placeholders)).toBe(true);
      expect(Array.isArray(result.sections)).toBe(true);
      expect(Array.isArray(result.tables)).toBe(true);
    });
  });

  describe('convertGoogleDocsToUnified', () => {
    test('should convert Google Docs response to unified format', () => {
      const googleResponse = {
        data: {
          templateId: 'test-google-123',
          fileName: 'Google Doc Test',
          transcription: '<h1>Google Document</h1><p>Google content</p>',
          placeholders: [
            { text: 'EMAIL', confidence: 90, type: 'email', context: 'Contact email' }
          ],
          sections: [
            { id: 'gsec1', title: 'Overview', type: 'heading1' }
          ],
          tables: [],
          googleDocId: 'google-doc-id-123',
          confidence: 88
        }
      };

      const result = convertGoogleDocsToUnified(googleResponse);

      expect(result.templateId).toBe('test-google-123');
      expect(result.sourceType).toBe('google-docs');
      expect(result.transcription).toBe('<h1>Google Document</h1><p>Google content</p>');
      expect(result.markdown).toBeTruthy(); // Should be generated from HTML
      expect(result.placeholders).toHaveLength(1);
      expect(result.placeholders[0].text).toBe('EMAIL');
      expect(result.sourceData).toHaveProperty('googleDocId', 'google-doc-id-123');
    });

    test('should generate markdown when missing', () => {
      const responseWithoutMarkdown = {
        data: {
          templateId: 'no-markdown-123',
          fileName: 'Test',
          transcription: '<h1>Title</h1><p>Paragraph text</p>',
          placeholders: [],
          sections: [],
          tables: []
        }
      };

      const result = convertGoogleDocsToUnified(responseWithoutMarkdown);

      expect(result.markdown).toBeTruthy();
      expect(result.markdown).toContain('Title');
      expect(result.markdown).toContain('Paragraph text');
    });
  });

  describe('validateUnifiedTemplate', () => {
    test('should validate correct unified template', () => {
      const validTemplate: UnifiedTemplate = {
        templateId: 'valid-123',
        fileName: 'test.docx',
        sourceType: 'docx',
        transcription: '<h1>Test</h1>',
        markdown: '# Test',
        placeholders: [],
        sections: [],
        tables: [],
        sourceData: { storageUrl: 'path', fileSize: 1000, mimeType: 'docx' },
        metadata: {
          processingTimeMs: 1000,
          extractionMethod: 'test',
          confidence: 95,
          elementsFound: { sections: 0, tables: 0, signatures: 0, paragraphs: 1 }
        }
      };

      const result = validateUnifiedTemplate(validTemplate);
      expect(result).not.toBeNull();
      expect(result?.templateId).toBe('valid-123');
    });

    test('should reject template with missing critical fields', () => {
      const invalidTemplate = {
        templateId: 'invalid-123',
        fileName: 'test.docx',
        sourceType: 'docx',
        // Missing transcription, markdown, placeholders, sections, tables
      };

      const result = validateUnifiedTemplate(invalidTemplate);
      expect(result).toBeNull();
    });

    test('should fix invalid array fields', () => {
      const templateWithInvalidArrays = {
        templateId: 'fix-arrays-123',
        fileName: 'test.docx',
        sourceType: 'docx',
        transcription: '<h1>Test</h1>',
        markdown: '# Test',
        placeholders: null, // Should be array
        sections: undefined, // Should be array
        tables: 'not-array', // Should be array
        sourceData: {},
        metadata: {
          processingTimeMs: 1000,
          extractionMethod: 'test',
          confidence: 95,
          elementsFound: { sections: 0, tables: 0, signatures: 0, paragraphs: 1 }
        }
      };

      const result = validateUnifiedTemplate(templateWithInvalidArrays);
      expect(result).not.toBeNull();
      expect(Array.isArray(result?.placeholders)).toBe(true);
      expect(Array.isArray(result?.sections)).toBe(true);
      expect(Array.isArray(result?.tables)).toBe(true);
    });
  });

  describe('createFallbackTemplate', () => {
    test('should create valid fallback for DOCX', () => {
      const fallback = createFallbackTemplate('docx', 'emergency.docx');

      expect(fallback.sourceType).toBe('docx');
      expect(fallback.fileName).toBe('emergency.docx');
      expect(fallback.templateId).toBeTruthy();
      expect(fallback.transcription).toContain('emergency.docx');
      expect(fallback.markdown).toContain('emergency.docx');
      expect(Array.isArray(fallback.placeholders)).toBe(true);
      expect(fallback.sections).toHaveLength(1);
      expect(fallback.metadata.confidence).toBe(0);
    });

    test('should create valid fallback for Google Docs', () => {
      const fallback = createFallbackTemplate('google-docs', 'Emergency Google Doc');

      expect(fallback.sourceType).toBe('google-docs');
      expect(fallback.fileName).toBe('Emergency Google Doc');
      expect(fallback.sourceData).toHaveProperty('googleDocId', '');
      expect(fallback.transcription).toContain('Emergency Google Doc');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null/undefined inputs gracefully', () => {
      const nullResult = convertDOCXToUnified(null);
      expect(nullResult.templateId).toBeTruthy(); // Should generate fallback ID
      
      const undefinedResult = convertGoogleDocsToUnified(undefined);
      expect(undefinedResult.templateId).toBeTruthy();
    });

    test('should extract text from HTML when markdown is missing', () => {
      const htmlContent = '<h1>Title</h1><p>Some <strong>bold</strong> text</p><div>More content</div>';
      
      const docxResponse = {
        templateId: 'html-test-123',
        fileName: 'test.docx',
        transcription: htmlContent,
        // No markdown field
      };

      const result = convertDOCXToUnified(docxResponse);
      
      expect(result.markdown).toBeTruthy();
      expect(result.markdown).toContain('Title');
      expect(result.markdown).toContain('bold');
      expect(result.markdown).toContain('More content');
      expect(result.markdown.length).toBeLessThanOrEqual(1000); // Length limit
    });

    test('should handle malformed placeholder data', () => {
      const responseWithBadPlaceholders = {
        templateId: 'bad-placeholders-123',
        fileName: 'test.docx',
        placeholders: [
          null,
          { text: 'VALID_PLACEHOLDER', confidence: 85 },
          { /* missing text field */ confidence: 90 },
          'not-an-object'
        ]
      };

      const result = convertDOCXToUnified(responseWithBadPlaceholders);
      
      expect(Array.isArray(result.placeholders)).toBe(true);
      // Should handle malformed data gracefully
      const validPlaceholders = result.placeholders.filter(p => p && p.text);
      expect(validPlaceholders.length).toBeGreaterThan(0);
    });
  });
});

describe('UI Compatibility', () => {
  test('unified template should have all fields expected by UI', () => {
    const docxResponse = {
      templateId: 'ui-compat-test',
      fileName: 'compatibility-test.docx',
      transcription: '<h1>UI Compatibility Test</h1>',
      markdown: '# UI Compatibility Test',
      placeholders: [{ text: 'TEST_FIELD', confidence: 95, type: 'text' }],
      sections: [{ id: 's1', title: 'Section 1', type: 'heading1' }],
      tables: []
    };

    const unified = convertDOCXToUnified(docxResponse);
    const validated = validateUnifiedTemplate(unified);

    expect(validated).not.toBeNull();
    
    // Critical fields that UI depends on
    expect(validated!.templateId).toBeTruthy();
    expect(validated!.fileName).toBeTruthy();
    expect(validated!.transcription).toBeTruthy();
    expect(validated!.markdown).toBeTruthy(); // CRITICAL: UI crashes without this
    expect(Array.isArray(validated!.placeholders)).toBe(true);
    expect(Array.isArray(validated!.sections)).toBe(true);
    expect(Array.isArray(validated!.tables)).toBe(true);
    expect(validated!.sourceType).toBeTruthy();
  });
});