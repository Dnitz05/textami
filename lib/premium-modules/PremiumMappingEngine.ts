// lib/premium-modules/PremiumMappingEngine.ts
// TEXTAMI PREMIUM MODULES - Premium Mapping Creation and Management Engine
// Creates and manages visual mappings with Premium Module intelligence

import { premiumContentAnalyzer, type ExcelColumnAnalysis, type WordSelectionAnalysis } from './PremiumContentAnalyzer'
import { intelligentModuleSelector, type ModuleSelectionResult, type PremiumModuleType } from './IntelligentModuleSelector'

export interface PremiumMapping {
  // Core mapping data
  id: string
  excel_column: ExcelColumnAnalysis
  word_selection: EnhancedWordSelection
  
  // Premium Module intelligence (INVISIBLE to user)
  selected_premium_module: PremiumModuleType
  module_selection_result: ModuleSelectionResult
  generated_syntax: string
  
  // Quality and performance metrics (INTERNAL)
  quality_score: number           // 1-10 score
  performance_benefit: number     // Estimated time saved in minutes
  professional_enhancement: string
  
  // Visual mapping state (VISIBLE to user)
  status: 'draft' | 'saved' | 'optimized'
  created_at: Date
  updated_at: Date
  position?: number               // For sidebar positioning
  order?: number                  // Sequential numbering
  
  // AI Prompts (PHASE 2.5 - prepared interface)
  ai_prompt_mode?: 'rewrite' | 'enhance' | 'insert_after' | 'insert_before'
  ai_prompt?: string             // User's prompt for AI enhancement
  ai_enhanced_content?: string   // AI generated content (future)
  original_paragraph_id?: string
}

export interface EnhancedWordSelection {
  start: number
  end: number
  text: string
  paragraphId: string
  
  // Enhanced with Premium Module analysis
  analysis: WordSelectionAnalysis
  premium_opportunities: Array<{
    module: PremiumModuleType
    benefit: string
    confidence: number
  }>
}

export interface MappingCreationOptions {
  documentType?: 'report' | 'letter' | 'invoice' | 'generic'
  qualityMode?: 'maximum' | 'balanced' | 'speed'
  consistencyOptimization?: boolean
  userPreferences?: {
    preferredModule?: PremiumModuleType
    avoidComplexity?: boolean
  }
}

export interface BatchMappingResult {
  mappings: PremiumMapping[]
  summary: {
    totalMappings: number
    premiumModulesUsed: Record<PremiumModuleType, number>
    estimatedTimeSaved: number
    estimatedQualityGain: number
    recommendedOptimizations: string[]
  }
}

export class PremiumMappingEngine {
  
  private mappingCounter = 1
  
  /**
   * Creates intelligent mapping between Excel column and Word selection
   * AUTOMATIC AND TRANSPARENT - User just sees perfect mapping created
   */
  createIntelligentMapping(
    excelColumn: ExcelColumnAnalysis,
    wordSelection: {
      start: number
      end: number
      text: string
      paragraphId: string
    },
    options: MappingCreationOptions = {}
  ): PremiumMapping {
    
    // 1. Analyze Word selection with Premium Module intelligence
    const wordAnalysis = this.analyzeWordSelection(wordSelection)
    
    // 2. Create enhanced word selection
    const enhancedWordSelection: EnhancedWordSelection = {
      ...wordSelection,
      analysis: wordAnalysis,
      premium_opportunities: this.identifyPremiumOpportunities(excelColumn, wordAnalysis)
    }
    
    // 3. Select optimal Premium Module (TRANSPARENT to user)
    const moduleSelection = intelligentModuleSelector.selectOptimalModule(
      excelColumn,
      wordAnalysis,
      {
        documentType: options.documentType || 'generic',
        performanceMode: options.qualityMode || 'balanced'
      }
    )
    
    // 4. Generate optimized syntax
    const generatedSyntax = this.generateOptimizedSyntax(
      excelColumn.column,
      moduleSelection,
      enhancedWordSelection
    )
    
    // 5. Calculate quality and performance metrics
    const qualityScore = this.calculateQualityScore(moduleSelection, excelColumn, wordAnalysis)
    const performanceBenefit = this.calculatePerformanceBenefit(moduleSelection, excelColumn)
    
    // 6. Generate professional enhancement description
    const professionalEnhancement = this.generateEnhancementDescription(moduleSelection)
    
    // 7. Create Premium Mapping
    const mapping: PremiumMapping = {
      id: this.generateMappingId(),
      excel_column: excelColumn,
      word_selection: enhancedWordSelection,
      
      // Premium Module data (invisible to user)
      selected_premium_module: moduleSelection.primary,
      module_selection_result: moduleSelection,
      generated_syntax: generatedSyntax,
      
      // Quality metrics (internal)
      quality_score: qualityScore,
      performance_benefit: performanceBenefit,
      professional_enhancement: professionalEnhancement,
      
      // User-visible state
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date()
    }
    
    return mapping
  }

