// lib/types.ts
// Centralized TypeScript type definitions

// ==================== CORE DOCUMENT TYPES ====================

export type DocumentType = 'string' | 'date' | 'currency' | 'percent' | 'number' | 'id' | 'address';

export interface ParsedTag {
  name: string;
  slug: string;
  example: string;
  type: DocumentType;
  confidence: number;
  page?: number;
  anchor?: string;
  normalized?: string | number;
}

export interface ParsedSection {
  id: string;
  title: string;
  markdown: string;
}

export interface ParsedTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  normalized?: Record<string, number>;
}

export interface DocumentSignature {
  nom: string;
  carrec: string;
  data_lloc: string;
}

export interface AnalysisData {
  templateId: string;
  markdown: string;
  sections: ParsedSection[];
  tables: ParsedTable[];
  tags: ParsedTag[];
  signatura?: DocumentSignature;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface UploadResponse {
  templateId: string;
  fileName: string;
  filePath: string;
  pdfUrl?: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ExtractionResponse {
  templateId: string;
  analysisPath: string;
  markdown: string;
  sections: ParsedSection[];
  tables: ParsedTable[];
  tags: ParsedTag[];
  signatura?: DocumentSignature;
  metadata: {
    fileName: string;
    fileSize: number;
    sectionsCount: number;
    tablesCount: number;
    tagsCount: number;
    processingMethod: string;
    timestamp: string;
  };
}

// ==================== MAPPING TYPES ====================

export interface FuzzyMatch {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface TagMapping extends FuzzyMatch {
  tagSlug: string;
  tagName: string;
  tagExample: string;
  suggestedHeader: string;
}

export interface MappingResponse {
  mappings: TagMapping[];
  totalTags: number;
  highConfidenceCount: number;
  processingTime: number;
}

// ==================== FREEZE TYPES ====================

export type ReplacementMethod = 'exact_match' | 'anchor_based' | 'pattern_match' | 'manual_required';

export interface PlaceholderReplacement {
  original: string;
  placeholder: string;
  confidence: number;
  method: ReplacementMethod;
  applied: boolean;
  reason?: string;
}

export interface FreezeResponse {
  templateId: string;
  frozenTemplateUrl: string;
  replacements: PlaceholderReplacement[];
  totalReplacements: number;
  successfulReplacements: number;
  manualReviewRequired: string[];
  frozenAt: string;
}

// ==================== GENERATION TYPES ====================

export interface ExcelRowData {
  [columnHeader: string]: string | number | boolean | null;
}

export interface GeneratedDocument {
  documentId: string;
  fileName: string;
  downloadUrl: string;
  rowIndex: number;
  rowData: ExcelRowData;
  fileSize: number;
  generatedAt: string;
}

export interface GenerationError {
  rowIndex: number;
  error: string;
  rowData: ExcelRowData;
}

export interface GenerationResponse {
  templateId: string;
  totalRequested: number;
  totalGenerated: number;
  totalErrors: number;
  documents: GeneratedDocument[];
  errors: GenerationError[];
  processingTime: number;
  batchId: string;
}

// ==================== EXCEL TYPES ====================

export interface ExcelColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sampleValues: (string | number | boolean | null)[];
  uniqueCount: number;
  nullCount: number;
}

export interface ExcelAnalysis {
  headers: string[];
  rowCount: number;
  columns: ExcelColumnInfo[];
  sampleData: ExcelRowData[];
  fileName: string;
  sheetNames: string[];
}

// ==================== UI STATE TYPES ====================

export type PipelineStatus = 'uploaded' | 'analyzed' | 'mapped' | 'frozen' | 'production';

export interface UIError {
  message: string;
  code?: string;
  timestamp: string;
}

export interface GenerationResult {
  batchId: string;
  totalGenerated: number;
  documents: Array<{
    fileName: string;
    downloadUrl: string;
    rowIndex: number;
  }>;
}

// ==================== FORM VALIDATION ====================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: string;
}

// ==================== SUPABASE STORAGE ====================

export interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: {
    eTag: string;
    size: number;
    mimetype: string;
    cacheControl: string;
    lastModified: string;
    contentLength: number;
    httpStatusCode: number;
  };
}

// ==================== TYPE GUARDS ====================

export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return typeof obj === 'object' && obj !== null && 'success' in obj;
}

export function isAnalysisData(obj: unknown): obj is AnalysisData {
  return typeof obj === 'object' && obj !== null &&
    'templateId' in obj && 'markdown' in obj && 'tags' in obj;
}

export function isExcelRowData(obj: unknown): obj is ExcelRowData {
  return typeof obj === 'object' && obj !== null;
}

// ==================== UTILITY TYPES ====================

export type NonEmptyArray<T> = [T, ...T[]];

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;