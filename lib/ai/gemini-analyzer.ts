/**
 * Google Gemini Analyzer
 * 
 * Alternative AI analyzer using Google Gemini for Google Docs HTML content.
 * May provide better accuracy with HTML-structured content than OpenAI.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseGoogleDocsHTML, ParsedDocument } from '../google/html-parser';
import { cleanGoogleDocsHTML } from '../google/html-cleaner';
import { mapGoogleDocsStyles } from '../google/style-mapper';
import { log } from '../logger';
import { 
  GoogleDocsAnalysisResult, 
  AnalyzedPlaceholder, 
  GoogleDocsAnalysisOptions,
  DocumentSection,
  DocumentTable,
  DocumentSignature,
  AnalysisMetadata
} from './google-docs-analyzer';

export interface GeminiAnalysisOptions extends GoogleDocsAnalysisOptions {
  model?: 'gemini-pro' | 'gemini-pro-vision';
  temperature?: number;
  maxOutputTokens?: number;
  useStructuredPrompting?: boolean;
}

const DEFAULT_GEMINI_OPTIONS: Required<GeminiAnalysisOptions> = {
  templateId: '',
  fileName: 'Google Doc',
  performAIAnalysis: true,
  cleanHtml: true,
  mapStyles: true,
  minPlaceholderConfidence: 0.7,
  detectSignatures: true,
  model: 'gemini-pro',
  temperature: 0.2,
  maxOutputTokens: 2048,
  useStructuredPrompting: true,
};

/**
 * Gemini-powered Google Docs analyzer
 */
export class GeminiDocsAnalyzer {
  private genAI: GoogleGenerativeAI | null = null;
  private options: Required<GeminiAnalysisOptions>;