  /**
   * Creates batch mappings with consistency optimization
   * Optimizes Premium Module usage across multiple mappings
   */
  createBatchMappings(
    mappingPairs: Array<{
      excelColumn: ExcelColumnAnalysis
      wordSelection: {
        start: number
        end: number  
        text: string
        paragraphId: string
      }
    }>,
    options: MappingCreationOptions = {}
  ): BatchMappingResult {
    
    // Create individual mappings
    const mappings = mappingPairs.map((pair, index) => {
      const mapping = this.createIntelligentMapping(pair.excelColumn, pair.wordSelection, options)
      
      // Assign sequential order
      mapping.order = this.mappingCounter++
      
      return mapping
    })
    
    // Optimize for consistency if requested
    if (options.consistencyOptimization) {
      this.optimizeMappingsForConsistency(mappings)
    }
    
    // Generate summary
    const summary = this.generateBatchSummary(mappings)
    
    return {
      mappings,
      summary
    }
  }

  /**
   * Updates existing mapping with new analysis or user changes
   */
  updateMapping(
    mapping: PremiumMapping,
    updates: Partial<{
      word_selection: Partial<EnhancedWordSelection>
      options: MappingCreationOptions
      ai_prompt_mode: PremiumMapping['ai_prompt_mode']
      ai_prompt: string
    }>
  ): PremiumMapping {
    
    const updatedMapping = { ...mapping }
    
    // Update word selection if provided
    if (updates.word_selection) {
      updatedMapping.word_selection = {
        ...updatedMapping.word_selection,
        ...updates.word_selection
      }
      
      // Re-analyze if text changed
      if (updates.word_selection.text) {
        updatedMapping.word_selection.analysis = this.analyzeWordSelection(updatedMapping.word_selection)
      }
    }
    
    // Update AI prompt data (Phase 2.5 preparation)
    if (updates.ai_prompt_mode !== undefined) {
      updatedMapping.ai_prompt_mode = updates.ai_prompt_mode
    }
    
    if (updates.ai_prompt !== undefined) {
      updatedMapping.ai_prompt = updates.ai_prompt
    }
    
    // Re-run module selection if significant changes
    if (updates.word_selection?.text || updates.options) {
      const newModuleSelection = intelligentModuleSelector.selectOptimalModule(
        updatedMapping.excel_column,
        updatedMapping.word_selection.analysis,
        {
          documentType: updates.options?.documentType || 'generic',
          performanceMode: updates.options?.qualityMode || 'balanced'
        }
      )
      
      updatedMapping.module_selection_result = newModuleSelection
      updatedMapping.selected_premium_module = newModuleSelection.primary
      updatedMapping.generated_syntax = this.generateOptimizedSyntax(
        updatedMapping.excel_column.column,
        newModuleSelection,
        updatedMapping.word_selection
      )
    }
    
    updatedMapping.updated_at = new Date()
    
    return updatedMapping
  }

