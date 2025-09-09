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

        /* TÍTOLS NETS - CLASSES PREDICTIBLES */
        .doc-heading,
        .doc-h1, .doc-h2, .doc-h3, .doc-h4, .doc-h5, .doc-h6 {
          font-weight: bold;
          line-height: 1.2;
          margin: 1cm 0 0.5cm 0;
        }
        
        .doc-h1 { font-size: 18pt; color: #000000; margin: 1.5cm 0 1cm 0; }
        .doc-h2 { font-size: 14pt; color: #444444; }
        .doc-h3 { font-size: 12pt; color: #555555; margin: 0.75cm 0 0.4cm 0; }
        .doc-h4 { font-size: 13pt; color: #555555; margin: 0.8cm 0 0.4cm 0; }
        .doc-h5 { font-size: 12pt; color: #666666; margin: 0.6cm 0 0.3cm 0; }
        .doc-h6 { font-size: 11pt; color: #666666; margin: 0.5cm 0 0.25cm 0; font-style: italic; }

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

        /* IMATGES PERFETES */
        .doc-image {
          max-width: 100%;
          height: auto;
          display: inline-block;
          vertical-align: top;
          margin: 0;
          border: none;
          padding: 0;
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
        
        /* ELIMINAR SEPARACIONS ABANS I DESPRÉS DE IMATGES */
        .google-docs-renderer .doc-image {
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          vertical-align: top !important;
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
      `}</style>
    </>
  );
}

// 🚀 ESTRATÈGIA GUANYADORA - POST-PROCESSAT HTML PERFECTE
function postProcessGoogleDocsHTML(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // 1️⃣ NORMALITZAR TÍTOLS I ALINEACIONS
    normalizeHeadingsAndAlignment($);
    
    // 2️⃣ OPTIMITZAR IMATGES
    optimizeImages($);
    
    // 3️⃣ ESTANDARDITZAR TAULES
    standardizeTables($);
    
    // 4️⃣ NETEJAR SPANS REDUNDANTS
    cleanRedundantSpans($);
    
    // 5️⃣ NORMALITZAR PARÀGRAFS
    normalizeParagraphs($);
    
    // 6️⃣ ELIMINAR ESTILS INLINE PROBLEMÀTICS
    removeProblematicInlineStyles($);
    
    // 7️⃣ NETEJA ABSOLUTA D'IMATGES - CLEAN SLATE
    absoluteImageCleanup($);
    
    return $.html();
    
  } catch (error) {
    console.warn('Error in HTML post-processing, falling back to original:', error);
    return html;
  }
}

// 1️⃣ NORMALITZAR TÍTOLS I ALINEACIONS
function normalizeHeadingsAndAlignment($: cheerio.Root) {
  // Convertir elements amb estils de títol a títols semàntics
  $('p, div').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const fontSize = extractFontSize(style);
    const isBold = style.includes('font-weight') && (style.includes('bold') || /font-weight:\s*[7-9]00/.test(style));
    
    if (fontSize && isBold) {
      let headingLevel = getHeadingLevel(fontSize);
      if (headingLevel) {
        const content = $el.html() || '';
        $el.replaceWith(`<h${headingLevel} class="doc-heading doc-h${headingLevel}">${content}</h${headingLevel}>`);
      }
    }
  });
  
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

// 5️⃣ NORMALITZAR PARÀGRAFS
function normalizeParagraphs($: cheerio.Root) {
  $('p').each((_, el) => {
    const $p = $(el);
    
    // Eliminar marges i paddings inline
    let style = $p.attr('style') || '';
    style = style.replace(/margin[^;]*;?/gi, '');
    style = style.replace(/padding[^;]*;?/gi, '');
    style = style.replace(/text-indent[^;]*;?/gi, ''); // ← ELIMINAR TEXT-INDENT!
    
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

// 7️⃣ NETEJA ABSOLUTA D'IMATGES - CLEAN SLATE STRATEGY
function absoluteImageCleanup($: cheerio.Root) {
  console.log('🚀 NETEJA ABSOLUTA: Extraient i recreant imatges...');
  
  $('img').each((_, img) => {
    const $img = $(img);
    
    // 1️⃣ EXTREURE: Guardar només dades essencials
    const src = $img.attr('src');
    const alt = $img.attr('alt') || 'Document image';
    const width = $img.attr('width');
    const height = $img.attr('height');
    
    if (!src) {
      console.warn('⚠️ Imatge sense src, saltant...');
      return;
    }
    
    // 2️⃣ CREAR: Nova imatge completament neta
    let cleanImgAttrs = `src="${src}" alt="${alt}" class="doc-image"`;
    if (width) cleanImgAttrs += ` width="${width}"`;
    if (height) cleanImgAttrs += ` height="${height}"`;
    
    const cleanImg = $(`<img ${cleanImgAttrs}>`);
    
    // 3️⃣ SOLUCIÓ DEFINITIVA: Moure imatges fora del HEAD/CSS al BODY
    const currentContainer = $img.parent();
    const isInHead = $img.closest('head').length > 0;
    const isInStyle = $img.closest('style').length > 0;
    
    console.log(`🔍 Imatge ubicació: head=${isInHead}, style=${isInStyle}, parent=${currentContainer[0] && 'tagName' in currentContainer[0] ? currentContainer[0].tagName : 'unknown'}`);
    
    if (isInHead || isInStyle) {
      // 🚀 IMATGE MALLOCADA AL HEAD: Trobar lloc adequat al body
      console.log('⚠️ IMATGE AL HEAD/STYLE: Buscant lloc adequat al body');
      
      // Buscar el primer paràgraf del body per insertar la imatge després
      const $firstBodyParagraph = $('body').find('p, div, h1, h2, h3').first();
      if ($firstBodyParagraph.length) {
        console.log('📍 INSERTANT imatge després del primer element del body');
        $firstBodyParagraph.after(cleanImg);
      } else {
        console.log('📍 INSERTANT imatge al començament del body');
        $('body').prepend(cleanImg);
      }
      $img.remove();
    } else {
      // Si està al body, aplicar neteja normal
      let $problemContainer = $img.closest('p, div');
      
      if ($problemContainer.length) {
        const rawText = $problemContainer.text() || '';
        const hasCSS = rawText.includes('@import') || rawText.includes('list-style-type') || rawText.length > 500;
        
        console.log(`🔍 Contenidor: CSS=${hasCSS}, chars=${rawText.length}`);
        
        if (hasCSS) {
          // Contenidor té CSS + contingut: estratègia intel·ligent
          console.log('🚀 CONTENIDOR AMB CSS: Aplicant estratègia intel·ligent');
          
          // 1️⃣ NOMÉS afegir la imatge neta al contenidor, eliminant la original
          $img.replaceWith(cleanImg);
          
          // 2️⃣ Eliminar tots els elements <style> dins del contenidor per netejar CSS
          $problemContainer.find('style').remove();
          
          // 3️⃣ Netejar atributs style massivs del contenidor
          const currentStyle = $problemContainer.attr('style') || '';
          if (currentStyle.includes('@import') || currentStyle.length > 100) {
            $problemContainer.removeAttr('style');
          }
          
          console.log('✅ Imatge reemplaçada dins del contenidor, CSS netejat');
        } else if (rawText.trim().length < 20) {
          // Contenidor normal sense text
          console.log('🗑️ ELIMINANT contenidor buit');
          $problemContainer.replaceWith(cleanImg);
        } else {
          // Contenidor amb text real
          console.log('📝 Mantenint imatge en contenidor amb text');
          $img.replaceWith(cleanImg);
        }
      } else {
        $img.replaceWith(cleanImg);
      }
    }
  });
  
  console.log('✅ NETEJA ABSOLUTA: Completada!');
}

// UTILITATS
function extractFontSize(style: string): number | null {
  const match = style.match(/font-size:\s*(\d+)pt/);
  return match ? parseInt(match[1]) : null;
}

function getHeadingLevel(fontSize: number): number | null {
  if (fontSize >= 18) return 1;  // H1: 18pt+ (matches CSS .doc-h1: 18pt)
  if (fontSize >= 14) return 2;  // H2: 14pt+ (matches CSS .doc-h2: 14pt)
  if (fontSize >= 12) return 3;  // H3: 12pt+ (matches CSS .doc-h3: 12pt)
  if (fontSize >= 11) return 4;  // H4: 11pt+ 
  if (fontSize >= 10) return 5;  // H5: 10pt+
  if (fontSize >= 9) return 6;   // H6: 9pt+
  return null;
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