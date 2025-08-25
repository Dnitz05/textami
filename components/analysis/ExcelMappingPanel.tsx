// components/analysis/ExcelMappingPanel.tsx
// Panel 3: Excel mapping with fuzzy matching
import React, { useState, useEffect } from 'react';
import { ParsedTag } from '../../lib/types';

interface ExcelMappingPanelProps {
  tags: ParsedTag[];
  excelHeaders: string[];
  onMappingUpdate?: (mappings: Record<string, string>) => void;
  pipelineStatus?: string;
}

interface MappingSuggestion {
  tagSlug: string;
  tagName: string;
  suggestedHeader: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

const ExcelMappingPanel: React.FC<ExcelMappingPanelProps> = ({
  tags,
  excelHeaders,
  onMappingUpdate,
  pipelineStatus
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Load fuzzy matching suggestions
  useEffect(() => {
    if (tags.length > 0 && excelHeaders.length > 0) {
      loadFuzzyMappings();
    }
  }, [tags, excelHeaders]);

  const loadFuzzyMappings = async () => {
    setIsLoadingSuggestions(true);
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
        if (result.success && result.suggestions) {
          setSuggestions(result.suggestions);
          
          // Auto-apply high confidence mappings
          const autoMappings: Record<string, string> = {};
          result.suggestions.forEach((suggestion: MappingSuggestion) => {
            if (suggestion.confidence === 'high') {
              autoMappings[suggestion.tagSlug] = suggestion.suggestedHeader;
            }
          });
          
          setMappings(autoMappings);
          onMappingUpdate?.(autoMappings);
        }
      }
    } catch (error) {
      console.error('Failed to load fuzzy mappings:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleMappingChange = (tagSlug: string, header: string) => {
    const newMappings = {
      ...mappings,
      [tagSlug]: header
    };
    
    if (header === '') {
      delete newMappings[tagSlug];
    }
    
    setMappings(newMappings);
    onMappingUpdate?.(newMappings);
  };

  const applySuggestion = (suggestion: MappingSuggestion) => {
    handleMappingChange(suggestion.tagSlug, suggestion.suggestedHeader);
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

  const getSuggestionForTag = (tagSlug: string) => {
    return suggestions.find(s => s.tagSlug === tagSlug);
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Excel Mapping
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
            {getMappedCount()}/{tags.length}
          </span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">Map detected tags to Excel columns</p>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {excelHeaders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-gray-500 text-sm mb-1">No Excel data uploaded</div>
            <div className="text-gray-400 text-xs">Upload Excel file to enable mapping</div>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoadingSuggestions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800 text-sm">Loading fuzzy matching suggestions...</span>
                </div>
              </div>
            )}

            {tags.map((tag, index) => {
              const suggestion = getSuggestionForTag(tag.slug);
              const currentMapping = mappings[tag.slug] || '';

              return (
                <div key={`${tag.slug}-${index}`} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{tag.name}</div>
                      <div className="text-xs text-gray-500">Example: {tag.example}</div>
                    </div>
                    
                    {suggestion && (
                      <div className={`px-2 py-1 text-xs rounded border ${getConfidenceColor(suggestion.confidence)}`}>
                        {suggestion.confidence} confidence
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(tag.slug, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select Excel column...</option>
                      {excelHeaders.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>

                    {suggestion && suggestion.suggestedHeader !== currentMapping && (
                      <div className="bg-gray-50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-medium text-gray-700">AI Suggestion:</div>
                            <div className="text-sm text-gray-800">{suggestion.suggestedHeader}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Score: {Math.round(suggestion.score * 100)}% • {suggestion.reasoning}
                            </div>
                          </div>
                          <button
                            onClick={() => applySuggestion(suggestion)}
                            className="ml-3 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Mapping Summary */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Mapping Progress: {getMappedCount()} of {tags.length} tags mapped
                </span>
                <div className="flex items-center space-x-1">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(getMappedCount() / tags.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-purple-600 font-medium text-xs ml-2">
                    {Math.round((getMappedCount() / tags.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelMappingPanel;