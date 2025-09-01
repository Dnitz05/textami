/**
 * Google Docs AI Analyzer
 * 
 * Adapts the existing AI analysis system for Google Docs HTML content.
 * Uses the same response format as the DOCX analyzer for UI compatibility.
 */

import { getOpenAI } from '../openai';
import { parseGoogleDocsHTML, ParsedDocument } from '../google/html-parser';
import { cleanGoogleDocsHTML } from '../google/html-cleaner';
import { mapGoogleDocsStyles } from '../google/style-mapper';
import { log } from '../logger';

export interface GoogleDocsAnalysisResult {
  templateId: string;
  fileName: string;
  storageUrl?: string;
  transcription: string;
  markdown: string;
  sections: DocumentSection[];
  tables: DocumentTable[];
  placeholders: AnalyzedPlaceholder[];
  signatura?: DocumentSignature;
  confidence: number;
  metadata: AnalysisMetadata;
}

export interface DocumentSection {
  id: string;
  title: string;
  markdown: string;
  type: 'title' | 'heading1' | 'heading2' | 'heading3';
  level?: number;
}

export interface DocumentTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  normalized: Record<string, any>;
}

export interface AnalyzedPlaceholder {
  text: string;
  variable: string;
  confidence: number;
  context: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
}

export interface DocumentSignature {
  nom: string;
  carrec: string;
  data_lloc: string;
}

export interface AnalysisMetadata {
  extractionMethod: string;
  processingTimeMs: number;
  elementsFound: {
    sections: number;
    tables: number;
    signatures: number;
    paragraphs: number;
  };
  htmlLength: number;
  textLength: number;
  sourceType: 'google-docs';
  cleaningResult?: {
    removedElements: string[];
    preservedStyles: string[];
    warnings: string[];
  };
}

export interface GoogleDocsAnalysisOptions {
  templateId?: string;
  fileName?: string;
  performAIAnalysis?: boolean;
  cleanHtml?: boolean;
  mapStyles?: boolean;
  minPlaceholderConfidence?: number;
  detectSignatures?: boolean;
}

const DEFAULT_OPTIONS: Required<GoogleDocsAnalysisOptions> = {
  templateId: '',
  fileName: 'Google Doc',
  performAIAnalysis: true,
  cleanHtml: true,
  mapStyles: true,
  minPlaceholderConfidence: 0.7,
  detectSignatures: true,
};

/**
 * Google Docs AI Analyzer class
 */
export class GoogleDocsAnalyzer {
  private options: Required<GoogleDocsAnalysisOptions>;

  constructor(options: GoogleDocsAnalysisOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Generate template ID if not provided
    if (!this.options.templateId) {
      this.options.templateId = `google_docs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Analyze Google Docs HTML content
   */
  public async analyze(html: string): Promise<GoogleDocsAnalysisResult> {
    const startTime = Date.now();
    
    log.debug('🔍 Starting Google Docs HTML analysis', {
      templateId: this.options.templateId,
      htmlLength: html.length,
      fileName: this.options.fileName,
    });

    try {
      // Step 1: Clean HTML if requested
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

      // Step 2: Map styles if requested
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
        extractPlaceholders: this.options.performAIAnalysis,
        analyzeFormatting: true,
        minPlaceholderConfidence: this.options.minPlaceholderConfidence,
      });

      // Step 4: Extract sections (headings)
      const sections = this.extractSections(parsedDoc);

      // Step 5: Extract tables
      const tables = this.extractTables(parsedDoc);

      // Step 6: Extract signatures if requested
      const signatura = this.options.detectSignatures
        ? this.extractSignature(parsedDoc)
        : undefined;

      // Step 7: Perform AI analysis if requested
      let aiPlaceholders: AnalyzedPlaceholder[] = [];
      
      if (this.options.performAIAnalysis) {
        aiPlaceholders = await this.performAIAnalysis(parsedDoc.content.text);
      }

      // Combine AI placeholders with parsed placeholders
      const allPlaceholders = this.combinePlaceholders(
        parsedDoc.placeholders,
        aiPlaceholders
      );

      // Step 8: Generate metadata
      const processingTimeMs = Date.now() - startTime;
      const metadata: AnalysisMetadata = {
        extractionMethod: 'google-docs-html-ai-hybrid',
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

      // Step 9: Format result
      const result: GoogleDocsAnalysisResult = {
        templateId: this.options.templateId,
        fileName: this.options.fileName,
        transcription: semanticHtml,
        markdown: parsedDoc.content.text,
        sections,
        tables,
        placeholders: allPlaceholders,
        signatura,
        confidence: this.calculateOverallConfidence(parsedDoc, aiPlaceholders),
        metadata,
      };

      log.debug('✅ Google Docs analysis complete', {
        templateId: this.options.templateId,
        placeholdersFound: allPlaceholders.length,
        sectionsFound: sections.length,
        tablesFound: tables.length,
        processingTimeMs,
      });

      return result;

    } catch (error) {
      log.error('❌ Google Docs analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   * Map heading levels to document types
   */
  private mapHeadingType(level: number): DocumentSection['type'] {
    switch (level) {
      case 1: return 'title';
      case 2: return 'heading1';
      case 3: return 'heading2';
      default: return 'heading3';
    }
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
    
    // Look for signature patterns
    const signaturePatterns = [
      /signat\s+per[:\s]+([^,\n]+)/i,
      /firmat\s+per[:\s]+([^,\n]+)/i,
      /signature[:\s]+([^,\n]+)/i,
      /atentament[:\s\n]+([^,\n]+)/i,
      /cordialmente[:\s\n]+([^,\n]+)/i,
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

    // Look in paragraphs for signature-like content
    for (const paragraph of parsedDoc.structure.paragraphs) {
      if (paragraph.text.length < 100 && 
          paragraph.text.match(/(atentament|cordialmente|salutacions|signature)/i)) {
        return {
          nom: '',
          carrec: '',
          data_lloc: paragraph.text,
        };
      }
    }

    return undefined;
  }

  /**
   * Perform AI analysis on text content
   */
  private async performAIAnalysis(textContent: string): Promise<AnalyzedPlaceholder[]> {
    if (!this.options.performAIAnalysis || textContent.length < 50) {
      return [];
    }

    try {
      const openai = getOpenAI();
      
      log.debug('🤖 Running AI analysis on Google Docs text', {
        textLength: textContent.length,
        preview: textContent.substring(0, 200),
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analitza aquest text HTML net de Google Docs per detectar variables/placeholders amb alta precisió.

CONTEXT: Aquest text ve d'un Google Doc que ha estat netejat i processat. Pot contenir estructura HTML semàntica.

INSTRUCCIONS:
1. Busca text que sembli placeholders, camps variables, o contingut que es repetirà
2. Dona alta confiança (80-100%) a patrons clars com: {{nom}}, [DATA], __CAMP__, text en MAJÚSCULES repetitiu
3. Dona mitjana confiança (60-79%) a text que pot ser variable però no està clar
4. Dona baixa confiança (<60%) només si realment dubtós
5. Classifica el tipus de dada: text, date, number, currency, email, other
6. Proporciona context útil sobre on apareix cada placeholder
7. ESPECIALMENT busca patrons comuns de Google Docs com text destacat, cursiva, o subratllat que indiquin camps

Retorna JSON amb aquest format:
{
  "placeholders": [
    {
      "text": "text exacte trobat",
      "variable": "nom_variable_suggerit", 
      "confidence": 85,
      "context": "descripció del context on apareix",
      "type": "text"
    }
  ]
}`
          },
          {
            role: "user",
            content: `Analitza aquest contingut Google Docs per detectar variables:\n\n${textContent.substring(0, 3000)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        return [];
      }

      const parsed = JSON.parse(result);
      
      log.debug('✅ AI analysis complete', {
        placeholdersFound: parsed.placeholders?.length || 0,
        model: completion.model
      });

      return parsed.placeholders || [];

    } catch (error) {
      log.warn('⚠️ AI analysis failed, returning empty placeholders:', error);
      return [];
    }
  }

  /**
   * Combine placeholders from parsing and AI analysis
   */
  private combinePlaceholders(
    parsedPlaceholders: any[],
    aiPlaceholders: AnalyzedPlaceholder[]
  ): AnalyzedPlaceholder[] {
    const combined: AnalyzedPlaceholder[] = [];
    
    // Add AI placeholders first (usually higher quality)
    combined.push(...aiPlaceholders);
    
    // Add parsed placeholders, avoiding duplicates
    for (const parsed of parsedPlaceholders) {
      const duplicate = combined.find(ai => 
        ai.text.toLowerCase().includes(parsed.text.toLowerCase()) ||
        parsed.text.toLowerCase().includes(ai.text.toLowerCase())
      );
      
      if (!duplicate) {
        combined.push({
          text: parsed.text,
          variable: this.generateVariableName(parsed.text),
          confidence: parsed.confidence,
          context: parsed.context,
          type: this.mapPlaceholderType(parsed.type),
        });
      }
    }

    // Sort by confidence descending
    return combined.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate variable name from placeholder text
   */
  private generateVariableName(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);
  }

  /**
   * Map placeholder types
   */
  private mapPlaceholderType(type: string): AnalyzedPlaceholder['type'] {
    switch (type.toLowerCase()) {
      case 'date': return 'date';
      case 'number': return 'number';
      case 'currency': return 'currency';
      case 'email': return 'email';
      default: return 'text';
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    parsedDoc: ParsedDocument,
    aiPlaceholders: AnalyzedPlaceholder[]
  ): number {
    let totalConfidence = 85; // Base confidence for Google Docs processing

    // Adjust based on document complexity
    if (parsedDoc.metadata.complexity === 'complex') {
      totalConfidence -= 10;
    } else if (parsedDoc.metadata.complexity === 'simple') {
      totalConfidence += 5;
    }

    // Adjust based on AI analysis success
    if (aiPlaceholders.length > 0) {
      const avgAIConfidence = aiPlaceholders.reduce((sum, p) => sum + p.confidence, 0) / aiPlaceholders.length;
      totalConfidence = (totalConfidence + avgAIConfidence) / 2;
    }

    // Adjust based on structure quality
    if (parsedDoc.metadata.hasFormatting) {
      totalConfidence += 5;
    }

    return Math.min(100, Math.max(50, Math.round(totalConfidence)));
  }
}

/**
 * Factory function to create analyzer
 */
export function createGoogleDocsAnalyzer(options?: GoogleDocsAnalysisOptions): GoogleDocsAnalyzer {
  return new GoogleDocsAnalyzer(options);
}

/**
 * Convenience function to analyze Google Docs HTML directly
 */
export async function analyzeGoogleDocsHTML(
  html: string,
  options?: GoogleDocsAnalysisOptions
): Promise<GoogleDocsAnalysisResult> {
  const analyzer = createGoogleDocsAnalyzer(options);
  return analyzer.analyze(html);
}