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
}

export default function VisualTemplateEditor({ templateId }: VisualTemplateEditorProps) {
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>([])
  const [wordContent, setWordContent] = useState<string>('')
  const [wordHtmlContent, setWordHtmlContent] = useState<string>('')
  const [visualMappings, setVisualMappings] = useState<VisualMapping[]>([])
  const [selectedColumn, setSelectedColumn] = useState<ExcelColumn | null>(null)
  const [selectedText, setSelectedText] = useState<WordSelection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mappingMode, setMappingMode] = useState(false)
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

  // Carregar i processar automàticament els fitxers del localStorage
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
        
        // Simular contingut del template per testing
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">
            <h1>Document de Prova</h1>
            <p>Estimat/da <strong>Nom del Client</strong>,</p>
            <p>Ens complau informar-vos que la vostra sol·licitud per al projecte <em>Nom del Projecte</em> 
            ha estat aprovada amb un pressupost de <strong>Quantitat</strong> euros.</p>
            <p>Data d'inici prevista: <strong>Data Inici</strong></p>
            <p>Data de finalització estimada: <strong>Data Fi</strong></p>
            <p>Atentament,<br>
            <strong>Nom Empresa</strong></p>
          </div>
        `
        setWordHtmlContent(htmlContent)
        setWordContent('Document de Prova\nEstimat/da Nom del Client,\nEns complau informar-vos que la vostra sol·licitud per al projecte Nom del Projecte ha estat aprovada amb un pressupost de Quantitat euros.\nData d\'inici prevista: Data Inici\nData de finalització estimada: Data Fi\nAtentament,\nNom Empresa')
        toast.success(`Template processat: ${templateData.fileName}`)
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
        
        // Simular columnes Excel per testing
        setExcelColumns([
          {
            column: 'A',
            header: 'Nom del Client',
            sample_data: ['Joan Garcia', 'Maria López', 'Pere Martí'],
            data_type: 'string'
          },
          {
            column: 'B',
            header: 'Nom del Projecte',
            sample_data: ['Web Corporativa', 'App Mobile', 'Sistema CRM'],
            data_type: 'string'
          },
          {
            column: 'C',
            header: 'Quantitat',
            sample_data: [5000, 7500, 12000],
            data_type: 'number'
          },
          {
            column: 'D',
            header: 'Data Inici',
            sample_data: ['2025-01-15', '2025-02-01', '2025-01-20'],
            data_type: 'date'
          },
          {
            column: 'E',
            header: 'Data Fi',
            sample_data: ['2025-03-15', '2025-04-01', '2025-03-20'],
            data_type: 'date'
          },
          {
            column: 'F',
            header: 'Nom Empresa',
            sample_data: ['TechSol SL', 'Innovate Corp', 'Digital Plus'],
            data_type: 'string'
          }
        ])
        toast.success(`Excel processat: ${excelData.fileName} (${excelData.rows} files)`)
      } catch (error) {
        console.error('Error loading excel:', error)
      }
    }
  }, [])


  // Generate Docxtemplater syntax based on mapping type
  const generateDocxSyntax = (column: string, type: string): string => {
    switch (type) {
      case 'html': return `{~~${column}}`
      case 'image': return `{%${column}}`
      case 'style': return `{${column}:style="..."}`
      default: return `{${column}}`
    }
  }




  // Remove mapping
  const removeMapping = useCallback((mappingId: string) => {
    setVisualMappings(prev => prev.filter(m => m.id !== mappingId))
  }, [])

  // Handle column selection for mapping
  const handleColumnSelect = useCallback((column: ExcelColumn) => {
    setSelectedColumn(column)
    setMappingMode(true)
    toast(`Selecciona text al document per associar amb "${column.header}"`, { icon: '👆' })
  }, [])

  // Handle text selection in Word document
  const handleTextSelection = useCallback(() => {
    if (!selectedColumn || !mappingMode) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = selection.toString().trim()
    
    if (!selectedText) {
      toast.error('Selecciona text vàlid')
      return
    }

    // Generate placeholder syntax
    const placeholder = `{${selectedColumn.column}}`
    
    // Create mapping
    const mapping: VisualMapping = {
      id: `mapping-${Date.now()}`,
      excel_column: selectedColumn.column,
      word_selection: {
        start: range.startOffset,
        end: range.endOffset,
        text: selectedText
      },
      mapping_type: 'text',
      docx_syntax: placeholder
    }

    // Replace selected text with placeholder in HTML
    const newHtml = wordHtmlContent.replace(selectedText, `<span class="placeholder" style="background-color: #e3f2fd; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${placeholder}</span>`)
    setWordHtmlContent(newHtml)

    // Add mapping
    setVisualMappings(prev => [...prev, mapping])
    
    // Reset selection state
    setSelectedColumn(null)
    setMappingMode(false)
    selection.removeAllRanges()
    
    toast.success(`Mapping creat: "${selectedText}" → ${placeholder}`)
  }, [selectedColumn, mappingMode, wordHtmlContent])

  // Handle Excel file upload
  const handleExcelUpload = useCallback(async (file: File) => {
    if (!file) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/visual-mapping/upload-excel', {
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
      
      const response = await fetch('/api/visual-mapping/upload-word', {
        method: 'POST', 
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to process Word file')
      }
      
      const data = await response.json()
      setWordContent(data.text || '')
      setWordHtmlContent(data.html || '')
      toast.success('Word template processed successfully')
      
    } catch (error) {
      console.error('Word upload error:', error)
      toast.error('Error processing Word file')
    } finally {
      setIsLoading(false)
    }
  }, [])


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
                <div className="text-sm text-gray-600 mb-3">
                  Click en una capçalera per començar el mapping:
                </div>
                {excelColumns.map((column) => (
                  <div
                    key={column.column}
                    onClick={() => handleColumnSelect(column)}
                    className={`p-3 border rounded cursor-pointer transition-all ${
                      selectedColumn?.column === column.column
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                        : 'hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-blue-700">{column.header}</div>
                    <div className="text-xs text-gray-500">
                      Columna {column.column} • {column.data_type}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Mostra: {column.sample_data.slice(0, 2).join(', ')}
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
            ) : fileInfo.template && !wordHtmlContent ? (
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
              <div className="space-y-3">
                {mappingMode && selectedColumn && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="text-sm font-medium text-blue-800">
                      Selecciona text per associar amb: "{selectedColumn.header}"
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Selecciona text al document i després fes click al botó "Crear Mapping"
                    </div>
                    <button
                      onClick={handleTextSelection}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Crear Mapping
                    </button>
                    <button
                      onClick={() => {
                        setMappingMode(false)
                        setSelectedColumn(null)
                      }}
                      className="mt-2 ml-2 px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel·lar
                    </button>
                  </div>
                )}
                <div 
                  className="border rounded p-4 bg-white max-h-96 overflow-y-auto"
                  style={{ userSelect: 'text' }}
                >
                  {wordHtmlContent ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: wordHtmlContent }}
                    />
                  ) : (
                    <div className="text-gray-500 italic">
                      El contingut del document apareixerà aquí...
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Current Mappings */}
      {visualMappings.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Placeholders Generats</h3>
            <p className="text-sm text-gray-600">
              Associacions entre columnes Excel i text del document
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visualMappings.map((mapping) => (
                <div key={mapping.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-mono rounded">
                          {mapping.docx_syntax}
                        </span>
                        <span className="text-xs text-gray-500">placeholder generat</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-blue-700">
                          {excelColumns.find(col => col.column === mapping.excel_column)?.header}
                        </span>
                        <span className="text-gray-500 mx-2">→</span>
                        <span className="bg-yellow-100 px-1 rounded">
                          "{mapping.word_selection.text}"
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Columna {mapping.excel_column} • Type: {mapping.mapping_type}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMapping(mapping.id)}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1 hover:bg-red-50 rounded"
                    >
                      Eliminar
                    </button>
                  </div>
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