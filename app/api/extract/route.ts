// app/api/extract/route.ts
// AI-FIRST: GPT-5 multimodal analysis of PDF documents
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { parseAIAnalysis, type ParsedAnalysis } from '../../../lib/ai-parser';

// Initialize OpenAI with GPT-5
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ExtractRequest {
  pdfPath?: string;  // Path in Supabase Storage
  templateId: string;
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

export async function POST(request: NextRequest) {
  console.log('🚀 AI-FIRST Extract Request Started');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase environment variables missing');
      return NextResponse.json(
        { error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized for AI analysis');

    // Parse request
    const { pdfPath, templateId } = await request.json() as ExtractRequest;
    
    console.log('📝 AI Extract request:', {
      templateId,
      pdfPath: pdfPath || 'MOCK_MODE'
    });

    if (!templateId) {
      return NextResponse.json(
        { error: 'Missing templateId' },
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
          { error: 'Failed to access PDF file', details: urlError?.message },
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
      // Real GPT-5 multimodal call
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Using GPT-4o until GPT-5 is available
        messages: [
          {
            role: "system",
            content: `You are an AI document analysis expert. Your task is to:

1. Read the PDF document completely
2. Extract structured content in Markdown format (H1-H3 headers, lists, tables)  
3. Identify variable placeholders (names, dates, amounts, addresses, references)
4. Return both Markdown transcription AND structured JSON

Focus on municipal/administrative documents. Look for:
- Personal names, company names
- Addresses and locations  
- Dates and amounts
- Administrative references
- Tables with financial data
- Signature blocks

Return format: 
- "markdown": complete document in Markdown
- "json": structured data with sections[], tables[], tags[]

DO NOT invent data. Only extract what you can clearly see in the document.`
          },
          {
            role: "user", 
            content: [
              {
                type: "text",
                text: `Analyze this PDF document. Extract:
1. Complete Markdown transcription with proper headers and tables
2. JSON structure with sections, tables, and variable tags
3. Identify potential placeholders for mail merge (names, dates, amounts, etc.)

Return both markdown and json in your response.`
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
        max_tokens: 8000,
        temperature: 0.1
      });

      const aiResponse = completion.choices[0].message.content;
      if (!aiResponse) {
        throw new Error('Empty response from GPT-5');
      }

      // Parse AI response (expecting markdown + json)
      // For now, mock the parsing - in production, you'd extract markdown and json from the response
      console.log('🤖 GPT-5 response length:', aiResponse.length);
      
      // TODO: Parse the actual AI response to extract markdown and json
      // This is a simplified mock for now
      analysisResult = {
        markdown: aiResponse.substring(0, 2000) + '...',
        json: {
          sections: [],
          tables: [],
          tags: []
        }
      };
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
        processingMethod: 'gpt-4o-multimodal',
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

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        analysisPath,
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
        error: 'AI analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}