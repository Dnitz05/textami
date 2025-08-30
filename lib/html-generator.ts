// lib/html-generator.ts
// HTML Semantic Generator per Textami OOXML+IA
import nunjucks from 'nunjucks';
import sanitizeHtml from 'sanitize-html';
import { readFileSync } from 'fs';
import path from 'path';
import { log } from './logger';

// Types per HTML generation
interface StyleManifest {
  version: string;
  styles: Record<string, string>;
  fallbacks: Record<string, string>;
  warnings: string[];
  vocabulary: string[];
  statistics: {
    total_styles_found: number;
    mapped_styles: number;
    fallback_styles: number;
  };
}

interface DocumentData {
  [key: string]: any;
  documentTitle?: string;
  documentSubtitle?: string;
  sections?: DocumentSection[];
  showHeader?: boolean;
  showFooter?: boolean;
  showMetadata?: boolean;
  author?: string;
  version?: string;
}

interface DocumentSection {
  title?: string;
  type: 'paragraph' | 'list' | 'table' | 'quote' | 'custom';
  content?: string;
  listType?: 'bulleted' | 'numbered';
  items?: string[];
  headers?: string[];
  rows?: string[][];
  pageBreakAfter?: boolean;
}

interface GenerationResult {
  html: string;
  elementsUsed: string[];
  sanitized: boolean;
  generationTime: number;
  warnings: string[];
}

export class SemanticHTMLGenerator {
  private nunjucksEnv: nunjucks.Environment;
  private templateConfig: any;
  private htmlVocabulary: Record<string, any>;
  
  constructor() {
    this.initializeNunjucks();
    this.loadTemplateConfig();
    log.debug('✅ SemanticHTMLGenerator initialized');
  }
  
  private initializeNunjucks(): void {
    // Configurar Nunjucks amb templates directory
    const templatePath = path.join(process.cwd(), 'html_templates');
    
    this.nunjucksEnv = nunjucks.configure(templatePath, {
      autoescape: true,
      throwOnUndefined: false,
      trimBlocks: true,
      lstripBlocks: true
    });
    
    // Afegir custom filters
    this.addCustomFilters();
    
    log.debug('🎨 Nunjucks environment configured');
  }
  
  private loadTemplateConfig(): void {
    try {
      const configPath = path.join(process.cwd(), 'html_templates', 'template_config.json');
      const configContent = readFileSync(configPath, 'utf-8');
      this.templateConfig = JSON.parse(configContent);
      this.htmlVocabulary = this.templateConfig.htmlVocabulary;
      
      log.debug('📋 Template configuration loaded');
    } catch (error) {
      log.error('❌ Error loading template config:', error);
      // Fallback configuration
      this.templateConfig = { htmlVocabulary: {} };
      this.htmlVocabulary = {};
    }
  }
  
