// lib/premium-modules/IntelligentModuleSelector.ts
// TEXTAMI PREMIUM MODULES - Intelligent Module Selection Engine
// Automatically selects optimal Premium Module based on content analysis

import type { ExcelColumnAnalysis, WordSelectionAnalysis, PremiumOpportunity } from './PremiumContentAnalyzer'

export type PremiumModuleType = 'html' | 'image' | 'style' | 'xlsx' | 'text'

export interface ModuleSelectionResult {
  primary: PremiumModuleType
  secondary?: PremiumModuleType  // For combined module usage
  reasoning: string
  valueScore: number            // 0-10 score representing value of this selection
  confidenceLevel: 'high' | 'medium' | 'low'
  estimatedBenefit: string
  moduleInvestment: number      // €0, €250, €500
  syntaxGenerated: string
}

export interface PremiumSyntaxOptions {
  column: string
  moduleType: PremiumModuleType
  styleConfig?: StyleConfiguration
  imageConfig?: ImageConfiguration
  htmlConfig?: HTMLConfiguration
}

export interface StyleConfiguration {
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  fontFamily?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  conditionalFormatting?: {
    condition: string
    trueStyle: any
    falseStyle: any
  }
}

export interface ImageConfiguration {
  maxWidth?: number | string
  maxHeight?: number | string
  alignment?: 'left' | 'center' | 'right'
  caption?: string
  altText?: string
  quality?: 'low' | 'medium' | 'high' | 'maximum'
}

export interface HTMLConfiguration {
  preserveFormatting?: boolean
  allowedTags?: string[]
  cssClasses?: string[]
  customStyles?: Record<string, string>
}

export class IntelligentModuleSelector {
  
  // Premium Module costs for value calculation
  private readonly MODULE_COSTS: Record<PremiumModuleType, number> = {
    'html': 250,
    'image': 250, 
    'style': 500,
    'xlsx': 250,
    'text': 0
  }

  /**
   * Selects optimal Premium Module based on content analysis
   * AUTOMATIC AND TRANSPARENT - User never sees this decision process
   */
  selectOptimalModule(
    excelAnalysis: ExcelColumnAnalysis,
    wordAnalysis?: WordSelectionAnalysis,
    context?: {
      documentType: 'report' | 'letter' | 'invoice' | 'generic'
      userPreferences?: Partial<Record<PremiumModuleType, number>>
      performanceMode?: 'speed' | 'maximum' | 'balanced'
    }
  ): ModuleSelectionResult {
    
    // 1. FUNCTIONAL NECESSITY (Highest Priority)
    const functionalNeed = this.assessFunctionalNecessity(excelAnalysis, wordAnalysis)
    if (functionalNeed.required) {
      return this.createModuleResult(
        functionalNeed.module,
        functionalNeed.reasoning,
        10, // Maximum value score for required functionality
        'high',
        functionalNeed.benefit,
        excelAnalysis.column
      )
    }

    // 2. PROFESSIONAL QUALITY (High Priority)
    const qualityEnhancement = this.assessQualityEnhancement(excelAnalysis, wordAnalysis)
    if (qualityEnhancement.recommended && qualityEnhancement.valueScore >= 7) {
      return this.createModuleResult(
        qualityEnhancement.module,
        qualityEnhancement.reasoning,
        qualityEnhancement.valueScore,
        'high',
        qualityEnhancement.benefit,
        excelAnalysis.column,
        qualityEnhancement.secondary
      )
    }

    // 3. TIME SAVINGS (Medium Priority)
    const timeSavings = this.assessTimeSavings(excelAnalysis, wordAnalysis, context)
    if (timeSavings.worthwhile && timeSavings.valueScore >= 5) {
      return this.createModuleResult(
        timeSavings.module,
        timeSavings.reasoning,
        timeSavings.valueScore,
        'medium',
        timeSavings.benefit,
        excelAnalysis.column
      )
    }

    // 4. DEFAULT - Simple text (Always reliable)
    return this.createModuleResult(
      'text',
      'Content is suitable for standard text processing',
      8, // High reliability score
      'high',
      'Reliable and fast processing with no additional complexity',
      excelAnalysis.column
    )
  }

