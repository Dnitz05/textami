// app/api/ai-docx/mapping/route.ts
// AI-First Intelligent Mapping Proposals
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface MappingProposal {
  placeholder: string;
  excelColumn: string;
  excelHeader: string;
  confidence: number;
  reasoning: string;
  dataTypeMatch: boolean;
}

interface MappingIntelligence {
  success: boolean;
  proposals: MappingProposal[];
  unmappedPlaceholders: string[];
  unmappedColumns: string[];
  overallConfidence: number;
  processingTime: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { placeholders, columns } = await request.json();

    if (!placeholders || !columns) {
      return NextResponse.json({ 
        error: 'Missing placeholders or columns data' 
      }, { status: 400 });
    }

    // Prepare data for GPT-5 mapping intelligence
    const mappingContext = {
      documentPlaceholders: placeholders.map((p: any) => ({
        text: p.text,
        type: p.type,
        confidence: p.confidence,
        context: p.reasoning
      })),
      excelColumns: columns.map((c: any) => ({
        column: c.column,
        header: c.header,
        dataType: c.dataType,
        sampleData: c.sampleData,
        description: c.aiDescription
      }))
    };

    // GPT-5 Intelligent Mapping
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // GPT-5 official model
      messages: [
        {
          role: "system",
          content: `You are an AI mapping specialist. Your task is to intelligently match document placeholders with Excel columns based on:

1. Semantic similarity (name vs Name, fecha vs Date, etc.)
2. Data type compatibility 
3. Context clues from sample data
4. Common business document patterns

For each mapping, provide:
- placeholder: the document field to fill
- excelColumn: the Excel column letter (A, B, C, etc.) 
- excelHeader: the Excel column header name
- confidence: 0-100 score for mapping accuracy
- reasoning: clear explanation why this mapping makes sense
- dataTypeMatch: boolean if data types are compatible

Return JSON with proposals array and unmapped items.`
        },
        {
          role: "user", 
          content: `Create intelligent mappings for this data:

${JSON.stringify(mappingContext, null, 2)}

Focus on finding the best semantic and contextual matches. Be conservative with confidence scores - only high confidence (80+) for obvious matches.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Process AI mapping proposals
    const proposals: MappingProposal[] = (aiResponse.proposals || []).map((p: any) => ({
      placeholder: p.placeholder || '',
      excelColumn: p.excelColumn || p.column || '',
      excelHeader: p.excelHeader || p.header || '',
      confidence: Math.min(Math.max(p.confidence || 50, 0), 100),
      reasoning: p.reasoning || 'AI suggested mapping',
      dataTypeMatch: p.dataTypeMatch !== false // Default to true unless explicitly false
    }));

    // Calculate overall confidence
    const overallConfidence = proposals.length > 0 
      ? Math.round(proposals.reduce((sum, p) => sum + p.confidence, 0) / proposals.length)
      : 0;

    // Find unmapped items
    const mappedPlaceholders = new Set(proposals.map(p => p.placeholder));
    const mappedColumns = new Set(proposals.map(p => p.excelColumn));
    
    const unmappedPlaceholders = placeholders
      .map((p: any) => p.text)
      .filter((text: string) => !mappedPlaceholders.has(text));
      
    const unmappedColumns = columns
      .map((c: any) => c.column)
      .filter((col: string) => !mappedColumns.has(col));

    const result: MappingIntelligence = {
      success: true,
      proposals,
      unmappedPlaceholders,
      unmappedColumns,
      overallConfidence,
      processingTime: Date.now() - startTime
    };

    console.log(`[AI-MAPPING] Success: ${proposals.length} mappings proposed with ${overallConfidence}% confidence in ${result.processingTime}ms`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[AI-MAPPING] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'AI mapping analysis failed',
      details: error.message,
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}