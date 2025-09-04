import { docs_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createAuthenticatedClient, handleGoogleApiError } from './auth';
import { GoogleAuthTokens, GoogleDocMetadata } from './types';
import { cleanGoogleDocsHTML, CleaningOptions } from './html-cleaner';

// Document structure interfaces
export interface HeadingElement {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface ParagraphElement {
  text: string;
  startIndex: number;
  endIndex: number;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontFamily?: string;
  };
}

export interface TableElement {
  rows: number;
  columns: number;
  startIndex: number;
  endIndex: number;
  cells: TableCell[][];
}

export interface TableCell {
  text: string;
  rowSpan?: number;
  colSpan?: number;
  style?: {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
  };
}

export interface ImageElement {
  startIndex: number;
  endIndex: number;
  width?: number;
  height?: number;
  sourceUri?: string;
  title?: string;
  altText?: string;
}

export interface StyleInfo {
  fontSize: number;
  fontFamily: string;
  marginTop: number;
  marginBottom: number;
  lineHeight: number;
}

export interface DocumentStructure {
  headings: HeadingElement[];
  paragraphs: ParagraphElement[];
  tables: TableElement[];
  images: ImageElement[];
  styles: StyleInfo;
}

export interface GoogleDocsExportResult {
  html: string;
  cleanedHtml: string;
  structure: DocumentStructure;
  metadata: GoogleDocMetadata;
}

class GoogleDocsService {
  private docsClient: docs_v1.Docs;
  private oauth2Client: OAuth2Client;

