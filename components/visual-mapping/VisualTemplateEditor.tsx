// components/visual-mapping/VisualTemplateEditor.tsx
// TEXTAMI PHASE 3 - CORE VISUAL MAPPING SYSTEM

"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Card, CardHeader, CardContent, Alert } from '@/components/ui'
import { ArrowUpTrayIcon as Upload } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface VisualTemplateEditorProps {
  templateId?: string
}

interface ExcelColumn {
  column: string
  header: string
  sample_data: any[]
  data_type: 'string' | 'number' | 'date' | 'boolean'
}

interface WordSelection {
  start: number
  end: number
  text: string
}

interface VisualMapping {
  id: string
  excel_column: string
  word_selection: WordSelection
  mapping_type: 'text' | 'html' | 'image' | 'style'
  docx_syntax: string
  roi_value: number
}

export default function VisualTemplateEditor({ templateId }: VisualTemplateEditorProps) {
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>([])
  const [wordContent, setWordContent] = useState<string>('')
  const [visualMappings, setVisualMappings] = useState<VisualMapping[]>([])
  const [selectedColumn, setSelectedColumn] = useState<ExcelColumn | null>(null)
  const [selectedText, setSelectedText] = useState<WordSelection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState<{
    template: { fileName: string; size: number } | null;
    excel: { fileName: string; size: number; rows: number } | null;
  }>({
    template: null,
    excel: null
  })
  
  // File input refs
  const excelInputRef = useRef<HTMLInputElement>(null)
  const wordInputRef = useRef<HTMLInputElement>(null)

  // Carregar informació dels fitxers del localStorage
  useEffect(() => {
    const savedTemplate = localStorage.getItem('textami_template')
    const savedExcel = localStorage.getItem('textami_excel')
    
    if (savedTemplate) {
      try {
        const templateData = JSON.parse(savedTemplate)
        setFileInfo(prev => ({ 
          ...prev, 
          template: { fileName: templateData.fileName, size: templateData.size }
        }))
        
        // Auto-processar el fitxer template si existeix
        toast.success(`Template carregat: ${templateData.fileName}`)
      } catch (error) {
        console.error('Error loading template:', error)
      }
    }
    
    if (savedExcel) {
      try {
        const excelData = JSON.parse(savedExcel)
        setFileInfo(prev => ({ 
          ...prev, 
          excel: { 
            fileName: excelData.fileName, 
            size: excelData.size, 
            rows: excelData.rows 
          }
        }))
        
        // Auto-processar el fitxer excel si existeix
        toast.success(`Excel carregat: ${excelData.fileName} (${excelData.rows} files)`)
      } catch (error) {
        console.error('Error loading excel:', error)
      }
    }
  }, [])

  // ROI calculation based on mapping type
  const calculateROI = (mappingType: string): number => {
    const roiValues = { text: 0, html: 250, image: 250, style: 500 }
    return roiValues[mappingType as keyof typeof roiValues] || 0
  }

  // Generate Docxtemplater syntax based on mapping type
  const generateDocxSyntax = (column: string, type: string): string => {
    switch (type) {
      case 'html': return `{~~${column}}`
      case 'image': return `{%${column}}`
      case 'style': return `{${column}:style="..."}`
      default: return `{${column}}`
    }
  }

  // Handle Excel column selection
  const handleColumnSelect = useCallback((column: ExcelColumn) => {
    setSelectedColumn(column)
  }, [])

  // Handle Word text selection (simplified simulation)
  const handleTextSelect = useCallback((text: string) => {
    const start = wordContent.indexOf(text)
    if (start !== -1) {
      setSelectedText({
        start,
        end: start + text.length,
        text
      })
    }
  }, [wordContent])

  // Create visual mapping
  const createMapping = useCallback((mappingType: 'text' | 'html' | 'image' | 'style') => {
    if (!selectedColumn || !selectedText) return

    const mapping: VisualMapping = {
      id: `mapping-${Date.now()}`,
      excel_column: selectedColumn.column,
      word_selection: selectedText,
      mapping_type: mappingType,
      docx_syntax: generateDocxSyntax(selectedColumn.column, mappingType),
      roi_value: calculateROI(mappingType)
    }

    setVisualMappings(prev => [...prev, mapping])
    setSelectedColumn(null)
    setSelectedText(null)
  }, [selectedColumn, selectedText])

  // Remove mapping
  const removeMapping = useCallback((mappingId: string) => {
    setVisualMappings(prev => prev.filter(m => m.id !== mappingId))
  }, [])

  // Handle Excel file upload
  const handleExcelUpload = useCallback(async (file: File) => {
    if (!file) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload/excel', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to process Excel file')
      }
      
      const data = await response.json()
      setExcelColumns(data.columns || [])
      toast.success(`Excel file processed: ${data.columns?.length || 0} columns found`)
      
    } catch (error) {
      console.error('Excel upload error:', error)
      toast.error('Error processing Excel file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle Word file upload  
  const handleWordUpload = useCallback(async (file: File) => {
    if (!file) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload/template', {
        method: 'POST', 
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to process Word file')
      }
      
      const data = await response.json()
      setWordContent(data.content || '')
      toast.success('Word template processed successfully')
      
    } catch (error) {
      console.error('Word upload error:', error)
      toast.error('Error processing Word file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calculate total ROI
  const totalROI = visualMappings.reduce((sum, mapping) => sum + mapping.roi_value, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Hidden file inputs */}
      <input 
        type="file" 
        ref={excelInputRef}
        className="hidden"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleExcelUpload(file)
          e.target.value = '' // Reset
        }}
      />
      <input 
        type="file" 
        ref={wordInputRef}
        className="hidden"
        accept=".docx"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleWordUpload(file)
          e.target.value = '' // Reset
        }}
      />

      <CardHeader>
        <h1 className="text-2xl font-bold">Visual Template Editor</h1>
        <p className="text-gray-600">Template ID: {templateId || 'New Template'}</p>
      </CardHeader>

      {/* ROI Display */}
      <Alert variant="info" className="mb-6">
        <div className="flex justify-between items-center">
          <span>Premium Modules ROI: €{totalROI} of €1,250 invested</span>
          <span className="font-bold">
            {totalROI > 0 ? `${((totalROI / 1250) * 100).toFixed(1)}% utilized` : '0% utilized'}
          </span>
        </div>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Excel Columns Panel */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Excel Columns</h2>
          </CardHeader>
          <CardContent>
            {!fileInfo.excel ? (
              <div className="text-center py-8 text-gray-500">
                <p>Upload an Excel file to see columns</p>
                <Button 
                  onClick={() => excelInputRef.current?.click()}
                  disabled={isLoading}
                  className="mt-4"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isLoading ? 'Processing...' : 'Upload Excel File'}
                </Button>
              </div>
            ) : fileInfo.excel && excelColumns.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-sm mb-2">
                  ✅ {fileInfo.excel.fileName}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {Math.round(fileInfo.excel.size / 1024)} KB • {fileInfo.excel.rows} files
                </div>
                <Button 
                  onClick={() => excelInputRef.current?.click()}
                  disabled={isLoading}
                  className="mt-2"
                  variant="secondary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Process Excel Columns
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {excelColumns.map((column) => (
                  <div
                    key={column.column}
                    onClick={() => handleColumnSelect(column)}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedColumn?.column === column.column
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{column.column}: {column.header}</div>
                    <div className="text-sm text-gray-500">
                      Type: {column.data_type} • Sample: {column.sample_data.slice(0, 2).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Word Content Panel */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Word Template</h2>
          </CardHeader>
          <CardContent>
            {!fileInfo.template ? (
              <div className="text-center py-8 text-gray-500">
                <p>Upload a Word template to see content</p>
                <Button 
                  onClick={() => wordInputRef.current?.click()}
                  disabled={isLoading}
                  className="mt-4"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isLoading ? 'Processing...' : 'Upload Word Template'}
                </Button>
              </div>
            ) : fileInfo.template && !wordContent ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-sm mb-2">
                  ✅ {fileInfo.template.fileName}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {Math.round(fileInfo.template.size / 1024)} KB
                </div>
                <Button 
                  onClick={() => wordInputRef.current?.click()}
                  disabled={isLoading}
                  className="mt-2"
                  variant="secondary"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Process Word Content
                </Button>
              </div>
            ) : (
              <div className="border rounded p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {wordContent.split('\n').map((line, idx) => (
                    <div key={idx} className="mb-1">
                      {line.split(' ').map((word, wordIdx) => (
                        <span
                          key={wordIdx}
                          onClick={() => handleTextSelect(word)}
                          className={`cursor-pointer hover:bg-yellow-200 px-1 ${
                            selectedText?.text === word ? 'bg-yellow-300' : ''
                          }`}
                        >
                          {word}{' '}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mapping Controls */}
      {selectedColumn && selectedText && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Create Visual Mapping</h3>
            <p className="text-sm text-gray-600">
              Column "{selectedColumn.column}" → Text "{selectedText.text}"
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                onClick={() => createMapping('text')}
                variant="secondary"
              >
                Text Mapping (€0)
              </Button>
              <Button 
                onClick={() => createMapping('html')}
                variant="primary"
              >
                HTML Mapping (€250)
              </Button>
              <Button 
                onClick={() => createMapping('image')}
                variant="primary"
              >
                Image Mapping (€250)
              </Button>
              <Button 
                onClick={() => createMapping('style')}
                variant="primary"
              >
                Style Mapping (€500)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Mappings */}
      {visualMappings.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Visual Mappings</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visualMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">
                      {mapping.excel_column} → "{mapping.word_selection.text}"
                    </div>
                    <div className="text-sm text-gray-600">
                      Type: {mapping.mapping_type} • Syntax: {mapping.docx_syntax} • ROI: €{mapping.roi_value}
                    </div>
                  </div>
                  <Button
                    onClick={() => removeMapping(mapping.id)}
                    variant="danger"
                    size="sm"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Documents */}
      {visualMappings.length > 0 && (
        <div className="mt-6 flex justify-end">
          <Button 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Documents'}
          </Button>
        </div>
      )}
    </div>
  )
}