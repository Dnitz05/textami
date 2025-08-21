// components/visual-mapping/ProfessionalSidebar.tsx
// TEXTAMI PROFESSIONAL UX - Professional sidebar with scroll sync
// Based on DNITZ05 PromptSidebar.tsx patterns

'use client'

import { useState, useRef, useEffect, RefObject } from 'react'
import { useScrollSync } from '@/hooks/useScrollSync'
import { useIntelligentPositioning } from '@/hooks/useIntelligentPositioning'
import type { PremiumMapping } from '@/lib/premium-modules/PremiumMappingEngine'
import type { ExcelColumnAnalysis } from '@/lib/premium-modules/PremiumContentAnalyzer'
import type { PremiumModuleType } from '@/lib/premium-modules/IntelligentModuleSelector'

export interface ProfessionalSidebarProps {
  mappings: PremiumMapping[]
  excelColumns: ExcelColumnAnalysis[]
  documentRef: RefObject<HTMLDivElement | null>
  onCreateMapping: (excelColumn: ExcelColumnAnalysis, paragraphId: string) => void
  onUpdateMapping: (mappingId: string, updates: Partial<PremiumMapping>) => void
  onDeleteMapping: (mappingId: string) => void
  onHighlightParagraph: (paragraphId: string) => void
  className?: string
}

interface AIPromptMode {
  type: 'rewrite' | 'enhance' | 'insert_after' | 'insert_before'
  label: string
  icon: string
  description: string
}

const AI_PROMPT_MODES: AIPromptMode[] = [
  {
    type: 'rewrite',
    label: 'Reescriu',
    icon: '✏️',
    description: 'Reescriu completament el paràgraf'
  },
  {
    type: 'enhance',
    label: 'Millora',
    icon: '⭐',
    description: 'Millora el paràgraf mantenint l\'estructura'
  },
  {
    type: 'insert_after',
    label: 'Afegir després',
    icon: '➕',
    description: 'Inserir contingut després del paràgraf'
  },
  {
    type: 'insert_before',
    label: 'Afegir abans',
    icon: '⬆️',
    description: 'Inserir contingut abans del paràgraf'
  }
]

const MODULE_INFO = {
  html: { name: 'HTML Module', cost: '€250', color: 'bg-orange-100 text-orange-800', icon: '🌐' },
  image: { name: 'Image Module', cost: '€250', color: 'bg-blue-100 text-blue-800', icon: '🖼️' },
  style: { name: 'Style Module', cost: '€500', color: 'bg-purple-100 text-purple-800', icon: '🎨' },
  xlsx: { name: 'XLSX Module', cost: '€250', color: 'bg-green-100 text-green-800', icon: '📊' },
  text: { name: 'Text Standard', cost: '€0', color: 'bg-gray-100 text-gray-800', icon: '📝' }
}

