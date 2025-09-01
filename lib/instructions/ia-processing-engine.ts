// IA Processing Engine
// Core AI execution system for hierarchical instructions

import { log } from '@/lib/logger';
import {
  EnhancedAIInstruction,
  InstructionExecutionContext,
  InstructionExecutionResult,
  InstructionType
} from './instruction-types';

// AI Service imports
interface AIAnalysisOptions {
  templateId?: string;
  fileName?: string;
  performAIAnalysis?: boolean;
  useGemini?: boolean;
}

interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  confidence: number;
}

export class IAProcessingEngine {
  
  // ===== CORE EXECUTION METHODS =====
  
  /**
   * Execute Global-level instruction on entire document
   */
  async executeGlobalInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const startTime = Date.now();
    
    log.debug('Executing global instruction:', {
      id: instruction.id,
      title: instruction.title,
      contentLength: context.currentContent.length
    });

    try {
      // Build AI prompt for global document transformation
      const prompt = this.buildGlobalPrompt(instruction, context);
      
      // Execute AI transformation
      const aiResponse = await this.callAI(prompt, instruction, context);
      
      // Parse and validate the response
      const processedContent = await this.processAIResponse(
        aiResponse,
        context.currentContent,
        'global',
        instruction
      );

      // Calculate content changes
      const contentChanges = this.calculateContentChanges(
        context.currentContent,
        processedContent.content,
        'global'
      );

      const executionTime = Date.now() - startTime;

      return {
        instruction,
        success: true,
        originalContent: context.currentContent,
        modifiedContent: processedContent.content,
        contentChanges,
        executionTime,
        tokensUsed: aiResponse.tokensUsed,
        aiModel: aiResponse.model,
        confidence: aiResponse.confidence,
        errors: [],
        warnings: processedContent.warnings,
        targetElement: 'document',
        affectedElements: ['document'],
        contextUsed: {
          variables: Object.keys(context.variables),
          knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
          parentInstructions: context.parentInstructions.map(i => i.id)
        },
        variableSubstitutions: processedContent.variableSubstitutions,
        executedAt: new Date(),
        executedBy: context.documentId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      log.error('Global instruction execution failed:', error);
      
      return this.createFailedResult(instruction, context, executionTime, error);
    }
  }

  /**
   * Execute Section-level instruction on document sections
   */
  async executeSectionInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const startTime = Date.now();
    
    log.debug('Executing section instruction:', {
      id: instruction.id,
      title: instruction.title,
      targetSection: instruction.target.selector
    });

    try {
      // Parse document to identify sections
      const sections = this.parseDocumentSections(context.currentContent);
      
      // Find target sections based on instruction targeting
      const targetSections = this.findTargetSections(sections, instruction.target);
      
      if (targetSections.length === 0) {
        return this.createWarningResult(
          instruction,
          context,
          'No matching sections found for the specified target',
          Date.now() - startTime
        );
      }

      let modifiedContent = context.currentContent;
      const allContentChanges: any[] = [];
      const affectedElements: string[] = [];
      let totalTokensUsed = 0;
      let totalConfidence = 0;

      // Process each target section
      for (const section of targetSections) {
        const sectionPrompt = this.buildSectionPrompt(instruction, context, section);
        const aiResponse = await this.callAI(sectionPrompt, instruction, context);
        
        const processedSection = await this.processSectionResponse(
          aiResponse,
          section,
          instruction
        );

        // Replace section content in document
        modifiedContent = this.replaceSectionContent(
          modifiedContent,
          section,
          processedSection.content
        );

        // Track changes
        const sectionChanges = this.calculateContentChanges(
          section.content,
          processedSection.content,
          'section',
          section.id
        );

        allContentChanges.push(...sectionChanges);
        affectedElements.push(section.id);
        totalTokensUsed += aiResponse.tokensUsed;
        totalConfidence += aiResponse.confidence;
      }

      const executionTime = Date.now() - startTime;

      return {
        instruction,
        success: true,
        originalContent: context.currentContent,
        modifiedContent,
        contentChanges: allContentChanges,
        executionTime,
        tokensUsed: totalTokensUsed,
        aiModel: 'openai-gpt-4', // Will be dynamic
        confidence: totalConfidence / targetSections.length,
        errors: [],
        warnings: [],
        targetElement: instruction.target.selector,
        affectedElements,
        contextUsed: {
          variables: Object.keys(context.variables),
          knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
          parentInstructions: context.parentInstructions.map(i => i.id)
        },
        executedAt: new Date(),
        executedBy: context.documentId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error('Section instruction execution failed:', error);
      return this.createFailedResult(instruction, context, executionTime, error);
    }
  }

