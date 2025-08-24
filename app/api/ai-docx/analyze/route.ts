// app/api/ai-docx/analyze/route.ts
// AI-First DOCX Analysis with GPT-5 Vision
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface PlaceholderDetection {
  text: string;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'address';
  confidence: number;
  position: string;
  reasoning: string;
}

interface DocumentAnalysis {
  success: boolean;
  transcription: string;
  placeholders: PlaceholderDetection[];
  documentStructure: {
    pages: number;
    paragraphs: number;
    tables: number;
    images: number;
  };
  processingTime: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('docx') as File;

    if (!file) {
      return NextResponse.json({ error: 'No DOCX file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json({ error: 'File must be .docx format' }, { status: 400 });
    }

    // Convert file to base64 for GPT-5 Vision
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');

    // GPT-5 Vision Analysis
    const completion = await openai.chat.completions.create({
      model: "gpt-5", // GPT-5 official model
      messages: [
        {
          role: "system",
          content: `You are an AI document analysis expert specialized in DOCX files. Your task is to:
1. Read and understand the document structure
2. Identify potential placeholders (like {name}, {date}, [company], etc.)
3. Analyze document formatting and layout
4. Provide confidence scores for each placeholder detection

Return a JSON response with the exact structure specified.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this DOCX document and detect placeholders that could be filled with Excel data. Focus on finding patterns like {variable}, [field], or text that looks like it should be replaced with dynamic data."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Process AI response into our format
    const analysis: DocumentAnalysis = {
      success: true,
      transcription: aiResponse.transcription || 'Document analyzed successfully',
      placeholders: (aiResponse.placeholders || []).map((p: any) => ({
        text: p.text || p.name || '',
        type: p.type || 'string',
        confidence: Math.min(Math.max(p.confidence || 85, 0), 100),
        position: p.position || 'document',
        reasoning: p.reasoning || 'AI detected potential placeholder'
      })),
      documentStructure: {
        pages: aiResponse.pages || 1,
        paragraphs: aiResponse.paragraphs || 0,
        tables: aiResponse.tables || 0,
        images: aiResponse.images || 0
      },
      processingTime: Date.now() - startTime
    };

    console.log(`[AI-DOCX-ANALYZE] Success: ${analysis.placeholders.length} placeholders detected in ${analysis.processingTime}ms`);

    return NextResponse.json({
      ...analysis,
      fileName: file.name,
      size: file.size,
      templateId: crypto.randomUUID(),
      message: 'GPT-5 Vision analysis completed successfully'
    });

  } catch (error: any) {
    console.error('[AI-DOCX-ANALYZE] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'AI analysis failed',
      details: error.message,
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
}