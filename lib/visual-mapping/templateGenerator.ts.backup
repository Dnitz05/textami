// lib/visual-mapping/templateGenerator.ts
// TEXTAMI PHASE 2 - SIMPLIFIED TEMPLATE GENERATION ENGINE
// FOCUS: Core functionality, no animations, no collaboration
// MAX: 400 lines - ESSENTIAL ONLY

import { createServerSupabaseClient } from '@/lib/supabase/serverClient'
import { createDocxtemplater } from '@/lib/docxtemplater/config'

interface GenerationOptions {
  templateId: string
  outputFormat: 'docx' | 'pdf'
  excelData: Record<string, any>[]
  visualMappings: VisualMapping[]
  wordContent: string
  filename?: string
}

interface GenerationResult {
  success: boolean
  fileUrl?: string
  filename: string
  format: string
  size: number
  generatedAt: Date
  statistics: {
    totalDocuments: number
    roiValue: number
    processingTime: number
  }
  error?: string
}

interface VisualMapping {
  id: string
  excelColumn: {
    name: string
    type: string
  }
  wordSelection: {
    text: string
    paragraphId: string
    styling?: Record<string, string>
  }
  mappingType: 'text' | 'html' | 'image' | 'style'
  generatedVariableName: string
  generatedSyntax: string
  docxtemplaterModule: string
  moduleValue: number
}

// Premium Module values for ROI tracking
const PREMIUM_MODULE_VALUES = {
  text: 0,    // Base module (free)
  html: 250,  // HTML Module
  image: 250, // Image Module
  style: 500  // Style Module
}

export class TemplateGenerator {
  private supabase = createServerSupabaseClient()

