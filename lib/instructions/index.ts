// Hierarchical AI Instructions System - Main Export
// Complete system for managing and executing AI instructions at all document levels

// ===== CORE TYPES =====
export type {
  InstructionType,
  InstructionScope,
  EnhancedAIInstruction,
  InstructionTarget,
  InstructionExecutionContext,
  InstructionExecutionResult,
  InstructionBatch,
  InstructionValidation,
  InstructionConflict,
  InstructionAnalytics,
  InstructionContentChange,
  InstructionVariable,
  InstructionCondition
} from './instruction-types';

// ===== SERVICE LAYER =====
export { 
  InstructionService,
  instructionService 
} from './instruction-service';

// ===== PROCESSING ENGINE =====
export {
  IAProcessingEngine,
  iaProcessingEngine
} from './ia-processing-engine';

// ===== DOCUMENT PROCESSOR =====
export {
  InstructionProcessor,
  instructionProcessor,
  type DocumentProcessingContext,
  type InstructionProcessingResult
} from './instruction-processor';

// ===== INTEGRATION COMPONENTS =====
export {
  enhanceGoogleDocsAnalysis,
  enhanceGoogleSheetsAnalysis,
  enhanceFileAnalysis,
  getDefaultInstructionTypesForContent,
  hasInstructionsForTemplate,
  type AnalysisIntegrationOptions
} from './analysis-integration';

// ===== INTEGRATION HOOKS =====
export {
  applyInstructionsToAnalysis,
  prepareInstructionContext,
  wrapResponseWithInstructionMetadata,
  shouldEnableInstructions,
  getInstructionTypesFromRequest,
  GoogleDocsIntegration,
  GoogleSheetsIntegration,
  FileUploadIntegration,
  type IntegrationContext
} from './integration-hooks';

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Quick start: Execute specific instructions on content
 */
export async function executeInstructions(
  templateId: string,
  userId: string,
  content: string,
  options: {
    types?: InstructionType[];
    variables?: Record<string, any>;
    parallel?: boolean;
    stopOnError?: boolean;
  } = {}
): Promise<InstructionProcessingResult> {
  const { instructionProcessor } = await import('./instruction-processor');
  
  return instructionProcessor.executeInstructionsByType(
    templateId,
    userId,
    options.types || ['global', 'section', 'paragraph'],
    content,
    options.variables || {}
  );
}

/**
 * Quick start: Create a new instruction
 */
export async function createInstruction(
  userId: string,
  templateId: string,
  instruction: {
    type: InstructionType;
    title: string;
    instruction: string;
    target?: Partial<InstructionTarget>;
    priority?: number;
    active?: boolean;
  }
): Promise<EnhancedAIInstruction> {
  const { instructionService } = await import('./instruction-service');
  
  return instructionService.createInstruction(userId, templateId, {
    ...instruction,
    scope: instruction.type === 'global' ? 'document' : 'element',
    target: {
      selector: 'all',
      elementType: instruction.type,
      ...instruction.target
    },
    isActive: instruction.active !== false,
    priority: instruction.priority || 5
  });
}

/**
 * Quick start: Get all instructions for a template
 */
export async function getTemplateInstructions(
  templateId: string,
  userId: string,
  activeOnly: boolean = true
): Promise<EnhancedAIInstruction[]> {
  const { instructionService } = await import('./instruction-service');
  
  return instructionService.getInstructions(templateId, userId, {
    active: activeOnly
  });
}

/**
 * Quick start: Preview instruction execution
 */
export async function previewInstruction(
  instruction: EnhancedAIInstruction,
  content: string,
  variables: Record<string, any> = {}
): Promise<{
  preview: string;
  changes: Array<{ type: string; description: string; confidence: number }>;
  warnings: string[];
}> {
  const { instructionProcessor } = await import('./instruction-processor');
  
  const result = await instructionProcessor.previewInstructionExecution(
    instruction,
    content,
    variables
  );
  
  return {
    preview: result.preview,
    changes: result.changes,
    warnings: result.warnings
  };
}

/**
 * Quick start: Integration with existing analysis
 */
export async function integrateWithAnalysis(
  analysisResult: any,
  userId: string,
  templateId: string,
  sourceType: 'google-docs' | 'google-sheets' | 'file-upload' = 'file-upload'
): Promise<any> {
  const { applyInstructionsToAnalysis } = await import('./integration-hooks');
  
  return applyInstructionsToAnalysis(analysisResult, {
    userId,
    templateId,
    sourceType,
    enableInstructions: true
  });
}

// ===== SYSTEM STATUS =====

/**
 * Check if the instruction system is properly configured
 */
export async function checkInstructionSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'error';
  components: {
    database: boolean;
    service: boolean;
    processor: boolean;
    integration: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const components = {
    database: false,
    service: false,
    processor: false,
    integration: false
  };

  try {
    // Test database connection
    try {
      const { instructionService } = await import('./instruction-service');
      await instructionService.getInstructions('test', 'test', { active: true });
      components.database = true;
    } catch (error) {
      errors.push(`Database error: ${error instanceof Error ? error.message : error}`);
    }

    // Test service layer
    try {
      const { InstructionService } = await import('./instruction-service');
      components.service = !!InstructionService;
    } catch (error) {
      errors.push(`Service error: ${error instanceof Error ? error.message : error}`);
    }

    // Test processing engine
    try {
      const { IAProcessingEngine } = await import('./ia-processing-engine');
      components.processor = !!IAProcessingEngine;
    } catch (error) {
      errors.push(`Processor error: ${error instanceof Error ? error.message : error}`);
    }

    // Test integration hooks
    try {
      const { applyInstructionsToAnalysis } = await import('./integration-hooks');
      components.integration = !!applyInstructionsToAnalysis;
    } catch (error) {
      errors.push(`Integration error: ${error instanceof Error ? error.message : error}`);
    }

  } catch (error) {
    errors.push(`System error: ${error instanceof Error ? error.message : error}`);
  }

  const healthyComponents = Object.values(components).filter(Boolean).length;
  const totalComponents = Object.keys(components).length;

  let status: 'healthy' | 'degraded' | 'error' = 'error';
  if (healthyComponents === totalComponents) {
    status = 'healthy';
  } else if (healthyComponents > 0) {
    status = 'degraded';
  }

  return {
    status,
    components,
    errors
  };
}

// ===== CONSTANTS =====

export const INSTRUCTION_TYPES: InstructionType[] = [
  'global',
  'section', 
  'paragraph',
  'table',
  'cell'
];

export const INSTRUCTION_SCOPES = [
  'document',
  'section',
  'element'
] as const;

export const DEFAULT_INSTRUCTION_PRIORITIES = {
  global: 1,
  section: 2,
  paragraph: 3,
  table: 4,
  cell: 5
} as const;

// ===== VERSION INFO =====
export const INSTRUCTION_SYSTEM_VERSION = '1.0.0';
export const INSTRUCTION_SYSTEM_BUILD = 'fase-4-complete';

// ===== EXPORTS FOR BACKWARDS COMPATIBILITY =====
export * from './instruction-types';