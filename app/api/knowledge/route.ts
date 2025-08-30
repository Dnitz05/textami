// app/api/knowledge/route.ts
// API for persistent user knowledge base management
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApiResponse } from '../../../lib/types';
import { log } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KnowledgeDocument {
  id: string;
  filename: string;
  title: string;
  uploadDate: string;
  size: number;
  type: 'normativa' | 'reglament' | 'guia' | 'referencia';
  description: string;
  url?: string;
  userId: string;
  storagePath: string;
}

// GET - Retrieve user's knowledge base documents
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<KnowledgeDocument[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    
    log.debug('📚 Fetching knowledge base for user:', userId);

    // Get documents from database (would be implemented with proper user auth)
    // For now, using storage-based approach
    const { data: files, error } = await supabase.storage
      .from('knowledge-base')
      .list(`${userId}/`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      
    log.debug('📁 Debug - Storage path searched:', `${userId}/`);
    log.debug('📄 Debug - Files found:', { count: files?.length || 0, files });

    if (error) {
      log.error('❌ Error fetching knowledge base:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch knowledge base' },
        { status: 500 }
      );
    }

    // Convert storage files to KnowledgeDocument format
    const documents: KnowledgeDocument[] = (files || [])
      .filter(file => file.name.endsWith('.pdf'))
      .map(file => ({
        id: file.id || file.name.replace(/[^a-zA-Z0-9]/g, '_'),
        filename: file.name,
        title: file.name.replace('.pdf', ''),
        uploadDate: new Date(file.created_at || Date.now()).toLocaleDateString(),
        size: file.metadata?.size || 0,
        type: 'referencia' as const,
        description: 'Document de referència per contexte IA',
        userId,
        storagePath: `${userId}/${file.name}`,
        url: undefined // Will be populated when needed
      }));

    log.debug('✅ Retrieved knowledge base:', { count: documents.length, type: 'documents' });
    
    // DEBUG: Also check if there are documents in the root or other folders
    if (documents.length === 0) {
      log.debug('🔍 Debug - No documents found for user, checking root folder...');
      const { data: rootFiles } = await supabase.storage
        .from('knowledge-base')
        .list('', { limit: 50 });
      log.debug('📁 Debug - Root folder contents:', { count: rootFiles?.length || 0, files: rootFiles?.map(f => f.name) });
      
      // Check anonymous folder too
      const { data: anonymousFiles } = await supabase.storage
        .from('knowledge-base')
        .list('anonymous/', { limit: 50 });
      log.debug('📁 Debug - Anonymous folder contents:', { count: anonymousFiles?.length || 0, files: anonymousFiles?.map(f => f.name) });
    }
    
    return NextResponse.json({
      success: true,
      data: documents
    });

  } catch (error) {
    log.error('❌ Knowledge base GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Upload new PDF to knowledge base
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<KnowledgeDocument>>> {
  try {
    log.debug('📚 Uploading PDF to knowledge base...');

    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const userId = formData.get('userId') as string || 'anonymous';
    const documentType = formData.get('type') as KnowledgeDocument['type'] || 'referencia';
    const description = formData.get('description') as string || 'Document de referència per contexte IA';

    log.debug('📄 Form data received:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId,
      documentType,
      description
    });

    if (!file) {
      log.error('❌ No file provided');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      log.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. PDF required.` },
        { status: 400 }
      );
    }

    log.debug('📄 Processing knowledge PDF:', {
      filename: file.name,
      size: file.size,
      userId,
      type: documentType
    });

    // Upload to Supabase Storage
    const storagePath = `${userId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('knowledge-base')
      .upload(storagePath, file, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      log.error('❌ Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload PDF', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get signed URL for future access
    const { data: urlData } = await supabase.storage
      .from('knowledge-base')
      .createSignedUrl(storagePath, 3600 * 24 * 365); // 1 year expiry

    const document: KnowledgeDocument = {
      id: Date.now().toString(),
      filename: file.name,
      title: file.name.replace('.pdf', ''),
      uploadDate: new Date().toLocaleDateString(),
      size: file.size,
      type: documentType,
      description,
      userId,
      storagePath,
      url: urlData?.signedUrl
    };

    log.debug('✅ PDF uploaded to knowledge base:', storagePath);

    return NextResponse.json({
      success: true,
      data: document
    });

  } catch (error) {
    log.error('❌ Knowledge base POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove PDF from knowledge base
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const storagePath = searchParams.get('storagePath');
    const userId = searchParams.get('userId') || 'anonymous';

    if (!storagePath) {
      return NextResponse.json(
        { success: false, error: 'Storage path required' },
        { status: 400 }
      );
    }

    log.debug('🗑️ Deleting knowledge document:', storagePath);

    const { error } = await supabase.storage
      .from('knowledge-base')
      .remove([storagePath]);

    if (error) {
      log.error('❌ Delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    log.debug('✅ Knowledge document deleted:', storagePath);

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    });

  } catch (error) {
    log.error('❌ Knowledge base DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}