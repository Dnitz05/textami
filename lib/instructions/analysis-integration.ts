// Analysis Integration - Connects hierarchical instructions with existing AI analysis endpoints
// This provides seamless integration with Google Docs, Sheets, and other document analysis

import { log } from '@/lib/logger';
import { enhanceAIAnalysisWithInstructions } from './instruction-processor';
import { InstructionType } from './instruction-types';

export interface AnalysisIntegrationOptions {
  enableInstructions?: boolean;
  instructionTypes?: InstructionType[];
  templateId?: string;
  userId?: string;
  sourceType?: 'google-docs' | 'google-sheets' | 'file-upload' | 'manual';
  processingMode?: 'sequential' | 'parallel';
  stopOnError?: boolean;
}

/**
 * Enhanced Google Docs Analysis with Hierarchical Instructions
 * Integrates with /api/google/docs/analyze route
 */
export async function enhanceGoogleDocsAnalysis(
  originalResult: any,
  options: AnalysisIntegrationOptions = {}
): Promise<any> {
  try {
    log.debug('🚀 Enhancing Google Docs analysis with hierarchical instructions:', {
      templateId: options.templateId,
      sourceType: 'google-docs',
      hasInstructions: options.enableInstructions !== false
    });

    // Default configuration for Google Docs
    const defaultOptions: AnalysisIntegrationOptions = {
      enableInstructions: true,
      instructionTypes: ['global', 'section', 'paragraph'],
      processingMode: 'sequential',
      stopOnError: false,
      sourceType: 'google-docs',
      ...options
    };

    if (!defaultOptions.enableInstructions || !defaultOptions.userId || !defaultOptions.templateId) {
      log.debug('📋 Instructions disabled or missing required parameters - returning original analysis');
      return {
        ...originalResult,
        instructionProcessing: {
          enabled: false,
          reason: !defaultOptions.enableInstructions ? 'disabled' : 'missing-parameters'
        }
      };
    }

    // Apply instructions to the Google Docs content
    const enhancedResult = await enhanceAIAnalysisWithInstructions(
      originalResult,
      defaultOptions.templateId!,
      defaultOptions.userId!,
      defaultOptions.instructionTypes!
    );

    log.info('✅ Google Docs analysis enhanced with instructions:', {
      templateId: defaultOptions.templateId,
      originalPlaceholders: originalResult.placeholders?.length || 0,
      enhancedPlaceholders: enhancedResult.placeholders?.length || 0,
      instructionsApplied: enhancedResult.instructionProcessing?.successful || 0
    });

    return {
      ...enhancedResult,
      sourceType: 'google-docs-enhanced',
      enhancementMetadata: {
        originalAnalysis: {
          placeholders: originalResult.placeholders?.length || 0,
          sections: originalResult.sections?.length || 0,
          confidence: originalResult.confidence || 0
        },
        instructionEnhancement: {
          applied: enhancedResult.instructionProcessing?.successful || 0,
          executionTime: enhancedResult.instructionProcessing?.executionTime || 0,
          types: defaultOptions.instructionTypes
        }
      }
    };

  } catch (error) {
    log.error('❌ Failed to enhance Google Docs analysis with instructions:', error);
    
    return {
      ...originalResult,
      instructionProcessing: {
        enabled: true,
        successful: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown enhancement error'
      }
    };
  }
}

/**
 * Enhanced Google Sheets Analysis with Hierarchical Instructions
 * Integrates with /api/google/sheets/data route
 */
