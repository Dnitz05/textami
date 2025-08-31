// app/api/templates/upload/route.ts
// OOXML+IA Hybrid Template Upload API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import OpenAI from 'openai';
import { ApiResponse } from '../../../../lib/types';
import { htmlGenerator } from '../../../../lib/html-generator';
import { log } from '@/lib/logger';
const PizZip = require('pizzip');

// Document structure extraction (same as in analyze endpoint)
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
    
    // Classify element type based on style, content, and formatting
    const elementType = classifyElement(text, styleName, formatting);
    
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
        text: `Taula amb ${rows.length} files`,
        rows: rows
      });
    }
  }
  
  return elements;
}

function classifyElement(text: string, styleName: string, formatting?: DocumentElement['formatting']): DocumentElement['type'] {
  // Check for signature patterns
  if (text.match(/signat per|firmat per|signature|signatura|atentament|cordialmente|salutacions/i)) {
    return 'signature';
  }
  
  // USE FORMATTING INFORMATION TO IMPROVE CLASSIFICATION
  // Large, bold, centered text is likely a title
  if (formatting?.centered && formatting?.bold && formatting?.fontSize && formatting.fontSize >= 14) {
    return 'title';
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

function extractTableRows(tableXml: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<w:tr[^>]*>([\s\S]*?)<\/w:tr>/g;
  const rowMatches = tableXml.match(rowRegex) || [];
  
  for (const row of rowMatches) {
    const cells: string[] = [];
    const cellRegex = /<w:tc[^>]*>([\s\S]*?)<\/w:tc>/g;
    const cellMatches = row.match(cellRegex) || [];
    
    for (const cell of cellMatches) {
      const textMatches = cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const cellText = textMatches
        .map(match => match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'))
        .join(' ')
        .trim();
      cells.push(cellText);
    }
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return rows;
}

// Initialize clients lazily
const getSupabase = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

interface OOXMLUploadResult {
  templateId: string;
  styleManifest: any;
  htmlContent: string;
  aiAnalysis: {
    placeholders: Array<{
      text: string;
      variable: string;
      confidence: number;
      context: string;
    }>;
    sections: any[];
    processingTime: number;
  };
  ooxmlReport: {
    stylesFound: number;
    processingTime: number;
    warnings: string[];
  };
  storageInfo: {
    docxPath: string;
    manifestPath: string;
    htmlPath: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<OOXMLUploadResult>>> {
  const startTime = Date.now();
  log.debug('🚀 OOXML+IA Hybrid upload started');
  
  let tempDocxPath: string | null = null;
  let tempOutputDir: string | null = null;
  
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('docx') as File;
    const templateName = formData.get('name') as string || file?.name?.replace('.docx', '') || 'Untitled';
    const templateDescription = formData.get('description') as string || '';
    const userId = formData.get('userId') as string || 'anonymous';
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No DOCX file provided' },
        { status: 400 }
      );
    }
    
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json(
        { success: false, error: 'Only DOCX files are supported' },
        { status: 400 }
      );
    }
    
    log.debug('📄 Processing DOCX file:', {
      fileName: file.name,
      fileSize: file.size,
      templateName,
      userId
    });
    
    // 1. SAVE DOCX TO TEMPORARY LOCATION
    tempDocxPath = path.join(tmpdir(), `textami_${Date.now()}_${file.name}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempDocxPath, buffer);
    
    tempOutputDir = path.join(tmpdir(), `textami_output_${Date.now()}`);
    await fs.mkdir(tempOutputDir, { recursive: true });
    
    log.debug('💾 File saved temporarily:', tempDocxPath);
    
    // 2. EXECUTE OOXML PARSER (Python Script)
    log.debug('🔍 Executing OOXML parser...');
    const ooxmlResult = await executeOOXMLParser(tempDocxPath, tempOutputDir);
    
    if (!ooxmlResult.success) {
      throw new Error(`OOXML parsing failed: ${ooxmlResult.error}`);
    }
    
    log.debug('✅ OOXML parsing completed:', {
      processingTime: ooxmlResult.processingTime,
      stylesFound: ooxmlResult.styleManifest.statistics.total_styles_found
    });
    
    // 3. GENERATE HTML FROM OOXML DATA
    log.debug('🌐 Generating semantic HTML...');
    const htmlResult = await htmlGenerator.generateFromStyleManifest(
      ooxmlResult.styleManifest,
      ooxmlResult.documentStructure,
      { 
        title: templateName,
        description: templateDescription 
      }
    );
    
    log.debug('✅ HTML generation completed:', {
      htmlLength: htmlResult.html.length,
      elementsUsed: htmlResult.elementsUsed.length
    });
    
    // 4. AI ANALYSIS ON CLEAN HTML
    log.debug('🧠 Starting AI analysis on clean HTML...');
    const aiAnalysisStart = Date.now();
    const aiAnalysis = await performAIAnalysis(htmlResult.html);
    const aiProcessingTime = Date.now() - aiAnalysisStart;
    
    log.debug('✅ AI analysis completed:', {
      placeholdersFound: aiAnalysis.placeholders.length,
      sectionsFound: aiAnalysis.sections.length,
      processingTime: aiProcessingTime
    });
    
    // 5. SAVE TO SUPABASE STORAGE
    const templateId = `template_${Date.now()}_${userId}`;
    const supabase = getSupabase();
    
    // Save original DOCX
    const docxStoragePath = `${userId}/${templateId}.docx`;
    const { error: docxUploadError } = await supabase.storage
      .from('template-docx')
      .upload(docxStoragePath, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false
      });
    
    if (docxUploadError) {
      throw new Error(`Failed to save DOCX: ${docxUploadError.message}`);
    }
    
    // Save styleManifest
    const manifestStoragePath = `${userId}/${templateId}_manifest.json`;
    const { error: manifestUploadError } = await supabase.storage
      .from('template-manifests')
      .upload(manifestStoragePath, JSON.stringify(ooxmlResult.styleManifest, null, 2), {
        contentType: 'application/json',
        upsert: false
      });
    
    if (manifestUploadError) {
      throw new Error(`Failed to save manifest: ${manifestUploadError.message}`);
    }
    
    // Save HTML content
    const htmlStoragePath = `${userId}/${templateId}_content.html`;
    const { error: htmlUploadError } = await supabase.storage
      .from('template-html')
      .upload(htmlStoragePath, htmlResult.html, {
        contentType: 'text/html',
        upsert: false
      });
    
    if (htmlUploadError) {
      throw new Error(`Failed to save HTML: ${htmlUploadError.message}`);
    }
    
    log.debug('💾 All files saved to Supabase storage');
    
    // 6. PREPARE RESPONSE
    const totalProcessingTime = Date.now() - startTime;
    
    const result: OOXMLUploadResult = {
      templateId,
      styleManifest: ooxmlResult.styleManifest,
      htmlContent: htmlResult.html,
      aiAnalysis: {
        ...aiAnalysis,
        processingTime: aiProcessingTime
      },
      ooxmlReport: {
        stylesFound: ooxmlResult.styleManifest.statistics.total_styles_found,
        processingTime: ooxmlResult.processingTime,
        warnings: ooxmlResult.styleManifest.warnings
      },
      storageInfo: {
        docxPath: docxStoragePath,
        manifestPath: manifestStoragePath,
        htmlPath: htmlStoragePath
      }
    };
    
    log.debug('🎉 OOXML+IA Hybrid upload completed successfully:', {
      templateId,
      totalProcessingTime,
      pipeline: 'OOXML → HTML → AI Analysis → Storage'
    });
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    log.error('❌ OOXML+IA Hybrid upload failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Template upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Cleanup temporary files
    if (tempDocxPath) {
      try {
        await fs.unlink(tempDocxPath);
      } catch (cleanupError) {
        log.warn('⚠️ Failed to cleanup temp DOCX:', cleanupError);
      }
    }
    
    if (tempOutputDir) {
      try {
        await fs.rm(tempOutputDir, { recursive: true, force: true });
      } catch (cleanupError) {
        log.warn('⚠️ Failed to cleanup temp output dir:', cleanupError);
      }
    }
  }
}

/**
 * Execute Node.js OOXML extraction (Vercel-compatible)
 */
async function executeOOXMLParser(docxPath: string, outputDir: string): Promise<{
  success: boolean;
  styleManifest: any;
  documentStructure: any[];
  processingTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    log.debug('📄 Running Node.js DOCX extraction:', {
      docx: docxPath,
      output: outputDir
    });
    
    // Read DOCX file using Node.js
    const docxBuffer = await fs.readFile(docxPath);
    const zip = new PizZip(docxBuffer);
    
    // Extract document.xml content
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new Error('Could not find document.xml in DOCX file');
    }
    
    // Extract structured content from DOCX (same logic as analyze endpoint)
    const documentStructure = extractDocumentStructure(documentXml);
    
    // Create basic style manifest for Node.js processing
    const styleManifest = {
      version: '1.0-nodejs',
      extraction_method: 'nodejs-basic',
      styles: {
        'Title': 'h1',
        'Normal': 'p',
        'Heading1': 'h1',
        'Heading2': 'h2',
        'Heading3': 'h3'
      },
      fallbacks: {
        'default': 'p'
      },
      warnings: ['Using basic Node.js extraction - limited style preservation'],
      vocabulary: ['p', 'h1', 'h2', 'h3', 'strong', 'em'],
      statistics: {
        total_styles_found: 5,
        mapped_styles: 5,
        fallback_styles: 0
      }
    };
    
    const processingTime = Date.now() - startTime;
    
    log.debug('✅ Node.js DOCX extraction complete:', {
      paragraphs: documentStructure.length,
      processingTime: processingTime + 'ms'
    });
    
    return {
      success: true,
      styleManifest,
      documentStructure,
      processingTime
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error('❌ Node.js DOCX extraction failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      styleManifest: {},
      documentStructure: [],
      processingTime
    };
  }
}

/**
 * Perform AI analysis on clean HTML to detect variables and structure
 */
async function performAIAnalysis(htmlContent: string): Promise<{
  placeholders: Array<{
    text: string;
    variable: string;
    confidence: number;
    context: string;
    type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  }>;
  sections: Array<{
    title: string;
    type: 'header' | 'content' | 'table' | 'list';
    elements: string[];
  }>;
}> {
  const openai = getOpenAI();
  
  // Extract visible text from HTML for analysis  
  const textContent = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove CSS
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove JS
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  const prompt = `Analitza aquest contingut HTML d'un document i identifica text que sembli variable per convertir-lo en plantilla.

CONTINGUT DEL DOCUMENT:
${textContent.substring(0, 3000)}${textContent.length > 3000 ? '\n...[TRUNCAT]' : ''}

HTML ESTRUCTURA (primeres línies per context):
${htmlContent.substring(0, 1000)}${htmlContent.length > 1000 ? '\n...[TRUNCAT]' : ''}

IDENTIFICA:
1. Text que sembli variables: noms propis, dates, números, imports, adreces, emails
2. Proposa noms de variables semàntics i descriptius
3. Classifica el tipus de variable (text, date, number, currency, email, other)
4. Assigna confidence score (0-100) basat en probabilitat que sigui variable
5. Identifica l'estructura de seccions del document

CRITERIS PER VARIABLES:
- Noms propis: "Joan García", "Maria López" → alta probabilitat variable
- Dates: "15 de gener 2025", "30/08/2025" → alta probabilitat variable  
- Números/imports: "150€", "25 anys", "3 elementos" → potencial variable
- Text genèric: "Document", "Contracte" → baixa probabilitat variable
- Títols de secció: mantenir fix generalment

RESPOSTA EN JSON:
{
  "placeholders": [
    {
      "text": "Joan García",
      "variable": "nom_client", 
      "confidence": 90,
      "context": "Nom que apareix després de 'Client:'",
      "type": "text"
    },
    {
      "text": "15 de gener 2025",
      "variable": "data_contracte",
      "confidence": 95, 
      "context": "Data del document",
      "type": "date"
    }
  ],
  "sections": [
    {
      "title": "Capçalera Document",
      "type": "header",
      "elements": ["h1", "h2"]
    },
    {
      "title": "Dades Client", 
      "type": "content",
      "elements": ["p"]
    }
  ]
}`;

  try {
    log.debug('🧠 Starting AI analysis on HTML content...', {
      htmlLength: htmlContent.length,
      textLength: textContent.length
    });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "Ets un expert en processament de documents. Analitza HTML net i identifica variables amb alta precisió. Sigues conservador amb confidence scores - només marca com alta probabilitat el text que clarament és variable."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2500,
      temperature: 0.1 // Molt baixa per consistència
    });
    
    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('Empty AI response');
    }
    
    log.debug('✅ AI analysis response received', {
      responseLength: responseContent.length
    });
    
    // Parse JSON response with error handling
    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (jsonError) {
      log.error('❌ Failed to parse AI JSON response:', jsonError);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Validate and clean response
    const placeholders = (result.placeholders || []).map((p: any) => ({
      text: String(p.text || '').trim(),
      variable: String(p.variable || '').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      confidence: Math.min(100, Math.max(0, Number(p.confidence) || 0)),
      context: String(p.context || '').trim(),
      type: ['text', 'date', 'number', 'currency', 'email', 'other'].includes(p.type) ? p.type : 'text'
    })).filter((p: any) => p.text && p.variable); // Remove empty entries
    
    const sections = (result.sections || []).map((s: any) => ({
      title: String(s.title || '').trim(),
      type: ['header', 'content', 'table', 'list'].includes(s.type) ? s.type : 'content',
      elements: Array.isArray(s.elements) ? s.elements.map(String) : []
    })).filter((s: any) => s.title); // Remove empty entries
    
    log.debug('✅ AI analysis completed successfully', {
      placeholdersFound: placeholders.length,
      sectionsFound: sections.length,
      avgConfidence: placeholders.length > 0 
        ? (placeholders.reduce((sum: number, p: any) => sum + p.confidence, 0) / placeholders.length).toFixed(1)
        : 0
    });
    
    return { placeholders, sections };
    
  } catch (error) {
    log.error('❌ AI analysis failed:', error);
    
    // Enhanced fallback analysis - extract some basic patterns
    const basicPlaceholders = extractBasicPatterns(textContent);
    
    return {
      placeholders: basicPlaceholders,
      sections: [
        {
          title: "Document Principal",
          type: "content",
          elements: ["p", "h1", "h2"]
        }
      ]
    };
  }
}

/**
 * Fallback function to extract basic patterns when AI fails
 */
function extractBasicPatterns(textContent: string): Array<{
  text: string;
  variable: string;
  confidence: number;
  context: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
}> {
  const patterns: Array<{
    text: string;
    variable: string;
    confidence: number;
    context: string;
    type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  }> = [];
  
  // Email pattern
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = textContent.match(emailRegex) || [];
  emails.forEach((email, i) => {
    patterns.push({
      text: email,
      variable: `email_${i + 1}`,
      confidence: 85,
      context: 'Email address detected by pattern',
      type: 'email' as const
    });
  });
  
  // Date patterns (basic)
  const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g;
  const dates = textContent.match(dateRegex) || [];
  dates.forEach((date, i) => {
    patterns.push({
      text: date,
      variable: `data_${i + 1}`,
      confidence: 75,
      context: 'Date pattern detected',
      type: 'date' as const
    });
  });
  
  // Currency patterns
  const currencyRegex = /\b\d+[.,]?\d*\s*[€$£]\b/g;
  const currencies = textContent.match(currencyRegex) || [];
  currencies.forEach((currency, i) => {
    patterns.push({
      text: currency,
      variable: `import_${i + 1}`,
      confidence: 70,
      context: 'Currency amount detected',
      type: 'currency' as const
    });
  });
  
  return patterns.slice(0, 5); // Limit to 5 fallback patterns
}