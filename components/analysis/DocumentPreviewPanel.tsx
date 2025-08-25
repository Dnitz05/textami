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
  markdown: string;
  sections: ParsedSection[];
  tables: ParsedTable[];
  signatura?: DocumentSignature;
  isProcessing?: boolean;
  fileName?: string;
  onSave?: () => void;
  onSaveAs?: () => void;
  onClose?: () => void;
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  markdown,
  sections,
  tables,
  signatura,
  isProcessing = false,
  fileName = 'Document.pdf',
  onSave,
  onSaveAs,
  onClose
}) => {
  return (
    <div className="bg-white rounded-lg shadow border">
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
        
        {/* Markdown Content - Main Document */}
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {markdown}
          </div>
        </div>

        {/* Tables Summary */}
        {tables.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-md font-medium text-gray-900 mb-3">Document Tables</h4>
            <div className="space-y-4">
              {tables.map((table, index) => (
                <div key={table.id || index} className="bg-gray-50 rounded p-3">
                  <div className="font-medium text-gray-900 text-sm mb-2">
                    {table.title}
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-300">
                          {table.headers.map((header, idx) => (
                            <th key={idx} className="text-left py-1 px-2 font-medium text-gray-700">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-b border-gray-200">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="py-1 px-2 text-gray-600">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {table.rows.length > 3 && (
                          <tr>
                            <td colSpan={table.headers.length} className="py-1 px-2 text-gray-500 italic text-center">
                              +{table.rows.length - 3} more rows...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        {signatura && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-md font-medium text-gray-900 mb-3">Document Signature</h4>
            <div className="bg-blue-50 rounded p-3">
              <div className="text-sm">
                <div className="font-medium text-blue-900">{signatura.nom}</div>
                <div className="text-blue-700">{signatura.carrec}</div>
                <div className="text-blue-600 text-xs mt-1">{signatura.data_lloc}</div>
              </div>
            </div>
          </div>
        )}

        {/* Debug: Sections breakdown - only show if needed for troubleshooting */}
        {sections.length > 0 && process.env.NODE_ENV === 'development' && (
          <details className="mt-6 pt-6 border-t">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
              Debug: Sections breakdown ({sections.length} sections)
            </summary>
            <div className="mt-3 space-y-2">
              {sections.map((section, index) => (
                <div key={section.id || index} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <div className="text-xs font-medium text-yellow-800 mb-1">
                    Section: {section.title}
                  </div>
                  <div className="text-xs text-yellow-700 leading-relaxed max-h-20 overflow-y-auto">
                    {section.markdown}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default DocumentPreviewPanel;