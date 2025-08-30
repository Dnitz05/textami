// app/api/extract/route.ts
// AI-FIRST: GPT-5 multimodal analysis of PDF documents
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parseAIAnalysis, type ParsedAnalysis } from '../../../lib/ai-parser';
import { ApiResponse, ExtractionResponse } from '../../../lib/types';
import { log } from '@/lib/logger';

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

    // Get signed URL for PDF (or mock for development)
    if (pdfPath) {
      // Real mode: get signed URL from Supabase Storage
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
    } else {
      // Mock mode: use sample municipal report for development
      log.debug('🧪 MOCK MODE: Using sample municipal report data');
      pdfSignedUrl = 'MOCK_PDF_URL';
    }

    // Call GPT-5 multimodal for document analysis
    log.debug('🤖 Calling GPT-5 multimodal for document analysis...');

    let analysisResult: AIAnalysisResponse;

    if (pdfSignedUrl === 'MOCK_PDF_URL') {
      // Mock response for development - based on municipal report example
      analysisResult = {
        markdown: `# INFORME TÈCNIC

## Assumpte
Llicència d'obra menor sol·licitada per Paquita Ferre SL per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa.

## Antecedents
Paquita Ferre SL sol·licita llicència d'obra menor per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa, amb un pressupost de 683,00 €.

## Informe
S'informa favorablement la concessió de la llicència sol·licitada d'acord amb la documentació presentada i les condicions particulars que s'estableixen.

## Condicions particulars
- No s'admet la reparació amb pintura de cautxú o similar que pugui desprendre's amb facilitat
- Previ inici de l'obra s'hauran de presentar les mostres dels materials a utilitzar
- Els treballs s'executaran d'acord amb la normativa vigent

| Concepte | Impost | Taxa | Total |
|----------|--------|------|--------|
| Quota resultant | 23,36 € | 6,15 € | 29,51 € |
| Quota mínima | 0,00 € | 78,60 € | 78,60 € |
| Total quota | 23,36 € | 78,60 € | 101,96 € |

**Aitor Gilabert Juan**  
Arquitecte Municipal  
Tortosa, 8 d'abril de 2021`,
        json: {
          sections: [
            {
              id: "assumpte",
              title: "Assumpte",
              markdown: "Llicència d'obra menor sol·licitada per Paquita Ferre SL per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa."
            },
            {
              id: "antecedents", 
              title: "Antecedents",
              markdown: "Paquita Ferre SL sol·licita llicència d'obra menor per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa, amb un pressupost de 683,00 €."
            },
            {
              id: "informe",
              title: "Informe", 
              markdown: "S'informa favorablement la concessió de la llicència sol·licitada d'acord amb la documentació presentada i les condicions particulars que s'estableixen."
            }
          ],
          tables: [
            {
              id: "liquidacio",
              title: "Informe liquidació obra",
              headers: ["Concepte", "Impost", "Taxa", "Total"],
              rows: [
                ["Quota resultant", "23,36 €", "6,15 €", "29,51 €"],
                ["Quota mínima", "0,00 €", "78,60 €", "78,60 €"],
                ["Total quota", "23,36 €", "78,60 €", "101,96 €"]
              ],
              normalized: {
                pressupost: 683.00,
                impost_pct: 3.42,
                taxa_pct: 0.90,
                total_quota: 101.96
              }
            }
          ],
          tags: [
            { name: "nom_solicitant", example: "Paquita Ferre SL", type: "string", confidence: 0.95, page: 1, anchor: "sol·licitada per" },
            { name: "adreca_obra", example: "carrer Llarg de Sant Vicent, 56", type: "address", confidence: 0.98, page: 1 },
            { name: "municipi", example: "Tortosa", type: "string", confidence: 0.99, page: 1 },
            { name: "pressupost", example: "683,00 €", type: "currency", confidence: 0.99, page: 1 },
            { name: "impost_pct", example: "3,42%", type: "percent", confidence: 0.95 },
            { name: "taxa_pct", example: "0,90%", type: "percent", confidence: 0.95 },
            { name: "total_quota", example: "101,96 €", type: "currency", confidence: 0.99, page: 1, anchor: "Total quota" },
            { name: "data_informe", example: "8 d'abril de 2021", type: "date", confidence: 0.95, page: 1 }
          ],
          signatura: {
            nom: "Aitor Gilabert Juan",
            carrec: "Arquitecte Municipal", 
            data_lloc: "Tortosa, 8 d'abril de 2021"
          }
        }
      };
    } else {
      // Real GPT-5 multimodal call using standard chat completions API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a LITERAL document transcriber. Your ONLY job is to copy text EXACTLY as it appears in the PDF - nothing more, nothing less.

⚠️ CRITICAL: YOU ARE A PHOTOCOPIER, NOT AN INTERPRETER
- Copy text character-by-character exactly as written
- If you see "Assumpte" alone, write only "Assumpte" 
- If you see "Llicència d'obra menor" alone, write only "Llicència d'obra menor"
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
- If "Assumpte" is followed by blank space, the content is blank
- If "Assumpte" is followed by specific text, copy only that text

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
- If you see "Assumpte" followed by just "Llicència d'obra menor", write EXACTLY that - do NOT expand it
- If you see standalone headers, copy them standalone - do NOT fill with content from elsewhere
- Read line-by-line and copy each line exactly as it appears

TRANSCRIPTION PROCESS:
1️⃣ START FROM THE TOP: Include document title/header as first line
2️⃣ LINE-BY-LINE COPY: Write each line exactly as it appears
3️⃣ NO INTERPRETATION: Never guess what a section "should" contain
4️⃣ PRESERVE STRUCTURE: Keep headers separate from content

EXAMPLES OF CORRECT BEHAVIOR:
✅ If PDF shows: "INFORME TÈCNIC" → Write: "INFORME TÈCNIC"
✅ If PDF shows: "Assumpte" on line 1, "Llicència d'obra menor" on line 2 → Write both lines separately
✅ If table cell shows "23,36 €" → Write exactly "23,36 €"

EXAMPLES OF FORBIDDEN BEHAVIOR:  
❌ Combining "Assumpte" + "Llicència d'obra menor" + content from paragraph → This creates false content
❌ Skipping document title because it seems obvious → All text must be included
❌ Interpreting what sections mean → Only copy what's literally there

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