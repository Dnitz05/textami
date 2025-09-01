// lib/compatibility/unified-system.ts
// EMERGENCY: Unified compatibility layer for DOCX + Google Docs systems
// Created to prevent Fase 4 crashes while systems are being integrated

export type SourceType = 'docx' | 'google-docs';

// Universal template format that both systems must return
export interface UnifiedTemplate {
  // Core fields - ALWAYS present
  templateId: string;
  fileName: string;
  sourceType: SourceType;
  
  // Content fields - ALWAYS present (UI depends on these)
  transcription: string;    // HTML content
  markdown: string;         // Clean text - CRÍTIC per UI
  
  // Structure fields - ALWAYS present
  placeholders: UnifiedPlaceholder[];
  sections: UnifiedSection[];
  tables: UnifiedTable[];
  
  // Source-specific data
  sourceData: DOCXSourceData | GoogleDocsSourceData;
  
  // Metadata
  metadata: {
    processingTimeMs: number;
    extractionMethod: string;
    confidence: number;
    elementsFound: {
      sections: number;
      tables: number;
      signatures: number;
      paragraphs: number;
    };
  };
}

export interface UnifiedPlaceholder {
  text: string;
  variable: string;
  confidence: number;
  context: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  // Source-specific position data
  position?: any;
}

export interface UnifiedSection {
  id: string;
  title: string;
  type: 'title' | 'heading1' | 'heading2' | 'heading3';
  markdown: string;
  // For instructions targeting
  selector?: string;
}

export interface UnifiedTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  // For instructions targeting
  selector?: string;
  normalized: Record<string, any>;
}

// Source-specific data interfaces
export interface DOCXSourceData {
  storageUrl: string;
  fileSize: number;
  mimeType: string;
  originalBuffer?: Buffer;
}

export interface GoogleDocsSourceData {
  googleDocId: string;
  lastModified?: string;
  permissions?: any;
  driveMetadata?: any;
}

// EMERGENCY: Convert DOCX response to unified format
export function convertDOCXToUnified(docxResponse: any): UnifiedTemplate {
  // Handle null/undefined input
  if (!docxResponse) {
    return createFallbackTemplate('docx', 'Unknown Document');
  }

  return {
    templateId: docxResponse.templateId || `docx_${Date.now()}`,
    fileName: docxResponse.fileName || 'Unknown Document',
    sourceType: 'docx',
    
    // Content fields
    transcription: docxResponse.transcription || docxResponse.data?.transcription || '',
    markdown: docxResponse.markdown || docxResponse.data?.markdown || extractTextFromHTML(docxResponse.transcription || docxResponse.data?.transcription) || 'Document processed',
    
    // Structure fields  
    placeholders: (docxResponse.placeholders || docxResponse.data?.placeholders || [])
      .filter((p: any) => p && typeof p === 'object' && p.text) // Filter out invalid entries
      .map((p: any) => ({
        text: p.text,
        variable: p.variable || p.text,
        confidence: p.confidence || 50,
        context: p.context || p.reasoning || '',
        type: p.type || 'text',
        position: p.position
      })),
    
    sections: (docxResponse.sections || docxResponse.data?.sections || []).map((s: any, idx: number) => ({
      id: s.id || `section_${idx}`,
      title: s.title,
      type: s.type || 'heading1',
      markdown: s.markdown || `## ${s.title}\n`,
      selector: `#section_${idx}`
    })),
    
    tables: (docxResponse.tables || docxResponse.data?.tables || []).map((t: any, idx: number) => ({
      id: t.id || `table_${idx}`,
      title: t.title || `Table ${idx + 1}`,
      headers: t.headers || [],
      rows: t.rows || [],
      selector: `#table_${idx}`,
      normalized: t.normalized || {}
    })),
    
    // Source-specific data
    sourceData: {
      storageUrl: docxResponse.storageUrl || docxResponse.data?.storageUrl || '',
      fileSize: docxResponse.fileSize || 0,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    } as DOCXSourceData,
    
    // Metadata
    metadata: {
      processingTimeMs: docxResponse.metadata?.processingTimeMs || 0,
      extractionMethod: docxResponse.metadata?.extractionMethod || 'docx-system',
      confidence: docxResponse.confidence || 95,
      elementsFound: docxResponse.metadata?.elementsFound || {
        sections: docxResponse.sections?.length || 0,
        tables: docxResponse.tables?.length || 0,
        signatures: 0,
        paragraphs: 0
      }
    }
  };
}

