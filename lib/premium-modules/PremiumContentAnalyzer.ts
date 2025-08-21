// lib/premium-modules/PremiumContentAnalyzer.ts
// TEXTAMI PREMIUM MODULES - Content Analysis Engine
// Analyzes Excel + Word content to determine optimal Premium Module usage

export interface ExcelColumnAnalysis {
  column: string
  header: string
  sample_data: any[]
  data_type: 'string' | 'number' | 'date' | 'boolean'
  
  // Premium Module Detection
  hasImages: boolean           // → Image Module €250
  hasHTML: boolean            // → HTML Module €250  
  hasRichFormatting: boolean  // → Style Module €500
  complexityLevel: 'simple' | 'moderate' | 'advanced'
  suggestedModule: 'html' | 'image' | 'style' | 'text'
  confidenceScore: number     // 0-1 confidence in suggestion
  
  // Performance Benefits
  estimatedTimesSaved: number
  qualityImprovement: number
}

export interface WordSelectionAnalysis {
  text: string
  start: number
  end: number
  paragraphId: string
  
  // Premium Module Opportunities
  existingStyles: WordStyle[]
  hasComplexFormatting: boolean
  containsLists: boolean
  containsTables: boolean
  isImagePlaceholder: boolean
  
  // Enhancement Opportunities
  styleEnhancementOpportunity: number  // 0-1 score
  htmlConversionBenefit: number        // 0-1 score
  imageReplacementPotential: number    // 0-1 score
}

export interface WordStyle {
  type: 'paragraph' | 'character' | 'table' | 'list'
  name: string
  properties: {
    fontSize?: number
    fontFamily?: string
    color?: string
    backgroundColor?: string
    bold?: boolean
    italic?: boolean
    underline?: boolean
  }
}

export interface PremiumOpportunity {
  type: 'image' | 'html' | 'style'
  location: string
  benefit: string
  estimatedValue: number  // €250, €500, etc.
  implementationComplexity: 'low' | 'medium' | 'high'
}

export class PremiumContentAnalyzer {
  
  /**
   * Analyzes Excel column data to detect Premium Module opportunities
   * AUTOMATIC AND TRANSPARENT - User never sees this analysis
   */
  analyzeExcelColumn(column: {
    column: string
    header: string
    sample_data: any[]
    data_type: 'string' | 'number' | 'date' | 'boolean'
  }): ExcelColumnAnalysis {
    
    // Detect images in sample data
    const hasImages = this.detectImages(column.sample_data)
    
    // Detect HTML content
    const hasHTML = this.detectHTML(column.sample_data)
    
    // Detect rich formatting needs
    const hasRichFormatting = this.detectRichFormatting(column.sample_data)
    
    // Calculate complexity
    const complexityLevel = this.calculateComplexity(hasImages, hasHTML, hasRichFormatting)
    
    // Suggest optimal Premium Module
    const { suggestedModule, confidenceScore } = this.suggestOptimalModule(
      hasImages, 
      hasHTML, 
      hasRichFormatting,
      column.data_type
    )
    
    // Calculate benefits
    const estimatedTimesSaved = this.calculateTimeSavings(suggestedModule, complexityLevel)
    const qualityImprovement = this.calculateQualityImprovement(suggestedModule)
    
    return {
      ...column,
      hasImages,
      hasHTML,
      hasRichFormatting,
      complexityLevel,
      suggestedModule,
      confidenceScore,
      estimatedTimesSaved,
      qualityImprovement
    }
  }

