/**
 * Google Docs HTML Parser
 * 
 * Comprehensive parser for cleaned Google Docs HTML that extracts
 * structure, formatting, and semantic elements with high fidelity.
 */

export interface ParsedDocument {
  content: DocumentContent;
  structure: DocumentStructure;
  metadata: ParsingMetadata;
  placeholders: PlaceholderCandidate[];
}

export interface DocumentContent {
  html: string;
  text: string;
  elements: ParsedElement[];
}

export interface DocumentStructure {
  headings: ParsedHeading[];
  paragraphs: ParsedParagraph[];
  tables: ParsedTable[];
  images: ParsedImage[];
  lists: ParsedList[];
}

export interface ParsingMetadata {
  elementCount: number;
  textLength: number;
  tableCount: number;
  imageCount: number;
  headingCount: number;
  complexity: 'simple' | 'moderate' | 'complex';
  language?: string;
  hasFormatting: boolean;
}

export interface PlaceholderCandidate {
  text: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'email' | 'phone' | 'address' | 'name';
  confidence: number;
  position: ElementPosition;
  context: string;
  suggestions?: string[];
}

export interface ParsedElement {
  type: 'heading' | 'paragraph' | 'table' | 'image' | 'list' | 'text';
  tagName: string;
  content: string;
  position: ElementPosition;
  attributes: Record<string, string>;
  style?: ParsedStyle;
  children?: ParsedElement[];
}

export interface ElementPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
  elementIndex: number;
}

export interface ParsedStyle {
  fontWeight?: string;
  fontStyle?: string;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  textDecoration?: string;
  textAlign?: string;
}

export interface ParsedHeading {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id?: string;
  position: ElementPosition;
  style?: ParsedStyle;
}

export interface ParsedParagraph {
  text: string;
  position: ElementPosition;
  style?: ParsedStyle;
  formattedSpans?: FormattedSpan[];
}

export interface FormattedSpan {
  text: string;
  start: number;
  end: number;
  style: ParsedStyle;
}

export interface ParsedTable {
  rows: ParsedTableRow[];
  headers?: string[];
  position: ElementPosition;
  style?: ParsedStyle;
}

export interface ParsedTableRow {
  cells: ParsedTableCell[];
  isHeader?: boolean;
  style?: ParsedStyle;
}

export interface ParsedTableCell {
  text: string;
  html?: string;
  rowSpan?: number;
  colSpan?: number;
  position: ElementPosition;
  style?: ParsedStyle;
  type?: 'header' | 'data';
}

export interface ParsedImage {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  position: ElementPosition;
  style?: ParsedStyle;
}

export interface ParsedList {
  type: 'ordered' | 'unordered';
  items: ParsedListItem[];
  position: ElementPosition;
  style?: ParsedStyle;
}

export interface ParsedListItem {
  text: string;
  level: number;
  position: ElementPosition;
  style?: ParsedStyle;
  subItems?: ParsedListItem[];
}

export interface ParsingOptions {
  extractPlaceholders?: boolean;
  analyzeFormatting?: boolean;
  preserveWhitespace?: boolean;
  detectLanguage?: boolean;
  generateIds?: boolean;
  minPlaceholderConfidence?: number;
}

const DEFAULT_PARSING_OPTIONS: Required<ParsingOptions> = {
  extractPlaceholders: true,
  analyzeFormatting: true,
  preserveWhitespace: false,
  detectLanguage: false,
  generateIds: true,
  minPlaceholderConfidence: 0.7,
};

/**
 * Main HTML parser class for Google Docs content
 */
export class GoogleDocsHTMLParser {
  private options: Required<ParsingOptions>;
  private elementIndex: number = 0;
  private currentPosition: number = 0;

  constructor(options: ParsingOptions = {}) {
    this.options = { ...DEFAULT_PARSING_OPTIONS, ...options };
  }

  /**
   * Parse HTML content into structured document
   */
  public parse(html: string): ParsedDocument {
    this.elementIndex = 0;
    this.currentPosition = 0;

    // Create DOM from HTML string
    const elements = this.parseHTML(html);
    
    // Extract different element types
    const structure = this.extractStructure(elements);
    
    // Generate metadata
    const metadata = this.generateMetadata(elements, structure);
    
    // Extract placeholders if requested
    const placeholders = this.options.extractPlaceholders
      ? this.extractPlaceholders(elements, structure)
      : [];

    const content: DocumentContent = {
      html,
      text: this.extractPlainText(elements),
      elements,
    };

    return {
      content,
      structure,
      metadata,
      placeholders,
    };
  }

