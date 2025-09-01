// Integration Hooks - Easy-to-use functions for integrating instructions with existing endpoints
// Add these hooks to existing API routes to enable hierarchical instruction processing

import { log } from '@/lib/logger';
import { 
  enhanceGoogleDocsAnalysis, 
  enhanceGoogleSheetsAnalysis, 
  enhanceFileAnalysis,
  hasInstructionsForTemplate,
  getDefaultInstructionTypesForContent 
} from './analysis-integration';
import { InstructionType } from './instruction-types';

export interface IntegrationContext {
  userId: string;
  templateId?: string;
  sourceType: 'google-docs' | 'google-sheets' | 'file-upload' | 'manual';
  enableInstructions?: boolean;
  instructionTypes?: InstructionType[];
}

/**
 * HOOK: Apply to Google Docs analysis endpoint
 * 
 * Usage in /api/google/docs/analyze/route.ts:
 * ```typescript
 * // After successful analysis, before returning response
 * const enhancedResponse = await applyInstructionsToAnalysis(
 *   analysisResult,
 *   { userId: user.id, templateId, sourceType: 'google-docs' }
 * );
 * return NextResponse.json({ success: true, data: enhancedResponse });
 * ```
 */
export async function applyInstructionsToAnalysis(
  analysisResult: any,
  context: IntegrationContext
): Promise<any> {
  const startTime = Date.now();
  
  try {
    log.debug('🔧 Applying instruction integration hook:', {
      userId: context.userId,
      templateId: context.templateId,
      sourceType: context.sourceType,
      enableInstructions: context.enableInstructions !== false
    });

    // Check if instructions are disabled
    if (context.enableInstructions === false) {
      log.debug('📋 Instructions disabled by context - skipping enhancement');
      return {
        ...analysisResult,
        instructionProcessing: { enabled: false, reason: 'disabled-by-context' }
      };
    }

    // Use templateId from analysis result if not provided in context
    const effectiveTemplateId = context.templateId || analysisResult.templateId;
    
    if (!effectiveTemplateId) {
      log.debug('📋 No template ID available - skipping instruction enhancement');
      return {
        ...analysisResult,
        instructionProcessing: { enabled: false, reason: 'no-template-id' }
      };
    }

    // Check if instructions exist for this template
    const instructionCheck = await hasInstructionsForTemplate(
      effectiveTemplateId,
      context.userId,
      context.instructionTypes
    );

    if (!instructionCheck.hasInstructions) {
      log.debug('📋 No active instructions found for template - skipping enhancement');
      return {
        ...analysisResult,
        instructionProcessing: { 
          enabled: false, 
          reason: 'no-instructions',
          availableInstructions: instructionCheck.totalInstructions 
        }
      };
    }

    // Determine instruction types to use
    const instructionTypes = context.instructionTypes || 
                             getDefaultInstructionTypesForContent('', context.sourceType);

    log.debug('🚀 Enhancing analysis with instructions:', {
      templateId: effectiveTemplateId,
      sourceType: context.sourceType,
      instructionTypes,
      availableInstructions: instructionCheck.activeInstructions
    });

    // Apply enhancement based on source type
    let enhancedResult;
    
    switch (context.sourceType) {
      case 'google-docs':
        enhancedResult = await enhanceGoogleDocsAnalysis(analysisResult, {
          templateId: effectiveTemplateId,
          userId: context.userId,
          instructionTypes,
          sourceType: context.sourceType
        });
        break;
        
      case 'google-sheets':
        enhancedResult = await enhanceGoogleSheetsAnalysis(analysisResult, {
          templateId: effectiveTemplateId,
          userId: context.userId,
          instructionTypes,
          sourceType: context.sourceType
        });
        break;
        
      case 'file-upload':
        const fileType = analysisResult.fileType || 'unknown';
        enhancedResult = await enhanceFileAnalysis(analysisResult, fileType, {
          templateId: effectiveTemplateId,
          userId: context.userId,
          instructionTypes,
          sourceType: context.sourceType
        });
        break;
        
      default:
        log.warn('🤔 Unknown source type for instruction enhancement:', context.sourceType);
        enhancedResult = analysisResult;
    }

    const processingTime = Date.now() - startTime;
    
    log.info('✅ Instruction integration completed:', {
      templateId: effectiveTemplateId,
      sourceType: context.sourceType,
      instructionsApplied: enhancedResult.instructionProcessing?.successful || 0,
      processingTime: processingTime + 'ms'
    });

    return {
      ...enhancedResult,
      integrationMetadata: {
        hookApplied: true,
        processingTime,
        context: {
          sourceType: context.sourceType,
          instructionTypes,
          templateId: effectiveTemplateId
        }
      }
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    log.error('❌ Instruction integration hook failed:', {
      error: error instanceof Error ? error.message : error,
      context,
      processingTime: processingTime + 'ms'
    });

    // Return original result with error information
    return {
      ...analysisResult,
      instructionProcessing: {
        enabled: true,
        successful: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Integration hook failed',
        processingTime
      }
    };
  }
}

/**
 * HOOK: Middleware for enabling instruction processing
 * 
 * Usage at the beginning of API routes:
 * ```typescript
 * const instructionContext = await prepareInstructionContext(
 *   request, 
 *   user, 
 *   templateId,
 *   'google-docs'
 * );
 * 
 * // Later, after analysis:
 * if (instructionContext.enableInstructions) {
 *   result = await applyInstructionsToAnalysis(result, instructionContext);
 * }
 * ```
 */
export async function prepareInstructionContext(
  request: Request,
  user: any,
  templateId: string,
  sourceType: 'google-docs' | 'google-sheets' | 'file-upload' | 'manual',
  defaultEnabled: boolean = true
): Promise<IntegrationContext> {
  try {
    // Check for instruction parameters in request
    const url = new URL(request.url);
    const enableInstructions = url.searchParams.get('enableInstructions') !== 'false' && defaultEnabled;
    const instructionTypesParam = url.searchParams.get('instructionTypes');
    
    let instructionTypes: InstructionType[] | undefined;
    if (instructionTypesParam) {
      instructionTypes = instructionTypesParam
        .split(',')
        .filter(type => ['global', 'section', 'paragraph', 'table', 'cell'].includes(type)) as InstructionType[];
    }

    const context: IntegrationContext = {
      userId: user.id,
      templateId,
      sourceType,
      enableInstructions,
      instructionTypes
    };

    log.debug('🔧 Prepared instruction context:', context);

    return context;

  } catch (error) {
    log.error('Error preparing instruction context:', error);
    
    return {
      userId: user.id,
      templateId,
      sourceType,
      enableInstructions: false
    };
  }
}

/**
 * HOOK: Response wrapper that adds instruction metadata
 * 
 * Usage before returning API response:
 * ```typescript
 * return NextResponse.json(
 *   wrapResponseWithInstructionMetadata(responseData, instructionContext)
 * );
 * ```
 */
export function wrapResponseWithInstructionMetadata(
  responseData: any,
  context: IntegrationContext
): any {
  return {
    success: true,
    data: responseData,
    instructionContext: {
      enabled: context.enableInstructions !== false,
      sourceType: context.sourceType,
      templateId: context.templateId,
      requestedTypes: context.instructionTypes || 'auto',
      appliedInstructions: responseData.instructionProcessing?.successful || 0,
      processingTime: responseData.instructionProcessing?.executionTime || 0
    },
    enhancedWithInstructions: !!(responseData.instructionProcessing?.successful)
  };
}

/**
 * UTILITY: Check if request should enable instructions
 */
export function shouldEnableInstructions(
  request: Request,
  defaultValue: boolean = true
): boolean {
  try {
    const url = new URL(request.url);
    
    // Check explicit parameter
    const enableParam = url.searchParams.get('enableInstructions');
    if (enableParam === 'false') return false;
    if (enableParam === 'true') return true;
    
    // Check for legacy parameters
    const useInstructionsParam = url.searchParams.get('useInstructions');
    if (useInstructionsParam === 'false') return false;
    if (useInstructionsParam === 'true') return true;
    
    return defaultValue;
    
  } catch {
    return defaultValue;
  }
}

/**
 * UTILITY: Extract instruction types from request parameters
 */
export function getInstructionTypesFromRequest(
  request: Request,
  sourceType?: string
): InstructionType[] {
  try {
    const url = new URL(request.url);
    const typesParam = url.searchParams.get('instructionTypes');
    
    if (typesParam) {
      const requestedTypes = typesParam
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => ['global', 'section', 'paragraph', 'table', 'cell'].includes(t)) as InstructionType[];
      
      if (requestedTypes.length > 0) {
        return requestedTypes;
      }
    }
    
    // Fall back to defaults based on source type
    if (sourceType) {
      return getDefaultInstructionTypesForContent('', sourceType);
    }
    
    return ['global', 'section', 'paragraph'];
    
  } catch {
    return ['global', 'section', 'paragraph'];
  }
}