  constructor(oauth2Client: OAuth2Client) {
    this.oauth2Client = oauth2Client;
    this.docsClient = google.docs({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Export Google Doc to HTML format
   */
  async exportToHTML(documentId: string): Promise<string> {
    try {
      // Get document content using Google Docs API
      const response = await this.docsClient.documents.get({
        documentId,
        includeTabsContent: true,
      });

      if (!response.data) {
        throw new Error('No document data received');
      }

      // Convert Google Docs content to HTML
      const html = await this.convertDocumentToHTML(response.data);
      
      return html;
    } catch (error) {
      throw handleGoogleApiError(error);
    }
  }

  /**
   * Get document metadata and structure information
   */
  async getDocumentStructure(documentId: string): Promise<DocumentStructure> {
    try {
      const response = await this.docsClient.documents.get({
        documentId,
        includeTabsContent: true,
      });

      if (!response.data || !response.data.body) {
        throw new Error('No document body received');
      }

      const structure = this.parseDocumentStructure(response.data);
      return structure;
    } catch (error) {
      throw handleGoogleApiError(error);
    }
  }

  /**
   * Parse document content and extract structured elements
   */
  async parseDocumentContent(
    documentId: string,
    cleaningOptions?: CleaningOptions
  ): Promise<GoogleDocsExportResult> {
    try {
      console.log('🔍 Making Google Docs API request:', { 
        documentId,
        hasDocsClient: !!this.docsClient,
        hasContext: !!this.docsClient.context
      });
      
      // Log authentication status (simplified to avoid TypeScript issues)
      try {
        console.log('🔑 Authentication Check:', {
          docsClientReady: !!this.docsClient,
          contextExists: !!this.docsClient.context,
          requestAboutToStart: true
        });
      } catch (authError) {
        console.error('❌ Authentication check failed:', authError);
      }
      
      const response = await this.docsClient.documents.get({
        documentId,
        includeTabsContent: true,
      });

      console.log('📊 Google Docs API Response:', {
        hasResponse: !!response,
        hasData: !!response.data,
        status: response.status,
        statusText: response.statusText,
        dataKeys: response.data ? Object.keys(response.data) : [],
        title: response.data?.title,
        documentId: response.data?.documentId,
        revisionId: response.data?.revisionId
      });

      if (!response.data) {
        throw new Error('No document data received from Google Docs API');
      }

      // Convert to HTML
      const html = await this.convertDocumentToHTML(response.data);
      
      // Clean HTML using the advanced cleaning pipeline
      const cleaningResult = cleanGoogleDocsHTML(html, cleaningOptions);
      
      // Parse structure
      const structure = this.parseDocumentStructure(response.data);
      
      // Get metadata
      const metadata: GoogleDocMetadata = {
        id: documentId,
        name: response.data.title || 'Untitled Document',
        mimeType: 'application/vnd.google-apps.document',
        createdTime: new Date().toISOString(), // Google Docs API doesn't provide this directly
        modifiedTime: response.data.revisionId || new Date().toISOString(),
        owners: [], // Would need Drive API for this
        permissions: [], // Would need Drive API for this
      };

      return {
        html,
        cleanedHtml: cleaningResult.cleanedHtml,
        structure,
        metadata,
      };
    } catch (error) {
      throw handleGoogleApiError(error);
    }
  }

  /**
   * Convert Google Docs document to HTML
   */
  private async convertDocumentToHTML(document: docs_v1.Schema$Document): Promise<string> {
    let html = '<div class="google-doc">\n';

    // Enhanced debugging for empty document issue
    console.log('🔍 Google Docs Document Structure Debug:', {
      hasDocument: !!document,
      documentKeys: document ? Object.keys(document) : [],
      hasBody: !!document.body,
      bodyKeys: document.body ? Object.keys(document.body) : [],
      hasBodyContent: !!document.body?.content,
      bodyContentLength: document.body?.content?.length || 0,
      documentTitle: document.title || 'No title',
      documentId: document.documentId,
      revisionId: document.revisionId,
      bodyContentTypes: document.body?.content?.map(el => Object.keys(el).filter(key => key !== 'endIndex' && key !== 'startIndex')) || [],
      fullBodyStructure: document.body ? JSON.stringify(document.body, null, 2).substring(0, 500) + '...' : 'No body'
    });

    if (!document.body) {
      console.error('❌ Google Docs document has no body object');
      return '<div class="google-doc"><p>Error: Document has no body - this might be a permissions issue or the document is corrupted</p></div>';
    }

    if (!document.body.content) {
      console.error('❌ Google Docs document body has no content array');
      return '<div class="google-doc"><p>Error: Document body has no content - this might indicate the document is truly empty or there are access restrictions</p></div>';
    }

    if (document.body.content.length === 0) {
      console.warn('⚠️ Google Docs document has empty content array');
      return '<div class="google-doc"><p>Empty document - the Google Docs document contains no content elements</p></div>';
    }

    for (const element of document.body.content) {
      const elementHtml = await this.convertElementToHTML(element, document);
      console.log('📄 Element converted to HTML:', {
        elementType: Object.keys(element).filter(key => key !== 'endIndex' && key !== 'startIndex'),
        htmlLength: elementHtml.length,
        htmlPreview: elementHtml.substring(0, 100) + '...'
      });
      html += elementHtml;
    }

    html += '</div>';
    
    console.log('✅ Final HTML conversion result:', {
      totalLength: html.length,
      htmlPreview: html.substring(0, 200) + '...'
    });
    
    return html;
  }

  /**
   * Convert individual document elements to HTML
   */
  private async convertElementToHTML(
    element: docs_v1.Schema$StructuralElement,
    document: docs_v1.Schema$Document
  ): Promise<string> {
    if (element.paragraph) {
      return this.convertParagraphToHTML(element.paragraph, document);
    }
    
    if (element.table) {
      return this.convertTableToHTML(element.table, document);
    }
    
    if (element.sectionBreak) {
      return '<hr class="section-break" />\n';
    }

    return '';
  }

  /**
   * Convert paragraph to HTML
   */
  private convertParagraphToHTML(
    paragraph: docs_v1.Schema$Paragraph,
    document: docs_v1.Schema$Document
  ): string {
    if (!paragraph.elements) {
      return '<p></p>\n';
    }

    let content = '';
    
    for (const element of paragraph.elements) {
      if (element.textRun) {
        const text = element.textRun.content || '';
        const style = element.textRun.textStyle;
        content += this.applyTextStyle(text, style);
      } else if (element.inlineObjectElement) {
        // Handle images and other inline objects
        const objectId = element.inlineObjectElement.inlineObjectId;
        if (objectId && document.inlineObjects && document.inlineObjects[objectId]) {
          const inlineObject = document.inlineObjects[objectId];
          content += this.convertInlineObjectToHTML(inlineObject);
        }
      }
    }

    // Determine paragraph style
    const paragraphStyle = paragraph.paragraphStyle;
    const headingLevel = paragraphStyle?.namedStyleType;
    
    if (headingLevel && headingLevel.startsWith('HEADING_')) {
      const level = headingLevel.replace('HEADING_', '');
      return `<h${level}>${content}</h${level}>\n`;
    }

    return `<p>${content}</p>\n`;
  }

  /**
   * Convert table to HTML
   */
  private convertTableToHTML(
    table: docs_v1.Schema$Table,
    document: docs_v1.Schema$Document
  ): string {
    if (!table.tableRows) {
      return '';
    }

    let html = '<table class="google-table">\n';
    
    for (const row of table.tableRows) {
      html += '  <tr>\n';
      
      if (row.tableCells) {
        for (const cell of row.tableCells) {
          html += '    <td>';
          
          if (cell.content) {
            for (const element of cell.content) {
              if (element.paragraph) {
                // Simplified paragraph conversion for table cells
                const cellContent = this.extractParagraphText(element.paragraph);
                html += cellContent;
              }
            }
          }
          
          html += '</td>\n';
        }
      }
      
      html += '  </tr>\n';
    }
    
    html += '</table>\n';
    return html;
  }

  /**
   * Apply text styling to content
   */
  private applyTextStyle(text: string, style?: docs_v1.Schema$TextStyle): string {
    if (!style) return text;

    let styledText = text;

    if (style.bold) {
      styledText = `<strong>${styledText}</strong>`;
    }
    
    if (style.italic) {
      styledText = `<em>${styledText}</em>`;
    }
    
    if (style.underline) {
      styledText = `<u>${styledText}</u>`;
    }

    return styledText;
  }

  /**
   * Convert inline objects (images) to HTML
   */
  private convertInlineObjectToHTML(inlineObject: docs_v1.Schema$InlineObject): string {
    if (!inlineObject.inlineObjectProperties?.embeddedObject) {
      return '';
    }

    const embeddedObject = inlineObject.inlineObjectProperties.embeddedObject;
    
    if (embeddedObject.imageProperties) {
      const imageProps = embeddedObject.imageProperties;
      const contentUri = imageProps.contentUri;
      const title = embeddedObject.title || '';
      const altText = embeddedObject.description || title;

      return `<img src="${contentUri}" alt="${altText}" title="${title}" class="google-doc-image" />`;
    }

    return '';
  }

  /**
   * Extract plain text from paragraph
   */
  private extractParagraphText(paragraph: docs_v1.Schema$Paragraph): string {
    if (!paragraph.elements) return '';

    let text = '';
    for (const element of paragraph.elements) {
      if (element.textRun?.content) {
        text += element.textRun.content;
      }
    }

    return text;
  }

  /**
   * Parse document structure to extract headings, paragraphs, tables, etc.
   */
  private parseDocumentStructure(document: docs_v1.Schema$Document): DocumentStructure {
    const headings: HeadingElement[] = [];
    const paragraphs: ParagraphElement[] = [];
    const tables: TableElement[] = [];
    const images: ImageElement[] = [];

    if (!document.body?.content) {
      return { headings, paragraphs, tables, images, styles: this.getDefaultStyles() };
    }

    let currentIndex = 0;

    for (const element of document.body.content) {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        const text = this.extractParagraphText(paragraph);
        const startIndex = currentIndex;
        const endIndex = currentIndex + text.length;

        // Check if it's a heading
        const headingLevel = paragraph.paragraphStyle?.namedStyleType;
        if (headingLevel && headingLevel.startsWith('HEADING_')) {
          const level = parseInt(headingLevel.replace('HEADING_', '')) as 1 | 2 | 3 | 4 | 5 | 6;
          headings.push({
            level,
            text,
            startIndex,
            endIndex,
          });
        } else {
          paragraphs.push({
            text,
            startIndex,
            endIndex,
          });
        }

        currentIndex = endIndex;
      } else if (element.table) {
        const table = element.table;
        const rows = table.tableRows?.length || 0;
        const columns = table.tableRows?.[0]?.tableCells?.length || 0;
        
        tables.push({
          rows,
          columns,
          startIndex: currentIndex,
          endIndex: currentIndex + 1, // Placeholder
          cells: this.parseTableCells(table),
        });

        currentIndex += 1;
      }
    }

    return {
      headings,
      paragraphs,
      tables,
      images,
      styles: this.getDefaultStyles(),
    };
  }

  /**
   * Parse table cells
   */
  private parseTableCells(table: docs_v1.Schema$Table): TableCell[][] {
    if (!table.tableRows) return [];

    return table.tableRows.map(row => {
      if (!row.tableCells) return [];
      
      return row.tableCells.map(cell => {
        let text = '';
        if (cell.content) {
          for (const element of cell.content) {
            if (element.paragraph) {
              text += this.extractParagraphText(element.paragraph);
            }
          }
        }

        return { text };
      });
    });
  }


  /**
   * Get default document styles
   */
  private getDefaultStyles(): StyleInfo {
    return {
      fontSize: 12,
      fontFamily: 'Arial',
      marginTop: 0,
      marginBottom: 0,
      lineHeight: 1.2,
    };
  }
}

/**
 * Factory function to create Google Docs service instance
 */
export async function createGoogleDocsService(
  tokens: GoogleAuthTokens,
  onTokenRefresh?: (newTokens: GoogleAuthTokens) => Promise<void>
): Promise<GoogleDocsService> {
  try {
    const oauth2Client = await createAuthenticatedClient(tokens, onTokenRefresh);
    return new GoogleDocsService(oauth2Client);
  } catch (error) {
    throw handleGoogleApiError(error);
  }
}

/**
 * Utility function to validate document access
 */
export async function validateDocumentAccess(
  documentId: string,
  tokens: GoogleAuthTokens
): Promise<boolean> {
  try {
    const service = await createGoogleDocsService(tokens);
    await service.getDocumentStructure(documentId);
    return true;
  } catch (error) {
    return false;
  }
}