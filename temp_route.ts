// app/api/visual-mapping/templates/[id]/route.ts
// TEXTAMI VISUAL MAPPING API - Individual Template Management
// Update and delete specific visual mapping templates

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/serverClient'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const templateId = params.id
    const body = await request.json()
    const {
      templateName,
      excelFilePath,
      wordFilePath,
      wordContent,
      visualMappings
    } = body

    if (!templateName || !visualMappings) {
      return NextResponse.json(
        { error: 'Template name and visual mappings are required' },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    // Check if template exists
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('templates')
      .select('id')
      .eq('id', templateId)
      .single()

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Update template record
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        name: templateName,
        description: `Visual mapping template with ${visualMappings.length} connections`,
        excel_file_path: excelFilePath,
        word_file_path: wordFilePath,
        has_visual_mappings: true,
        mapping_metadata: {
          wordContent,
          totalMappings: visualMappings.length,
          updatedAt: new Date().toISOString()
        },
        premium_modules_used: [...new Set(
          visualMappings.map((m: any) => m.docxtemplaterModule)
        )],
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Template update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      )
    }

    // Delete existing mappings
    await supabase
      .from('visual_mappings')
      .delete()
      .eq('template_id', templateId)

    // Insert updated visual mappings
    if (visualMappings.length > 0) {
      const mappingRecords = visualMappings.map((mapping: any) => ({
        template_id: templateId,
        excel_column_name: mapping.excelColumn.name,
        excel_column_type: mapping.excelColumn.type,
        excel_sample_data: mapping.excelColumn.sampleData,
        word_selection_text: mapping.wordSelection.text,
        word_paragraph_id: mapping.wordSelection.paragraphId,
        word_selection_position: mapping.wordSelection.position,
        captured_styling: mapping.wordSelection.styling,
        mapping_type: mapping.mappingType,
        generated_variable_name: mapping.generatedVariableName,
        generated_syntax: mapping.generatedSyntax,
        docxtemplater_module: mapping.docxtemplaterModule,
        module_value: mapping.moduleValue,
        is_active: true
      }))

      const { error: mappingsError } = await supabase
        .from('visual_mappings')
        .insert(mappingRecords)

      if (mappingsError) {
        console.error('Visual mappings insert error:', mappingsError)
        return NextResponse.json(
          { error: 'Failed to update visual mappings' },
          { status: 500 }
        )
      }
    }

    // Calculate ROI statistics
    const roiStats = calculateROIStats(visualMappings)

    console.log(`Visual mapping template updated: ${templateId}`)
    console.log(`New ROI Stats:`, roiStats)

    return NextResponse.json({
      success: true,
      templateId,
      mappingsCount: visualMappings.length,
      roiStats,
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Template PUT endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error updating template' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const templateId = params.id
    const supabase = createServerSupabaseClient()

    // Check if template exists
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('templates')
      .select('id, name')
      .eq('id', templateId)
      .single()

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Delete visual mappings first (due to foreign key constraint)
    const { error: mappingsDeleteError } = await supabase
      .from('visual_mappings')
      .delete()
      .eq('template_id', templateId)

    if (mappingsDeleteError) {
      console.error('Mappings delete error:', mappingsDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete template mappings' },
        { status: 500 }
      )
    }

    // Delete template
    const { error: templateDeleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId)

    if (templateDeleteError) {
      console.error('Template delete error:', templateDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      )
    }

    // Note: Supabase Storage files are left intact for potential recovery
    // In production, you might want to add a cleanup job

    console.log(`Visual mapping template deleted: ${templateId} (${existingTemplate.name})`)

    return NextResponse.json({
      success: true,
      deletedTemplateId: templateId,
      deletedTemplateName: existingTemplate.name,
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Template DELETE endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error deleting template' },
      { status: 500 }
    )
  }
}

/**
 * Calculate ROI statistics for Premium Modules usage
 */
function calculateROIStats(mappings: any[]): {
  totalMappings: number
  moduleUsage: Record<string, number>
  totalROI: number
  roiPercentage: number
  averageROIPerMapping: number
} {
  const moduleUsage = mappings.reduce((acc, mapping) => {
    const module = mapping.docxtemplaterModule
    acc[module] = (acc[module] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalROI = mappings.reduce((sum, mapping) => {
    return sum + (mapping.moduleValue || 0)
  }, 0)

  const roiPercentage = Math.round((totalROI / 1250) * 100)

  return {
    totalMappings: mappings.length,
    moduleUsage,
    totalROI,
    roiPercentage,
    averageROIPerMapping: mappings.length > 0 ? Math.round(totalROI / mappings.length) : 0
  }
}