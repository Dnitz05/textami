/**
 * Google Docs Style Mapper
 * 
 * Maps Google Docs formatting and styles to semantic HTML elements,
 * preserving meaning while cleaning up presentation-focused markup.
 */

import { ParsedElement, ParsedStyle } from './html-parser';

export interface StyleMappingResult {
  semanticHTML: string;
  mappings: StyleMapping[];
  warnings: string[];
  confidence: number;
}

export interface StyleMapping {
  original: ParsedStyle;
  semantic: SemanticElement;
  confidence: number;
  reason: string;
}

export interface SemanticElement {
  tagName: string;
  attributes?: Record<string, string>;
  className?: string;
  preservedStyles?: Record<string, string>;
}

export interface MappingOptions {
  preserveColors?: boolean;
  preserveFontSizes?: boolean;
  convertHeadings?: boolean;
  detectEmphasis?: boolean;
  minimizeInlineStyles?: boolean;
  generateClasses?: boolean;
  semanticPriority?: 'high' | 'medium' | 'low';
}

const DEFAULT_MAPPING_OPTIONS: Required<MappingOptions> = {
  preserveColors: false,
  preserveFontSizes: false,
  convertHeadings: true,
  detectEmphasis: true,
  minimizeInlineStyles: true,
  generateClasses: false,
  semanticPriority: 'high',
};

/**
 * Google Docs Style Mapper class
 */
export class GoogleDocsStyleMapper {
  private options: Required<MappingOptions>;
  private classCounter: number = 0;
  private generatedClasses: Map<string, string> = new Map();

  constructor(options: MappingOptions = {}) {
    this.options = { ...DEFAULT_MAPPING_OPTIONS, ...options };
  }

  /**
   * Map Google Docs styles to semantic HTML
   */
  public mapToSemantic(html: string, elements?: ParsedElement[]): StyleMappingResult {
    const warnings: string[] = [];
    const mappings: StyleMapping[] = [];
    let confidence = 1.0;

    // Process HTML with style mapping
    const semanticHTML = this.processHTML(html, mappings, warnings);
    
    // Calculate overall confidence
    if (mappings.length > 0) {
      confidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length;
    }

    return {
      semanticHTML,
      mappings,
      warnings,
      confidence,
    };
  }

  /**
   * Process HTML and apply semantic mappings
   */
  private processHTML(html: string, mappings: StyleMapping[], warnings: string[]): string {
    let processed = html;

    // Apply style-based transformations in order of priority
    processed = this.mapHeadingStyles(processed, mappings, warnings);
    processed = this.mapEmphasisStyles(processed, mappings, warnings);
    processed = this.mapParagraphStyles(processed, mappings, warnings);
    processed = this.mapTableStyles(processed, mappings, warnings);
    processed = this.cleanRemainingStyles(processed, mappings, warnings);

    return processed;
  }

  /**
   * Map heading styles to semantic heading elements
   */
  private mapHeadingStyles(html: string, mappings: StyleMapping[], warnings: string[]): string {
    if (!this.options.convertHeadings) return html;

    let processed = html;

    // Map by font size (common Google Docs pattern)
    const headingMappings = [
      { minSize: 24, maxSize: 36, level: 1, confidence: 0.9 },
      { minSize: 20, maxSize: 24, level: 2, confidence: 0.85 },
      { minSize: 16, maxSize: 20, level: 3, confidence: 0.8 },
      { minSize: 14, maxSize: 16, level: 4, confidence: 0.75 },
      { minSize: 12, maxSize: 14, level: 5, confidence: 0.7 },
      { minSize: 10, maxSize: 12, level: 6, confidence: 0.65 },
    ];

    // Process elements that look like headings
    const headingPattern = /<(p|div)([^>]*style="[^"]*font-size:\s*(\d+)px[^"]*"[^>]*)>(.*?)<\/\1>/gi;
    
    processed = processed.replace(headingPattern, (match, tagName, attributes, fontSize, content) => {
      const size = parseInt(fontSize);
      
      for (const mapping of headingMappings) {
        if (size >= mapping.minSize && size < mapping.maxSize) {
          const original: ParsedStyle = { fontSize: `${size}px` };
          const semantic: SemanticElement = { tagName: `h${mapping.level}` };
          
          mappings.push({
            original,
            semantic,
            confidence: mapping.confidence,
            reason: `Font size ${size}px mapped to h${mapping.level}`,
          });

          return `<h${mapping.level}>${content}</h${mapping.level}>`;
        }
      }

      // Check for bold styling that might indicate a heading
      if (attributes.includes('font-weight:') && attributes.includes('bold')) {
        const boldMapping = this.getBoldHeadingLevel(content);
        if (boldMapping) {
          mappings.push({
            original: { fontSize: `${size}px`, fontWeight: 'bold' },
            semantic: { tagName: `h${boldMapping.level}` },
            confidence: boldMapping.confidence,
            reason: `Bold text with size ${size}px mapped to h${boldMapping.level}`,
          });

          return `<h${boldMapping.level}>${content}</h${boldMapping.level}>`;
        }
      }

      return match;
    });

    return processed;
  }