export default function ProfessionalSidebar({
  mappings,
  excelColumns,
  documentRef,
  onCreateMapping,
  onUpdateMapping,
  onDeleteMapping,
  onHighlightParagraph,
  className = ''
}: ProfessionalSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [selectedExcelColumn, setSelectedExcelColumn] = useState<string | null>(null)
  const [activeAIPrompt, setActiveAIPrompt] = useState<string | null>(null)
  const [aiPromptText, setAiPromptText] = useState('')
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null)

  // Professional scroll synchronization
  const { syncToPosition, scrollToElement } = useScrollSync(
    documentRef,
    sidebarRef,
    {
      enabled: true,
      throttleMs: 16,
      syncDirection: 'bidirectional',
      smoothSync: true
    }
  )

  // Intelligent positioning system (Phase 2)
  const {
    registerElement,
    unregisterElement,
    updateElement,
    repositionAll,
    positioningResults,
    isRepositioning
  } = useIntelligentPositioning(sidebarRef, {
    enabled: true,
    debounceMs: 100,
    animationDuration: 300,
    respectScrollPosition: true,
    onPositionChange: (results) => {
      // Handle position changes for visual feedback
      console.log('🎯 Positioning updated:', results.length, 'elements repositioned')
    }
  })

  // Auto-scroll to active mappings
  useEffect(() => {
    if (expandedMapping && sidebarRef.current) {
      const mappingElement = sidebarRef.current.querySelector(`[data-mapping-id="${expandedMapping}"]`)
      if (mappingElement) {
        mappingElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [expandedMapping])

  // Register mapping cards for intelligent positioning
  useEffect(() => {
    mappings.forEach((mapping, index) => {
      const cardElement = sidebarRef.current?.querySelector(`[data-mapping-id="${mapping.id}"]`)
      if (cardElement) {
        const rect = cardElement.getBoundingClientRect()
        const sidebarRect = sidebarRef.current?.getBoundingClientRect()
        
        if (sidebarRect) {
          registerElement({
            id: `mapping-${mapping.id}`,
            x: rect.left - sidebarRect.left,
            y: rect.top - sidebarRect.top,
            width: rect.width,
            height: rect.height,
            priority: expandedMapping === mapping.id ? 9 : 7, // Expanded cards have higher priority
            type: 'mapping-card',
            minDistance: expandedMapping === mapping.id ? 16 : 8 // More space for expanded cards
          })
        }
      }
    })

    // Cleanup unregistered mappings
    const currentMappingIds = mappings.map(m => `mapping-${m.id}`)
    positioningResults.forEach(result => {
      if (result.element.type === 'mapping-card' && !currentMappingIds.includes(result.element.id)) {
        unregisterElement(result.element.id)
      }
    })
  }, [mappings, expandedMapping, registerElement, unregisterElement, positioningResults])

  // Register AI prompt dialogs when they appear
  useEffect(() => {
    if (activeAIPrompt) {
      const promptElement = document.querySelector(`[data-ai-prompt-id="${activeAIPrompt}"]`)
      if (promptElement) {
        const rect = promptElement.getBoundingClientRect()
        const sidebarRect = sidebarRef.current?.getBoundingClientRect()
        
        if (sidebarRect) {
          registerElement({
            id: `ai-prompt-${activeAIPrompt}`,
            x: rect.left - sidebarRect.left,
            y: rect.top - sidebarRect.top,
            width: rect.width,
            height: rect.height,
            priority: 10, // Highest priority for prompts
            type: 'prompt-dialog',
            minDistance: 20
          })
        }
      }
    } else {
      // Cleanup prompt element when closed
      positioningResults.forEach(result => {
        if (result.element.type === 'prompt-dialog') {
          unregisterElement(result.element.id)
        }
      })
    }
  }, [activeAIPrompt, registerElement, unregisterElement, positioningResults])

  const handleExcelColumnClick = (column: ExcelColumnAnalysis) => {
    setSelectedExcelColumn(column.column)
    // Visual feedback
    setTimeout(() => setSelectedExcelColumn(null), 2000)
  }

  const handleMappingCardClick = (mapping: PremiumMapping) => {
    // Highlight corresponding paragraph in document
    onHighlightParagraph(mapping.word_selection.paragraphId)
    
    // Scroll to paragraph in document
    scrollToElement(mapping.word_selection.paragraphId, 100)
    
    // Expand mapping details
    setExpandedMapping(expandedMapping === mapping.id ? null : mapping.id)
  }

  const handleAIPromptSubmit = (mappingId: string, mode: AIPromptMode['type']) => {
    if (!aiPromptText.trim()) return

    // In a real implementation, this would call an AI service
    console.log(`AI Prompt for ${mappingId}:`, {
      mode,
      prompt: aiPromptText,
      mapping: mappings.find(m => m.id === mappingId)
    })

    // Reset form
    setAiPromptText('')
    setActiveAIPrompt(null)
  }

  const getQualityScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50'
    if (score >= 6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getPerformanceBadge = (benefit: number) => {
    if (benefit >= 10) return { text: 'Alt Rendiment', color: 'bg-green-100 text-green-800' }
    if (benefit >= 5) return { text: 'Bon Rendiment', color: 'bg-yellow-100 text-yellow-800' }
    return { text: 'Rendiment Bàsic', color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div 
      ref={sidebarRef}
      className={`professional-sidebar bg-white border-l border-gray-200 overflow-y-auto ${className}`}
      style={{ height: '100vh', maxHeight: '100vh' }}
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="font-semibold text-gray-900">Mapejat Intel·ligent</h2>
        </div>
        <p className="text-sm text-gray-600">
          {mappings.length} connexions · Mòduls Premium actius
        </p>
      </div>

      {/* Excel Columns Section */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          📊 Columnes Excel
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {excelColumns.length}
          </span>
        </h3>
        
        <div className="space-y-2">
          {excelColumns.map((column) => {
            const moduleInfo = MODULE_INFO[column.suggestedModule]
            const isSelected = selectedExcelColumn === column.column
            
            return (
              <button
                key={column.column}
                onClick={() => handleExcelColumnClick(column)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {column.header || `Columna ${column.column}`}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${moduleInfo.color}`}>
                    {moduleInfo.icon} {moduleInfo.name}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 mb-1">
                  Confiança: {Math.round(column.confidenceScore * 100)}%
                  {column.estimatedTimesSaved > 0 && (
                    <span className="ml-2">· ⏱️ {column.estimatedTimesSaved} min estalviats</span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 truncate">
                  {column.sample_data[0] || 'Sense dades d\'exemple'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Mappings Section */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          🔗 Connexions Actives
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
            {mappings.length}
          </span>
        </h3>

        {mappings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm">Fes clic a una columna Excel i després a un paràgraf del document per crear una connexió intel·ligent</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mappings.map((mapping) => {
              const moduleInfo = MODULE_INFO[mapping.selected_premium_module]
              const isExpanded = expandedMapping === mapping.id
              const performanceBadge = getPerformanceBadge(mapping.performance_benefit)
              
              return (
                <div
                  key={mapping.id}
                  data-mapping-id={mapping.id}
                  data-positioning-id={`mapping-${mapping.id}`}
                  className={`premium-mapping-card bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all overflow-hidden ${
                    isRepositioning ? 'premium-repositioning' : ''
                  }`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => handleMappingCardClick(mapping)}
                    className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {mapping.excel_column.header} → Paràgraf
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${moduleInfo.color}`}>
                          {moduleInfo.icon}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${performanceBadge.color}`}>
                          {performanceBadge.text}
                        </span>
                        <span className="text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className={`px-2 py-1 rounded ${getQualityScoreColor(mapping.quality_score)}`}>
                        Qualitat: {mapping.quality_score}/10
                      </span>
                      <span>Sintaxi: {mapping.generated_syntax}</span>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {/* AI Prompts Section */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">🤖 Prompts IA</h4>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {AI_PROMPT_MODES.map((mode) => (
                            <button
                              key={mode.type}
                              onClick={() => setActiveAIPrompt(activeAIPrompt === `${mapping.id}-${mode.type}` ? null : `${mapping.id}-${mode.type}`)}
                              className={`p-2 rounded text-xs transition-colors ${
                                activeAIPrompt === `${mapping.id}-${mode.type}`
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div>{mode.icon} {mode.label}</div>
                            </button>
                          ))}
                        </div>

                        {activeAIPrompt?.startsWith(mapping.id) && (
                          <div 
                            data-ai-prompt-id={activeAIPrompt}
                            data-positioning-id={`ai-prompt-${activeAIPrompt}`}
                            className="bg-white rounded border border-gray-200 p-3"
                          >
                            <textarea
                              value={aiPromptText}
                              onChange={(e) => setAiPromptText(e.target.value)}
                              placeholder="Descriu com vols modificar aquest paràgraf..."
                              className="w-full p-2 border border-gray-200 rounded text-sm resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => setActiveAIPrompt(null)}
                                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                              >
                                Cancel·la
                              </button>
                              <button
                                onClick={() => {
                                  const mode = activeAIPrompt.split('-')[1] as AIPromptMode['type']
                                  handleAIPromptSubmit(mapping.id, mode)
                                }}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Aplicar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mapping Details */}
                      <div className="space-y-2 text-xs text-gray-600">
                        <div>
                          <strong>Text seleccionat:</strong> "{mapping.word_selection.text.slice(0, 50)}..."
                        </div>
                        <div>
                          <strong>Benefici:</strong> {mapping.module_selection_result.reasoning}
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span>Temps estalviat: {mapping.performance_benefit} min</span>
                          <button
                            onClick={() => onDeleteMapping(mapping.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
        <div className="text-xs text-gray-600 space-y-1">
          <div>Total temps estalviat: {mappings.reduce((sum, m) => sum + m.performance_benefit, 0)} minuts</div>
          <div>Qualitat mitjana: {mappings.length > 0 ? Math.round(mappings.reduce((sum, m) => sum + m.quality_score, 0) / mappings.length) : 0}/10</div>
          <div className="text-green-600">✓ Mòduls Premium automàtics</div>
        </div>
      </div>
    </div>
  )
}