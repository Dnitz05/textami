// app/api/ai-docx/generate/route.ts
// BINARY DOCX GENERATION with docxtemplater - Professional format preservation
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';

export async function POST(request: NextRequest) {
  console.log('🚀 DOCX Generate Request Started - Binary Processing');
  
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
    console.log('✅ Supabase client initialized for binary generation');

    // Parse request data
    const { templateId, storageUrl, mappings } = await request.json();
    
    console.log('📝 Binary generation request:', {
      templateId,
      storageUrl,
      mappingCount: Object.keys(mappings || {}).length,
      mappings: mappings
    });

    if (!templateId || !storageUrl || !mappings) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, storageUrl, mappings' },
        { status: 400 }
      );
    }

    // 1. Retrieve original DOCX binary from Supabase Storage
    console.log('📥 Retrieving original DOCX binary from storage:', storageUrl);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('templates')
      .download(storageUrl);

    if (downloadError || !fileData) {
      console.error('❌ Failed to retrieve DOCX binary from storage:', downloadError);
      return NextResponse.json(
        { error: 'Failed to retrieve template binary', details: downloadError?.message },
        { status: 500 }
      );
    }

    // Convert Blob to ArrayBuffer then Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);
    
    console.log('✅ Original DOCX binary retrieved:', {
      size: originalBuffer.length,
      type: fileData.type
    });

    // 2. Process DOCX with docxtemplater (PRESERVES ALL FORMATTING)
    console.log('🔄 Processing DOCX binary with docxtemplater...');
    console.log('📋 Replacing placeholders with data:', mappings);

    let generatedBuffer: Buffer;
    
    try {
      // Load the original DOCX binary
      const zip = new PizZip(originalBuffer);
      
      // Create docxtemplater instance
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        errorLogging: true,
      });

      // Set the template variables (this replaces {{placeholder}} with actual data)
      doc.setData(mappings);

      // Render the document - this is where the magic happens!
      // All formatting, styles, fonts, colors, etc. are preserved
      doc.render();

      // Generate the final binary DOCX with all formatting intact
      generatedBuffer = doc.getZip().generate({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 4
        }
      });

      console.log('✅ DOCX binary generated successfully with full formatting preservation:', {
        originalSize: originalBuffer.length,
        generatedSize: generatedBuffer.length,
        sizeChange: ((generatedBuffer.length - originalBuffer.length) / originalBuffer.length * 100).toFixed(2) + '%'
      });

    } catch (docxError) {
      console.error('❌ Docxtemplater binary processing failed:', docxError);
      return NextResponse.json(
        { 
          error: 'Failed to process DOCX template binary',
          details: docxError instanceof Error ? docxError.message : 'Unknown docxtemplater error'
        },
        { status: 500 }
      );
    }

    // 3. Save generated DOCX binary to outputs bucket
    const outputFileName = `generated_${templateId}_${Date.now()}.docx`;
    console.log('💾 Saving generated DOCX binary to storage:', outputFileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('outputs')
      .upload(outputFileName, generatedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Failed to save generated DOCX binary:', uploadError);
      return NextResponse.json(
        { error: 'Failed to save generated document', details: uploadError.message },
        { status: 500 }
      );
    }

    // 4. Get public URL for download
    const { data: publicUrlData } = supabase.storage
      .from('outputs')
      .getPublicUrl(uploadData.path);

    console.log('✅ Generated DOCX binary saved and accessible:', publicUrlData.publicUrl);

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: {
        templateId,
        outputFileName,
        downloadUrl: publicUrlData.publicUrl,
        storagePath: uploadData.path,
        fileSize: generatedBuffer.length,
        processedMappings: Object.keys(mappings).length,
        generatedAt: new Date().toISOString(),
        processingMethod: 'docxtemplater-binary',
        formatPreserved: true
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in binary DOCX generation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during binary processing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}