  /**
   * Optimizes mapping for quality and performance
   * Applies Premium Module optimizations
   */
  optimizeMapping(mapping: PremiumMapping): PremiumMapping {
    const optimized = { ...mapping }
    
    // Apply quality optimizations based on Premium Module
    switch (mapping.selected_premium_module) {
      case 'html':
        optimized.generated_syntax = this.optimizeHTMLSyntax(mapping)
        break
        
      case 'image':
        optimized.generated_syntax = this.optimizeImageSyntax(mapping)
        break
        
      case 'style':
        optimized.generated_syntax = this.optimizeStyleSyntax(mapping)
        break
    }
    
    // Recalculate quality score
    optimized.quality_score = this.calculateQualityScore(
      optimized.module_selection_result,
      optimized.excel_column,
      optimized.word_selection.analysis
    )
    
    optimized.status = 'optimized'
    optimized.updated_at = new Date()
    
    return optimized
  }

  /**
   * Validates mapping compatibility and suggests improvements
   */
  validateMapping(mapping: PremiumMapping): {
    valid: boolean
    issues: string[]
    suggestions: string[]
    qualityScore: number
  } {
    
    const validation = intelligentModuleSelector.validateModuleCompatibility(
      mapping.selected_premium_module,
      mapping.excel_column,
      mapping.word_selection.analysis
    )
    
    const issues = [...validation.issues]
    const suggestions = [...validation.suggestions]
    
    // Additional validation specific to mapping context
    if (mapping.word_selection.text.length < 3) {
      issues.push('Word selection is very short - may not benefit from Premium Module')
      suggestions.push('Consider selecting more text or using simple text mode')
    }
    
    if (mapping.excel_column.sample_data.length === 0) {
      issues.push('No sample data available for Excel column analysis')
      suggestions.push('Verify Excel column contains data')
    }
    
    return {
      valid: validation.compatible && issues.length === 0,
      issues,
      suggestions,
      qualityScore: mapping.quality_score
    }
  }

  // Private helper methods

  private analyzeWordSelection(wordSelection: {
    start: number
    end: number
    text: string
    paragraphId: string
  }): WordSelectionAnalysis {
    
    // Create a mock HTML structure for analysis
    const mockHTML = `<p data-paragraph-id="${wordSelection.paragraphId}">${wordSelection.text}</p>`
    
    // Analyze the word selection
    return {
      text: wordSelection.text,
      start: wordSelection.start,
      end: wordSelection.end,
      paragraphId: wordSelection.paragraphId,
      existingStyles: [], // Would extract from actual HTML in real implementation
      hasComplexFormatting: this.hasComplexFormatting(wordSelection.text),
      containsLists: this.containsLists(wordSelection.text),
      containsTables: this.containsTables(wordSelection.text),
      isImagePlaceholder: this.isImagePlaceholder(wordSelection.text),
      styleEnhancementOpportunity: this.calculateStyleOpportunity(wordSelection.text),
      htmlConversionBenefit: this.calculateHTMLBenefit(wordSelection.text),
      imageReplacementPotential: this.calculateImagePotential(wordSelection.text)
    }
  }

  private identifyPremiumOpportunities(
    excelColumn: ExcelColumnAnalysis,
    wordAnalysis: WordSelectionAnalysis
  ): Array<{ module: PremiumModuleType; benefit: string; confidence: number }> {
    
    const opportunities: Array<{ module: PremiumModuleType; benefit: string; confidence: number }> = []
    
    // Image opportunities
    if (excelColumn.hasImages || wordAnalysis.imageReplacementPotential > 0.5) {
      opportunities.push({
        module: 'image',
        benefit: 'Dynamic image processing with automatic scaling',
        confidence: Math.max(
          excelColumn.hasImages ? 0.9 : 0,
          wordAnalysis.imageReplacementPotential
        )
      })
    }
    
    // HTML opportunities
    if (excelColumn.hasHTML || wordAnalysis.htmlConversionBenefit > 0.6) {
      opportunities.push({
        module: 'html',
        benefit: 'Rich content formatting and structure preservation',
        confidence: Math.max(
          excelColumn.hasHTML ? 0.8 : 0,
          wordAnalysis.htmlConversionBenefit
        )
      })
    }
    
    // Style opportunities
    if (excelColumn.hasRichFormatting || wordAnalysis.styleEnhancementOpportunity > 0.5) {
      opportunities.push({
        module: 'style',
        benefit: 'Professional styling and conditional formatting',
        confidence: Math.max(
          excelColumn.hasRichFormatting ? 0.7 : 0,
          wordAnalysis.styleEnhancementOpportunity
        )
      })
    }
    
    return opportunities.sort((a, b) => b.confidence - a.confidence)
  }

