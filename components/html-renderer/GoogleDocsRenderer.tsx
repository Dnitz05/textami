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
  // Convertir elements amb estils de títol a títols semàntics - MILLORAT
  $('p, div, span').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style') || '';
    const text = $el.text().trim();
    
    // Saltar si no té contingut text
    if (!text) return;
    
    const fontSize = extractFontSize(style);
    const isBold = detectBoldText($el, style);
    
    // Detecció més flexible de títols
    let headingLevel = null;
    
    // Per mida de font
    if (fontSize && isBold) {
      headingLevel = getHeadingLevel(fontSize);
    }
    
    // Per patrons de text comuns (títols sense estils explícits)
    if (!headingLevel && isBold) {
      if (text.length < 100 && !text.includes('.') && text === text.toUpperCase()) {
        headingLevel = 2; // Títols en majúscules
      } else if (text.length < 60 && text.split(' ').length <= 8) {
        headingLevel = 3; // Títols curts
      }
    }
    
    // Aplicar el títol detectat
    if (headingLevel) {
      const content = $el.html() || '';
      $el.replaceWith(`<h${headingLevel} class="doc-heading doc-h${headingLevel}">${content}</h${headingLevel}>`);
      console.log(`🏷️ Títol H${headingLevel} detectat: "${text.substring(0, 50)}..."`);
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