  /**
   * Execute Paragraph-level instruction on specific paragraphs
   */
  async executeParagraphInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const startTime = Date.now();
    
    log.debug('Executing paragraph instruction:', {
      id: instruction.id,
      title: instruction.title,
      targetParagraph: instruction.target.selector
    });

    try {
      // Parse document to identify paragraphs
      const paragraphs = this.parseDocumentParagraphs(context.currentContent);
      
      // Find target paragraphs
      const targetParagraphs = this.findTargetParagraphs(paragraphs, instruction.target);
      
      if (targetParagraphs.length === 0) {
        return this.createWarningResult(
          instruction,
          context,
          'No matching paragraphs found for the specified target',
          Date.now() - startTime
        );
      }

      let modifiedContent = context.currentContent;
      const allContentChanges: any[] = [];
      const affectedElements: string[] = [];
      let totalTokensUsed = 0;

      // Process each paragraph
      for (const paragraph of targetParagraphs) {
        const paragraphPrompt = this.buildParagraphPrompt(instruction, context, paragraph);
        const aiResponse = await this.callAI(paragraphPrompt, instruction, context);
        
        const processedParagraph = await this.processParagraphResponse(
          aiResponse,
          paragraph,
          instruction
        );

        // Replace paragraph in document
        modifiedContent = this.replaceParagraphContent(
          modifiedContent,
          paragraph,
          processedParagraph.content
        );

        const paragraphChanges = this.calculateContentChanges(
          paragraph.content,
          processedParagraph.content,
          'paragraph',
          paragraph.id
        );

        allContentChanges.push(...paragraphChanges);
        affectedElements.push(paragraph.id);
        totalTokensUsed += aiResponse.tokensUsed;
      }

      const executionTime = Date.now() - startTime;

      return {
        instruction,
        success: true,
        originalContent: context.currentContent,
        modifiedContent,
        contentChanges: allContentChanges,
        executionTime,
        tokensUsed: totalTokensUsed,
        aiModel: 'openai-gpt-4',
        confidence: 0.85, // Average confidence
        errors: [],
        warnings: [],
        targetElement: instruction.target.selector,
        affectedElements,
        contextUsed: {
          variables: Object.keys(context.variables),
          knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
          parentInstructions: context.parentInstructions.map(i => i.id)
        },
        executedAt: new Date(),
        executedBy: context.documentId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error('Paragraph instruction execution failed:', error);
      return this.createFailedResult(instruction, context, executionTime, error);
    }
  }

  /**
   * Execute Table-level instruction on document tables
   */
  async executeTableInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const startTime = Date.now();
    
    log.debug('Executing table instruction:', {
      id: instruction.id,
      title: instruction.title,
      targetTable: instruction.target.selector
    });