  private generateOptimizedSyntax(
    column: string,
    moduleSelection: ModuleSelectionResult,
    wordSelection: EnhancedWordSelection
  ): string {
    
    // Use the intelligent module selector to generate syntax
    let syntax = moduleSelection.syntaxGenerated
    
    // Apply additional optimizations based on context
    if (moduleSelection.primary === 'style' && wordSelection.analysis.hasComplexFormatting) {
      // Enhanced style syntax for complex formatting
      syntax = `{${column}:style="font-weight:bold;color:#1e40af;background:#eff6ff"}`
    }
    
    if (moduleSelection.primary === 'html' && wordSelection.analysis.containsLists) {
      // Ensure block syntax for list content
      syntax = `{~~${column}}`
    }
    
    return syntax
  }

  private calculateQualityScore(
    moduleSelection: ModuleSelectionResult,
    excelColumn: ExcelColumnAnalysis,
    wordAnalysis: WordSelectionAnalysis
  ): number {
    
    // Base score from module selection
    let score = moduleSelection.valueScore
    
    // Adjust based on content match
    if (moduleSelection.primary === 'image' && excelColumn.hasImages) score += 1
    if (moduleSelection.primary === 'html' && excelColumn.hasHTML) score += 1
    if (moduleSelection.primary === 'style' && excelColumn.hasRichFormatting) score += 1
    
    // Adjust based on word selection quality
    score += wordAnalysis.styleEnhancementOpportunity * 2
    score += wordAnalysis.htmlConversionBenefit * 2
    
    return Math.min(Math.max(score, 1), 10) // Clamp between 1-10
  }

  private calculatePerformanceBenefit(
    moduleSelection: ModuleSelectionResult,
    excelColumn: ExcelColumnAnalysis
  ): number {
    
    // Base performance benefit from module
    const baseMinutes = {
      'html': 5,
      'image': 3,
      'style': 7,
      'xlsx': 4,
      'text': 0
    }
    
    const base = baseMinutes[moduleSelection.primary] || 0
    
    // Multiply by complexity
    const complexityMultiplier = {
      'simple': 1,
      'moderate': 1.5,
      'advanced': 2.5
    }
    
    return base * complexityMultiplier[excelColumn.complexityLevel]
  }

  private generateEnhancementDescription(moduleSelection: ModuleSelectionResult): string {
    const descriptions = {
      'html': 'Rich content formatting with perfect HTML to Word conversion',
      'image': 'Dynamic image processing with automatic scaling and optimization',
      'style': 'Professional styling with conditional formatting and theme control',
      'xlsx': 'Advanced Excel data processing with native type support',
      'text': 'Reliable text processing with optimal performance'
    }
    
    return descriptions[moduleSelection.primary] || 'Standard text processing'
  }

