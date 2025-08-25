// app/api/ai-instructions/route.ts
// API for executing AI instructions on document content
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { ApiResponse } from '../../../lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Debug: Check API key availability
console.log('🔑 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
console.log('🔑 API Key length:', process.env.OPENAI_API_KEY?.length || 0);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AIInstruction {
  id: string;
  type: 'global' | 'section' | 'paragraph';
  title: string;
  instruction: string;
  target?: string;
}

interface ExecuteInstructionRequest {
  instruction: AIInstruction;
  originalContent: string;
  knowledgeDocuments?: Array<{
    filename: string;
    storagePath: string;
    type: string;
    description: string;
  }>;
}

interface ExecuteInstructionResponse {
  modifiedContent: string;
  executionTime: number;
  appliedInstruction: AIInstruction;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ExecuteInstructionResponse>>> {
  console.log('🤖 AI Instruction execution request started');
  
  try {
    console.log('📥 Parsing request JSON...');
    const requestBody = await request.json();
    console.log('📋 Request body keys:', Object.keys(requestBody));
    
    const { instruction, originalContent, knowledgeDocuments = [] } = requestBody as ExecuteInstructionRequest;
    
    console.log('📝 Executing instruction:', {
      type: instruction.type,
      title: instruction.title,
      contentLength: originalContent.length,
      knowledgeDocsCount: knowledgeDocuments.length
    });

    if (!instruction || !originalContent) {
      return NextResponse.json(
        { success: false, error: 'Instruction and content are required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Prepare knowledge context if available
    let knowledgeContext = '';
    if (knowledgeDocuments.length > 0) {
      knowledgeContext = `\n\nCONTEXT DE REFERÈNCIA DISPONIBLE:\n${knowledgeDocuments.map(doc => 
        `- ${doc.filename} (${doc.type}): ${doc.description}`
      ).join('\n')}\n\nUtilitza aquest context quan sigui rellevant per la instrucció.`;
    }

    // Build the AI prompt based on instruction type
    let systemPrompt = '';
    let userPrompt = '';

    switch (instruction.type) {
      case 'global':
        systemPrompt = `Ets un expert en processament de documents en català/espanyol. 

Aplica EXACTAMENT la instrucció donada a TOT el document proporcionat.

REGLES CRÍTIQUES:
- Aplica la instrucció de manera consistent a tot el contingut
- Manté l'estructura original (capçaleres, paràgrafs, llistes, taules)
- Preserva la informació tècnica i dades específiques
- NO afegeixis explicacions o comentaris sobre la transformació
- Retorna NOMÉS el contingut modificat segons la instrucció${knowledgeContext}`;

        userPrompt = `INSTRUCCIÓ A APLICAR: "${instruction.instruction}"

DOCUMENT ORIGINAL:
${originalContent}

Aplica la instrucció a tot el document i retorna el contingut modificat:`;
        break;

      case 'section':
        systemPrompt = `Ets un expert en processament de documents. Modifica NOMÉS la secció especificada segons la instrucció donada.${knowledgeContext}`;
        userPrompt = `INSTRUCCIÓ: ${instruction.instruction}
TARGET SECCIÓ: ${instruction.target || 'No especificada'}

DOCUMENT:
${originalContent}

Modifica només la secció indicada i retorna el document complet:`;
        break;

      case 'paragraph':
        systemPrompt = `Ets un expert en processament de documents. Modifica NOMÉS el paràgraf especificat segons la instrucció donada.${knowledgeContext}`;
        userPrompt = `INSTRUCCIÓ: ${instruction.instruction}
TARGET PARÀGRAF: ${instruction.target || 'No especificat'}

DOCUMENT:
${originalContent}

Modifica només el paràgraf indicat i retorna el document complet:`;
        break;

      default:
        throw new Error('Invalid instruction type');
    }

    // Call GPT-5 to execute the instruction
    console.log('🔄 Calling OpenAI GPT-5...');
    console.log('📊 Prompt lengths:', { systemPrompt: systemPrompt.length, userPrompt: userPrompt.length });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userPrompt
        }
      ],
      max_tokens: 8000,
      temperature: 0.2 // Low temperature for consistent document processing
    });
    
    console.log('✅ OpenAI response received');

    const modifiedContent = completion.choices[0].message.content;
    
    if (!modifiedContent) {
      throw new Error('Empty response from AI');
    }

    const executionTime = Date.now() - startTime;

    console.log('✅ AI instruction executed successfully:', {
      originalLength: originalContent.length,
      modifiedLength: modifiedContent.length,
      executionTimeMs: executionTime,
      instruction: instruction.title
    });

    return NextResponse.json({
      success: true,
      data: {
        modifiedContent,
        executionTime,
        appliedInstruction: instruction
      }
    });

  } catch (error) {
    console.error('❌ AI instruction execution error:', error);
    console.error('🔍 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json(
      { 
        success: false,
        error: 'AI instruction execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}