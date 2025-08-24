// app/api/ai-docx/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  console.log('📄 DOCX Analysis Request Started');
  
  try {
    // Initialize Supabase client with error handling
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let supabase = null;
    if (supabaseUrl && supabaseServiceKey) {
      try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ Supabase client initialized');
      } catch (error) {
        console.warn('⚠️ Supabase initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Supabase environment variables not found, storage will be skipped');
    }
    // 1. Parse FormData amb millor error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('❌ FormData parse error:', error);
      return NextResponse.json(
        { error: 'Invalid form data', details: error },
        { status: 400 }
      );
    }

    // 2. Validar fitxer DOCX
    const file = formData.get('docx') as File;
    if (!file) {
      console.error('❌ No file uploaded');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    console.log('📁 File received:', {
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
      console.error('❌ Invalid file type:', file.type);
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
    
    console.log('🔄 Processing document...', {
      bufferSize: buffer.length
    });

    // 5. Generar template ID únic
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 6. Guardar a Supabase Storage (opcional però recomanat)
    let storageUrl = null;
    if (supabase) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('templates')
          .upload(`${templateId}/original.docx`, buffer, {
            contentType: file.type,
            upsert: true
          });

        if (uploadError) {
          console.warn('⚠️ Storage upload failed (non-critical):', uploadError);
        } else {
          storageUrl = uploadData?.path;
          console.log('✅ Document saved to storage:', storageUrl);
        }
      } catch (storageError) {
        console.warn('⚠️ Storage error (continuing):', storageError);
      }
    } else {
      console.log('⚠️ Skipping storage upload (Supabase not available)');
    }

    // 7. Analitzar document amb AI (mock per ara)
    // TODO: Integrar GPT-5 Vision real aquí
    const mockAnalysis = {
      templateId,
      fileName: file.name,
      transcription: "Document content would be extracted here by GPT-5 Vision",
      placeholders: [
        { text: "nom", type: "string", confidence: 95 },
        { text: "cognoms", type: "string", confidence: 92 },
        { text: "data", type: "date", confidence: 88 },
        { text: "import", type: "number", confidence: 90 }
      ],
      confidence: 91.25,
      storageUrl,
      metadata: {
        pageCount: 1,
        wordCount: 150,
        hasImages: false,
        hasTablesi: false
      }
    };

    console.log('✅ Analysis complete:', {
      templateId,
      placeholders: mockAnalysis.placeholders.length
    });

    // 8. Retornar resposta exitosa
    return NextResponse.json({
      success: true,
      data: mockAnalysis
    });

  } catch (error) {
    console.error('❌ Unexpected error in analyze:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}