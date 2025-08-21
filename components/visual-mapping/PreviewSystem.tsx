// components/visual-mapping/PreviewSystem.tsx
// TEXTAMI PHASE 3 - CORE PREVIEW SYSTEM

"use client"

import React, { useState } from 'react'
import { Button, Card, CardHeader, CardContent, Alert } from '@/components/ui'

interface PreviewSystemProps {
  templateId: string
  visualMappings: any[]
  excelData?: any[]
}

interface GenerationResult {
  success: boolean
  fileUrl?: string
  filename: string
  format: string
  size: number
  statistics: {
    totalDocuments: number
    roiValue: number
    processingTime: number
  }
  error?: string
}

export function PreviewSystem({ templateId, visualMappings, excelData }: PreviewSystemProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [previewFormat, setPreviewFormat] = useState<'docx' | 'pdf'>('docx')

  // Calculate total ROI from mappings
  const totalROI = visualMappings.reduce((sum, mapping) => sum + (mapping.roi_value || 0), 0)
  const roiPercentage = ((totalROI / 1250) * 100).toFixed(1)

  // Handle document generation
  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/visual-mapping/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          outputFormat: previewFormat,
          visualMappings,
          excelData: excelData || []
        })
      })

      const result = await response.json()
      setGenerationResult(result)
    } catch (error) {
      setGenerationResult({
        success: false,
        filename: '',
        format: previewFormat,
        size: 0,
        statistics: { totalDocuments: 0, roiValue: totalROI, processingTime: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ROI Summary */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Generation Preview</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">€{totalROI}</div>
              <div className="text-sm text-gray-500">Premium Modules ROI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{roiPercentage}%</div>
              <div className="text-sm text-gray-500">Investment Utilized</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{visualMappings.length}</div>
              <div className="text-sm text-gray-500">Visual Mappings</div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Output Format:</label>
            <div className="flex gap-2">
              <Button
                variant={previewFormat === 'docx' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewFormat('docx')}
              >
                DOCX
              </Button>
              <Button
                variant={previewFormat === 'pdf' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewFormat('pdf')}
              >
                PDF
              </Button>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || visualMappings.length === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin mr-2">⚡</span>
                Generating Documents...
              </>
            ) : (
              `Generate ${excelData?.length || 1} Document(s)`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generation Results */}
      {generationResult && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Generation Results</h3>
          </CardHeader>
          <CardContent>
            {generationResult.success ? (
              <Alert variant="success">
                <div className="space-y-2">
                  <div className="font-medium">✅ Documents Generated Successfully!</div>
                  <div className="text-sm">
                    <p>Filename: {generationResult.filename}</p>
                    <p>Format: {generationResult.format.toUpperCase()}</p>
                    <p>Size: {(generationResult.size / 1024).toFixed(1)} KB</p>
                    <p>Processing Time: {generationResult.statistics.processingTime}ms</p>
                    <p>ROI Value: €{generationResult.statistics.roiValue}</p>
                  </div>
                  {generationResult.fileUrl && (
                    <Button 
                      onClick={() => window.open(generationResult.fileUrl, '_blank')}
                      className="mt-3"
                    >
                      Download Document
                    </Button>
                  )}
                </div>
              </Alert>
            ) : (
              <Alert variant="error">
                <div className="font-medium">❌ Generation Failed</div>
                <div className="text-sm mt-1">{generationResult.error}</div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mapping Summary */}
      {visualMappings.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Mappings Summary</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {visualMappings.map((mapping, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="text-sm">
                    <span className="font-medium">{mapping.excel_column}</span>
                    <span className="mx-2">→</span>
                    <span>"{mapping.word_selection?.text || 'Text'}"</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {mapping.mapping_type} • €{mapping.roi_value || 0}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t text-right">
              <div className="text-sm font-medium">
                Total ROI: €{totalROI} ({roiPercentage}% of €1,250 investment)
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {visualMappings.length === 0 && (
        <Alert variant="info">
          <div className="font-medium">No visual mappings created yet</div>
          <div className="text-sm mt-1">
            Create visual mappings by selecting Excel columns and Word text to enable document generation.
          </div>
        </Alert>
      )}
    </div>
  )
}