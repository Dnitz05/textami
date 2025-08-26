// components/analysis/DocumentPreviewPanel.tsx
// Panel 1: Document Preview with markdown content
import React from 'react';
import { ParsedSection, ParsedTable } from '../../lib/types';

interface DocumentSignature {
  nom: string;
  carrec: string;
  data_lloc: string;
}

interface DocumentPreviewPanelProps {
  title?: string;
  markdown: string;
  sections: ParsedSection[];
  tables: ParsedTable[];
  tags?: any[];
  signatura?: DocumentSignature;
  isProcessing?: boolean;
  fileName?: string;
  onSave?: () => void;
  onSaveAs?: () => void;
  onClose?: () => void;
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  title,
  markdown,
  sections,
  tables,
  tags = [],
  signatura,
  isProcessing = false,
  fileName = 'Document.pdf',
  onSave,
  onSaveAs,
  onClose
}) => {
  
  // Function to highlight detected tags in text
  const highlightTags = (text: string): string => {
    let highlightedText = text;
    
    // Sort tags by example length (longest first to avoid partial replacements)
    const sortedTags = [...tags].sort((a, b) => (b.example?.length || 0) - (a.example?.length || 0));
    
    sortedTags.forEach((tag, index) => {
      if (tag.example && tag.example.trim()) {
        const example = tag.example.trim();
        // Create a unique class for each tag type
        const tagClass = `detected-tag detected-tag-${tag.type} detected-tag-${index}`;
        
        // Replace with highlighted version (case-insensitive, whole word)
        const regex = new RegExp(`\\b${example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        highlightedText = highlightedText.replace(regex, `<span class="${tagClass}" title="${tag.name} (${tag.type})">${example}</span>`);
      }
    });
    
    return highlightedText;
  };
  return (
    <div className="bg-white rounded-lg shadow border">
      {/* Styles for tag highlighting */}
      <style jsx>{`
        .detected-tag {
          background: linear-gradient(120deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
          border: 2px dotted #3b82f6;
          border-radius: 4px;
          padding: 1px 3px;
          margin: 0 1px;
          cursor: help;
          transition: all 0.2s ease;
          display: inline-block;
        }
        
        .detected-tag:hover {
          background: linear-gradient(120deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
          border-color: #1d4ed8;
          transform: scale(1.02);
        }
        
        .detected-tag-string {
          border-color: #10b981;
          background: linear-gradient(120deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%);
        }
        
        .detected-tag-date {
          border-color: #f59e0b;
          background: linear-gradient(120deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%);
        }
        
        .detected-tag-currency {
          border-color: #ef4444;
          background: linear-gradient(120deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.1) 100%);
        }
        
        .detected-tag-address {
          border-color: #8b5cf6;
          background: linear-gradient(120deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
        }
      `}</style>
      
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            {isProcessing ? (
              <svg className="animate-spin w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {fileName}
          </h3>
          <p className="text-sm text-gray-500 mt-1">Plantilla</p>
        </div>
        
        <div className="flex gap-2">
          {onSave && (
            <button
              onClick={onSave}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              💾 Desar
            </button>
          )}
          {onSaveAs && (
            <button
              onClick={onSaveAs}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              💾 Desar com...
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
            >
              ✕ Tancar
            </button>
          )}
        </div>
      </div>

      <div className={`p-6 relative ${isProcessing ? 'opacity-60' : ''}`}>
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-lg border border-purple-200">
              <svg className="animate-spin w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-purple-800 text-sm font-medium">Processant instrucció...</span>
            </div>
          </div>
        )}
        
        {/* Document Title */}
        {title && (
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 uppercase tracking-wide">
              {title}
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
          </div>
        )}

        {/* Document Content - Visual Sections in Original Order */}
        <div className="space-y-6">
          {sections.length > 0 ? (
            sections.map((section, index) => (
              <div key={section.id || index} className="">
                {section.title && (
                  <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                    {section.title}
                  </h2>
                )}
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightTags(section.markdown) }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="prose prose-sm max-w-none">
              <div 
                className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightTags(markdown) }}
              />
            </div>
          )}
        </div>

        {/* Tables */}
        {tables.length > 0 && (
          <div className="mt-8 space-y-6">
            {tables.map((table, index) => (
              <div key={table.id || index} className="">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {table.title}
                </h3>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {table.headers.map((header, idx) => (
                            <th key={idx} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-200">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {table.rows.map((row, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="px-4 py-3 text-sm text-gray-800">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Signature */}
        {signatura && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Signatura del Document
              </h4>
              <div className="text-base">
                <div className="font-bold text-blue-900 text-lg mb-1">{signatura.nom}</div>
                <div className="text-blue-800 font-medium mb-2">{signatura.carrec}</div>
                <div className="text-blue-700 text-sm">{signatura.data_lloc}</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default DocumentPreviewPanel;