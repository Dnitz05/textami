// app/api/upload-pdf/route.ts
// Upload PDF to Supabase Storage for GPT-5 analysis
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  console.log('📤 PDF Upload Started');
  
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
    console.log('✅ Supabase client initialized for PDF upload');

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateId = formData.get('templateId') as string;
    
    if (!file || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, templateId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    console.log('📄 Processing PDF upload:', {
      fileName: file.name,
      size: file.size,
      type: file.type,
      templateId
    });

    // Convert File to ArrayBuffer then Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage in templates bucket
    const fileName = `${templateId}/${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('templates')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Failed to upload PDF:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get signed URL for GPT-5 access (no auth required)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('templates')
      .createSignedUrl(uploadData.path, 3600); // 1 hour expiry

    if (signedUrlError) {
      console.error('❌ Failed to create signed URL:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to create access URL', details: signedUrlError.message },
        { status: 500 }
      );
    }

    console.log('✅ PDF uploaded successfully:', {
      path: uploadData.path,
      signedUrl: signedUrlData.signedUrl
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        fileName: file.name,
        filePath: uploadData.path,
        pdfUrl: signedUrlData.signedUrl,
        fileSize: buffer.length,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error in PDF upload:', error);
    return NextResponse.json(
      { 
        error: 'PDF upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}