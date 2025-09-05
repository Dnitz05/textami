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
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.15;
            color: #000;
            background: white;
            padding: 1in;
            max-width: 8.5in;
            margin: 0 auto;
            min-height: 11in;
          }

          /* Remove unwanted horizontal lines and borders */
          .google-docs-content hr {
            display: none !important;
          }

          .google-docs-content::before,
          .google-docs-content::after {
            display: none !important;
          }

          /* Clean initial borders */
          .google-docs-content > *:first-child {
            border-top: none !important;
          }

          /* Header styles with proper hierarchy matching Google Docs */
          .google-docs-content h1 {
            font-size: 20pt;
            font-weight: 400;
            color: #000;
            margin: 20pt 0 6pt 0;
            line-height: 1.15;
            page-break-after: avoid;
            font-family: 'Times New Roman', Times, serif;
          }

          .google-docs-content h2 {
            font-size: 16pt;
            font-weight: 400;
            color: #000;
            margin: 18pt 0 6pt 0;
            line-height: 1.15;
            page-break-after: avoid;
            font-family: 'Times New Roman', Times, serif;
          }

          .google-docs-content h3 {
            font-size: 14pt;
            font-weight: 400;
            color: #000;
            margin: 16pt 0 4pt 0;
            line-height: 1.15;
            page-break-after: avoid;
            font-family: 'Times New Roman', Times, serif;
          }

          .google-docs-content h4 {
            font-size: 12pt;
            font-weight: 400;
            color: #000;
            margin: 14pt 0 4pt 0;
            line-height: 1.15;
            page-break-after: avoid;
            font-family: 'Times New Roman', Times, serif;
          }

          .google-docs-content h5 {
            font-size: 11pt;
            font-weight: 400;
            color: #000;
            margin: 12pt 0 4pt 0;
            line-height: 1.15;
            font-family: 'Times New Roman', Times, serif;
          }

          .google-docs-content h6 {
            font-size: 11pt;
            font-weight: 400;
            color: #666666;
            margin: 12pt 0 4pt 0;
            line-height: 1.15;
            font-style: italic;
            font-family: 'Times New Roman', Times, serif;
          }

          /* Paragraph styles matching Google Docs default */
          .google-docs-content p {
            margin: 0pt 0pt 8pt 0pt;
            line-height: 1.15;
            font-size: 11pt;
            font-family: 'Times New Roman', Times, serif;
            color: #000;
          }

          /* Preserve original Google Docs spacing classes */
          .google-docs-content .c0 { margin: 0pt 0pt 0pt 0pt; line-height: 1.15; }
          .google-docs-content .c1 { margin: 0pt 0pt 8pt 0pt; line-height: 1.15; }
          .google-docs-content .c2 { margin: 0pt 0pt 12pt 0pt; line-height: 1.15; }
          .google-docs-content .c3 { margin: 0pt 0pt 16pt 0pt; line-height: 1.15; }
          .google-docs-content .c4 { margin: 0pt 0pt 20pt 0pt; line-height: 1.15; }

          /* Bold text preservation */
          .google-docs-content strong,
          .google-docs-content b,
          .google-docs-content .c5,
          .google-docs-content .c6 {
            font-weight: 700;
          }

          /* Italic text preservation */
          .google-docs-content em,
          .google-docs-content i,
          .google-docs-content .c7 {
            font-style: italic;
          }

          /* Underlined text */
          .google-docs-content u,
          .google-docs-content .c8 {
            text-decoration: underline;
          }

          /* Table styles matching Google Docs exactly */
          .google-docs-content table {
            border-collapse: collapse;
            border-spacing: 0;
            width: 100%;
            margin: 9pt 0pt 9pt 0pt;
            border: 1px solid #000;
            table-layout: fixed;
          }

          .google-docs-content td,
          .google-docs-content th {
            border: 1px solid #000;
            padding: 5pt 5pt 5pt 5pt;
            text-align: left;
            vertical-align: top;
            line-height: 1.15;
            font-size: 11pt;
            font-family: 'Times New Roman', Times, serif;
          }

          .google-docs-content th {
            background-color: transparent;
            font-weight: 400;
          }

          /* Handle Google Docs specific table classes */
          .google-docs-content .c9 td,
          .google-docs-content .c10 td {
            padding: 7pt 7pt 7pt 7pt;
          }

          .google-docs-content .c11 {
            border: 1px solid #000;
          }

          /* List styles matching Google Docs */
          .google-docs-content ul {
            margin: 0pt 0pt 0pt 0pt;
            padding: 0pt 0pt 0pt 48pt;
            list-style-type: disc;
          }

          .google-docs-content ol {
            margin: 0pt 0pt 0pt 0pt;
            padding: 0pt 0pt 0pt 48pt;
            list-style-type: decimal;
          }

          .google-docs-content li {
            margin: 0pt 0pt 8pt 0pt;
            line-height: 1.15;
            font-size: 11pt;
            font-family: 'Times New Roman', Times, serif;
          }

          /* Text alignment classes from Google Docs */
          .google-docs-content .c12 { text-align: left; }
          .google-docs-content .c13 { text-align: center; }
          .google-docs-content .c14 { text-align: right; }
          .google-docs-content .c15 { text-align: justify; }

          /* Font size classes from Google Docs */
          .google-docs-content .c16 { font-size: 8pt; }
          .google-docs-content .c17 { font-size: 9pt; }
          .google-docs-content .c18 { font-size: 10pt; }
          .google-docs-content .c19 { font-size: 11pt; }
          .google-docs-content .c20 { font-size: 12pt; }
          .google-docs-content .c21 { font-size: 14pt; }
          .google-docs-content .c22 { font-size: 16pt; }
          .google-docs-content .c23 { font-size: 18pt; }
          .google-docs-content .c24 { font-size: 20pt; }
          .google-docs-content .c25 { font-size: 24pt; }

          /* Font family classes */
          .google-docs-content .c26 { font-family: Arial; }
          .google-docs-content .c27 { font-family: 'Times New Roman'; }
          .google-docs-content .c28 { font-family: 'Calibri'; }
          .google-docs-content .c29 { font-family: 'Georgia'; }

          /* Signature and footer sections */
          .google-docs-content .signature,
          .google-docs-content .footer {
            margin-top: 36pt;
            padding-top: 18pt;
            border-top: none;
          }

          /* Indentation classes */
          .google-docs-content .c30 { margin-left: 36pt; }
          .google-docs-content .c31 { margin-left: 72pt; }
          .google-docs-content .c32 { margin-left: 108pt; }

          /* Placeholder highlighting - keep existing styles */
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

          /* Page break handling */
          .google-docs-content .page-break {
            page-break-before: always;
            margin-top: 0;
            padding-top: 0;
          }

          /* Remove unwanted breaks and clean artifacts */
          .google-docs-content br:first-child,
          .google-docs-content p:first-child br:first-child {
            display: none;
          }

          /* Clean document structure */
          .google-docs-content > p:first-child {
            margin-top: 0pt;
          }

          .google-docs-content > *:last-child {
            margin-bottom: 0pt;
          }

          /* Handle Google Docs span elements */
          .google-docs-content span {
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            line-height: inherit;
          }

          /* Remove any default styling from divs */
          .google-docs-content div {
            margin: 0;
            padding: 0;
          }

          /* Clean up any leftover HTML artifacts */
          .google-docs-content *[style*="border-top"],
          .google-docs-content *[style*="border: 1pt solid transparent"] {
            border-top: none !important;
          }
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