  /**
   * Generates optimized Premium Module syntax
   * Leverages Premium Modules Guide knowledge
   */
  generatePremiumSyntax(options: PremiumSyntaxOptions): string {
    const { column, moduleType, styleConfig, imageConfig, htmlConfig } = options

    switch (moduleType) {
      case 'html':
        // HTML Module syntax: {~~variable} for block content
        // Use block syntax for rich content that may contain multiple elements
        return `{~~${column}}`

      case 'image':  
        // Image Module syntax: {%variable} for inline, {%%variable} for block
        // Default to inline images unless specified otherwise
        if (imageConfig?.alignment && imageConfig.alignment !== 'left') {
          return `{%%${column}}` // Block syntax for centered/right aligned images
        }
        return `{%${column}}`

      case 'style':
        // Style Module syntax: {variable:style="..."}
        // Generate dynamic style string based on configuration
        const styleString = this.generateStyleString(styleConfig)
        return `{${column}:style="${styleString}"}`

      case 'xlsx':
        // XLSX Module syntax: Standard {variable} with type information
        // Will be processed with specific data types by XLSX module
        return `{${column}}`

      case 'text':
        // Standard docxtemplater syntax
        return `{${column}}`

      default:
        return `{${column}}`
    }
  }

  /**
   * Validates module compatibility with content
   * Prevents incompatible module selections
   */
  validateModuleCompatibility(
    moduleType: PremiumModuleType,
    excelAnalysis: ExcelColumnAnalysis,
    wordAnalysis?: WordSelectionAnalysis
  ): { compatible: boolean; issues: string[]; suggestions: string[] } {
    
    const issues: string[] = []
    const suggestions: string[] = []

    switch (moduleType) {
      case 'html':
        if (!excelAnalysis.hasHTML && excelAnalysis.complexityLevel === 'simple') {
          issues.push('HTML Module may be overkill for simple text content')
          suggestions.push('Consider using Style Module for basic formatting')
        }
        break

      case 'image':
        if (!excelAnalysis.hasImages) {
          issues.push('Image Module selected but no image content detected')
          suggestions.push('Verify that Excel column contains image references')
        }
        break

      case 'style':
        if (wordAnalysis && !wordAnalysis.hasComplexFormatting && excelAnalysis.complexityLevel === 'simple') {
          issues.push('Style Module may provide limited benefit for simple content')
          suggestions.push('Style Module still valuable for consistency and themes')
        }
        break

      case 'xlsx':
        if (excelAnalysis.data_type === 'string' && !excelAnalysis.hasRichFormatting) {
          suggestions.push('XLSX Module most beneficial for numeric data and formulas')
        }
        break
    }

    return {
      compatible: issues.length === 0,
      issues,
      suggestions
    }
  }

  /**
   * Creates batch selections for multiple columns
   * Optimizes for performance when processing multiple mappings
   */
  selectOptimalModuleBatch(
    analyses: ExcelColumnAnalysis[],
    context?: {
      documentType: 'report' | 'letter' | 'invoice' | 'generic'
      optimizeForConsistency?: boolean
      preferredModule?: PremiumModuleType
    }
  ): ModuleSelectionResult[] {
    
    const results = analyses.map(analysis => 
      this.selectOptimalModule(analysis, undefined, context)
    )

    // Optimize for consistency if requested
    if (context?.optimizeForConsistency) {
      return this.optimizeForConsistency(results)
    }

    return results
  }

  // Private helper methods

  private assessFunctionalNecessity(
    excelAnalysis: ExcelColumnAnalysis,
    wordAnalysis?: WordSelectionAnalysis
  ): { required: boolean; module: PremiumModuleType; reasoning: string; benefit: string } {
    
    // Images are functionally required
    if (excelAnalysis.hasImages) {
      return {
        required: true,
        module: 'image',
        reasoning: 'Image content detected - Image Module required for proper rendering',
        benefit: 'Automatic image processing, scaling, and optimization'
      }
    }

    // HTML content functionally benefits from HTML Module
    if (excelAnalysis.hasHTML && excelAnalysis.confidenceScore > 0.8) {
      return {
        required: true,
        module: 'html', 
        reasoning: 'Rich HTML content detected - HTML Module ensures proper formatting',
        benefit: 'Perfect HTML to Word conversion preserving all formatting'
      }
    }

    // Complex formatting in Word selection
    if (wordAnalysis?.hasComplexFormatting && wordAnalysis.containsTables) {
      return {
        required: true,
        module: 'html',
        reasoning: 'Complex document structure requires HTML Module capabilities',
        benefit: 'Maintains table structure and complex layouts'
      }
    }

    return { required: false, module: 'text', reasoning: '', benefit: '' }
  }

