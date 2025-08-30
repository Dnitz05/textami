// app/api/extract/route.ts
// AI-FIRST: GPT-5 multimodal analysis of PDF documents
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parseAIAnalysis, type ParsedAnalysis } from '../../../lib/ai-parser';
import { ApiResponse, ExtractionResponse } from '../../../lib/types';
import { log } from '@/lib/logger';
import pdfParse from 'pdf-parse';

// Initialize OpenAI with GPT-5
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ExtractRequest {
  pdfPath?: string;  // Path in Supabase Storage
  pdfUrl?: string;   // Signed URL for GPT-5
  templateId: string;
  fileName?: string;
}

// Helper function to extract document title from markdown
function extractDocumentTitle(markdown: string): string | undefined {
  // Look for H1 headers at the beginning of the document
  const lines = markdown.split('\n');
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      return line.substring(2).trim();
    }
  }
  return undefined;
}

interface AIAnalysisResponse {
  markdown: string;
  json: {
    sections: Array<{
      id: string;
      title: string;
      markdown: string;
    }>;
    tables: Array<{
      id: string;
      title: string;
      headers: string[];
      rows: string[][];
      normalized?: Record<string, any>;
    }>;
    tags: Array<{
      name: string;
      example: string;
      type: 'string' | 'date' | 'currency' | 'percent' | 'number' | 'id' | 'address';
      confidence: number;
      page?: number;
      anchor?: string;
    }>;
    signatura?: {
      nom: string;
      carrec: string;
      data_lloc: string;
    };
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ExtractionResponse>>> {
  log.debug('🚀 AI-FIRST Extract Request Started');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('❌ Supabase environment variables missing');
      return NextResponse.json(
        { success: false, error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    log.debug('✅ Supabase client initialized for AI analysis');

    // Parse request
    const { pdfPath, pdfUrl, templateId, fileName } = await request.json() as ExtractRequest;
    
    log.debug('📝 AI Extract request:', {
      templateId,
      pdfPath: pdfPath || 'none',
      pdfUrl: pdfUrl || 'none',
      fileName: fileName || 'unknown'
    });

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Missing templateId' },
        { status: 400 }
      );
    }

    let pdfSignedUrl: string;

    // Get signed URL for PDF
    if (pdfPath) {
      // Path mode: get signed URL from Supabase Storage
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('ingest')
        .createSignedUrl(pdfPath, 3600); // 1 hour expiry

      if (urlError || !signedUrlData) {
        log.error('❌ Failed to create signed URL:', urlError);
        return NextResponse.json(
          { success: false, error: 'Failed to access PDF file', details: urlError?.message },
          { status: 500 }
        );
      }

      pdfSignedUrl = signedUrlData.signedUrl;
      log.debug('✅ PDF signed URL created for AI analysis');
    } else if (pdfUrl) {
      // URL mode: use provided signed URL directly
      pdfSignedUrl = pdfUrl;
      log.debug('✅ Using provided PDF URL for AI analysis');
    } else {
      return NextResponse.json(
        { success: false, error: 'Either pdfPath or pdfUrl is required' },
        { status: 400 }
      );
    }

    // Download and parse PDF content
    log.debug('📄 Downloading PDF for text extraction...');
    
    let pdfText: string = '';
    try {
      const pdfResponse = await fetch(pdfSignedUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
      }
      
      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = pdfData.text;
      
      log.debug('📄 PDF text extracted:', { textLength: pdfText.length, pages: pdfData.numpages });
    } catch (pdfError) {
      log.error('❌ PDF extraction failed:', pdfError);
      throw new Error('Failed to extract text from PDF');
    }

    // Call GPT-5 for document analysis using extracted text
    log.debug('🤖 Calling GPT-5 for text-based document analysis...');

    let analysisResult: AIAnalysisResponse;

    // Real GPT-5 call using extracted PDF text
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a LITERAL document transcriber. Your task is to analyze the extracted PDF text and recreate the original document structure as accurately as possible.

⚠️ CRITICAL: YOU ARE A PHOTOCOPIER, NOT AN INTERPRETER
- Copy text character-by-character exactly as written
- If you see a header alone, write only that header text
- If you see standalone text, write only that text
- NEVER combine separate text lines into one sentence
- NEVER expand abbreviated content with information from elsewhere
- NEVER interpret what a section "means" or what it "refers to"

🔍 READING METHODOLOGY:
1. Read the PDF line by line from top to bottom
2. Write EXACTLY what each line says - word for word
3. If a line has only 2 words, transcribe only those 2 words
4. If there's a title at the top, include it as the first line
5. Respect blank lines and spacing as they appear

📊 TABLE RULES:
- Copy each table cell EXACTLY as written
- Empty cells = empty string ""
- Never merge information from different cells
- Preserve exact numbers and formatting

📝 SECTION IDENTIFICATION:
- Sections = text lines that look like headers/titles
- Section content = ONLY the text immediately following, not interpretation
- If any header is followed by blank space, the content is blank
- If any header is followed by specific text, copy only that text

🚨 ABSOLUTELY FORBIDDEN:
- Combining information from different parts of document
- Expanding short text with "context" from elsewhere  
- Interpreting what headers "should" contain
- Adding descriptive text not present in PDF
- Making logical connections between separate elements

JSON FORMAT:
{
  "markdown": "Line-by-line exact transcription including document title",
  "json": {
    "sections": [{"id": "literal-section-name", "title": "Exact Header Text", "markdown": "Only immediate following content"}],
    "tables": [{"id": "table-1", "title": "Exact table title or description", "headers": ["exact", "headers"], "rows": [["exact", "cell", "content"]]}],
    "tags": [{"name": "field_name", "example": "exact_text_as_appears", "type": "string|date|currency|percent|number|id|address", "confidence": 0.95, "page": 1}],
    "signatura": {"nom": "Exact Name", "carrec": "Exact Title", "data_lloc": "Exact Location, Date"}
  }
}

REMEMBER: You are a COPYING machine, not a thinking machine. Copy, don't create.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `TRANSCRIBE this PDF document EXACTLY as a photocopier would reproduce it.

🚨 CRITICAL INSTRUCTION:
- Include the TITLE/HEADER at the very top of the document
- If you see any header followed by brief text, write EXACTLY that - do NOT expand it
- If you see standalone headers, copy them standalone - do NOT fill with content from elsewhere  
- Read line-by-line and copy each line exactly as it appears

TRANSCRIPTION PROCESS:
1️⃣ START FROM THE TOP: Include document title/header as first line
2️⃣ LINE-BY-LINE COPY: Write each line exactly as it appears
3️⃣ NO INTERPRETATION: Never guess what a section "should" contain
4️⃣ PRESERVE STRUCTURE: Keep headers separate from content

EXAMPLES OF CORRECT BEHAVIOR:
✅ If PDF shows a standalone header → Write only that header text
✅ If PDF shows header on line 1, subtitle on line 2 → Write both lines separately  
✅ If table cell shows a number → Write exactly that number with same formatting

EXAMPLES OF FORBIDDEN BEHAVIOR:  
❌ Combining separate text elements into longer sentences → This creates false content
❌ Skipping any text because it seems obvious → All text must be included
❌ Adding context or interpretation to headers → Only copy what's literally there

Return ONLY valid JSON with the literal transcription.`
              },
              {
                type: "image_url",
                image_url: {
                  url: pdfSignedUrl
                }
              }
            ]
          }
        ],
        response_format: {
          type: "json_object"
        },
        max_tokens: 16000,
        temperature: 0.05
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) {
      throw new Error('Empty response from GPT-5');
    }

    log.debug('🤖 GPT-5 response length:', aiResponse.length);

    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(aiResponse);
      
      analysisResult = {
        markdown: parsedResponse.markdown || '',
        json: {
          sections: parsedResponse.json?.sections || [],
          tables: parsedResponse.json?.tables || [],
          tags: parsedResponse.json?.tags || [],
          signatura: parsedResponse.json?.signatura
        }
      };

      log.debug('✅ GPT-5 JSON parsed successfully:', {
        markdownLength: analysisResult.markdown.length,
        sectionsFound: analysisResult.json.sections.length,
        tablesFound: analysisResult.json.tables.length,
        tagsFound: analysisResult.json.tags.length
      });

    } catch (parseError) {
      log.error('❌ Failed to parse GPT-5 JSON response:', parseError);
      log.error('Raw response:', aiResponse.substring(0, 1000));
      throw new Error('Invalid JSON response from GPT-5');
    }

    } catch (openaiError) {
      log.error('❌ GPT-5 API Error:', openaiError);
      
      // Check if it's a model availability error
      if (openaiError instanceof Error && openaiError.message.includes('gpt-5')) {
        log.warn('⚠️ GPT-5 may not be available, falling back to GPT-4o');
        
        // Fallback to GPT-4o
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a LITERAL document transcriber. Your ONLY job is to copy text EXACTLY as it appears in any PDF document - nothing more, nothing less.

⚠️ CRITICAL: YOU ARE A PHOTOCOPIER, NOT AN INTERPRETER
- Copy text character-by-character exactly as written
- If you see a header alone, write only that header text
- If you see standalone text, write only that text
- NEVER combine separate text lines into one sentence
- NEVER expand abbreviated content with information from elsewhere
- NEVER interpret what a section "means" or what it "refers to"

🔍 READING METHODOLOGY:
1. Read the PDF line by line from top to bottom
2. Write EXACTLY what each line says - word for word
3. If a line has only 2 words, transcribe only those 2 words
4. If there's a title at the top, include it as the first line
5. Respect blank lines and spacing as they appear

📊 TABLE RULES:
- Copy each table cell EXACTLY as written
- Empty cells = empty string ""
- Never merge information from different cells
- Preserve exact numbers and formatting

📝 SECTION IDENTIFICATION:
- Sections = text lines that look like headers/titles
- Section content = ONLY the text immediately following, not interpretation
- If any header is followed by blank space, the content is blank
- If any header is followed by specific text, copy only that text

🚨 ABSOLUTELY FORBIDDEN:
- Combining information from different parts of document
- Expanding short text with "context" from elsewhere  
- Interpreting what headers "should" contain
- Adding descriptive text not present in PDF
- Making logical connections between separate elements

JSON FORMAT:
{
  "markdown": "Line-by-line exact transcription including document title",
  "json": {
    "sections": [{"id": "literal-section-name", "title": "Exact Header Text", "markdown": "Only immediate following content"}],
    "tables": [{"id": "table-1", "title": "Exact table title or description", "headers": ["exact", "headers"], "rows": [["exact", "cell", "content"]]}],
    "tags": [{"name": "field_name", "example": "exact_text_as_appears", "type": "string|date|currency|percent|number|id|address", "confidence": 0.95, "page": 1}],
    "signatura": {"nom": "Exact Name", "carrec": "Exact Title", "data_lloc": "Exact Location, Date"}
  }
}

REMEMBER: You are a COPYING machine, not a thinking machine. Copy, don't create.`
            },
            {
              role: "user",
              content: `ANALYZE this extracted PDF text and recreate the original document structure:

EXTRACTED PDF TEXT:
${pdfText}

🚨 CRITICAL INSTRUCTIONS:
- Recreate the original document structure from this extracted text
- Identify headers, sections, tables, and other elements
- Preserve exact text as it appears in the extraction
- Do NOT add, modify, or interpret any content
- Maintain the document's original flow and organization

TRANSCRIPTION PROCESS:
1️⃣ IDENTIFY STRUCTURE: Find titles, headers, sections, tables
2️⃣ PRESERVE TEXT: Use exact text from the extraction
3️⃣ ORGANIZE SECTIONS: Group related content logically  
4️⃣ EXTRACT TABLES: Identify tabular data and preserve structure
5️⃣ FIND VARIABLES: Locate names, dates, amounts, addresses

EXAMPLES OF CORRECT BEHAVIOR:
✅ If extracted text shows standalone headers → Keep them as headers
✅ If extracted text has tabular data → Recreate as proper table structure
✅ If extracted text contains numbers/dates → Preserve exact formatting

EXAMPLES OF FORBIDDEN BEHAVIOR:  
❌ Adding explanatory text not in the extraction
❌ Modifying or "fixing" the extracted text
❌ Combining unrelated text elements

Return ONLY valid JSON with the structured document analysis.`
            }
          ],
          response_format: {
            type: "json_object"
          },
          max_tokens: 16000,
          temperature: 0.05
        });

        const aiResponse = completion.choices[0].message.content;
        if (!aiResponse) {
          throw new Error('Empty response from GPT-4o fallback');
        }

        log.debug('🤖 GPT-4o fallback response length:', aiResponse.length);

        const parsedResponse = JSON.parse(aiResponse);
        
        analysisResult = {
          markdown: parsedResponse.markdown || '',
          json: {
            sections: parsedResponse.json?.sections || [],
            tables: parsedResponse.json?.tables || [],
            tags: parsedResponse.json?.tags || [],
            signatura: parsedResponse.json?.signatura
          }
        };

        log.debug('✅ GPT-4o fallback parsed successfully');
      } else {
        throw openaiError;
      }
    }

    // Parse and normalize the AI analysis
    const parsedAnalysis: ParsedAnalysis = parseAIAnalysis(analysisResult.json);
    
    // Save both raw and parsed analysis to storage
    const analysisPath = `${templateId}/analysis.json`;
    const parsedAnalysisPath = `${templateId}/parsed_analysis.json`;
    
    const analysisData = {
      raw: analysisResult,
      parsed: {
        markdown: analysisResult.markdown,
        ...parsedAnalysis
      },
      metadata: {
        sectionsCount: parsedAnalysis.sections.length,
        tablesCount: parsedAnalysis.tables.length,
        tagsCount: parsedAnalysis.tags.length,
        processingMethod: 'gpt-5-multimodal',
        timestamp: new Date().toISOString()
      }
    };

    const { error: saveError } = await supabase.storage
      .from('ingest')
      .upload(analysisPath, JSON.stringify(analysisData, null, 2), {
        contentType: 'application/json',
        upsert: true
      });

    if (saveError) {
      log.warn('⚠️ Failed to save analysis (non-critical):', saveError);
    } else {
      log.debug('✅ Analysis saved to storage:', analysisPath);
    }

    log.debug('✅ AI analysis complete:', {
      templateId,
      sectionsFound: parsedAnalysis.sections.length,
      tablesFound: parsedAnalysis.tables.length,
      tagsFound: parsedAnalysis.tags.length,
      markdownLength: analysisResult.markdown.length,
      normalizedTags: parsedAnalysis.tags.map(t => `${t.name}:${t.type}:${t.confidence}`)
    });

    // Extract document title from markdown
    const documentTitle = extractDocumentTitle(analysisResult.markdown);

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        analysisPath,
        title: documentTitle,
        markdown: analysisResult.markdown,
        sections: parsedAnalysis.sections,
        tables: parsedAnalysis.tables,
        tags: parsedAnalysis.tags,
        signatura: parsedAnalysis.signatura,
        metadata: analysisData.metadata
      }
    });

  } catch (error) {
    log.error('❌ AI analysis error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'AI analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}