  /**
   * Analyzes Word document structure and content
   */
  analyzeWordDocument(htmlContent: string): {
    paragraphStructure: Map<string, WordSelectionAnalysis>
    overallComplexity: 'simple' | 'moderate' | 'advanced'
    premiumOpportunities: PremiumOpportunity[]
    estimatedModuleValue: number
  } {
    
    const paragraphStructure = new Map<string, WordSelectionAnalysis>()
    const premiumOpportunities: PremiumOpportunity[] = []
    
    // Parse HTML content into paragraphs
    const paragraphs = this.extractParagraphs(htmlContent)
    
    paragraphs.forEach((paragraph, index) => {
      const paragraphId = `p-${index}-${Date.now()}`
      
      const analysis: WordSelectionAnalysis = {
        text: paragraph.text,
        start: paragraph.start,
        end: paragraph.end,
        paragraphId,
        existingStyles: this.extractStyles(paragraph.html),
        hasComplexFormatting: this.hasComplexFormatting(paragraph.html),
        containsLists: this.containsLists(paragraph.html),
        containsTables: this.containsTables(paragraph.html),
        isImagePlaceholder: this.isImagePlaceholder(paragraph.text),
        styleEnhancementOpportunity: this.calculateStyleOpportunity(paragraph.html),
        htmlConversionBenefit: this.calculateHTMLBenefit(paragraph.html),
        imageReplacementPotential: this.calculateImagePotential(paragraph.text)
      }
      
      paragraphStructure.set(paragraphId, analysis)
      
      // Detect Premium Module opportunities
      this.detectPremiumOpportunities(analysis, premiumOpportunities)
    })
    
    const overallComplexity = this.calculateOverallComplexity(paragraphStructure)
    const estimatedModuleValue = this.calculateTotalModuleValue(premiumOpportunities)
    
    return {
      paragraphStructure,
      overallComplexity,
      premiumOpportunities,
      estimatedModuleValue
    }
  }

  /**
   * Detects image content in Excel data
   * Triggers Image Module €250 usage
   */
  private detectImages(sampleData: any[]): boolean {
    return sampleData.some(data => {
      if (typeof data !== 'string') return false
      
      // Common image patterns
      const imagePatterns = [
        /\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i,  // File extensions
        /^data:image\//i,                       // Base64 images
        /https?:\/\/.*\.(jpg|jpeg|png|gif)/i,   // Image URLs
        /image/i,                               // Contains "image"
        /photo/i,                               // Contains "photo"
        /logo/i                                 // Contains "logo"
      ]
      
      return imagePatterns.some(pattern => pattern.test(data))
    })
  }

  /**
   * Detects HTML content in Excel data
   * Triggers HTML Module €250 usage
   */
  private detectHTML(sampleData: any[]): boolean {
    return sampleData.some(data => {
      if (typeof data !== 'string') return false
      
      // HTML patterns
      const htmlPatterns = [
        /<[^>]+>/,                    // HTML tags
        /&[a-zA-Z]+;/,               // HTML entities
        /<(p|div|span|h[1-6]|ul|ol|li|table|tr|td|th|strong|em|b|i|u)/i,
        /style\s*=\s*["'][^"']*["']/i // Inline styles
      ]
      
      return htmlPatterns.some(pattern => pattern.test(data))
    })
  }

  /**
   * Detects rich formatting needs
   * Triggers Style Module €500 usage
   */
  private detectRichFormatting(sampleData: any[]): boolean {
    return sampleData.some(data => {
      if (typeof data !== 'string') return false
      
      // Rich formatting indicators
      const formattingPatterns = [
        /\*\*.*\*\*/,                // Bold markdown
        /\*.*\*/,                    // Italic markdown
        /__.*__/,                    // Underline markdown
        /color:|background:/i,       // CSS properties
        /font-/i,                    // Font properties
        /\n\n/,                      // Multiple line breaks
        /^\s*[-*+]\s/m,             // List items
        /^\s*\d+\.\s/m              // Numbered lists
      ]
      
      return formattingPatterns.some(pattern => pattern.test(data))
    })
  }

