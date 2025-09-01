// app/api/ai-docx/analyze/route.ts
// UPDATED: Now uses OOXML+IA Hybrid Pipeline instead of GPT Vision
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { log } from '@/lib/logger';
const PizZip = require('pizzip');

// Initialize OpenAI client lazily
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// OOXML+IA Hybrid Analysis - Preserving UI compatibility

// Document structure extraction
interface DocumentElement {
  type: 'title' | 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'table' | 'signature' | 'list';
  text: string;
  style?: string;
  level?: number;
  rows?: string[][];
  items?: string[];
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    centered?: boolean;
    fontSize?: number;
  };
}

function extractFormattingInfo(paragraph: string): DocumentElement['formatting'] {
  const formatting: DocumentElement['formatting'] = {};
  
  // Check for bold text
  if (paragraph.includes('<w:b/>') || paragraph.includes('<w:b>')) {
    formatting.bold = true;
  }
  
  // Check for italic text
  if (paragraph.includes('<w:i/>') || paragraph.includes('<w:i>')) {
    formatting.italic = true;
  }
  
  // Check for centered alignment
  if (paragraph.includes('<w:jc w:val="center"/>') || paragraph.includes('<w:jc w:val="centre"/>')) {
    formatting.centered = true;
  }
  
  // Extract font size
  const fontSizeMatch = paragraph.match(/<w:sz w:val="(\d+)"\/>/);
  if (fontSizeMatch) {
    // Word stores font size in half-points, convert to points
    formatting.fontSize = parseInt(fontSizeMatch[1]) / 2;
  }
  
  return Object.keys(formatting).length > 0 ? formatting : undefined;
}

function extractSpacingInfo(paragraph: string): { spaceBefore?: number; spaceAfter?: number } {
  const spacing: { spaceBefore?: number; spaceAfter?: number } = {};
  
  // Extract space before paragraph (in twips, 1440 twips = 1 inch)
  const spaceBeforeMatch = paragraph.match(/<w:spacing[^>]*w:before="(\d+)"/);
  if (spaceBeforeMatch) {
    spacing.spaceBefore = parseInt(spaceBeforeMatch[1]);
  }
  
  // Extract space after paragraph
  const spaceAfterMatch = paragraph.match(/<w:spacing[^>]*w:after="(\d+)"/);
  if (spaceAfterMatch) {
    spacing.spaceAfter = parseInt(spaceAfterMatch[1]);
  }
  
  return spacing;
}

function extractDocumentStructure(documentXml: string): DocumentElement[] {
  const elements: DocumentElement[] = [];
  
  // Extract paragraphs with style information
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  const paragraphs = documentXml.match(paragraphRegex) || [];
  
  for (const paragraph of paragraphs) {
    // Extract text content
    const textMatches = paragraph.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const text = textMatches
      .map(match => match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
      .join('')
      .trim();
    
    if (!text) continue;
    
    // Extract style information
    const styleMatch = paragraph.match(/<w:pStyle[^>]*w:val="([^"]*)"[^>]*>/);
    const styleName = styleMatch ? styleMatch[1] : 'Normal';
    
    // Extract formatting information
    const formatting = extractFormattingInfo(paragraph);
    
    // Extract spacing information
    const spacing = extractSpacingInfo(paragraph);
    
    // Classify element type based on style, content, formatting, and spacing
    const elementType = classifyElement(text, styleName, formatting, spacing);
    
    elements.push({
      type: elementType,
      text: text,
      style: styleName,
      formatting: formatting
    });
  }
  
  // Extract tables
  const tableRegex = /<w:tbl[^>]*>([\s\S]*?)<\/w:tbl>/g;
  const tables = documentXml.match(tableRegex) || [];
  
  for (const table of tables) {
    const rows = extractTableRows(table);
    if (rows.length > 0) {
      elements.push({
        type: 'table',
        text: table, // Store the raw XML for enhanced processing
        rows: rows
      });
    }
  }
  
  return elements;
}

