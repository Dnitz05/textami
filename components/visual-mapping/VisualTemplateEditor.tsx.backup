// components/visual-mapping/VisualTemplateEditor.tsx
// TEXTAMI VISUAL MAPPING SYSTEM - CORE EDITOR
// Adapted from dnitz05/TemplateEditor.tsx for Textami Premium Modules integration
// Maximizes €1,250 investment in HTML, Image, Style, XLSX modules

'use client'

import React, { useState, useEffect, useRef, MouseEvent } from 'react'
import { v4 as uuidv4 } from 'uuid'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { createBrowserSupabaseClient } from '@/lib/supabase/browserClient'
import { 
  calculatePromptPositions, 
  scrollToParagraph, 
  createPromptForParagraph,
  findParagraphElement
} from './utils/positionCalculator'

// TEXTAMI INTERFACES - adapted for Premium Modules
interface ExcelColumn {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean'
  sampleData: string[]
  isSelected: boolean
}

interface WordSelection {
  id: string
  text: string
  paragraphId: string
  position: { start: number; end: number; rect: DOMRect }
  styling?: CapturedStyling
}

interface CapturedStyling {
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  backgroundColor?: string
  textAlign?: string
  textDecoration?: string
  fontStyle?: string
}

interface VisualMapping {
  id: string
  excelColumn: ExcelColumn
  wordSelection: WordSelection
  mappingType: 'text' | 'html' | 'image' | 'style'
  generatedVariableName: string
  generatedSyntax: string
  docxtemplaterModule: 'text' | 'html' | 'image' | 'style'
  moduleValue: number // ROI tracking: 0=text, 250=html/image, 500=style
  isActive: boolean
}

interface VisualTemplateEditorProps {
  templateId: string
  mode: 'new' | 'edit'
  initialData?: any
}

// Premium Module values for ROI tracking
const PREMIUM_MODULE_VALUES = {
  text: 0,    // Base module (free)
  html: 250,  // HTML Module
  image: 250, // Image Module  
  style: 500  // Style Module
}

