'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PlaceholderSuggestion {
  text: string;
  variable: string;
  confidence: number;
  context: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
}

interface HTMLPreviewPanelProps {
  htmlContent: string;
  placeholders: PlaceholderSuggestion[];
  onPlaceholdersUpdate?: (placeholders: PlaceholderSuggestion[]) => void;
  isEditable?: boolean;
}

export function HTMLPreviewPanel({ 
  htmlContent, 
  placeholders = [], 
  onPlaceholdersUpdate,
  isEditable = false 
}: HTMLPreviewPanelProps) {
  const [highlightedContent, setHighlightedContent] = useState(htmlContent);
  const [selectedPlaceholders, setSelectedPlaceholders] = useState<PlaceholderSuggestion[]>(placeholders);

  useEffect(() => {
    // Highlight placeholders in HTML content
    let content = htmlContent;
    
    selectedPlaceholders.forEach((placeholder, index) => {
      const highlightClass = `placeholder-highlight confidence-${Math.floor(placeholder.confidence / 20)}`;
      const regex = new RegExp(`\\b${escapeRegex(placeholder.text)}\\b`, 'gi');
      
      content = content.replace(regex, 
        `<span class="${highlightClass}" data-placeholder-id="${index}" title="Variable: {{${placeholder.variable}}} (${placeholder.confidence}% confidence)">${placeholder.text}</span>`
      );
    });
    
    setHighlightedContent(content);
  }, [htmlContent, selectedPlaceholders]);

  const escapeRegex = (string: string) => {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  };

  const togglePlaceholder = (index: number) => {
    if (!isEditable) return;
    
    const updated = [...selectedPlaceholders];
    // Remove placeholder if it exists, otherwise this would be handled by parent
    setSelectedPlaceholders(updated);
    onPlaceholdersUpdate?.(updated);
  };

  const updatePlaceholderVariable = (index: number, newVariable: string) => {
    if (!isEditable) return;
    
    const updated = [...selectedPlaceholders];
    updated[index] = { ...updated[index], variable: newVariable };
    setSelectedPlaceholders(updated);
    onPlaceholdersUpdate?.(updated);
  };

  return (
    <div className="space-y-6">
      {/* HTML Preview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Vista Prèvia HTML</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedPlaceholders.length} variables detectades
            </span>
          </div>
        </div>
        
        <div className="border rounded-lg p-4 bg-white overflow-auto max-h-96">
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </div>
        
        <style jsx>{`
          .placeholder-highlight {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .placeholder-highlight:hover {
            background-color: #fde68a;
            border-color: #d97706;
          }
          .confidence-5 { border-color: #10b981; background-color: #d1fae5; }
          .confidence-4 { border-color: #f59e0b; background-color: #fef3c7; }
          .confidence-3 { border-color: #ef4444; background-color: #fee2e2; }
          .confidence-2 { border-color: #6b7280; background-color: #f3f4f6; }
          .confidence-1 { border-color: #6b7280; background-color: #f9fafb; }
        `}</style>
      </Card>

      {/* Placeholder Management */}
      {isEditable && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Variables Detectades</h3>
          
          <div className="space-y-3">
            {selectedPlaceholders.map((placeholder, index) => (
              <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{placeholder.text}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      placeholder.confidence >= 80 ? 'bg-green-100 text-green-800' :
                      placeholder.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {placeholder.confidence}% confiança
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                      {placeholder.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{placeholder.context}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{'{{'}}</span>
                  <input
                    type="text"
                    value={placeholder.variable}
                    onChange={(e) => updatePlaceholderVariable(index, e.target.value)}
                    className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="nom_variable"
                  />
                  <span className="text-sm text-gray-500">{'}}'}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePlaceholder(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Eliminar
                </Button>
              </div>
            ))}
            
            {selectedPlaceholders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No s'han detectat variables automàticament.</p>
                <p className="text-sm">Pots afegir variables manualment més tard.</p>
              </div>
            )}
          </div>
          
          {selectedPlaceholders.length > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <strong>Llegenda:</strong>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">80%+ Alta confiança</span>
                <span className="ml-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">60-79% Mitjana</span>
                <span className="ml-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs">&lt;60% Baixa</span>
              </div>
              
              <Button variant="outline" size="sm">
                + Afegir Variable Manual
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}