// app/api/templates/route.ts
// API for managing saved templates
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApiResponse } from '../../../lib/types';
import { log } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  lastModified: string;
  userId: string;
  // Template data
  originalDocument: string; // Storage path to original PDF/DOCX
  analysisData: {
    markdown: string;
    sections: any[];
    tables: any[];
    tags: any[];
    signatura?: any;
  };
  excelHeaders: string[];
  mappings: Record<string, string>;
  // Metadata
  documentType: 'pdf' | 'docx';
  documentSize: number;
  tagsCount: number;
  mappedCount: number;
}

// GET - Retrieve user's saved templates
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<SavedTemplate[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    
    log.debug('📋 Fetching templates for user:', userId);

    // Get templates from storage (would be database in production)
    const { data: files, error } = await supabase.storage
      .from('templates')
      .list(`${userId}/`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      log.error('❌ Error fetching templates:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    // Convert storage files to SavedTemplate format
    const templates: SavedTemplate[] = [];
    
    for (const file of files || []) {
      if (file.name.endsWith('.json')) {
        try {
          // Download template data
          const { data: templateData, error: downloadError } = await supabase.storage
            .from('templates')
            .download(`${userId}/${file.name}`);

          if (!downloadError && templateData) {
            const templateJson = JSON.parse(await templateData.text());
            templates.push({
              id: file.name.replace('.json', ''),
              name: templateJson.name || file.name.replace('.json', ''),
              description: templateJson.description || 'Plantilla sense descripció',
              createdDate: new Date(file.created_at || Date.now()).toLocaleDateString(),
              lastModified: new Date(file.updated_at || file.created_at || Date.now()).toLocaleDateString(),
              userId,
              originalDocument: templateJson.originalDocument || '',
              analysisData: templateJson.analysisData || {},
              excelHeaders: templateJson.excelHeaders || [],
              mappings: templateJson.mappings || {},
              documentType: templateJson.documentType || 'pdf',
              documentSize: templateJson.documentSize || 0,
              tagsCount: templateJson.analysisData?.tags?.length || 0,
              mappedCount: Object.keys(templateJson.mappings || {}).length
            });
          }
        } catch (parseError) {
          log.error('❌ Error parsing template file:', { fileName: file.name, error: parseError });
        }
      }
    }

    log.debug('✅ Retrieved templates:', { count: templates.length, type: 'templates' });
    
    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    log.error('❌ Templates GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Save new template
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<SavedTemplate>>> {
  try {
    log.debug('📋 Saving template...');

    const templateData = await request.json();
    const {
      name,
      description = '',
      userId = 'anonymous',
      originalDocument,
      analysisData,
      excelHeaders,
      mappings,
      documentType = 'pdf',
      documentSize = 0
    } = templateData;

    if (!name || !analysisData) {
      return NextResponse.json(
        { success: false, error: 'Template name and analysis data required' },
        { status: 400 }
      );
    }

    log.debug('📄 Saving template:', {
      name,
      userId,
      documentType,
      tagsCount: analysisData.tags?.length || 0,
      mappedCount: Object.keys(mappings || {}).length
    });

    const templateId = `${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const storagePath = `${userId}/${templateId}.json`;

    const template: SavedTemplate = {
      id: templateId,
      name,
      description,
      createdDate: new Date().toLocaleDateString(),
      lastModified: new Date().toLocaleDateString(),
      userId,
      originalDocument,
      analysisData,
      excelHeaders: excelHeaders || [],
      mappings: mappings || {},
      documentType,
      documentSize,
      tagsCount: analysisData.tags?.length || 0,
      mappedCount: Object.keys(mappings || {}).length
    };

    // Save to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('templates')
      .upload(storagePath, JSON.stringify(template, null, 2), {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      log.error('❌ Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to save template', details: uploadError.message },
        { status: 500 }
      );
    }

    log.debug('✅ Template saved:', storagePath);

    return NextResponse.json({
      success: true,
      data: template
    });

  } catch (error) {
    log.error('❌ Templates POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove template
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const userId = searchParams.get('userId') || 'anonymous';

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID required' },
        { status: 400 }
      );
    }

    log.debug('🗑️ Deleting template:', templateId);

    const storagePath = `${userId}/${templateId}.json`;
    const { error } = await supabase.storage
      .from('templates')
      .remove([storagePath]);

    if (error) {
      log.error('❌ Delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    log.debug('✅ Template deleted:', storagePath);

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    });

  } catch (error) {
    log.error('❌ Templates DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}