// app/api/ai-docx/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import OpenAI from 'openai';
import { log } from '@/lib/logger';

// Initialize OpenAI client lazily
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// GPT-5 DOCX Transcription - Faithful document reproduction

export async function POST(request: NextRequest) {
  log.debug('📄 DOCX Analysis Request Started');
  
  try {
    // Initialize Supabase client with error handling
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabase = null;
    if (supabaseUrl && supabaseServiceKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        log.debug('✅ Supabase client initialized');
      } catch (error) {
        log.warn('⚠️ Supabase initialization failed:', error);
      }
    } else {
      log.warn('⚠️ Supabase environment variables not found, storage will be skipped');
    }
    // 1. Parse FormData amb millor error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      log.error('❌ FormData parse error:', error);
      return NextResponse.json(
        { error: 'Invalid form data', details: error },
        { status: 400 }
      );
    }

    // 2. Validar fitxer DOCX
    const file = formData.get('docx') as File;
    if (!file) {
      log.error('❌ No file uploaded');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    log.debug('📁 File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // 3. Validar format amb més flexibilitat
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/docx',
      'application/msword'
    ];
    
    const isValidType = validTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.docx');
    
    if (!isValidType) {
      log.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { 
          error: 'File must be .docx format',
          received: file.type,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    // 4. Convertir a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    log.debug('🔄 Processing document...', {
      bufferSize: buffer.length
    });

    // 5. Generar template ID únic
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 6. Save original DOCX to Supabase Storage (REQUIRED for binary preservation)
    let storageUrl = null;
    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('template-docx')
          .upload(`${templateId}/original.docx`, buffer, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          log.error('❌ Storage upload FAILED - Cannot proceed without binary storage:', uploadError);
          return NextResponse.json(
            { error: 'Storage required for DOCX processing', details: uploadError.message },
            { status: 500 }
          );
        } else {
          storageUrl = uploadData?.path;
          log.debug('✅ Original DOCX saved to storage:', storageUrl);
        }
      } catch (storageError) {
        log.error('❌ Storage error - Cannot proceed:', storageError);
        return NextResponse.json(
          { error: 'Storage required for DOCX processing' },
          { status: 500 }
        );
      }
    } else {
      log.error('❌ Supabase not available - Cannot proceed without storage');
      return NextResponse.json(
        { error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    // 7. Extract text content from DOCX for GPT-5 transcription
    try {
      log.debug('🔍 Analyzing DOCX content for GPT-5 transcription...');
      
      // Use PizZip to read DOCX structure
      const zip = new PizZip(buffer);
      const documentXml = zip.file('word/document.xml')?.asText();
      
      if (documentXml) {
        log.debug('📄 Scanning XML for placeholder patterns...');
        
        // Extract text content for GPT-5 transcription
        const textContent = documentXml
          .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1')
          .replace(/<[^>]*>/g, '')
          .trim();
          
        log.debug('📄 Text content extracted:', { length: textContent.length, preview: textContent.substring(0, 200) });
        
        // 8. Call GPT-5 to transcribe the DOCX content faithfully
        log.debug('🤖 Calling GPT-5 for faithful DOCX transcription (v2)...');
        
        const openai = getOpenAI();
        
        // Try GPT-5 first, fallback to GPT-4o if issues
        let completion;
        try {
          log.debug('🚀 Attempting GPT-5 transcription...');
          completion = await openai.chat.completions.create({
            model: "gpt-5",
          messages: [
            {
              role: "system",
              content: `You are a LITERAL document transcriber. Your ONLY job is to recreate the original document structure EXACTLY as it appears.

RULES:
1. Copy text line by line, preserving EXACT formatting
2. Maintain original spacing, line breaks, and structure
3. Do NOT add explanations, interpretations, or expansions
4. Do NOT omit any content - transcribe everything
5. Preserve tables, headers, lists exactly as shown
6. Output in clean markdown format

You are like a photocopier - reproduce EXACTLY what you see.`
            },
            {
              role: "user",
              content: `TRANSCRIBE this DOCX content EXACTLY:\n\n${textContent}`
            }
          ],
          max_completion_tokens: 4000
        });
        } catch (gpt5Error) {
          log.warn('⚠️ GPT-5 failed, falling back to GPT-4o:', gpt5Error);
          completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a LITERAL document transcriber. Your ONLY job is to recreate the original document structure EXACTLY as it appears.

RULES:
1. Copy text line by line, preserving EXACT formatting
2. Maintain original spacing, line breaks, and structure
3. Do NOT add explanations, interpretations, or expansions
4. Do NOT omit any content - transcribe everything
5. Preserve tables, headers, lists exactly as shown
6. Output in clean markdown format

You are like a photocopier - reproduce EXACTLY what you see.`
              },
              {
                role: "user",
                content: `TRANSCRIBE this DOCX content EXACTLY:\n\n${textContent}`
              }
            ],
            temperature: 0.1,
            max_tokens: 4000
          });
        }
        
        const transcription = completion.choices[0]?.message?.content || '';
        log.debug('✅ DOCX transcription complete:', { 
          length: transcription.length,
          model: completion.model || 'unknown'
        });
        
        // Return transcribed content instead of just placeholders
        const analysisResult = {
          templateId,
          fileName: file.name,
          storageUrl,
          transcription,
          markdown: transcription, // For compatibility with existing interface
          placeholders: [], // Will be generated by smart mapping later
          confidence: 95,
          metadata: {
            transcriptionLength: transcription.length,
            storageSize: buffer.length,
            extractionMethod: 'gpt-5-transcription',
            requiresSmartMapping: true
          }
        };
        
        log.debug('✅ GPT-5 transcription analysis complete:', {
          templateId,
          transcriptionLength: transcription.length,
          storageUrl
        });
        
        return NextResponse.json({
          success: true,
          data: analysisResult
        });
      } else {
        // No document.xml found
        log.error('❌ Could not find document.xml in DOCX file');
        return NextResponse.json(
          { error: 'Invalid DOCX file - missing document.xml' },
          { status: 400 }
        );
      }
    } catch (extractError) {
      log.error('❌ DOCX transcription failed:', extractError);
      return NextResponse.json(
        { error: 'Failed to transcribe DOCX content', details: extractError instanceof Error ? extractError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    log.error('❌ Unexpected error in analyze:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}