  constructor(options: GeminiAnalysisOptions = {}) {
    this.options = { ...DEFAULT_GEMINI_OPTIONS, ...options };
    
    // Generate template ID if not provided
    if (!this.options.templateId) {
      this.options.templateId = `gemini_docs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Initialize Gemini client if API key is available
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    }
  }

  /**
   * Check if Gemini is available
   */
  public isAvailable(): boolean {
    return this.genAI !== null;
  }

  /**
   * Analyze Google Docs HTML content using Gemini
   */
  public async analyze(html: string): Promise<GoogleDocsAnalysisResult> {
    const startTime = Date.now();
    
    log.debug('🔍 Starting Gemini Google Docs analysis', {
      templateId: this.options.templateId,
      htmlLength: html.length,
      fileName: this.options.fileName,
      model: this.options.model,
      geminiAvailable: this.isAvailable(),
    });

    try {
      // Step 1: Clean HTML
      let cleanedHtml = html;
      let cleaningResult: AnalysisMetadata['cleaningResult'] | undefined;

      if (this.options.cleanHtml) {
        const cleaningRes = cleanGoogleDocsHTML(html, {
          preserveFormatting: true,
          convertToSemantic: true,
          removeEmptyElements: true,
          normalizeWhitespace: true,
        });
        
        cleanedHtml = cleaningRes.cleanedHtml;
        cleaningResult = {
          removedElements: cleaningRes.removedElements,
          preservedStyles: cleaningRes.preservedStyles,
          warnings: cleaningRes.warnings,
        };
      }

      // Step 2: Map styles
      let semanticHtml = cleanedHtml;
      
      if (this.options.mapStyles) {
        const styleMapping = mapGoogleDocsStyles(cleanedHtml, {
          convertHeadings: true,
          detectEmphasis: true,
          minimizeInlineStyles: true,
          semanticPriority: 'high',
        });
        
        semanticHtml = styleMapping.semanticHTML;
        
        if (cleaningResult) {
          cleaningResult.warnings.push(...styleMapping.warnings);
        }
      }

      // Step 3: Parse HTML structure
      const parsedDoc = parseGoogleDocsHTML(semanticHtml, {
        extractPlaceholders: false, // We'll use Gemini for this
        analyzeFormatting: true,
      });

      // Step 4: Extract basic structure
      const sections = this.extractSections(parsedDoc);
      const tables = this.extractTables(parsedDoc);
      const signatura = this.options.detectSignatures
        ? this.extractSignature(parsedDoc)
        : undefined;

      // Step 5: Perform Gemini analysis
      let placeholders: AnalyzedPlaceholder[] = [];
      let analysisConfidence = 85;

      if (this.options.performAIAnalysis && this.isAvailable()) {
        const geminiResults = await this.performGeminiAnalysis(semanticHtml, parsedDoc);
        placeholders = geminiResults.placeholders;
        analysisConfidence = geminiResults.confidence;
      } else if (this.options.performAIAnalysis) {
        log.warn('⚠️ Gemini analysis requested but API key not available, using basic extraction');
        placeholders = this.extractBasicPlaceholders(parsedDoc);
      }

      // Step 6: Generate metadata
      const processingTimeMs = Date.now() - startTime;
      const metadata: AnalysisMetadata = {
        extractionMethod: 'gemini-google-docs-hybrid',
        processingTimeMs,
        elementsFound: {
          sections: sections.length,
          tables: tables.length,
          signatures: signatura ? 1 : 0,
          paragraphs: parsedDoc.structure.paragraphs.length,
        },
        htmlLength: html.length,
        textLength: parsedDoc.content.text.length,
        sourceType: 'google-docs',
        cleaningResult,
      };

      // Step 7: Build result
      const result: GoogleDocsAnalysisResult = {
        templateId: this.options.templateId,
        fileName: this.options.fileName,
        transcription: semanticHtml,
        markdown: parsedDoc.content.text,
        sections,
        tables,
        placeholders,
        signatura,
        confidence: analysisConfidence,
        metadata,
      };

      log.debug('✅ Gemini Google Docs analysis complete', {
        templateId: this.options.templateId,
        placeholdersFound: placeholders.length,
        sectionsFound: sections.length,
        tablesFound: tables.length,
        processingTimeMs,
        geminiUsed: this.isAvailable(),
      });

      return result;

    } catch (error) {
      log.error('❌ Gemini Google Docs analysis failed:', error);
      throw new Error(`Gemini analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform AI analysis using Gemini
   */
  private async performGeminiAnalysis(html: string, parsedDoc: ParsedDocument): Promise<{
    placeholders: AnalyzedPlaceholder[];
    confidence: number;
  }> {
    if (!this.genAI) {
      throw new Error('Gemini client not initialized');
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.options.model,
        generationConfig: {
          temperature: this.options.temperature,
          maxOutputTokens: this.options.maxOutputTokens,
        }
      });

      const prompt = this.buildGeminiPrompt(html, parsedDoc);
      
      log.debug('🤖 Running Gemini analysis', {
        model: this.options.model,
        promptLength: prompt.length,
        useStructured: this.options.useStructuredPrompting,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text) {
        return { placeholders: [], confidence: 50 };
      }

      // Parse JSON response
      let parsed: { placeholders: any[]; confidence?: number };
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = JSON.parse(text);
        }
      } catch (parseError) {
        log.warn('⚠️ Failed to parse Gemini JSON response, using fallback:', parseError);
        return { placeholders: [], confidence: 60 };
      }

      // Transform to our format
      const placeholders: AnalyzedPlaceholder[] = (parsed.placeholders || [])
        .filter((p: any) => p.confidence >= this.options.minPlaceholderConfidence)
        .map((p: any) => ({
          text: p.text || '',
          variable: p.variable || this.generateVariableName(p.text || ''),
          confidence: p.confidence || 70,
          context: p.context || '',
          type: this.mapPlaceholderType(p.type || 'text'),
        }));

      const confidence = parsed.confidence || this.calculateConfidence(placeholders, parsedDoc);

      log.debug('✅ Gemini analysis complete', {
        placeholdersFound: placeholders.length,
        averageConfidence: placeholders.length > 0 
          ? placeholders.reduce((sum, p) => sum + p.confidence, 0) / placeholders.length 
          : 0,
        overallConfidence: confidence,
      });

      return { placeholders, confidence };

    } catch (error) {
      log.error('❌ Gemini API call failed:', error);
      // Fallback to basic extraction
      return {
        placeholders: this.extractBasicPlaceholders(parsedDoc),
        confidence: 65,
      };
    }
  }

  /**
   * Build optimized prompt for Gemini
   */
  private buildGeminiPrompt(html: string, parsedDoc: ParsedDocument): string {
    const textContent = parsedDoc.content.text;
    
    if (this.options.useStructuredPrompting) {
      return this.buildStructuredPrompt(html, textContent, parsedDoc);
    } else {
      return this.buildSimplePrompt(textContent);
    }
  }

  /**
   * Build structured prompt with context
   */
  private buildStructuredPrompt(html: string, text: string, parsedDoc: ParsedDocument): string {
    const context = {
      documentType: 'Google Docs HTML',
      hasHeadings: parsedDoc.structure.headings.length > 0,
      hasTables: parsedDoc.structure.tables.length > 0,
      hasFormatting: parsedDoc.metadata.hasFormatting,
      complexity: parsedDoc.metadata.complexity,
      textLength: text.length,
    };

    return `# Document Analysis Task

## Context
You are analyzing HTML content exported from Google Docs. The document has been cleaned and processed to preserve semantic structure.

Document characteristics:
- Type: ${context.documentType}
- Has headings: ${context.hasHeadings}
- Has tables: ${context.hasTables}
- Has formatting: ${context.hasFormatting}
- Complexity: ${context.complexity}
- Text length: ${context.textLength} characters

## Your Task
Analyze this document to identify placeholders, variables, and fields that should be replaced with dynamic data.

## What to Look For
1. **Explicit placeholders**: {{variable}}, [FIELD], __PLACEHOLDER__, <<DATA>>
2. **Pattern placeholders**: Text in ALL CAPS, repeated patterns, template-like content
3. **Formatted content**: Bold, italic, or underlined text that suggests variable content
4. **Data patterns**: Dates (especially placeholder dates), numbers, addresses, names
5. **Form-like content**: Fields after colons, labeled sections, signature blocks

## Confidence Scoring
- 90-100%: Obvious placeholders with clear markers
- 80-89%: Strong formatting or pattern indicators
- 70-79%: Contextual evidence of variable content
- 60-69%: Possible but uncertain placeholders
- Below 60%: Don't include

## Output Format
Return a valid JSON object with this structure:

\`\`\`json
{
  "placeholders": [
    {
      "text": "exact text found in document",
      "variable": "suggested_variable_name",
      "confidence": 85,
      "context": "description of where and why this was identified",
      "type": "text|date|number|currency|email|other"
    }
  ],
  "confidence": 85
}
\`\`\`

## Document Content

${text.substring(0, 4000)}

${text.length > 4000 ? '... (content truncated)' : ''}

Analyze this content and return the JSON response:`;
  }

  /**
   * Build simple prompt for basic analysis
   */
  private buildSimplePrompt(text: string): string {
    return `Analitza aquest text de Google Docs per detectar placeholders i variables amb alta precisió.

Busca:
- Text amb marcadors: {{variable}}, [CAMP], __TEXT__
- Patrons repetitius o text en MAJÚSCULES
- Dates, números, adreces que semblin plantilles
- Text formatejat que indiqui camps variables

Retorna JSON amb aquest format:
{
  "placeholders": [
    {
      "text": "text trobat",
      "variable": "nom_variable",
      "confidence": 85,
      "context": "context on apareix", 
      "type": "text"
    }
  ]
}

Text a analitzar:
${text.substring(0, 3000)}`;
  }

  /**
   * Extract basic placeholders without AI
   */
  private extractBasicPlaceholders(parsedDoc: ParsedDocument): AnalyzedPlaceholder[] {
    const placeholders: AnalyzedPlaceholder[] = [];
    const text = parsedDoc.content.text;

    // Common placeholder patterns
    const patterns = [
      { regex: /\{\{([^}]+)\}\}/g, type: 'text', confidence: 95 },
      { regex: /\[([^\]]+)\]/g, type: 'text', confidence: 90 },
      { regex: /__([^_]+)__/g, type: 'text', confidence: 85 },
      { regex: /<<([^>]+)>>/g, type: 'text', confidence: 90 },
      { regex: /\$\d+(?:\.\d{2})?/g, type: 'currency', confidence: 80 },
      { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, type: 'date', confidence: 75 },
      { regex: /\b[A-Z][A-Z\s]{3,20}\b/g, type: 'text', confidence: 60 },
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        placeholders.push({
          text: match[0],
          variable: this.generateVariableName(match[1] || match[0]),
          confidence: pattern.confidence,
          context: this.getContext(text, match.index, 50),
          type: pattern.type as AnalyzedPlaceholder['type'],
        });
      }
    }

    return placeholders.filter(p => p.confidence >= this.options.minPlaceholderConfidence);
  }

  /**
   * Extract sections from parsed document
   */
  private extractSections(parsedDoc: ParsedDocument): DocumentSection[] {
    return parsedDoc.structure.headings.map((heading, index) => ({
      id: `section_${index}`,
      title: heading.text,
      markdown: `${'#'.repeat(heading.level)} ${heading.text}\n`,
      type: this.mapHeadingType(heading.level),
      level: heading.level,
    }));
  }

  /**
   * Extract tables from parsed document
   */
  private extractTables(parsedDoc: ParsedDocument): DocumentTable[] {
    return parsedDoc.structure.tables.map((table, index) => ({
      id: `table_${index}`,
      title: `Taula ${index + 1}`,
      headers: table.headers || (table.rows[0]?.cells.map(c => c.text) || []),
      rows: table.rows.slice(table.headers ? 0 : 1).map(row => 
        row.cells.map(cell => cell.text)
      ),
      normalized: {},
    }));
  }

  /**
   * Extract signature information
   */
  private extractSignature(parsedDoc: ParsedDocument): DocumentSignature | undefined {
    const text = parsedDoc.content.text.toLowerCase();
    
    const signaturePatterns = [
      /signat\s+per[:\s]+([^,\n]+)/i,
      /firmat\s+per[:\s]+([^,\n]+)/i,
      /signature[:\s]+([^,\n]+)/i,
      /atentament[:\s\n]+([^,\n]+)/i,
    ];

    for (const pattern of signaturePatterns) {
      const match = parsedDoc.content.text.match(pattern);
      if (match) {
        return {
          nom: match[1]?.trim() || '',
          carrec: '',
          data_lloc: match[0],
        };
      }
    }

    return undefined;
  }

  /**
   * Helper methods
   */
  private mapHeadingType(level: number): DocumentSection['type'] {
    switch (level) {
      case 1: return 'title';
      case 2: return 'heading1';
      case 3: return 'heading2';
      default: return 'heading3';
    }
  }

  private mapPlaceholderType(type: string): AnalyzedPlaceholder['type'] {
    switch (type.toLowerCase()) {
      case 'date': return 'date';
      case 'number': return 'number';
      case 'currency': return 'currency';
      case 'email': return 'email';
      default: return 'text';
    }
  }

  private generateVariableName(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  }

  private getContext(text: string, position: number, radius: number): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.slice(start, end).trim();
  }

  private calculateConfidence(placeholders: AnalyzedPlaceholder[], parsedDoc: ParsedDocument): number {
    let confidence = 80;

    if (placeholders.length > 0) {
      const avgPlaceholderConfidence = placeholders.reduce((sum, p) => sum + p.confidence, 0) / placeholders.length;
      confidence = (confidence + avgPlaceholderConfidence) / 2;
    }

    if (parsedDoc.metadata.hasFormatting) confidence += 5;
    if (parsedDoc.metadata.complexity === 'complex') confidence -= 5;

    return Math.min(100, Math.max(50, Math.round(confidence)));
  }
}

/**
 * Factory function
 */
export function createGeminiAnalyzer(options?: GeminiAnalysisOptions): GeminiDocsAnalyzer {
  return new GeminiDocsAnalyzer(options);
}

/**
 * Convenience function
 */
export async function analyzeWithGemini(
  html: string,
  options?: GeminiAnalysisOptions
): Promise<GoogleDocsAnalysisResult> {
  const analyzer = createGeminiAnalyzer(options);
  return analyzer.analyze(html);
}

/**
 * Check if Gemini is available
 */
export function isGeminiAvailable(): boolean {
  return !!process.env.GOOGLE_GEMINI_API_KEY;
}