// EMERGENCY: Convert Google Docs response to unified format
export function convertGoogleDocsToUnified(googleResponse: any): UnifiedTemplate {
  // Handle null/undefined input
  if (!googleResponse) {
    return createFallbackTemplate('google-docs', 'Unknown Google Doc');
  }

  const data = googleResponse.data || googleResponse;
  
  return {
    templateId: data.templateId || `google_docs_${Date.now()}`,
    fileName: data.fileName || 'Unknown Google Doc',
    sourceType: 'google-docs',
    
    // Content fields - CRITICAL: Generate markdown if missing
    transcription: data.transcription || data.html || '',
    markdown: data.markdown || extractTextFromHTML(data.transcription || data.html) || 'Google Docs content processed',
    
    // Structure fields
    placeholders: (data.placeholders || [])
      .filter((p: any) => p && typeof p === 'object' && p.text) // Filter out invalid entries
      .map((p: any) => ({
        text: p.text,
        variable: p.variable || p.text,
        confidence: p.confidence || 50,
        context: p.context || p.reasoning || '',
        type: p.type || 'text',
        position: p.position
      })),
    
    sections: (data.sections || []).map((s: any, idx: number) => ({
      id: s.id || `section_${idx}`,
      title: s.title,
      type: s.type || 'heading1', 
      markdown: s.markdown || `## ${s.title}\n`,
      selector: `#section_${idx}`
    })),
    
    tables: (data.tables || []).map((t: any, idx: number) => ({
      id: t.id || `table_${idx}`,
      title: t.title || `Table ${idx + 1}`,
      headers: t.headers || [],
      rows: t.rows || [],
      selector: `#table_${idx}`,
      normalized: t.normalized || {}
    })),
    
    // Source-specific data
    sourceData: {
      googleDocId: data.googleDocId || '',
      lastModified: data.lastModified,
      permissions: data.permissions,
      driveMetadata: data.driveMetadata
    } as GoogleDocsSourceData,
    
    // Metadata
    metadata: {
      processingTimeMs: data.processing?.processingTime || 0,
      extractionMethod: 'google-docs-system',
      confidence: data.confidence || 85,
      elementsFound: {
        sections: data.sections?.length || 0,
        tables: data.tables?.length || 0,
        signatures: 0,
        paragraphs: data.processing?.elementsExtracted || 0
      }
    }
  };
}

// Helper: Extract clean text from HTML (fallback for markdown field)
function extractTextFromHTML(html: string): string {
  if (!html) return '';
  
  return html
    .replace(/<[^>]+>/g, ' ')      // Remove HTML tags
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .trim()
    .substring(0, 1000);           // Limit length for safety
}

// EMERGENCY: Validate unified response before sending to UI
export function validateUnifiedTemplate(template: any): UnifiedTemplate | null {
  try {
    // Critical validation - these fields MUST exist for UI compatibility
    const required = ['templateId', 'fileName', 'transcription', 'markdown'];
    
    for (const field of required) {
      if (template[field] === undefined || template[field] === null) {
        console.error(`VALIDATION ERROR: Missing critical field '${field}' in unified template`);
        return null;
      }
    }
    
    // Ensure arrays are actually arrays
    const arrayFields = ['placeholders', 'sections', 'tables'];
    for (const field of arrayFields) {
      if (!Array.isArray(template[field])) {
        console.error(`VALIDATION ERROR: Field '${field}' must be an array`);
        template[field] = [];
      }
    }
    
    // Ensure strings are actually strings
    const stringFields = ['templateId', 'fileName', 'transcription', 'markdown'];
    for (const field of stringFields) {
      if (typeof template[field] !== 'string') {
        console.error(`VALIDATION ERROR: Field '${field}' must be a string`);
        template[field] = String(template[field] || '');
      }
    }
    
    return template as UnifiedTemplate;
    
  } catch (error) {
    console.error('VALIDATION ERROR: Failed to validate unified template:', error);
    return null;
  }
}

// EMERGENCY: Create minimal valid template if conversion fails
export function createFallbackTemplate(sourceType: SourceType, fileName: string): UnifiedTemplate {
  return {
    templateId: `fallback_${Date.now()}`,
    fileName,
    sourceType,
    transcription: `<div><h1>${fileName}</h1><p>Document processed successfully but content extraction failed.</p></div>`,
    markdown: `# ${fileName}\n\nDocument processed successfully but content extraction failed.`,
    placeholders: [],
    sections: [{
      id: 'fallback_section',
      title: fileName,
      type: 'title' as const,
      markdown: `# ${fileName}\n`,
      selector: '#fallback_section'
    }],
    tables: [],
    sourceData: sourceType === 'docx' 
      ? { storageUrl: '', fileSize: 0, mimeType: '' } as DOCXSourceData
      : { googleDocId: '' } as GoogleDocsSourceData,
    metadata: {
      processingTimeMs: 0,
      extractionMethod: 'fallback-system',
      confidence: 0,
      elementsFound: { sections: 0, tables: 0, signatures: 0, paragraphs: 0 }
    }
  };
}