  /**
   * Determine heading level for bold text
   */
  private getBoldHeadingLevel(content: string): { level: number; confidence: number } | null {
    const trimmed = content.trim();
    
    // Short, title-like text
    if (trimmed.length < 50 && !trimmed.includes('.')) {
      return { level: 3, confidence: 0.75 };
    }
    
    // Very short text
    if (trimmed.length < 20) {
      return { level: 2, confidence: 0.8 };
    }

    return null;
  }

  /**
   * Map emphasis styles (bold, italic, underline) to semantic elements
   */
  private mapEmphasisStyles(html: string, mappings: StyleMapping[], warnings: string[]): string {
    if (!this.options.detectEmphasis) return html;

    let processed = html;

    // Map bold styling to <strong>
    const boldPattern = /<(span|div|p)([^>]*style="[^"]*font-weight:\s*(bold|700|800|900)[^"]*"[^>]*)>(.*?)<\/\1>/gi;
    processed = processed.replace(boldPattern, (match, tagName, attributes, weight, content) => {
      // Skip if already a heading
      if (tagName.startsWith('h')) return match;

      const original: ParsedStyle = { fontWeight: weight };
      const semantic: SemanticElement = { tagName: 'strong' };
      
      mappings.push({
        original,
        semantic,
        confidence: 0.9,
        reason: `Font weight ${weight} mapped to <strong>`,
      });

      // Preserve the original tag structure but add semantic meaning
      return `<${tagName}${attributes.replace(/font-weight:\s*(bold|700|800|900);?/gi, '')}><strong>${content}</strong></${tagName}>`;
    });

    // Map italic styling to <em>
    const italicPattern = /<(span|div|p)([^>]*style="[^"]*font-style:\s*italic[^"]*"[^>]*)>(.*?)<\/\1>/gi;
    processed = processed.replace(italicPattern, (match, tagName, attributes, content) => {
      const original: ParsedStyle = { fontStyle: 'italic' };
      const semantic: SemanticElement = { tagName: 'em' };
      
      mappings.push({
        original,
        semantic,
        confidence: 0.9,
        reason: 'Font style italic mapped to <em>',
      });

      return `<${tagName}${attributes.replace(/font-style:\s*italic;?/gi, '')}><em>${content}</em></${tagName}>`;
    });

    // Map underline styling to <u> (though <u> is less semantic)
    const underlinePattern = /<(span|div|p)([^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*)>(.*?)<\/\1>/gi;
    processed = processed.replace(underlinePattern, (match, tagName, attributes, content) => {
      const original: ParsedStyle = { textDecoration: 'underline' };
      const semantic: SemanticElement = { tagName: 'u' };
      
      mappings.push({
        original,
        semantic,
        confidence: 0.7, // Lower confidence as <u> is less semantic
        reason: 'Text decoration underline mapped to <u>',
      });

      warnings.push('Underline mapped to <u> - consider using <em> or <mark> for better semantics');
      
      return `<${tagName}${attributes.replace(/text-decoration:\s*underline;?/gi, '')}><u>${content}</u></${tagName}>`;
    });

    return processed;
  }

  /**
   * Map paragraph-level styles
   */
  private mapParagraphStyles(html: string, mappings: StyleMapping[], warnings: string[]): string {
    let processed = html;

    // Map text alignment
    const alignmentMappings = {
      'center': 'text-center',
      'right': 'text-right',
      'justify': 'text-justify',
    };

    for (const [alignment, className] of Object.entries(alignmentMappings)) {
      const alignPattern = new RegExp(
        `<(p|div)([^>]*style="[^"]*text-align:\\s*${alignment}[^"]*"[^>]*?)>(.*?)<\/\\1>`,
        'gi'
      );
      
      processed = processed.replace(alignPattern, (match, tagName, attributes, content) => {
        const original: ParsedStyle = { textAlign: alignment };
        const semantic: SemanticElement = { 
          tagName,
          className: this.options.generateClasses ? className : undefined,
          preservedStyles: this.options.generateClasses ? {} : { 'text-align': alignment }
        };
        
        mappings.push({
          original,
          semantic,
          confidence: 0.8,
          reason: `Text alignment ${alignment} preserved`,
        });

        if (this.options.generateClasses) {
          const cleanAttributes = attributes.replace(/text-align:\s*[^;]+;?/gi, '');
          return `<${tagName} class="${className}"${cleanAttributes}>${content}</${tagName}>`;
        }
        
        return match; // Keep original if not generating classes
      });
    }

    return processed;
  }

  /**
   * Map table-specific styles
   */
  private mapTableStyles(html: string, mappings: StyleMapping[], warnings: string[]): string {
    let processed = html;

    // Add semantic table structure
    const tablePattern = /<table([^>]*)>(.*?)<\/table>/gis;
    processed = processed.replace(tablePattern, (match, attributes, content) => {
      // Check if first row looks like headers
      const firstRowPattern = /<tr[^>]*>(.*?)<\/tr>/i;
      const firstRowMatch = content.match(firstRowPattern);
      
      if (firstRowMatch) {
        const firstRowContent = firstRowMatch[1];
        
        // If cells contain bold text or specific styling, treat as headers
        if (firstRowContent.includes('font-weight') || firstRowContent.includes('bold')) {
          const headerContent = firstRowContent.replace(/<td/gi, '<th').replace(/<\/td>/gi, '</th>');
          const remainingContent = content.replace(firstRowPattern, '');
          
          mappings.push({
            original: { fontWeight: 'bold' },
            semantic: { tagName: 'th' },
            confidence: 0.85,
            reason: 'First table row with bold styling mapped to headers',
          });

          return `<table${attributes}><thead><tr>${headerContent}</tr></thead><tbody>${remainingContent}</tbody></table>`;
        }
      }

      return match;
    });

    return processed;
  }

  /**
   * Clean remaining inline styles based on options
   */
  private cleanRemainingStyles(html: string, mappings: StyleMapping[], warnings: string[]): string {
    if (!this.options.minimizeInlineStyles) return html;

    let processed = html;

    // Remove or preserve specific styles based on options
    const stylePattern = /style="([^"]*)"/g;
    processed = processed.replace(stylePattern, (match, styles) => {
      const preservedStyles: string[] = [];
      const declarations = styles.split(';').filter(d => d.trim());

      for (const declaration of declarations) {
        const [property, value] = declaration.split(':').map(s => s.trim());
        
        if (!property || !value) continue;

        // Preserve colors if requested
        if (this.options.preserveColors && ['color', 'background-color'].includes(property)) {
          preservedStyles.push(`${property}: ${value}`);
          continue;
        }

        // Preserve font sizes if requested
        if (this.options.preserveFontSizes && property === 'font-size') {
          preservedStyles.push(`${property}: ${value}`);
          continue;
        }

        // Always preserve essential layout properties
        if (['display', 'position', 'float'].includes(property)) {
          preservedStyles.push(`${property}: ${value}`);
          continue;
        }

        // Log what we're removing
        warnings.push(`Removed inline style: ${property}: ${value}`);
      }

      if (preservedStyles.length > 0) {
        return `style="${preservedStyles.join('; ')}"`;
      }

      return '';
    });

