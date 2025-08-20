// app/api/visual-mapping/templates/route.ts
// TEXTAMI VISUAL MAPPING API - Templates Management
// Create and retrieve visual mapping templates with Premium Modules ROI tracking

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/serverClient'

// Premium Module values for ROI calculation
const PREMIUM_MODULE_VALUES = {
  text: 0,    // Base module (free)
  html: 250,  // HTML Module
  image: 250, // Image Module
  style: 500  // Style Module
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      templateId,
      templateName,
      excelFilePath,
      wordFilePath,
      wordContent,
      visualMappings
    } = body

    if (!templateId || !templateName || !visualMappings) {
      return NextResponse.json(
        { error: 'Template ID, name, and visual mappings are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Start transaction
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .upsert({
        id: templateId,
        name: templateName,
        description: `Visual mapping template with ${visualMappings.length} connections`,
        excel_file_path: excelFilePath,
        word_file_path: wordFilePath,
        has_visual_mappings: true,
        mapping_metadata: {
          wordContent,
          totalMappings: visualMappings.length,
          createdAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (templateError) {
      console.error('Template upsert error:', templateError)
      return NextResponse.json(
        { error: 'Failed to create/update template' },
        { status: 500 }
      )
    }

    // Delete existing mappings for this template (if updating)
    await supabase
      .from('visual_mappings')
      .delete()
      .eq('template_id', templateId)

    // Insert new visual mappings
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
        { error: 'Failed to save visual mappings' },
        { status: 500 }
      )
    }

    // Calculate ROI statistics
    const roiStats = calculateROIStats(visualMappings)

    // Update template with premium modules usage
    const premiumModules = [...new Set(
      visualMappings.map((m: any) => m.docxtemplaterModule)
    )]

    await supabase
      .from('templates')
      .update({
        premium_modules_used: premiumModules
      })
      .eq('id', templateId)

    // Log successful creation for analytics
    console.log(`Visual mapping template created: ${templateId}`)
    console.log(`ROI Stats:`, roiStats)

    return NextResponse.json({
      success: true,
      template,
      mappingsCount: visualMappings.length,
      roiStats,
      premiumModulesUsed: premiumModules,
      createdAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Templates POST endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error creating template' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    const supabase = await createServerSupabaseClient()

    if (templateId) {
      // Get specific template with mappings
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .eq('has_visual_mappings', true)
        .single()

      if (templateError || !template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      const { data: mappings, error: mappingsError } = await supabase
        .from('visual_mappings')
        .select('*')
        .eq('template_id', templateId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (mappingsError) {
        console.error('Mappings fetch error:', mappingsError)
        return NextResponse.json(
          { error: 'Failed to fetch template mappings' },
          { status: 500 }
        )
      }

      const roiStats = calculateROIStats(mappings)

      return NextResponse.json({
        success: true,
        template: {
          ...template,
          visualMappings: mappings,
          roiStats
        }
      })

    } else {
      // Get all visual mapping templates
      const { data: templates, error: templatesError } = await supabase
        .from('templates')
        .select(`
          *,
          visual_mappings!inner(
            count
          )
        `)
        .eq('has_visual_mappings', true)
        .order('updated_at', { ascending: false })

      if (templatesError) {
        console.error('Templates fetch error:', templatesError)
        return NextResponse.json(
          { error: 'Failed to fetch templates' },
          { status: 500 }
        )
      }

      // Add ROI stats for each template
      const templatesWithStats = await Promise.all(
        templates.map(async (template) => {
          const { data: mappings } = await supabase
            .from('visual_mappings')
            .select('docxtemplater_module, module_value')
            .eq('template_id', template.id)
            .eq('is_active', true)

          const roiStats = calculateROIStats(mappings || [])

          return {
            ...template,
            roiStats
          }
        })
      )

      return NextResponse.json({
        success: true,
        templates: templatesWithStats,
        totalTemplates: templates.length
      })
    }

  } catch (error) {
    console.error('Templates GET endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error fetching templates' },
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
    const module = mapping.docxtemplaterModule || mapping.docxtemplater_module
    acc[module] = (acc[module] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalROI = mappings.reduce((sum, mapping) => {
    const moduleValue = mapping.moduleValue || mapping.module_value || 0
    return sum + moduleValue
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