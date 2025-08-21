// components/visual-mapping/PremiumVisualEditor.tsx
// TEXTAMI PREMIUM VISUAL MAPPING SYSTEM - Phase 1
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
  type PremiumModuleType
} from '@/lib/premium-modules'

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
  } | null>(null)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [mappingMode, setMappingMode] = useState(false)
  const [showPremiumInsights, setShowPremiumInsights] = useState(false)
  
  // File input refs
  const excelInputRef = useRef<HTMLInputElement>(null)
  const wordInputRef = useRef<HTMLInputElement>(null)
  const documentViewerRef = useRef<HTMLDivElement>(null)

  // Initialize Premium Modules on component mount
  useEffect(() => {
    initializePremiumSystem()
  }, [])

  // Load files from localStorage automatically
  useEffect(() => {
    loadSavedFiles()
  }, [])

  /**
   * Initialize Premium Modules system
   * TRANSPARENT to user - they never see this initialization
   */
  const initializePremiumSystem = async () => {
    try {
      console.log('🚀 Initializing Premium Modules system...')
      
      await premiumModulesConfig.initializePremiumModules({
        enableHTML: true,    // €250 - Rich content processing
        enableImage: true,   // €250 - Dynamic image processing
        enableStyling: true, // €500 - Premium visual control
        enableXLSX: false    // €250 - Not needed for this workflow
      })
      
      console.log('✅ Premium Modules system ready - €1,000 technology active')
    } catch (error) {
      console.error('❌ Premium Modules initialization failed:', error)
      toast.error('Sistema avançat no disponible, utilitzant mode bàsic')
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
        const templateData = JSON.parse(savedTemplate)
        if (templateData.base64) {
          await processWordFileWithPremiumIntelligence(templateData.base64, templateData.fileName, templateData.size)
        }
      } catch (error) {
        console.error('Error loading template:', error)
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
   * CREATES Premium mapping automatically when both Excel and Word are selected
   */
  const handleTextSelection = useCallback((selection: {
    start: number
    end: number
    text: string
    paragraphId: string
  }) => {
    
    if (!selectedColumn) {
      toast.error('Selecciona primer una columna Excel')
      return
    }
    
    setSelectedText(selection)
    
    // AUTOMATIC PREMIUM MAPPING CREATION
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
    }
  ) => {
    
    try {
      // CREATE PREMIUM MAPPING with intelligent module selection
      const premiumMapping = premiumMappingEngine.createIntelligentMapping(
        excelColumn,
        wordSelection,
        {
          documentType: 'generic',
          qualityMode: 'balanced'
        }
      )
      
      // Add to mappings list
      setPremiumMappings(prev => [...prev, premiumMapping])
      
      // Reset selection state
      setSelectedColumn(null)
      setSelectedText(null)
      setMappingMode(false)
      
      // Show success with Premium Module info (simplified for user)
      const moduleInfo: Record<PremiumModuleType, string> = {
        'html': '🌐 Contingut avançat',
        'image': '🖼️ Imatge dinàmica', 
        'style': '🎨 Estil professional',
        'xlsx': '📊 Excel dinàmic',
        'text': '📝 Text simple'
      }
      
      toast.success(
        `Mapping creat: ${moduleInfo[premiumMapping.selected_premium_module]} • Qualitat: ${premiumMapping.quality_score}/10`,
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

  // Helper functions

  const convertWordToHTML = async (base64Data: string): Promise<string> => {
    // In production, this would use mammoth.js or similar to convert DOCX to HTML
    // For now, return mock HTML content
    const mockHTML = `
      <div>
        <p data-paragraph-id="p1">Aquest és un paràgraf d'exemple del document Word.</p>
        <p data-paragraph-id="p2">Aquí podem tenir <strong>text formatat</strong> i altres elements.</p>
        <p data-paragraph-id="p3">El sistema detecta automàticament les millors opcions per cada contingut.</p>
      </div>
    `
    return mockHTML
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
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Sistema Premium Actiu</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        
        {/* Excel Panel */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📊 Columnes Excel
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

        {/* Document Viewer */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              📄 Document Word
            </h2>
            
            {wordData ? (
              <div>
                <div className="text-sm text-gray-600 mb-4">
                  {wordData.metadata.paragraphCount} paràgrafs • Complexitat: {wordData.metadata.complexityLevel} • {wordData.metadata.premiumOpportunities} oportunitats
                </div>
                
                <div 
                  ref={documentViewerRef}
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: wordData.htmlContent }}
                  onClick={(e) => {
                    // Handle text selection (simplified implementation)
                    const selection = window.getSelection()
                    if (selection && selection.toString().trim()) {
                      const range = selection.getRangeAt(0)
                      handleTextSelection({
                        start: range.startOffset,
                        end: range.endOffset,
                        text: selection.toString(),
                        paragraphId: 'p1' // Would be dynamic in production
                      })
                    }
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

        {/* Mappings Sidebar */}
        <div className="w-1/3 bg-gray-50 border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🎯 Mappings Creats
            </h2>
            
            {premiumMappings.length > 0 ? (
              <div className="space-y-3">
                {premiumMappings.map((mapping, index) => (
                  <div key={mapping.id} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900">
                          {mapping.excel_column.header}
                        </span>
                      </div>
                      
                      {/* Premium Module badge */}
                      <div className={`px-2 py-1 text-xs font-medium rounded ${
                        mapping.selected_premium_module === 'html' ? 'bg-blue-100 text-blue-800' :
                        mapping.selected_premium_module === 'image' ? 'bg-green-100 text-green-800' :
                        mapping.selected_premium_module === 'style' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {mapping.selected_premium_module.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      "{mapping.word_selection.text.substring(0, 50)}..."
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Qualitat: {mapping.quality_score}/10</span>
                      {mapping.performance_benefit > 0 && (
                        <span className="text-green-600">+{mapping.performance_benefit}min</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No hi ha mappings creats</p>
                <p className="text-xs mt-2">
                  Selecciona una columna Excel i després clica text al document Word
                </p>
              </div>
            )}
          </div>
        </div>

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