export async function enhanceGoogleSheetsAnalysis(
  originalResult: any,
  options: AnalysisIntegrationOptions = {}
): Promise<any> {
  try {
    log.debug('🚀 Enhancing Google Sheets analysis with hierarchical instructions:', {
      templateId: options.templateId,
      sourceType: 'google-sheets',
      hasInstructions: options.enableInstructions !== false
    });

    // Default configuration for Google Sheets (focused on table and cell instructions)
    const defaultOptions: AnalysisIntegrationOptions = {
      enableInstructions: true,
      instructionTypes: ['global', 'table', 'cell'],
      processingMode: 'sequential',
      stopOnError: false,
      sourceType: 'google-sheets',
      ...options
    };

    if (!defaultOptions.enableInstructions || !defaultOptions.userId || !defaultOptions.templateId) {
      return {
        ...originalResult,
        instructionProcessing: {
          enabled: false,
          reason: !defaultOptions.enableInstructions ? 'disabled' : 'missing-parameters'
        }
      };
    }

    // Convert sheets data to HTML format for instruction processing
    const htmlContent = convertSheetsDataToHTML(originalResult);
    
    // Create analysis structure for instruction processing
    const analysisForInstructions = {
      ...originalResult,
      transcription: htmlContent,
      html_content: htmlContent,
      sourceType: 'google-sheets'
    };

    // Apply instructions
    const enhancedResult = await enhanceAIAnalysisWithInstructions(
      analysisForInstructions,
      defaultOptions.templateId!,
      defaultOptions.userId!,
      defaultOptions.instructionTypes!
    );

    // Convert back to sheets format if needed
    const processedSheetsData = convertHTMLBackToSheetsFormat(
      enhancedResult.transcription,
      originalResult
    );

    log.info('✅ Google Sheets analysis enhanced with instructions:', {
      templateId: defaultOptions.templateId,
      originalRows: originalResult.data?.rowCount || 0,
      instructionsApplied: enhancedResult.instructionProcessing?.successful || 0
    });

    return {
      ...originalResult,
      ...processedSheetsData,
      instructionProcessing: enhancedResult.instructionProcessing,
      sourceType: 'google-sheets-enhanced',
      enhancementMetadata: {
        originalAnalysis: {
          rows: originalResult.data?.rowCount || 0,
          columns: originalResult.data?.columnCount || 0,
          headers: originalResult.data?.headers?.length || 0
        },
        instructionEnhancement: {
          applied: enhancedResult.instructionProcessing?.successful || 0,
          executionTime: enhancedResult.instructionProcessing?.executionTime || 0,
          types: defaultOptions.instructionTypes
        }
      }
    };

  } catch (error) {
    log.error('❌ Failed to enhance Google Sheets analysis with instructions:', error);
    
    return {
      ...originalResult,
      instructionProcessing: {
        enabled: true,
        successful: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown enhancement error'
      }
    };
  }
}

/**
 * Enhanced File Upload Analysis with Hierarchical Instructions
 * Can integrate with various file analysis endpoints
 */
