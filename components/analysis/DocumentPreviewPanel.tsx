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
  mappedTags?: Record<string, string>; // header -> tagSlug mappings
  onMappingRemove?: (header: string) => void; // Callback to remove mapping
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
  onMappingRemove
}) => {
  
  // Extract title from markdown if title/fileName are not provided
  const extractTitleFromMarkdown = (text: string): { extractedTitle: string, cleanedText: string } => {
    const lines = text.split('\n');
    if (lines.length > 0 && lines[0].startsWith('# ')) {
      const extractedTitle = lines[0].replace('# ', '').trim();
      const cleanedText = lines.slice(1).join('\n').replace(/^\n+/, '');
      return { extractedTitle, cleanedText };
    }
    return { extractedTitle: '', cleanedText: text };
  };
  
  // Get the final title to display
  const getDisplayTitle = (): string => {
    if (fileName) return fileName.replace(/\.[^/.]+$/, '');
    if (title) return title;
    
    // Extract from markdown if no title/fileName provided
    const { extractedTitle } = extractTitleFromMarkdown(markdown);
    return extractedTitle;
  };
  
  // Function to remove document title from content to avoid duplication
  const removeDocumentTitle = (text: string): string => {
    const displayTitle = getDisplayTitle();
    if (!displayTitle) return text;
    
    const lines = text.split('\n');
    // Remove the first H1 header if it matches the display title
    if (lines.length > 0 && lines[0].trim() === `# ${displayTitle}`) {
      return lines.slice(1).join('\n').replace(/^\n+/, ''); // Remove leading newlines
    }
    return text;
  };

  // Generate a unique color for each Excel header
  const getHeaderColor = (header: string, index: number): string => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    return colors[index % colors.length];
  };
  
  // Get unique Excel headers and assign colors
  const uniqueHeaders = [...new Set(Object.keys(mappedTags))];
  const headerColors = uniqueHeaders.reduce((acc, header, index) => {
    acc[header] = getHeaderColor(header, index);
    return acc;
  }, {} as Record<string, string>);

  // Function to highlight detected tags in text with visual mapping system
  const highlightTags = (text: string): string => {
    let highlightedText = removeDocumentTitle(text);
    
    // Get mapped tags (tags that have been assigned to Excel headers)
    const mappedTagSlugs = new Set(Object.values(mappedTags));
    
    // Filter to only highlight mapped tags and sort by example length
    const tagsToHighlight = tags.filter(tag => mappedTagSlugs.has(tag.slug));
    const sortedTags = tagsToHighlight.sort((a, b) => (b.example?.length || 0) - (a.example?.length || 0));
    
    console.log('🔍 Visual mapping system:', {
      totalTags: tags.length,
      mappedTagSlugs: Array.from(mappedTagSlugs),
      tagsToHighlight: tagsToHighlight.map(t => ({ name: t.name, example: t.example, slug: t.slug })),
      headerColors
    });
    
    sortedTags.forEach((tag, index) => {
      if (tag.example && tag.example.trim()) {
        const example = tag.example.trim();
        
        // Find which Excel header this tag is mapped to
        const excelHeader = Object.keys(mappedTags).find(header => mappedTags[header] === tag.slug);
        
        if (excelHeader) {
          const headerColor = headerColors[excelHeader];
          const uniqueId = `tag-${index}-${Date.now()}`;
          
          // Create visual mapping element with badge and connector
          const visualMapping = `
            <span class="visual-mapping-container" data-excel-header="${excelHeader}">
              <span class="mapped-term" 
                    style="background-color: ${headerColor}15; border-color: ${headerColor}; color: ${headerColor}" 
                    data-tag-id="${uniqueId}">
                ${example}
              </span>
              <span class="excel-badge" 
                    style="background-color: ${headerColor}; border-color: ${headerColor}"
                    data-header="${excelHeader}">
                ${excelHeader}
              </span>
            </span>
          `;
          
          // Replace with highlighted version (case-insensitive, whole word)
          const regex = new RegExp(`\\b${example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          highlightedText = highlightedText.replace(regex, visualMapping);
        }
      }
    });
    
    return highlightedText;
  };

  // Get final display title
  const finalDisplayTitle = getDisplayTitle();
  
  // DEBUG: Log title and filename values
  console.log('🔍 DocumentPreviewPanel DEBUG:', {
    title,
    fileName,
    titleExists: !!title,
    fileNameExists: !!fileName,
    finalDisplayTitle,
    mappedTags,
    mappedTagsCount: Object.keys(mappedTags).length,
    markdownStart: markdown.substring(0, 200)
  });

  // DEBUG: Log sections
  console.log('🔍 Sections DEBUG:', {
    sectionsCount: sections.length,
    sections: sections.map(s => ({title: s.title, hasMarkdown: !!s.markdown})),
    hasMainMarkdown: !!markdown
  });

  // DEBUG: Log final processed markdown
  console.log('🔍 Final markdown DEBUG:', {
    originalMarkdown: markdown.substring(0, 200),
    processedMarkdown: highlightTags(markdown).substring(0, 200),
    afterRemoveTitle: removeDocumentTitle(markdown).substring(0, 200)
  });

  // Handle clicks on mapped terms to remove them
  React.useEffect(() => {
    const handleMappedTermClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mappedTerm = target.closest('.mapped-term');
      if (mappedTerm && onMappingRemove) {
        const excelHeader = mappedTerm.parentElement?.getAttribute('data-excel-header');
        if (excelHeader) {
          console.log('🗑️ Removing mapping for header:', excelHeader);
          onMappingRemove(excelHeader);
        }
      }
    };

    document.addEventListener('click', handleMappedTermClick);
    return () => document.removeEventListener('click', handleMappedTermClick);
  }, [onMappingRemove]);

  return (
    <div className="bg-white border-l border-r border-gray-200">
      {/* Styles for tag highlighting and Word-like appearance */}
      <style jsx>{`
        .document-container {
          font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
          line-height: 1.5;
          color: #2d3748;
        }
        
        .document-page {
          background: white;
          margin: 0;
          padding: 10mm 25mm 30mm 0mm; /* Eliminat marge esquerre i reduït superior */
          min-height: 297mm; /* Altura A4 */
        }
        
        /* TÍTOL PRINCIPAL - Estil informe tècnic */
        .document-title {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 18pt;
          font-weight: 700;
          color: #1a202c;
          text-align: center;
          text-transform: uppercase;
          margin: 0 0 40px 0;
          padding-bottom: 15px;
          border-bottom: 3px solid #2b6cb0;
          letter-spacing: 1px;
        }
        
        /* SECCIONS - Estil administratiu */
        .document-section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .document-section h2 {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 14pt;
          font-weight: 600;
          color: #2b6cb0;
          margin: 25px 0 15px 0;
          padding-left: 8px;
          border-left: 4px solid #2b6cb0;
          background: linear-gradient(90deg, #ebf8ff 0%, transparent 100%);
          padding: 8px 12px;
          text-transform: capitalize;
        }
        
        .document-section h3 {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 12pt;
          font-weight: 600;
          color: #4a5568;
          margin: 20px 0 10px 0;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        
        /* CONTINGUT - Estil professional */
        .document-content {
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #2d3748;
          text-align: justify;
          margin-bottom: 15px;
          text-indent: 0;
        }
        
        /* NUMERACIÓ I ELEMENTS AUXILIARS */
        .document-header-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 15px 20px;
          background: linear-gradient(90deg, #edf2f7 0%, #e2e8f0 100%);
          border-radius: 6px;
          font-size: 9pt;
          color: #4a5568;
        }
        
        .document-footer {
          margin-top: 40px;
          text-align: center;
          font-size: 9pt;
          color: #718096;
          border-top: 1px solid #e2e8f0;
          padding-top: 15px;
        }
        
        .document-content p {
          margin-bottom: 12px;
        }
        
        .document-content ul, .document-content ol {
          margin: 10px 0;
          padding-left: 25px;
        }
        
        .document-content li {
          margin-bottom: 5px;
        }
        
        /* TAULES - Estil administratiu professional */
        .document-table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          font-family: 'Calibri', 'Segoe UI', sans-serif;
          font-size: 10pt;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .document-table th {
          background: linear-gradient(135deg, #2b6cb0 0%, #3182ce 100%);
          color: white;
          border: 1px solid #2563eb;
          padding: 12px 15px;
          text-align: left;
          font-weight: 600;
          font-size: 10pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .document-table td {
          border: 1px solid #cbd5e0;
          padding: 10px 15px;
          color: #2d3748;
          vertical-align: top;
        }
        
        .document-table tr:nth-child(even) {
          background-color: #f7fafc;
        }
        
        .document-table tr:hover {
          background-color: #edf2f7;
        }
        
        /* SIGNATURA - Estil oficial */
        .document-signature {
          margin-top: 60px;
          padding: 30px;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          text-align: center;
          page-break-inside: avoid;
        }
        
        .document-signature-name {
          font-size: 14pt;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .document-signature-title {
          font-size: 12pt;
          font-weight: 500;
          color: #4a5568;
          margin-bottom: 6px;
        }
        
        .document-signature-date {
          font-size: 10pt;
          color: #718096;
          font-style: italic;
        }
        
        /* TAGS DETECTATS - Estil bàsic */
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
          border-radius: 6px;
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
        
        .excel-badge {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #2563eb;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 9pt;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          z-index: 10;
          opacity: 0;
          transition: all 0.3s ease;
          pointer-events: none;
        }
        
        .visual-mapping-container:hover .excel-badge {
          opacity: 1;
          transform: translateX(-50%) translateY(-3px);
        }
        
        .excel-badge:before {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -4px;
          border: 4px solid transparent;
          border-top-color: inherit;
        }
        
        /* LLEGENDA DE MAPATGES */
        .mapping-legend {
          margin: 40px 0;
          padding: 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border: 2px solid #cbd5e0;
          border-radius: 12px;
          page-break-inside: avoid;
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
          border-radius: 8px;
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
          border-radius: 4px;
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
          border-radius: 10px;
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
      
      {/* Document Header with template name and actions - modern office style */}
      <div className="bg-gray-50 border-b border-gray-400 px-4 py-4 rounded-t-2xl">
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
                className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-white hover:bg-blue-50 rounded border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Desar
              </button>
            )}
            <button
              className="flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded border border-green-600 hover:border-green-700 transition-all duration-200 shadow-sm hover:shadow"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generar
            </button>
            {onSaveAs && (
              <button
                onClick={onSaveAs}
                className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-white hover:bg-blue-50 rounded border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow"
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
                className="flex items-center px-2 py-1 text-xs font-medium text-gray-800 bg-white hover:bg-blue-50 rounded border border-gray-300 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow"
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

      {/* Word-like Document Container */}
      <div className="bg-transparent min-h-screen relative rounded-b-2xl overflow-hidden">
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
        
        {/* Document Page - Professional report appearance */}
        <div className="document-container bg-gray-50 rounded-b-2xl">
          <div className="document-page bg-white border border-gray-300 shadow-lg" style={{width: '210mm', margin: '0'}}>
            {/* Document Title */}
            {finalDisplayTitle && (
              <h1 className="document-title">
                {finalDisplayTitle}
              </h1>
            )}
            
            {/* Document Info Header */}
            <div className="document-header-info">
              <div>
                <strong>Document:</strong> {fileName || 'Informe Tècnic'}
              </div>
              <div>
                <strong>Data:</strong> {new Date().toLocaleDateString('ca-ES')}
              </div>
              <div>
                <strong>Pàgina:</strong> 1 de 1
              </div>
            </div>

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
                  {uniqueHeaders.map((header, index) => (
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