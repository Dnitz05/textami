// components/analysis/ExcelMappingPanel.tsx
// Panel 3: Excel mapping with fuzzy matching
import React, { useState, useEffect, useRef } from 'react';
import { ParsedTag } from '../../lib/types';

interface ExcelMappingPanelProps {
  tags: ParsedTag[];
  excelHeaders: string[];
  onMappingUpdate?: (mappings: Record<string, string>) => void;
  pipelineStatus?: string;
  onExcelUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingExcel?: boolean;
  documentMarkdown?: string;
}

interface MappingSuggestion {
  tagSlug: string;
  tagName: string;
  tagType?: string;
  tagExample?: string;
  suggestedHeader: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  alternativeHeaders?: string[];
}

const ExcelMappingPanel: React.FC<ExcelMappingPanelProps> = ({
  tags,
  excelHeaders,
  onMappingUpdate,
  pipelineStatus,
  onExcelUpload,
  isProcessingExcel = false,
  documentMarkdown = ''
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual mapping state
  const [isManualMappingActive, setIsManualMappingActive] = useState(false);
  const [activeManualHeader, setActiveManualHeader] = useState<string | null>(null);
  
  // ULTRATHINK: Store manual text mappings separately from tag mappings
  const [manualTextMappings, setManualTextMappings] = useState<Record<string, string>>({});
  
  // ULTRATHINK: Store original tag info for manual mappings to preserve colors
  const [manualTagInfo, setManualTagInfo] = useState<Record<string, {selectedText: string, originalTag?: any}>>({});

  // Load intelligent AI mapping suggestions
  useEffect(() => {
    if (tags.length > 0 && excelHeaders.length > 0) {
      loadIntelligentMappings();
    }
  }, [tags, excelHeaders]);

  // ULTRATHINK: Listen for manual text selection events from DocumentPreviewPanel
  useEffect(() => {
    const handleTextSelection = (event: any) => {
      if (isManualMappingActive && activeManualHeader) {
        const { selectedText, currentMappings } = event.detail;
        
        console.log('🧠 ULTRATHINK - Processing text selection:', { 
          header: activeManualHeader, 
          selectedText,
          currentMappings: Object.entries(currentMappings || {})
        });
        
        // STEP 1: Remove this header from previous mappings (if exists)
        const newMappings = { ...mappings };
        const newManualTextMappings = { ...manualTextMappings };
        
        // Find if this header was previously mapped to a tag
        const wasTagMapped = Object.keys(newMappings).find(header => newMappings[header] && header === activeManualHeader);
        if (wasTagMapped) {
          console.log('🔄 ULTRATHINK - Removing previous tag mapping for header:', wasTagMapped);
          delete newMappings[wasTagMapped];
        }
        
        // Find if this header had a previous manual text mapping
        const wasManuallMapped = Object.keys(newManualTextMappings).find(header => header === activeManualHeader);
        const newManualTagInfo = { ...manualTagInfo };
        if (wasManuallMapped) {
          console.log('🔄 ULTRATHINK - Removing previous manual mapping for header:', wasManuallMapped);
          delete newManualTextMappings[wasManuallMapped];
          delete newManualTagInfo[wasManuallMapped]; // Also remove tag info
        }
        
        // STEP 2: Find the original tag that matches the selected text (to preserve its color)
        const originalTag = tags.find(tag => 
          tag.example === selectedText || 
          tag.name.toLowerCase().includes(selectedText.toLowerCase()) ||
          selectedText.toLowerCase().includes(tag.name.toLowerCase())
        );
        
        // STEP 3: Create new manual text mapping
        newManualTextMappings[activeManualHeader] = selectedText;
        
        // STEP 4: Store tag info for color preservation
        newManualTagInfo[activeManualHeader] = {
          selectedText,
          originalTag: originalTag || null
        };
        
        console.log('✅ ULTRATHINK - New manual mapping created:', {
          header: activeManualHeader,
          selectedText,
          originalTag: originalTag ? {name: originalTag.name, example: originalTag.example} : 'No matching tag found',
          allManualMappings: Object.entries(newManualTextMappings)
        });
        
        // STEP 5: Update states
        setMappings(newMappings);
        setManualTextMappings(newManualTextMappings);
        setManualTagInfo(newManualTagInfo);
        onMappingUpdate?.(newMappings);
        
        // STEP 6: Notify DocumentPreviewPanel about manual text mappings with tag info
        document.dispatchEvent(new CustomEvent('manualTextMappingsUpdated', {
          detail: { 
            manualTextMappings: newManualTextMappings,
            manualTagInfo: newManualTagInfo
          }
        }));
        
        // Deactivate manual mapping after selection
        deactivateManualMapping();
      }
    };

    document.addEventListener('textSelected', handleTextSelection);
    return () => document.removeEventListener('textSelected', handleTextSelection);
  }, [isManualMappingActive, activeManualHeader, tags, mappings, manualTextMappings]);

  const loadIntelligentMappings = async () => {
    setIsLoadingSuggestions(true);
    try {
      console.log('🧠 Loading intelligent AI mappings...');
      
      // Clean headers at frontend level to prevent space issues
      const cleanedHeaders = excelHeaders.map(header => header.trim()).filter(header => header.length > 0);
      
      console.log('📊 Input data:', {
        tagsCount: tags.length,
        originalHeaders: excelHeaders,
        cleanedHeaders: cleanedHeaders,
        headersCount: cleanedHeaders.length
      });
      
      const response = await fetch('/api/intelligent-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: tags,
          excelHeaders: cleanedHeaders, // Use cleaned headers
          documentContent: documentMarkdown || '' // Pass document content for better context
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.suggestions) {
        console.log('✅ AI API response:', {
          suggestionsCount: result.data.suggestions.length,
          suggestions: result.data.suggestions.map((s: any) => ({
            header: s.suggestedHeader,
            tag: s.tagName,
            confidence: s.confidence
          }))
        });
        
        // Convert AI suggestions to header-based mapping format
        const aiSuggestions: MappingSuggestion[] = result.data.suggestions.map((aiSugg: any) => ({
          tagSlug: aiSugg.tagSlug,
          tagName: aiSugg.tagName,
          tagType: aiSugg.tagType || 'string',
          tagExample: aiSugg.tagExample || '',
          suggestedHeader: aiSugg.suggestedHeader,
          score: aiSugg.confidence,
          confidence: aiSugg.confidence >= 0.8 ? 'high' : aiSugg.confidence >= 0.6 ? 'medium' : 'low',
          reasoning: aiSugg.reasoning,
          alternativeHeaders: aiSugg.alternativeHeaders || []
        }));
        
        setSuggestions(aiSuggestions);
        
        // Auto-apply ALL AI suggestions by default - reversed mapping: header -> tag
        const autoMappings: Record<string, string> = {};
        aiSuggestions.forEach((suggestion) => {
          // Use cleaned header for consistent mapping
          const cleanHeader = suggestion.suggestedHeader.trim();
          autoMappings[cleanHeader] = suggestion.tagSlug;
        });
        
        setMappings(autoMappings);
        onMappingUpdate?.(autoMappings);
        
        console.log('✅ AI mappings loaded:', {
          total: aiSuggestions.length,
          autoApplied: Object.keys(autoMappings).length,
          mappingDetails: Object.entries(autoMappings).map(([header, tagSlug]) => ({
            header,
            tagSlug,
            tagName: aiSuggestions.find(s => s.tagSlug === tagSlug)?.tagName
          }))
        });
      } else {
        throw new Error(result.error || 'Failed to get AI suggestions');
      }
    } catch (error) {
      console.error('❌ Failed to load intelligent mappings:', error);
      // Fallback to fuzzy matching if AI fails
      console.log('📊 Falling back to fuzzy matching...');
      await loadFuzzyMappings();
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadFuzzyMappings = async () => {
    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: tags,
          excelHeaders: excelHeaders,
          confidenceThreshold: 0.6
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.suggestions) {
          setSuggestions(result.data.suggestions);
          
          // Auto-apply ALL fuzzy mapping suggestions - reversed mapping: header -> tag
          const autoMappings: Record<string, string> = {};
          result.data.suggestions.forEach((suggestion: MappingSuggestion) => {
            // Auto-apply all suggestions, not just high confidence ones
            autoMappings[suggestion.suggestedHeader] = suggestion.tagSlug;
          });
          
          setMappings(autoMappings);
          onMappingUpdate?.(autoMappings);
        }
      }
    } catch (error) {
      console.error('Failed to load fuzzy mappings:', error);
    }
  };

  const handleHeaderMappingChange = (header: string, tagSlug: string) => {
    const newMappings = {
      ...mappings,
      [header]: tagSlug
    };
    
    if (tagSlug === '') {
      delete newMappings[header];
    }
    
    setMappings(newMappings);
    onMappingUpdate?.(newMappings);
  };

  const applySuggestionForHeader = (header: string, suggestion: any) => {
    handleHeaderMappingChange(header, suggestion.tagSlug);
  };
  
  const getSuggestedTagForHeader = (header: string) => {
    // Find AI suggestion for this Excel header
    return suggestions.find(s => s.suggestedHeader === header);
  };

  // Handle manual mapping activation
  const handleManualMappingClick = (header: string) => {
    console.log('🖱️ Manual mapping activated for header:', header);
    setIsManualMappingActive(true);
    setActiveManualHeader(header);
    
    // Communicate to parent that manual mapping is active
    // This will enable text selection in DocumentPreviewPanel
    document.dispatchEvent(new CustomEvent('manualMappingActivated', { 
      detail: { header, isActive: true } 
    }));
  };

  // Handle manual mapping deactivation
  const deactivateManualMapping = () => {
    console.log('🖱️ Manual mapping deactivated');
    setIsManualMappingActive(false);
    setActiveManualHeader(null);
    
    document.dispatchEvent(new CustomEvent('manualMappingDeactivated'));
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMappedCount = () => {
    return Object.keys(mappings).length;
  };


  return (
    <div style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}>
      {/* Status indicator */}
      {excelHeaders.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">
            Mapatge: {getMappedCount()}/{excelHeaders.length} capçaleres
          </span>
          <div className="flex items-center">
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(getMappedCount() / excelHeaders.length) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-green-600 font-medium ml-2">
              {Math.round((getMappedCount() / excelHeaders.length) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Main content area with enhanced spacing */}
      <div className="space-y-6">
        {isProcessingExcel ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center shadow-lg">
            <div className="flex items-center justify-center mb-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-medium">🧠 Analitzant Excel amb IA...</span>
            </div>
            <p className="text-sm text-blue-700">
              La intel·ligència artificial està processant l'Excel i extraient les capçaleres. Això pot trigar uns segons.
            </p>
            <div className="mt-3 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        ) : excelHeaders.length === 0 ? (
          <div 
            className="cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-dashed border-green-300 rounded-lg p-6 hover:from-green-100 hover:to-emerald-100 hover:border-green-400 transition-all duration-200"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center">
              <div className="text-green-500 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">🚀 Automatitza la teva feina</h4>
              <p className="text-sm text-gray-600 mb-3">
                Puja un Excel per generar informes en sèrie automàticament
              </p>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Clica per pujar Excel</span>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onExcelUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {isLoadingSuggestions && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800 font-medium">🧠 Analitzant Excel amb IA...</span>
                </div>
                <p className="text-sm text-blue-700">
                  La intel·ligència artificial està processant les capçaleres d'Excel i suggerint els tags més adequats. Això pot trigar uns segons.
                </p>
                <div className="mt-3 flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            )}

            {excelHeaders.map((header, index) => {
              // Use cleaned header for consistent lookups
              const cleanHeader = header.trim();
              const currentMapping = mappings[cleanHeader] || '';
              const suggestedTag = getSuggestedTagForHeader(cleanHeader);
              
              // Find the selected tag to show its name and example
              const selectedTag = tags.find(tag => tag.slug === currentMapping);
              const displayValue = selectedTag && selectedTag.example 
                ? `${selectedTag.name} (${selectedTag.example})`
                : selectedTag?.name || header;

              return (
                <div key={`${header}-${index}`} className="border border-gray-200 rounded-lg p-3 bg-white mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{header}</div>
                    </div>
                    <button
                      onClick={() => handleManualMappingClick(cleanHeader)}
                      className={`px-3 py-1 text-xs rounded-md transition-all duration-200 flex items-center space-x-1 ${
                        activeManualHeader === cleanHeader
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-700'
                      }`}
                      title="Click per seleccionar text manualment"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
                      </svg>
                      <span>{activeManualHeader === cleanHeader ? 'Selecciona text' : 'Manual'}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleHeaderMappingChange(cleanHeader, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
                    >
                      <option value="">Selecciona un tag...</option>
                      {tags.map((tag) => {
                        // Format: tagName (originalExample) for better context
                        const displayText = tag.example ? `${tag.name} (${tag.example})` : `${tag.name} (${tag.type})`;
                        return (
                          <option key={tag.slug} value={tag.slug}>
                            {displayText}
                          </option>
                        );
                      })}
                    </select>

                    {suggestedTag && !currentMapping && (
                      <div className="bg-blue-50 border border-blue-100 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-blue-700">🧠 Suggeriment IA:</span>
                              <div className="px-2 py-1 text-xs rounded border bg-blue-100 border-blue-200 text-blue-800">
                                {Math.round((suggestedTag.score || 0) * 100)}%
                              </div>
                            </div>
                            <div className="text-sm font-medium text-blue-900 mb-1">{suggestedTag.tagName}</div>
                            <div className="text-xs text-blue-700 mb-1">
                              Tipus: {suggestedTag.tagType} | Exemple: {suggestedTag.tagExample}
                            </div>
                            {suggestedTag.reasoning && (
                              <div className="text-xs text-blue-600">
                                {suggestedTag.reasoning}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => applySuggestionForHeader(cleanHeader, suggestedTag)}
                            className="ml-3 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelMappingPanel;