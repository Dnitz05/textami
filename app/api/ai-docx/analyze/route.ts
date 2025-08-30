// app/api/ai-docx/analyze/route.ts
// UPDATED: Now uses OOXML+IA Hybrid Pipeline instead of GPT Vision
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import OpenAI from 'openai';
import { htmlGenerator } from '../../../../lib/html-generator';
import { log } from '@/lib/logger';
const PizZip = require('pizzip');

// Initialize OpenAI client lazily
const getOpenAI = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// OOXML+IA Hybrid Analysis - Preserving UI compatibility

// AI Analysis helper function
async function performAIAnalysis(htmlContent: string): Promise<{
  placeholders: Array<{
    text: string;
    variable: string;
    confidence: number;
    context: string;
    type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  }>;
}> {
  const openai = getOpenAI();
  
  // Extract clean text content from HTML
  const textContent = htmlContent.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  log.debug('🔍 AI analysis input:', { 
    htmlLength: htmlContent.length, 
    textLength: textContent.length,
    preview: textContent.substring(0, 200)
  });
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analitza aquest document HTML net per detectar variables/placeholders amb alta precisió.

INSTRUCCIONS:
1. Busca text que sembli placeholders, camps variables, o contingut que es repetirà
2. Dona alta confiança (80-100%) a patrons clars com: {{nom}}, [DATA], __CAMP__, text en MAJÚSCULES repetitiu
3. Dona mitjana confiança (60-79%) a text que pot ser variable però no està clar
4. Dona baixa confiança (<60%) només si realment dubtós
5. Classifica el tipus de dada: text, date, number, currency, email, other
6. Proporciona context útil sobre on apareix cada placeholder

Retorna JSON amb aquest format:
{
  "placeholders": [
    {
      "text": "text exacte trobat",
      "variable": "nom_variable_suggerit", 
      "confidence": 85,
      "context": "descripció del context on apareix",
      "type": "text"
    }
  ]
}`
        },
        {
          role: "user",
          content: `Analitza aquest contingut HTML per detectar variables:\n\n${textContent.substring(0, 3000)}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    
    const result = completion.choices[0]?.message?.content;
    if (!result) {
      return { placeholders: [] };
    }
    
    const parsed = JSON.parse(result);
    log.debug('✅ AI analysis complete:', { 
      placeholdersFound: parsed.placeholders?.length || 0,
      model: completion.model
    });
    
    return parsed;
    
  } catch (aiError) {
    log.warn('⚠️ AI analysis failed, returning empty placeholders:', aiError);
    return { placeholders: [] };
  }
}

export async function POST(request: NextRequest) {
  log.debug('🚀 OOXML+IA Hybrid Analysis Request Started');
  
  let tempDocxPath: string | null = null;
  let tempOutputDir: string | null = null;
  
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

    // 7. Run OOXML Parser to extract content and generate HTML preview
    try {
      log.debug('🔍 Running OOXML+IA Pipeline...');
      
      // Save DOCX to temporary file for Python processing
      tempDocxPath = path.join(tmpdir(), `${templateId}.docx`);
      tempOutputDir = path.join(tmpdir(), `ooxml_output_${templateId}`);
      
      await fs.writeFile(tempDocxPath, buffer);
      await fs.mkdir(tempOutputDir, { recursive: true });
      
      log.debug('📁 Temporary files prepared:', { tempDocxPath, tempOutputDir });
      
      // Execute Python OOXML parser
      const pythonResult = await new Promise<string>((resolve, reject) => {
        const pythonProcess = spawn('python', [
          path.join(process.cwd(), 'scripts', 'ingest_docx.py'),
          tempDocxPath,
          '--output-dir', tempOutputDir
        ], {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        
        let output = '';
        let errorOutput = '';
        
        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process failed with code ${code}: ${errorOutput}`));
          } else {
            resolve(output);
          }
        });
      });
      
      log.debug('✅ OOXML parsing complete:', { pythonResult: pythonResult.substring(0, 200) });
      
      // Read generated files
      const analysisPath = path.join(tempOutputDir, 'analysis.json');
      const htmlPreviewPath = path.join(tempOutputDir, 'preview.html');
      
      const analysisData = JSON.parse(await fs.readFile(analysisPath, 'utf8'));
      const htmlContent = await fs.readFile(htmlPreviewPath, 'utf8');
      
      log.debug('📊 OOXML Analysis:', {
        stylesFound: analysisData.style_manifest ? Object.keys(analysisData.style_manifest.style_mappings || {}).length : 0,
        processingTime: analysisData.processing_time_ms
      });
      
      // 8. Perform AI analysis on clean HTML content
      log.debug('🤖 Running AI analysis on clean HTML...');
      
      const aiAnalysisResult = await performAIAnalysis(htmlContent);
      
      // 9. Format response to match existing UI expectations
      const analysisResult = {
        templateId,
        fileName: file.name,
        storageUrl,
        // Transform OOXML+HTML result to match expected markdown format for UI compatibility
        transcription: htmlContent,
        markdown: htmlContent, // UI expects this field
        placeholders: aiAnalysisResult.placeholders,
        confidence: 95,
        metadata: {
          extractionMethod: 'ooxml-ia-hybrid',
          processingTimeMs: analysisData.processing_time_ms,
          stylesFound: analysisData.style_manifest ? Object.keys(analysisData.style_manifest.style_mappings || {}).length : 0,
          htmlLength: htmlContent.length,
          storageSize: buffer.length
        }
      };
      
      log.debug('✅ OOXML+IA pipeline complete:', {
        templateId,
        placeholdersFound: aiAnalysisResult.placeholders.length,
        processingTime: analysisData.processing_time_ms + 'ms',
        storageUrl
      });
      
      return NextResponse.json({
        success: true,
        data: analysisResult
      });
      
    } catch (ooxmlError) {
      log.error('❌ OOXML+IA pipeline failed:', ooxmlError);
      return NextResponse.json(
        { error: 'Failed to process document with OOXML pipeline', details: ooxmlError instanceof Error ? ooxmlError.message : 'Unknown error' },
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
  } finally {
    // Cleanup temporary files
    try {
      if (tempDocxPath) {
        await fs.unlink(tempDocxPath);
        log.debug('🧹 Cleaned up temp DOCX:', tempDocxPath);
      }
      if (tempOutputDir) {
        await fs.rm(tempOutputDir, { recursive: true, force: true });
        log.debug('🧹 Cleaned up temp directory:', tempOutputDir);
      }
    } catch (cleanupError) {
      log.warn('⚠️ Cleanup error (non-critical):', cleanupError);
    }
  }
}