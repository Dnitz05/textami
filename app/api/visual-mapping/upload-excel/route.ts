// app/api/visual-mapping/upload-excel/route.ts
// TEXTAMI VISUAL MAPPING API - Excel Upload Endpoint
// Handles Excel file upload to Supabase Storage and column extraction

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/serverClient'
import { validateFileSize, validateFileType } from '@/lib/utils/file-validator'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const templateId = formData.get('templateId') as string

    if (!file || !templateId) {
      return NextResponse.json(
        { error: 'File and templateId are required' },
        { status: 400 }
      )
    }

    // Validate file
    const fileValidation = validateFileSize(file, MAX_FILE_SIZE)
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      )
    }

    const typeValidation = validateFileType(file, ALLOWED_TYPES)
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: 'Only Excel files (.xlsx, .xls) are allowed' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient()

    // Generate unique file name
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExtension = file.name.split('.').pop()
    const fileName = `excel-${templateId}-${timestamp}-${randomSuffix}.${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('template-files')
      .upload(`visual-mappings/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload Excel file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('template-files')
      .getPublicUrl(uploadData.path)

    // Update template record with Excel file path
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        excel_file_path: uploadData.path,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Template update error:', updateError)
      // Don't fail the request - file was uploaded successfully
    }

    // Log successful upload for analytics
    console.log(`Excel uploaded successfully: ${fileName} for template ${templateId}`)

    return NextResponse.json({
      success: true,
      filePath: uploadData.path,
      fileName: file.name,
      fileSize: file.size,
      publicUrl: urlData.publicUrl,
      uploadedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Excel upload endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error during Excel upload' },
      { status: 500 }
    )
  }
}