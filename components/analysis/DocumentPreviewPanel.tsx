// components/analysis/DocumentPreviewPanel.tsx
// Panel 1: Document Preview with markdown content
import React, { useState, useEffect } from 'react';
import { ParsedSection, ParsedTable } from '../../lib/types';
import { log } from '../../lib/logger';

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
  // Manual mapping state
  const [isManualMappingActive, setIsManualMappingActive] = useState(false);
  const [activeManualHeader, setActiveManualHeader] = useState<string | null>(null);
  
  // ULTRATHINK: Manual text mappings separate from tag mappings
  const [manualTextMappings, setManualTextMappings] = useState<Record<string, string>>({});
  
  // ULTRATHINK: Store original tag info for color preservation
  const [manualTagInfo, setManualTagInfo] = useState<Record<string, {selectedText: string, originalTag?: any}>>({});
  
  // Listen for manual mapping events
  useEffect(() => {
    const handleManualMappingActivated = (event: any) => {
      const { header } = event.detail;
      log.debug('Manual mapping activated in DocumentPreview', { header });
      setIsManualMappingActive(true);
      setActiveManualHeader(header);
    };

    const handleManualMappingDeactivated = () => {
      log.debug('Manual mapping deactivated in DocumentPreview');
      setIsManualMappingActive(false);
      setActiveManualHeader(null);
    };

    const handleManualTextMappingsUpdated = (event: any) => {
      const { manualTextMappings: newManualTextMappings, manualTagInfo: newManualTagInfo } = event.detail;
      log.ultrathink('Manual text mappings updated', {
        newManualTextMappings,
        newManualTagInfo
      });
      setManualTextMappings(newManualTextMappings);
      setManualTagInfo(newManualTagInfo);
    };

    document.addEventListener('manualMappingActivated', handleManualMappingActivated);
    document.addEventListener('manualMappingDeactivated', handleManualMappingDeactivated);
    document.addEventListener('manualTextMappingsUpdated', handleManualTextMappingsUpdated);

    return () => {
      document.removeEventListener('manualMappingActivated', handleManualMappingActivated);
      document.removeEventListener('manualMappingDeactivated', handleManualMappingDeactivated);
      document.removeEventListener('manualTextMappingsUpdated', handleManualTextMappingsUpdated);
    };
  }, []);

  // Handle text selection for manual mapping
  const handleTextSelection = () => {
    if (isManualMappingActive && activeManualHeader) {
      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim();
      
      if (selectedText && selectedText.length > 0) {
        log.ultrathink('Text selected for mapping', { 
          header: activeManualHeader, 
          selectedText,
          previousMappings: Object.entries(mappedTags)
        });
        
        // Dispatch event to ExcelMappingPanel with ULTRATHINK reassignment logic
        document.dispatchEvent(new CustomEvent('textSelected', {
          detail: { 
            selectedText, 
            header: activeManualHeader,
            // Send current mappings so we can revert previous locations
            currentMappings: mappedTags
          }
        }));
        
        // Clear selection
        selection?.removeAllRanges();
      }
    }
  };
  
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
    if (fileName) return fileName; // Show complete filename with extension
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

  // ULTRATHINK: Get original tag color based on tag properties
  const getOriginalTagColor = (tag: any): string => {
    // Use a consistent color based on tag name/type
    const tagColors = [
      '#059669', '#DC2626', '#7C2D12', '#1D4ED8', '#7C3AED',
      '#C2410C', '#BE185D', '#4338CA', '#0891B2', '#65A30D'
    ];
    const hash = tag.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return tagColors[hash % tagColors.length];
  };
  
  // Get unique Excel headers and assign colors
  const uniqueHeaders = [...new Set(Object.keys(mappedTags))];
  const headerColors = uniqueHeaders.reduce((acc, header, index) => {
    acc[header] = getHeaderColor(header, index);
    return acc;
  }, {} as Record<string, string>);

  // ULTRATHINK: Function to highlight detected tags in text with visual mapping system + manual text mappings
  const highlightTags = (text: string): string => {
    let highlightedText = removeDocumentTitle(text);
    
    log.ultrathink('Starting highlight process', {
      mappedTagsCount: Object.keys(mappedTags).length,
      manualMappingsCount: Object.keys(manualTextMappings).length
    });
    
    // STEP 1: Process manual text mappings first (highest priority)
    Object.entries(manualTextMappings).forEach(([header, selectedText]) => {
      // ULTRATHINK: Use original tag color if available, otherwise fallback to header color
      const tagInfo = manualTagInfo[header];
      const originalTag = tagInfo?.originalTag;
      const tagColor = originalTag ? getOriginalTagColor(originalTag) : getHeaderColor(header, Object.keys(manualTextMappings).indexOf(header));
      
      log.mapping('Processing manual mapping with original tag color', {
        header,
        hasOriginalTag: !!originalTag,
        tagColor
      });
      
      if (selectedText && selectedText.trim()) {
        const visualMapping = `
          <span class="visual-mapping-container" data-excel-header="${header}">
            <span class="mapped-term" 
                  style="background-color: ${tagColor}15; border-color: ${tagColor}; color: ${tagColor}" 
                  data-manual-mapping="true">
              ${header}
            </span>
          </span>
        `;
        
        // Replace ALL occurrences of the selected text with header name and color
        const regex = new RegExp(selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const replacements = (highlightedText.match(regex) || []).length;
        highlightedText = highlightedText.replace(regex, visualMapping);
        
        log.success(`Manual mapping applied: ${header}`, { replacements });
      }
    });
    
    // STEP 2: Process tag mappings (lower priority, won't override manual mappings)
    // Get mapped tags (tags that have been assigned to Excel headers)
    const mappedTagSlugs = new Set(Object.values(mappedTags));
    
    // Filter to only highlight mapped tags and sort by example length
    const tagsToHighlight = tags.filter(tag => mappedTagSlugs.has(tag.slug));
    const sortedTags = tagsToHighlight.sort((a, b) => (b.example?.length || 0) - (a.example?.length || 0));
    
    log.debug('Tag mapping system initialized', {
      totalTags: tags.length,
      tagsToHighlight: tagsToHighlight.length
    });
    
    sortedTags.forEach((tag, index) => {
      if (tag.example && tag.example.trim()) {
        const example = tag.example.trim();
        
        // Find which Excel header this tag is mapped to
        const excelHeader = Object.keys(mappedTags).find(header => mappedTags[header] === tag.slug);
        
        // Debug specific problematic tags if needed
        const isProblematicTag = example.toUpperCase().includes('PRESSUPOST');
        if (isProblematicTag) {
          log.debug('Processing problematic tag', {
            tagName: tag.name,
            example,
            excelHeader,
            textContains: highlightedText.includes(example)
          });
        }
        
        if (excelHeader) {
          // ULTRATHINK: Skip if this header has a manual text mapping
          const hasManualMapping = manualTextMappings[excelHeader];
          if (hasManualMapping) {
            log.debug('Skipping tag mapping, header has manual mapping', {
              excelHeader,
              tagExample: example
            });
            return; // Skip this tag mapping
          }
          
          const headerColor = headerColors[excelHeader];
          const uniqueId = `tag-${index}-${Date.now()}`;
          
          // Create visual mapping element - show only Excel header value
          const visualMapping = `
            <span class="visual-mapping-container" data-excel-header="${excelHeader}">
              <span class="mapped-term" 
                    style="background-color: ${headerColor}15; border-color: ${headerColor}; color: ${headerColor}" 
                    data-tag-id="${uniqueId}">
                ${excelHeader}
              </span>
            </span>
          `;
          
          // Try multiple replacement strategies for better matching
          let replacements = 0;
          
          // Strategy 1: Exact match (case sensitive)
          const exactRegex = new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          highlightedText = highlightedText.replace(exactRegex, (match) => {
            replacements++;
            if (isProblematicTag) log.debug('Strategy 1 success', { match });
            return visualMapping;
          });
          
          // Strategy 2: Case insensitive exact
          if (replacements === 0) {
            const ciRegex = new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            highlightedText = highlightedText.replace(ciRegex, (match) => {
              replacements++;
              if (isProblematicTag) log.debug('Strategy 2 success', { match });
              return visualMapping;
            });
          }
          
          // Strategy 3: Word boundary (original)
          if (replacements === 0) {
            const wbRegex = new RegExp(`\\b${example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            highlightedText = highlightedText.replace(wbRegex, (match) => {
              replacements++;
              if (isProblematicTag) log.debug('Strategy 3 success', { match });
              return visualMapping;
            });
          }
          
          // Strategy 4: Flexible match (remove word boundaries for numbers/special chars)
          if (replacements === 0 && /[\d€$.,]/.test(example)) {
            const flexRegex = new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            highlightedText = highlightedText.replace(flexRegex, (match) => {
              replacements++;
              if (isProblematicTag) log.debug('Strategy 4 success', { match });
              return visualMapping;
            });
          }
          
          if (isProblematicTag) {
            log.debug('Final result for problematic tag', {
              replacements,
              mappingCreated: replacements > 0
            });
          }
        }
      }
    });
    
    return highlightedText;
  };

  // Get final display title
  const finalDisplayTitle = getDisplayTitle();
  
  // Development-only debugging
  log.debug('DocumentPreviewPanel initialized', {
    title,
    fileName,
    finalDisplayTitle,
    mappedTagsCount: Object.keys(mappedTags).length,
    sectionsCount: sections.length
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
          border-radius: 8px;
          letter-spacing: -0.2pt;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        
        /* SECCIONS - Estil modern amb caixes subtils */
        .document-section {
          margin-bottom: 24pt;
          page-break-inside: avoid;
          background: rgba(248, 250, 252, 0.2);
          border: 1px solid rgba(226, 232, 240, 0.2);
          border-radius: 6px;
          padding: 18pt 20pt;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
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
          border-radius: 6px;
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
          border-radius: 6px;
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
        
        
        /* LLEGENDA DE MAPATGES - Estil modern */
        .mapping-legend {
          margin: 32pt 0;
          padding: 20pt 24pt;
          background: rgba(248, 250, 252, 0.3);
          border: 1px solid rgba(226, 232, 240, 0.3);
          border-radius: 6px;
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

      {/* Document Container - Technical Clean */}
      <div className="bg-white min-h-screen relative">
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
              <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
                </svg>
                <div className="text-orange-800">
                  <div className="font-medium">Mode mapatge manual actiu</div>
                  <div className="text-sm">Selecciona el text que vols mapejsar amb <strong>"{activeManualHeader}"</strong></div>
                </div>
              </div>
            )}
            
            {/* Document Title */}
            {finalDisplayTitle && (
              <h1 className="document-title">
                {finalDisplayTitle}
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