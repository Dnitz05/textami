// app/api/ai-docx/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';

// Helper function to infer placeholder type from name
function inferPlaceholderType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('email') || lowerText.includes('mail')) return 'email';
  if (lowerText.includes('phone') || lowerText.includes('tel')) return 'phone';
  if (lowerText.includes('date') || lowerText.includes('data')) return 'date';
  if (lowerText.includes('amount') || lowerText.includes('import') || lowerText.includes('price')) return 'number';
  if (lowerText.includes('address') || lowerText.includes('direccio')) return 'address';
  
  return 'string';
}

// NO MORE HTML CONVERSION - Working with binary DOCX only

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
    
    // 6. Save original DOCX to Supabase Storage (REQUIRED for binary preservation)
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
          console.error('❌ Storage upload FAILED - Cannot proceed without binary storage:', uploadError);
          return NextResponse.json(
            { error: 'Storage required for DOCX processing', details: uploadError.message },
            { status: 500 }
          );
        } else {
          storageUrl = uploadData?.path;
          console.log('✅ Original DOCX saved to storage:', storageUrl);
        }
      } catch (storageError) {
        console.error('❌ Storage error - Cannot proceed:', storageError);
        return NextResponse.json(
          { error: 'Storage required for DOCX processing' },
          { status: 500 }
        );
      }
    } else {
      console.error('❌ Supabase not available - Cannot proceed without storage');
      return NextResponse.json(
        { error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    // 7. Extract ONLY placeholders from DOCX (NO text conversion)
    let extractedPlaceholders: Array<{
      text: string;
      type: string;
      confidence: number;
      originalMatch: string;
      position: number;
    }> = [];
    
    try {
      console.log('🔍 Analyzing DOCX for placeholders (preserving binary format)...');
      
      // Use PizZip to read DOCX structure
      const zip = new PizZip(buffer);
      const documentXml = zip.file('word/document.xml')?.asText();
      
      if (documentXml) {
        console.log('📄 Scanning XML for placeholder patterns...');
        
        // Extract only text content for placeholder detection (don't convert for display)
        const textContent = documentXml
          .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1')
          .replace(/<[^>]*>/g, '')
          .trim();
          
        console.log('🔍 Text content length:', textContent.length);
        
        // Detect placeholders - focus on {{placeholder}} format for docxtemplater
        const placeholderPatterns = [
          /\{\{([^}]+)\}\}/g, // {{placeholder}} - primary format for docxtemplater
          /\{([^}]+)\}/g,     // {placeholder} - alternative format
        ];
        
        placeholderPatterns.forEach((pattern, index) => {
          console.log(`🔍 Testing pattern ${index + 1}: ${pattern.source}`);
          let match;
          let patternMatches = 0;
          while ((match = pattern.exec(textContent)) !== null) {
            patternMatches++;
            const text = match[1].trim();
            console.log(`✅ Found placeholder: "${match[0]}" -> "${text}"`);
            if (text && !extractedPlaceholders.some(p => p.text === text)) {
              extractedPlaceholders.push({
                text: text,
                type: inferPlaceholderType(text),
                confidence: 95,
                originalMatch: match[0],
                position: match.index || 0
              });
            }
          }
          console.log(`📊 Pattern ${index + 1} found ${patternMatches} matches`);
        });
      }
    } catch (extractError) {
      console.error('❌ Placeholder extraction failed:', extractError);
      return NextResponse.json(
        { error: 'Failed to analyze DOCX structure', details: extractError instanceof Error ? extractError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    // Return ONLY placeholder analysis - NO transcription or HTML
    const analysisResult = {
      templateId,
      fileName: file.name,
      storageUrl, // Essential for binary retrieval
      placeholders: extractedPlaceholders,
      confidence: extractedPlaceholders.length > 0 ? 95 : 0,
      metadata: {
        placeholderCount: extractedPlaceholders.length,
        storageSize: buffer.length,
        extractionMethod: 'pizzip-binary',
        requiresDocxtemplater: true
      }
    };

    console.log('✅ Binary analysis complete:', {
      templateId,
      placeholders: analysisResult.placeholders.length,
      storageUrl: analysisResult.storageUrl
    });

    // 8. Return binary-first response
    return NextResponse.json({
      success: true,
      data: analysisResult
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