  /**
   * Main generation method - SIMPLIFIED VERSION
   * Converts visual mappings to final documents
   */
  async generateDocuments(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Starting document generation for template: ${options.templateId}`)
      
      // 1. Validate inputs (basic validation only)
      const validation = this.validateInputs(options)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.error}`)
      }

      // 2. Process Excel data according to mappings
      const processedData = this.processExcelData(options.excelData, options.visualMappings)
      console.log(`Processed ${processedData.length} rows of Excel data`)

      // 3. Create DOCX template from Word content + visual mappings
      const docxTemplate = await this.createDocxTemplate(options.wordContent, options.visualMappings)

      // 4. Generate documents (batch process for all Excel rows)
      const documents = await this.batchGenerate(docxTemplate, processedData)
      console.log(`Generated ${documents.length} documents`)

      // 5. Convert to requested format (DOCX or PDF only)
      const finalDocument = await this.convertToFormat(documents, options.outputFormat)

      // 6. Upload to Supabase Storage
      const fileUrl = await this.uploadToStorage(finalDocument, options)

      // 7. Calculate statistics (ROI tracking)
      const statistics = {
        totalDocuments: documents.length,
        roiValue: this.calculateROI(options.visualMappings),
        processingTime: Date.now() - startTime
      }

      console.log(`Generation completed successfully. ROI: €${statistics.roiValue}`)

      return {
        success: true,
        fileUrl,
        filename: options.filename || `generated-${Date.now()}.${options.outputFormat}`,
        format: options.outputFormat,
        size: finalDocument.length,
        generatedAt: new Date(),
        statistics
      }

    } catch (error) {
      console.error('Template generation error:', error)
      
      return {
        success: false,
        filename: '',
        format: options.outputFormat,
        size: 0,
        generatedAt: new Date(),
        statistics: {
          totalDocuments: 0,
          roiValue: 0,
          processingTime: Date.now() - startTime
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Basic input validation - NO COMPLEX VALIDATION
   */
  private validateInputs(options: GenerationOptions): {valid: boolean, error?: string} {
    if (!options.visualMappings || options.visualMappings.length === 0) {
      return { valid: false, error: 'No visual mappings provided' }
    }

    if (!options.excelData || options.excelData.length === 0) {
      return { valid: false, error: 'No Excel data provided' }
    }

    if (!options.wordContent || options.wordContent.trim() === '') {
      return { valid: false, error: 'No Word content provided' }
    }

    return { valid: true }
  }

  /**
   * Process Excel data according to visual mappings
   * Convert Excel values to format expected by Docxtemplater
   */
  private processExcelData(
    excelData: Record<string, any>[], 
    mappings: VisualMapping[]
  ): Record<string, any>[] {
    
    return excelData.map(row => {
      const processedRow: Record<string, any> = {}
      
      mappings.forEach(mapping => {
        const excelValue = row[mapping.excelColumn.name]
        const variableName = mapping.generatedVariableName
        
        // Process value based on Premium Module type
        processedRow[variableName] = this.processValueByType(
          excelValue, 
          mapping.mappingType,
          mapping.wordSelection.styling
        )
      })
      
      return processedRow
    })
  }

  /**
   * Process individual values based on Premium Module type
   * SIMPLIFIED - No complex processing
   */
  private processValueByType(
    value: any, 
    mappingType: string, 
    styling?: Record<string, string>
  ): any {
    
    switch (mappingType) {
      case 'html':
        // HTML Module (€250) - Basic HTML processing
        if (typeof value === 'string' && value.includes('<')) {
          return value // Already HTML
        }
        return String(value || '')
        
      case 'image':
        // Image Module (€250) - Basic image processing
        if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
          return { url: value, width: 200, height: 150 }
        }
        return { url: '', width: 200, height: 150 } // Empty image
        
      case 'style':
        // Style Module (€500) - Basic styled text
        const styleString = styling ? this.buildStyleString(styling) : ''
        return { text: String(value || ''), style: styleString }
        
      default:
        // Text Module (free) - Simple text
        return String(value || '')
    }
  }

  /**
   * Create DOCX template by replacing visual placeholders with Docxtemplater syntax
   */
  private async createDocxTemplate(
    wordContent: string, 
    mappings: VisualMapping[]
  ): Promise<Buffer> {
    
    let templateContent = wordContent
    
    // Replace visual mapping placeholders with Docxtemplater syntax
    mappings.forEach(mapping => {
      const placeholderRegex = new RegExp(
        `<span[^>]*data-mapping-id="${mapping.id}"[^>]*>.*?</span>`, 
        'g'
      )
      
      templateContent = templateContent.replace(
        placeholderRegex, 
        mapping.generatedSyntax
      )
    })

    // Convert HTML to DOCX buffer (simplified)
    // In real implementation, use proper HTML-to-DOCX converter
    return Buffer.from(templateContent)
  }

  /**
   * Generate documents in batch for all Excel rows
   * SIMPLIFIED - Basic error handling only
   */
  private async batchGenerate(
    templateBuffer: Buffer,
    processedData: Record<string, any>[]
  ): Promise<Buffer[]> {
    
    const documents: Buffer[] = []
    
    for (let i = 0; i < processedData.length; i++) {
      const rowData = processedData[i]
      
      try {
        // Create Docxtemplater instance with Premium Modules
        const doc = createDocxtemplater(templateBuffer)
        
        // Render with row data
        doc.render(rowData)
        
        // Generate buffer
        const buffer = doc.getZip().generate({ 
          type: 'nodebuffer',
          compression: 'DEFLATE'
        })
        
        documents.push(buffer)
        
      } catch (error) {
        console.error(`Error generating document ${i + 1}:`, error)
        // Continue with other documents - no complex error handling
      }
    }
    
    return documents
  }

  /**
   * Convert documents to requested format
   * SIMPLIFIED - Only DOCX and PDF, no ZIP archives
   */
  private async convertToFormat(
    documents: Buffer[], 
    format: string
  ): Promise<Buffer> {
    
    if (documents.length === 0) {
      throw new Error('No documents generated')
    }

    switch (format) {
      case 'docx':
        // Return first document (simplified - no multi-document handling)
        return documents[0]
        
      case 'pdf':
        // Convert DOCX to PDF (simplified)
        // In real implementation, use proper DOCX-to-PDF converter
        return documents[0] // Mock for now
        
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Upload generated document to Supabase Storage
   * SIMPLIFIED - Basic upload only
   */
  private async uploadToStorage(
    documentBuffer: Buffer, 
    options: GenerationOptions
  ): Promise<string> {
    
    const timestamp = Date.now()
    const filename = options.filename || 
      `generated-${options.templateId}-${timestamp}.${options.outputFormat}`
    
    const { data, error } = await this.supabase.storage
      .from('generated-documents')
      .upload(`templates/${filename}`, documentBuffer, {
        contentType: this.getContentType(options.outputFormat),
        cacheControl: '3600'
      })
    
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`)
    }
    
    const { data: urlData } = this.supabase.storage
      .from('generated-documents')
      .getPublicUrl(data.path)
    
    return urlData.publicUrl
  }

  /**
   * Calculate ROI value for Premium Modules usage
   * SIMPLIFIED - Basic calculation only
   */
  private calculateROI(mappings: VisualMapping[]): number {
    return mappings.reduce((sum, mapping) => {
      const moduleValue = PREMIUM_MODULE_VALUES[mapping.docxtemplaterModule as keyof typeof PREMIUM_MODULE_VALUES]
      return sum + (moduleValue || 0)
    }, 0)
  }

  /**
   * Build CSS style string from captured styling
   * SIMPLIFIED - Basic styles only
   */
  private buildStyleString(styling: Record<string, string>): string {
    return Object.entries(styling)
      .map(([property, value]) => `${property}:${value}`)
      .join(';')
  }

  /**
   * Get content type for file format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'docx': 
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case 'pdf': 
        return 'application/pdf'
      default: 
        return 'application/octet-stream'
    }
  }
}

// Export singleton instance
export const templateGenerator = new TemplateGenerator()