export async function enhanceFileAnalysis(
  originalResult: any,
  fileType: string,
  options: AnalysisIntegrationOptions = {}
): Promise<any> {
  try {
    log.debug('🚀 Enhancing file analysis with hierarchical instructions:', {
      templateId: options.templateId,
      fileType,
      sourceType: options.sourceType || 'file-upload'
    });

    // Choose instruction types based on file type
    let defaultInstructionTypes: InstructionType[] = ['global', 'section', 'paragraph'];
    
    if (fileType.includes('spreadsheet') || fileType.includes('csv')) {
      defaultInstructionTypes = ['global', 'table', 'cell'];
    } else if (fileType.includes('doc') || fileType.includes('pdf')) {
      defaultInstructionTypes = ['global', 'section', 'paragraph'];
    }

    const defaultOptions: AnalysisIntegrationOptions = {
      enableInstructions: true,
      instructionTypes: defaultInstructionTypes,
      processingMode: 'sequential',
      stopOnError: false,
      sourceType: 'file-upload',
      ...options
    };

    if (!defaultOptions.enableInstructions || !defaultOptions.userId || !defaultOptions.templateId) {
      return {
        ...originalResult,
        instructionProcessing: {
          enabled: false,
          reason: !defaultOptions.enableInstructions ? 'disabled' : 'missing-parameters'
        }
      };
    }

    // Apply instructions
    const enhancedResult = await enhanceAIAnalysisWithInstructions(
      originalResult,
      defaultOptions.templateId!,
      defaultOptions.userId!,
      defaultOptions.instructionTypes!
    );

    log.info('✅ File analysis enhanced with instructions:', {
      templateId: defaultOptions.templateId,
      fileType,
      instructionsApplied: enhancedResult.instructionProcessing?.successful || 0
    });

    return {
      ...enhancedResult,
      sourceType: `${fileType}-enhanced`,
      enhancementMetadata: {
        originalAnalysis: {
          type: fileType,
          contentLength: originalResult.transcription?.length || 0
        },
        instructionEnhancement: {
          applied: enhancedResult.instructionProcessing?.successful || 0,
          executionTime: enhancedResult.instructionProcessing?.executionTime || 0,
          types: defaultOptions.instructionTypes
        }
      }
    };

  } catch (error) {
    log.error('❌ Failed to enhance file analysis with instructions:', error);
    
    return {
      ...originalResult,
      instructionProcessing: {
        enabled: true,
        successful: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown enhancement error'
      }
    };
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Convert Google Sheets data structure to HTML for instruction processing
 */
function convertSheetsDataToHTML(sheetsResult: any): string {
  try {
    if (!sheetsResult.data?.data || !sheetsResult.data?.headers) {
      return '<div>No sheet data available</div>';
    }

    const { headers, data } = sheetsResult.data;
    
    let html = '<div class="spreadsheet-content">\n';
    html += '<table class="google-sheet">\n';
    
    // Add headers
    html += '<thead>\n<tr>\n';
    headers.forEach((header: string) => {
      html += `<th>${header}</th>\n`;
    });
    html += '</tr>\n</thead>\n';
    
    // Add data rows
    html += '<tbody>\n';
    data.forEach((row: any, rowIndex: number) => {
      html += '<tr>\n';
      headers.forEach((header: string) => {
        const cellValue = row[header] || '';
        html += `<td data-row="${rowIndex}" data-column="${header}">${cellValue}</td>\n`;
      });
      html += '</tr>\n';
    });
    html += '</tbody>\n';
    
    html += '</table>\n</div>';
    
    return html;

  } catch (error) {
    log.error('Error converting sheets data to HTML:', error);
    return '<div>Error converting sheet data</div>';
  }
}

/**
 * Convert processed HTML back to Google Sheets format
 */
function convertHTMLBackToSheetsFormat(html: string, originalResult: any): any {
  try {
    // For now, return the original result structure
    // In a more advanced implementation, we would parse the HTML table
    // and reconstruct the sheets data structure
    
    const processedResult = {
      ...originalResult,
      processedHTML: html,
      // TODO: Parse HTML table back to data structure
      processedAt: new Date().toISOString()
    };

    return processedResult;

  } catch (error) {
    log.error('Error converting HTML back to sheets format:', error);
    return originalResult;
  }
}

/**
 * Utility function to get appropriate instruction types for content type
 */
export function getDefaultInstructionTypesForContent(
  contentType: string,
  sourceType?: string
): InstructionType[] {
  const lowerContentType = contentType.toLowerCase();
  const lowerSourceType = sourceType?.toLowerCase();

  // Google Docs - focus on document structure
  if (lowerSourceType === 'google-docs' || lowerContentType.includes('document')) {
    return ['global', 'section', 'paragraph'];
  }

  // Google Sheets - focus on tabular data
  if (lowerSourceType === 'google-sheets' || lowerContentType.includes('spreadsheet') || lowerContentType.includes('csv')) {
    return ['global', 'table', 'cell'];
  }

  // PDFs - similar to documents but may have complex layouts
  if (lowerContentType.includes('pdf')) {
    return ['global', 'section', 'paragraph', 'table'];
  }

  // HTML/Web content - full hierarchy
  if (lowerContentType.includes('html') || lowerContentType.includes('web')) {
    return ['global', 'section', 'paragraph', 'table', 'cell'];
  }

  // Default for unknown types
  return ['global', 'paragraph'];
}

/**
 * Check if instructions are available for a template
 */
export async function hasInstructionsForTemplate(
  templateId: string,
  userId: string,
  types?: InstructionType[]
): Promise<{
  hasInstructions: boolean;
  availableTypes: InstructionType[];
  totalInstructions: number;
  activeInstructions: number;
}> {
  try {
    const { instructionService } = await import('./instruction-service');
    
    const instructions = await instructionService.getInstructions(templateId, userId);
    const activeInstructions = instructions.filter(i => i.isActive);
    
    const availableTypes = [...new Set(instructions.map(i => i.type))];
    const requestedTypes = types || availableTypes;
    const matchingTypes = availableTypes.filter(type => requestedTypes.includes(type));

    return {
      hasInstructions: activeInstructions.length > 0,
      availableTypes: matchingTypes,
      totalInstructions: instructions.length,
      activeInstructions: activeInstructions.length
    };

  } catch (error) {
    log.error('Error checking instructions for template:', error);
    
    return {
      hasInstructions: false,
      availableTypes: [],
      totalInstructions: 0,
      activeInstructions: 0
    };
  }
}