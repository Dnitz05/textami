// components/analysis/DocumentPreviewPanel.tsx
// Panel 1: Document Preview with markdown content
import React, { useState, useEffect } from 'react';
import { ParsedSection, ParsedTable } from '../../lib/types';
import { log } from '../../lib/logger';
import { useMapping } from '../../contexts/MappingContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTagHighlighting } from '../../hooks/useTagHighlighting';
import DocumentSection from './DocumentSection';

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
  mappedTags?: Record<string, string>; // header -> tagSlug mappings
  onMappingRemove?: (header: string) => void; // Callback to remove mapping
  onSectionClick?: (section: ParsedSection, index: number) => void; // Callback when section clicked
  onSectionEdit?: (section: ParsedSection, index: number) => void; // Callback when section edit clicked
  modifiedSections?: Record<string, string>; // sectionTitle -> modifiedContent
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
  onClose,
  mappedTags = {},
  onMappingRemove,
  onSectionClick,
  onSectionEdit,
  modifiedSections = {}
}) => {
  // Use mapping context instead of local state
  const {
    isManualMappingActive,
    activeManualHeader,
    manualTextMappings,
    manualTagInfo,
    handleTextSelection: contextHandleTextSelection
  } = useMapping();

  // Use custom hooks for complex logic
  const { displayTitle, cleanedText } = useDocumentTitle({ title, fileName, markdown });
  const { highlightTags, headerColors } = useTagHighlighting({ 
    tags, 
    mappedTags, 
    manualTextMappings, 
    manualTagInfo 
  });

  // Track if content has been modified by AI instructions
  const [originalMarkdown] = useState(markdown); // Store original to compare
  const isContentModified = markdown !== originalMarkdown;
  const hasSectionModifications = Object.keys(modifiedSections).length > 0;

  // Handle text selection for manual mapping
  const handleTextSelection = () => {
    if (isManualMappingActive && activeManualHeader) {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim();
      
      if (selectedText && selectedText.length > 0) {
        // Use Context API instead of CustomEvents
        contextHandleTextSelection(selectedText, mappedTags);
        
        // Clear selection
        selection?.removeAllRanges();
      }
    }
  };
  
  // Note: All complex logic moved to custom hooks for better separation of concerns

  // Development-only debugging
  log.debug('DocumentPreviewPanel initialized', {
    title,
    fileName,
    displayTitle,
    mappedTagsCount: Object.keys(mappedTags).length,
    sectionsCount: sections.length
  });


  // Handle clicks on mapped terms to remove them
  React.useEffect(() => {
    const handleMappedTermClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mappedTerm = target.closest('.mapped-term');
      if (mappedTerm && onMappingRemove) {
        const excelHeader = mappedTerm.parentElement?.getAttribute('data-excel-header');
        if (excelHeader) {
          log.debug('Removing mapping for header', { excelHeader });
          onMappingRemove(excelHeader);
        }
      }
    };

    document.addEventListener('click', handleMappedTermClick);
    return () => document.removeEventListener('click', handleMappedTermClick);
  }, [onMappingRemove]);

  return (
    <div className="bg-white">
      {/* Styles for tag highlighting and Word-like appearance */}
      <style jsx>{`
        .document-container {
          font-family: 'Inter', 'Segoe UI', 'Arial', sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: white;
          min-height: 100vh;
        }
        
        .document-page {
          background: white;
          margin: 0;
          padding: 2.54cm 2.54cm 2.54cm 2.54cm; /* Marges Word estàndard: 1 inch */
          min-height: calc(100vh - 80px);
          width: 100%;
          box-sizing: border-box;
        }
        
        /* TÍTOL PRINCIPAL - Estil modern */
        .document-title {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 18pt;
          font-weight: 600;
          color: #1a1a1a;
          text-align: center;
          text-transform: none;
          margin: 0 0 32pt 0;
          padding: 20pt 24pt 24pt 24pt;
          background: rgba(248, 250, 252, 0.4);
          border: 1px solid rgba(226, 232, 240, 0.3);
          border-radius: 0px;
          letter-spacing: -0.2pt;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        
        /* SECCIONS - Estil modern amb caixes subtils */
        .document-section {
          margin-bottom: 24pt;
          page-break-inside: avoid;
          background: rgba(248, 250, 252, 0.2);
          border: 1px solid rgba(226, 232, 240, 0.2);
          border-radius: 0px;
          padding: 18pt 20pt;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .document-section:hover {
          background: rgba(59, 130, 246, 0.03);
          border-color: rgba(59, 130, 246, 0.2);
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.1);
        }
        
        .section-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          gap: 4px;
        }
        
        .document-section:hover .section-actions {
          opacity: 1;
        }
        
        .section-action-btn {
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 500;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.95);
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }
        
        .btn-edit {
          color: #059669;
          border-color: #059669;
        }
        
        .btn-edit:hover {
          background: #059669;
          color: white;
        }
        
        .btn-instruction {
          color: #3B82F6;
          border-color: #3B82F6;
        }
        
        .btn-instruction:hover {
          background: #3B82F6;
          color: white;
        }
        
        .document-section h2 {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 15pt;
          font-weight: 600;
          color: #0f172a;
          margin: 0 0 16pt 0;
          padding: 0 0 8pt 0;
          border: none;
          background: none;
          text-transform: none;
          text-align: left;
          border-bottom: 1px solid rgba(226, 232, 240, 0.4);
          letter-spacing: -0.1pt;
        }
        
        .document-section h3 {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 13pt;
          font-weight: 500;
          color: #334155;
          margin: 14pt 0 8pt 0;
          text-decoration: none;
          letter-spacing: -0.05pt;
        }
        
        /* CONTINGUT - Estil modern llegible */
        .document-content {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #374151;
          text-align: left;
          margin-bottom: 0;
          text-indent: 0;
          font-weight: 400;
          letter-spacing: -0.01pt;
        }
        
        
        .document-footer {
          margin-top: 48pt;
          text-align: center;
          font-size: 8pt;
          color: #94a3b8;
          border-top: 1px solid rgba(226, 232, 240, 0.4);
          padding-top: 16pt;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-weight: 400;
        }
        
        .document-content p {
          margin-bottom: 12pt;
        }
        
        .document-content ul, .document-content ol {
          margin: 6pt 0;
          padding-left: 24pt;
        }
        
        .document-content li {
          margin-bottom: 3pt;
        }
        
        /* TAULES - Estil modern subtil */
        .document-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20pt 0;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 10pt;
          background: rgba(248, 250, 252, 0.1);
          border: 1px solid rgba(226, 232, 240, 0.3);
          border-radius: 0px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        
        .document-table th {
          background: rgba(248, 250, 252, 0.6);
          color: #0f172a;
          border: none;
          border-bottom: 1px solid rgba(226, 232, 240, 0.4);
          padding: 12pt 16pt;
          text-align: left;
          font-weight: 600;
          font-size: 10pt;
          text-transform: none;
          letter-spacing: -0.01pt;
        }
        
        .document-table td {
          border: none;
          border-bottom: 1px solid rgba(226, 232, 240, 0.2);
          padding: 10pt 16pt;
          color: #374151;
          vertical-align: top;
        }
        
        .document-table tr:nth-child(even) {
          background-color: rgba(248, 250, 252, 0.2);
        }
        
        .document-table tr:hover {
          background-color: rgba(248, 250, 252, 0.4);
        }
        
        /* SIGNATURA - Estil modern elegant */
        .document-signature {
          margin-top: 48pt;
          padding: 20pt 24pt;
          background: rgba(248, 250, 252, 0.3);
          border: 1px solid rgba(226, 232, 240, 0.3);
          border-radius: 0px;
          text-align: center;
          page-break-inside: avoid;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
        }
        
        .document-signature-name {
          font-size: 13pt;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 8pt;
          text-transform: none;
          letter-spacing: -0.02pt;
        }
        
        .document-signature-title {
          font-size: 11pt;
          font-weight: 400;
          color: #334155;
          margin-bottom: 6pt;
        }
        
        .document-signature-date {
          font-size: 9pt;
          color: #64748b;
          font-style: normal;
        }
        
        /* TAGS DETECTATS - Estil bàsic */
        .detected-tag {
          background: rgba(59, 130, 246, 0.08);
          border: 1px dotted #3b82f6;
          border-radius: 0px;
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
        
        /* SISTEMA VISUAL DE MAPATGES */
        .visual-mapping-container {
          position: relative;
          display: inline-block;
          margin: 0 4px;
        }
        
        .mapped-term {
          display: inline-block;
          padding: 3px 8px;
          border: 2px solid;
          border-radius: 0px;
          font-weight: 600;
          position: relative;
          transition: all 0.3s ease;
          cursor: pointer;
          text-decoration: none;
        }
        
        .mapped-term:hover {
          opacity: 0.7;
          transform: scale(0.95);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        
        /* LLEGENDA DE MAPATGES - Estil modern */
        .mapping-legend {
          margin: 32pt 0;
          padding: 20pt 24pt;
          background: rgba(248, 250, 252, 0.3);
          border: 1px solid rgba(226, 232, 240, 0.3);
          border-radius: 0px;
          page-break-inside: avoid;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
        }
        
        .legend-items {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          background: white;
          padding: 8px 12px;
          border-radius: 0px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }
        
        .legend-item:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 0px;
          margin-right: 8px;
          border: 2px solid white;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        }
        
        .legend-text {
          font-size: 9pt;
          font-weight: 600;
          color: #2d3748;
          margin-right: 6px;
        }
        
        .legend-count {
          background: #4a5568;
          color: white;
          padding: 2px 6px;
          border-radius: 0px;
          font-size: 8pt;
          font-weight: 600;
          margin-left: auto;
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
      
      {/* Document Header - Clean technical style */}
      <div className="bg-white border-b border-gray-300 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isProcessing ? (
              <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">{fileName}</span>
              <span className="text-xs text-gray-500">Plantilla</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {onSave && (
              <button
                onClick={onSave}
                className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-white hover:bg-blue-50  border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Desar
              </button>
            )}
            <button
              className="flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700  border border-green-600 hover:border-green-700 transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generar
            </button>
            {onSaveAs && (
              <button
                onClick={onSaveAs}
                className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-white hover:bg-blue-50  border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Desar com...
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-white hover:bg-blue-50  border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Tancar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Container - Technical Clean */}
      <div className="bg-white min-h-screen relative">
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="flex items-center space-x-3 bg-blue-50 px-6 py-3 -lg border border-blue-200 shadow-sm">
              <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-blue-800 text-sm font-medium">Processant instrucció...</span>
            </div>
          </div>
        )}
        
        {/* Document Page - Technical surgical report appearance */}
        <div className="document-container bg-transparent">
          <div 
            className="document-page bg-white" 
            style={{
              width: '100%', 
              maxWidth: '100%', 
              margin: '0', 
              boxShadow: 'none', 
              border: 'none',
              cursor: isManualMappingActive ? 'crosshair' : 'default'
            }}
            onMouseUp={handleTextSelection}
            onClick={handleTextSelection}
          >
            {isManualMappingActive && (
              <div className="bg-orange-100 border border-orange-300 -lg p-3 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
                </svg>
                <div className="text-orange-800">
                  <div className="font-medium">Mode mapatge manual actiu</div>
                  <div className="text-sm">Selecciona el text que vols mapejsar amb <strong>"{activeManualHeader}"</strong></div>
                </div>
              </div>
            )}
            
            

            {/* Document Content */}
            <div>
              {hasSectionModifications || sections.length > 0 ? (
                // Show sections with selective modifications
                sections.map((section, index) => {
                  const sectionId = section.id || section.title || `section_${index}`;
                  const modifiedContent = modifiedSections[sectionId];
                  const isModified = Boolean(modifiedContent);
                  
                  return (
                    <DocumentSection
                      key={section.id || index}
                      section={section}
                      index={index}
                      modifiedContent={modifiedContent}
                      isModified={isModified}
                      onSectionClick={onSectionClick}
                      onSectionEdit={onSectionEdit}
                      highlightTags={highlightTags}
                    />
                  );
                })
              ) : isContentModified ? (
                // Show modified content for global changes
                <div className="document-section">
                  <div className="section-actions">
                    <div className="text-xs text-blue-600 font-medium flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Contingut modificat per IA
                    </div>
                  </div>
                  <div 
                    className="document-content"
                    dangerouslySetInnerHTML={{ __html: highlightTags(markdown) }}
                  />
                </div>
              ) : (
                // Show original clean content
                <div 
                  className="document-content"
                  dangerouslySetInnerHTML={{ __html: highlightTags(cleanedText) }}
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
                <div className="document-signature-name">{signatura.nom}</div>
                <div className="document-signature-title">{signatura.carrec}</div>
                <div className="document-signature-date">{signatura.data_lloc}</div>
              </div>
            )}
            
            {/* Visual Mapping Legend */}
            {Object.keys(mappedTags).length > 0 && (
              <div className="mapping-legend">
                <h4 style={{fontSize: '10pt', fontWeight: '600', marginBottom: '10px', color: '#4a5568'}}>
                  Mapeig de Dades Excel
                </h4>
                <div className="legend-items">
                  {Object.keys(mappedTags).map((header, index) => (
                    <div key={header} className="legend-item">
                      <div 
                        className="legend-color" 
                        style={{backgroundColor: headerColors[header]}}
                      ></div>
                      <span className="legend-text">{header}</span>
                      <span className="legend-count">
                        {Object.values(mappedTags).filter(slug => 
                          tags.find(t => t.slug === slug && mappedTags[header] === slug)
                        ).length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Footer */}
            <div className="document-footer">
              Generat amb Textami • {new Date().toLocaleDateString('ca-ES')} • Pàgina 1
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DocumentPreviewPanel;