function detectSpecialContent(text: string): { type: string; patterns: string[] } {
  const patterns: string[] = [];
  let contentType = 'text';
  
  // Detect dates (various formats)
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // DD/MM/YYYY or MM/DD/YYYY
    /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,   // DD-MM-YYYY
    /\b\d{1,2}\s+de\s+(gener|febrer|març|abril|maig|juny|juliol|agost|setembre|octubre|novembre|desembre)\s+de\s+\d{4}\b/gi,
    /\b\d{1,2}\s+(de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(de\s+)?\d{4}\b/gi,
    /\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo),?\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}\b/gi
  ];
  
  datePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      patterns.push(...matches);
      contentType = 'date';
    }
  });
  
  // Detect addresses
  const addressPatterns = [
    /\b(carrer|calle|c\/|avinguda|avenida|av\.?|plaça|plaza|pl\.?)\s+[\w\s]+,?\s*\d+/gi,
    /\b\d{5}\s+[A-ZÀ-ÿ][a-zà-ÿ\s]+,\s*[A-ZÀ-ÿ][a-zà-ÿ\s]+/g, // Postal code + city, province
    /\bCP\s*:?\s*\d{5}/gi, // CP: 08001
    /\b[A-Z]{2}\s*-?\s*\d{4,5}\s+[A-ZÀ-ÿ][a-zà-ÿ\s]+/g // License plate format + location
  ];
  
  addressPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      patterns.push(...matches);
      if (contentType !== 'date') contentType = 'address';
    }
  });
  
  // Detect phone numbers
  const phonePatterns = [
    /\b(\+34\s?)?[6-9]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/g, // Spanish mobile
    /\b(\+34\s?)?[8-9]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/g, // Spanish landline
    /\btel\.?\s*:?\s*[\d\s\-\+\(\)]+/gi
  ];
  
  phonePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      patterns.push(...matches);
      if (contentType === 'text') contentType = 'contact';
    }
  });
  
  // Detect emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailPattern);
  if (emails) {
    patterns.push(...emails);
    if (contentType === 'text') contentType = 'contact';
  }
  
  return { type: contentType, patterns };
}

