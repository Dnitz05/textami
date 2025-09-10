'use client';

import React from 'react';
import * as cheerio from 'cheerio';

export interface GoogleDocsRendererProps {
  /** HTML content from Google Docs */
  htmlContent: string;
  
  /** Rendering context affects styling */
  context?: 'preview' | 'editor' | 'analysis' | 'export';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Enable placeholder highlighting */
  enablePlaceholders?: boolean;
  
  /** Placeholder suggestions for highlighting */
  placeholders?: Array<{
    text: string;
    variable: string;
    confidence: number;
    type: string;
  }>;
  
  /** Callback when placeholder is clicked */
  onPlaceholderClick?: (placeholder: any) => void;
}

export function GoogleDocsRenderer({
  htmlContent,
  context = 'preview',
  className = '',
  enablePlaceholders = false,
  placeholders = [],
  onPlaceholderClick
}: GoogleDocsRendererProps) {
  // NOVA ESTRATÈGIA: Post-processat HTML complet
  const processedHTML = React.useMemo(() => {
    let html = htmlContent;
    
    // 🚀 POST-PROCESSAT HTML PERFECTE
    html = postProcessGoogleDocsHTML(html);
    
    // Apply placeholders if enabled
    if (enablePlaceholders && placeholders.length > 0) {
      html = applyPlaceholders(html, placeholders);
    }
    
    return html;
  }, [htmlContent, enablePlaceholders, placeholders]);

  // 🤖 AI INSTRUCTION SYSTEM - State management
  const [aiInstructionPanel, setAiInstructionPanel] = React.useState({
    isOpen: false,
    activeSection: null as number | null,
    activeSubsection: null as number | null,
    globalInstructions: '',
    sectionInstructions: {} as Record<string, string>
  });

  const handleAiInstructionPanel = (sectionNumber?: number, subsectionNumber?: number) => {
    setAiInstructionPanel(prev => ({
      ...prev,
      isOpen: true,
      activeSection: sectionNumber || null,
      activeSubsection: subsectionNumber || null
    }));
  };

  const saveAiInstructions = (type: 'global' | 'section', value: string, sectionId?: string) => {
    setAiInstructionPanel(prev => {
      if (type === 'global') {
        return { ...prev, globalInstructions: value };
      } else if (sectionId) {
        return { 
          ...prev, 
          sectionInstructions: { 
            ...prev.sectionInstructions, 
            [sectionId]: value 
          }
        };
      }
      return prev;
    });
  };

  // 🎯 SECTION-WIDE HOVER EFFECTS - Add interactive functionality
  React.useEffect(() => {
    if (context !== 'editor') return; // Only enable in editor context
    
    const addSectionHoverEffects = () => {
      // Find all section headers (H2) and subsection headers (H3)
      const sectionHeaders = document.querySelectorAll('.google-docs-renderer--editor .doc-h2[data-section-number]');
      const subsectionHeaders = document.querySelectorAll('.google-docs-renderer--editor .doc-h3[data-section-number]');
      
      // Add section hover effects for H2 (full sections)
      sectionHeaders.forEach((header) => {
        const sectionNumber = header.getAttribute('data-section-number');
        
        // Detectar si la secció original està numerada
        const headerText = header.textContent?.trim() || '';
        const isNumbered = /^(\d+[\.\)]\s|[IVX]+[\.\)]\s|[a-zA-Z][\.\)]\s)/.test(headerText);
        
        // Create section badge - només mostrar numeració si l'original està numerat
        const sectionBadge = document.createElement('div');
        sectionBadge.className = 'section-badge';
        sectionBadge.innerHTML = isNumbered ? `Secció ${sectionNumber}` : 'Secció';
        sectionBadge.style.cssText = `
          position: absolute;
          top: -20px;
          right: 0;
          background: rgba(59, 130, 246, 0.9);
          color: white;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 8pt;
          font-weight: 500;
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
          z-index: 10;
        `;
        
        // Add AI instruction indicator - més subtil
        const aiIndicator = document.createElement('div');
        aiIndicator.className = 'ai-instruction-indicator';
        aiIndicator.innerHTML = `📋`;
        aiIndicator.style.cssText = `
          position: absolute;
          top: -20px;
          left: 0;
          background: rgba(16, 185, 129, 0.9);
          color: white;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 7pt;
          font-weight: 500;
          opacity: 0;
          transition: opacity 0.25s ease;
          cursor: pointer;
          z-index: 10;
        `;
        
        // Append indicators to header
        (header as HTMLElement).style.position = 'relative';
        header.appendChild(sectionBadge);
        header.appendChild(aiIndicator);
        
        // Add hover event listeners for entire section - MILLORED AMB EFECTES MÉS PRONUNCIATS
        const handleSectionHover = (isHovering: boolean) => {
          const sectionElements = document.querySelectorAll(`[data-section="${sectionNumber}"]`);
          const headerElement = header as HTMLElement;
          
          // 🎯 EFECTE SUBTIL PER PERCEBRE SECCIONS COM UNITATS
          sectionElements.forEach((element) => {
            if (isHovering) {
              (element as HTMLElement).style.cssText += `
                background: rgba(59, 130, 246, 0.03) !important;
                border-left: 3px solid rgba(59, 130, 246, 0.4) !important;
                padding: 0.3cm 0.5cm !important;
                margin-left: -0.3cm !important;
                border-radius: 6px !important;
                box-shadow: 
                  0 2px 8px rgba(59, 130, 246, 0.08),
                  inset 1px 0 0 rgba(59, 130, 246, 0.1) !important;
                transform: translateX(3px) !important;
                transition: all 0.25s ease-out !important;
                position: relative !important;
              `;
              
            } else {
              // Netejar estils de manera subtil
              (element as HTMLElement).style.background = '';
              (element as HTMLElement).style.borderLeft = '';
              (element as HTMLElement).style.padding = '';
              (element as HTMLElement).style.marginLeft = '';
              (element as HTMLElement).style.borderRadius = '';
              (element as HTMLElement).style.boxShadow = '';
              (element as HTMLElement).style.transform = '';
              (element as HTMLElement).style.position = '';
            }
          });
          
          // 🎯 EFECTE SUBTIL PER A LA CAPÇALERA 
          if (isHovering) {
            headerElement.style.cssText += `
              background: rgba(59, 130, 246, 0.08) !important;
              border-left: 4px solid rgba(59, 130, 246, 0.6) !important;
              padding: 0.4cm 0.6cm !important;
              margin-left: -0.4cm !important;
              border-radius: 8px !important;
              box-shadow: 0 3px 12px rgba(59, 130, 246, 0.15) !important;
              transform: translateX(2px) !important;
              transition: all 0.3s ease-out !important;
              position: relative !important;
            `;
          } else {
            // Reset header styles suau
            headerElement.style.background = '';
            headerElement.style.borderLeft = '';
            headerElement.style.padding = '';
            headerElement.style.marginLeft = '';
            headerElement.style.borderRadius = '';
            headerElement.style.boxShadow = '';
            headerElement.style.transform = '';
            headerElement.style.position = 'relative';
          }
          
          // Show/hide indicators de manera subtil
          sectionBadge.style.opacity = isHovering ? '1' : '0';
          aiIndicator.style.opacity = isHovering ? '1' : '0';
        };
        
        header.addEventListener('mouseenter', () => handleSectionHover(true));
        header.addEventListener('mouseleave', () => handleSectionHover(false));
        
        // Add click handler for AI instructions
        aiIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          handleAiInstructionPanel(parseInt(sectionNumber || '0'));
        });
      });
      
      // Add subsection hover effects for H3  
      subsectionHeaders.forEach((header) => {
        const sectionNumber = header.getAttribute('data-section-number');
        const subsectionNumber = header.getAttribute('data-subsection-number');
        
        // Detectar si la subsecció original està numerada
        const subHeaderText = header.textContent?.trim() || '';
        const isSubNumbered = /^(\d+\.\d+[\.\)]\s|[IVX]+\.[IVX]+[\.\)]\s|[a-zA-Z]\.[a-zA-Z][\.\)]\s)/.test(subHeaderText);
        
        // Create subsection badge - només mostrar numeració si l'original està numerat
        const subsectionBadge = document.createElement('div');
        subsectionBadge.className = 'subsection-badge';
        subsectionBadge.innerHTML = isSubNumbered ? `${sectionNumber}.${subsectionNumber}` : 'Subsecció';
        subsectionBadge.style.cssText = `
          position: absolute;
          top: -16px;
          right: 0;
          background: rgba(139, 92, 246, 0.9);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 7pt;
          font-weight: 500;
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
          z-index: 10;
        `;
        
        // Add subsection AI indicator - més subtil
        const subsectionAiIndicator = document.createElement('div');
        subsectionAiIndicator.className = 'ai-subsection-indicator';
        subsectionAiIndicator.innerHTML = `📋`;
        subsectionAiIndicator.style.cssText = `
          position: absolute;
          top: -16px;
          left: 0;
          background: rgba(245, 158, 11, 0.9);
          color: white;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 6pt;
          opacity: 0;
          transition: opacity 0.25s ease;
          cursor: pointer;
          z-index: 10;
        `;
        
        (header as HTMLElement).style.position = 'relative';
        header.appendChild(subsectionBadge);
        header.appendChild(subsectionAiIndicator);
        
        // Add subsection hover effects - MILLORED AMB EFECTES MÉS PRONUNCIATS
        const handleSubsectionHover = (isHovering: boolean) => {
          const subsectionElements = document.querySelectorAll(`[data-section="${sectionNumber}"][data-subsection="${subsectionNumber}"]`);
          const headerElement = header as HTMLElement;
          
          // 🎯 EFECTE SUBTIL PER SUBSECCIONS COM UNITATS
          subsectionElements.forEach((element) => {
            if (isHovering) {
              (element as HTMLElement).style.cssText += `
                background: rgba(139, 92, 246, 0.025) !important;
                border-left: 2px solid rgba(139, 92, 246, 0.3) !important;
                padding: 0.25cm 0.4cm !important;
                margin-left: -0.25cm !important;
                border-radius: 4px !important;
                box-shadow: 
                  0 1px 6px rgba(139, 92, 246, 0.06),
                  inset 1px 0 0 rgba(139, 92, 246, 0.08) !important;
                transform: translateX(2px) !important;
                transition: all 0.2s ease-out !important;
                position: relative !important;
              `;
              
            } else {
              // Netejar estils de subsecció
              (element as HTMLElement).style.background = '';
              (element as HTMLElement).style.borderLeft = '';
              (element as HTMLElement).style.padding = '';
              (element as HTMLElement).style.marginLeft = '';
              (element as HTMLElement).style.borderRadius = '';
              (element as HTMLElement).style.boxShadow = '';
              (element as HTMLElement).style.transform = '';
              (element as HTMLElement).style.position = '';
            }
          });
          
          // 🎯 EFECTE SUBTIL PER A LA CAPÇALERA DE SUBSECCIÓ
          if (isHovering) {
            headerElement.style.cssText += `
              background: rgba(139, 92, 246, 0.06) !important;
              border-left: 3px solid rgba(139, 92, 246, 0.5) !important;
              padding: 0.3cm 0.5cm !important;
              margin-left: -0.3cm !important;
              border-radius: 6px !important;
              box-shadow: 0 2px 8px rgba(139, 92, 246, 0.12) !important;
              transform: translateX(1px) !important;
              transition: all 0.25s ease-out !important;
              position: relative !important;
            `;
          } else {
            // Reset subsection header styles
            headerElement.style.background = '';
            headerElement.style.borderLeft = '';
            headerElement.style.padding = '';
            headerElement.style.marginLeft = '';
            headerElement.style.borderRadius = '';
            headerElement.style.boxShadow = '';
            headerElement.style.transform = '';
            headerElement.style.position = 'relative';
          }
          
          // Show/hide indicators de subsecció subtilment
          subsectionBadge.style.opacity = isHovering ? '1' : '0';
          subsectionAiIndicator.style.opacity = isHovering ? '1' : '0';
        };
        
        header.addEventListener('mouseenter', () => handleSubsectionHover(true));
        header.addEventListener('mouseleave', () => handleSubsectionHover(false));
        
        subsectionAiIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          handleAiInstructionPanel(
            parseInt(sectionNumber || '0'), 
            parseInt(subsectionNumber || '0')
          );
        });
      });
      
      // 🎯 PARÀGRAFS INDIVIDUALS - Seleccionables quan n'hi ha múltiples
      addIndividualParagraphEffects();
    };
    
    const addIndividualParagraphEffects = () => {
      // Processament per secció - trobar seccions úniques
      const sectionNumbers = new Set<string>();
      document.querySelectorAll('.google-docs-renderer--editor [data-section]').forEach(el => {
        const sectionNumber = el.getAttribute('data-section');
        if (sectionNumber && !el.hasAttribute('data-subsection')) {
          sectionNumbers.add(sectionNumber);
        }
      });
      
      sectionNumbers.forEach(sectionNumber => {
        // Trobar tots els paràgrafs d'aquesta secció (excloent capçaleres i subseccions)
        const sectionParagraphs = Array.from(
          document.querySelectorAll(`[data-section="${sectionNumber}"]:not([data-subsection])`)
        ).filter(el => {
          const tagName = el.tagName?.toLowerCase();
          return (
            (tagName === 'p' || el.classList.contains('doc-paragraph')) &&
            !el.classList.contains('doc-h1') &&
            !el.classList.contains('doc-h2') &&
            !el.classList.contains('doc-h3') &&
            !el.classList.contains('doc-heading')
          );
        });
        
        console.log(`🔍 Secció ${sectionNumber}: ${sectionParagraphs.length} paràgrafs trobats`);
        
        // Només afegir hover individual si hi ha múltiples paràgrafs (>1)
        if (sectionParagraphs.length > 1) {
          console.log(`✅ Activant hover individual per ${sectionParagraphs.length} paràgrafs a la secció ${sectionNumber}`);
          sectionParagraphs.forEach((paragraph, index) => {
            // Afegir classe per identificar context múltiple
            (paragraph as HTMLElement).classList.add('multiple-paragraph-context');
            addParagraphHoverEffect(paragraph as HTMLElement, sectionNumber, index + 1);
          });
        } else {
          console.log(`⭕ Secció ${sectionNumber} té només ${sectionParagraphs.length} paràgraf(s) - no cal hover individual`);
          // Assegurar que no tingui la classe multiple-paragraph-context
          if (sectionParagraphs.length === 1) {
            (sectionParagraphs[0] as HTMLElement).classList.remove('multiple-paragraph-context');
          }
        }
      });
    };
    
    const addParagraphHoverEffect = (paragraph: HTMLElement, sectionNumber: string | null, paragraphIndex: number) => {
      let hoverIndicator: HTMLElement | null = null;
      
      const handleParagraphHover = (isHovering: boolean) => {
        if (isHovering) {
          // Afegir classe per hover actiu
          paragraph.classList.add('paragraph-hover-active');
          
          // Efecte hover més subtil per al paràgraf
          paragraph.style.cssText += `
            background: rgba(59, 130, 246, 0.015) !important;
            border-left: 1px solid rgba(59, 130, 246, 0.15) !important;
            padding-left: 0.15cm !important;
            margin-left: -0.15cm !important;
            border-radius: 2px !important;
            box-shadow: 0 1px 3px rgba(59, 130, 246, 0.03) !important;
            cursor: pointer !important;
          `;
          
          // Crear indicador de paràgraf més subtil
          if (!hoverIndicator) {
            hoverIndicator = document.createElement('div');
            hoverIndicator.className = 'paragraph-indicator';
            hoverIndicator.innerHTML = `¶`;
            hoverIndicator.style.cssText = `
              position: absolute;
              top: -10px;
              right: 2px;
              background: rgba(59, 130, 246, 0.7);
              color: white;
              padding: 1px 3px;
              border-radius: 2px;
              font-size: 6pt;
              font-weight: 400;
              opacity: 1;
              z-index: 8;
              pointer-events: none;
              transition: opacity 0.2s ease;
            `;
            paragraph.appendChild(hoverIndicator);
          } else {
            hoverIndicator.style.opacity = '1';
          }
          
        } else {
          // Eliminar classe hover actiu
          paragraph.classList.remove('paragraph-hover-active');
          
          // Reset paragraph styles de manera subtil
          paragraph.style.background = '';
          paragraph.style.borderLeft = '';
          paragraph.style.paddingLeft = '';
          paragraph.style.marginLeft = '';
          paragraph.style.borderRadius = '';
          paragraph.style.boxShadow = '';
          paragraph.style.cursor = '';
          
          // Amagar indicador amb transició
          if (hoverIndicator) {
            hoverIndicator.style.opacity = '0';
            setTimeout(() => {
              if (hoverIndicator && hoverIndicator.style.opacity === '0') {
                hoverIndicator.remove();
                hoverIndicator = null;
              }
            }, 200);
          }
        }
      };
      
      paragraph.addEventListener('mouseenter', () => handleParagraphHover(true));
      paragraph.addEventListener('mouseleave', () => handleParagraphHover(false));
      
      // Click handler for paragraph selection
      paragraph.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`🎯 Paràgraf seleccionat: Secció ${sectionNumber}, Paràgraf ${paragraphIndex}`);
        // TODO: Implementar selecció de paràgraf
      });
    };
    
    // Add effects after DOM is ready
    const timer = setTimeout(addSectionHoverEffects, 100);
    
    return () => {
      clearTimeout(timer);
      // Cleanup indicators on unmount
      document.querySelectorAll('.section-badge, .subsection-badge, .ai-instruction-indicator, .ai-subsection-indicator, .paragraph-indicator').forEach(el => el.remove());
    };
  }, [processedHTML, context]);

  const handleClick = (event: React.MouseEvent) => {
    if (!enablePlaceholders || !onPlaceholderClick) return;
    
    const target = event.target as HTMLElement;
    if (target.classList.contains('placeholder-highlight')) {
      const placeholderId = target.getAttribute('data-placeholder-id');
      if (placeholderId) {
        const placeholder = placeholders[parseInt(placeholderId)];
        onPlaceholderClick(placeholder);
      }
    }
  };

  return (
    <>
      <div 
        className={`google-docs-renderer google-docs-renderer--${context} ${className}`}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: processedHTML }}
      />
      
      {/* 🤖 AI INSTRUCTION PANEL */}
      {context === 'editor' && (
        <div className={`ai-instruction-panel ${aiInstructionPanel.isOpen ? 'active' : ''}`}>
          <div className="ai-instruction-header">
            <span>🤖 Instruccions IA</span>
            <button 
              className="ai-instruction-close"
              onClick={() => setAiInstructionPanel(prev => ({ ...prev, isOpen: false }))}
            >
              ×
            </button>
          </div>
          
          <div className="ai-instruction-content">
            {/* Global AI Instructions */}
            <div className="ai-instruction-section global">
              <div className="ai-instruction-title">
                🌐 Instruccions Globals
                <span style={{ fontSize: '9px', color: '#6b7280' }}>
                  (Aplicades a tot el document)
                </span>
              </div>
              <textarea
                className="ai-instruction-textarea"
                value={aiInstructionPanel.globalInstructions}
                onChange={(e) => setAiInstructionPanel(prev => ({ 
                  ...prev, 
                  globalInstructions: e.target.value 
                }))}
                placeholder="Defineix instruccions generals per l'IA que s'aplicaran a tot el document..."
              />
              <button 
                className="ai-instruction-save"
                onClick={() => saveAiInstructions('global', aiInstructionPanel.globalInstructions)}
              >
                💾 Guardar Global
              </button>
            </div>
            
            {/* Section-Specific AI Instructions */}
            {aiInstructionPanel.activeSection && (
              <div className="ai-instruction-section specific">
                <div className="ai-instruction-title">
                  📋 Instruccions per Secció {aiInstructionPanel.activeSection}
                  {aiInstructionPanel.activeSubsection && (
                    <span className="section-instruction-badge">
                      .{aiInstructionPanel.activeSubsection}
                    </span>
                  )}
                </div>
                <textarea
                  className="ai-instruction-textarea"
                  value={aiInstructionPanel.sectionInstructions[
                    `${aiInstructionPanel.activeSection}${
                      aiInstructionPanel.activeSubsection ? `.${aiInstructionPanel.activeSubsection}` : ''
                    }`
                  ] || ''}
                  onChange={(e) => {
                    const sectionId = `${aiInstructionPanel.activeSection}${
                      aiInstructionPanel.activeSubsection ? `.${aiInstructionPanel.activeSubsection}` : ''
                    }`;
                    setAiInstructionPanel(prev => ({
                      ...prev,
                      sectionInstructions: {
                        ...prev.sectionInstructions,
                        [sectionId]: e.target.value
                      }
                    }));
                  }}
                  placeholder={`Defineix instruccions específiques per ${
                    aiInstructionPanel.activeSubsection 
                      ? `la subsecció ${aiInstructionPanel.activeSection}.${aiInstructionPanel.activeSubsection}` 
                      : `la secció ${aiInstructionPanel.activeSection}`
                  }...`}
                />
                <button 
                  className="ai-instruction-save"
                  onClick={() => {
                    const sectionId = `${aiInstructionPanel.activeSection}${
                      aiInstructionPanel.activeSubsection ? `.${aiInstructionPanel.activeSubsection}` : ''
                    }`;
                    saveAiInstructions(
                      'section', 
                      aiInstructionPanel.sectionInstructions[sectionId] || '', 
                      sectionId
                    );
                  }}
                >
                  💾 Guardar Secció
                </button>
              </div>
            )}
            
            {/* Instructions Summary */}
            <div className="ai-instruction-section">
              <div className="ai-instruction-title">
                📊 Resum d'Instruccions Actives
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }}>
                <div>
                  🌐 <strong>Globals:</strong> {aiInstructionPanel.globalInstructions ? '✅ Definides' : '⭕ Buides'}
                </div>
                <div>
                  📋 <strong>Per Secció:</strong> {Object.keys(aiInstructionPanel.sectionInstructions).length} configurades
                </div>
                {Object.entries(aiInstructionPanel.sectionInstructions).map(([sectionId, instructions]) => (
                  instructions && (
                    <div key={sectionId} style={{ marginLeft: '16px', fontSize: '9px' }}>
                      • Secció {sectionId}: {instructions.substring(0, 30)}...
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        /* 🚀 CSS NET I ELEGANT - POST-PROCESSAT HTML PERFECT */
        
        /* CONTAINER BASE */
        .google-docs-renderer {
          font-family: 'Arial', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #333333;
          background: white;
          word-wrap: break-word;
          max-width: 19cm;
          margin: 0 auto;
          padding: 1.5cm 2cm;
        }
        
        .google-docs-renderer > *:first-child { margin-top: 0; }
        .google-docs-renderer > *:last-child { margin-bottom: 0; }
        .google-docs-renderer hr { display: none; }

        /* TÍTOLS NETS - JERARQUIA CORRECTA */
        .doc-heading,
        .doc-h1, .doc-h2, .doc-h3, .doc-h4, .doc-h5, .doc-h6 {
          font-weight: bold !important;
          line-height: 1.3;
          margin: 1cm 0 0.5cm 0;
          /* REGLA DE SEGURETAT: TOTS els títols SEMPRE > 11pt (text normal) */
          min-font-size: 12pt !important;
        }
        
        /* PROTECCIÓ ULTRA AGRESSIVA: Mai títols més petits que text normal */
        .google-docs-renderer h1,
        .google-docs-renderer h2, 
        .google-docs-renderer h3,
        .google-docs-renderer h4,
        .google-docs-renderer h5,
        .google-docs-renderer h6,
        .google-docs-renderer .doc-heading {
          font-size: max(12pt, 1.1em) !important;
          font-weight: bold !important;
        }
        
        /* H1: Títol principal del document (únic) */
        .doc-h1 { 
          font-size: 22pt !important; 
          color: #000000; 
          margin: 2cm 0 1.5cm 0; 
          text-align: center;
          border-bottom: 2px solid #333333;
          padding-bottom: 0.5cm;
          font-weight: bold !important;
        }
        
        /* H2: Títols de secció (PRIORITARIS) */
        .doc-h2 { 
          font-size: 18pt !important; 
          color: #222222; 
          margin: 1.5cm 0 0.8cm 0;
          border-left: 4px solid #0066cc;
          padding-left: 0.5cm;
          background-color: #f8f9fa;
          padding: 0.4cm 0.5cm;
          font-weight: bold !important;
          position: relative;
        }
        
        /* Numeració automàtica de seccions */
        .doc-h2::before {
          content: attr(data-section-number) ". ";
          color: #0066cc;
          font-weight: bold;
          margin-right: 0.2cm;
        }
        
        /* H3+: Subseccions (SEMPRE > 11pt text normal) */
        .doc-h3 { 
          font-size: 15pt !important; 
          color: #444444; 
          margin: 1cm 0 0.5cm 0; 
          font-weight: bold !important;
          position: relative;
        }
        
        /* Numeració automàtica de subseccions */
        .doc-h3::before {
          content: attr(data-section-number) "." attr(data-subsection-number) " ";
          color: #666666;
          font-weight: normal;
          margin-right: 0.2cm;
        }
        
        .doc-h4 { font-size: 14pt !important; color: #555555; margin: 0.8cm 0 0.4cm 0; font-weight: bold !important; }
        .doc-h5 { font-size: 13pt !important; color: #666666; margin: 0.6cm 0 0.3cm 0; font-weight: bold !important; }
        .doc-h6 { font-size: 12pt !important; color: #777777; margin: 0.5cm 0 0.25cm 0; font-style: italic; font-weight: bold !important; }

        /* ALINEACIONS NETES */
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-justify { text-align: justify; }

        /* PARÀGRAFS NETS */
        .doc-paragraph {
          margin: 0 0 0.1cm 0;
          line-height: 1.5;
          font-size: 11pt;
          color: #333333;
        }
        
        /* ESTRUCTURA DE SECCIONS AMB HOVER COMPLET */
        .section-content {
          margin-left: 0.5cm;
          padding: 0.3cm;
          border-left: 3px solid #e0e0e0;
          margin-bottom: 1cm;
          transition: all 0.3s ease;
          border-radius: 0 4px 4px 0;
          position: relative;
        }
        
        .subsection-content {
          margin-left: 1cm;
          padding: 0.3cm;
          border-left: 2px dotted #d0d0d0;
          margin-bottom: 0.5cm;
          transition: all 0.2s ease;
          border-radius: 0 3px 3px 0;
        }
        
        /* HOVER EFECTES SOBRE TOTA LA SECCIÓ */
        .section-content:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-left: 4px solid #3b82f6;
          padding: 0.5cm;
          margin: 0.2cm 0 1.2cm 0.3cm;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transform: translateX(2px);
        }
        
        .subsection-content:hover {
          background: linear-gradient(135deg, #fafafa 0%, #f1f5f9 100%);
          border-left: 3px solid #10b981;
          padding: 0.4cm;
          margin: 0.1cm 0 0.6cm 0.8cm;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.12);
          transform: translateX(2px);
        }
        
        /* IDENTIFICACIÓ VISUAL SUBTIL DE SECCIONS */
        .section-content::before {
          content: "Secció " attr(data-section);
          position: absolute;
          top: -8px;
          right: 0;
          background: #3b82f6;
          color: white;
          font-size: 7pt;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .section-content:hover::before {
          opacity: 0.8;
        }
        
        .subsection-content::before {
          content: attr(data-section) "." attr(data-subsection);
          position: absolute;
          top: -6px;
          right: 0;
          background: #10b981;
          color: white;
          font-size: 6pt;
          font-weight: bold;
          padding: 1px 4px;
          border-radius: 2px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        
        .subsection-content:hover::before {
          opacity: 0.7;
        }
        
        /* NAVEGACIÓ DE SECCIONS */
        .section-nav {
          position: sticky;
          top: 20px;
          float: right;
          width: 200px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 1cm;
          margin: 0 0 1cm 1cm;
          font-size: 9pt;
        }
        
        .section-nav h4 {
          margin: 0 0 0.5cm 0;
          font-size: 10pt;
          color: #333;
        }
        
        .section-nav a {
          display: block;
          color: #0066cc;
          text-decoration: none;
          padding: 0.1cm 0;
          border-bottom: 1px dotted #eee;
        }
        
        .section-nav a:hover {
          background-color: #f0f8ff;
          padding-left: 0.2cm;
        }
        
        /* SISTEMA D'INSTRUCCIONS AI */
        .ai-instruction-global {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          color: white;
          padding: 0.3cm;
          border-radius: 6px;
          font-size: 8pt;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          z-index: 1000;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .ai-instruction-global:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4);
        }
        
        .ai-instruction-section {
          position: absolute;
          top: -10px;
          left: -10px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: white;
          padding: 0.2cm;
          border-radius: 4px;
          font-size: 7pt;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          opacity: 0;
          transition: all 0.3s ease;
          pointer-events: none;
        }
        
        .section-content:hover .ai-instruction-section,
        .subsection-content:hover .ai-instruction-section {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(-2px);
        }
        
        /* INDICADORS DE TIPUS D'INSTRUCCIÓ */
        .ai-instruction-global::before {
          content: "🌐 ";
          font-size: 10pt;
        }
        
        .ai-instruction-section::before {
          content: "📋 ";
          font-size: 8pt;
        }
        
        /* HOVER MILLOR PER IDENTIFICAR SECCIONS SENCERES */
        .section-content:hover,
        .section-content:hover * {
          outline: 1px dotted #3b82f6;
          outline-offset: 2px;
        }
        
        .subsection-content:hover,
        .subsection-content:hover * {
          outline: 1px dotted #10b981;
          outline-offset: 1px;
        }

        /* IMATGES PERFETES - OPTIMITZADES PER VISIBILITAT */
        .google-docs-renderer .doc-image,
        .google-docs-renderer img.doc-image,
        .google-docs-renderer img {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          vertical-align: top !important;
          margin: 0 auto !important;
          border: none !important;
          padding: 0 !important;
          line-height: 0 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        /* CONTENIDORS D'IMATGES - ZERO MARGINS ULTRA AGRESSIU */
        .google-docs-renderer p:has(.doc-image),
        .google-docs-renderer div:has(.doc-image),
        .google-docs-renderer span:has(.doc-image),
        .google-docs-renderer .doc-image + *,
        .google-docs-renderer * + .doc-image {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 0 !important;
          border: none !important;
        }
        
        /* ELIMINAR SEPARACIONS ABANS I DESPRÉS DE IMATGES - NUCLEAR */
        .google-docs-renderer .doc-image {
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          vertical-align: top !important;
        }
        
        /* NUCLEAR: ELIMINAR ESPAIS ENTRE IMATGES CONSECUTIVES */
        .google-docs-renderer img + img,
        .google-docs-renderer .doc-image + .doc-image {
          margin-top: 0 !important;
        }
        
        /* NUCLEAR: PARÀGRAFS QUE NOMÉS CONTENEN IMATGES */
        .google-docs-renderer p:has(img):not(:has(*:not(img))):not(:has(text)) {
          margin: 0 !important;
          padding: 0 !important;
          line-height: 0 !important;
          font-size: 0 !important;
        }
        
        .doc-figure {
          margin: 0;
          display: inline-block;
        }
        
        .doc-caption {
          font-style: italic;
          font-size: 10pt;
          margin-top: 0.1cm;
          color: #666666;
          display: block;
        }

        /* TAULES ELEGANTS */
        .doc-table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.25cm 0;
          border: 1px solid #cccccc;
          background: white;
          font-size: 11pt;
        }
        
        .doc-th, .doc-td {
          border: 1px solid #cccccc;
          padding: 0.5cm 0.75cm;
          text-align: left;
          vertical-align: top;
          line-height: 1.5;
        }
        
        .doc-th {
          background-color: #f2f2f2;
          font-weight: bold;
          color: #333333;
        }

        /* LLISTES NETES */
        .google-docs-renderer ul, .google-docs-renderer ol {
          margin: 0.5cm 0 0.75cm 0;
          padding-left: 1.5cm;
          list-style-position: outside;
        }
        
        .google-docs-renderer li {
          margin: 0.25cm 0;
          line-height: 1.5;
          font-size: 11pt;
        }

        /* TEXT FORMATTING */
        .google-docs-renderer strong, .google-docs-renderer b { font-weight: 700; }
        .google-docs-renderer em, .google-docs-renderer i { font-style: italic; }
        .google-docs-renderer u { text-decoration: underline; }

        /* ELEMENTS PROFESSIONALS */
        .google-docs-renderer header {
          text-align: center;
          font-size: 10pt;
          color: #666666;
          margin-bottom: 1cm;
          border-bottom: 1px solid #eeeeee;
          padding-bottom: 0.5cm;
        }
        
        .google-docs-renderer footer {
          text-align: center;
          font-size: 10pt;
          color: #666666;
          margin-top: 1cm;
          border-top: 1px solid #eeeeee;
          padding-top: 0.5cm;
        }
        
        .google-docs-renderer code, .google-docs-renderer pre {
          font-family: 'Courier New', monospace;
          background-color: #f9f9f9;
          padding: 0.25cm;
          border: 1px solid #eeeeee;
          border-radius: 4px;
          font-size: 11pt;
        }

        /* CONTEXTS */
        .google-docs-renderer--preview {
          max-width: 20cm;
          padding: 2cm 2.5cm;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .google-docs-renderer--analysis {
          max-width: 17cm;
          padding: 1.5cm 2cm;
        }
        
        .google-docs-renderer--analysis .doc-h1 { font-size: 16pt; margin: 1cm 0 0.75cm 0; }
        .google-docs-renderer--analysis .doc-h2 { font-size: 12pt; margin: 0.75cm 0 0.5cm 0; }
        .google-docs-renderer--analysis .doc-h3 { font-size: 11pt; margin: 0.5cm 0 0.25cm 0; }
        .google-docs-renderer--analysis .doc-paragraph { font-size: 10pt; }
        .google-docs-renderer--analysis .doc-table { font-size: 10pt; }

        /* PLACEHOLDERS */
        .google-docs-renderer .placeholder-highlight {
          background-color: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 4px;
          cursor: pointer;
          padding: 2px 4px;
        }

        /* 🎨 HOVER EFFECTS - ELEGANT & EFFICIENT (ALL CONTEXTS) */
        .google-docs-renderer--editor .doc-h1:hover,
        .google-docs-renderer--editor .doc-heading:hover,
        .google-docs-renderer--preview .doc-h1:hover,
        .google-docs-renderer--preview .doc-heading:hover,
        .google-docs-renderer--analysis .doc-h1:hover,
        .google-docs-renderer--analysis .doc-heading:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-left: 4px solid #3b82f6;
          padding: 0.75cm 1cm;
          margin: 1.5cm -1cm 1cm -1cm;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          transform: translateY(-2px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .google-docs-renderer--editor .doc-h2:hover,
        .google-docs-renderer--preview .doc-h2:hover,
        .google-docs-renderer--analysis .doc-h2:hover {
          background: linear-gradient(135deg, #fafafa 0%, #f1f5f9 100%);
          border-left: 3px solid #10b981;
          padding: 0.5cm 0.75cm;
          margin: 1cm -0.75cm 0.5cm -0.75cm;
          border-radius: 6px;
          box-shadow: 0 3px 8px rgba(16, 185, 129, 0.12);
          transform: translateY(-1px);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .google-docs-renderer--editor .doc-h3:hover,
        .google-docs-renderer--preview .doc-h3:hover,
        .google-docs-renderer--analysis .doc-h3:hover {
          background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
          border-left: 2px solid #8b5cf6;
          padding: 0.35cm 0.5cm;
          margin: 0.75cm -0.5cm 0.4cm -0.5cm;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.1);
          transform: translateY(-1px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .google-docs-renderer--editor .doc-table:hover,
        .google-docs-renderer--preview .doc-table:hover,
        .google-docs-renderer--analysis .doc-table:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
          border: 2px solid #3b82f6;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .google-docs-renderer--editor .doc-td:hover,
        .google-docs-renderer--editor .doc-th:hover {
          background: linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%);
          border: 2px solid #f59e0b;
          cursor: pointer;
          transform: scale(1.02);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }

        .google-docs-renderer--editor p:hover {
          background: linear-gradient(135deg, #fdfdfd 0%, #f9fafb 100%);
          border-radius: 4px;
          padding: 0.2cm 0.3cm;
          margin: 0.1cm -0.3cm;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.15s ease-in-out;
        }

        .google-docs-renderer--editor .signature-area:hover,
        .google-docs-renderer--editor [data-signature]:hover,
        .google-docs-renderer--editor p:contains("Signatura"):hover,
        .google-docs-renderer--editor p:contains("Firma"):hover {
          background: linear-gradient(135deg, #fef7ff 0%, #f3e8ff 100%);
          border: 2px dashed #a855f7;
          border-radius: 8px;
          padding: 1cm;
          margin: 0.5cm -1cm;
          box-shadow: 0 4px 16px rgba(168, 85, 247, 0.15);
          transform: translateY(-1px);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .google-docs-renderer--editor .doc-h1:hover::before {
          content: "📋 Títol Principal";
          position: absolute;
          top: -10px;
          left: 0;
          font-size: 9pt;
          color: #3b82f6;
          font-weight: 500;
          opacity: 0.8;
        }

        .google-docs-renderer--editor .doc-h2:hover::before {
          content: "📂 Secció";
          position: absolute;
          top: -8px;
          left: 0;
          font-size: 8pt;
          color: #10b981;
          font-weight: 500;
          opacity: 0.8;
        }

        .google-docs-renderer--editor .doc-h3:hover::before {
          content: "📄 Subsecció";
          position: absolute;
          top: -7px;
          left: 0;
          font-size: 7pt;
          color: #8b5cf6;
          font-weight: 500;
          opacity: 0.8;
        }

        .google-docs-renderer--editor .doc-h1:hover,
        .google-docs-renderer--editor .doc-h2:hover,
        .google-docs-renderer--editor .doc-h3:hover {
          position: relative;
        }

        /* 🤖 AI INSTRUCTION SYSTEM - Visual styling for instruction indicators */
        .ai-instruction-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          max-height: 80vh;
          background: linear-gradient(145deg, #ffffff, #f8fafc);
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          z-index: 1000;
          overflow: hidden;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ai-instruction-panel.active {
          transform: translateX(0);
        }

        .ai-instruction-header {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 16px 20px;
          font-weight: 600;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ai-instruction-close {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .ai-instruction-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .ai-instruction-content {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(80vh - 80px);
        }

        .ai-instruction-section {
          margin-bottom: 24px;
          padding: 16px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 12px;
          border-left: 4px solid #10b981;
        }

        .ai-instruction-section.global {
          border-left-color: #3b82f6;
        }

        .ai-instruction-section.specific {
          border-left-color: #f59e0b;
        }

        .ai-instruction-title {
          font-weight: 600;
          font-size: 12px;
          color: #1f2937;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-instruction-textarea {
          width: 100%;
          min-height: 80px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 11px;
          font-family: system-ui, -apple-system, sans-serif;
          resize: vertical;
          transition: border-color 0.2s ease;
        }

        .ai-instruction-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .ai-instruction-save {
          background: linear-gradient(135deg, #10b981, #047857);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }

        .ai-instruction-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .section-instruction-badge {
          display: inline-block;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 9px;
          font-weight: 500;
          margin-left: 8px;
          opacity: 0.8;
        }

        /* 🎨 ANIMACIONS PER EFECTES HOVER ULTRA VISUALS */
        @keyframes section-pulse {
          0%, 100% {
            background: linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.08), transparent);
            transform: scale(1);
          }
          50% {
            background: linear-gradient(45deg, transparent, rgba(59, 130, 246, 0.15), transparent);
            transform: scale(1.005);
          }
        }

        @keyframes subsection-pulse {
          0%, 100% {
            background: linear-gradient(45deg, transparent, rgba(139, 92, 246, 0.06), transparent);
            transform: scale(1);
          }
          50% {
            background: linear-gradient(45deg, transparent, rgba(139, 92, 246, 0.12), transparent);
            transform: scale(1.003);
          }
        }

        @keyframes section-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
          }
        }

        @keyframes subsection-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
          }
          50% {
            box-shadow: 0 0 25px rgba(139, 92, 246, 0.4);
          }
        }

        /* MILLORES DE TRANSICIONS GLOBALS PER SMOOTH EXPERIENCE */
        .section-content, .subsection-content {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, background, box-shadow, border;
        }

        .doc-h1, .doc-h2, .doc-h3, .doc-h4, .doc-h5, .doc-h6 {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, background, box-shadow, color;
        }

        /* OPTIMITZACIONS PER RENDIMENT */
        .section-hover-overlay, .subsection-hover-overlay {
          will-change: transform, opacity;
          backface-visibility: hidden;
          perspective: 1000px;
        }

        /* EFECTES ESPECIALITZATS PER MILLOR UX */
        .google-docs-renderer--editor {
          overflow: visible; /* Permetre que els efectes hover surtin del contenidor */
        }

        /* HOVER STATES GLOBALS AMB JERARQUIA VISUAL */
        .section-content:hover {
          z-index: 5;
        }

        .subsection-content:hover {
          z-index: 4;
        }

        .doc-h2:hover {
          z-index: 10;
        }

        .doc-h3:hover {
          z-index: 9;
        }

        /* 🎯 PARÀGRAFS INDIVIDUALS - Hover subtil quan hi ha múltiples */
        .paragraph-indicator {
          font-family: 'Georgia', serif;
          font-weight: 300;
          user-select: none;
        }

        /* Evitar conflicte entre hover de secció i paràgraf */
        .google-docs-renderer--editor p.paragraph-hover-active {
          z-index: 8 !important;
          position: relative !important;
        }

        /* Transicions suaus per paràgrafs */
        .google-docs-renderer--editor p[data-section]:not([data-subsection]) {
          transition: all 0.15s ease-out;
        }

        /* Assegurar que l'hover de secció tingui prioritat sobre paràgrafs */
        .google-docs-renderer--editor .section-content:hover p {
          pointer-events: auto;
        }

        /* Subtil feedback visual per paràgrafs clickables */
        .google-docs-renderer--editor p.multiple-paragraph-context {
          position: relative;
        }

        .google-docs-renderer--editor p.multiple-paragraph-context::before {
          content: '';
          position: absolute;
          left: -10px;
          top: 50%;
          width: 2px;
          height: 0;
          background: rgba(59, 130, 246, 0.3);
          transition: height 0.2s ease-out;
          transform: translateY(-50%);
        }

        .google-docs-renderer--editor p.multiple-paragraph-context:hover::before {
          height: 80%;
        }
      `}</style>
    </>
  );
}

// 🚀 ESTRATÈGIA GUANYADORA - POST-PROCESSAT HTML PERFECTE
function postProcessGoogleDocsHTML(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // 🚀 ETAPA 0: PREPROCESSAMENT INTEL·LIGENT - NETEJAR ESTRUCTURA CORRUPTA
    console.log('🧹 PREPROCESSAMENT: Netejant HTML corrupte de Google Docs...');
    intelligentPreprocessing($);
    
    // 1️⃣ NORMALITZAR TÍTOLS I ALINEACIONS
    normalizeHeadingsAndAlignment($);
    
    // 2️⃣ OPTIMITZAR IMATGES (ara molt més simple)
    optimizeImagesSimple($);
    
    // 3️⃣ ESTANDARDITZAR TAULES
    standardizeTables($);
    
    // 4️⃣ NETEJAR SPANS REDUNDANTS
    cleanRedundantSpans($);
    
    // 5️⃣ NORMALITZAR PARÀGRAFS
    normalizeParagraphs($);
    
    // 6️⃣ ELIMINAR ESTILS INLINE PROBLEMÀTICS
    removeProblematicInlineStyles($);
    
    // 7️⃣ NETEJA FINAL ULTRA AGRESSIVA D'ESPAIS MASSIUS
    finalWhitespaceCleanup($);
    
    return $.html();
    
  } catch (error) {
    console.warn('Error in HTML post-processing, falling back to original:', error);
    return html;
  }
}

// 🚀 ETAPA 0: PREPROCESSAMENT INTEL·LIGENT
function intelligentPreprocessing($: cheerio.Root) {
  // 🚨 DEBUGGING ABANS DE TOT
  const initialImages = $('img').length;
  console.log(`🔍 IMATGES INICIALS ABANS PREPROCESSAMENT: ${initialImages}`);
  
  // 🔍 DEBUG GOOGLE DOCS HEADERS REALS
  console.log('🔍 GOOGLE DOCS DEBUG: Buscant títols reals de Google Docs...');
  
  // Buscar elements que poden ser títols reals de Google Docs
  const potentialGoogleHeadings = $('*').filter((_, el) => {
    const $el = $(el);
    const tagName = $el.prop('tagName')?.toLowerCase();
    const className = $el.attr('class') || '';
    const style = $el.attr('style') || '';
    const text = $el.text().trim();
    
    // Només elements amb text i estils
    if (!text || text.length === 0) return false;
    
    // Buscar indicadors de títol de Google Docs
    const hasGoogleHeadingClass = /heading|title|header/i.test(className);
    const hasHeadingStyle = style.includes('font-weight') && (style.includes('bold') || /font-weight:\s*[7-9]00/.test(style));
    const hasHeadingSize = /font-size:\s*(\d{2,})/i.test(style);
    
    return hasGoogleHeadingClass || (hasHeadingStyle && hasHeadingSize) || (tagName && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName));
  });
  
  console.log(`🔍 TÍTOLS POTENCIALS DE GOOGLE DOCS TROBATS: ${potentialGoogleHeadings.length}`);
  
  potentialGoogleHeadings.each((i, el) => {
    const $el = $(el);
    const tagName = $el.prop('tagName')?.toLowerCase();
    const className = $el.attr('class') || '';
    const style = $el.attr('style') || '';
    const text = $el.text().trim().substring(0, 50);
    const fontSize = style.match(/font-size:\s*(\d+)/)?.[1];
    
    console.log(`🏷️ Títol ${i + 1}: <${tagName}> "${text}..." class="${className}" font=${fontSize}pt`);
  });
  
  console.log('🧹 FASE 1: Movent imatges mal ubicades...');
  
  // 1️⃣ MOURE TOTES les imatges del HEAD/STYLE al body ABANS del processat
  let movedImages = 0;
  $('head img, style img').each((_, img) => {
    const $img = $(img);
    console.log(`🚚 Movent imatge del HEAD/STYLE: ${$img.attr('src')?.substring(0, 50) || 'sense src'}...`);
    
    // Trobar el primer element del body per insertar la imatge després
    const $firstBodyElement = $('body').children().first();
    if ($firstBodyElement.length) {
      $firstBodyElement.after($img);
    } else {
      $('body').prepend($img);
    }
    movedImages++;
  });
  console.log(`📍 Imatges mogudes del HEAD/STYLE: ${movedImages}`);
  
  // 🚨 CHECK DESPRÉS DE MOURE
  const afterMoveImages = $('img').length;
  console.log(`🔍 IMATGES DESPRÉS DE MOURE: ${afterMoveImages}`);
  
  console.log('🧹 FASE 2: Eliminant CSS massiu...');
  
  // 2️⃣ ELIMINAR tots els <style> tags que contaminen l'HTML
  let removedStyles = $('style').length;
  $('style').remove();
  console.log(`🗑️ Tags <style> eliminats: ${removedStyles}`);
  
  // 3️⃣ NETEJAR atributs style massius (>200 chars) que fan malbé el layout
  let cleanedStyles = 0;
  $('[style]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    
    if (style.length > 200 || style.includes('@import') || style.includes('list-style-type')) {
      $el.removeAttr('style');
      cleanedStyles++;
    }
  });
  console.log(`🧽 Atributs style massius netejats: ${cleanedStyles}`);
  
  // 4️⃣ ELIMINAR elements completament buits i espais massius (AMB PROTECCIÓ D'IMATGES)
  const imagesBeforeCleanup = $('img').length;
  console.log(`🔍 IMATGES ABANS DE NETEJA ELEMENTS BUITS: ${imagesBeforeCleanup}`);
  
  let removedEmpty = 0;
  $('p:empty, div:empty, span:empty').each((_, el) => {
    $(el).remove();
    removedEmpty++;
  });
  
  // ELIMINAR paràgrafs que només contenen espais en blanc o &nbsp; (PROTEGINT IMATGES)
  $('p, div').each((_, el) => {
    const $el = $(el);
    
    // 🛡️ PROTECCIÓ TOTAL: SI CONTÉ IMATGES, NO TOCAR
    if ($el.find('img').length > 0) {
      console.log(`🛡️ Protegint ${$el.prop('tagName')} amb ${$el.find('img').length} imatges`);
      return;
    }
    
    const text = $el.text().trim();
    const html = $el.html() || '';
    
    // Si només conté espais en blanc, &nbsp;, o està buit
    if (!text || /^[\s\u00A0]*$/.test(text) || /^(&nbsp;|\s|<br\s*\/?\s*>)*$/i.test(html)) {
      $el.remove();
      removedEmpty++;
    }
  });
  
  const imagesAfterCleanup = $('img').length;
  console.log(`🗑️ Elements buits/espais eliminats: ${removedEmpty}`);
  console.log(`🔍 IMATGES DESPRÉS DE NETEJA ELEMENTS BUITS: ${imagesAfterCleanup}`);
  
  console.log('✅ PREPROCESSAMENT COMPLETAT: HTML net i estructurat!');
}

// 2️⃣ OPTIMITZAR IMATGES SIMPLE (després del preprocessament)
function optimizeImagesSimple($: cheerio.Root) {
  console.log('🖼️ OPTIMITZACIÓ SIMPLE: Processant imatges ja netes...');
  
  // 🚨 DEBUG EMERGENCY: Buscar totes les imatges en tot el DOM
  const allImages = $('img');
  const allImgTags = $('*').filter((_, el) => $(el).prop('tagName')?.toLowerCase() === 'img');
  const imgInSrc = $('[src]').filter((_, el) => $(el).prop('tagName')?.toLowerCase() === 'img');
  
  console.log(`🚨 EMERGENCY DEBUG - Total imatges trobades:`);
  console.log(`   - $('img'): ${allImages.length}`);
  console.log(`   - Elements IMG: ${allImgTags.length}`);
  console.log(`   - IMG amb src: ${imgInSrc.length}`);
  console.log(`   - HTML complet length: ${$.html().length}`);
  console.log(`   - HTML conté '<img': ${$.html().includes('<img') ? 'SÍ' : 'NO'}`);
  
  if (allImages.length === 0) {
    console.log('🚨🚨🚨 ALERTA CRÍTICA: NO S\'HAN TROBAT IMATGES!');
    console.log('🔍 Buscant traces d\'imatges en l\'HTML...');
    const htmlContent = $.html();
    const imgMatches = htmlContent.match(/<img[^>]*>/g);
    console.log(`🔍 RegEx match per <img: ${imgMatches ? imgMatches.length : 0}`);
    if (imgMatches) {
      imgMatches.forEach((match, i) => {
        console.log(`🖼️ Imatge ${i + 1} trobada per RegEx: ${match.substring(0, 100)}...`);
      });
    }
  }
  
  $('img').each((imgIndex, img) => {
    const $img = $(img);
    
    // 🚨 DEBUG NUCLEAR: Mostrar TOTA la informació de la imatge
    console.log(`\n🔍 === IMATGE ${imgIndex + 1} DEBUG NUCLEAR ===`);
    console.log('📦 HTML complet:', $img.prop('outerHTML')?.substring(0, 300) + '...');
    console.log('🎨 Style original:', $img.attr('style') || 'cap');
    console.log('📏 Parent element:', $img.parent().prop('tagName'), $img.parent().attr('class'));
    console.log('🎯 Parent style:', ($img.parent().attr('style') || 'cap').substring(0, 200));
    
    // Netejar tots els atributs problemàtics
    $img.removeAttr('style');
    $img.addClass('doc-image');
    
    // 🚨 APLICAR ESTILS INLINE DIRECTES ULTRA AGRESSIUS
    $img.attr('style', 'margin:0!important;padding:0!important;display:block!important;line-height:0!important;vertical-align:top!important;');
    
    // Netejar el parent i eliminar espais massius
    const $parent = $img.parent();
    if ($parent.length) {
      const parentTagName = $parent.prop('tagName')?.toLowerCase() || '';
      
      if (['p', 'div', 'span'].includes(parentTagName)) {
        // Verificar si el parent només conté la imatge i espais
        const parentText = $parent.text().trim();
        const parentChildren = $parent.children();
        const imageChildren = $parent.find('img');
        
        // Només alliberar la imatge si el parent REALMENT només conté la imatge
        const hasOnlyImageAndSpaces = !parentText || /^[\s\u00A0]*$/.test(parentText);
        const isImageOnlyContainer = parentChildren.length === imageChildren.length;
        
        if (hasOnlyImageAndSpaces && isImageOnlyContainer) {
          // Reemplaçar el parent amb la imatge directament
          $parent.replaceWith($img);
          console.log('🔥 Parent eliminat i imatge alliberada:', parentTagName);
        } else {
          // Netejar estils del parent per evitar separacions però mantenir contenidor
          $parent.css({
            'margin': '0',
            'padding': '0', 
            'line-height': '1.2'
          });
          console.log('🧽 Parent netejat (conservat):', parentTagName);
        }
      }
    }
    
    // Assegurar atributs bàsics
    if (!$img.attr('alt')) {
      $img.attr('alt', 'Document image');
    }
    
    console.log('✅ Imatge processada amb estils inline directes');
    console.log(`🔍 === FI IMATGE ${imgIndex + 1} ===\n`);
  });
  
  console.log('✅ IMATGES OPTIMITZADES: Classes i estils inline ultra agressius aplicats');
}

// 1️⃣ NORMALITZAR TÍTOLS I ALINEACIONS
function normalizeHeadingsAndAlignment($: cheerio.Root) {
  // NOVA ESTRATÈGIA: Detectar Google Docs Heading 1/2/3 REALS PRIMER
  console.log('🏷️ INICIANT DETECCIÓ GOOGLE DOCS HEADINGS - Prioritat: Heading 1/2/3 > semàntica');
  
  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;
  
  // FASE 1: Intentar detectar Google Docs Headings reals
  const googleHeadingsDetected = detectGoogleDocsHeadings($);
  
  // Convertir headings detectats i crear estructura de seccions
  googleHeadingsDetected.forEach(({element, level, text, fontSize, className}) => {
    const content = element.html() || '';
    element.replaceWith(`<h${level} class="doc-heading doc-h${level}" data-section-level="${level}">${content}</h${level}>`);
    
    if (level === 1) h1Count++;
    else if (level === 2) h2Count++;
    else if (level === 3) h3Count++;
    
    console.log(`🎯 GOOGLE DOCS H${level} DETECTAT: "${text.substring(0, 50)}..." (font=${fontSize}pt, class="${className}")`);
  });
  
  // CREAR ESTRUCTURA DE SECCIONS: H2 inaugura secció fins proper H2
  if (googleHeadingsDetected.length > 0) {
    createSectionStructure($);
  }
  
  // FASE 2: Fallback per títols no detectats (semàntica)
  if (googleHeadingsDetected.length === 0) {
    console.log('⚠️ Cap Google Docs Heading detectat - usant detecció semàntica fallback');
    
    let potentialHeadings: Array<{element: cheerio.Cheerio, text: string, fontSize: number | null, isBold: boolean, semanticLevel: number | null}> = [];
    
    $('p, div, span').each((_, el) => {
      const $el = $(el);
      const style = $el.attr('style') || '';
      const text = $el.text().trim();
      
      if (!text) return;
      
      const fontSize = extractFontSize(style);
      const isBold = detectBoldText($el, style);
      
      if (isBold) {
        const semanticLevel = detectSemanticHeadingLevel(text, h1Count);
        potentialHeadings.push({
          element: $el,
          text,
          fontSize,
          isBold,
          semanticLevel
        });
      }
    });
    
    potentialHeadings.forEach(({element, text, fontSize, semanticLevel}) => {
      let headingLevel = semanticLevel || (fontSize ? getHeadingLevel(fontSize) : null);
      
      if (!headingLevel) {
        if (text.length < 30 && text.split(' ').length <= 4) headingLevel = 2;
        else if (text.length < 60) headingLevel = 3;
      }
      
      if (headingLevel) {
        if (headingLevel === 1) h1Count++;
        if (headingLevel === 2) h2Count++;
        
        const content = element.html() || '';
        element.replaceWith(`<h${headingLevel} class="doc-heading doc-h${headingLevel}">${content}</h${headingLevel}>`);
        console.log(`🏷️ FALLBACK H${headingLevel} ${fontSize ? `(${fontSize}pt)` : '(sense font-size)'}: "${text.substring(0, 50)}..."`);
      }
    });
  }
  
  console.log(`📊 RESUM FINAL: H1=${h1Count}, H2=${h2Count}, H3=${h3Count}`);
  
  // Normalitzar alineacions inline a classes
  $('[style*="text-align"]').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    
    if (style.includes('text-align: center')) {
      $el.addClass('text-center');
    } else if (style.includes('text-align: right')) {
      $el.addClass('text-right');
    } else if (style.includes('text-align: justify')) {
      $el.addClass('text-justify');
    } else {
      $el.addClass('text-left');
    }
    
    // Eliminar estil inline d'alineació
    const newStyle = style.replace(/text-align:\s*[^;]+;?/gi, '').trim();
    if (newStyle) {
      $el.attr('style', newStyle);
    } else {
      $el.removeAttr('style');
    }
  });
  
  // Força tots els títols reals a esquerra
  $('h1, h2, h3, h4, h5, h6').removeClass('text-center text-right text-justify').addClass('text-left');
}

// 2️⃣ OPTIMITZAR IMATGES
function optimizeImages($: cheerio.Root) {
  $('img').each((_, el) => {
    const $el = $(el);
    
    // Eliminar tots els estils inline problemàtics
    $el.removeAttr('style');
    
    // Afegir classes per estils predictibles
    $el.addClass('doc-image');
    
    // Assegurar atributs bàsics
    if (!$el.attr('alt')) {
      $el.attr('alt', 'Document image');
    }
    
    // 🚀 INTEGRACIÓ PERFECTA: Eliminar paràgrafs que només contenen imatges
    const $parent = $el.parent();
    
    if ($parent.length && $parent[0] && 'tagName' in $parent[0] && ['p', 'div'].includes($parent[0].tagName?.toLowerCase() || '')) {
      const siblings = $parent.children();
      
      // Comptar només elements significatius (no imatges)
      const significantSiblings = siblings.filter((_, sibling) => {
        const $sibling = $(sibling);
        return !$sibling.is('img') && $sibling.text().trim().length > 0;
      });
      
      // Si el paràgraf només conté la imatge (sense text real), eliminar-lo
      if (significantSiblings.length === 0) {
        console.log('🖼️ Eliminant paràgraf que només conté imatge:', 'tagName' in $parent[0] ? $parent[0].tagName : 'unknown', $parent.attr('class'));
        $parent.replaceWith($el);
      }
      // Si no, eliminar TOTS els estils que creen separació vertical
      else {
        $parent.removeClass('text-justify');
        $parent.css({
          'margin': '0',
          'padding': '0', 
          'text-align': 'left',
          'line-height': '1',
          'border': 'none'
        });
        
        // 🚀 ULTRA FIX: Eliminar també marges dels elements veïns
        const $prevElement = $parent.prev();
        const $nextElement = $parent.next();
        
        if ($prevElement.length) {
          $prevElement.css('margin-bottom', '0');
        }
        if ($nextElement.length) {
          $nextElement.css('margin-top', '0');
        }
      }
    }
  });
  
  // Normalitzar figures
  $('figure').addClass('doc-figure');
  $('figcaption').addClass('doc-caption');
}

// 3️⃣ ESTANDARDITZAR TAULES
function standardizeTables($: cheerio.Root) {
  $('table').each((_, el) => {
    const $table = $(el);
    $table.removeAttr('style').addClass('doc-table');
    
    // Detectar i marcar headers
    const $firstRow = $table.find('tr').first();
    const hasHeaders = $firstRow.find('td').toArray().some(td => {
      const style = $(td).attr('style') || '';
      return style.includes('font-weight') && (style.includes('bold') || /font-weight:\s*[7-9]00/.test(style));
    });
    
    if (hasHeaders) {
      $firstRow.find('td').each((_, td) => {
        const $td = $(td);
        const content = $td.html() || '';
        $td.replaceWith(`<th class="doc-th">${content}</th>`);
      });
      $firstRow.wrap('<thead></thead>');
      const tbody = $('<tbody></tbody>');
      $table.find('tr').not($firstRow).appendTo(tbody);
      $table.append(tbody);
    }
    
    // Netejar totes les cel·les
    $table.find('td, th').each((_, cell) => {
      const $cell = $(cell);
      $cell.removeAttr('style');
      if ($cell.is('td')) $cell.addClass('doc-td');
      if ($cell.is('th')) $cell.addClass('doc-th');
    });
  });
}

// 4️⃣ NETEJAR SPANS REDUNDANTS
function cleanRedundantSpans($: cheerio.Root) {
  // Eliminar spans buits
  $('span:empty').remove();
  
  // Fusionar spans consecutius amb mateix estil o sense estils
  $('span').each((_, el) => {
    const $span = $(el);
    const $next = $span.next('span');
    
    if ($next.length && $span.attr('style') === $next.attr('style')) {
      const spanHtml = $span.html() || '';
      const nextHtml = $next.html() || '';
      $span.html(spanHtml + nextHtml);
      $next.remove();
    }
  });
  
  // Eliminar spans innecessaris (sense estils ni classes)
  $('span:not([style]):not([class])').each((_, el) => {
    const $span = $(el);
    const content = $span.html() || '';
    $span.replaceWith(content);
  });
}

// 5️⃣ NORMALITZAR PARÀGRAFS I ELIMINAR ESPAIS MASSIUS
function normalizeParagraphs($: cheerio.Root) {
  $('p').each((_, el) => {
    const $p = $(el);
    
    // Verificar si el paràgraf només conté espais en blanc
    const text = $p.text().trim();
    const html = $p.html() || '';
    
    // Eliminar paràgrafs que només contenen espais o &nbsp;
    if (!text || /^[\s\u00A0]*$/.test(text) || /^(&nbsp;|\s|<br\s*\/?\s*>)*$/i.test(html)) {
      $p.remove();
      return;
    }
    
    // Eliminar marges i paddings inline
    let style = $p.attr('style') || '';
    style = style.replace(/margin[^;]*;?/gi, '');
    style = style.replace(/padding[^;]*;?/gi, '');
    style = style.replace(/text-indent[^;]*;?/gi, ''); // ← ELIMINAR TEXT-INDENT!
    style = style.replace(/line-height[^;]*;?/gi, ''); // Eliminar line-height problematics
    
    if (style.trim()) {
      $p.attr('style', style.trim());
    } else {
      $p.removeAttr('style');
    }
    
    $p.addClass('doc-paragraph');
  });
}

// 6️⃣ ELIMINAR ESTILS INLINE PROBLEMÀTICS
function removeProblematicInlineStyles($: cheerio.Root) {
  $('[style]').each((_, el) => {
    const $el = $(el);
    let style = $el.attr('style') || '';
    
    // Eliminar propietats problemàtiques
    const problematicProperties = [
      'text-indent',     // ← EL CULPABLE PRINCIPAL!
      'margin-left',
      'margin-right', 
      'padding-left',
      'padding-right',
      'font-family',
      'line-height: 1.15'
    ];
    
    problematicProperties.forEach(prop => {
      const regex = new RegExp(`${prop}[^;]*;?`, 'gi');
      style = style.replace(regex, '');
    });
    
    style = style.replace(/;\s*;/g, ';').replace(/^;|;$/g, '').trim();
    
    if (style) {
      $el.attr('style', style);
    } else {
      $el.removeAttr('style');
    }
  });
}

// 7️⃣ NETEJA FINAL ULTRA AGRESSIVA D'ESPAIS MASSIUS
function finalWhitespaceCleanup($: cheerio.Root) {
  console.log('🔥 NETEJA FINAL: Eliminant tots els espais massius...');
  
  // 1. Eliminar tots els elements que només contenen whitespace (PROTEGINT IMATGES)
  $('*').each((_, el) => {
    const $el = $(el);
    const tagName = $el.prop('tagName')?.toLowerCase();
    
    // PROTECCIÓ TOTAL: Saltar elements que mai haurien de ser eliminats
    if (!tagName || ['img', 'br', 'hr', 'input', 'meta', 'link', 'figure', 'picture'].includes(tagName)) {
      return;
    }
    
    // PROTECCIÓ EXTRA: Si conté imatges, mai eliminar
    if ($el.find('img').length > 0) {
      console.log(`🛡️ Protegint ${tagName} amb imatges`);
      return;
    }
    
    const text = $el.text().trim();
    const html = $el.html() || '';
    
    // Verificar si l'element només conté espais en blanc o &nbsp;
    if (!text || /^[\s\u00A0]*$/.test(text)) {
      // Comptar fills que no siguin només whitespace
      const meaningfulChildren = $el.children().filter((_, child) => {
        const $child = $(child);
        const childText = $child.text().trim();
        const childTag = $child.prop('tagName')?.toLowerCase();
        
        // Conservar imatges i altres elements importants
        if (['img', 'br', 'hr', 'figure', 'picture'].includes(childTag || '')) return true;
        
        // Si té contingut text real, conservar
        return Boolean(childText && !/^[\s\u00A0]*$/.test(childText));
      });
      
      // Si no té fills significatius, eliminar l'element
      if (meaningfulChildren.length === 0) {
        console.log(`🗑️ Eliminant element buit: ${tagName}`);
        $el.remove();
      }
    }
  });
  
  // 2. Neteja final de l'HTML generat
  let finalHtml = $.html();
  
  // Eliminar múltiples &nbsp; consecutius
  finalHtml = finalHtml.replace(/(&nbsp;\s*){2,}/g, ' ');
  finalHtml = finalHtml.replace(/&nbsp;/g, ' ');
  
  // Eliminar múltiples espais consecutius
  finalHtml = finalHtml.replace(/\s{2,}/g, ' ');
  
  // Eliminar salts de línia múltiples
  finalHtml = finalHtml.replace(/\n\s*\n/g, '\n');
  
  // Eliminar espais entre tags
  finalHtml = finalHtml.replace(/>\s+</g, '><');
  
  // Actualitzar el DOM amb l'HTML netejat
  $ = cheerio.load(finalHtml);
  
  console.log('✅ NETEJA FINAL COMPLETADA: Espais massius eliminats!');
}


// UTILITATS
function extractFontSize(style: string): number | null {
  const match = style.match(/font-size:\s*(\d+)pt/);
  return match ? parseInt(match[1]) : null;
}

function detectBoldText($el: cheerio.Cheerio, style: string): boolean {
  // Detectar negreta per estil inline
  if (style.includes('font-weight')) {
    if (style.includes('bold') || /font-weight:\s*[7-9]00/.test(style)) {
      return true;
    }
  }
  
  // Detectar negreta per elements HTML semàntics
  if ($el.find('strong, b').length > 0) {
    return true;
  }
  
  // Detectar si l'element està dins d'un strong o b
  if ($el.closest('strong, b').length > 0) {
    return true;
  }
  
  return false;
}

function detectGoogleDocsHeadings($: cheerio.Root): Array<{element: cheerio.Cheerio, level: number, text: string, fontSize: number | null, className: string}> {
  console.log('🎯 DETECTANT GOOGLE DOCS HEADING 1/2/3 ESPECÍFICS...');
  
  const detectedHeadings: Array<{element: cheerio.Cheerio, level: number, text: string, fontSize: number | null, className: string}> = [];
  
  // ESTRATÈGIA: Google Docs exporta Headings com elements amb:
  // - Classes específiques (potser c1, c2, c3 o heading-1, heading-2...)
  // - Font sizes consistents per cada nivell
  // - Font-weight bold
  // - Posició destacada en document
  
  $('*').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    
    // Saltar elements sense text
    if (!text || text.length === 0) return;
    
    const tagName = $el.prop('tagName')?.toLowerCase();
    const className = $el.attr('class') || '';
    const style = $el.attr('style') || '';
    const fontSize = extractFontSize(style);
    const isBold = detectBoldText($el, style);
    
    // CRITERIS ESPECÍFICS GOOGLE DOCS HEADINGS:
    let headingLevel = null;
    
    // 1. Classes explícites de heading
    if (/heading[-_]?[123]/i.test(className)) {
      if (/heading[-_]?1/i.test(className)) headingLevel = 1;
      else if (/heading[-_]?2/i.test(className)) headingLevel = 2;
      else if (/heading[-_]?3/i.test(className)) headingLevel = 3;
    }
    
    // 2. Tags HTML semàntics ja presents
    else if (['h1', 'h2', 'h3'].includes(tagName || '')) {
      headingLevel = parseInt(tagName?.slice(1) || '0');
    }
    
    // 3. Combinació font-size + bold que indica heading
    else if (isBold && fontSize) {
      // Detectar patrons típics de Google Docs Headings
      if (fontSize >= 20 && text.length > 10 && text.length < 100) {
        headingLevel = 1; // Heading 1: típicament 20-26pt
      } else if (fontSize >= 16 && fontSize < 20 && text.length > 5 && text.length < 80) {
        headingLevel = 2; // Heading 2: típicament 16-19pt  
      } else if (fontSize >= 13 && fontSize < 16 && text.length > 3 && text.length < 60) {
        headingLevel = 3; // Heading 3: típicament 13-15pt
      }
    }
    
    // 4. Patrons de classes Google Docs (c1, c2, c3 amb combinació específica)
    if (!headingLevel && /^c\d+/.test(className) && isBold && fontSize) {
      // Classes c* amb font gran + bold probablement són headings
      if (fontSize >= 18) headingLevel = 1;
      else if (fontSize >= 14) headingLevel = 2;
      else if (fontSize >= 12) headingLevel = 3;
    }
    
    if (headingLevel) {
      console.log(`🎯 GOOGLE HEADING TROBAT: H${headingLevel} "${text.substring(0, 40)}..." class="${className}" font=${fontSize}pt`);
      
      detectedHeadings.push({
        element: $el,
        level: headingLevel,
        text,
        fontSize,
        className
      });
    }
  });
  
  console.log(`✅ GOOGLE DOCS HEADINGS DETECTATS: ${detectedHeadings.length}`);
  return detectedHeadings;
}

function createSectionStructure($: cheerio.Root) {
  console.log('📋 CREANT ESTRUCTURA DE SECCIONS: H2 → secció, H3 → subsecció');
  
  let sectionCount = 0;
  let subsectionCount = 0;
  
  // Trobar tots els headings en ordre d'aparició
  const headings = $('h1, h2, h3').toArray();
  
  headings.forEach((heading, index) => {
    const $heading = $(heading);
    const level = parseInt($heading.prop('tagName')?.slice(1) || '0');
    const text = $heading.text().trim();
    
    if (level === 2) {
      sectionCount++;
      subsectionCount = 0; // Reset subsections en nova secció
      
      // Crear contenidor de secció
      const sectionId = `section-${sectionCount}`;
      $heading.attr('id', sectionId);
      $heading.attr('data-section-number', sectionCount.toString());
      
      console.log(`📋 SECCIÓ ${sectionCount}: "${text.substring(0, 40)}..."`);
      
      // Wrapar contingut de la secció fins al proper H2 o final
      const nextH2Index = headings.findIndex((h, i) => i > index && $(h).prop('tagName')?.toLowerCase() === 'h2');
      const endElement = nextH2Index >= 0 ? $(headings[nextH2Index]).prev() : $heading.parent().children().last();
      
      // Crear contenidor per al contingut de la secció
      const sectionContent: cheerio.Cheerio[] = [];
      let currentElement = $heading.next();
      
      while (currentElement.length && !currentElement.is('h2') && currentElement[0] !== endElement[0]) {
        sectionContent.push(currentElement);
        currentElement = currentElement.next();
      }
      
      // Afegir classe CSS per estilitzar secció
      sectionContent.forEach($el => {
        $el.addClass('section-content');
        $el.attr('data-section', sectionCount.toString());
      });
      
    } else if (level === 3) {
      subsectionCount++;
      
      // Crear contenidor de subsecció
      const subsectionId = `section-${sectionCount}-${subsectionCount}`;
      $heading.attr('id', subsectionId);
      $heading.attr('data-section-number', sectionCount.toString());
      $heading.attr('data-subsection-number', subsectionCount.toString());
      
      console.log(`📋   SUBSECCIÓ ${sectionCount}.${subsectionCount}: "${text.substring(0, 40)}..."`);
      
      // Marcar contingut de subsecció
      let currentElement = $heading.next();
      while (currentElement.length && !currentElement.is('h2, h3')) {
        currentElement.addClass('subsection-content');
        currentElement.attr('data-section', sectionCount.toString());
        currentElement.attr('data-subsection', subsectionCount.toString());
        currentElement = currentElement.next();
      }
    }
  });
  
  console.log(`📊 ESTRUCTURA CREADA: ${sectionCount} seccions amb subseccions`);
}

function detectSemanticHeadingLevel(text: string, currentH1Count: number): number | null {
  // REGLES SEMÀNTIQUES MILLORADES PER TÍTOLS GOOGLE DOCS
  
  // H1: Títol principal del document (només un per document)
  if (currentH1Count === 0 && (
    text.length < 100 &&
    (
      (text === text.toUpperCase() && text.length > 15) || // Títol llarg en majúscules
      /^(TÍTOL|TITLE|DOCUMENT|INFORME|REPORT|PROPOSTA|PROJECTE)/i.test(text) || // Paraules clau
      (text.split(' ').length <= 10 && text.length > 25 && !text.includes('.') && !text.includes(':') && /^[A-Z]/.test(text))
    )
  )) {
    return 1;
  }
  
  // H2: Títols de seccions principals (més permissiu)
  if (text.length < 120 && (
    /^\d+[\.\)]\s*[A-ZÀ-Ÿ]/.test(text) ||     // "1. Secció", "2) Secció" amb accents
    /^[A-ZÀ-Ÿ][A-ZÀ-Ÿ\s]{3,}:?\s*$/i.test(text) || // "INTRODUCCIÓ", "OBJECTIUS:" amb accents
    /^[A-ZÀ-Ÿ][a-zà-ÿ]+\s*[:.]/.test(text) ||  // "Introducció:", "Metodologia." amb accents
    /^[A-ZÀ-Ÿ][a-zà-ÿ\s]{8,50}$/.test(text) ||  // Títols normals capitalitzats llargs
    (text === text.toUpperCase() && text.length >= 8 && text.length <= 50 && text.split(' ').length <= 8) ||
    /^(Introducció|Objectius|Metodologia|Resultats|Conclusions|Antecedents|Context|Proposta)/i.test(text)
  )) {
    return 2;
  }
  
  // H3: Subseccions
  if (text.length < 80 && (
    /^\d+\.\d+\.?\s/.test(text) ||           // "1.1 Subsecció", "2.1. Altra"
    /^[a-zà-ÿ]\)\s/.test(text) ||            // "a) Punt", "b) Altre punt"
    /^-\s*[A-ZÀ-Ÿ]/.test(text) ||            // "- Subpunt"
    /^\*\s*[A-ZÀ-Ÿ]/.test(text) ||           // "* Subpunt"
    (text.split(' ').length <= 8 && text.length <= 60 && /^[A-ZÀ-Ÿ]/.test(text) && text.length > 10)
  )) {
    return 3;
  }
  
  // Si no coincideix amb cap patró semàntic clar
  return null;
}

function getHeadingLevel(fontSize: number): number | null {
  // JERARQUIA SEGURA: mai assignar títols que serien més petits que text normal (11pt)
  if (fontSize >= 20) return 1;  // H1: 20pt+ (matches CSS .doc-h1: 22pt)
  if (fontSize >= 16) return 2;  // H2: 16pt+ (matches CSS .doc-h2: 18pt)
  if (fontSize >= 14) return 3;  // H3: 14pt+ (matches CSS .doc-h3: 15pt)
  if (fontSize >= 12) return 4;  // H4: 12pt+ (matches CSS .doc-h4: 14pt)
  
  // SI la font és ≤ 11pt (igual o menor que text normal), NO és títol vàlid
  if (fontSize <= 11) {
    console.log(`⚠️ Font ${fontSize}pt massa petita per ser títol (text normal = 11pt)`);
    return null;
  }
  
  // Fonts entre 11-12pt: dubte → H6 mínim per seguretat
  return 6; // H6: 12pt mínim (matches CSS .doc-h6: 12pt)
}

function applyPlaceholders(html: string, placeholders: any[]): string {
  let result = html;
  
  placeholders.forEach((placeholder, index) => {
    const escapedText = placeholder.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedText}\\b`, 'gi');
    const confidenceClass = `confidence-${Math.floor(placeholder.confidence / 20)}`;
    
    result = result.replace(regex, 
      `<span class="placeholder-highlight ${confidenceClass}" data-placeholder-id="${index}" title="Variable: {{${placeholder.variable}}} (${placeholder.confidence}% confidence)">${placeholder.text}</span>`
    );
  });

  return result;
}

export default GoogleDocsRenderer;