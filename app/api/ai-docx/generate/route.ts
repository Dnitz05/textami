// app/api/ai-docx/generate/route.ts
// MASS PRODUCTION: Generate multiple documents from frozen template + Excel data
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { ApiResponse, GenerationResponse, ExcelRowData, GeneratedDocument, GenerationError } from '../../../../lib/types';

interface GenerationRequest {
  templateId: string;
  frozenTemplateUrl: string; // Path to frozen template with {{placeholders}}
  excelData: ExcelRowData[]; // Array of row data
  mappings: Record<string, string>; // tagSlug -> excelHeader  
  batchSize?: number; // How many documents to generate (default: all)
  outputFormat?: 'docx' | 'pdf' | 'both'; // Future: PDF conversion
}

// GeneratedDocument, GenerationError, and GenerationResponse are now imported from types.ts

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<GenerationResponse>>> {
  const startTime = Date.now();
  log.debug('🚀 MASS PRODUCTION Started');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      log.error('❌ Supabase environment variables missing');
      return NextResponse.json(
        { success: false, error: 'Storage configuration required' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    log.debug('✅ Supabase client initialized for mass production');

    // Parse request data
    const { 
      templateId, 
      frozenTemplateUrl, 
      excelData, 
      mappings, 
      batchSize,
      outputFormat = 'docx'
    }: GenerationRequest = await request.json();
    
    log.debug('📊 Mass production request:', {
      templateId,
      frozenTemplateUrl,
      dataRows: excelData?.length || 0,
      mappingCount: Object.keys(mappings || {}).length,
      batchSize: batchSize || 'all',
      outputFormat
    });

    // Validation
    if (!templateId || !frozenTemplateUrl || !excelData || !mappings) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: templateId, frozenTemplateUrl, excelData, mappings' },
        { status: 400 }
      );
    }

    if (!Array.isArray(excelData) || excelData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Excel data must be a non-empty array' },
        { status: 400 }
      );
    }

    // 1. Retrieve frozen DOCX template from Supabase Storage
    log.debug('📥 Retrieving frozen DOCX template:', frozenTemplateUrl);
    const { data: templateData, error: downloadError } = await supabase.storage
      .from('template-docx')
      .download(frozenTemplateUrl);

    if (downloadError || !templateData) {
      log.error('❌ Failed to retrieve frozen template:', downloadError);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve frozen template', details: downloadError?.message },
        { status: 500 }
      );
    }

    // Convert Blob to ArrayBuffer then Buffer
    const arrayBuffer = await templateData.arrayBuffer();
    const templateBuffer = Buffer.from(arrayBuffer);
    
    log.debug('✅ Frozen DOCX template retrieved:', {
      size: templateBuffer.length,
      type: templateData.type
    });

    // 2. Process data in batches and generate documents
    const totalRows = Math.min(excelData.length, batchSize || excelData.length);
    const batchId = `batch_${templateId}_${Date.now()}`;
    const documents: GeneratedDocument[] = [];
    const errors: GenerationError[] = [];

    log.debug(`🔄 Processing ${totalRows} documents in batch ${batchId}...`);

    for (let i = 0; i < totalRows; i++) {
      const rowData = excelData[i];
      const documentId = `${templateId}_doc_${i + 1}_${Date.now()}`;
      
      try {
        log.debug(`📄 Processing document ${i + 1}/${totalRows}:`, rowData);
        
        // 2.1. Create data object for this row based on mappings
        const docData: Record<string, string | number> = {};
        
        for (const [tagSlug, excelHeader] of Object.entries(mappings)) {
          const value = rowData[excelHeader];
          // Convert all values to strings or numbers for docxtemplater
          if (typeof value === 'boolean') {
            docData[tagSlug] = value.toString();
          } else if (value !== null && value !== undefined) {
            docData[tagSlug] = value;
          } else {
            docData[tagSlug] = ''; // Use empty string if value is missing
          }
        }
        
        log.debug(`📋 Mapped data for document ${i + 1}:`, docData);

        // 2.2. Generate DOCX with docxtemplater
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          errorLogging: true,
        });

        // Set the data for this specific document
        doc.setData(docData);
        doc.render();

        // Generate the binary DOCX
        const generatedBuffer = doc.getZip().generate({ 
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 4 }
        });

        // 2.3. Save generated document to outputs bucket
        const fileName = `${documentId}.docx`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('outputs')
          .upload(fileName, generatedBuffer, {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            upsert: true
          });

        if (uploadError) {
          throw new Error(`Failed to save document: ${uploadError.message}`);
        }

        // 2.4. Get public URL for download
        const { data: publicUrlData } = supabase.storage
          .from('outputs')
          .getPublicUrl(uploadData.path);

        // Add to successful documents list
        documents.push({
          documentId,
          fileName,
          downloadUrl: publicUrlData.publicUrl,
          rowIndex: i,
          rowData,
          fileSize: generatedBuffer.length,
          generatedAt: new Date().toISOString()
        });

        log.debug(`✅ Document ${i + 1} generated successfully: ${fileName}`);

      } catch (docError) {
        log.error(`❌ Failed to generate document ${i + 1}:`, docError);
        errors.push({
          rowIndex: i,
          error: docError instanceof Error ? docError.message : 'Unknown error',
          rowData
        });
      }
    }

    // 3. Generate batch summary
    const processingTime = Date.now() - startTime;
    const generationData: GenerationResponse = {
      templateId,
      totalRequested: totalRows,
      totalGenerated: documents.length,
      totalErrors: errors.length,
      documents,
      errors,
      processingTime,
      batchId
    };

    const response: ApiResponse<GenerationResponse> = {
      success: documents.length > 0,
      data: generationData
    };

    log.debug('✅ Mass production complete:', {
      batchId,
      requested: totalRows,
      generated: documents.length,
      errors: errors.length,
      processingTime: `${processingTime}ms`,
      avgPerDoc: documents.length > 0 ? `${Math.round(processingTime / documents.length)}ms` : 'N/A'
    });

    return NextResponse.json(response);

  } catch (error) {
    log.error('❌ Unexpected error in mass production:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Mass production failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}