    try {
      // Parse document to identify tables
      const tables = this.parseDocumentTables(context.currentContent);
      
      // Find target tables
      const targetTables = this.findTargetTables(tables, instruction.target);
      
      if (targetTables.length === 0) {
        return this.createWarningResult(
          instruction,
          context,
          'No matching tables found for the specified target',
          Date.now() - startTime
        );
      }

      let modifiedContent = context.currentContent;
      const allContentChanges: any[] = [];
      const affectedElements: string[] = [];
      let totalTokensUsed = 0;

      // Process each table
      for (const table of targetTables) {
        const tablePrompt = this.buildTablePrompt(instruction, context, table);
        const aiResponse = await this.callAI(tablePrompt, instruction, context);
        
        const processedTable = await this.processTableResponse(
          aiResponse,
          table,
          instruction
        );

        // Replace table in document
        modifiedContent = this.replaceTableContent(
          modifiedContent,
          table,
          processedTable.content
        );

        const tableChanges = this.calculateContentChanges(
          table.htmlContent,
          processedTable.content,
          'table',
          table.id
        );

        allContentChanges.push(...tableChanges);
        affectedElements.push(table.id);
        totalTokensUsed += aiResponse.tokensUsed;
      }

      const executionTime = Date.now() - startTime;

      return {
        instruction,
        success: true,
        originalContent: context.currentContent,
        modifiedContent,
        contentChanges: allContentChanges,
        executionTime,
        tokensUsed: totalTokensUsed,
        aiModel: 'openai-gpt-4',
        confidence: 0.88,
        errors: [],
        warnings: [],
        targetElement: instruction.target.selector,
        affectedElements,
        contextUsed: {
          variables: Object.keys(context.variables),
          knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
          parentInstructions: context.parentInstructions.map(i => i.id)
        },
        executedAt: new Date(),
        executedBy: context.documentId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error('Table instruction execution failed:', error);
      return this.createFailedResult(instruction, context, executionTime, error);
    }
  }