const VisualTemplateEditor: React.FC<VisualTemplateEditorProps> = ({ 
  templateId, 
  mode, 
  initialData 
}) => {
  // Core template state
  const [templateName, setTemplateName] = useState<string>(
    initialData?.name || 'Nova Plantilla Visual'
  )
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)

  // Excel state
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [excelFileName, setExcelFileName] = useState<string>('')
  const [excelFilePath, setExcelFilePath] = useState<string | null>(null)

  // Word state  
  const [wordContent, setWordContent] = useState<string>('')
  const [wordFileName, setWordFileName] = useState<string>('')
  const [wordFilePath, setWordFilePath] = useState<string | null>(null)
  const [hoveredParagraphId, setHoveredParagraphId] = useState<string | null>(null)

  // Visual mapping state
  const [visualMappings, setVisualMappings] = useState<VisualMapping[]>([])
  const [activeMapping, setActiveMapping] = useState<string | null>(null)

  // Refs
  const contentRef = useRef<HTMLDivElement>(null)
  const contentWrapperRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Initialize paragraph IDs in word content
  useEffect(() => {
    if (!contentRef.current || !wordContent) return
    
    const paragraphs = contentRef.current.querySelectorAll('p')
    let updated = false
    
    paragraphs.forEach(p => {
      if (!p.dataset.paragraphId) {
        p.dataset.paragraphId = `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        updated = true
      }
    })
    
    if (updated) {
      setWordContent(contentRef.current.innerHTML)
      setHasUnsavedChanges(true)
    }
  }, [wordContent])

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [visualMappings, templateName])

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Handle Excel file upload and processing
  const handleExcelUpload = async (file: File) => {
    try {
      setExcelFileName(file.name)
      
      // Show loading state
      toast.loading('Processant Excel...', { id: 'excel-upload' })

      // 1. Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', file)
      formData.append('templateId', templateId)

      const uploadResponse = await fetch('/api/visual-mapping/upload-excel', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Error pujant Excel')
      }

      const { filePath } = await uploadResponse.json()
      setExcelFilePath(filePath)

      // 2. Process Excel locally for immediate UI
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][]
          
          if (jsonData.length === 0) {
            throw new Error('Excel buit')
          }

          const headers = jsonData[0]
          const sampleRows = jsonData.slice(1, 6) // First 5 data rows

          const columns: ExcelColumn[] = headers.map((header, index) => ({
            id: `col-${index}`,
            name: header,
            type: detectColumnType(sampleRows.map(row => row[index])),
            sampleData: sampleRows.map(row => row[index] || '').filter(Boolean),
            isSelected: false
          }))

          setExcelColumns(columns)
          toast.success(`✅ Excel processat: ${columns.length} columnes trobades`, 
            { id: 'excel-upload' })

        } catch (error) {
          console.error('Error processant Excel:', error)
          toast.error('Error processant Excel', { id: 'excel-upload' })
        }
      }
      
      reader.readAsArrayBuffer(file)

    } catch (error) {
      console.error('Excel upload error:', error)
      toast.error('Error pujant Excel', { id: 'excel-upload' })
    }
  }

  // Detect Excel column data type
  const detectColumnType = (values: string[]): 'text' | 'number' | 'date' | 'boolean' => {
    const nonEmptyValues = values.filter(v => v && v.trim() !== '')
    if (nonEmptyValues.length === 0) return 'text'

    // Check if all values are numbers
    if (nonEmptyValues.every(v => !isNaN(Number(v)))) {
      return 'number'
    }

    // Check if all values are dates
    if (nonEmptyValues.every(v => !isNaN(Date.parse(v)))) {
      return 'date'
    }

    // Check if all values are boolean-like
    if (nonEmptyValues.every(v => 
      ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase())
    )) {
      return 'boolean'
    }

    return 'text'
  }

  // Handle Word file upload and processing  
  const handleWordUpload = async (file: File) => {
    try {
      setWordFileName(file.name)
      
      toast.loading('Processant Word...', { id: 'word-upload' })

      // Upload and convert to HTML
      const formData = new FormData()
      formData.append('file', file)
      formData.append('templateId', templateId)

      const response = await fetch('/api/visual-mapping/upload-word', {
        method: 'POST', 
        body: formData
      })

      if (!response.ok) {
        throw new Error('Error processant Word')
      }

      const { html, filePath } = await response.json()
      setWordContent(html)
      setWordFilePath(filePath)

      toast.success('✅ Word processat correctament', { id: 'word-upload' })

    } catch (error) {
      console.error('Word upload error:', error)
      toast.error('Error processant Word', { id: 'word-upload' })
    }
  }

  // Handle text selection in Word content
  const handleTextSelection = () => {
    if (!selectedColumn || !contentRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    if (!contentRef.current.contains(range.commonAncestorContainer)) {
      selection.removeAllRanges()
      setSelectedColumn(null)
      return
    }

    const selectedText = selection.toString().trim()
    if (!selectedText) {
      selection.removeAllRanges()
      return
    }

    // Find parent paragraph
    let parentParagraph = range.commonAncestorContainer
    while (parentParagraph && parentParagraph.nodeType !== Node.ELEMENT_NODE) {
      parentParagraph = parentParagraph.parentNode
    }
    while (parentParagraph && (parentParagraph as Element).tagName !== 'P') {
      parentParagraph = (parentParagraph as Element).parentElement
    }

    const paragraphId = parentParagraph 
      ? (parentParagraph as HTMLElement).dataset.paragraphId 
      : null

    if (!paragraphId) {
      toast.error('Error: No es pot identificar el paràgraf')
      selection.removeAllRanges()
      setSelectedColumn(null)
      return
    }

    // Capture styling for Style Module
    const element = range.commonAncestorContainer.parentElement || range.commonAncestorContainer as Element
    const styling = captureElementStyling(element as HTMLElement)

    // Determine mapping type based on content and styling
    const mappingType = determineMappingType(selectedText, styling)
    const selectedExcelColumn = excelColumns.find(col => col.id === selectedColumn)!

    // Create visual mapping
    const mapping: VisualMapping = {
      id: uuidv4(),
      excelColumn: selectedExcelColumn,
      wordSelection: {
        id: uuidv4(),
        text: selectedText,
        paragraphId,
        position: {
          start: range.startOffset,
          end: range.endOffset,
          rect: range.getBoundingClientRect()
        },
        styling
      },
      mappingType,
      generatedVariableName: generateVariableName(selectedExcelColumn.name),
      generatedSyntax: generateDocxtemplaterSyntax(
        generateVariableName(selectedExcelColumn.name), 
        mappingType, 
        styling
      ),
      docxtemplaterModule: mappingType,
      moduleValue: PREMIUM_MODULE_VALUES[mappingType],
      isActive: true
    }

    // Add mapping to state
    setVisualMappings(prev => [...prev, mapping])

    // Replace selected text with visual placeholder
    const span = document.createElement('span')
    span.className = `visual-mapping-placeholder mapping-${mappingType}`
    span.dataset.mappingId = mapping.id
    span.dataset.originalText = selectedText
    span.dataset.paragraphId = paragraphId
    span.textContent = mapping.generatedSyntax
    
    try {
      range.deleteContents()
      range.insertNode(span)
      setWordContent(contentRef.current.innerHTML)
      
      toast.success(`✅ Mapping creat: ${selectedExcelColumn.name} → ${selectedText}`)
    } catch (error) {
      console.error('Error creant mapping:', error)
      toast.error('Error creant mapping')
    } finally {
      selection.removeAllRanges()
      setSelectedColumn(null)
    }
  }

  // Capture CSS styling from element for Style Module
  const captureElementStyling = (element: HTMLElement): CapturedStyling => {
    const computedStyle = window.getComputedStyle(element)
    return {
      fontFamily: computedStyle.fontFamily,
      fontSize: computedStyle.fontSize,
      fontWeight: computedStyle.fontWeight,
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      textAlign: computedStyle.textAlign,
      textDecoration: computedStyle.textDecoration,
      fontStyle: computedStyle.fontStyle
    }
  }

  // Determine mapping type based on content and styling
  const determineMappingType = (text: string, styling: CapturedStyling): 'text' | 'html' | 'image' | 'style' => {
    // Check for image placeholder
    if (text.match(/\[IMAGE\]|\[IMG\]|\[PHOTO\]|\[PICTURE\]/gi)) {
      return 'image'
    }

    // Check for rich styling (Style Module)
    const hasRichStyling = styling.fontWeight !== 'normal' || 
                          styling.fontStyle !== 'normal' || 
                          styling.textDecoration !== 'none' ||
                          styling.color !== 'rgb(0, 0, 0)' ||
                          styling.backgroundColor !== 'rgba(0, 0, 0, 0)'

    if (hasRichStyling) {
      return 'style'
    }

    // Check for HTML content indicators
    if (text.includes('<') || text.includes('>') || text.length > 100) {
      return 'html'
    }

    return 'text'
  }

  // Generate variable name from Excel column
  const generateVariableName = (columnName: string): string => {
    return columnName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  // Generate Docxtemplater syntax based on type
  const generateDocxtemplaterSyntax = (
    variableName: string, 
    type: string, 
    styling?: CapturedStyling
  ): string => {
    switch (type) {
      case 'html':
        return `{~~${variableName}}`
      case 'image':
        return `{%${variableName}}`
      case 'style':
        const styleString = buildStyleString(styling)
        return `{${variableName}:style="${styleString}"}`
      default:
        return `{${variableName}}`
    }
  }

  // Build CSS style string from captured styling
  const buildStyleString = (styling?: CapturedStyling): string => {
    if (!styling) return ''
    
    const styles: string[] = []
    if (styling.fontFamily) styles.push(`font-family:${styling.fontFamily}`)
    if (styling.fontSize) styles.push(`font-size:${styling.fontSize}`)
    if (styling.fontWeight && styling.fontWeight !== 'normal') styles.push(`font-weight:${styling.fontWeight}`)
    if (styling.color) styles.push(`color:${styling.color}`)
    if (styling.backgroundColor && styling.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      styles.push(`background-color:${styling.backgroundColor}`)
    }
    if (styling.textAlign) styles.push(`text-align:${styling.textAlign}`)
    if (styling.textDecoration && styling.textDecoration !== 'none') {
      styles.push(`text-decoration:${styling.textDecoration}`)
    }
    if (styling.fontStyle && styling.fontStyle !== 'normal') styles.push(`font-style:${styling.fontStyle}`)
    
    return styles.join(';')
  }

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const fileType = event.target.dataset.fileType
    
    if (!file) return

    if (fileType === 'excel') {
      handleExcelUpload(file)
    } else if (fileType === 'word') {
      handleWordUpload(file)
    }

    // Reset input
    event.target.value = ''
  }

  // Handle mouse events for paragraph highlighting
  const handleMouseOver = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const paragraph = target.closest('p[data-paragraph-id]')
    if (paragraph) {
      setHoveredParagraphId((paragraph as HTMLElement).dataset.paragraphId!)
    }
  }

  const handleMouseLeave = () => {
    setHoveredParagraphId(null)
  }

  // Save visual mappings to database
  const saveTemplate = async () => {
    try {
      toast.loading('Desant plantilla...', { id: 'save-template' })

      const payload = {
        templateId,
        templateName,
        excelFilePath,
        wordFilePath,
        wordContent,
        visualMappings: visualMappings.map(mapping => ({
          excelColumn: mapping.excelColumn,
          wordSelection: mapping.wordSelection,
          mappingType: mapping.mappingType,
          generatedVariableName: mapping.generatedVariableName,
          generatedSyntax: mapping.generatedSyntax,
          docxtemplaterModule: mapping.docxtemplaterModule,
          moduleValue: mapping.moduleValue
        }))
      }

      const endpoint = mode === 'edit' 
        ? `/api/visual-mapping/templates/${templateId}`
        : '/api/visual-mapping/templates'

      const response = await fetch(endpoint, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Error desant plantilla')
      }

      const result = await response.json()
      setHasUnsavedChanges(false)
      
      // Calculate ROI summary for success message
      const totalROI = visualMappings.reduce((sum, m) => sum + m.moduleValue, 0)
      const roiPercentage = Math.round((totalROI / 1250) * 100)
      
      toast.success(
        `✅ Plantilla desada! ROI: €${totalROI} (${roiPercentage}% dels mòduls Premium)`,
        { id: 'save-template', duration: 5000 }
      )

    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error desant plantilla', { id: 'save-template' })
    }
  }

  // Calculate current ROI
  const currentROI = visualMappings.reduce((sum, mapping) => sum + mapping.moduleValue, 0)
  const roiPercentage = Math.round((currentROI / 1250) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header with template info and ROI tracking */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Title */}
            <div className="flex items-center">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="text-xl font-semibold text-gray-900 border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false)
                    }
                  }}
                />
              ) : (
                <h1 
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {templateName}
                </h1>
              )}
            </div>

            {/* ROI Display and Actions */}
            <div className="flex items-center space-x-4">
              {/* ROI Indicator */}
              <div className="flex items-center bg-gradient-to-r from-green-100 to-blue-100 rounded-lg px-4 py-2">
                <div className="text-sm font-medium text-gray-700">
                  ROI: €{currentROI} ({roiPercentage}%)
                </div>
                <div className="ml-2 w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min(roiPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveTemplate}
                disabled={!hasUnsavedChanges}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  hasUnsavedChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {hasUnsavedChanges ? 'Desar Canvis' : 'Desat'}
              </button>
            </div>
          </div>

          {/* File Status */}
          <div className="flex items-center space-x-6 pb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
              </svg>
              <span className="mr-2">Excel:</span>
              <span className={excelFileName ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {excelFileName || 'Cap fitxer'}
              </span>
              {excelColumns.length > 0 && (
                <span className="ml-1 text-gray-500">({excelColumns.length} columnes)</span>
              )}
            </div>

            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
              </svg>
              <span className="mr-2">Word:</span>
              <span className={wordFileName ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                {wordFileName || 'Cap fitxer'}
              </span>
            </div>

            <div className="flex items-center">
              <span className="mr-2">Mappings:</span>
              <span className="font-medium text-purple-600">
                {visualMappings.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Excel Columns */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    Columnes Excel
                  </h3>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.dataset.fileType = 'excel'
                        fileInputRef.current.accept = '.xlsx,.xls'
                        fileInputRef.current.click()
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Pujar Excel
                  </button>
                </div>
              </div>

              <div className="p-4">
                {excelColumns.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">
                      Puja un Excel per començar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedColumn && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 font-medium">
                          ✨ Columna seleccionada per mapping
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Selecciona text al document Word per crear la connexió
                        </p>
                      </div>
                    )}
                    
                    {excelColumns.map((column) => (
                      <button
                        key={column.id}
                        onClick={() => setSelectedColumn(
                          selectedColumn === column.id ? null : column.id
                        )}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedColumn === column.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {column.name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {column.type}
                            </p>
                          </div>
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            selectedColumn === column.id
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300'
                          }`} />
                        </div>
                        
                        {column.sampleData.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400 mb-1">Exemples:</p>
                            <div className="text-xs text-gray-600 space-y-0.5">
                              {column.sampleData.slice(0, 2).map((sample, idx) => (
                                <div key={idx} className="truncate">• {sample}</div>
                              ))}
                              {column.sampleData.length > 2 && (
                                <div className="text-gray-400">
                                  +{column.sampleData.length - 2} més...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center - Word Document */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900">
                    Document Word
                  </h3>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.dataset.fileType = 'word'
                        fileInputRef.current.accept = '.docx'
                        fileInputRef.current.click()
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Pujar Word
                  </button>
                </div>
              </div>

              {/* Word Content Area */}
              <div 
                ref={contentWrapperRef}
                className="p-8 min-h-[600px] bg-gray-50"
                style={{ 
                  backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px)',
                  backgroundSize: '1cm 1cm'
                }}
              >
                <div className="max-w-none bg-white shadow-lg rounded-lg overflow-hidden">
                  <div className="p-8 min-h-[29.7cm]">
                    {wordContent ? (
                      <div
                        ref={contentRef}
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: wordContent }}
                        onMouseUp={handleTextSelection}
                        onMouseMove={handleMouseOver}
                        onMouseLeave={handleMouseLeave}
                      />
                    ) : (
                      <div className="text-center py-20">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h4 className="mt-4 text-lg font-medium text-gray-900">
                          Puja un document Word
                        </h4>
                        <p className="mt-2 text-sm text-gray-500">
                          El document es convertirà automàticament per permetre la selecció visual
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Visual Mappings */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">
                  Mappings Visuals ({visualMappings.length})
                </h3>
              </div>

              <div className="p-4">
                {visualMappings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Cap mapping creat encara
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Selecciona una columna Excel i després text al Word
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visualMappings.map((mapping) => (
                      <div
                        key={mapping.id}
                        className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          activeMapping === mapping.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setActiveMapping(
                          activeMapping === mapping.id ? null : mapping.id
                        )}
                      >
                        {/* Mapping Type Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            mapping.mappingType === 'text' ? 'bg-blue-100 text-blue-800' :
                            mapping.mappingType === 'html' ? 'bg-orange-100 text-orange-800' :
                            mapping.mappingType === 'image' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {mapping.mappingType === 'text' ? '📝 Text' :
                             mapping.mappingType === 'html' ? '🎨 HTML' :
                             mapping.mappingType === 'image' ? '🖼️ Image' :
                             '🎭 Style'}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            €{mapping.moduleValue}
                          </span>
                        </div>

                        {/* Connection */}
                        <div className="space-y-2">
                          <div className="flex items-center text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="font-medium text-gray-700 truncate">
                              {mapping.excelColumn.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-center">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          </div>
                          
                          <div className="flex items-center text-xs">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-gray-600 truncate">
                              "{mapping.wordSelection.text}"
                            </span>
                          </div>
                        </div>

                        {/* Generated Syntax */}
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                          {mapping.generatedSyntax}
                        </div>

                        {/* Delete Button */}
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setVisualMappings(prev => 
                                prev.filter(m => m.id !== mapping.id)
                              )
                              if (activeMapping === mapping.id) {
                                setActiveMapping(null)
                              }
                              toast.success('Mapping eliminat')
                            }}
                            className="text-red-600 hover:text-red-700 text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Premium Modules Usage Summary */}
                {visualMappings.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Ús Mòduls Premium
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(PREMIUM_MODULE_VALUES).map(([module, value]) => {
                        const count = visualMappings.filter(m => m.docxtemplaterModule === module).length
                        if (count === 0) return null
                        
                        return (
                          <div key={module} className="flex items-center justify-between text-xs">
                            <span className="capitalize text-gray-700">
                              {module === 'text' ? '📝 Text (Base)' :
                               module === 'html' ? '🎨 HTML Module' :
                               module === 'image' ? '🖼️ Image Module' :
                               '🎭 Style Module'}
                            </span>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">{count}x</span>
                              <span className="font-medium text-gray-900">
                                €{value * count}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm font-medium">
                          <span className="text-gray-900">Total ROI:</span>
                          <span className="text-green-600">€{currentROI}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .visual-mapping-placeholder {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 4px;
          padding: 1px 4px;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .mapping-text {
          border-color: rgba(59, 130, 246, 0.3);
          background: rgba(59, 130, 246, 0.1);
        }
        
        .mapping-html {
          border-color: rgba(249, 115, 22, 0.3);
          background: rgba(249, 115, 22, 0.1);
        }
        
        .mapping-image {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.1);
        }
        
        .mapping-style {
          border-color: rgba(168, 85, 247, 0.3);
          background: rgba(168, 85, 247, 0.1);
        }
        
        .visual-mapping-placeholder:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}

export default VisualTemplateEditor