// Instruction Processor - Integrates hierarchical instructions with AI analysis
// This connects the instruction system to the document processing pipeline

import { log } from '@/lib/logger';
import { instructionService } from './instruction-service';
import { 
  EnhancedAIInstruction, 
  InstructionExecutionContext, 
  InstructionBatch,
  InstructionType,
  InstructionExecutionResult
} from './instruction-types';

export interface DocumentProcessingContext {
  templateId: string;
  documentId: string;
  userId: string;
  originalContent: string;
  currentContent: string;
  variables: Record<string, any>;
  knowledgeDocuments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
  processingOptions: {
    enableInstructions: boolean;
    instructionTypes: InstructionType[];
    parallelExecution: boolean;
    stopOnError: boolean;
  };
}

export interface InstructionProcessingResult {
  success: boolean;
  originalContent: string;
  processedContent: string;
  instructionsExecuted: number;
  instructionsSuccessful: number;
  instructionsFailed: number;
  totalExecutionTime: number;
  results: InstructionExecutionResult[];
  errors: string[];
  warnings: string[];
  processingLog: Array<{
    timestamp: Date;
    level: 'info' | 'warn' | 'error';
    message: string;
    instructionId?: string;
  }>;
}

export class InstructionProcessor {
  
  /**
   * Process document with all applicable instructions
   */
  async processDocumentWithInstructions(
    context: DocumentProcessingContext
  ): Promise<InstructionProcessingResult> {
    const startTime = Date.now();
    const processingLog: Array<{ timestamp: Date; level: 'info' | 'warn' | 'error'; message: string; instructionId?: string }> = [];

    log.info('Starting instruction processing:', {
      templateId: context.templateId,
      documentId: context.documentId,
      enabledTypes: context.processingOptions.instructionTypes,
      parallel: context.processingOptions.parallelExecution
    });

    processingLog.push({
      timestamp: new Date(),
      level: 'info',
      message: `Starting instruction processing for document ${context.documentId}`
    });

    const result: InstructionProcessingResult = {
      success: false,
      originalContent: context.originalContent,
      processedContent: context.currentContent,
      instructionsExecuted: 0,
      instructionsSuccessful: 0,
      instructionsFailed: 0,
      totalExecutionTime: 0,
      results: [],
      errors: [],
      warnings: [],
      processingLog
    };

    try {
      if (!context.processingOptions.enableInstructions) {
        processingLog.push({
          timestamp: new Date(),
          level: 'info',
          message: 'Instructions disabled - skipping instruction processing'
        });
        
        result.success = true;
        result.totalExecutionTime = Date.now() - startTime;
        return result;
      }

      // Get all active instructions for this template
      const allInstructions = await instructionService.getInstructions(
        context.templateId,
        context.userId,
        { active: true }
      );

      if (allInstructions.length === 0) {
        processingLog.push({
          timestamp: new Date(),
          level: 'info',
          message: 'No active instructions found for template'
        });
        
        result.success = true;
        result.totalExecutionTime = Date.now() - startTime;
        return result;
      }

      // Filter instructions by enabled types
      const enabledInstructions = allInstructions.filter(instruction =>
        context.processingOptions.instructionTypes.includes(instruction.type)
      );

      if (enabledInstructions.length === 0) {
        processingLog.push({
          timestamp: new Date(),
          level: 'warn',
          message: `No instructions match enabled types: ${context.processingOptions.instructionTypes.join(', ')}`
        });
        
        result.success = true;
        result.warnings.push('No matching instructions found for enabled types');
        result.totalExecutionTime = Date.now() - startTime;
        return result;
      }

      processingLog.push({
        timestamp: new Date(),
        level: 'info',
        message: `Found ${enabledInstructions.length} applicable instructions`
      });

      // Check for instruction conflicts before execution
      const conflicts = await instructionService.detectConflicts(context.templateId);
      
      if (conflicts.length > 0) {
        const highPriorityConflicts = conflicts.filter(c => c.severity === 'blocking');
        
        if (highPriorityConflicts.length > 0) {
          const conflictMessage = `High-priority instruction conflicts detected: ${conflicts.map(c => c.description).join('; ')}`;
          processingLog.push({
            timestamp: new Date(),
            level: 'error',
            message: conflictMessage
          });
          
          result.errors.push(conflictMessage);
          result.totalExecutionTime = Date.now() - startTime;
          return result;
        }
        
        // Log warnings for lower priority conflicts
        conflicts.forEach(conflict => {
          const warningMessage = `Instruction conflict (${conflict.severity}): ${conflict.description}`;
          processingLog.push({
            timestamp: new Date(),
            level: 'warn',
            message: warningMessage
          });
          result.warnings.push(warningMessage);
        });
      }

      // Order instructions by type hierarchy and execution order
      const orderedInstructions = this.orderInstructionsForExecution(enabledInstructions);

      processingLog.push({
        timestamp: new Date(),
        level: 'info',
        message: `Execution order: ${orderedInstructions.map(i => `${i.type}:${i.title}`).join(' → ')}`
      });

      // Create execution context
      const executionContext: any = {
        templateId: context.templateId,
        documentId: context.documentId,
        currentContent: context.currentContent,
        originalContent: context.originalContent,
        variables: context.variables,
        knowledgeDocuments: (context.knowledgeDocuments || []).map((doc: any) => ({ 
          ...doc, 
          description: doc.description || doc.filename 
        })),
        executionLevel: 0,
        parentInstructions: []
      };

      // Execute instructions
      if (context.processingOptions.parallelExecution) {
        result.results = await this.executeInstructionsInParallel(
          orderedInstructions,
          executionContext,
          processingLog
        );
      } else {
        result.results = await this.executeInstructionsSequentially(
          orderedInstructions,
          executionContext,
          context.processingOptions.stopOnError,
          processingLog
        );
      }

      // Calculate final results
      result.instructionsExecuted = result.results.length;
      result.instructionsSuccessful = result.results.filter(r => r.success).length;
      result.instructionsFailed = result.results.filter(r => !r.success).length;
      result.totalExecutionTime = Date.now() - startTime;

      // Get final content from last successful result
      const lastSuccessfulResult = result.results
        .filter(r => r.success)
        .pop();
      
      result.processedContent = lastSuccessfulResult?.modifiedContent || context.currentContent;

      // Collect errors and warnings
      result.results.forEach(executionResult => {
        result.errors.push(...executionResult.errors);
        result.warnings.push(...executionResult.warnings);
      });

      result.success = result.instructionsFailed === 0;

      processingLog.push({
        timestamp: new Date(),
        level: result.success ? 'info' : 'error',
        message: `Instruction processing ${result.success ? 'completed successfully' : 'completed with errors'}: ${result.instructionsSuccessful}/${result.instructionsExecuted} successful`
      });

      log.info('Instruction processing completed:', {
        templateId: context.templateId,
        success: result.success,
        executed: result.instructionsExecuted,
        successful: result.instructionsSuccessful,
        failed: result.instructionsFailed,
        executionTime: result.totalExecutionTime
      });

    } catch (error) {
      const errorMessage = `Instruction processing failed: ${error instanceof Error ? error.message : error}`;
      
      log.error('Instruction processing error:', error);
      
      processingLog.push({
        timestamp: new Date(),
        level: 'error',
        message: errorMessage
      });

      result.errors.push(errorMessage);
      result.totalExecutionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute specific instruction types only
   */
  async executeInstructionsByType(
    templateId: string,
    userId: string,
    types: InstructionType[],
    content: string,
    variables: Record<string, any> = {}
  ): Promise<InstructionProcessingResult> {
    const context: DocumentProcessingContext = {
      templateId,
      documentId: `temp-${Date.now()}`,
      userId,
      originalContent: content,
      currentContent: content,
      variables,
      processingOptions: {
        enableInstructions: true,
        instructionTypes: types,
        parallelExecution: false,
        stopOnError: false
      }
    };

    return this.processDocumentWithInstructions(context);
  }

  /**
   * Preview instruction execution without applying changes
   */
  async previewInstructionExecution(
    instruction: EnhancedAIInstruction,
    content: string,
    variables: Record<string, any> = {}
  ): Promise<{
    preview: string;
    changes: Array<{
      type: string;
      description: string;
      confidence: number;
    }>;
    estimatedTime: number;
    warnings: string[];
  }> {
    try {
      const executionContext: any = {
        templateId: instruction.id,
        documentId: 'preview',
        currentContent: content,
        originalContent: content,
        variables,
        knowledgeDocuments: [],
        executionLevel: 0,
        parentInstructions: []
      };

      // Create a copy of the instruction for preview (don't modify original)
      const previewInstruction = { ...instruction };
      
      // Execute the instruction
      const result = await instructionService.executeInstruction(
        previewInstruction,
        executionContext
      );

      return {
        preview: result.modifiedContent,
        changes: result.contentChanges.map(change => ({
          type: change.changeType,
          description: `Modified ${change.elementType}: ${change.originalValue} → ${change.newValue}`,
          confidence: change.confidence
        })),
        estimatedTime: result.executionTime,
        warnings: result.warnings
      };

    } catch (error) {
      log.error('Instruction preview failed:', error);
      
      return {
        preview: content,
        changes: [],
        estimatedTime: 0,
        warnings: [`Preview failed: ${error instanceof Error ? error.message : error}`]
      };
    }
  }

  // ===== PRIVATE EXECUTION METHODS =====

  private orderInstructionsForExecution(instructions: EnhancedAIInstruction[]): EnhancedAIInstruction[] {
    // Define hierarchy order: global → section → paragraph → table → cell
    const typeOrder: Record<InstructionType, number> = {
      global: 1,
      section: 2,
      paragraph: 3,
      table: 4,
      cell: 5
    };

    return instructions.sort((a, b) => {
      // First sort by type hierarchy
      const typeComparison = typeOrder[a.type] - typeOrder[b.type];
      if (typeComparison !== 0) return typeComparison;

      // Then by priority (higher priority first)
      const priorityComparison = (b.priority || 5) - (a.priority || 5);
      if (priorityComparison !== 0) return priorityComparison;

      // Finally by execution order
      return (a.executionOrder || 0) - (b.executionOrder || 0);
    });
  }

  private async executeInstructionsInParallel(
    instructions: EnhancedAIInstruction[],
    baseContext: InstructionExecutionContext,
    processingLog: Array<{ timestamp: Date; level: 'info' | 'warn' | 'error'; message: string; instructionId?: string }>
  ): Promise<InstructionExecutionResult[]> {
    processingLog.push({
      timestamp: new Date(),
      level: 'info',
      message: `Executing ${instructions.length} instructions in parallel`
    });

    // Execute all instructions simultaneously with the same base context
    const promises = instructions.map(instruction => {
      const context = { ...baseContext };
      return instructionService.executeInstruction(instruction, context);
    });

    const results = await Promise.all(promises.map(promise => 
      promise.catch(error => {
        log.error('Parallel instruction execution error:', error);
        return null;
      })
    ));

    // Filter out failed promises and log results
    const validResults = results.filter((result): result is InstructionExecutionResult => result !== null);
    
    validResults.forEach(result => {
      processingLog.push({
        timestamp: new Date(),
        level: result.success ? 'info' : 'error',
        message: `Instruction ${result.instruction.type}:${result.instruction.title} ${result.success ? 'succeeded' : 'failed'}`,
        instructionId: result.instruction.id
      });
    });

    return validResults;
  }

  private async executeInstructionsSequentially(
    instructions: EnhancedAIInstruction[],
    baseContext: InstructionExecutionContext,
    stopOnError: boolean,
    processingLog: Array<{ timestamp: Date; level: 'info' | 'warn' | 'error'; message: string; instructionId?: string }>
  ): Promise<InstructionExecutionResult[]> {
    processingLog.push({
      timestamp: new Date(),
      level: 'info',
      message: `Executing ${instructions.length} instructions sequentially${stopOnError ? ' (stop on error)' : ''}`
    });

    const results: InstructionExecutionResult[] = [];
    let currentContent = baseContext.currentContent;

    for (const instruction of instructions) {
      try {
        processingLog.push({
          timestamp: new Date(),
          level: 'info',
          message: `Executing: ${instruction.type}:${instruction.title}`,
          instructionId: instruction.id
        });

        // Update context with current content from previous executions
        const executionContext: any = {
          ...baseContext,
          currentContent,
          parentInstructions: [...baseContext.parentInstructions]
        };

        const result = await instructionService.executeInstruction(instruction, executionContext);
        results.push(result);

        if (result.success) {
          currentContent = result.modifiedContent;
          
          processingLog.push({
            timestamp: new Date(),
            level: 'info',
            message: `✓ ${instruction.type}:${instruction.title} completed successfully (${result.executionTime}ms)`,
            instructionId: instruction.id
          });
        } else {
          processingLog.push({
            timestamp: new Date(),
            level: 'error',
            message: `✗ ${instruction.type}:${instruction.title} failed: ${result.errors.join('; ')}`,
            instructionId: instruction.id
          });

          if (stopOnError) {
            processingLog.push({
              timestamp: new Date(),
              level: 'info',
              message: 'Stopping execution due to error and stopOnError=true'
            });
            break;
          }
        }

      } catch (error) {
        const errorMessage = `Unexpected error executing ${instruction.type}:${instruction.title}: ${error instanceof Error ? error.message : error}`;
        
        processingLog.push({
          timestamp: new Date(),
          level: 'error',
          message: errorMessage,
          instructionId: instruction.id
        });

        if (stopOnError) {
          processingLog.push({
            timestamp: new Date(),
            level: 'info',
            message: 'Stopping execution due to unexpected error'
          });
          break;
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const instructionProcessor = new InstructionProcessor();

// ===== INTEGRATION HELPER FUNCTIONS =====

/**
 * Integrate instruction processing with existing AI analysis pipeline
 */
export async function enhanceAIAnalysisWithInstructions(
  originalAnalysis: any,
  templateId: string,
  userId: string,
  enabledTypes: InstructionType[] = ['global', 'section', 'paragraph', 'table', 'cell']
): Promise<any> {
  try {
    log.debug('Enhancing AI analysis with instructions:', {
      templateId,
      analysisType: originalAnalysis.sourceType || 'unknown',
      enabledTypes
    });

    // Process the original content with instructions
    const context: DocumentProcessingContext = {
      templateId,
      documentId: originalAnalysis.templateId || templateId,
      userId,
      originalContent: originalAnalysis.transcription || originalAnalysis.html_content || '',
      currentContent: originalAnalysis.transcription || originalAnalysis.html_content || '',
      variables: originalAnalysis.variables || {},
      processingOptions: {
        enableInstructions: true,
        instructionTypes: enabledTypes,
        parallelExecution: false,
        stopOnError: false
      }
    };

    const instructionResult = await instructionProcessor.processDocumentWithInstructions(context);

    // Merge instruction results with original analysis
    const enhancedAnalysis = {
      ...originalAnalysis,
      
      // Update content with instruction-processed version
      transcription: instructionResult.processedContent,
      html_content: instructionResult.processedContent,
      
      // Add instruction processing metadata
      instructionProcessing: {
        enabled: true,
        executed: instructionResult.instructionsExecuted,
        successful: instructionResult.instructionsSuccessful,
        failed: instructionResult.instructionsFailed,
        executionTime: instructionResult.totalExecutionTime,
        processingLog: instructionResult.processingLog
      },
      
      // Merge metadata
      metadata: {
        ...originalAnalysis.metadata,
        instructionsApplied: instructionResult.instructionsSuccessful,
        instructionTypes: enabledTypes,
        enhancedWithInstructions: true
      }
    };

    log.debug('AI analysis enhanced with instructions:', {
      originalLength: context.originalContent.length,
      processedLength: instructionResult.processedContent.length,
      instructionsApplied: instructionResult.instructionsSuccessful
    });

    return enhancedAnalysis;

  } catch (error) {
    log.error('Failed to enhance AI analysis with instructions:', error);
    
    // Return original analysis with error metadata
    return {
      ...originalAnalysis,
      instructionProcessing: {
        enabled: true,
        executed: 0,
        successful: 0,
        failed: 1,
        executionTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}