  /**
   * Execute Cell-level instruction on table cells
   */
  async executeCellInstruction(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<InstructionExecutionResult> {
    const startTime = Date.now();
    
    log.debug('Executing cell instruction:', {
      id: instruction.id,
      title: instruction.title,
      targetCell: instruction.target.selector
    });

    try {
      // Parse document to identify table cells
      const cells = this.parseDocumentCells(context.currentContent);
      
      // Find target cells
      const targetCells = this.findTargetCells(cells, instruction.target);
      
      if (targetCells.length === 0) {
        return this.createWarningResult(
          instruction,
          context,
          'No matching cells found for the specified target',
          Date.now() - startTime
        );
      }

      let modifiedContent = context.currentContent;
      const allContentChanges: any[] = [];
      const affectedElements: string[] = [];
      let totalTokensUsed = 0;

      // Process each cell
      for (const cell of targetCells) {
        const cellPrompt = this.buildCellPrompt(instruction, context, cell);
        const aiResponse = await this.callAI(cellPrompt, instruction, context);
        
        const processedCell = await this.processCellResponse(
          aiResponse,
          cell,
          instruction
        );

        // Replace cell content in document
        modifiedContent = this.replaceCellContent(
          modifiedContent,
          cell,
          processedCell.content
        );

        const cellChanges = this.calculateContentChanges(
          cell.content,
          processedCell.content,
          'cell',
          cell.id
        );

        allContentChanges.push(...cellChanges);
        affectedElements.push(cell.id);
        totalTokensUsed += aiResponse.tokensUsed;
      }

      const executionTime = Date.now() - startTime;

      return {
        instruction,
        success: true,
        originalContent: context.currentContent,
        modifiedContent,
        contentChanges: allContentChanges,
        executionTime,
        tokensUsed: totalTokensUsed,
        aiModel: 'openai-gpt-4',
        confidence: 0.92, // Cells are usually more precise
        errors: [],
        warnings: [],
        targetElement: instruction.target.selector,
        affectedElements,
        contextUsed: {
          variables: Object.keys(context.variables),
          knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
          parentInstructions: context.parentInstructions.map(i => i.id)
        },
        executedAt: new Date(),
        executedBy: context.documentId
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      log.error('Cell instruction execution failed:', error);
      return this.createFailedResult(instruction, context, executionTime, error);
    }
  }

  // ===== AI INTERFACE METHODS =====

  /**
   * Call AI service with constructed prompt
   */
  private async callAI(
    prompt: string,
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): Promise<AIResponse> {
    try {
      // Import AI services dynamically
      let response: any;
      
      try {
        const { isGeminiAvailable, analyzeWithGemini } = await import('@/lib/ai/gemini-analyzer');
        const useGemini = false; // Default to OpenAI for now
        
        if (useGemini) {
          log.debug('Using Gemini for instruction execution');
          response = await analyzeWithGemini(prompt, {
            templateId: context.templateId,
            performAIAnalysis: true
          });
        } else {
          throw new Error('Falling back to OpenAI');
        }
      } catch (geminiError) {
        log.debug('Using OpenAI for instruction execution (Gemini unavailable)');
        
        // Fallback to OpenAI
        try {
          const { getOpenAI } = await import('@/lib/openai');
          const openai = getOpenAI();
          
          const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant that processes document content according to specific instructions. Return only the processed content without explanations.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: 4000
          });

          response = {
            content: completion.choices[0]?.message?.content || '',
            tokensUsed: completion.usage?.total_tokens || 0,
            confidence: 0.85
          };
        } catch (openaiError) {
          log.error('Both Gemini and OpenAI failed:', { geminiError, openaiError });
          throw new Error(`AI processing failed: ${openaiError instanceof Error ? openaiError.message : openaiError}`);
        }
      }

      return {
        content: response.content || response.transcription || '',
        tokensUsed: response.tokensUsed || 0,
        model: 'openai-gpt-4',
        confidence: response.confidence || 0.85
      };

    } catch (error) {
      log.error('AI service call failed:', error);
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ===== PROMPT BUILDING METHODS =====

  private buildGlobalPrompt(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext
  ): string {
    const variableContext = this.buildVariableContext(context.variables);
    const knowledgeContext = this.buildKnowledgeContext(context.knowledgeDocuments);
    
    return `# Global Document Transformation

## Instruction
${instruction.instruction}

## Context Variables
${variableContext}

## Knowledge Documents
${knowledgeContext}

## Document Content
${context.currentContent}

## Task
Apply the instruction to the entire document. Maintain the HTML structure and formatting unless specifically instructed to change it.

${instruction.exampleBefore ? `## Example Before\n${instruction.exampleBefore}` : ''}
${instruction.exampleAfter ? `## Example After\n${instruction.exampleAfter}` : ''}

Return only the transformed document content:`;
  }

  private buildSectionPrompt(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext,
    section: any
  ): string {
    return `# Section Transformation

## Instruction
${instruction.instruction}

## Section Content
${section.content}

## Context
This section is part of a larger document. Apply the instruction only to this section while maintaining consistency with the overall document style.

Return only the transformed section content:`;
  }

  private buildParagraphPrompt(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext,
    paragraph: any
  ): string {
    return `# Paragraph Transformation

## Instruction
${instruction.instruction}

## Paragraph Content
${paragraph.content}

## Context
This is a single paragraph from a document. Transform it according to the instruction while preserving its role in the document structure.

Return only the transformed paragraph:`;
  }

  private buildTablePrompt(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext,
    table: any
  ): string {
    return `# Table Transformation

## Instruction
${instruction.instruction}

## Table Content
${table.htmlContent}

## Context
This is a table with ${table.rows} rows and ${table.columns} columns. Transform the table content while maintaining the HTML table structure.

Return only the transformed table HTML:`;
  }

  private buildCellPrompt(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext,
    cell: any
  ): string {
    return `# Cell Transformation

## Instruction
${instruction.instruction}

## Cell Content
${cell.content}

## Cell Context
- Position: Row ${cell.row}, Column ${cell.column}
- Table: ${cell.tableId}
- Header: ${cell.header || 'N/A'}

Transform only this cell's content according to the instruction:`;
  }

  // ===== HELPER METHODS =====

  private buildVariableContext(variables: Record<string, any>): string {
    return Object.entries(variables)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
  }

  private buildKnowledgeContext(documents: any[] = []): string {
    return documents
      .map(doc => `- ${doc.filename}: ${doc.content.substring(0, 200)}...`)
      .join('\n');
  }

  private createFailedResult(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext,
    executionTime: number,
    error: any
  ): InstructionExecutionResult {
    return {
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
      executedBy: context.documentId
    };
  }

  private createWarningResult(
    instruction: EnhancedAIInstruction,
    context: InstructionExecutionContext,
    warning: string,
    executionTime: number
  ): InstructionExecutionResult {
    return {
      instruction,
      success: true,
      originalContent: context.currentContent,
      modifiedContent: context.currentContent,
      contentChanges: [],
      executionTime,
      errors: [],
      warnings: [warning],
      targetElement: instruction.target.selector,
      affectedElements: [],
      contextUsed: {
        variables: Object.keys(context.variables),
        knowledgeDocuments: context.knowledgeDocuments?.map(d => d.filename) || [],
        parentInstructions: context.parentInstructions.map(i => i.id)
      },
      executedAt: new Date(),
      executedBy: context.documentId
    };
  }

  // ===== CONTENT PARSING METHODS =====
  
  private parseDocumentSections(content: string): any[] {
    // Simple section parsing based on headings
    const sections = [];
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    let lastIndex = 0;
    let sectionId = 1;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1]);
      const title = match[2].replace(/<[^>]*>/g, ''); // Remove HTML tags
      const startIndex = match.index;
      
      // Add previous section if exists
      if (lastIndex < startIndex) {
        sections.push({
          id: `section-${sectionId}`,
          level,
          title,
          content: content.substring(lastIndex, startIndex),
          startIndex: lastIndex,
          endIndex: startIndex
        });
        sectionId++;
      }
      
      lastIndex = headingRegex.lastIndex;
    }