  private assessQualityEnhancement(
    excelAnalysis: ExcelColumnAnalysis,
    wordAnalysis?: WordSelectionAnalysis
  ): { recommended: boolean; module: PremiumModuleType; secondary?: PremiumModuleType; reasoning: string; benefit: string; valueScore: number } {
    
    // Style Module for formatting enhancement
    if (excelAnalysis.hasRichFormatting || (wordAnalysis?.styleEnhancementOpportunity ?? 0) > 0.6) {
      return {
        recommended: true,
        module: 'style',
        reasoning: 'Rich formatting detected - Style Module will significantly enhance visual quality',
        benefit: 'Professional styling, conditional formatting, and theme consistency',
        valueScore: 8
      }
    }

    // HTML Module for moderate complexity
    if (excelAnalysis.hasHTML && excelAnalysis.complexityLevel === 'moderate') {
      return {
        recommended: true,
        module: 'html',
        secondary: excelAnalysis.hasRichFormatting ? 'style' : undefined,
        reasoning: 'Moderate HTML complexity benefits from specialized processing',
        benefit: 'Clean HTML conversion with preserved semantic structure',
        valueScore: 7
      }
    }

    // Image Module for image placeholders
    if (wordAnalysis?.imageReplacementPotential ?? 0 > 0.5) {
      return {
        recommended: true,
        module: 'image',
        reasoning: 'Image placeholders detected - Image Module enables dynamic replacement',
        benefit: 'Dynamic image insertion with perfect positioning',
        valueScore: 7
      }
    }

    return { recommended: false, module: 'text', reasoning: '', benefit: '', valueScore: 0 }
  }

  private assessTimeSavings(
    excelAnalysis: ExcelColumnAnalysis,
    wordAnalysis?: WordSelectionAnalysis,
    context?: any
  ): { worthwhile: boolean; module: PremiumModuleType; reasoning: string; benefit: string; valueScore: number } {
    
    // Style Module saves time on formatting
    if (excelAnalysis.estimatedTimesSaved >= 5 && excelAnalysis.hasRichFormatting) {
      return {
        worthwhile: true,
        module: 'style',
        reasoning: `Estimated ${excelAnalysis.estimatedTimesSaved} minutes saved per document`,
        benefit: 'Automated styling eliminates manual formatting work',
        valueScore: 6
      }
    }

    // HTML Module for content with multiple formats
    if (excelAnalysis.hasHTML && excelAnalysis.estimatedTimesSaved >= 3) {
      return {
        worthwhile: true,
        module: 'html', 
        reasoning: 'HTML processing automation saves manual conversion time',
        benefit: 'Eliminates need for manual HTML to Word formatting',
        valueScore: 5
      }
    }

    return { worthwhile: false, module: 'text', reasoning: '', benefit: '', valueScore: 0 }
  }

  private createModuleResult(
    module: PremiumModuleType,
    reasoning: string,
    valueScore: number,
    confidenceLevel: 'high' | 'medium' | 'low',
    benefit: string,
    column: string,
    secondary?: PremiumModuleType
  ): ModuleSelectionResult {
    
    const syntaxGenerated = this.generatePremiumSyntax({ column, moduleType: module })
    
    return {
      primary: module,
      secondary,
      reasoning,
      valueScore,
      confidenceLevel,
      estimatedBenefit: benefit,
      moduleInvestment: this.MODULE_COSTS[module],
      syntaxGenerated
    }
  }

  private generateStyleString(styleConfig?: StyleConfiguration): string {
    if (!styleConfig) {
      return 'font-weight:bold;color:#2563eb' // Default professional blue bold
    }

    const styles: string[] = []
    
    if (styleConfig.backgroundColor) styles.push(`background-color:${styleConfig.backgroundColor}`)
    if (styleConfig.textColor) styles.push(`color:${styleConfig.textColor}`)
    if (styleConfig.fontSize) styles.push(`font-size:${styleConfig.fontSize}pt`)
    if (styleConfig.fontFamily) styles.push(`font-family:${styleConfig.fontFamily}`)
    if (styleConfig.bold) styles.push('font-weight:bold')
    if (styleConfig.italic) styles.push('font-style:italic')
    if (styleConfig.underline) styles.push('text-decoration:underline')
    if (styleConfig.textAlign) styles.push(`text-align:${styleConfig.textAlign}`)

    return styles.join(';')
  }

  private optimizeForConsistency(results: ModuleSelectionResult[]): ModuleSelectionResult[] {
    // Find most common module type
    const moduleCounts = results.reduce((counts, result) => {
      counts[result.primary] = (counts[result.primary] || 0) + 1
      return counts
    }, {} as Record<PremiumModuleType, number>)

    const mostCommonModule = Object.entries(moduleCounts)
      .sort(([,a], [,b]) => b - a)[0][0] as PremiumModuleType

    // Only apply consistency if it doesn't harm functionality
    return results.map(result => {
      if (result.primary === 'text' && result.valueScore < 7) {
        // Can safely change low-value text mappings to common module
        return { ...result, primary: mostCommonModule }
      }
      return result
    })
  }
}

// Export singleton instance
export const intelligentModuleSelector = new IntelligentModuleSelector()