  private generateMappingId(): string {
    return `premium-mapping-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  private optimizeMappingsForConsistency(mappings: PremiumMapping[]): void {
    // Find most common module
    const moduleCounts = mappings.reduce((counts, mapping) => {
      counts[mapping.selected_premium_module] = (counts[mapping.selected_premium_module] || 0) + 1
      return counts
    }, {} as Record<PremiumModuleType, number>)
    
    const mostCommonModule = Object.entries(moduleCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as PremiumModuleType
    
    // Only adjust low-confidence text mappings
    mappings.forEach(mapping => {
      if (mapping.selected_premium_module === 'text' && 
          mapping.quality_score < 6 && 
          mostCommonModule !== 'text') {
        
        // Update to most common module if it makes sense
        mapping.selected_premium_module = mostCommonModule
        mapping.generated_syntax = intelligentModuleSelector.generatePremiumSyntax({
          column: mapping.excel_column.column,
          moduleType: mostCommonModule
        })
      }
    })
  }

  private generateBatchSummary(mappings: PremiumMapping[]): BatchMappingResult['summary'] {
    const premiumModulesUsed: Record<PremiumModuleType, number> = {
      'html': 0, 'image': 0, 'style': 0, 'xlsx': 0, 'text': 0
    }
    
    let totalTimeSaved = 0
    let totalQuality = 0
    
    mappings.forEach(mapping => {
      premiumModulesUsed[mapping.selected_premium_module]++
      totalTimeSaved += mapping.performance_benefit
      totalQuality += mapping.quality_score
    })
    
    const recommendations: string[] = []
    
    // Generate recommendations
    if (premiumModulesUsed.text > mappings.length * 0.7) {
      recommendations.push('Consider enabling more Premium Module features for enhanced quality')
    }
    
    if (totalTimeSaved > 30) {
      recommendations.push('High time savings detected - excellent Premium Module utilization')
    }
    
    return {
      totalMappings: mappings.length,
      premiumModulesUsed,
      estimatedTimeSaved: totalTimeSaved,
      estimatedQualityGain: totalQuality / mappings.length,
      recommendedOptimizations: recommendations
    }
  }

  // Style analysis helper methods (simplified implementations)
  private hasComplexFormatting(text: string): boolean {
    return text.includes('\n') || text.length > 100 || /[^\w\s.,!?]/.test(text)
  }

  private containsLists(text: string): boolean {
    return /^\s*[-*+•]\s/m.test(text) || /^\s*\d+\.\s/m.test(text)
  }

  private containsTables(text: string): boolean {
    return text.includes('\t') || text.includes('|')
  }

  private isImagePlaceholder(text: string): boolean {
    const patterns = [/\[image\]/i, /\[img\]/i, /\[photo\]/i, /{image}/i]
    return patterns.some(pattern => pattern.test(text))
  }

  private calculateStyleOpportunity(text: string): number {
    let score = 0
    if (text.length > 50) score += 0.2
    if (this.hasComplexFormatting(text)) score += 0.4
    if (this.containsLists(text)) score += 0.3
    return Math.min(score, 1.0)
  }

  private calculateHTMLBenefit(text: string): number {
    if (/<[^>]+>/.test(text)) return 0.9
    if (this.containsLists(text)) return 0.6
    if (this.containsTables(text)) return 0.8
    return 0.1
  }

  private calculateImagePotential(text: string): number {
    if (this.isImagePlaceholder(text)) return 1.0
    const imageWords = ['image', 'photo', 'picture', 'logo']
    const wordCount = imageWords.filter(word => text.toLowerCase().includes(word)).length
    return Math.min(wordCount * 0.3, 1.0)
  }

  private optimizeHTMLSyntax(mapping: PremiumMapping): string {
    // Always use block syntax for HTML to avoid rendering issues
    return `{~~${mapping.excel_column.column}}`
  }

  private optimizeImageSyntax(mapping: PremiumMapping): string {
    // Use block syntax for centered images, inline for others
    if (mapping.word_selection.analysis.hasComplexFormatting) {
      return `{%%${mapping.excel_column.column}}` // Block for complex layouts
    }
    return `{%${mapping.excel_column.column}}` // Inline by default
  }

  private optimizeStyleSyntax(mapping: PremiumMapping): string {
    // Generate enhanced style string based on content analysis
    const styles = []
    
    if (mapping.word_selection.analysis.hasComplexFormatting) {
      styles.push('font-weight:bold')
    }
    
    styles.push('color:#1e40af') // Professional blue
    
    if (mapping.excel_column.complexityLevel === 'advanced') {
      styles.push('background:#f0f9ff', 'padding:8px')
    }
    
    return `{${mapping.excel_column.column}:style="${styles.join(';')}"}`
  }
}

// Export singleton instance
export const premiumMappingEngine = new PremiumMappingEngine()