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
  onExcelUpload
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load intelligent AI mapping suggestions
  useEffect(() => {
    if (tags.length > 0 && excelHeaders.length > 0) {
      loadIntelligentMappings();
    }
  }, [tags, excelHeaders]);

  const loadIntelligentMappings = async () => {
    setIsLoadingSuggestions(true);
    try {
      console.log('🧠 Loading intelligent AI mappings...');
      
      const response = await fetch('/api/intelligent-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: tags,
          excelHeaders: excelHeaders,
          documentContent: '' // TODO: Pass document content for better context
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.suggestions) {
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
        
        // Auto-apply high confidence mappings (>= 0.8) - reversed mapping: header -> tag
        const autoMappings: Record<string, string> = {};
        aiSuggestions.forEach((suggestion) => {
          if (suggestion.score >= 0.8) {
            autoMappings[suggestion.suggestedHeader] = suggestion.tagSlug;
          }
        });
        
        setMappings(autoMappings);
        onMappingUpdate?.(autoMappings);"
        
        console.log('✅ AI mappings loaded:', {
          total: aiSuggestions.length,
          autoApplied: Object.keys(autoMappings).length
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
          
          // Auto-apply high confidence mappings - reversed mapping: header -> tag
          const autoMappings: Record<string, string> = {};
          result.data.suggestions.forEach((suggestion: MappingSuggestion) => {
            if (suggestion.confidence === 'high') {
              autoMappings[suggestion.suggestedHeader] = suggestion.tagSlug;
            }
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

      <div>
        {excelHeaders.length === 0 ? (
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-3"></div>
                  <span className="text-purple-800 text-sm">🧠 Loading intelligent AI mapping suggestions...</span>
                </div>
              </div>
            )}

            {excelHeaders.map((header, index) => {
              const currentMapping = mappings[header] || '';
              const suggestedTag = getSuggestedTagForHeader(header);

              return (
                <div key={`${header}-${index}`} className="border border-gray-200 rounded-lg p-3 bg-white mb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm mb-1">{header}</div>
                      <div className="text-xs text-gray-500">Capçalera d'Excel</div>
                    </div>
                    
                    {suggestedTag && (
                      <div className={`px-2 py-1 text-xs rounded border bg-blue-50 border-blue-200 text-blue-800`}>
                        IA: {Math.round(suggestedTag.confidence * 100)}%
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleHeaderMappingChange(header, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
                    >
                      <option value="">Selecciona un tag...</option>
                      {tags.map((tag) => (
                        <option key={tag.slug} value={tag.slug}>
                          {tag.name} ({tag.type})
                        </option>
                      ))}
                    </select>

                    {suggestedTag && suggestedTag.tagSlug !== currentMapping && (
                      <div className="bg-blue-50 border border-blue-100 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-blue-700">🧠 Suggeriment IA:</span>
                              <div className="px-2 py-1 text-xs rounded border bg-blue-100 border-blue-200 text-blue-800">
                                {Math.round(suggestedTag.confidence * 100)}%
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
                            onClick={() => applySuggestionForHeader(header, suggestedTag)}
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