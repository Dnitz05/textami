// app/api/google/docs/mapping/route.ts
// EMERGENCY: Google Docs AI mapping endpoint (missing from Phase 2-3)
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { validateUserSession, checkRateLimit } from '@/lib/security/auth-middleware';
import { validateRequestSchema, validateBoolean } from '@/lib/security/input-validation';
import { log } from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

interface MappingProposal {
  placeholder: string;
  excelColumn: string;
  excelHeader: string;
  confidence: number;
  reasoning: string;
  dataTypeMatch: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validate user session
    const { user, error: authError, response: authResponse } = await validateUserSession(
      request,
      { logAccess: true }
    );
    
    if (authError || !user) {
      return authResponse!;
    }

    // 2. Rate limiting
    const { allowed, response: rateLimitResponse } = checkRateLimit(
      user.id,
      10, // 10 mapping requests per minute
      60000
    );
    
    if (!allowed) {
      return rateLimitResponse!;
    }

    // 3. Validate request body
    const requestBody = await request.json();
    const { isValid, errors, sanitizedData } = validateRequestSchema(requestBody, {
      placeholders: {
        required: true,
        validator: (value) => {
          if (!Array.isArray(value)) {
            return { isValid: false, errors: ['Placeholders must be an array'] };
          }
          return { isValid: true, errors: [], sanitizedValue: value };
        }
      },
      columns: {
        required: true,
        validator: (value) => {
          if (!Array.isArray(value)) {
            return { isValid: false, errors: ['Columns must be an array'] };
          }
          return { isValid: true, errors: [], sanitizedValue: value };
        }
      }
    });

    if (!isValid) {
      log.warn('Request validation failed:', { errors, userId: user.id });
      return NextResponse.json(
        { error: 'Invalid request data', details: errors },
        { status: 400 }
      );
    }

    const { placeholders, columns } = sanitizedData!;

    log.debug('🤖 Google Docs AI mapping started:', {
      userId: user.id,
      placeholdersCount: placeholders.length,
      columnsCount: columns.length
    });

    // 4. AI-powered mapping using same logic as DOCX system
    const mappingContext = {
      documentPlaceholders: placeholders.map((p: any) => ({
        text: p.text,
        type: p.type,
        confidence: p.confidence,
        context: p.context || p.reasoning
      })),
      excelColumns: columns.map((c: any) => ({
        column: c.column,
        header: c.header,
        dataType: c.dataType,
        sampleData: c.sampleData,
        description: c.aiDescription
      }))
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI mapping specialist for Google Docs integration. Your task is to intelligently match document placeholders with Excel columns based on:

1. Semantic similarity (name vs Name, fecha vs Date, etc.)
2. Data type compatibility 
3. Context clues from sample data
4. Google Docs specific patterns

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
          content: `Create intelligent mappings for this Google Docs data:

${JSON.stringify(mappingContext, null, 2)}

Focus on finding the best semantic and contextual matches. Be conservative with confidence scores - only high confidence (80+) for obvious matches.`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI mapping service');
    }

    const mappingResult = JSON.parse(result);
    
    log.debug('✅ Google Docs AI mapping completed:', {
      userId: user.id,
      proposalsGenerated: mappingResult.proposals?.length || 0,
      processingTime: Date.now() - Date.now()
    });

    return NextResponse.json({
      success: true,
      proposals: mappingResult.proposals || [],
      unmappedPlaceholders: mappingResult.unmappedPlaceholders || [],
      unmappedColumns: mappingResult.unmappedColumns || [],
      overallConfidence: mappingResult.overallConfidence || 75,
      processingTime: Date.now() - Date.now(),
      sourceType: 'google-docs'
    });

  } catch (error) {
    log.error('❌ Google Docs mapping failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return NextResponse.json(
      { 
        error: 'AI mapping failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        sourceType: 'google-docs'
      },
      { status: 500 }
    );
  }
}