/**
 * EXAMPLE INTEGRATION for Google Docs route:
 * 
 * ```typescript
 * // In /app/api/google/docs/analyze/route.ts
 * 
 * export async function POST(request: NextRequest) {
 *   try {
 *     // ... existing validation and authentication ...
 *     
 *     // Prepare instruction context
 *     const instructionContext = await prepareInstructionContext(
 *       request, 
 *       user, 
 *       templateId,
 *       'google-docs'
 *     );
 * 
 *     // ... existing Google Docs analysis ...
 *     
 *     // Apply instructions if enabled
 *     let finalResult = analysisResult;
 *     if (instructionContext.enableInstructions) {
 *       finalResult = await applyInstructionsToAnalysis(
 *         analysisResult, 
 *         instructionContext
 *       );
 *     }
 * 
 *     // Return enhanced response
 *     return NextResponse.json(
 *       wrapResponseWithInstructionMetadata(finalResult, instructionContext)
 *     );
 *     
 *   } catch (error) {
 *     // ... error handling ...
 *   }
 * }
 * ```
 */

// Export commonly used combinations
export const GoogleDocsIntegration = {
  prepare: (request: Request, user: any, templateId: string) => 
    prepareInstructionContext(request, user, templateId, 'google-docs'),
    
  apply: (result: any, context: IntegrationContext) => 
    applyInstructionsToAnalysis(result, context),
    
  wrap: (data: any, context: IntegrationContext) => 
    wrapResponseWithInstructionMetadata(data, context)
};

export const GoogleSheetsIntegration = {
  prepare: (request: Request, user: any, templateId: string) => 
    prepareInstructionContext(request, user, templateId, 'google-sheets'),
    
  apply: (result: any, context: IntegrationContext) => 
    applyInstructionsToAnalysis(result, context),
    
  wrap: (data: any, context: IntegrationContext) => 
    wrapResponseWithInstructionMetadata(data, context)
};

export const FileUploadIntegration = {
  prepare: (request: Request, user: any, templateId: string) => 
    prepareInstructionContext(request, user, templateId, 'file-upload'),
    
  apply: (result: any, context: IntegrationContext) => 
    applyInstructionsToAnalysis(result, context),
    
  wrap: (data: any, context: IntegrationContext) => 
    wrapResponseWithInstructionMetadata(data, context)
};