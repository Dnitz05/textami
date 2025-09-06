import { docs_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createAuthenticatedClient, handleGoogleApiError, createGoogleOAuth2Client } from './auth';
import { GoogleAuthTokens, GoogleDocMetadata } from './types';
import { cleanGoogleDocsHTML, CleaningOptions } from './html-cleaner';
import { GoogleDriveClient } from './drive-client';

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
  private driveClient: GoogleDriveClient;
  private oauth2Client: OAuth2Client;

  constructor(oauth2Client: OAuth2Client) {
    this.oauth2Client = oauth2Client;
    this.docsClient = google.docs({ version: 'v1', auth: oauth2Client });
    this.driveClient = new GoogleDriveClient(oauth2Client);
  }

  /**
   * Export Google Doc to HTML format using Drive API (preferred) with Docs API fallback
   */
  async exportToHTML(documentId: string, cleaningOptions?: CleaningOptions): Promise<string> {
    console.log('🚀 Starting HTML export with Drive API first approach:', { documentId });
    
    try {
      // Method 1: Try Drive API export (superior format preservation)
      try {
        console.log('📥 Attempting Drive API export...');
        const driveExport = await this.driveClient.exportFileToHTML(documentId);
        
        console.log('✅ Drive API export successful:', {
          htmlLength: driveExport.html.length,
          hasImages: !!driveExport.images,
          imageCount: driveExport.images ? Object.keys(driveExport.images).length : 0,
          isZipped: driveExport.isZipped
        });

        // Clean the HTML from Drive export
        const cleaningResult = cleanGoogleDocsHTML(driveExport.html, cleaningOptions);
        
        // TODO: Handle images - for now we'll include them as data URIs or store references
        // This could be enhanced to save images to storage and update HTML references
        
        console.log('✅ HTML cleaned successfully:', {
          originalLength: driveExport.html.length,
          cleanedLength: cleaningResult.cleanedHtml.length,
          removedElements: cleaningResult.removedElements?.length || 0
        });
        
        return cleaningResult.cleanedHtml;
        
      } catch (driveError) {
        console.warn('⚠️ Drive API export failed, falling back to Docs API:', driveError);
        
        // If it's a file size error, re-throw immediately
        if (driveError instanceof Error && driveError.message.includes('File too large')) {
          throw driveError;
        }
        
        // Method 2: Fallback to Docs API conversion (original method)
        console.log('🔄 Using fallback Docs API conversion...');
        
        const response = await this.docsClient.documents.get({
          documentId,
          includeTabsContent: true,
        });

        if (!response.data) {
          throw new Error('No document data received from fallback Docs API');
        }

        // Convert Google Docs content to HTML using manual conversion
        const html = await this.convertDocumentToHTML(response.data);
        
        // Clean the manually converted HTML
        const cleaningResult = cleanGoogleDocsHTML(html, cleaningOptions);
        
        console.log('✅ Fallback conversion completed:', {
          htmlLength: html.length,
          cleanedLength: cleaningResult.cleanedHtml.length
        });
        
        return cleaningResult.cleanedHtml;
      }
      
    } catch (error) {
      console.error('❌ Both Drive and Docs API methods failed:', error);
      throw handleGoogleApiError(error);
    }
  }

  /**
   * Get document metadata and structure information
   */
  async getDocumentStructure(documentId: string): Promise<DocumentStructure> {
    try {
      console.log('🔍 Getting document structure for:', { documentId });
      
      const response = await this.docsClient.documents.get({
        documentId,
        includeTabsContent: true,
      });

      console.log('📊 Document structure API response:', {
        hasResponse: !!response,
        hasData: !!response.data,
        status: response.status,
        statusText: response.statusText,
        dataKeys: response.data ? Object.keys(response.data) : [],
        title: response.data?.title,
        hasBody: !!response.data?.body,
        bodyKeys: response.data?.body ? Object.keys(response.data.body) : [],
        hasBodyContent: !!response.data?.body?.content,
        bodyContentLength: response.data?.body?.content?.length || 0
      });

      if (!response.data) {
        console.error('❌ No response data from Google Docs API');
        throw new Error('No document data received from Google Docs API');
      }

      // Handle both new Tab-based structure and legacy body structure
      let documentBody = response.data.body;
      
      if (!documentBody && response.data.tabs && response.data.tabs.length > 0) {
        // New tab-based structure - use first tab's document body
        const firstTab = response.data.tabs[0];
        if (firstTab.documentTab?.body) {
          documentBody = firstTab.documentTab.body;
          console.log('✅ Using tab-based document structure');
        }
      }

      if (!documentBody) {
        console.error('❌ Document response has no body property in main document or tabs:', {
          availableKeys: Object.keys(response.data),
          hasTabs: !!response.data.tabs,
          tabCount: response.data.tabs?.length || 0,
          fullResponse: JSON.stringify(response.data, null, 2).substring(0, 500) + '...'
        });
        throw new Error('No document body received - document may be empty or access restricted');
      }

      // Create modified document structure for parsing
      const documentForParsing = {
        ...response.data,
        body: documentBody
      };

      const structure = this.parseDocumentStructure(documentForParsing);
      return structure;
    } catch (error) {
      console.error('❌ Document structure fetch failed:', error);
      throw handleGoogleApiError(error);
    }
  }

  /**
   * Parse document content and extract structured elements using Drive API first
   */
  async parseDocumentContent(
    documentId: string,
    cleaningOptions?: CleaningOptions
  ): Promise<GoogleDocsExportResult> {
    try {
      console.log('🔍 Starting document parsing with Drive API first approach:', { 
        documentId,
        hasDocsClient: !!this.docsClient,
        hasDriveClient: !!this.driveClient
      });
      
      // Try to get HTML using the new exportToHTML method (Drive API first)
      let html: string;
      let cleanedHtml: string;
      
      try {
        console.log('📥 Getting HTML using Drive API export...');
        html = await this.exportToHTML(documentId, cleaningOptions);
        cleanedHtml = html; // Already cleaned by exportToHTML
        
        console.log('✅ HTML export successful:', {
          htmlLength: html.length
        });
        
      } catch (exportError) {
        console.warn('⚠️ HTML export failed, falling back to manual parsing:', exportError);
        throw exportError; // Re-throw to use the original parsing logic below
      }

      // For structure analysis, we still need to use Docs API 
      // (Drive API only gives us HTML, not structured document data)
      console.log('📊 Getting document structure using Docs API...');
      
      // Validate OAuth2 client credentials before making the request
      try {
        const credentials = this.oauth2Client.credentials;
        console.log('🔑 OAuth2 Credentials Check:', {
          hasAccessToken: !!credentials.access_token,
          hasRefreshToken: !!credentials.refresh_token,
          tokenExpiry: credentials.expiry_date,
          isExpired: credentials.expiry_date ? credentials.expiry_date < Date.now() : 'Unknown',
          scope: credentials.scope
        });
        
        // Check if token is expired and attempt refresh if needed
        if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
          console.warn('⚠️ Access token appears expired, Google SDK should auto-refresh');
        }
      } catch (authError) {
        console.error('❌ Authentication validation failed:', authError);
        throw new Error(`Authentication validation failed: ${authError instanceof Error ? authError.message : 'Unknown auth error'}`);
      }
      
      // Get document structure using Docs API (still needed for structured data)
      let response;
      try {
        response = await this.docsClient.documents.get({
          documentId,
          includeTabsContent: true,
        });
      } catch (primaryError) {
        console.warn('⚠️ Primary document structure fetch failed, trying fallback without tabs:', primaryError);
        
        // Fallback: try without includeTabsContent
        try {
          response = await this.docsClient.documents.get({
            documentId,
          });
          console.log('✅ Fallback structure request succeeded without includeTabsContent');
        } catch (fallbackError) {
          console.error('❌ Both primary and fallback structure requests failed');
          throw primaryError; // Throw the original error for better debugging
        }
      }

      console.log('📊 Google Docs API Response:', {
        hasResponse: !!response,
        hasData: !!response.data,
        status: response.status,
        statusText: response.statusText,
        dataKeys: response.data ? Object.keys(response.data) : [],
        title: response.data?.title,
        documentId: response.data?.documentId,
        revisionId: response.data?.revisionId,
        hasBody: !!response.data?.body,
        bodyKeys: response.data?.body ? Object.keys(response.data.body) : [],
        hasBodyContent: !!response.data?.body?.content,
        bodyContentLength: response.data?.body?.content?.length || 0,
        fullDataStructure: response.data ? JSON.stringify(response.data, null, 2).substring(0, 1000) + '...' : 'No data'
      });

      if (!response.data) {
        console.error('❌ CRITICAL: No response.data from Google Docs API');
        throw new Error('No document data received from Google Docs API');
      }

      // Handle both new Tab-based structure and legacy body structure
      let documentBody = response.data.body;
      
      if (!documentBody && response.data.tabs && response.data.tabs.length > 0) {
        // New tab-based structure - use first tab's document body
        const firstTab = response.data.tabs[0];
        if (firstTab.documentTab?.body) {
          documentBody = firstTab.documentTab.body;
          console.log('✅ Using tab-based document structure for content parsing');
        }
      }

      if (!documentBody) {
        console.error('❌ CRITICAL: response.data exists but has no body property in main document or tabs:', {
          availableDataKeys: Object.keys(response.data),
          dataTitle: response.data.title,
          dataDocId: response.data.documentId,
          hasTabs: !!response.data.tabs,
          tabCount: response.data.tabs?.length || 0,
          fullDataStructure: JSON.stringify(response.data, null, 2).substring(0, 1000) + '...'
        });
        
        // Provide specific guidance based on what we have
        if (response.data.title && response.data.documentId) {
          throw new Error(`Document "${response.data.title}" (ID: ${response.data.documentId}) has no body content. This may indicate the new Google Docs tab structure is not being handled correctly, or the document is empty. Please check the document has content and try again.`);
        } else {
          throw new Error('No document body received - this indicates either an empty document, access restrictions, or API response format issue');
        }
      }

      // Create modified document structure for processing
      const documentForProcessing = {
        ...response.data,
        body: documentBody
      };

      // Parse structure from Docs API (we already have HTML from Drive API)
      const structure = this.parseDocumentStructure(documentForProcessing);
      
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
        cleanedHtml,
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

/**
 * Comprehensive diagnostic function for Google Docs API issues
 */
export async function diagnoseGoogleDocsIssue(
  documentId: string,
  tokens: GoogleAuthTokens
): Promise<{
  success: boolean;
  diagnostics: {
    tokenValid: boolean;
    documentExists: boolean;
    hasPermissions: boolean;
    documentStructure?: any;
    error?: string;
    recommendations: string[];
  };
}> {
  const diagnostics = {
    tokenValid: false,
    documentExists: false,
    hasPermissions: false,
    documentStructure: undefined as any,
    error: undefined as string | undefined,
    recommendations: [] as string[]
  };

  try {
    console.log('🔍 Starting comprehensive Google Docs diagnostics...');
    
    // Step 1: Validate tokens
    try {
      const oauth2Client = createGoogleOAuth2Client();
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      });
      
      await oauth2Client.getTokenInfo(tokens.access_token);
      diagnostics.tokenValid = true;
      console.log('✅ OAuth tokens are valid');
    } catch (tokenError) {
      console.log('❌ Token validation failed:', tokenError);
      diagnostics.recommendations.push('Re-authorize your Google account - tokens appear invalid or expired');
    }

    // Step 2: Test document access
    if (diagnostics.tokenValid) {
      try {
        const service = await createGoogleDocsService(tokens);
        const structure = await service.getDocumentStructure(documentId);
        
        diagnostics.documentExists = true;
        diagnostics.hasPermissions = true;
        diagnostics.documentStructure = {
          headings: structure.headings.length,
          paragraphs: structure.paragraphs.length,
          tables: structure.tables.length,
          images: structure.images.length
        };
        
        console.log('✅ Document access successful');
        
        if (structure.paragraphs.length === 0 && structure.headings.length === 0) {
          diagnostics.recommendations.push('Document appears to be empty - add some content to the Google Doc');
        }
        
      } catch (accessError) {
        console.log('❌ Document access failed:', accessError);
        diagnostics.error = accessError instanceof Error ? accessError.message : String(accessError);
        
        if (accessError instanceof Error) {
          if (accessError.message.includes('403') || accessError.message.includes('Permission')) {
            diagnostics.recommendations.push('Check document sharing settings - you may not have read access');
            diagnostics.recommendations.push('Ensure the document is shared with your Google account');
          } else if (accessError.message.includes('404') || accessError.message.includes('Not Found')) {
            diagnostics.documentExists = false;
            diagnostics.recommendations.push('Document ID may be incorrect or document has been deleted');
          } else if (accessError.message.includes('401') || accessError.message.includes('Authentication')) {
            diagnostics.recommendations.push('Re-authorize your Google account - authentication has expired');
          } else if (accessError.message.includes('body')) {
            diagnostics.documentExists = true;
            diagnostics.hasPermissions = true;
            diagnostics.recommendations.push('Document exists but appears to have no readable content');
            diagnostics.recommendations.push('Try adding some text content to the Google Doc');
          }
        }
      }
    }

    // Step 3: Provide general recommendations
    if (!diagnostics.tokenValid) {
      diagnostics.recommendations.push('Start by re-authorizing your Google account');
    } else if (!diagnostics.documentExists) {
      diagnostics.recommendations.push('Verify the document ID is correct');
      diagnostics.recommendations.push('Check if the document exists in Google Drive');
    } else if (!diagnostics.hasPermissions) {
      diagnostics.recommendations.push('Request edit or view access to the document');
      diagnostics.recommendations.push('Check if the document is in a restricted folder');
    }

    return {
      success: diagnostics.tokenValid && diagnostics.documentExists && diagnostics.hasPermissions,
      diagnostics
    };
    
  } catch (error) {
    diagnostics.error = error instanceof Error ? error.message : String(error);
    diagnostics.recommendations.push('Unexpected error occurred - check console logs for details');
    
    return {
      success: false,
      diagnostics
    };
  }
}