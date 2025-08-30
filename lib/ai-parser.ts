// lib/ai-parser.ts
// AI Response Parser and Normalizer for document analysis

export type TagType = 'string' | 'date' | 'currency' | 'percent' | 'number' | 'id' | 'address';

export interface ParsedTag {
  name: string;
  slug: string; // stable identifier
  example: string;
  type: TagType;
  confidence: number;
  page?: number;
  anchor?: string;
  normalized?: string | number | boolean | Date | null; // normalized value based on type
}

export interface ParsedTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  normalized?: Record<string, string | number | boolean>;
}

export interface ParsedSection {
  id: string;
  title: string;
  markdown: string;
}

export interface ParsedAnalysis {
  sections: ParsedSection[];
  tables: ParsedTable[];
  tags: ParsedTag[];
  signatura?: {
    nom: string;
    carrec: string;
    data_lloc: string;
  };
}

/**
 * Create a stable slug from tag name
 */
export function createTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[àáäâ]/g, 'a')
    .replace(/[èéëê]/g, 'e')
    .replace(/[ìíïî]/g, 'i')
    .replace(/[òóöô]/g, 'o')
    .replace(/[ùúüû]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Infer tag type from name and example
 */
export function inferTagType(name: string, example: string): TagType {
  const lowerName = name.toLowerCase();
  const lowerExample = example.toLowerCase();
  
  // Currency patterns
  if (lowerExample.includes('€') || lowerExample.includes('eur') || 
      lowerName.includes('import') || lowerName.includes('preu') ||
      lowerName.includes('quota') || lowerName.includes('cost')) {
    return 'currency';
  }
  
  // Percentage patterns  
  if (lowerExample.includes('%') || lowerName.includes('pct') ||
      lowerName.includes('percentatge') || lowerName.includes('tant_per_cent')) {
    return 'percent';
  }
  
  // Date patterns
  if (lowerName.includes('data') || lowerName.includes('fecha') ||
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(example) ||
      /\d{1,2}\s+(de\s+)?(gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre)/.test(lowerExample)) {
    return 'date';
  }
  
  // Number patterns
  if (/^\d+([,\.]\d+)?$/.test(example.replace(/\s/g, '')) ||
      lowerName.includes('numero') || lowerName.includes('quantitat')) {
    return 'number';
  }
  
  // Address patterns
  if (lowerName.includes('adreca') || lowerName.includes('carrer') ||
      lowerName.includes('address') || lowerName.includes('direccio') ||
      /c\.\s|carrer\s|avinguda\s|plaça\s/i.test(example)) {
    return 'address';
  }
  
  // ID patterns (NIF, CIF, expedient numbers)
  if (lowerName.includes('nif') || lowerName.includes('cif') ||
      lowerName.includes('expedient') || lowerName.includes('referencia') ||
      /^\d+[A-Z]$/.test(example) || /^[A-Z]\d+$/.test(example)) {
    return 'id';
  }
  
  return 'string';
}

/**
 * Normalize value based on type
 */
export function normalizeValue(value: string, type: TagType): string | number | Date | null {
  switch (type) {
    case 'currency':
      // Extract number from currency string like "101,96 €"
      const currencyMatch = value.match(/([\d,\.]+)/);
      if (currencyMatch) {
        return parseFloat(currencyMatch[1].replace(',', '.'));
      }
      return value;
      
    case 'percent':
      // Extract number from percentage like "3,42%"
      const percentMatch = value.match(/([\d,\.]+)%?/);
      if (percentMatch) {
        return parseFloat(percentMatch[1].replace(',', '.'));
      }
      return value;
      
    case 'number':
      // Parse number with comma as decimal separator
      const numberStr = value.replace(/\s/g, '').replace(',', '.');
      const parsed = parseFloat(numberStr);
      return isNaN(parsed) ? value : parsed;
      
    case 'date':
      // Try to parse common Spanish/Catalan date formats
      const dateFormats = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, // dd/mm/yyyy or dd-mm-yy
        /(\d{1,2})\s+de\s+(gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre)\s+de\s+(\d{4})/ // dd de month de yyyy
      ];
      
      for (const format of dateFormats) {
        const match = value.match(format);
        if (match) {
          if (format.source.includes('gener')) {
            // Handle Catalan month names
            const monthNames = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 
                              'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
            const monthIndex = monthNames.indexOf(match[2]);
            if (monthIndex !== -1) {
              return `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
            }
          } else {
            // Handle numeric date
            let year = match[3];
            if (year.length === 2) {
              year = '20' + year; // Assume 2000s for 2-digit years
            }
            return `${year}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
          }
        }
      }
      return value;
      
    default:
      return value;
  }
}

// Raw AI response interfaces
interface RawTag {
  name: string;
  example: string;
  type?: TagType;
  confidence?: number;
  page?: number;
  anchor?: string;
}

interface RawSection {
  id: string;
  title: string;
  markdown: string;
}

interface RawTable {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
}

/**
 * Parse and normalize AI response tags
 */
export function parseAndNormalizeTags(rawTags: RawTag[]): ParsedTag[] {
  return rawTags.map(tag => {
    const inferredType = inferTagType(tag.name, tag.example);
    const finalType = tag.type || inferredType;
    
    return {
      name: tag.name,
      slug: createTagSlug(tag.name),
      example: tag.example,
      type: finalType,
      confidence: tag.confidence || 0.8,
      page: tag.page,
      anchor: tag.anchor,
      normalized: normalizeValue(tag.example, finalType)
    };
  });
}

/**
 * Parse and normalize sections
 */
export function parseAndNormalizeSections(rawSections: RawSection[]): ParsedSection[] {
  return rawSections.map((section, index) => ({
    id: section.id || createTagSlug(section.title || `section_${index}`),
    title: section.title || `Section ${index + 1}`,
    markdown: section.markdown || ''
  }));
}

/**
 * Parse and normalize tables
 */
export function parseAndNormalizeTables(rawTables: RawTable[]): ParsedTable[] {
  return rawTables.map((table, index) => ({
    id: table.id || createTagSlug(table.title || `table_${index}`),
    title: table.title || `Table ${index + 1}`,
    headers: Array.isArray(table.headers) ? table.headers : [],
    rows: Array.isArray(table.rows) ? table.rows : [],
    normalized: table.normalized
  }));
}

interface RawAnalysis {
  sections?: RawSection[];
  tables?: RawTable[];
  tags?: RawTag[];
  signatura?: string;
}

/**
 * Complete analysis parsing and normalization
 */
export function parseAIAnalysis(rawAnalysis: RawAnalysis): ParsedAnalysis {
  return {
    sections: parseAndNormalizeSections(rawAnalysis.sections || []),
    tables: parseAndNormalizeTables(rawAnalysis.tables || []),
    tags: parseAndNormalizeTags(rawAnalysis.tags || []),
    signatura: rawAnalysis.signatura
  };
}