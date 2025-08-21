// __tests__/premium-modules/PremiumSystem.test.ts
// TEXTAMI PREMIUM MODULES - Basic functionality tests

import {
  premiumContentAnalyzer,
  intelligentModuleSelector,
  premiumMappingEngine,
  type ExcelColumnAnalysis,
  type PremiumModuleType
} from '@/lib/premium-modules'

describe('Premium Modules System - Phase 1', () => {
  
  describe('PremiumContentAnalyzer', () => {
    
    test('should detect images in Excel column', () => {
      const mockColumn = {
        column: 'A',
        header: 'Images',
        sample_data: ['logo.png', 'photo.jpg', 'diagram.svg'],
        data_type: 'string' as const
      }
      
      const analysis = premiumContentAnalyzer.analyzeExcelColumn(mockColumn)
      
      expect(analysis.hasImages).toBe(true)
      expect(analysis.suggestedModule).toBe('image')
      expect(analysis.confidenceScore).toBeGreaterThan(0.8)
    })
    
    test('should detect HTML content in Excel column', () => {
      const mockColumn = {
        column: 'B',
        header: 'Rich Content',
        sample_data: ['<b>Bold text</b>', '<p>Paragraph</p>', '<ul><li>List item</li></ul>'],
        data_type: 'string' as const
      }
      
      const analysis = premiumContentAnalyzer.analyzeExcelColumn(mockColumn)
      
      expect(analysis.hasHTML).toBe(true)
      expect(analysis.suggestedModule).toBe('html')
      expect(analysis.confidenceScore).toBeGreaterThan(0.8)
    })
    
    test('should detect rich formatting needs', () => {
      const mockColumn = {
        column: 'C',
        header: 'Formatted Text',
        sample_data: ['**Bold text**', 'Text with\n\nline breaks', '- List item'],
        data_type: 'string' as const
      }
      
      const analysis = premiumContentAnalyzer.analyzeExcelColumn(mockColumn)
      
      expect(analysis.hasRichFormatting).toBe(true)
      expect(analysis.suggestedModule).toBe('style')
    })
    
    test('should suggest text module for simple content', () => {
      const mockColumn = {
        column: 'D',
        header: 'Simple Text',
        sample_data: ['Simple text', 'Another simple text', 'Basic content'],
        data_type: 'string' as const
      }
      
      const analysis = premiumContentAnalyzer.analyzeExcelColumn(mockColumn)
      
      expect(analysis.suggestedModule).toBe('text')
      expect(analysis.confidenceScore).toBeGreaterThan(0.9)
    })
    
  })

  describe('IntelligentModuleSelector', () => {
    
    test('should prioritize functional necessity', () => {
      const mockExcelAnalysis: ExcelColumnAnalysis = {
        column: 'A',
        header: 'Images',
        sample_data: ['image1.png'],
        data_type: 'string',
        hasImages: true,
        hasHTML: false,
        hasRichFormatting: false,
        complexityLevel: 'simple',
        suggestedModule: 'image',
        confidenceScore: 0.95,
        estimatedTimesSaved: 3,
        qualityImprovement: 9
      }
      
      const result = intelligentModuleSelector.selectOptimalModule(mockExcelAnalysis)
      
      expect(result.primary).toBe('image')
      expect(result.confidenceLevel).toBe('high')
      expect(result.valueScore).toBe(10) // Maximum for required functionality
    })
    
    test('should generate correct Premium Module syntax', () => {
      const testCases: Array<{module: PremiumModuleType, expected: string}> = [
        { module: 'html', expected: '{~~testColumn}' },
        { module: 'image', expected: '{%testColumn}' },
        { module: 'style', expected: '{testColumn:style="font-weight:bold;color:#2563eb"}' },
        { module: 'text', expected: '{testColumn}' }
      ]
      
      testCases.forEach(({ module, expected }) => {
        const syntax = intelligentModuleSelector.generatePremiumSyntax({
          column: 'testColumn',
          moduleType: module
        })
        
        if (module === 'style') {
          // For style, just check it contains the column and style attribute
          expect(syntax).toContain('testColumn:style=')
        } else {
          expect(syntax).toBe(expected)
        }
      })
    })
    
  })

  describe('PremiumMappingEngine', () => {
    
    test('should create intelligent mapping with quality scoring', () => {
      const mockExcelColumn: ExcelColumnAnalysis = {
        column: 'A',
        header: 'Test Column',
        sample_data: ['<b>Rich content</b>'],
        data_type: 'string',
        hasImages: false,
        hasHTML: true,
        hasRichFormatting: true,
        complexityLevel: 'moderate',
        suggestedModule: 'html',
        confidenceScore: 0.85,
        estimatedTimesSaved: 5,
        qualityImprovement: 8
      }
      
      const mockWordSelection = {
        start: 0,
        end: 20,
        text: 'Selected text content',
        paragraphId: 'p1'
      }
      
      const mapping = premiumMappingEngine.createIntelligentMapping(
        mockExcelColumn,
        mockWordSelection
      )
      
      expect(mapping.selected_premium_module).toBe('html')
      expect(mapping.generated_syntax).toBe('{~~A}')
      expect(mapping.quality_score).toBeGreaterThan(7)
      expect(mapping.status).toBe('draft')
      expect(mapping.performance_benefit).toBeGreaterThan(0)
    })
    
    test('should validate mapping compatibility', () => {
      const mockMapping = {
        id: 'test-mapping',
        excel_column: {
          column: 'A',
          header: 'Images',
          hasImages: true,
          suggestedModule: 'image' as PremiumModuleType
        } as ExcelColumnAnalysis,
        word_selection: {
          start: 0,
          end: 10,
          text: '[image]',
          paragraphId: 'p1',
          analysis: {
            text: '[image]',
            start: 0,
            end: 10,
            paragraphId: 'p1',
            existingStyles: [],
            hasComplexFormatting: false,
            containsLists: false,
            containsTables: false,
            isImagePlaceholder: true,
            styleEnhancementOpportunity: 0.1,
            htmlConversionBenefit: 0.1,
            imageReplacementPotential: 1.0
          }
        } as any,
        selected_premium_module: 'image' as PremiumModuleType,
        quality_score: 9
      } as any
      
      const validation = premiumMappingEngine.validateMapping(mockMapping)
      
      expect(validation.valid).toBe(true)
      expect(validation.qualityScore).toBe(9)
    })
    
  })

  describe('Premium Module Integration', () => {
    
    test('should prioritize modules by functional need over cost', () => {
      // Image content should always get Image Module regardless of cost
      const imageColumn: ExcelColumnAnalysis = {
        column: 'A',
        header: 'Logo',
        sample_data: ['logo.png'],
        data_type: 'string',
        hasImages: true,
        hasHTML: false,
        hasRichFormatting: false,
        complexityLevel: 'simple',
        suggestedModule: 'image',
        confidenceScore: 0.95,
        estimatedTimesSaved: 3,
        qualityImprovement: 9
      }
      
      const result = intelligentModuleSelector.selectOptimalModule(imageColumn)
      expect(result.primary).toBe('image')
      expect(result.reasoning).toContain('required')
    })
    
    test('should calculate time savings and quality improvements', () => {
      const complexColumn: ExcelColumnAnalysis = {
        column: 'B',
        header: 'Complex Content',
        sample_data: ['<table><tr><td>Cell</td></tr></table>'],
        data_type: 'string',
        hasImages: false,
        hasHTML: true,
        hasRichFormatting: true,
        complexityLevel: 'advanced',
        suggestedModule: 'html',
        confidenceScore: 0.9,
        estimatedTimesSaved: 12, // Advanced complexity = more time saved
        qualityImprovement: 8
      }
      
      const wordSelection = {
        start: 0,
        end: 30,
        text: 'Complex table content here',
        paragraphId: 'p1'
      }
      
      const mapping = premiumMappingEngine.createIntelligentMapping(complexColumn, wordSelection)
      
      expect(mapping.performance_benefit).toBeGreaterThan(10) // Should save significant time
      expect(mapping.quality_score).toBeGreaterThan(7) // Should have high quality score
    })
    
  })

  describe('Error Handling', () => {
    
    test('should handle invalid Excel column data gracefully', () => {
      const invalidColumn = {
        column: '',
        header: '',
        sample_data: [],
        data_type: 'string' as const
      }
      
      const analysis = premiumContentAnalyzer.analyzeExcelColumn(invalidColumn)
      
      expect(analysis.suggestedModule).toBe('text') // Should fallback to text
      expect(analysis.confidenceScore).toBeGreaterThan(0) // Should have some confidence
    })
    
    test('should handle empty word selection', () => {
      const mockExcelColumn: ExcelColumnAnalysis = {
        column: 'A',
        header: 'Test',
        sample_data: ['test'],
        data_type: 'string',
        hasImages: false,
        hasHTML: false,
        hasRichFormatting: false,
        complexityLevel: 'simple',
        suggestedModule: 'text',
        confidenceScore: 0.9,
        estimatedTimesSaved: 0,
        qualityImprovement: 5
      }
      
      const emptySelection = {
        start: 0,
        end: 0,
        text: '',
        paragraphId: 'p1'
      }
      
      const mapping = premiumMappingEngine.createIntelligentMapping(mockExcelColumn, emptySelection)
      const validation = premiumMappingEngine.validateMapping(mapping)
      
      expect(validation.issues).toContain('Word selection is very short - may not benefit from Premium Module')
    })
    
  })

})

// Helper function for testing
export const createMockExcelColumn = (overrides: Partial<ExcelColumnAnalysis> = {}): ExcelColumnAnalysis => {
  return {
    column: 'A',
    header: 'Test Column',
    sample_data: ['test data'],
    data_type: 'string',
    hasImages: false,
    hasHTML: false,
    hasRichFormatting: false,
    complexityLevel: 'simple',
    suggestedModule: 'text',
    confidenceScore: 0.9,
    estimatedTimesSaved: 0,
    qualityImprovement: 5,
    ...overrides
  }
}