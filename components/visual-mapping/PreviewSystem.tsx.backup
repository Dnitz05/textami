// components/visual-mapping/PreviewSystem.tsx
// TEXTAMI PHASE 2 - SIMPLIFIED PREVIEW SYSTEM
// FOCUS: Basic preview functionality, no animations
// MAX: 200 lines - ESSENTIAL ONLY

"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Eye, Download, AlertCircle } from 'lucide-react'

interface PreviewSystemProps {
  templateId: string
  visualMappings: VisualMapping[]
  excelData: Record<string, any>[]
  onGenerate: (format: 'docx' | 'pdf') => Promise<void>
}

interface VisualMapping {
  id: string
  excelColumn: { name: string; type: string }
  wordSelection: { text: string; paragraphId: string; styling?: Record<string, string> }
  mappingType: 'text' | 'html' | 'image' | 'style'
  generatedVariableName: string
  generatedSyntax: string
  docxtemplaterModule: string
  moduleValue: number
}

interface PreviewData {
  variableName: string
  excelColumn: string
  sampleValue: any
  processedValue: any
  moduleType: string
}

export function PreviewSystem({ 
  templateId, 
  visualMappings, 
  excelData, 
  onGenerate 
}: PreviewSystemProps) {
  const [previewData, setPreviewData] = useState<PreviewData[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'docx' | 'pdf'>('docx')
  const [selectedRow, setSelectedRow] = useState(0)

  // Generate preview data when props change
  useEffect(() => {
    if (visualMappings.length > 0 && excelData.length > 0) {
      generatePreviewData()
    }
  }, [visualMappings, excelData, selectedRow])

  const generatePreviewData = () => {
    if (!excelData[selectedRow]) return

    const rowData = excelData[selectedRow]
    const preview: PreviewData[] = []

    visualMappings.forEach(mapping => {
      const sampleValue = rowData[mapping.excelColumn.name]
      const processedValue = processValueForPreview(
        sampleValue, 
        mapping.mappingType,
        mapping.wordSelection.styling
      )

      preview.push({
        variableName: mapping.generatedVariableName,
        excelColumn: mapping.excelColumn.name,
        sampleValue,
        processedValue,
        moduleType: mapping.docxtemplaterModule
      })
    })

    setPreviewData(preview)
  }

  const processValueForPreview = (
    value: any, 
    mappingType: string, 
    styling?: Record<string, string>
  ): string => {
    switch (mappingType) {
      case 'html':
        if (typeof value === 'string' && value.includes('<')) {
          return `[HTML] ${value.substring(0, 50)}...`
        }
        return `[HTML] ${String(value || '')}`
        
      case 'image':
        if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
          return `[IMAGE] ${value.substring(0, 40)}...`
        }
        return '[IMAGE] No image URL'
        
      case 'style':
        const styleString = styling ? buildStyleString(styling) : ''
        return `[STYLED] "${String(value || '')}" (${styleString})`
        
      default:
        return `[TEXT] ${String(value || '')}`
    }
  }

  const buildStyleString = (styling: Record<string, string>): string => {
    return Object.entries(styling)
      .map(([property, value]) => `${property}:${value}`)
      .join(';')
  }

  const handleGenerate = async (format: 'docx' | 'pdf') => {
    setIsGenerating(true)
    try {
      await onGenerate(format)
    } finally {
      setIsGenerating(false)
    }
  }

  const calculateTotalROI = (): number => {
    return visualMappings.reduce((sum, mapping) => sum + (mapping.moduleValue || 0), 0)
  }

  if (visualMappings.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No visual mappings created yet.</p>
          <p className="text-sm mt-1">Create mappings to see the preview.</p>
        </div>
      </Card>
    )
  }

  if (excelData.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No Excel data available.</p>
          <p className="text-sm mt-1">Upload an Excel file to see the preview.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Row Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Document Preview</h3>
          <div className="text-sm text-muted-foreground">
            Row {selectedRow + 1} of {excelData.length}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Preview Row:</label>
          <select 
            value={selectedRow}
            onChange={(e) => setSelectedRow(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {excelData.map((_, index) => (
              <option key={index} value={index}>
                Row {index + 1}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Preview Data */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Variable Mappings Preview</h4>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {previewData.map((data, index) => (
            <div key={index} className="border rounded p-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-600">{data.variableName}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    From Excel: {data.excelColumn}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {data.processedValue}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Module: {data.moduleType}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ROI Statistics */}
      <Card className="p-4">
        <h4 className="font-medium mb-2">Premium Modules ROI</h4>
        <div className="text-2xl font-bold text-green-600">
          €{calculateTotalROI()}
        </div>
        <p className="text-sm text-muted-foreground">
          {Math.round((calculateTotalROI() / 1250) * 100)}% of €1,250 investment utilized
        </p>
      </Card>

      {/* Generation Controls */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Generate Documents</h4>
        
        <div className="flex items-center space-x-4 mb-4">
          <label className="text-sm font-medium">Output Format:</label>
          <div className="flex space-x-2">
            <Button
              variant={selectedFormat === 'docx' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFormat('docx')}
            >
              DOCX
            </Button>
            <Button
              variant={selectedFormat === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFormat('pdf')}
            >
              PDF
            </Button>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            onClick={() => handleGenerate(selectedFormat)}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate {excelData.length} Document{excelData.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Will generate {excelData.length} {selectedFormat.toUpperCase()} document{excelData.length !== 1 ? 's' : ''} 
          using {visualMappings.length} visual mapping{visualMappings.length !== 1 ? 's' : ''}
        </p>
      </Card>
    </div>
  )
}