  /**
   * Suggests optimal Premium Module based on content analysis
   * PRIORITY: Functional need > Professional quality > Time savings
   */
  private suggestOptimalModule(
    hasImages: boolean,
    hasHTML: boolean, 
    hasRichFormatting: boolean,
    dataType: string
  ): { suggestedModule: 'html' | 'image' | 'style' | 'text', confidenceScore: number } {
    
    // 1. FUNCTIONAL NECESSITY (Priority 1)
    if (hasImages) {
      return { suggestedModule: 'image', confidenceScore: 0.95 }  // €250 - REQUIRED
    }
    
    if (hasHTML) {
      return { suggestedModule: 'html', confidenceScore: 0.90 }   // €250 - REQUIRED
    }
    
    // 2. PROFESSIONAL QUALITY (Priority 2)
    if (hasRichFormatting) {
      return { suggestedModule: 'style', confidenceScore: 0.80 }  // €500 - ENHANCES
    }
    
    // 3. TIME SAVINGS (Priority 3) 
    if (dataType === 'string' && hasRichFormatting) {
      return { suggestedModule: 'style', confidenceScore: 0.60 }  // €500 - SAVES TIME
    }
    
    // 4. DEFAULT - Simple text
    return { suggestedModule: 'text', confidenceScore: 0.95 }     // €0 - RELIABLE
  }

  private calculateComplexity(
    hasImages: boolean, 
    hasHTML: boolean, 
    hasRichFormatting: boolean
  ): 'simple' | 'moderate' | 'advanced' {
    const complexityScore = 
      (hasImages ? 2 : 0) + 
      (hasHTML ? 2 : 0) + 
      (hasRichFormatting ? 1 : 0)
    
    if (complexityScore >= 4) return 'advanced'
    if (complexityScore >= 2) return 'moderate'
    return 'simple'
  }

  private calculateTimeSavings(
    module: 'html' | 'image' | 'style' | 'text',
    complexity: 'simple' | 'moderate' | 'advanced'
  ): number {
    const baseSavings = {
      'html': 5,    // 5 minutes saved per HTML conversion
      'image': 3,   // 3 minutes saved per image processing
      'style': 7,   // 7 minutes saved per style application
      'text': 0     // No time savings for simple text
    }
    
    const complexityMultiplier = {
      'simple': 1,
      'moderate': 1.5,
      'advanced': 2.5
    }
    
    return baseSavings[module] * complexityMultiplier[complexity]
  }

  private calculateQualityImprovement(
    module: 'html' | 'image' | 'style' | 'text'
  ): number {
    // Quality improvement score 0-10
    const qualityScores = {
      'html': 8,    // Significant improvement for rich content
      'image': 9,   // Major improvement for images
      'style': 10,  // Maximum improvement for styling
      'text': 5     // Basic quality
    }
    
    return qualityScores[module]
  }

  // Helper methods for Word document analysis
  private extractParagraphs(htmlContent: string): Array<{text: string, start: number, end: number, html: string}> {
    // Implementation would parse HTML and extract paragraph information
    // For now, basic implementation
    const paragraphs: Array<{text: string, start: number, end: number, html: string}> = []
    
    // Basic regex to find paragraph-like content
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi
    let match
    let currentPos = 0
    
    while ((match = paragraphRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0]
      const text = match[1].replace(/<[^>]*>/g, '') // Strip HTML tags for text
      
      paragraphs.push({
        text,
        start: currentPos,
        end: currentPos + text.length,
        html: fullMatch
      })
      
      currentPos += text.length
    }
    
    return paragraphs
  }

  private extractStyles(html: string): WordStyle[] {
    // Extract style information from HTML
    const styles: WordStyle[] = []
    
    // Basic style extraction - would be more sophisticated in real implementation
    if (html.includes('font-weight: bold') || html.includes('<b>') || html.includes('<strong>')) {
      styles.push({
        type: 'character',
        name: 'Bold',
        properties: { bold: true }
      })
    }
    
    if (html.includes('font-style: italic') || html.includes('<i>') || html.includes('<em>')) {
      styles.push({
        type: 'character', 
        name: 'Italic',
        properties: { italic: true }
      })
    }
    
    return styles
  }