    // Clean up empty style attributes
    processed = processed.replace(/\s*style=""\s*/g, ' ');

    return processed;
  }

  /**
   * Generate CSS class name for style combination
   */
  private generateClassName(styles: ParsedStyle): string {
    const key = JSON.stringify(styles);
    
    if (this.generatedClasses.has(key)) {
      return this.generatedClasses.get(key)!;
    }

    const className = `textami-style-${this.classCounter++}`;
    this.generatedClasses.set(key, className);
    
    return className;
  }

  /**
   * Get generated CSS rules
   */
  public getGeneratedCSS(): string {
    const rules: string[] = [];

    for (const [stylesJson, className] of this.generatedClasses) {
      const styles = JSON.parse(stylesJson) as ParsedStyle;
      const cssProperties: string[] = [];

      for (const [property, value] of Object.entries(styles)) {
        if (value) {
          // Convert camelCase to kebab-case
          const kebabProperty = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
          cssProperties.push(`  ${kebabProperty}: ${value};`);
        }
      }

      if (cssProperties.length > 0) {
        rules.push(`.${className} {\n${cssProperties.join('\n')}\n}`);
      }
    }

    return rules.join('\n\n');
  }
}

/**
 * Factory function to create style mapper
 */
export function createStyleMapper(options?: MappingOptions): GoogleDocsStyleMapper {
  return new GoogleDocsStyleMapper(options);
}

/**
 * Utility function to map styles directly
 */
export function mapGoogleDocsStyles(
  html: string,
  options?: MappingOptions
): StyleMappingResult {
  const mapper = createStyleMapper(options);
  return mapper.mapToSemantic(html);
}

/**
 * Predefined mapping configurations
 */
export const STYLE_MAPPING_PRESETS = {
  // Preserve original styling as much as possible
  preserve: {
    preserveColors: true,
    preserveFontSizes: true,
    convertHeadings: true,
    detectEmphasis: true,
    minimizeInlineStyles: false,
    generateClasses: false,
    semanticPriority: 'low' as const,
  },

  // Focus on semantic HTML
  semantic: {
    preserveColors: false,
    preserveFontSizes: false,
    convertHeadings: true,
    detectEmphasis: true,
    minimizeInlineStyles: true,
    generateClasses: false,
    semanticPriority: 'high' as const,
  },

  // Generate CSS classes for styling
  classes: {
    preserveColors: true,
    preserveFontSizes: true,
    convertHeadings: true,
    detectEmphasis: true,
    minimizeInlineStyles: true,
    generateClasses: true,
    semanticPriority: 'medium' as const,
  },
} as const;