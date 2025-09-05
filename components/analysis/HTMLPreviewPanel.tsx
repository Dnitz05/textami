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
        
        <div className="border rounded-lg p-6 bg-white overflow-auto max-h-96">
          <div 
            className="google-docs-content"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </div>
        
        <style jsx>{`
          .google-docs-content {
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background: white;
            padding: 24px;
            margin: 0 auto;
          }

          /* 1. REMOVE UNWANTED TOP LINE/BORDER */
          .google-docs-content hr {
            display: none !important;
          }

          .google-docs-content::before,
          .google-docs-content::after {
            display: none !important;
          }

          .google-docs-content > *:first-child {
            border-top: none !important;
            margin-top: 0 !important;
            padding-top: 0 !important;
          }

          .google-docs-content *[style*="border-top"],
          .google-docs-content *[style*="border: 1pt solid transparent"] {
            border-top: none !important;
          }

          /* 2. PROPER SPACING BETWEEN ELEMENTS */
          .google-docs-content h1 {
            font-size: 24px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin: 32px 0 16px 0 !important;
            line-height: 1.2 !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          .google-docs-content h2 {
            font-size: 20px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin: 28px 0 14px 0 !important;
            line-height: 1.3 !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          .google-docs-content h3 {
            font-size: 18px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin: 24px 0 12px 0 !important;
            line-height: 1.4 !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          .google-docs-content h4 {
            font-size: 16px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin: 20px 0 10px 0 !important;
            line-height: 1.4 !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          .google-docs-content h5 {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: #1f2937 !important;
            margin: 18px 0 8px 0 !important;
            line-height: 1.4 !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          .google-docs-content h6 {
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #6b7280 !important;
            margin: 16px 0 6px 0 !important;
            line-height: 1.4 !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          /* 3. PROPER PARAGRAPH SPACING */
          .google-docs-content p {
            margin: 0 0 16px 0 !important;
            line-height: 1.6 !important;
            font-size: 14px !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
            color: #374151 !important;
          }

          .google-docs-content p:last-child {
            margin-bottom: 0 !important;
          }

          /* 4. SECTION SPACING */
          .google-docs-content div + h1,
          .google-docs-content div + h2,
          .google-docs-content div + h3,
          .google-docs-content div + h4,
          .google-docs-content div + h5,
          .google-docs-content div + h6 {
            margin-top: 40px !important;
          }

          .google-docs-content p + h1,
          .google-docs-content p + h2,
          .google-docs-content p + h3,
          .google-docs-content p + h4,
          .google-docs-content p + h5,
          .google-docs-content p + h6 {
            margin-top: 40px !important;
          }

          /* 5. PRESERVE BOLD TEXT */
          .google-docs-content strong,
          .google-docs-content b,
          .google-docs-content span[style*="font-weight:700"],
          .google-docs-content span[style*="font-weight: 700"],
          .google-docs-content span[style*="font-weight:bold"],
          .google-docs-content span[style*="font-weight: bold"] {
            font-weight: 700 !important;
          }

          /* 6. PRESERVE ITALIC TEXT */
          .google-docs-content em,
          .google-docs-content i,
          .google-docs-content span[style*="font-style:italic"],
          .google-docs-content span[style*="font-style: italic"] {
            font-style: italic !important;
          }

          /* 7. PRESERVE UNDERLINED TEXT */
          .google-docs-content u,
          .google-docs-content span[style*="text-decoration:underline"],
          .google-docs-content span[style*="text-decoration: underline"] {
            text-decoration: underline !important;
          }

          /* 8. IMPROVED TABLE STYLES */
          .google-docs-content table {
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            width: 100% !important;
            margin: 24px 0 24px 0 !important;
            border: 1px solid #d1d5db !important;
            background: white !important;
          }

          .google-docs-content td,
          .google-docs-content th {
            border: 1px solid #d1d5db !important;
            padding: 12px 16px !important;
            text-align: left !important;
            vertical-align: top !important;
            line-height: 1.5 !important;
            font-size: 14px !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          .google-docs-content th {
            background-color: #f9fafb !important;
            font-weight: 600 !important;
            color: #374151 !important;
          }

          /* 9. LIST STYLES WITH PROPER SPACING */
          .google-docs-content ul,
          .google-docs-content ol {
            margin: 16px 0 16px 0 !important;
            padding: 0 0 0 24px !important;
          }

          .google-docs-content li {
            margin: 8px 0 !important;
            line-height: 1.6 !important;
            font-size: 14px !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          }

          /* 10. IMAGE SUPPORT */
          .google-docs-content img {
            max-width: 100% !important;
            height: auto !important;
            margin: 16px 0 !important;
            border-radius: 4px !important;
          }

          /* 11. CLEAN UP GOOGLE DOCS ARTIFACTS */
          .google-docs-content div {
            margin: 0 !important;
            padding: 0 !important;
          }

          .google-docs-content span {
            font-family: inherit !important;
            font-size: inherit !important;
            color: inherit !important;
            line-height: inherit !important;
          }

          /* 12. SIGNATURE AND FOOTER SPACING */
          .google-docs-content .signature,
          .google-docs-content .footer {
            margin-top: 48px !important;
            padding-top: 24px !important;
            border-top: 1px solid #e5e7eb !important;
          }

          /* Placeholder highlighting */
          .placeholder-highlight {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
            padding: 1px 2px;
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
                  <span className="text-sm text-gray-500">{'{{'}</span>
                  <input
                    type="text"
                    value={placeholder.variable}
                    onChange={(e) => updatePlaceholderVariable(index, e.target.value)}
                    className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="nom_variable"
                  />
                  <span className="text-sm text-gray-500">{'}'}</span>
                </div>
                
                <Button
                  variant="secondary"
                  onClick={() => togglePlaceholder(index)}
                  className="text-red-600 hover:text-red-800 text-sm px-2 py-1"
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
              
              <Button variant="secondary" className="text-sm px-3 py-1">
                + Afegir Variable Manual
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}