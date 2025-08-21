// app/api/visual-mapping/upload-word/route.ts
// TEXTAMI VISUAL MAPPING API - Word Upload Endpoint
// Handles Word file upload and conversion to HTML for visual selection

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/serverClient'
import { validateFileSize, validateFileType } from '@/lib/utils/file-validator'
import { convertDocxToHtml } from '@/lib/documents/docx-reader'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB  
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
        { error: 'Only Word documents (.docx) are allowed' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient()

    // Convert Word file to HTML for visual selection
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    
    let html: string
    try {
      html = await convertDocxToHtml(fileBuffer)
      
      // Add paragraph IDs for visual mapping system
      html = addParagraphIds(html)
      
    } catch (conversionError) {
      console.error('Word conversion error:', conversionError)
      return NextResponse.json(
        { error: 'Failed to convert Word document. Please ensure the file is not corrupted.' },
        { status: 422 }
      )
    }

    // Generate unique file name
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileName = `word-${templateId}-${timestamp}-${randomSuffix}.docx`

    // Upload original file to Supabase Storage
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
        { error: 'Failed to upload Word file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('template-files')
      .getPublicUrl(uploadData.path)

    // Update template record with Word file path
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        word_file_path: uploadData.path,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Template update error:', updateError)
      // Don't fail the request - file was uploaded and converted successfully
    }

    // Extract basic document statistics
    const wordCount = countWords(html)
    const paragraphCount = countParagraphs(html)

    // Log successful upload for analytics
    console.log(`Word uploaded and converted: ${fileName} for template ${templateId}`)
    console.log(`Document stats: ${wordCount} words, ${paragraphCount} paragraphs`)

    return NextResponse.json({
      success: true,
      html,
      filePath: uploadData.path,
      fileName: file.name,
      fileSize: file.size,
      publicUrl: urlData.publicUrl,
      documentStats: {
        wordCount,
        paragraphCount
      },
      uploadedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Word upload endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error during Word upload' },
      { status: 500 }
    )
  }
}

/**
 * Add unique paragraph IDs to HTML content for visual mapping system
 */
function addParagraphIds(html: string): string {
  let idCounter = 0
  
  return html.replace(/<p(\s[^>]*)?>/gi, (match, attributes = '') => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    const paragraphId = `p-${timestamp}-${random}-${idCounter++}`
    
    // Check if paragraph already has data-paragraph-id
    if (attributes.includes('data-paragraph-id')) {
      return match
    }
    
    // Add data-paragraph-id attribute
    const cleanAttributes = attributes.trim()
    const newAttributes = cleanAttributes 
      ? `${cleanAttributes} data-paragraph-id="${paragraphId}"` 
      : `data-paragraph-id="${paragraphId}"`
    
    return `<p ${newAttributes}>`
  })
}

/**
 * Count words in HTML content (excluding HTML tags)
 */
function countWords(html: string): number {
  const textContent = html.replace(/<[^>]*>/g, ' ')
  const words = textContent.trim().split(/\s+/).filter(word => word.length > 0)
  return words.length
}

/**
 * Count paragraphs in HTML content
 */
function countParagraphs(html: string): number {
  const paragraphMatches = html.match(/<p[^>]*>/gi)
  return paragraphMatches ? paragraphMatches.length : 0
}