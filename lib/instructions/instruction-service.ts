// Enhanced Instruction Service
// Manages hierarchical AI instructions with advanced features

import { createClient } from '@supabase/supabase-js';
import { 
  EnhancedAIInstruction, 
  InstructionType, 
  InstructionExecutionContext,
  InstructionExecutionResult,
  InstructionBatch,
  InstructionValidation,
  InstructionConflict,
  InstructionAnalytics,
  InstructionTarget
} from './instruction-types';
import { log } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class InstructionService {
  
  // ===== INSTRUCTION MANAGEMENT =====
  
  async createInstruction(
    userId: string,
    templateId: string,
    instruction: Partial<EnhancedAIInstruction>
  ): Promise<EnhancedAIInstruction> {
    try {
      // Validate instruction before creation
      const validation = await this.validateInstruction(instruction, templateId);
      if (!validation.isValid) {
        throw new Error(`Invalid instruction: ${validation.errors.join(', ')}`);
      }

      // Get next execution order for this type
      const nextOrder = await this.getNextExecutionOrder(templateId, instruction.type!);

      const instructionData = {
        template_id: templateId,
        user_id: userId,
        title: instruction.title,
        instruction: instruction.instruction,
        instruction_type: instruction.type,
        instruction_scope: instruction.scope,
        target_config: instruction.target || {},
        is_active: instruction.isActive ?? true,
        priority: instruction.priority ?? 5,
        execution_order: instruction.executionOrder ?? nextOrder,
        preserve_formatting: instruction.preserveFormatting ?? true,
        variable_substitution: instruction.variableSubstitution ?? true,
        context_aware: instruction.contextAware ?? true,
        dependent_variables: instruction.variables || [],
        execution_conditions: instruction.conditions || [],
        prompt_template: instruction.promptTemplate,
        example_before: instruction.exampleBefore,
        example_after: instruction.exampleAfter,
        created_by: userId,
      };

      const { data, error } = await supabase
        .from('ai_instructions')
        .insert(instructionData)
        .select()
        .single();

      if (error) throw error;

      log.info('Instruction created:', {
        id: data.id,
        type: data.instruction_type,
        title: data.title,
        templateId
      });

      return this.mapDatabaseToInstruction(data);
    } catch (error) {
      log.error('Error creating instruction:', error);
      throw error;
    }
  }

  async getInstructions(
    templateId: string,
    userId: string,
    filters?: {
      type?: InstructionType;
      active?: boolean;
      scope?: string;
    }
  ): Promise<EnhancedAIInstruction[]> {
    try {
      let query = supabase
        .from('ai_instructions')
        .select('*')
        .eq('template_id', templateId)
        .eq('user_id', userId)
        .order('instruction_type')
        .order('execution_order');

      if (filters?.type) {
        query = query.eq('instruction_type', filters.type);
      }
      if (filters?.active !== undefined) {
        query = query.eq('is_active', filters.active);
      }
      if (filters?.scope) {
        query = query.eq('instruction_scope', filters.scope);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(this.mapDatabaseToInstruction);
    } catch (error) {
      log.error('Error fetching instructions:', error);
      throw error;
    }
  }

  async updateInstruction(
    instructionId: string,
    userId: string,
    updates: Partial<EnhancedAIInstruction>
  ): Promise<EnhancedAIInstruction> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Map enhanced instruction fields to database fields
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.instruction !== undefined) updateData.instruction = updates.instruction;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.executionOrder !== undefined) updateData.execution_order = updates.executionOrder;
      if (updates.target !== undefined) updateData.target_config = updates.target;
      if (updates.preserveFormatting !== undefined) updateData.preserve_formatting = updates.preserveFormatting;
      if (updates.variableSubstitution !== undefined) updateData.variable_substitution = updates.variableSubstitution;
      if (updates.contextAware !== undefined) updateData.context_aware = updates.contextAware;
      if (updates.variables !== undefined) updateData.dependent_variables = updates.variables;
      if (updates.conditions !== undefined) updateData.execution_conditions = updates.conditions;
      if (updates.promptTemplate !== undefined) updateData.prompt_template = updates.promptTemplate;
      if (updates.exampleBefore !== undefined) updateData.example_before = updates.exampleBefore;
      if (updates.exampleAfter !== undefined) updateData.example_after = updates.exampleAfter;

      const { data, error } = await supabase
        .from('ai_instructions')
        .update(updateData)
        .eq('id', instructionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      log.info('Instruction updated:', { id: instructionId, updates: Object.keys(updateData) });

      return this.mapDatabaseToInstruction(data);
    } catch (error) {
      log.error('Error updating instruction:', error);
      throw error;
    }
  }

  async deleteInstruction(instructionId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('ai_instructions')
        .delete()
        .eq('id', instructionId)
        .eq('user_id', userId);

      if (error) throw error;

      log.info('Instruction deleted:', { id: instructionId });
    } catch (error) {
      log.error('Error deleting instruction:', error);
      throw error;
    }
  }

  // ===== INSTRUCTION EXECUTION =====

  async executeInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const startTime = Date.now();
    
    try {
      log.debug('Executing instruction:', {
        id: instruction.id,
        type: instruction.type,
        title: instruction.title,
        scope: instruction.scope
      });

      // Prepare execution context
      const executionContext = await this.prepareExecutionContext(instruction, context);
      
      // Execute instruction based on type
      let result: InstructionExecutionResult;
      
      switch (instruction.type) {
        case 'global':
          result = await this.executeGlobalInstruction(instruction, executionContext);
          break;
        case 'section':
          result = await this.executeSectionInstruction(instruction, executionContext);
          break;
        case 'paragraph':
          result = await this.executeParagraphInstruction(instruction, executionContext);
          break;
        case 'table':
          result = await this.executeTableInstruction(instruction, executionContext);
          break;
        case 'cell':
          result = await this.executeCellInstruction(instruction, executionContext);
          break;
        default:
          throw new Error(`Unsupported instruction type: ${instruction.type}`);
      }

      // Log execution result
      await this.logInstructionExecution(result);
      
      // Update performance statistics
      await this.updateInstructionPerformance(
        instruction.id,
        result.success,
        result.executionTime
      );

      log.debug('Instruction executed successfully:', {
        id: instruction.id,
        success: result.success,
        executionTime: result.executionTime,
        tokensUsed: result.tokensUsed
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      log.error('Instruction execution failed:', {
        id: instruction.id,
        error: error instanceof Error ? error.message : error,
        executionTime
      });

      // Create failed result
      const failedResult: InstructionExecutionResult = {
        instruction,
        success: false,
        originalContent: context.currentContent,
        modifiedContent: context.currentContent,
        contentChanges: [],
        executionTime,
        errors: [error instanceof Error ? error.message : 'Unknown execution error'],
        warnings: [],
        targetElement: instruction.target.selector,
        affectedElements: [],
        contextUsed: {
          variables: Object.keys(context.variables),
          knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
          parentInstructions: context.parentInstructions.map(i => i.id)
        },
        executedAt: new Date(),
        executedBy: context.documentId // Using documentId as executed by for now
      };

      // Log failed execution
      await this.logInstructionExecution(failedResult);
      await this.updateInstructionPerformance(instruction.id, false, executionTime);

      return failedResult;
    }
  }

  async executeBatch(batch: InstructionBatch): Promise<InstructionBatch> {
    log.info('Executing instruction batch:', {
      batchId: batch.id,
      instructionCount: batch.instructions.length,
      parallelExecution: batch.parallelExecution
    });

    batch.batchStatus = 'executing';
    batch.startedAt = new Date();
    batch.results = [];

    try {
      if (batch.parallelExecution) {
        // Execute all instructions in parallel
        const promises = batch.executionOrder.map(instruction =>
          this.executeInstruction(instruction, batch.context)
        );
        
        batch.results = await Promise.all(promises);
      } else {
        // Execute instructions sequentially
        let currentContent = batch.context.currentContent;
        
        for (const instruction of batch.executionOrder) {
          // Update context with current content from previous instruction
          const updatedContext = {
            ...batch.context,
            currentContent
          };
          
          const result = await this.executeInstruction(instruction, updatedContext);
          batch.results.push(result);
          
          // Update content for next instruction if successful
          if (result.success) {
            currentContent = result.modifiedContent;
          }
          
          // Stop on error if configured
          if (!result.success && batch.stopOnError) {
            break;
          }
        }
      }

      // Calculate batch statistics
      batch.successfulInstructions = batch.results.filter(r => r.success).length;
      batch.failedInstructions = batch.results.filter(r => !r.success).length;
      batch.totalExecutionTime = batch.results.reduce((sum, r) => sum + r.executionTime, 0);
      
      batch.batchStatus = batch.failedInstructions === 0 ? 'completed' : 'failed';
      
    } catch (error) {
      log.error('Batch execution failed:', error);
      batch.batchStatus = 'failed';
    } finally {
      batch.completedAt = new Date();
    }

    log.info('Batch execution completed:', {
      batchId: batch.id,
      status: batch.batchStatus,
      successful: batch.successfulInstructions,
      failed: batch.failedInstructions,
      totalTime: batch.totalExecutionTime
    });

    return batch;
  }

  // ===== INSTRUCTION VALIDATION =====

  async validateInstruction(
    instruction: Partial<EnhancedAIInstruction>,
    templateId?: string
  ): Promise<InstructionValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!instruction.title?.trim()) {
      errors.push('Instruction title is required');
    }
    if (!instruction.instruction?.trim()) {
      errors.push('Instruction content is required');
    }
    if (!instruction.type) {
      errors.push('Instruction type is required');
    }

    // Type-specific validation
    if (instruction.type && !['global', 'section', 'paragraph', 'table', 'cell'].includes(instruction.type)) {
      errors.push(`Invalid instruction type: ${instruction.type}`);
    }

    // Priority validation
    if (instruction.priority && (instruction.priority < 1 || instruction.priority > 10)) {
      errors.push('Priority must be between 1 and 10');
    }

    // Target validation
    const targetValidation = await this.validateTarget(instruction.target, instruction.type);
    
    // Context validation
    const contextValidation = await this.validateContext(instruction, templateId);

    // Performance estimation
    const performanceEstimation = this.estimatePerformance(instruction);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      targeting: targetValidation,
      syntax: {
        isValid: errors.length === 0,
        variablesResolved: true, // TODO: Implement variable resolution check
        templateValid: true,     // TODO: Implement template validation
        issues: errors
      },
      context: contextValidation,
      performance: performanceEstimation
    };
  }

  // ===== CONFLICT DETECTION =====

  async detectConflicts(templateId: string): Promise<InstructionConflict[]> {
    try {
      const instructions = await this.getInstructions(templateId, '', { active: true });
      const conflicts: InstructionConflict[] = [];

      // Group instructions by type for conflict detection
      const instructionsByType = this.groupInstructionsByType(instructions);

      // Check for targeting conflicts
      const targetingConflicts = this.detectTargetingConflicts(instructionsByType);
      conflicts.push(...targetingConflicts);

      // Check for priority conflicts
      const priorityConflicts = this.detectPriorityConflicts(instructionsByType);
      conflicts.push(...priorityConflicts);

      // Check for dependency conflicts
      const dependencyConflicts = this.detectDependencyConflicts(instructions);
      conflicts.push(...dependencyConflicts);

      log.debug('Conflict detection completed:', {
        templateId,
        conflictsFound: conflicts.length,
        types: conflicts.map(c => c.type)
      });

      return conflicts;
    } catch (error) {
      log.error('Error detecting conflicts:', error);
      throw error;
    }
  }

  // ===== ANALYTICS =====

  async getInstructionAnalytics(instructionId: string): Promise<InstructionAnalytics> {
    try {
      // Get instruction details
      const { data: instruction, error: instructionError } = await supabase
        .from('instruction_performance_analytics')
        .select('*')
        .eq('id', instructionId)
        .single();

      if (instructionError) throw instructionError;

      // Get execution history
      const { data: executions, error: executionsError } = await supabase
        .from('instruction_executions')
        .select('*')
        .eq('instruction_id', instructionId)
        .order('executed_at', { ascending: false })
        .limit(100);

      if (executionsError) throw executionsError;

      // Build analytics object
      const analytics: InstructionAnalytics = {
        instruction: this.mapDatabaseToInstruction(instruction),
        totalExecutions: instruction.total_executions || 0,
        successfulExecutions: instruction.successful_executions || 0,
        failedExecutions: instruction.failed_executions || 0,
        averageExecutionTime: instruction.average_execution_time_ms || 0,
        executionTrend: executions.map(e => ({
          date: new Date(e.executed_at),
          executionTime: e.execution_time_ms,
          success: e.success,
          context: `${e.document_id || 'unknown'}`
        })),
        averageContentChange: 0, // TODO: Calculate based on content_changes
        contentImpactScore: 0,   // TODO: Calculate content impact
        optimizationSuggestions: this.generateOptimizationSuggestions(instruction, executions)
      };

      return analytics;
    } catch (error) {
      log.error('Error getting instruction analytics:', error);
      throw error;
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async prepareExecutionContext(
    instruction: EnhancedAIInstruction,
    baseContext: InstructionExecutionContext
  ): Promise<InstructionExecutionContext> {
    // TODO: Enhance context with instruction-specific data
    return {
      ...baseContext,
      executionLevel: baseContext.executionLevel + 1,
      parentInstructions: [...baseContext.parentInstructions, instruction]
    };
  }

  private async executeGlobalInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const { iaProcessingEngine } = await import('./ia-processing-engine');
    return await iaProcessingEngine.executeGlobalInstruction(instruction, context);
  }

  private async executeSectionInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const { iaProcessingEngine } = await import('./ia-processing-engine');
    return await iaProcessingEngine.executeSectionInstruction(instruction, context);
  }

  private async executeParagraphInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const { iaProcessingEngine } = await import('./ia-processing-engine');
    return await iaProcessingEngine.executeParagraphInstruction(instruction, context);
  }

  private async executeTableInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const { iaProcessingEngine } = await import('./ia-processing-engine');
    return await iaProcessingEngine.executeTableInstruction(instruction, context);
  }

  private async executeCellInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const { iaProcessingEngine } = await import('./ia-processing-engine');
    return await iaProcessingEngine.executeCellInstruction(instruction, context);
  }

  private async logInstructionExecution(result: InstructionExecutionResult): Promise<void> {
    try {
      const executionData = {
        instruction_id: result.instruction.id,
        template_id: result.instruction.target.elementId, // TODO: Get from context
        user_id: result.executedBy,
        original_content: result.originalContent.substring(0, 10000), // Limit size
        modified_content: result.modifiedContent.substring(0, 10000), // Limit size
        content_changes: result.contentChanges,
        success: result.success,
        execution_time_ms: result.executionTime,
        tokens_used: result.tokensUsed || 0,
        ai_model: result.aiModel || 'openai-gpt-4',
        confidence: result.confidence,
        target_element: result.targetElement,
        affected_elements: result.affectedElements,
        errors: result.errors || [],
        warnings: result.warnings || [],
        variable_substitutions: result.variableSubstitutions || {},
        variables_used: result.contextUsed.variables,
        knowledge_documents_used: result.contextUsed.knowledgeDocuments,
        executed_by: result.executedBy
      };

      const { error } = await supabase
        .from('instruction_executions')
        .insert(executionData);

      if (error) {
        log.error('Error logging instruction execution:', error);
      }
    } catch (error) {
      log.error('Error in logInstructionExecution:', error);
    }
  }

  private async updateInstructionPerformance(
    instructionId: string,
    success: boolean,
    executionTime: number
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('update_instruction_performance', {
        p_instruction_id: instructionId,
        p_success: success,
        p_execution_time_ms: executionTime
      });

      if (error) {
        log.error('Error updating instruction performance:', error);
      }
    } catch (error) {
      log.error('Error in updateInstructionPerformance:', error);
    }
  }

  private mapDatabaseToInstruction(data: any): EnhancedAIInstruction {
    return {
      id: data.id,
      type: data.instruction_type,
      scope: data.instruction_scope,
      title: data.title,
      instruction: data.instruction,
      target: data.target_config,
      isActive: data.is_active,
      priority: data.priority,
      executionOrder: data.execution_order,
      variables: data.dependent_variables || [],
      conditions: data.execution_conditions || [],
      preserveFormatting: data.preserve_formatting,
      variableSubstitution: data.variable_substitution,
      contextAware: data.context_aware,
      promptTemplate: data.prompt_template,
      exampleBefore: data.example_before,
      exampleAfter: data.example_after,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      createdBy: data.created_by,
      version: data.version,
      averageExecutionTime: data.average_execution_time_ms,
      successRate: data.success_rate,
      lastExecuted: data.last_executed_at ? new Date(data.last_executed_at) : undefined
    };
  }

  private async getNextExecutionOrder(templateId: string, type: InstructionType): Promise<number> {
    const { data, error } = await supabase
      .from('ai_instructions')
      .select('execution_order')
      .eq('template_id', templateId)
      .eq('instruction_type', type)
      .order('execution_order', { ascending: false })
      .limit(1);

    if (error) throw error;

    return data.length > 0 ? data[0].execution_order + 1 : 1;
  }

  private async validateTarget(target: any, type?: string): Promise<any> {
    // TODO: Implement target validation logic
    return {
      isValid: true,
      canResolveTarget: true,
      targetExists: true,
      conflicts: []
    };
  }

  private async validateContext(instruction: any, templateId?: string): Promise<any> {
    // TODO: Implement context validation logic
    return {
      isValid: true,
      hasRequiredContext: true,
      dependenciesMet: true,
      missingDependencies: []
    };
  }

  private estimatePerformance(instruction: any): any {
    // TODO: Implement performance estimation logic
    return {
      estimatedExecutionTime: 2000,
      complexityScore: 5,
      riskLevel: 'low' as const
    };
  }

  private groupInstructionsByType(instructions: EnhancedAIInstruction[]) {
    return instructions.reduce((groups, instruction) => {
      if (!groups[instruction.type]) {
        groups[instruction.type] = [];
      }
      groups[instruction.type].push(instruction);
      return groups;
    }, {} as Record<InstructionType, EnhancedAIInstruction[]>);
  }

  private detectTargetingConflicts(instructionsByType: Record<InstructionType, EnhancedAIInstruction[]>): InstructionConflict[] {
    // TODO: Implement targeting conflict detection
    return [];
  }

  private detectPriorityConflicts(instructionsByType: Record<InstructionType, EnhancedAIInstruction[]>): InstructionConflict[] {
    // TODO: Implement priority conflict detection
    return [];
  }

  private detectDependencyConflicts(instructions: EnhancedAIInstruction[]): InstructionConflict[] {
    // TODO: Implement dependency conflict detection
    return [];
  }

  private generateOptimizationSuggestions(instruction: any, executions: any[]): string[] {
    // TODO: Implement optimization suggestions
    return ['Consider simplifying the instruction for better performance'];
  }
}

// Export singleton instance
export const instructionService = new InstructionService();