// components/visual-mapping/PremiumVisualEditor.tsx
// TEXTAMI PREMIUM VISUAL MAPPING SYSTEM - Phase 2
// Professional visual mapping with Premium Modules intelligence (€1,250)

"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Card, CardHeader, CardContent, Alert } from '@/components/ui'
import { ArrowUpTrayIcon as Upload } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

// Import Premium Modules system
import {
  premiumContentAnalyzer,
  intelligentModuleSelector,
  premiumMappingEngine,
  premiumModulesConfig,
  type ExcelColumnAnalysis,
  type PremiumMapping,
  type PremiumModuleType,
  type MappingCreationOptions
} from '@/lib/premium-modules'

// Import Professional UX components (Phase 2)
import ProfessionalSidebar from './ProfessionalSidebar'

interface PremiumVisualEditorProps {
  templateId?: string
}

interface ProcessedExcelData {
  columns: ExcelColumnAnalysis[]
  metadata: {
    fileName: string
    size: number
    rows: number
    totalColumns: number
    premiumOpportunities: number
  }
}

interface ProcessedWordData {
  htmlContent: string
  plainContent: string
  metadata: {
    fileName: string
    size: number
    paragraphCount: number
    complexityLevel: 'simple' | 'moderate' | 'advanced'
    premiumOpportunities: number
  }
}

