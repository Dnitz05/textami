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
}

const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  markdown,
  sections,
  tables,
  signatura
}) => {
  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Document Preview
        </h3>
        <p className="text-sm text-gray-600 mt-1">GPT-5 analyzed document content</p>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Markdown Content */}
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {markdown}
          </div>
        </div>

        {/* Sections Summary */}
        {sections.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-md font-medium text-gray-900 mb-3">Document Sections</h4>
            <div className="grid gap-3">
              {sections.map((section, index) => (
                <div key={section.id || index} className="bg-gray-50 rounded p-3">
                  <div className="font-medium text-gray-900 text-sm mb-1">
                    {section.title}
                  </div>
                  <div className="text-xs text-gray-600 leading-relaxed">
                    {section.markdown.substring(0, 120)}
                    {section.markdown.length > 120 && '...'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
};

export default DocumentPreviewPanel;