function classifyElement(text: string, styleName: string, formatting?: DocumentElement['formatting'], spacing?: { spaceBefore?: number; spaceAfter?: number }): DocumentElement['type'] {
  // Check for signature patterns first
  if (text.match(/signat per|firmat per|signature|signatura|atentament|cordialmente|salutacions/i)) {
    return 'signature';
  }
  
  // Detect special content (dates, addresses, etc.)
  const specialContent = detectSpecialContent(text);
  // Note: We could add special handling for date/address content here if needed
  
  // USE SPACING INFORMATION TO DETECT SECTION BREAKS
  // Large space before (> 720 twips = 0.5 inch) often indicates a new section
  const hasLargeSpaceBefore = spacing?.spaceBefore && spacing.spaceBefore > 720;
  const hasLargeSpaceAfter = spacing?.spaceAfter && spacing.spaceAfter > 720;
  
  // USE FORMATTING INFORMATION TO IMPROVE CLASSIFICATION
  // Large, bold, centered text is likely a title
  if (formatting?.centered && formatting?.bold && formatting?.fontSize && formatting.fontSize >= 14) {
    return 'title';
  }
  
  // Text with large spacing before is likely a section heading
  if (hasLargeSpaceBefore && text.length < 100) {
    if (formatting?.bold || formatting?.fontSize && formatting.fontSize >= 12) {
      return 'heading1';
    } else if (text.length < 60) {
      return 'heading2';
    }
  }
  
  // Bold text with larger font size suggests headings
  if (formatting?.bold && formatting?.fontSize && formatting.fontSize >= 12) {
    if (text.length < 100) {
      if (formatting.fontSize >= 14) {
        return 'title';
      } else {
        return 'heading1';
      }
    }
  }
  
  // Centered text (even without bold) can be titles if short
  if (formatting?.centered && text.length < 80 && !text.endsWith('.')) {
    return 'title';
  }
  
  // Bold text without other criteria might still be a heading
  if (formatting?.bold && text.length < 60 && !text.endsWith('.')) {
    return 'heading2';
  }
  
  // Check style names for headings (prioritat alta)
  if (styleName.match(/title|títol|titol/i)) {
    return 'title';
  }
  if (styleName.match(/heading1|h1|cap1|encapçalament1/i)) {
    return 'heading1';
  }
  if (styleName.match(/heading2|h2|cap2|encapçalament2/i)) {
    return 'heading2';
  }
  if (styleName.match(/heading3|h3|cap3|encapçalament3/i)) {
    return 'heading3';
  }
  
  // Patrons específics per detectar títols principals (centrats, curts, majúscules)
  if (text.length < 80) {
    // Títol principal - tot majúscules o primera majúscula de cada paraula
    if (text.match(/^[A-ZÀÁÈÉÍÓÚÇ\s\-\:\.\,]+$/) || 
        text.match(/^([A-ZÀÁÈÉÍÓÚÇ][a-zàáèéíóúç]*\s*){1,8}$/)) {
      return 'title';
    }
    
    // Patrons comuns de títols de seccions
    if (text.match(/^(INTRODUCCIÓ|ANTECEDENTS|OBJECTIUS|METODOLOGIA|RESULTATS|CONCLUSIONS|ANNEXOS|BIBLIOGRAFIA)/i) ||
        text.match(/^(CAPÍTOL|SECCIÓ|APARTAT)\s+\d+/i) ||
        text.match(/^(PART|TÍTOL)\s+[IVX]+/i)) {
      return 'heading1';
    }
  }
  
  // Seccions numerades de diferents formats
  if (text.match(/^\d+[\.\-\)]\s+[A-ZÀÁÈÉÍÓÚÇ]/)) {
    return 'heading1'; // 1. Introducció, 1- Objectius
  }
  if (text.match(/^\d+\.\d+[\.\-\)]\s/)) {
    return 'heading2'; // 1.1. Subsecció
  }
  if (text.match(/^\d+\.\d+\.\d+[\.\-\)]\s/)) {
    return 'heading3'; // 1.1.1. Subsubsecció
  }
  
  // Seccions amb lletres
  if (text.match(/^[a-zA-Z][\.\-\)]\s+[A-ZÀÁÈÉÍÓÚÇ]/)) {
    return 'heading2'; // a) Punt primer, A. Secció
  }
  
  // Seccions amb numeració romana
  if (text.match(/^[IVX]+[\.\-\)]\s+[A-ZÀÁÈÉÍÓÚÇ]/i)) {
    return 'heading1'; // I. Primera part, IV- Quarta secció
  }
  
  // Patrons de preguntes (títols de secció en forma de pregunta)
  if (text.match(/^(Com|Què|Quan|On|Per què|Qui)\s+.*\?$/i) && text.length < 120) {
    return 'heading2';
  }
  
  // Patrons específics de documents catalans
  if (text.match(/^(INFORME|MEMÒRIA|PROPOSTA|RESOLUCIÓ|DICTAMEN|ACORD)/i) && text.length < 60) {
    return 'title';
  }
  
  // Text curt sense punt final pot ser un subtítol
  if (text.length < 60 && !text.endsWith('.') && !text.endsWith(',') && 
      text.match(/^[A-ZÀÁÈÉÍÓÚÇ]/) && text.split(' ').length >= 2) {
    return 'heading2';
  }
  
  // Llistes detectades pel format (però no confondre amb seccions numerades)
  if (text.match(/^[\-\*\•]\s+/) && text.length > 10) {
    return 'list';
  }
  // Llistes numerades simples (diferent de seccions)
  if (text.match(/^\d{1,2}[\.\)]\s+/) && text.length > 20 && 
      !text.match(/^\d+[\.\)]\s+[A-ZÀÁÈÉÍÓÚÇ][A-ZÀÁÈÉÍÓÚÇa-zàáèéíóúç\s]{5,30}$/)) {
    return 'list';
  }
  
  return 'paragraph';
}

interface TableCell {
  text: string;
  isHeader?: boolean;
  formatting?: DocumentElement['formatting'];
}

interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