export default function PremiumVisualEditor({ templateId }: PremiumVisualEditorProps) {
  // Core state
  const [excelData, setExcelData] = useState<ProcessedExcelData | null>(null)
  const [wordData, setWordData] = useState<ProcessedWordData | null>(null)
  const [premiumMappings, setPremiumMappings] = useState<PremiumMapping[]>([])
  
  // Selection state
  const [selectedColumn, setSelectedColumn] = useState<ExcelColumnAnalysis | null>(null)
  const [selectedText, setSelectedText] = useState<{
    start: number
    end: number
    text: string
    paragraphId: string
    elementType?: string
    isTableCell?: boolean
    isHeader?: boolean
    fullElementText?: string
  } | null>(null)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [mappingMode, setMappingMode] = useState(false)
  const [showPremiumInsights, setShowPremiumInsights] = useState(false)
  const [premiumModulesReady, setPremiumModulesReady] = useState(false)
  
  // File input refs
  const excelInputRef = useRef<HTMLInputElement>(null)
  const wordInputRef = useRef<HTMLInputElement>(null)
  const documentViewerRef = useRef<HTMLDivElement>(null)

  // Initialize Premium Modules on component mount
  useEffect(() => {
    initializePremiumSystem()
  }, [])

  // Load files from localStorage automatically ONLY after Premium Modules are ready
  useEffect(() => {
    if (premiumModulesReady) {
      loadSavedFiles()
    }
  }, [premiumModulesReady])

  /**
   * Initialize Premium Modules system
   * TRANSPARENT to user - they never see this initialization
   */
  const initializePremiumSystem = async () => {
    try {
      console.log('🚀 Initializing Premium Modules system...')
      setIsLoading(true)
      
      await premiumModulesConfig.initializePremiumModules({
        enableHTML: true,    // €250 - Rich content processing
        enableImage: true,   // €250 - Dynamic image processing
        enableStyling: true, // €500 - Premium visual control
        enableXLSX: false    // €250 - Not needed for this workflow
      })
      
      setPremiumModulesReady(true)
      console.log('✅ Premium Modules system ready - €1,000 technology active')
      toast.success('Sistema Premium activat correctament')
    } catch (error) {
      console.error('❌ Premium Modules initialization failed:', error)
      setPremiumModulesReady(false)
      toast.error('Sistema avançat no disponible, utilitzant mode bàsic')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Load saved files from localStorage and process with Premium intelligence
   */
  const loadSavedFiles = async () => {
    const savedTemplate = localStorage.getItem('textami_template')
    const savedExcel = localStorage.getItem('textami_excel')
    
    if (savedTemplate) {
      try {
        console.log('📄 Loading saved Word template from localStorage...')
        const templateData = JSON.parse(savedTemplate)
        console.log('🔍 Template data structure:', {
          hasBase64: !!templateData.base64,
          fileName: templateData.fileName,
          size: templateData.size,
          base64Length: templateData.base64 ? templateData.base64.length : 0,
          base64Preview: templateData.base64 ? templateData.base64.substring(0, 50) + '...' : 'none'
        })
        
        if (templateData.base64) {
          await processWordFileWithPremiumIntelligence(templateData.base64, templateData.fileName, templateData.size)
        } else {
          console.error('❌ No base64 data in saved template')
          toast.error('Document Word corromput al localStorage')
        }
      } catch (error) {
        console.error('❌ Error loading template:', error)
        toast.error('Error carregant plantilla Word')
      }
    }
    
    if (savedExcel) {
      try {
        const excelData = JSON.parse(savedExcel)
        if (excelData.base64) {
          await processExcelFileWithPremiumIntelligence(excelData.base64, excelData.fileName, excelData.size)
        }
      } catch (error) {
        console.error('Error loading Excel:', error)
        toast.error('Error carregant fitxer Excel')
      }
    }
  }

  /**
   * Process Word file with Premium Module analysis
   * ANALYZES content for optimal Premium Module usage
   */
  const processWordFileWithPremiumIntelligence = async (
    base64Data: string, 
    fileName: string, 
    size: number
  ) => {
    setIsLoading(true)
    
    try {
      // Convert base64 to HTML (simplified - would use proper conversion in production)
      const htmlContent = await convertWordToHTML(base64Data)
      const plainContent = stripHTMLTags(htmlContent)
      
      // PREMIUM ANALYSIS: Analyze document with Premium Module intelligence
      const documentAnalysis = premiumContentAnalyzer.analyzeWordDocument(htmlContent)
      
      const processedWordData: ProcessedWordData = {
        htmlContent,
        plainContent,
        metadata: {
          fileName,
          size,
          paragraphCount: documentAnalysis.paragraphStructure.size,
          complexityLevel: documentAnalysis.overallComplexity,
          premiumOpportunities: documentAnalysis.premiumOpportunities.length
        }
      }
      
      setWordData(processedWordData)
      
      // Show premium insights to developer (not visible to user)
      console.log('📄 Word Document Analysis:', {
        complexity: documentAnalysis.overallComplexity,
        premiumOpportunities: documentAnalysis.premiumOpportunities.length,
        estimatedValue: documentAnalysis.estimatedModuleValue
      })
      
      toast.success(`Document processat: ${documentAnalysis.premiumOpportunities.length} oportunitats Premium detectades`)
      
    } catch (error) {
      console.error('Error processing Word file:', error)
      toast.error('Error processant document Word')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Process Excel file with Premium Module analysis  
   * ANALYZES columns for optimal Premium Module usage
   */
  const processExcelFileWithPremiumIntelligence = async (
    base64Data: string,
    fileName: string, 
    size: number
  ) => {
    setIsLoading(true)
    
    try {
      // Convert base64 to file and process with Excel API
      const blob = await base64ToBlob(base64Data)
      const formData = new FormData()
      formData.append('file', blob, fileName)
      
      const response = await fetch('/api/upload/excel', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Excel processing failed')
      }
      
      const excelResult = await response.json()
      
      // PREMIUM ANALYSIS: Analyze each Excel column with Premium intelligence
      const analyzedColumns: ExcelColumnAnalysis[] = excelResult.columns.map((column: any) => {
        return premiumContentAnalyzer.analyzeExcelColumn(column)
      })
      
      // Count Premium opportunities
      const premiumOpportunities = analyzedColumns.reduce((count, column) => {
        return count + (column.suggestedModule !== 'text' ? 1 : 0)
      }, 0)
      
      const processedExcelData: ProcessedExcelData = {
        columns: analyzedColumns,
        metadata: {
          fileName,
          size,
          rows: excelResult.total_rows,
          totalColumns: analyzedColumns.length,
          premiumOpportunities
        }
      }
      
      setExcelData(processedExcelData)
      
      // Show premium insights to developer (not visible to user)
      console.log('📊 Excel Analysis:', {
        totalColumns: analyzedColumns.length,
        premiumOpportunities,
        suggestedModules: analyzedColumns.map(col => col.suggestedModule)
      })
      
      toast.success(`Excel processat: ${premiumOpportunities} columnes amb oportunitats Premium`)
      
    } catch (error) {
      console.error('Error processing Excel file:', error)
      toast.error('Error processant fitxer Excel')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle Excel column selection
   * PREPARES column for Premium Module mapping
   */
  const handleColumnSelect = useCallback((column: ExcelColumnAnalysis) => {
    setSelectedColumn(column)
    setMappingMode(true)
    
    // Show Premium Module suggestion to developer (invisible to user)
    console.log('🎯 Column selected:', {
      column: column.column,
      suggestedModule: column.suggestedModule,
      confidenceScore: column.confidenceScore,
      estimatedTimesSaved: column.estimatedTimesSaved
    })
    
    toast(`Columna seleccionada: ${column.header}`, {
      icon: column.suggestedModule === 'text' ? '📝' : '⭐'
    })
  }, [])

  /**
   * Handle Word text selection
   * FASE 3: Enhanced with table and formatting support
   * CREATES Premium mapping automatically when both Excel and Word are selected
   */
  const handleTextSelection = useCallback((selection: {
    start: number
    end: number
    text: string
    paragraphId: string
    elementType?: string
    isTableCell?: boolean
    isHeader?: boolean
    fullElementText?: string
  }) => {
    
    if (!selectedColumn) {
      toast.error('Selecciona primer una columna Excel')
      return
    }
    
    setSelectedText(selection)
    
    // FASE 3: Enhanced automatic Premium mapping with element type awareness
    console.log('📝 Text selection details:', {
      text: selection.text,
      elementType: selection.elementType,
      isTableCell: selection.isTableCell,
      isHeader: selection.isHeader,
      paragraphId: selection.paragraphId
    })
    
    createPremiumMapping(selectedColumn, selection)
    
  }, [selectedColumn])

  /**
   * Creates Premium mapping with intelligent module selection
   * TRANSPARENT AND AUTOMATIC - User just sees perfect mapping created
   */
  const createPremiumMapping = useCallback(async (
    excelColumn: ExcelColumnAnalysis,
    wordSelection: {
      start: number
      end: number  
      text: string
      paragraphId: string
      elementType?: string
      isTableCell?: boolean
      isHeader?: boolean
      fullElementText?: string
    }
  ) => {
    
    try {
      // FASE 3: CREATE PREMIUM MAPPING with enhanced context awareness
      const mappingContext: MappingCreationOptions = {
        documentType: wordSelection.isTableCell ? 'report' : 'generic',
        qualityMode: 'maximum', // Always use maximum quality in Fase 3
        consistencyOptimization: true
      }
      
      const premiumMapping = premiumMappingEngine.createIntelligentMapping(
        excelColumn,
        wordSelection,
        mappingContext
      )
      
      // Add to mappings list
      setPremiumMappings(prev => [...prev, premiumMapping])
      
      // Reset selection state
      setSelectedColumn(null)
      setSelectedText(null)
      setMappingMode(false)
      
      // FASE 3: Enhanced success message with context awareness
      const moduleInfo: Record<PremiumModuleType, string> = {
        'html': wordSelection.isTableCell ? '📊 Cel·la de taula avançada' : '🌐 Contingut rich',
        'image': '🖼️ Imatge dinàmica', 
        'style': wordSelection.isHeader ? '📑 Capçalera amb estil' : '🎨 Format professional',
        'xlsx': '📊 Excel dinàmic',
        'text': wordSelection.isTableCell ? '📝 Text de taula' : '📝 Text simple'
      }
      
      const contextInfo = wordSelection.isTableCell ? ' (Taula)' : wordSelection.isHeader ? ' (Capçalera)' : ''
      
      toast.success(
        `Mapping creat: ${moduleInfo[premiumMapping.selected_premium_module]}${contextInfo} • Qualitat: ${premiumMapping.quality_score}/10`,
        { duration: 4000 }
      )
      
      // Developer insights (not visible to user)
      console.log('✨ Premium mapping created:', {
        module: premiumMapping.selected_premium_module,
        syntax: premiumMapping.generated_syntax,
        qualityScore: premiumMapping.quality_score,
        performanceBenefit: premiumMapping.performance_benefit,
        reasoning: premiumMapping.module_selection_result.reasoning
      })
      
    } catch (error) {
      console.error('Error creating premium mapping:', error)
      toast.error('Error creant mapping')
    }
  }, [])

  // Professional Sidebar handlers (Phase 2)

  const handleCreateMappingFromSidebar = useCallback((excelColumn: ExcelColumnAnalysis, paragraphId: string) => {
    // Find the paragraph text by ID
    const paragraphElement = documentViewerRef.current?.querySelector(`[data-paragraph-id="${paragraphId}"]`)
    if (!paragraphElement) return

    const paragraphText = paragraphElement.textContent || ''
    
    // Create a word selection object
    const wordSelection = {
      start: 0,
      end: paragraphText.length,
      text: paragraphText,
      paragraphId
    }

    // Set selection state and create mapping
    setSelectedColumn(excelColumn)
    setSelectedText(wordSelection)
    createPremiumMapping(excelColumn, wordSelection)
  }, [])

  const handleUpdateMapping = useCallback((mappingId: string, updates: Partial<PremiumMapping>) => {
    setPremiumMappings(prev => 
      prev.map(mapping => 
        mapping.id === mappingId 
          ? { ...mapping, ...updates }
          : mapping
      )
    )
    toast.success('Mapping actualitzat')
  }, [])

  const handleDeleteMapping = useCallback((mappingId: string) => {
    setPremiumMappings(prev => prev.filter(mapping => mapping.id !== mappingId))
    toast.success('Mapping eliminat')
  }, [])

  const handleHighlightParagraph = useCallback((paragraphId: string) => {
    const paragraphElement = documentViewerRef.current?.querySelector(`[data-paragraph-id="${paragraphId}"]`)
    if (!paragraphElement) return

    // Add highlight class with enhanced animation
    paragraphElement.classList.add('highlight-paragraph')
    
    // FASE 3: Enhanced highlight with better visual feedback
    const htmlElement = paragraphElement as HTMLElement
    htmlElement.style.transition = 'all 0.3s ease-in-out'
    htmlElement.style.transform = 'scale(1.02)'
    htmlElement.style.zIndex = '10'
    
    // Remove highlight after 3 seconds with smooth transition
    setTimeout(() => {
      paragraphElement.classList.remove('highlight-paragraph')
      htmlElement.style.transform = 'scale(1)'
      htmlElement.style.zIndex = 'auto'
    }, 3000)
    
    // Smooth scroll to element
    paragraphElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    })
  }, [])

  /**
   * FASE 3: Enhanced text selection handler for tables and formatted content
   */
  const handleEnhancedTextSelection = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection()
    if (!selection || !selection.toString().trim()) return
    
    const range = selection.getRangeAt(0)
    const selectedText = selection.toString().trim()
    
    // Find the closest paragraph or table cell
    let targetElement = range.commonAncestorContainer
    
    // Navigate up to find element with data-paragraph-id
    while (targetElement && targetElement.nodeType !== Node.ELEMENT_NODE) {
      targetElement = targetElement.parentNode
    }
    
    let htmlElement = targetElement as HTMLElement
    while (htmlElement && !htmlElement.getAttribute?.('data-paragraph-id')) {
      htmlElement = htmlElement.parentElement
    }
    
    if (!htmlElement) {
      console.warn('No paragraph ID found for selection')
      return
    }
    
    const paragraphId = htmlElement.getAttribute('data-paragraph-id')
    
    // Enhanced selection object with element type detection
    const elementType = htmlElement.tagName.toLowerCase()
    const isTableCell = ['td', 'th'].includes(elementType)
    const isHeader = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(elementType)
    
    handleTextSelection({
      start: range.startOffset,
      end: range.endOffset,
      text: selectedText,
      paragraphId: paragraphId || 'unknown',
      elementType,
      isTableCell,
      isHeader,
      fullElementText: htmlElement.textContent || ''
    })
    
    // Visual feedback for selection
    htmlElement.style.background = '#e3f2fd'
    setTimeout(() => {
      htmlElement.style.background = ''
    }, 1500)
    
  }, [handleTextSelection])

  // Helper functions

  const convertWordToHTML = async (base64Data: string): Promise<string> => {
    try {
      console.log('🚀 Utilitzant Premium Modules per processar document DOCX...')
      
      // Premium Modules guaranteed ready since this only executes after initialization
      if (!premiumModulesReady) {
        throw new Error('Premium Modules should be ready at this point - architectural error')
      }
      
      console.log('✅ Premium Modules ready, processing document...')
      
      // Convert base64 to Buffer for Premium Modules processing
      const base64Content = base64Data.split(',')[1] || base64Data
      const buffer = Buffer.from(base64Content, 'base64')
      
      // Validate buffer before Premium Modules processing
      console.log('🔍 Buffer validation:', {
        size: buffer.length,
        isEmpty: buffer.length === 0,
        startsWithPK: buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B, // DOCX is ZIP format
        first4Bytes: buffer.length > 4 ? Array.from(buffer.subarray(0, 4)) : 'too short'
      })
      
      if (buffer.length === 0) {
        throw new Error('Document buffer is empty - invalid DOCX file')
      }
      
      if (buffer.length < 100) {
        throw new Error(`Document buffer too small (${buffer.length} bytes) - likely corrupted DOCX`)
      }
      
      // DOCX files should start with PK (ZIP signature)
      if (!(buffer[0] === 0x50 && buffer[1] === 0x4B)) {
        console.warn('⚠️ Document may not be valid DOCX (missing ZIP signature)')
      }
      
      // Create Docxtemplater instance with Premium Modules (€1,250 investment)
      console.log('🚀 Creating Docxtemplater instance with Premium Modules...')
      const docxInstance = premiumModulesConfig.createDocxtemplaterInstance(buffer, ['html', 'image', 'style'])
      
      // Get document text with Premium Modules parsing
      // This leverages Style Module (€500) to preserve formatting
      // and HTML Module (€250) to handle rich content
      const documentXml = docxInstance.getFullText()
      
      // FASE 3: Process with enhanced Premium Modules intelligence
      // Optimized for maximum table fidelity and Word-like formatting
      const processedContent = await premiumModulesConfig.processDocumentWithPremiumModules(
        buffer,
        {
          enableHTML: true,    // HTML Module €250 - Enhanced table processing
          enableStyling: true, // Style Module €500 - Maximum formatting preservation
          enableImages: true,  // Image Module €250 - Professional image handling
          outputFormat: 'html',
          qualityMode: 'maximum' // FASE 3: Maximum fidelity mode
        }
      )
      
      // FASE 3: Enhanced paragraph and table ID mapping with Premium formatting preservation
      let htmlContent = processedContent.htmlContent
      let paragraphCounter = 1
      
      // Preserve Premium Module styling while adding mapping IDs to paragraphs
      htmlContent = htmlContent.replace(/<p([^>]*)>/g, (match, attributes) => {
        return `<p data-paragraph-id="p${paragraphCounter++}"${attributes}>`
      })
      
      // Enhanced handling of block elements with better table support
      htmlContent = htmlContent.replace(/<(h[1-6])([^>]*)>/g, (match, tag, attributes) => {
        if (!attributes.includes('data-paragraph-id')) {
          return `<${tag} data-paragraph-id="p${paragraphCounter++}"${attributes}>`
        }
        return match
      })
      
      // Special handling for table rows to enable individual cell mapping
      htmlContent = htmlContent.replace(/<tr([^>]*)>/g, (match, attributes) => {
        if (!attributes.includes('data-paragraph-id')) {
          return `<tr data-paragraph-id="p${paragraphCounter++}"${attributes}>`
        }
        return match
      })
      
      // Add mapping IDs to table cells for granular control
      htmlContent = htmlContent.replace(/<(td|th)([^>]*)>/g, (match, tag, attributes) => {
        if (!attributes.includes('data-paragraph-id')) {
          return `<${tag} data-paragraph-id="p${paragraphCounter++}"${attributes}>`
        }
        return match
      })
      
      // Handle list items
      htmlContent = htmlContent.replace(/<li([^>]*)>/g, (match, attributes) => {
        if (!attributes.includes('data-paragraph-id')) {
          return `<li data-paragraph-id="p${paragraphCounter++}"${attributes}>`
        }
        return match
      })
      
      // FASE 3: Wrap with enhanced Premium Module styling for Word-like appearance
      const finalHTML = `
        <div class="premium-document-content" data-premium-modules="active" data-fidelity="maximum">
          <div class="document-page" style="background: white; padding: 1in; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin: 20px auto; max-width: 8.5in; min-height: 11in;">
            ${htmlContent}
          </div>
        </div>
      `
      
      console.log('✅ FASE 3: Premium Modules processed document with enhanced fidelity:', {
        originalSize: buffer.length,
        paragraphsDetected: paragraphCounter - 1,
        premiumModulesUsed: processedContent.modulesUsed,
        stylePreservation: processedContent.styleQualityScore,
        processingTime: processedContent.processingTime,
        wordFidelityMode: 'maximum',
        tableSupport: 'enhanced',
        formatPreservation: 'complete'
      })
      
      return finalHTML
      
    } catch (error) {
      console.error('❌ Error amb Premium Modules:', error)
      
      // Critical fallback - still try to show something useful
      const fallbackHTML = `
        <div class="premium-document-content error-state">
          <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 class="text-red-800 font-semibold">⚠️ Error processant document amb Premium Modules</h3>
            <p class="text-red-600 text-sm mt-2">
              No s'ha pogut processar el document DOCX amb els Premium Modules (€1,250).
            </p>
            <p class="text-red-600 text-sm">
              Error: ${error instanceof Error ? error.message : 'Error desconegut'}
            </p>
          </div>
          <p data-paragraph-id="p1" class="text-gray-600">
            Si us plau, comprova que el document Word sigui vàlid i torna a intentar-ho.
          </p>
        </div>
      `
      return fallbackHTML
    }
  }

  const stripHTMLTags = (html: string): string => {
    return html.replace(/<[^>]*>/g, '')
  }

  const base64ToBlob = async (base64Data: string): Promise<Blob> => {
    const response = await fetch(base64Data)
    return response.blob()
  }

  // Render component
  return (
    <div className="premium-visual-editor min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Editor Visual Premium
            </h1>
            <p className="text-sm text-gray-500">
              Sistema intel·ligent amb tecnologia Premium Modules
            </p>
          </div>
          
          {/* Premium status indicator */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                premiumModulesReady 
                  ? 'bg-green-500 animate-pulse' 
                  : isLoading 
                    ? 'bg-yellow-500 animate-spin' 
                    : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                {premiumModulesReady 
                  ? 'Sistema Premium Actiu (€1,250)' 
                  : isLoading 
                    ? 'Inicialitzant Premium Modules...' 
                    : 'Premium Modules Inactius'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        
        {/* Excel Panel - Reduced width for more document space */}
        <div className="w-[15%] bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-3">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              📊 Excel
            </h2>
            
            {excelData ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-4">
                  {excelData.metadata.totalColumns} columnes • {excelData.metadata.premiumOpportunities} oportunitats Premium
                </div>
                
                {excelData.columns.map((column, index) => (
                  <div
                    key={index}
                    onClick={() => handleColumnSelect(column)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedColumn?.column === column.column
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {column.header}
                        </div>
                        <div className="text-sm text-gray-500">
                          Columna {column.column} • {column.data_type}
                        </div>
                      </div>
                      
                      {/* Premium Module indicator */}
                      {column.suggestedModule !== 'text' && (
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${
                            column.suggestedModule === 'html' ? 'bg-blue-500' :
                            column.suggestedModule === 'image' ? 'bg-green-500' :
                            column.suggestedModule === 'style' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="text-xs font-medium text-gray-600">
                            {column.suggestedModule.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Quality score */}
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="text-xs text-gray-500">
                        Qualitat: {column.qualityImprovement}/10
                      </div>
                      {column.estimatedTimesSaved > 0 && (
                        <div className="text-xs text-green-600">
                          +{column.estimatedTimesSaved}min estalvi
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Carregant dades Excel...</p>
              </div>
            )}
          </div>
        </div>

        {/* Document Viewer - Expanded area for better DOCX visibility */}
        <div className="w-[70%] bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📄 Document Word
            </h2>
            
            {!premiumModulesReady ? (
              <div className="text-center text-yellow-600 py-8">
                <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-medium">Inicialitzant Premium Modules...</p>
                <p className="text-sm mt-2">Sistema de €1,250 carregant-se per oferir qualitat màxima</p>
              </div>
            ) : wordData ? (
              <div>
                <div className="text-sm text-gray-600 mb-4">
                  {wordData.metadata.paragraphCount} paràgrafs • Complexitat: {wordData.metadata.complexityLevel} • {wordData.metadata.premiumOpportunities} oportunitats
                </div>
                
                <div 
                  ref={documentViewerRef}
                  className="premium-document-viewer max-w-none"
                  dangerouslySetInnerHTML={{ __html: wordData.htmlContent }}
                  onClick={(e) => {
                    // FASE 3: Enhanced text selection with table and paragraph support
                    handleEnhancedTextSelection(e)
                  }}
                  style={{
                    minHeight: '600px',
                    background: '#f5f5f5',
                    padding: '20px',
                    borderRadius: '8px'
                  }}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Carregant document Word...</p>
              </div>
            )}
          </div>
        </div>

        {/* Professional Sidebar - Phase 2 */}
        <ProfessionalSidebar 
          mappings={premiumMappings}
          excelColumns={excelData?.columns || []}
          documentRef={documentViewerRef}
          onCreateMapping={handleCreateMappingFromSidebar}
          onUpdateMapping={handleUpdateMapping}
          onDeleteMapping={handleDeleteMapping}
          onHighlightParagraph={handleHighlightParagraph}
          className="w-[15%]"
        />

      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>Processant amb sistema Premium...</span>
          </div>
        </div>
      )}

    </div>
  )
}