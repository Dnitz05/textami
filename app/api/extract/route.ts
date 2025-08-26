// app/api/extract/route.ts
// AI-FIRST: GPT-5 multimodal analysis of PDF documents
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parseAIAnalysis, type ParsedAnalysis } from '../../../lib/ai-parser';
import { ApiResponse, ExtractionResponse } from '../../../lib/types';

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
  console.log('🚀 AI-FIRST Extract Request Started');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase environment variables missing');
      return NextResponse.json(
        { success: false, error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized for AI analysis');

    // Parse request
    const { pdfPath, pdfUrl, templateId, fileName } = await request.json() as ExtractRequest;
    
    console.log('📝 AI Extract request:', {
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
        console.error('❌ Failed to create signed URL:', urlError);
        return NextResponse.json(
          { success: false, error: 'Failed to access PDF file', details: urlError?.message },
          { status: 500 }
        );
      }

      pdfSignedUrl = signedUrlData.signedUrl;
      console.log('✅ PDF signed URL created for AI analysis');
    } else {
      // Mock mode: use sample municipal report for development
      console.log('🧪 MOCK MODE: Using sample municipal report data');
      pdfSignedUrl = 'MOCK_PDF_URL';
    }

    // Call GPT-5 multimodal for document analysis
    console.log('🤖 Calling GPT-5 multimodal for document analysis...');

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
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an AI document analysis expert specialized in Catalan/Spanish municipal documents.

CRITICAL: Extract EXACTLY what appears in the PDF. DO NOT add, modify, or interpret content.

Extract from the PDF:
1. Complete Markdown transcription (H1-H3 headers, lists, tables) - VERBATIM text only
2. Structured JSON with sections, tables, and variable tags

Return ONLY valid JSON in this exact format:
{
  "markdown": "complete markdown transcription - EXACT TEXT ONLY",
  "json": {
    "sections": [{"id": "string", "title": "string", "markdown": "string"}],
    "tables": [{"id": "string", "title": "string", "headers": ["string"], "rows": [["string"]]}],
    "tags": [{"name": "string", "example": "string", "type": "string|date|currency|percent|number|id|address", "confidence": 0.9, "page": 1, "anchor": "string"}],
    "signatura": {"nom": "string", "carrec": "string", "data_lloc": "string"}
  }
}

RULES:
- Use ONLY text that appears literally in the PDF
- DO NOT add explanatory text, summaries, or interpretations
- DO NOT duplicate content between markdown and sections
- Present as CONTINUOUS TEXT, not paginated (combine all pages into single flow)
- Preserve original formatting, spelling, and language exactly
- Focus on extracting: names, addresses, dates, amounts, references, signatures
- If uncertain about text, mark confidence < 0.8`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this PDF document and return the complete analysis in the JSON format specified above. Include:

1. Full markdown transcription with proper structure
2. All sections, tables, and variable placeholders found
3. Accurate confidence scores and page references
4. Preserve original formatting and language

Return ONLY the JSON response, no additional text.`
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
        max_tokens: 8000,
        temperature: 0.1
      });

      const aiResponse = completion.choices[0].message.content;
      if (!aiResponse) {
        throw new Error('Empty response from GPT-5');
      }

      console.log('🤖 GPT-5 response length:', aiResponse.length);

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

        console.log('✅ GPT-5 JSON parsed successfully:', {
          markdownLength: analysisResult.markdown.length,
          sectionsFound: analysisResult.json.sections.length,
          tablesFound: analysisResult.json.tables.length,
          tagsFound: analysisResult.json.tags.length
        });

      } catch (parseError) {
        console.error('❌ Failed to parse GPT-5 JSON response:', parseError);
        console.error('Raw response:', aiResponse.substring(0, 1000));
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
      console.warn('⚠️ Failed to save analysis (non-critical):', saveError);
    } else {
      console.log('✅ Analysis saved to storage:', analysisPath);
    }

    console.log('✅ AI analysis complete:', {
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
    console.error('❌ AI analysis error:', error);
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