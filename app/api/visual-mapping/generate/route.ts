// app/api/visual-mapping/generate/route.ts
// TEXTAMI PHASE 2 - SIMPLIFIED GENERATION API ENDPOINT  
// FOCUS: Core functionality, no animations, no collaboration
// MAX: 150 lines - ESSENTIAL ONLY

import { NextRequest, NextResponse } from 'next/server'
import { templateGenerator } from '@/lib/visual-mapping/templateGenerator'
import { createServerSupabaseClient } from '@/lib/supabase/serverClient'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const {
      templateId,
      outputFormat = 'docx',
      filename
    } = body

    // Validate required parameters
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    if (!['docx', 'pdf'].includes(outputFormat)) {
      return NextResponse.json(
        { error: 'Output format must be docx or pdf' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Fetch template with visual mappings
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .eq('has_visual_mappings', true)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or has no visual mappings' },
        { status: 404 }
      )
    }

    // Fetch visual mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('visual_mappings')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)

    if (mappingsError || !mappings || mappings.length === 0) {
      return NextResponse.json(
        { error: 'No active visual mappings found for template' },
        { status: 400 }
      )
    }

    // Download and parse Excel file
    const { data: excelFile, error: downloadError } = await supabase.storage
      .from('template-files')
      .download(template.excel_file_path)

    if (downloadError || !excelFile) {
      return NextResponse.json(
        { error: 'Failed to download Excel file' },
        { status: 500 }
      )
    }

    // Parse Excel data (simplified)
    const excelBuffer = Buffer.from(await excelFile.arrayBuffer())
    const excelData = await parseExcelData(excelBuffer)

    if (!excelData || excelData.length === 0) {
      return NextResponse.json(
        { error: 'No data found in Excel file' },
        { status: 400 }
      )
    }

    // Transform mappings to expected format
    const visualMappings = mappings.map(mapping => ({
      id: mapping.id,
      excelColumn: {
        name: mapping.excel_column_name,
        type: mapping.excel_column_type
      },
      wordSelection: {
        text: mapping.word_selection_text,
        paragraphId: mapping.word_paragraph_id,
        styling: mapping.captured_styling
      },
      mappingType: mapping.mapping_type,
      generatedVariableName: mapping.generated_variable_name,
      generatedSyntax: mapping.generated_syntax,
      docxtemplaterModule: mapping.docxtemplater_module,
      moduleValue: mapping.module_value
    }))

    // Get word content from template metadata
    const wordContent = template.mapping_metadata?.wordContent || ''
    if (!wordContent) {
      return NextResponse.json(
        { error: 'No Word content found in template' },
        { status: 400 }
      )
    }

    // Generate documents using templateGenerator
    const result = await templateGenerator.generateDocuments({
      templateId,
      outputFormat: outputFormat as 'docx' | 'pdf',
      excelData,
      visualMappings,
      wordContent,
      filename
    })

    // Log generation stats for analytics
    console.log(`Document generation completed for template ${templateId}`)
    console.log(`Processing time: ${Date.now() - startTime}ms`)
    console.log(`ROI achieved: €${result.statistics.roiValue}`)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Document generation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      filename: result.filename,
      format: result.format,
      size: result.size,
      statistics: result.statistics,
      generatedAt: result.generatedAt.toISOString(),
      processingTimeMs: Date.now() - startTime
    })

  } catch (error) {
    console.error('Generation API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during document generation',
        processingTimeMs: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

/**
 * Parse Excel data using SheetJS (simplified)
 */
async function parseExcelData(buffer: Buffer): Promise<Record<string, any>[]> {
  try {
    // Import SheetJS dynamically to reduce bundle size
    const XLSX = await import('xlsx')
    
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    
    // Convert to JSON with basic options
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false
    }) as any[][]

    if (jsonData.length < 2) {
      throw new Error('Excel file must have headers and at least one data row')
    }

    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1)

    // Convert to object array
    return rows.map(row => {
      const obj: Record<string, any> = {}
      headers.forEach((header, index) => {
        obj[header] = row[index] || ''
      })
      return obj
    })

  } catch (error) {
    console.error('Excel parsing error:', error)
    throw new Error('Failed to parse Excel file')
  }
}