    // Add final section
    if (lastIndex < content.length) {
      sections.push({
        id: `section-${sectionId}`,
        level: 1,
        title: 'Final Section',
        content: content.substring(lastIndex),
        startIndex: lastIndex,
        endIndex: content.length
      });
    }

    return sections;
  }

  private parseDocumentParagraphs(content: string): any[] {
    const paragraphs = [];
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    let match;
    let paragraphId = 1;

    while ((match = paragraphRegex.exec(content)) !== null) {
      paragraphs.push({
        id: `paragraph-${paragraphId}`,
        content: match[0], // Full paragraph with tags
        textContent: match[1], // Just the text
        startIndex: match.index,
        endIndex: paragraphRegex.lastIndex
      });
      paragraphId++;
    }

    return paragraphs;
  }

  private parseDocumentTables(content: string): any[] {
    const tables = [];
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gi;
    let match;
    let tableId = 1;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableContent = match[0];
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
      const rows = (tableContent.match(rowRegex) || []).length;
      
      // Get first row to count columns
      const firstRowMatch = rowRegex.exec(tableContent);
      const columns = firstRowMatch 
        ? (firstRowMatch[1].match(/<t[hd][^>]*>/gi) || []).length 
        : 0;

      tables.push({
        id: `table-${tableId}`,
        htmlContent: tableContent,
        rows,
        columns,
        startIndex: match.index,
        endIndex: tableRegex.lastIndex
      });
      tableId++;
    }

    return tables;
  }

  private parseDocumentCells(content: string): any[] {
    const cells = [];
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gi;
    let tableMatch;
    let tableId = 1;

    while ((tableMatch = tableRegex.exec(content)) !== null) {
      const tableContent = tableMatch[1];
      const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
      let rowMatch;
      let rowIndex = 0;

      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1];
        const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gi;
        let cellMatch;
        let colIndex = 0;

        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          cells.push({
            id: `table-${tableId}-row-${rowIndex}-col-${colIndex}`,
            tableId: `table-${tableId}`,
            content: cellMatch[1],
            row: rowIndex,
            column: colIndex,
            startIndex: tableMatch.index + rowMatch.index + cellMatch.index,
            endIndex: tableMatch.index + rowMatch.index + cellRegex.lastIndex
          });
          colIndex++;
        }
        rowIndex++;
      }
      tableId++;
    }

    return cells;
  }

  // ===== TARGET FINDING METHODS =====

  private findTargetSections(sections: any[], target: any): any[] {
    // Simple targeting - could be enhanced with CSS selectors
    return sections.filter(section => {
      if (target.selector === 'all') return true;
      if (target.selector.includes('heading')) {
        return target.selector.includes(section.level.toString());
      }
      return section.title.toLowerCase().includes(target.selector.toLowerCase());
    });
  }

  private findTargetParagraphs(paragraphs: any[], target: any): any[] {
    return paragraphs.filter(paragraph => {
      if (target.selector === 'all') return true;
      return paragraph.textContent.toLowerCase().includes(target.selector.toLowerCase());
    });
  }

  private findTargetTables(tables: any[], target: any): any[] {
    return tables.filter(table => {
      if (target.selector === 'all') return true;
      return true; // Simple targeting for now
    });
  }

  private findTargetCells(cells: any[], target: any): any[] {
    return cells.filter(cell => {
      if (target.selector === 'all') return true;
      if (target.row !== undefined && cell.row !== target.row) return false;
      if (target.column !== undefined && cell.column !== target.column) return false;
      return true;
    });
  }

  // ===== CONTENT REPLACEMENT METHODS =====

  private replaceSectionContent(content: string, section: any, newContent: string): string {
    return content.substring(0, section.startIndex) + 
           newContent + 
           content.substring(section.endIndex);
  }

  private replaceParagraphContent(content: string, paragraph: any, newContent: string): string {
    return content.substring(0, paragraph.startIndex) + 
           newContent + 
           content.substring(paragraph.endIndex);
  }

  private replaceTableContent(content: string, table: any, newContent: string): string {
    return content.substring(0, table.startIndex) + 
           newContent + 
           content.substring(table.endIndex);
  }

  private replaceCellContent(content: string, cell: any, newContent: string): string {
    return content.substring(0, cell.startIndex) + 
           newContent + 
           content.substring(cell.endIndex);
  }

  // ===== CONTENT ANALYSIS METHODS =====

  private calculateContentChanges(
    originalContent: string,
    modifiedContent: string,
    type: InstructionType,
    elementId?: string
  ): any[] {
    // Simple change detection - could be enhanced with proper diff algorithms
    const changes: any[] = [];

    if (originalContent !== modifiedContent) {
      changes.push({
        type: 'content_modified',
        elementId: elementId || 'unknown',
        elementType: type,
        changeType: 'modification',
        originalValue: originalContent.substring(0, 100) + '...',
        newValue: modifiedContent.substring(0, 100) + '...',
        confidence: 0.9,
        appliedAt: new Date()
      });
    }

    return changes;
  }

  private async processAIResponse(
    response: AIResponse,
    originalContent: string,
    type: InstructionType,
    instruction: EnhancedAIInstruction
  ): Promise<{
    content: string;
    warnings: string[];
    variableSubstitutions: Record<string, string>;
  }> {
    return {
      content: response.content,
      warnings: [],
      variableSubstitutions: {}
    };
  }

  private async processSectionResponse(response: AIResponse, section: any, instruction: EnhancedAIInstruction) {
    return { content: response.content };
  }

  private async processParagraphResponse(response: AIResponse, paragraph: any, instruction: EnhancedAIInstruction) {
    return { content: response.content };
  }

  private async processTableResponse(response: AIResponse, table: any, instruction: EnhancedAIInstruction) {
    return { content: response.content };
  }

  private async processCellResponse(response: AIResponse, cell: any, instruction: EnhancedAIInstruction) {
    return { content: response.content };
  }
}

// Export singleton instance
export const iaProcessingEngine = new IAProcessingEngine();