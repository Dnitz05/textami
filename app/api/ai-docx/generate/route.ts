// app/api/ai-docx/generate/route.ts
// AI-First Document Generation with GPT-5
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface GenerationRequest {
  templateId: string;
  mappings: Array<{
    placeholder: string;
    excelColumn: string;
    excelHeader: string;
  }>;
  excelData: Array<Record<string, any>>;
  batchSize?: number;
}

interface GenerationResult {
  success: boolean;
  generatedDocuments: Array<{
    documentId: string;
    fileName: string;
    downloadUrl: string;
    dataRow: number;
  }>;
  totalGenerated: number;
  processingTime: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body: GenerationRequest = await request.json();
    const { templateId, mappings, excelData, batchSize = 10 } = body;

    if (!templateId || !mappings || !excelData) {
      return NextResponse.json({ 
        error: 'Missing required data: templateId, mappings, or excelData' 
      }, { status: 400 });
    }

    if (excelData.length === 0) {
      return NextResponse.json({ 
        error: 'No data rows provided for generation' 
      }, { status: 400 });
    }

    const generatedDocuments = [];
    const errors = [];

    // Process in batches for efficiency
    for (let i = 0; i < Math.min(excelData.length, batchSize); i++) {
      try {
        const dataRow = excelData[i];
        const documentId = `doc_${templateId}_${i + 1}`;

        // Create mapping data for this row
        const mappingData = mappings.reduce((acc, mapping) => {
          const value = dataRow[mapping.excelHeader] || dataRow[mapping.excelColumn];
          acc[mapping.placeholder] = value;
          return acc;
        }, {} as Record<string, any>);

        // GPT-5 Document Generation with Format Preservation
        const completion = await openai.chat.completions.create({
          model: "gpt-5", // GPT-5 official model
          messages: [
            {
              role: "system",
              content: `You are an AI document generation expert. Your task is to:

1. Take a document template with placeholders
2. Replace placeholders with provided data while preserving ALL formatting
3. Maintain document structure, styles, fonts, colors, spacing
4. Generate a professional document that looks identical to the original except for the filled data

Return the generated document content in a format that preserves the original structure.`
            },
            {
              role: "user",
              content: `Generate a document using this data:

Template ID: ${templateId}
Data mappings: ${JSON.stringify(mappingData, null, 2)}

Replace all placeholders with the corresponding data values while maintaining perfect formatting and structure.`
            }
          ],
          max_completion_tokens: 8000
        });

        const generatedContent = completion.choices[0].message.content;

        // For MVP, we simulate document storage
        // In production, this would save to Supabase Storage and generate real download URLs
        const mockDownloadUrl = `/api/download/${documentId}.docx`;

        generatedDocuments.push({
          documentId,
          fileName: `generated_${i + 1}.docx`,
          downloadUrl: mockDownloadUrl,
          dataRow: i + 1
        });

        console.log(`[AI-GENERATE] Generated document ${i + 1}/${Math.min(excelData.length, batchSize)}`);

      } catch (docError: any) {
        console.error(`[AI-GENERATE] Error generating document ${i + 1}:`, docError);
        errors.push(`Document ${i + 1}: ${docError.message}`);
      }
    }

    const result: GenerationResult = {
      success: generatedDocuments.length > 0,
      generatedDocuments,
      totalGenerated: generatedDocuments.length,
      processingTime: Date.now() - startTime,
      errors
    };

    console.log(`[AI-GENERATE] Batch complete: ${result.totalGenerated} documents generated in ${result.processingTime}ms`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[AI-GENERATE] Error:', error);
    
    return NextResponse.json({
      success: false,
      generatedDocuments: [],
      totalGenerated: 0,
      processingTime: Date.now() - startTime,
      errors: [error.message]
    }, { status: 500 });
  }
}