  private addCustomFilters(): void {
    // Filter per dates
    this.nunjucksEnv.addFilter('formatDate', (date: any) => {
      if (!date) return new Date().toLocaleDateString('ca-ES');
      return new Date(date).toLocaleDateString('ca-ES');
    });
    
    // Filter per capitalització
    this.nunjucksEnv.addFilter('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
    
    // Filter per truncar text
    this.nunjucksEnv.addFilter('truncate', (str: string, length: number = 100) => {
      if (!str || str.length <= length) return str;
      return str.substring(0, length) + '...';
    });
  }
  
  /**
   * Genera HTML semàntic a partir de dades i styleManifest
   */
  async generateSemanticHTML(
    data: DocumentData, 
    styleManifest?: StyleManifest,
    templateName: string = 'body.html'
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    let elementsUsed: string[] = [];
    
    log.debug('🌐 Generating semantic HTML...', {
      template: templateName,
      dataKeys: Object.keys(data),
      hasStyleManifest: !!styleManifest
    });
    
    try {
      // Preparar dades amb defaults
      const templateData = this.prepareTemplateData(data, styleManifest);
      
      // Generar HTML amb Nunjucks
      const rawHtml = this.nunjucksEnv.render(templateName, templateData);
      
      // Extreure elements usats
      elementsUsed = this.extractElementsUsed(rawHtml);
      
      // Sanititzar HTML
      const sanitizedHtml = this.sanitizeHTML(rawHtml);
      
      const generationTime = Date.now() - startTime;
      
      log.debug('✅ HTML generation completed', {
        htmlLength: sanitizedHtml.length,
        elementsUsed: elementsUsed.length,
        generationTime: `${generationTime}ms`
      });
      
      return {
        html: sanitizedHtml,
        elementsUsed,
        sanitized: true,
        generationTime,
        warnings
      };
      
    } catch (error) {
      log.error('❌ HTML generation failed:', error);
      throw new Error(`HTML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Genera HTML directament des de styleManifest i dades estructurades
   */
  async generateFromStyleManifest(
    styleManifest: StyleManifest,
    documentStructure: any[],
    variables: Record<string, any> = {}
  ): Promise<GenerationResult> {
    log.debug('📊 Generating HTML from styleManifest...', {
      stylesCount: Object.keys(styleManifest.styles).length,
      elementsCount: documentStructure.length
    });
    
    // Convertir document structure a sections
    const sections = this.convertStructureToSections(documentStructure, styleManifest);
    
    // Preparar dades del document
    const documentData: DocumentData = {
      documentTitle: variables.title || 'Document Textami',
      sections,
      showHeader: true,
      showFooter: true,
      showTimestamp: true,
      generatedTimestamp: new Date().toISOString(),
      ...variables
    };
    
    return this.generateSemanticHTML(documentData, styleManifest);
  }
  
  private prepareTemplateData(data: DocumentData, styleManifest?: StyleManifest): DocumentData {
    const defaultData = {
      documentTitle: 'Document Textami',
      showHeader: true,
      showFooter: true,
      showMetadata: false,
      showTimestamp: true,
      generatedDate: new Date().toLocaleDateString('ca-ES'),
      generatedTimestamp: new Date().toISOString(),
      footerText: 'Document generat amb Textami - Processament Intel·ligent de Documents'
    };
    
    return { ...defaultData, ...data };
  }
  
  private convertStructureToSections(
    structure: any[], 
    styleManifest: StyleManifest
  ): DocumentSection[] {
    const sections: DocumentSection[] = [];
    
    for (const element of structure) {
      if (element.type === 'paragraph' && element.text?.trim()) {
        const htmlElement = this.mapStyleToHTMLElement(element.style, styleManifest);
        
        if (htmlElement?.startsWith('h')) {
          sections.push({
            title: element.text,
            type: 'paragraph',
            content: '' // Headers són títols, no contingut
          });
        } else {
          sections.push({
            type: 'paragraph',
            content: element.text
          });
        }
      } else if (element.type === 'table') {
        sections.push({
          type: 'table',
          headers: ['Columna 1', 'Columna 2'], // Placeholder
          rows: [['Dada 1', 'Dada 2']] // Placeholder
        });
      }
    }
    
    return sections;
  }
  
  private mapStyleToHTMLElement(styleName: string, styleManifest: StyleManifest): string {
    // Buscar en el styleManifest
    for (const [htmlElement, wordStyle] of Object.entries(styleManifest.styles)) {
      if (wordStyle === styleName) {
        return htmlElement.split('.')[0]; // Retornar només l'element base
      }
    }
    
    // Fallback heuristic
    const styleLower = styleName.toLowerCase();
    if (styleLower.includes('heading 1') || styleLower.includes('title')) return 'h1';
    if (styleLower.includes('heading 2') || styleLower.includes('subtitle')) return 'h2';
    if (styleLower.includes('heading 3')) return 'h3';
    if (styleLower.includes('body') || styleLower.includes('normal')) return 'p';
    
    return 'p'; // Default fallback
  }
  
  private extractElementsUsed(html: string): string[] {
    const elements = new Set<string>();
    
    // Regex per trobar tags HTML
    const tagRegex = /<(\w+)(\s+class="([^"]*)")?[^>]*>/g;
    let match;
    
    while ((match = tagRegex.exec(html)) !== null) {
      const [, tagName, , className] = match;
      
      if (className) {
        elements.add(`${tagName}.${className}`);
      } else {
        elements.add(tagName);
      }
    }
    
    return Array.from(elements);
  }
  
  private sanitizeHTML(html: string): string {
    const allowedTags = this.templateConfig?.validation?.allowedTags || [
      'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 
      'blockquote', 'strong', 'em', 'div', 'span'
    ];
    
    const allowedClasses = this.templateConfig?.validation?.allowedClasses || [
      'BodyText', 'Bulleted', 'Numbered', 'StdTable'
    ];
    
    return sanitizeHtml(html, {
      allowedTags,
      allowedAttributes: {
        '*': ['class'],
        'table': ['class'],
        'ul': ['class'],
        'ol': ['class'],
        'p': ['class']
      },
      allowedClasses: {
        '*': allowedClasses
      }
    });
  }
  
  /**
   * Valida que un HTML conté elements semàntics vàlids
   */
  validateSemanticHTML(html: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Comprovar elements requerits
    const requiredElements = this.templateConfig?.validation?.requiredElements || ['h1', 'p'];
    
    for (const element of requiredElements) {
      const regex = new RegExp(`<${element}[^>]*>`, 'i');
      if (!regex.test(html)) {
        errors.push(`Required element missing: ${element}`);
      }
    }
    
    // Comprovar vocabulari conegut
    const elementsUsed = this.extractElementsUsed(html);
    for (const element of elementsUsed) {
      if (!this.htmlVocabulary[element]) {
        warnings.push(`Unknown element used: ${element}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Retorna el vocabulari HTML disponible
   */
  getHTMLVocabulary(): Record<string, any> {
    return this.htmlVocabulary;
  }
}

// Export singleton instance
export const htmlGenerator = new SemanticHTMLGenerator();