  /**
   * Parse HTML string into structured elements
   */
  private parseHTML(html: string): ParsedElement[] {
    // Simplified HTML parsing (in production, you'd use a proper HTML parser like jsdom)
    const elements: ParsedElement[] = [];
    
    // Match HTML elements with regex (simplified approach)
    const htmlElementRegex = /<(\w+)([^>]*)>(.*?)<\/\1>|<(\w+)([^>]*)\s*\/?>|([^<]+)/gs;
    let match;

    while ((match = htmlElementRegex.exec(html)) !== null) {
      if (match[1]) {
        // Opening and closing tag
        const tagName = match[1].toLowerCase();
        const attributes = this.parseAttributes(match[2] || '');
        const content = match[3] || '';
        
        const element = this.createElement(tagName, content, attributes);
        elements.push(element);
      } else if (match[4]) {
        // Self-closing tag
        const tagName = match[4].toLowerCase();
        const attributes = this.parseAttributes(match[5] || '');
        
        const element = this.createElement(tagName, '', attributes);
        elements.push(element);
      } else if (match[6]) {
        // Text node
        const text = match[6].trim();
        if (text) {
          const element = this.createTextElement(text);
          elements.push(element);
        }
      }
    }

    return elements;
  }

  /**
   * Create parsed element from HTML data
   */
  private createElement(
    tagName: string,
    content: string,
    attributes: Record<string, string>
  ): ParsedElement {
    const position: ElementPosition = {
      start: this.currentPosition,
      end: this.currentPosition + content.length,
      elementIndex: this.elementIndex++,
    };

    const style = this.parseStyle(attributes.style || '');
    
    let type: ParsedElement['type'] = 'text';
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      type = 'heading';
    } else if (tagName === 'p') {
      type = 'paragraph';
    } else if (tagName === 'table') {
      type = 'table';
    } else if (tagName === 'img') {
      type = 'image';
    } else if (['ul', 'ol'].includes(tagName)) {
      type = 'list';
    }

    const element: ParsedElement = {
      type,
      tagName,
      content,
      position,
      attributes,
      style: Object.keys(style).length > 0 ? style : undefined,
    };

    // Parse children for complex elements
    if (['table', 'ul', 'ol', 'div'].includes(tagName) && content) {
      element.children = this.parseHTML(content);
    }

    this.currentPosition += content.length;
    return element;
  }

  /**
   * Create text element
   */
  private createTextElement(text: string): ParsedElement {
    const position: ElementPosition = {
      start: this.currentPosition,
      end: this.currentPosition + text.length,
      elementIndex: this.elementIndex++,
    };

    this.currentPosition += text.length;

    return {
      type: 'text',
      tagName: '#text',
      content: text,
      position,
      attributes: {},
    };
  }

  /**
   * Parse HTML attributes from attribute string
   */
  private parseAttributes(attributeString: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const attributeRegex = /(\w+)=["']([^"']*)["']/g;
    let match;

    while ((match = attributeRegex.exec(attributeString)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }

  /**
   * Parse CSS style string into structured style object
   */
  private parseStyle(styleString: string): ParsedStyle {
    const style: ParsedStyle = {};
    
    if (!styleString) return style;

    const declarations = styleString.split(';').filter(d => d.trim());
    
    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      
      if (!property || !value) continue;

      switch (property) {
        case 'font-weight':
          style.fontWeight = value;
          break;
        case 'font-style':
          style.fontStyle = value;
          break;
        case 'font-size':
          style.fontSize = value;
          break;
        case 'color':
          style.color = value;
          break;
        case 'background-color':
          style.backgroundColor = value;
          break;
        case 'text-decoration':
          style.textDecoration = value;
          break;
        case 'text-align':
          style.textAlign = value;
          break;
      }
    }

    return style;
  }

  /**
   * Extract document structure from parsed elements
   */
  private extractStructure(elements: ParsedElement[]): DocumentStructure {
    const headings: ParsedHeading[] = [];
    const paragraphs: ParsedParagraph[] = [];
    const tables: ParsedTable[] = [];
    const images: ParsedImage[] = [];
    const lists: ParsedList[] = [];

    for (const element of elements) {
      switch (element.type) {
        case 'heading':
          headings.push(this.createParsedHeading(element));
          break;
        case 'paragraph':
          paragraphs.push(this.createParsedParagraph(element));
          break;
        case 'table':
          const table = this.createParsedTable(element);
          if (table) tables.push(table);
          break;
        case 'image':
          images.push(this.createParsedImage(element));
          break;
        case 'list':
          const list = this.createParsedList(element);
          if (list) lists.push(list);
          break;
      }
    }

    return { headings, paragraphs, tables, images, lists };
  }

  /**
   * Create parsed heading from element
   */
  private createParsedHeading(element: ParsedElement): ParsedHeading {
    const level = parseInt(element.tagName.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
    
    return {
      level,
      text: element.content,
      id: element.attributes.id,
      position: element.position,
      style: element.style,
    };
  }

  /**
   * Create parsed paragraph from element
   */
  private createParsedParagraph(element: ParsedElement): ParsedParagraph {
    return {
      text: element.content,
      position: element.position,
      style: element.style,
    };
  }

  /**
   * Create parsed table from element
   */
  private createParsedTable(element: ParsedElement): ParsedTable | null {
    if (!element.children) return null;

    const rows: ParsedTableRow[] = [];
    
    for (const child of element.children) {
      if (child.tagName === 'tr' && child.children) {
        const cells: ParsedTableCell[] = [];
        
        for (const cell of child.children) {
          if (['td', 'th'].includes(cell.tagName)) {
            cells.push({
              text: cell.content,
              html: cell.content,
              position: cell.position,
              style: cell.style,
              type: cell.tagName === 'th' ? 'header' : 'data',
            });
          }
        }
        
        rows.push({ 
          cells, 
          isHeader: cells.some(c => c.type === 'header'),
          style: child.style,
        });
      }
    }

    return {
      rows,
      headers: rows[0]?.isHeader ? rows[0].cells.map(c => c.text) : undefined,
      position: element.position,
      style: element.style,
    };
  }

  /**
   * Create parsed image from element
   */
  private createParsedImage(element: ParsedElement): ParsedImage {
    return {
      src: element.attributes.src || '',
      alt: element.attributes.alt,
      title: element.attributes.title,
      width: element.attributes.width ? parseInt(element.attributes.width) : undefined,
      height: element.attributes.height ? parseInt(element.attributes.height) : undefined,
      position: element.position,
      style: element.style,
    };
  }

  /**
   * Create parsed list from element
   */
  private createParsedList(element: ParsedElement): ParsedList | null {
    if (!element.children) return null;

    const items: ParsedListItem[] = [];
    
    for (const child of element.children) {
      if (child.tagName === 'li') {
        items.push({
          text: child.content,
          level: 1,
          position: child.position,
          style: child.style,
        });
      }
    }

    return {
      type: element.tagName === 'ol' ? 'ordered' : 'unordered',
      items,
      position: element.position,
      style: element.style,
    };
  }

  /**
   * Extract plain text from elements
   */
  private extractPlainText(elements: ParsedElement[]): string {
    return elements
      .map(el => el.content)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate parsing metadata
   */
  private generateMetadata(elements: ParsedElement[], structure: DocumentStructure): ParsingMetadata {
    const textLength = this.extractPlainText(elements).length;
    const elementCount = elements.length;
    
    let complexity: ParsingMetadata['complexity'] = 'simple';
    if (elementCount > 50 || structure.tables.length > 3) {
      complexity = 'complex';
    } else if (elementCount > 20 || structure.tables.length > 0) {
      complexity = 'moderate';
    }

    const hasFormatting = elements.some(el => el.style && Object.keys(el.style).length > 0);

    return {
      elementCount,
      textLength,
      tableCount: structure.tables.length,
      imageCount: structure.images.length,
      headingCount: structure.headings.length,
      complexity,
      hasFormatting,
    };
  }

  /**
   * Extract placeholder candidates from content
   */
  private extractPlaceholders(
    elements: ParsedElement[],
    structure: DocumentStructure
  ): PlaceholderCandidate[] {
    const placeholders: PlaceholderCandidate[] = [];
    const text = this.extractPlainText(elements);

    // Common placeholder patterns
    const patterns = [
      { regex: /\[([^\]]+)\]/g, type: 'text' as const, confidence: 0.9 },
      { regex: /\{([^}]+)\}/g, type: 'text' as const, confidence: 0.85 },
      { regex: /\$\d+(?:\.\d{2})?/g, type: 'currency' as const, confidence: 0.8 },
      { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, type: 'date' as const, confidence: 0.75 },
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'email' as const, confidence: 0.9 },
      { regex: /\b\d{3}-\d{3}-\d{4}\b/g, type: 'phone' as const, confidence: 0.8 },
      { regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, type: 'name' as const, confidence: 0.6 },
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        if (pattern.confidence >= this.options.minPlaceholderConfidence) {
          placeholders.push({
            text: match[0],
            type: pattern.type,
            confidence: pattern.confidence,
            position: {
              start: match.index,
              end: match.index + match[0].length,
              elementIndex: -1, // Would need more complex tracking
            },
            context: this.getContext(text, match.index, 50),
          });
        }
      }
    }

    return placeholders;
  }

  /**
   * Get context around a position in text
   */
  private getContext(text: string, position: number, radius: number): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.slice(start, end).trim();
  }
}

/**
 * Factory function to create parser instance
 */
export function createGoogleDocsParser(options?: ParsingOptions): GoogleDocsHTMLParser {
  return new GoogleDocsHTMLParser(options);
}

/**
 * Utility function to parse HTML directly
 */
export function parseGoogleDocsHTML(html: string, options?: ParsingOptions): ParsedDocument {
  const parser = createGoogleDocsParser(options);
  return parser.parse(html);
}