function extractEnhancedTableRows(tableXml: string): TableRow[] {
  const rows: TableRow[] = [];
  const rowRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
  const rowMatches = tableXml.match(rowRegex) || [];
  
  for (let rowIndex = 0; rowIndex < rowMatches.length; rowIndex++) {
    const row = rowMatches[rowIndex];
    const cells: TableCell[] = [];
    const cellRegex = /<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g;
    const cellMatches = row.match(cellRegex) || [];
    
    for (const cell of cellMatches) {
      const textMatches = cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const cellText = textMatches
        .map(match => match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
        .join(' ')
        .trim();
      
      // Extract cell formatting
      const cellFormatting = extractFormattingInfo(cell);
      
      // Determine if it's a header cell (first row or bold text)
      const isHeader = rowIndex === 0 || cellFormatting?.bold || false;
      
      cells.push({
        text: cellText,
        isHeader,
        formatting: cellFormatting
      });
    }
    
    if (cells.length > 0) {
      rows.push({
        cells,
        isHeader: rowIndex === 0
      });
    }
  }
  
  return rows;
}

function extractTableRows(tableXml: string): string[][] {
  const enhancedRows = extractEnhancedTableRows(tableXml);
  return enhancedRows.map(row => row.cells.map(cell => cell.text));
}

function generateInlineStyle(formatting?: DocumentElement['formatting']): string {
  if (!formatting) return '';
  
  const styles: string[] = [];
  
  if (formatting.bold) styles.push('font-weight: bold');
  if (formatting.italic) styles.push('font-style: italic'); 
  if (formatting.centered) styles.push('text-align: center');
  if (formatting.fontSize) styles.push(`font-size: ${formatting.fontSize}pt`);
  
  return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
}

function generateStructuredHTML(elements: DocumentElement[], fileName: string): string {
  const htmlParts = [
    `<html>`,
    `<head>`,
    `<title>${fileName}</title>`,
    `<meta charset="utf-8">`,
    `<style>`,
    `body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }`,
    `h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }`,
    `h2 { color: #34495e; margin-top: 30px; }`,
    `h3 { color: #7f8c8d; }`,
    `table { width: 100%; border-collapse: collapse; margin: 20px 0; }`,
    `th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }`,
    `th { background-color: #f8f9fa; font-weight: bold; }`,
    `.signature { border: 2px solid #e74c3c; background-color: #fdf2f2; padding: 15px; margin: 20px 0; border-radius: 5px; }`,
    `.detected-date { background-color: #e1f5fe; border-bottom: 2px solid #0288d1; padding: 1px 3px; border-radius: 3px; }`,
    `.detected-address { background-color: #f3e5f5; border-bottom: 2px solid #7b1fa2; padding: 1px 3px; border-radius: 3px; }`,
    `.detected-contact { background-color: #e8f5e8; border-bottom: 2px solid #388e3c; padding: 1px 3px; border-radius: 3px; }`,
    `</style>`,
    `</head>`,
    `<body>`
  ];
  
  for (const element of elements) {
    const inlineStyle = generateInlineStyle(element.formatting);
    
    switch (element.type) {
      case 'title':
        htmlParts.push(`<h1${inlineStyle}>${enhanceTextWithDetection(element.text)}</h1>`);
        break;
      case 'heading1':
        htmlParts.push(`<h2${inlineStyle}>${enhanceTextWithDetection(element.text)}</h2>`);
        break;
      case 'heading2':
        htmlParts.push(`<h3${inlineStyle}>${enhanceTextWithDetection(element.text)}</h3>`);
        break;
      case 'heading3':
        htmlParts.push(`<h4${inlineStyle}>${enhanceTextWithDetection(element.text)}</h4>`);
        break;
      case 'paragraph':
        htmlParts.push(`<p${inlineStyle}>${enhanceTextWithDetection(element.text)}</p>`);
        break;
      case 'table':
        if (element.rows && element.rows.length > 0) {
          htmlParts.push(`<table>`);
          // Use enhanced table data if available
          const enhancedRows = extractEnhancedTableRows(element.text || '');
          if (enhancedRows.length > 0) {
            enhancedRows.forEach((row, rowIndex) => {
              htmlParts.push(`<tr>`);
              row.cells.forEach((cell) => {
                const tag = cell.isHeader ? 'th' : 'td';
                const cellStyle = generateInlineStyle(cell.formatting);
                htmlParts.push(`<${tag}${cellStyle}>${escapeHtml(cell.text)}</${tag}>`);
              });
              htmlParts.push(`</tr>`);
            });
          } else {
            // Fallback to simple table generation
            element.rows.forEach((row, index) => {
              const tag = index === 0 ? 'th' : 'td';
              htmlParts.push(`<tr>${row.map(cell => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('')}</tr>`);
            });
          }
          htmlParts.push(`</table>`);
        }
        break;
      case 'signature':
        htmlParts.push(`<div class="signature"><strong>Signatura:</strong> ${escapeHtml(element.text)}</div>`);
        break;
      case 'list':
        // Convert list text to proper list item
        const listText = element.text.replace(/^[\-\*\•]\s+/, '').replace(/^\d+[\.\)]\s+/, '');
        htmlParts.push(`<ul><li>${escapeHtml(listText)}</li></ul>`);
        break;
    }
  }
  
  htmlParts.push(`</body></html>`);
  return htmlParts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function enhanceTextWithDetection(text: string): string {
  const specialContent = detectSpecialContent(text);
  let enhancedText = escapeHtml(text);
  
  // Highlight detected patterns
  specialContent.patterns.forEach(pattern => {
    const escapedPattern = escapeHtml(pattern);
    let cssClass = '';
    
    switch (specialContent.type) {
      case 'date':
        cssClass = 'detected-date';
        break;
      case 'address':
        cssClass = 'detected-address';
        break;
      case 'contact':
        cssClass = 'detected-contact';
        break;
    }
    
    if (cssClass) {
      enhancedText = enhancedText.replace(
        new RegExp(escapedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        `<span class="${cssClass}" title="${specialContent.type.charAt(0).toUpperCase() + specialContent.type.slice(1)} detectat">${escapedPattern}</span>`
      );
    }
  });
  
  return enhancedText;
}

// AI Analysis helper function
async function performAIAnalysis(htmlContent: string): Promise<{
  placeholders: Array<{
    text: string;
    variable: string;
    confidence: number;
    context: string;
    type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  }>;
}> {
  const openai = getOpenAI();
  
  // Extract clean text content from HTML
  const textContent = htmlContent.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  log.debug('🔍 AI analysis input:', { 
    htmlLength: htmlContent.length, 
    textLength: textContent.length,
    preview: textContent.substring(0, 200)
  });
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analitza aquest document HTML net per detectar variables/placeholders amb alta precisió.

INSTRUCCIONS:
1. Busca text que sembli placeholders, camps variables, o contingut que es repetirà
2. Dona alta confiança (80-100%) a patrons clars com: {{nom}}, [DATA], __CAMP__, text en MAJÚSCULES repetitiu
3. Dona mitjana confiança (60-79%) a text que pot ser variable però no està clar
4. Dona baixa confiança (<60%) només si realment dubtós
5. Classifica el tipus de dada: text, date, number, currency, email, other
6. Proporciona context útil sobre on apareix cada placeholder

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
          content: `Analitza aquest contingut HTML per detectar variables:\n\n${textContent.substring(0, 3000)}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    
    const result = completion.choices[0]?.message?.content;
    if (!result) {
      return { placeholders: [] };
    }
    
    const parsed = JSON.parse(result);
    log.debug('✅ AI analysis complete:', { 
      placeholdersFound: parsed.placeholders?.length || 0,
      model: completion.model
    });
    
    return parsed;
    
  } catch (aiError) {
    log.warn('⚠️ AI analysis failed, returning empty placeholders:', aiError);
    return { placeholders: [] };
  }
}

export async function POST(request: NextRequest) {
  log.debug('🚀 Node.js OOXML Analysis Request Started');
  
  try {
    // Initialize Supabase client with error handling
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabase = null;
    if (supabaseUrl && supabaseServiceKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        log.debug('✅ Supabase client initialized');
      } catch (error) {
        log.warn('⚠️ Supabase initialization failed:', error);
      }
    } else {
      log.warn('⚠️ Supabase environment variables not found, storage will be skipped');
    }
    // 1. Parse FormData amb millor error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      log.error('❌ FormData parse error:', error);
      return NextResponse.json(
        { error: 'Invalid form data', details: error },
        { status: 400 }
      );
    }

    // 2. Validar fitxer DOCX
    const file = formData.get('docx') as File;
    if (!file) {
      log.error('❌ No file uploaded');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    log.debug('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // 3. Validar format amb més flexibilitat
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/docx',
      'application/msword'
    ];
    
    const isValidType = validTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.docx');
    
    if (!isValidType) {
      log.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { 
          error: 'File must be .docx format',
          received: file.type,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    // 4. Convertir a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    log.debug('🔄 Processing document...', {
      bufferSize: buffer.length
    });

    // 5. Generar template ID únic
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 6. Save original DOCX to Supabase Storage (REQUIRED for binary preservation)
    let storageUrl = null;
    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('template-docx')
          .upload(`${templateId}/original.docx`, buffer, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          log.error('❌ Storage upload FAILED - Cannot proceed without binary storage:', uploadError);
          return NextResponse.json(
            { error: 'Storage required for DOCX processing', details: uploadError.message },
            { status: 500 }
          );
        } else {
          storageUrl = uploadData?.path;
          log.debug('✅ Original DOCX saved to storage:', storageUrl);
        }
      } catch (storageError) {
        log.error('❌ Storage error - Cannot proceed:', storageError);
        return NextResponse.json(
          { error: 'Storage required for DOCX processing' },
          { status: 500 }
        );
      }
    } else {
      log.error('❌ Supabase not available - Cannot proceed without storage');
      return NextResponse.json(
        { error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    // 7. Run Node.js-based OOXML extraction (Vercel-compatible)
    try {
      log.debug('🔍 Running Node.js OOXML extraction...');
      
      // Extract DOCX content using PizZip (Node.js compatible)
      const zip = new PizZip(buffer);
      const documentXml = zip.file('word/document.xml')?.asText();
      
      if (!documentXml) {
        throw new Error('Could not find document.xml in DOCX file');
      }
      
      log.debug('📄 Extracted document XML:', { length: documentXml.length });
      
      // Extract structured content from DOCX
      const structuredContent = extractDocumentStructure(documentXml);
      
      // Generate structured HTML based on document elements
      const htmlContent = generateStructuredHTML(structuredContent, file.name);
      
      // Also create plain text version for AI analysis
      const textContent = structuredContent
        .map(element => element.text)
        .filter(text => text.trim())
        .join('\n');
      
      log.debug('📄 Generated HTML preview:', { 
        textLength: textContent.length,
        htmlLength: htmlContent.length,
        preview: textContent.substring(0, 200)
      });
      
      // 8. Perform AI analysis on extracted content
      log.debug('🤖 Running AI analysis on extracted content...');
      
      const aiAnalysisResult = await performAIAnalysis(htmlContent);
      
      // 9. Process structured content for UI
      const sections = structuredContent
        .filter(el => ['title', 'heading1', 'heading2', 'heading3'].includes(el.type))
        .map((section, index) => ({
          id: `section_${index}`,
          title: section.text,
          markdown: `## ${section.text}\n`,
          type: section.type
        }));

      const tables = structuredContent
        .filter(el => el.type === 'table')
        .map((table, index) => ({
          id: `table_${index}`,
          title: `Taula ${index + 1}`,
          headers: table.rows?.[0] || [],
          rows: table.rows?.slice(1) || [],
          normalized: {}
        }));

      const signatures = structuredContent
        .filter(el => el.type === 'signature')
        .map(sig => ({
          nom: '',
          carrec: '',
          data_lloc: sig.text
        }));

      // 10. Format response to match existing UI expectations
      const analysisResult = {
        templateId,
        fileName: file.name,
        storageUrl,
        // Transform extracted content to match expected format for UI compatibility
        transcription: htmlContent,
        markdown: textContent, // UI expects this field - use clean text
        sections: sections,
        tables: tables,
        placeholders: aiAnalysisResult.placeholders,
        signatura: signatures.length > 0 ? signatures[0] : undefined,
        confidence: 95,
        metadata: {
          extractionMethod: 'nodejs-ooxml-structured',
          processingTimeMs: Date.now() - Date.now(), // Minimal processing time
          elementsFound: {
            sections: sections.length,
            tables: tables.length,
            signatures: signatures.length,
            paragraphs: structuredContent.filter(el => el.type === 'paragraph').length
          },
          htmlLength: htmlContent.length,
          textLength: textContent.length,
          storageSize: buffer.length
        }
      };
      
      log.debug('✅ Node.js OOXML extraction complete:', {
        templateId,
        placeholdersFound: aiAnalysisResult.placeholders.length,
        textExtracted: textContent.length + ' chars',
        storageUrl
      });
      
      // EMERGENCY: Apply unified compatibility layer
      const { convertDOCXToUnified, validateUnifiedTemplate } = await import('@/lib/compatibility/unified-system');
      
      const unifiedResult = convertDOCXToUnified(analysisResult);
      const validatedResult = validateUnifiedTemplate(unifiedResult);
      
      if (!validatedResult) {
        log.error('❌ Failed to create valid unified template for DOCX');
        const { createFallbackTemplate } = await import('@/lib/compatibility/unified-system');
        const fallbackResult = createFallbackTemplate('docx', file.name);
        return NextResponse.json({
          success: true,
          data: fallbackResult
        });
      }
      
      return NextResponse.json({
        success: true,
        data: validatedResult
      });
      
    } catch (ooxmlError) {
      log.error('❌ Node.js OOXML extraction failed:', ooxmlError);
      return NextResponse.json(
        { error: 'Failed to extract document content', details: ooxmlError instanceof Error ? ooxmlError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    log.error('❌ Unexpected error in analyze:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}