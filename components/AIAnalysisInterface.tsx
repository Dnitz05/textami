'use client';

import React, { useState } from 'react';
import { ParsedTag, ParsedSection, ParsedTable } from '../lib/ai-parser';

interface AIAnalysisData {
  templateId: string;
  markdown: string;
  sections: ParsedSection[];
  tables: ParsedTable[];
  tags: ParsedTag[];
  signatura?: {
    nom: string;
    carrec: string;
    data_lloc: string;
  };
}

interface AIAnalysisInterfaceProps {
  analysisData: AIAnalysisData | null;
  excelHeaders?: string[];
  onTagUpdate?: (tags: ParsedTag[]) => void;
  onMappingUpdate?: (mappings: Record<string, string>) => void;
  onFreeze?: () => void;
  pipelineStatus?: 'uploaded' | 'analyzed' | 'mapped' | 'frozen' | 'production';
}

const AIAnalysisInterface: React.FC<AIAnalysisInterfaceProps> = ({
  analysisData,
  excelHeaders = [],
  onTagUpdate,
  onMappingUpdate,
  onFreeze,
  pipelineStatus = 'uploaded'
}) => {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<ParsedTag[]>(analysisData?.tags || []);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [mappingSuggestions, setMappingSuggestions] = useState<Record<string, { 
    header: string; 
    score: number; 
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  }>>({});
  const [isGeneratingMappings, setIsGeneratingMappings] = useState(false);

  if (!analysisData) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-lg font-medium mb-2">No analysis data available</div>
        <div className="text-sm">Upload a document and run AI analysis first</div>
      </div>
    );
  }

  const handleTagEdit = (tagSlug: string, newName: string) => {
    const updatedTags = localTags.map(tag => 
      tag.slug === tagSlug ? { ...tag, name: newName } : tag
    );
    setLocalTags(updatedTags);
    onTagUpdate?.(updatedTags);
    setEditingTag(null);
  };

  const handleMappingChange = (tagSlug: string, excelHeader: string) => {
    const newMappings = { ...mappings, [tagSlug]: excelHeader };
    setMappings(newMappings);
    onMappingUpdate?.(newMappings);
  };

  const generateAutoMappings = async () => {
    if (!analysisData || excelHeaders.length === 0) return;

    setIsGeneratingMappings(true);
    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tags: localTags,
          excelHeaders: excelHeaders,
          confidenceThreshold: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Mapping generation failed');
      }

      const result = await response.json();
      
      // Process suggestions
      const newSuggestions: Record<string, any> = {};
      const newMappings: Record<string, string> = {};

      result.suggestions.forEach((suggestion: any) => {
        newSuggestions[suggestion.tagSlug] = {
          header: suggestion.suggestedHeader,
          score: suggestion.score,
          confidence: suggestion.confidence,
          reasoning: suggestion.reasoning
        };
        
        // Auto-apply high confidence mappings
        if (suggestion.confidence === 'high') {
          newMappings[suggestion.tagSlug] = suggestion.suggestedHeader;
        }
      });

      setMappingSuggestions(newSuggestions);
      setMappings(prev => ({ ...prev, ...newMappings }));
      onMappingUpdate?.({ ...mappings, ...newMappings });

      console.log(`✅ Generated ${result.suggestions.length} mapping suggestions (${Math.round(result.mappingCoverage)}% coverage)`);
      
    } catch (error) {
      console.error('❌ Failed to generate mappings:', error);
    } finally {
      setIsGeneratingMappings(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      uploaded: 'bg-blue-100 text-blue-800',
      analyzed: 'bg-green-100 text-green-800', 
      mapped: 'bg-purple-100 text-purple-800',
      frozen: 'bg-indigo-100 text-indigo-800',
      production: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header with Pipeline Status */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">AI Document Analysis</h1>
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(pipelineStatus)}`}>
              {pipelineStatus.charAt(0).toUpperCase() + pipelineStatus.slice(1)}
            </span>
            <div className="text-sm text-gray-500">
              Template ID: {analysisData.templateId}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Document Preview */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              📄 Document Preview
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({analysisData.sections.length} sections, {analysisData.tables.length} tables)
              </span>
            </h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: analysisData.markdown
                  .replace(/\n/g, '<br>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
              }} 
            />
            
            {/* Tables */}
            {analysisData.tables.map((table, idx) => (
              <div key={idx} className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">{table.title}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {table.headers.map((header, hidx) => (
                          <th key={hidx} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.rows.map((row, ridx) => (
                        <tr key={ridx}>
                          {row.map((cell, cidx) => (
                            <td key={cidx} className="px-3 py-2 whitespace-nowrap text-gray-900">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Detected Tags */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              🏷️ Detected Variables
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({localTags.length} tags found)
              </span>
            </h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {localTags.map((tag) => (
              <div key={tag.slug} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingTag === tag.slug ? (
                      <input
                        type="text"
                        defaultValue={tag.name}
                        className="text-sm font-medium bg-white border rounded px-2 py-1 w-full"
                        onBlur={(e) => handleTagEdit(tag.slug, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleTagEdit(tag.slug, e.currentTarget.value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingTag(tag.slug)}
                      >
                        {tag.name}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Example: "{tag.example}"
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {tag.type}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(tag.confidence)}`}>
                        {Math.round(tag.confidence * 100)}% confidence
                      </span>
                      {tag.page && (
                        <span className="text-xs text-gray-400">
                          Page {tag.page}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Excel Mapping */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                🔗 Excel Mapping
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({Object.keys(mappings).length}/{localTags.length} mapped)
                </span>
              </h2>
              {excelHeaders.length > 0 && (
                <button
                  onClick={generateAutoMappings}
                  disabled={isGeneratingMappings}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  {isGeneratingMappings ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      ✨ Auto-map
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {excelHeaders.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-sm">No Excel file uploaded</div>
                <div className="text-xs text-gray-400 mt-1">Upload an Excel file to see mapping options</div>
              </div>
            ) : (
              localTags.map((tag) => {
                const suggestion = mappingSuggestions[tag.slug];
                const currentMapping = mappings[tag.slug];
                
                return (
                  <div key={tag.slug} className="p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {tag.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {tag.example}
                        </div>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="flex-1">
                        <select
                          className={`w-full text-sm border rounded px-2 py-1 ${
                            suggestion && !currentMapping ? 'border-blue-300 bg-blue-50' : ''
                          }`}
                          value={currentMapping || ''}
                          onChange={(e) => handleMappingChange(tag.slug, e.target.value)}
                        >
                          <option value="">Select Excel column</option>
                          {excelHeaders.map((header) => (
                            <option 
                              key={header} 
                              value={header}
                              className={suggestion?.header === header ? 'bg-blue-100 font-medium' : ''}
                            >
                              {header}
                              {suggestion?.header === header && ` ⭐ ${Math.round(suggestion.score * 100)}%`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Suggestion info */}
                    {suggestion && (
                      <div className="mt-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            suggestion.confidence === 'high' ? 'bg-green-100 text-green-800' :
                            suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {suggestion.confidence} confidence
                          </span>
                          <span className="text-gray-500">
                            {Math.round(suggestion.score * 100)}% match
                          </span>
                          {!currentMapping && (
                            <button
                              onClick={() => handleMappingChange(tag.slug, suggestion.header)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Apply suggestion
                            </button>
                          )}
                        </div>
                        <div className="text-gray-400 mt-1">
                          {suggestion.reasoning}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 4: Template Freeze */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">🧊 Template Preparation</h2>
          </div>
          <div className="p-4">
            {pipelineStatus === 'frozen' ? (
              <div className="text-center py-8">
                <div className="text-green-600 text-lg font-medium mb-2">✅ Template Ready</div>
                <div className="text-sm text-gray-600 mb-4">
                  Placeholders have been inserted into the DOCX template.
                  Ready for mass production.
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Production Ready
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Current status: Template needs to be prepared with placeholders before mass production.
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800 mb-1">Ready to freeze?</div>
                  <div className="text-xs text-yellow-700">
                    This will insert placeholders into your DOCX template. This action can only be done once per template.
                  </div>
                </div>

                <button
                  onClick={onFreeze}
                  disabled={Object.keys(mappings).length === 0 || pipelineStatus !== 'mapped'}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {Object.keys(mappings).length === 0 
                    ? 'Complete mapping first' 
                    : pipelineStatus !== 'mapped' 
                    ? 'Waiting for mapping...'
                    : 'Freeze Template'
                  }
                </button>

                <div className="text-xs text-gray-500 text-center">
                  Freezing will modify the original DOCX file by inserting {`{{placeholders}}`} based on your mappings.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisInterface;