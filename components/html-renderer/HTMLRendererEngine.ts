import { HTMLSourceType } from './HTMLRenderer';

export interface HTMLRendererConfig {
  sourceType: HTMLSourceType;
  context: 'preview' | 'editor' | 'export' | 'print';
  enablePlaceholders: boolean;
  enableImageLazyLoad: boolean;
  enableTableEnhancements: boolean;
  styleOverrides: Record<string, React.CSSProperties>;
}

export interface HTMLRenderResult {
  processedHTML: string;
  detectedSource: HTMLSourceType;
  appliedStyles: string;
  metadata: {
    images: number;
    tables: number;
    headings: number;
    placeholders: number;
  };
}

export class HTMLRendererEngine {
  private config: HTMLRendererConfig;
  
  constructor(config: HTMLRendererConfig) {
    this.config = config;
  }

  render(content: string, placeholders: any[] = []): HTMLRenderResult {
    // 1. Auto-detect source type if needed
    const detectedSource = this.config.sourceType === 'auto-detect' 
      ? this.detectHTMLSource(content)
      : this.config.sourceType;

    // 2. Clean and preprocess HTML
    const cleanedHTML = this.preprocessHTML(content, detectedSource);
    
    // 3. Apply placeholders if enabled
    const htmlWithPlaceholders = this.config.enablePlaceholders 
      ? this.applyPlaceholders(cleanedHTML, placeholders)
      : cleanedHTML;
    
    // 4. Process images
    const htmlWithImages = this.config.enableImageLazyLoad
      ? this.processImages(htmlWithPlaceholders)
      : htmlWithPlaceholders;
    
    // 5. Enhance tables
    const finalHTML = this.config.enableTableEnhancements
      ? this.enhanceTables(htmlWithImages)
      : htmlWithImages;

    // 6. Generate appropriate styles
    const styles = this.generateStyles(detectedSource, this.config.context);
    
    // 7. Collect metadata
    const metadata = this.collectMetadata(finalHTML);

    return {
      processedHTML: finalHTML,
      detectedSource,
      appliedStyles: styles,
      metadata
    };
  }

  private detectHTMLSource(html: string): HTMLSourceType {
    // Google Docs detection patterns
    if (
      html.includes('class="c') || // Google Docs CSS classes
      html.includes('font-family:Arial') ||
      html.includes('font-family:"Arial"') ||
      html.includes('docs-internal-guid') ||
      html.includes('kix-')
    ) {
      return 'google-docs';
    }

    // Microsoft Office detection patterns  
    if (
      html.includes('mso-') || // MSO styles
      html.includes('class="MsoNormal') ||
      html.includes('urn:schemas-microsoft-com') ||
      html.includes('w:wordDocument')
    ) {
      return 'microsoft-office';
    }

    // Markdown-generated HTML detection
    if (
      html.includes('class="markdown-body') ||
      html.includes('<!-- markdown -->') ||
      html.match(/<h[1-6]>.*<\/h[1-6]>/) && html.includes('<p>') // Simple header + paragraph pattern
    ) {
      return 'markdown';
    }

    // Default to plain HTML
    return 'plain-html';
  }

  private preprocessHTML(html: string, sourceType: HTMLSourceType): string {
    let cleaned = html;

    // Common cleaning for all sources
    cleaned = this.removeHorizontalLines(cleaned);
    cleaned = this.cleanEmptyElements(cleaned);
    cleaned = this.fixBrokenTags(cleaned);

    // Source-specific cleaning
    switch (sourceType) {
      case 'google-docs':
        cleaned = this.cleanGoogleDocsArtifacts(cleaned);
        break;
      case 'microsoft-office':
        cleaned = this.cleanOfficeArtifacts(cleaned);
        break;
      case 'markdown':
        cleaned = this.cleanMarkdownArtifacts(cleaned);
        break;
    }

    return cleaned;
  }

  private removeHorizontalLines(html: string): string {
    return html
      .replace(/<hr[^>]*>/gi, '')
      .replace(/style="[^"]*border-top:[^"]*"/gi, '')
      .replace(/style="[^"]*border:\s*1pt\s+solid\s+transparent[^"]*"/gi, '');
  }

  private cleanEmptyElements(html: string): string {
    return html
      .replace(/<p[^>]*>\s*<\/p>/gi, '')
      .replace(/<div[^>]*>\s*<\/div>/gi, '')
      .replace(/<span[^>]*>\s*<\/span>/gi, '');
  }

  private fixBrokenTags(html: string): string {
    return html
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br />')
      .replace(/^\s*<br\s*\/?>/gi, '');
  }

  private cleanGoogleDocsArtifacts(html: string): string {
    return html
      .replace(/font-family:\s*Arial[^;]*/gi, '')
      .replace(/font-size:\s*11pt/gi, '')
      .replace(/line-height:\s*1\.15[^;]*/gi, '')
      .replace(/margin:\s*0pt[^;]*/gi, '')
      .replace(/class="c\d+"/gi, '');
  }

  private cleanOfficeArtifacts(html: string): string {
    return html
      .replace(/mso-[^;]*;?/gi, '')
      .replace(/class="MsoNormal[^"]*"/gi, '')
      .replace(/<!--\[if [^>]*>[\s\S]*?<!\[endif\]-->/gi, '');
  }

  private cleanMarkdownArtifacts(html: string): string {
    return html
      .replace(/class="markdown-body[^"]*"/gi, '')
      .replace(/<!-- markdown -->/gi, '');
  }

  private applyPlaceholders(html: string, placeholders: any[]): string {
    let result = html;
    
    placeholders.forEach((placeholder, index) => {
      const regex = new RegExp(`\\b${this.escapeRegex(placeholder.text)}\\b`, 'gi');
      const confidenceClass = `confidence-${Math.floor(placeholder.confidence / 20)}`;
      
      result = result.replace(regex, 
        `<span class="placeholder-highlight ${confidenceClass}" data-placeholder-id="${index}" title="Variable: {{${placeholder.variable}}} (${placeholder.confidence}% confidence)">${placeholder.text}</span>`
      );
    });

    return result;
  }

  private processImages(html: string): string {
    return html.replace(
      /<img([^>]*?)src="([^"]*)"([^>]*?)>/gi,
      (match, beforeSrc, src, afterSrc) => {
        const lazyLoadAttrs = 'loading="lazy" decoding="async"';
        const enhancedClasses = 'class="html-renderer__image"';
        
        return `<img${beforeSrc}src="${src}"${afterSrc} ${lazyLoadAttrs} ${enhancedClasses}>`;
      }
    );
  }

  private enhanceTables(html: string): string {
    return html.replace(
      /<table([^>]*)>/gi,
      '<table$1 class="html-renderer__table">'
    ).replace(
      /<td([^>]*)>/gi,
      '<td$1 class="html-renderer__cell">'
    ).replace(
      /<th([^>]*)>/gi,
      '<th$1 class="html-renderer__header">'
    );
  }

  private generateStyles(sourceType: HTMLSourceType, context: string): string {
    const baseStyles = this.getBaseStyles();
    const sourceStyles = this.getSourceSpecificStyles(sourceType);
    const contextStyles = this.getContextStyles(context);
    
    return `
      ${baseStyles}
      ${sourceStyles}
      ${contextStyles}
    `;
  }

  private getBaseStyles(): string {
    return `
      .html-renderer {
        font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
        line-height: 1.6;
        color: #374151;
        background: white;
      }
      
      .html-renderer__content {
        max-width: 100%;
        word-wrap: break-word;
      }
      
      .html-renderer__content > *:first-child {
        margin-top: 0 !important;
        border-top: none !important;
        padding-top: 0 !important;
      }
      
      .html-renderer__content > *:last-child {
        margin-bottom: 0 !important;
      }
      
      .html-renderer__image {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        margin: 16px 0;
      }
      
      .html-renderer__table {
        width: 100%;
        border-collapse: collapse;
        margin: 24px 0;
        border: 1px solid #d1d5db;
      }
      
      .html-renderer__cell,
      .html-renderer__header {
        border: 1px solid #d1d5db;
        padding: 12px 16px;
        text-align: left;
        vertical-align: top;
      }
      
      .html-renderer__header {
        background-color: #f9fafb;
        font-weight: 600;
      }
    `;
  }

  private getSourceSpecificStyles(sourceType: HTMLSourceType): string {
    switch (sourceType) {
      case 'google-docs':
        return `
          .html-renderer--google-docs h1 {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin: 32px 0 16px 0;
            line-height: 1.2;
          }
          
          .html-renderer--google-docs h2 {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin: 28px 0 14px 0;
            line-height: 1.3;
          }
          
          .html-renderer--google-docs h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 24px 0 12px 0;
            line-height: 1.4;
          }
          
          .html-renderer--google-docs p {
            margin: 0 0 16px 0;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .html-renderer--google-docs strong,
          .html-renderer--google-docs b {
            font-weight: 700;
          }
        `;
        
      case 'microsoft-office':
        return `
          .html-renderer--microsoft-office {
            font-family: 'Times New Roman', Times, serif;
          }
          
          .html-renderer--microsoft-office h1 {
            font-size: 22px;
            margin: 24px 0 12px 0;
          }
          
          .html-renderer--microsoft-office p {
            margin: 0 0 12px 0;
            text-align: justify;
          }
        `;
        
      case 'markdown':
        return `
          .html-renderer--markdown h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 40px 0 20px 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
          }
          
          .html-renderer--markdown h2 {
            font-size: 24px;
            font-weight: 600;
            margin: 32px 0 16px 0;
          }
          
          .html-renderer--markdown code {
            background: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
          }
          
          .html-renderer--markdown blockquote {
            border-left: 4px solid #d1d5db;
            margin: 16px 0;
            padding: 0 16px;
            color: #6b7280;
          }
        `;
        
      default:
        return `
          .html-renderer--plain-html h1,
          .html-renderer--plain-html h2,
          .html-renderer--plain-html h3,
          .html-renderer--plain-html h4,
          .html-renderer--plain-html h5,
          .html-renderer--plain-html h6 {
            margin-top: 24px;
            margin-bottom: 12px;
            font-weight: 600;
          }
          
          .html-renderer--plain-html p {
            margin: 0 0 16px 0;
          }
        `;
    }
  }

  private getContextStyles(context: string): string {
    switch (context) {
      case 'preview':
        return `
          .html-renderer--preview {
            padding: 24px;
            max-width: 800px;
          }
        `;
        
      case 'editor':
        return `
          .html-renderer--editor {
            padding: 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
          }
        `;
        
      case 'export':
        return `
          .html-renderer--export {
            padding: 0;
            font-size: 12px;
          }
        `;
        
      case 'print':
        return `
          .html-renderer--print {
            padding: 0;
            color: black;
            background: white;
          }
          
          @media print {
            .html-renderer--print {
              page-break-inside: avoid;
            }
          }
        `;
        
      default:
        return '';
    }
  }

  private collectMetadata(html: string) {
    const images = (html.match(/<img[^>]*>/gi) || []).length;
    const tables = (html.match(/<table[^>]*>/gi) || []).length;
    const headings = (html.match(/<h[1-6][^>]*>/gi) || []).length;
    const placeholders = (html.match(/class="placeholder-highlight/gi) || []).length;

    return { images, tables, headings, placeholders };
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}