  private hasComplexFormatting(html: string): boolean {
    return html.includes('style=') || 
           html.includes('<table>') || 
           html.includes('<ul>') || 
           html.includes('<ol>')
  }

  private containsLists(html: string): boolean {
    return html.includes('<ul>') || html.includes('<ol>')
  }

  private containsTables(html: string): boolean {
    return html.includes('<table>')
  }

  private isImagePlaceholder(text: string): boolean {
    const imagePlaceholders = [
      /\[image\]/i,
      /\[img\]/i, 
      /\[photo\]/i,
      /\[picture\]/i,
      /{image}/i,
      /{img}/i
    ]
    
    return imagePlaceholders.some(pattern => pattern.test(text))
  }

  private calculateStyleOpportunity(html: string): number {
    let score = 0
    
    // More complex content = higher style opportunity
    if (html.includes('<h1>') || html.includes('<h2>')) score += 0.3
    if (html.includes('style=')) score += 0.4
    if (html.includes('<table>')) score += 0.5
    if (html.includes('<ul>') || html.includes('<ol>')) score += 0.2
    
    return Math.min(score, 1.0) // Cap at 1.0
  }

  private calculateHTMLBenefit(html: string): number {
    let score = 0
    
    // HTML tags indicate benefit from HTML Module
    const htmlTags = (html.match(/<[^>]+>/g) || []).length
    score = Math.min(htmlTags * 0.1, 1.0)
    
    return score
  }

  private calculateImagePotential(text: string): number {
    if (this.isImagePlaceholder(text)) return 1.0
    
    const imageKeywords = ['image', 'photo', 'picture', 'logo', 'diagram', 'chart']
    const keywordCount = imageKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length
    
    return Math.min(keywordCount * 0.3, 1.0)
  }

  private detectPremiumOpportunities(
    analysis: WordSelectionAnalysis, 
    opportunities: PremiumOpportunity[]
  ): void {
    
    // Image opportunities
    if (analysis.imageReplacementPotential > 0.7) {
      opportunities.push({
        type: 'image',
        location: analysis.paragraphId,
        benefit: 'Dynamic image insertion with auto-scaling',
        estimatedValue: 250,
        implementationComplexity: 'low'
      })
    }
    
    // HTML opportunities  
    if (analysis.htmlConversionBenefit > 0.6) {
      opportunities.push({
        type: 'html',
        location: analysis.paragraphId,
        benefit: 'Rich content formatting and structure',
        estimatedValue: 250,
        implementationComplexity: 'medium'
      })
    }
    
    // Style opportunities
    if (analysis.styleEnhancementOpportunity > 0.5) {
      opportunities.push({
        type: 'style',
        location: analysis.paragraphId,
        benefit: 'Dynamic styling and theme control',
        estimatedValue: 500,
        implementationComplexity: 'medium'
      })
    }
  }

  private calculateOverallComplexity(
    paragraphStructure: Map<string, WordSelectionAnalysis>
  ): 'simple' | 'moderate' | 'advanced' {
    
    const analyses = Array.from(paragraphStructure.values())
    
    const complexityScore = analyses.reduce((score, analysis) => {
      if (analysis.hasComplexFormatting) score += 2
      if (analysis.containsLists) score += 1
      if (analysis.containsTables) score += 2
      if (analysis.isImagePlaceholder) score += 1
      return score
    }, 0)
    
    const averageComplexity = complexityScore / analyses.length
    
    if (averageComplexity >= 3) return 'advanced'
    if (averageComplexity >= 1.5) return 'moderate'
    return 'simple'
  }

  private calculateTotalModuleValue(opportunities: PremiumOpportunity[]): number {
    return opportunities.reduce((total, opportunity) => total + opportunity.estimatedValue, 0)
  }
}

// Export singleton instance
export const premiumContentAnalyzer = new PremiumContentAnalyzer()