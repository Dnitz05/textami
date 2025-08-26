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
  
  // Function to remove document title from content to avoid duplication
  const removeDocumentTitle = (text: string): string => {
    if (!title) return text;
    
    const lines = text.split('\n');
    // Remove the first H1 header if it matches the detected title
    if (lines.length > 0 && lines[0].trim() === `# ${title}`) {
      return lines.slice(1).join('\n').replace(/^\n+/, ''); // Remove leading newlines
    }
    return text;
  };

  // Function to highlight detected tags in text
  const highlightTags = (text: string): string => {
    let highlightedText = removeDocumentTitle(text);
    
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
    <div className="bg-white border-l border-r border-gray-200">
      {/* Styles for tag highlighting and Word-like appearance */}
      <style jsx>{`
        .document-container {
          font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
          line-height: 1.6;
          color: #1f1f1f;
        }
        
        .document-page {
          background: white;
          margin: 0 auto;
          padding: 96px 72px;
          min-height: 100vh;
        }
        
        .document-title {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 28px;
          font-weight: 600;
          color: #1f1f1f;
          text-align: center;
          margin: 0 0 32px 0;
          letter-spacing: -0.5px;
        }
        
        .document-section {
          margin-bottom: 24px;
        }
        
        .document-section h2 {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #1f1f1f;
          margin: 24px 0 12px 0;
          line-height: 1.4;
        }
        
        .document-content {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 14px;
          line-height: 1.8;
          color: #1f1f1f;
          text-align: justify;
          margin-bottom: 16px;
        }
        
        .document-table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 14px;
        }
        
        .document-table th {
          background-color: #f8f9fa;
          border: 1px solid #d1d5db;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
        }
        
        .document-table td {
          border: 1px solid #d1d5db;
          padding: 12px;
          color: #1f1f1f;
        }
        
        .document-table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .document-signature {
          margin-top: 48px;
          padding: 24px;
          background: #f8f9fa;
          border: 1px solid #e5e7eb;
          text-align: center;
        }
        
        .detected-tag {
          background: rgba(59, 130, 246, 0.08);
          border: 1px dotted #3b82f6;
          border-radius: 2px;
          padding: 1px 2px;
          margin: 0 1px;
          cursor: help;
          transition: all 0.15s ease;
          display: inline;
        }
        
        .detected-tag:hover {
          background: rgba(59, 130, 246, 0.12);
          border-color: #1d4ed8;
        }
        
        .detected-tag-string {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.08);
        }
        
        .detected-tag-date {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.08);
        }
        
        .detected-tag-currency {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
        }
        
        .detected-tag-address {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.08);
        }
      `}</style>
      
      {/* Document Header with template name and actions - modern office style */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-400 px-4 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isProcessing ? (
              <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{fileName}</span>
              <span className="text-xs text-gray-500">Plantilla</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onSave && (
              <button
                onClick={onSave}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-800 bg-white hover:bg-blue-50 rounded-lg border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Desar
              </button>
            )}
            {onSaveAs && (
              <button
                onClick={onSaveAs}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-800 bg-white hover:bg-blue-50 rounded-lg border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Desar com...
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-800 bg-white hover:bg-blue-50 rounded-lg border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Tancar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Word-like Document Container */}
      <div className="bg-gray-100 min-h-screen relative">
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex items-center space-x-3 bg-blue-50 px-6 py-3 rounded-lg border border-blue-200 shadow-sm">
              <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-800 text-sm font-medium">Processant instrucció...</span>
            </div>
          </div>
        )}
        
        {/* Document Page - Word-like appearance */}
        <div className="document-container">
          <div className="document-page" style={{width: '210mm', margin: '0 auto'}}>
            {/* Document Title */}
            {title && (
              <h1 className="document-title">
                {title}
              </h1>
            )}

            {/* Document Content */}
            <div>
              {sections.length > 0 ? (
                sections.map((section, index) => (
                  <div key={section.id || index} className="document-section">
                    {section.title && (
                      <h2>{section.title}</h2>
                    )}
                    <div 
                      className="document-content"
                      dangerouslySetInnerHTML={{ __html: highlightTags(section.markdown) }}
                    />
                  </div>
                ))
              ) : (
                <div 
                  className="document-content"
                  dangerouslySetInnerHTML={{ __html: highlightTags(markdown) }}
                />
              )}
            </div>

            {/* Tables */}
            {tables.length > 0 && (
              <div className="mt-8">
                {tables.map((table, index) => (
                  <div key={table.id || index} className="document-section">
                    {table.title && (
                      <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f1f1f'}}>
                        {table.title}
                      </h3>
                    )}
                    
                    <table className="document-table">
                      <thead>
                        <tr>
                          {table.headers.map((header, idx) => (
                            <th key={idx}>
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, idx) => (
                          <tr key={idx}>
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* Signature */}
            {signatura && (
              <div className="document-signature">
                <div style={{fontFamily: 'Calibri, sans-serif', fontSize: '14px', lineHeight: '1.6'}}>
                  <div style={{fontWeight: '600', fontSize: '16px', marginBottom: '8px', color: '#1f1f1f'}}>{signatura.nom}</div>
                  <div style={{fontWeight: '500', marginBottom: '4px', color: '#374151'}}>{signatura.carrec}</div>
                  <div style={{fontSize: '13px', color: '#6b7280'}}>{signatura.data_lloc}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DocumentPreviewPanel;