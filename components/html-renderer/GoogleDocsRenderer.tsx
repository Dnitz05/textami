'use client';

import React from 'react';

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
  // Process HTML for Google Docs
  const processedHTML = React.useMemo(() => {
    let html = htmlContent;
    
    // Clean Google Docs artifacts
    html = cleanGoogleDocsHTML(html);
    
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
        /* GOOGLE DOCS RENDERER - ESTILS GLOBALS */
        
        .google-docs-renderer {
          font-family: 'Arial', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11pt; /* Reduced base size */
          line-height: 1.5; /* Professional document spacing */
          color: #333333; /* Professional dark color */
          background: white;
          word-wrap: break-word;
          max-width: 19cm; /* Single container with intermediate width */
          margin: 0 auto;
          padding: 1.5cm 2cm; /* Content padding */
        }
        
        /* NETEJA INICIAL */
        .google-docs-renderer > *:first-child {
          margin-top: 0 !important;
          border-top: none !important;
          padding-top: 0 !important;
        }
        
        .google-docs-renderer > *:last-child {
          margin-bottom: 0 !important;
        }
        
        .google-docs-renderer hr {
          display: none !important;
        }

        /* HEADERS - PROFESSIONAL DOCUMENT HIERARCHY */
        .google-docs-renderer h1 {
          font-size: 18pt !important; /* Reduced title size */
          font-weight: bold !important;
          color: #000000 !important;
          margin: 1.5cm 0 1cm 0 !important; /* Reduced spacing */
          line-height: 1.2 !important;
          text-align: left !important; /* Force left alignment */
          border-bottom: none !important; /* Remove separation line */
          padding-bottom: 0 !important; /* Remove padding */
        }

        .google-docs-renderer h2 {
          font-size: 14pt !important; /* Reduced section size */
          font-weight: bold !important;
          color: #444444 !important;
          margin: 1cm 0 0.5cm 0 !important; /* Reduced spacing */
          line-height: 1.2 !important;
          text-align: left !important; /* Force left alignment */
          border-bottom: none !important; /* Remove separation line */
          padding-bottom: 0 !important; /* Remove padding */
        }

        .google-docs-renderer h3 {
          font-size: 12pt !important; /* Reduced subsection size */
          font-weight: bold !important;
          color: #555555 !important;
          margin: 0.75cm 0 0.4cm 0 !important; /* Reduced spacing */
          line-height: 1.3 !important;
          text-align: left !important; /* Force left alignment */
        }

        .google-docs-renderer h4 {
          font-size: 13pt !important;
          font-weight: bold !important;
          color: #555555 !important;
          margin: 0.8cm 0 0.4cm 0 !important;
          line-height: 1.3 !important;
          text-align: left !important; /* Force left alignment */
        }

        /* ULTRA-ESPECÍFIC: CONTROL TOTAL SOBRE ALINEACIÓ */
        /* Sobreescriu TOTS els estils inline de Google Docs */
        .google-docs-renderer h1,
        .google-docs-renderer h1[style],
        .google-docs-renderer h1[style*="text-align"],
        .google-docs-renderer [style*="text-align"] h1,
        .google-docs-renderer div[style*="text-align"] h1,
        .google-docs-renderer p[style*="text-align"] h1,
        .google-docs-renderer span[style*="text-align"] h1 {
          text-align: left !important;
          font-size: 18pt !important;
          font-weight: bold !important;
          color: #000000 !important;
          margin: 1.5cm 0 1cm 0 !important;
          line-height: 1.2 !important;
          border-bottom: none !important;
          padding-bottom: 0 !important;
          border: none !important;
          text-decoration: none !important;
        }

        .google-docs-renderer h2,
        .google-docs-renderer h2[style],
        .google-docs-renderer h2[style*="text-align"],
        .google-docs-renderer [style*="text-align"] h2,
        .google-docs-renderer div[style*="text-align"] h2,
        .google-docs-renderer p[style*="text-align"] h2,
        .google-docs-renderer span[style*="text-align"] h2 {
          text-align: left !important;
          font-size: 14pt !important;
          font-weight: bold !important;
          color: #444444 !important;
          margin: 1cm 0 0.5cm 0 !important;
          line-height: 1.2 !important;
          border-bottom: none !important;
          padding-bottom: 0 !important;
          border: none !important;
          text-decoration: none !important;
        }

        .google-docs-renderer h3,
        .google-docs-renderer h3[style],
        .google-docs-renderer h3[style*="text-align"],
        .google-docs-renderer [style*="text-align"] h3,
        .google-docs-renderer div[style*="text-align"] h3,
        .google-docs-renderer p[style*="text-align"] h3,
        .google-docs-renderer span[style*="text-align"] h3 {
          text-align: left !important;
          font-size: 12pt !important;
          font-weight: bold !important;
          color: #555555 !important;
          margin: 0.75cm 0 0.4cm 0 !important;
          line-height: 1.3 !important;
          border: none !important;
          text-decoration: none !important;
        }

        .google-docs-renderer h4,
        .google-docs-renderer h4[style],
        .google-docs-renderer h4[style*="text-align"],
        .google-docs-renderer [style*="text-align"] h4,
        .google-docs-renderer div[style*="text-align"] h4,
        .google-docs-renderer p[style*="text-align"] h4 {
          text-align: left !important;
          font-size: 13pt !important;
          font-weight: bold !important;
          color: #555555 !important;
          margin: 0.8cm 0 0.4cm 0 !important;
          line-height: 1.3 !important;
          border: none !important;
          text-decoration: none !important;
        }

        .google-docs-renderer h5,
        .google-docs-renderer h5[style],
        .google-docs-renderer h5[style*="text-align"],
        .google-docs-renderer [style*="text-align"] h5,
        .google-docs-renderer div[style*="text-align"] h5,
        .google-docs-renderer p[style*="text-align"] h5 {
          text-align: left !important;
          font-size: 12pt !important;
          font-weight: bold !important;
          color: #666666 !important;
          margin: 0.6cm 0 0.3cm 0 !important;
          line-height: 1.4 !important;
          border: none !important;
          text-decoration: none !important;
        }

        .google-docs-renderer h6,
        .google-docs-renderer h6[style],
        .google-docs-renderer h6[style*="text-align"],
        .google-docs-renderer [style*="text-align"] h6,
        .google-docs-renderer div[style*="text-align"] h6,
        .google-docs-renderer p[style*="text-align"] h6 {
          text-align: left !important;
          font-size: 11pt !important;
          font-weight: bold !important;
          color: #666666 !important;
          margin: 0.5cm 0 0.25cm 0 !important;
          line-height: 1.4 !important;
          font-style: italic !important;
          border: none !important;
          text-decoration: none !important;
        }

        /* CONTROL EXTREMADAMENT ESPECÍFIC PARA CASOS EDGE */
        /* Força tots els paràgrafs que actuen com títols */
        .google-docs-renderer p[style*="font-weight: bold"],
        .google-docs-renderer p[style*="font-weight:bold"],
        .google-docs-renderer div[style*="font-weight: bold"],
        .google-docs-renderer div[style*="font-weight:bold"],
        .google-docs-renderer span[style*="font-weight: bold"] {
          text-align: left !important;
        }

        /* Sobreescriu estils inline específics de Google Docs */
        .google-docs-renderer *[style*="text-align: center"],
        .google-docs-renderer *[style*="text-align:center"],
        .google-docs-renderer *[style*="text-align: right"],
        .google-docs-renderer *[style*="text-align:right"],
        .google-docs-renderer *[style*="text-align: justify"],
        .google-docs-renderer *[style*="text-align:justify"] {
          text-align: left !important;
        }

        /* PARÀGRAFS - PROFESSIONAL DOCUMENT FORMAT */
        .google-docs-renderer p,
        .google-docs-renderer p[style],
        .google-docs-renderer p[style*="text-align"],
        .google-docs-renderer [style*="text-align"] p,
        .google-docs-renderer div[style*="text-align"] p {
          margin: 0 0 0.25cm 0 !important; /* Minimal spacing for better image integration */
          line-height: 1.5 !important; /* Professional line height */
          font-size: 11pt !important; /* Reduced body text size */
          color: #333333 !important; /* Professional text color */
          text-align: justify !important; /* Professional document justification */
        }

        /* NEGRETES, CURSIVES, SUBRATLLATS - CONTROL TOTAL */
        .google-docs-renderer strong,
        .google-docs-renderer strong[style],
        .google-docs-renderer b,
        .google-docs-renderer b[style],
        .google-docs-renderer [style*="font-weight"] strong,
        .google-docs-renderer [style*="font-weight"] b {
          font-weight: 700 !important;
          text-decoration: none !important;
          border: none !important;
        }

        .google-docs-renderer em,
        .google-docs-renderer em[style],
        .google-docs-renderer i,
        .google-docs-renderer i[style],
        .google-docs-renderer [style*="font-style"] em,
        .google-docs-renderer [style*="font-style"] i {
          font-style: italic !important;
          text-decoration: none !important;
          border: none !important;
        }

        .google-docs-renderer u,
        .google-docs-renderer u[style],
        .google-docs-renderer [style*="text-decoration"] u {
          text-decoration: underline !important;
          border: none !important;
        }

        /* TAULES - CONTROL TOTAL ULTRA-ESPECÍFIC */
        /* Sobreescriu TOTS els estils inline de Google Docs per taules */
        .google-docs-renderer table,
        .google-docs-renderer table[style],
        .google-docs-renderer table[style*="border"],
        .google-docs-renderer table[style*="margin"],
        .google-docs-renderer table[style*="width"],
        .google-docs-renderer div[style] table,
        .google-docs-renderer p[style] table,
        .google-docs-renderer [style*="text-align"] table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 0.25cm 0 !important; /* Minimal spacing for better image integration */
          border: 1px solid #cccccc !important; /* Professional border color */
          background: white !important;
          font-size: 11pt !important; /* Slightly smaller for tables */
          text-align: left !important;
        }

        .google-docs-renderer td,
        .google-docs-renderer td[style],
        .google-docs-renderer td[style*="border"],
        .google-docs-renderer td[style*="padding"],
        .google-docs-renderer td[style*="text-align"],
        .google-docs-renderer th,
        .google-docs-renderer th[style],
        .google-docs-renderer th[style*="border"],
        .google-docs-renderer th[style*="padding"],
        .google-docs-renderer th[style*="text-align"],
        .google-docs-renderer [style] td,
        .google-docs-renderer [style] th {
          border: 1px solid #cccccc !important; /* Professional border color */
          padding: 0.5cm 0.75cm !important; /* Professional cell padding */
          text-align: left !important;
          vertical-align: top !important;
          line-height: 1.5 !important;
        }

        .google-docs-renderer th,
        .google-docs-renderer th[style],
        .google-docs-renderer th[style*="background"],
        .google-docs-renderer th[style*="font-weight"],
        .google-docs-renderer [style] th {
          background-color: #f2f2f2 !important; /* Professional header background */
          font-weight: bold !important;
          color: #333333 !important;
          text-align: left !important;
        }

        .google-docs-renderer caption,
        .google-docs-renderer caption[style],
        .google-docs-renderer caption[style*="text-align"],
        .google-docs-renderer [style] caption {
          caption-side: bottom !important;
          font-style: italic !important;
          margin-top: 0.5cm !important;
          text-align: center !important;
          font-size: 10pt !important;
        }

        /* LLISTES - CONTROL TOTAL ULTRA-ESPECÍFIC */
        /* Sobreescriu TOTS els estils inline de Google Docs per llistes */
        .google-docs-renderer ul,
        .google-docs-renderer ul[style],
        .google-docs-renderer ul[style*="margin"],
        .google-docs-renderer ul[style*="padding"],
        .google-docs-renderer ul[style*="text-align"],
        .google-docs-renderer ol,
        .google-docs-renderer ol[style],
        .google-docs-renderer ol[style*="margin"],
        .google-docs-renderer ol[style*="padding"],
        .google-docs-renderer ol[style*="text-align"],
        .google-docs-renderer div[style] ul,
        .google-docs-renderer div[style] ol,
        .google-docs-renderer p[style] ul,
        .google-docs-renderer p[style] ol {
          margin: 0.5cm 0 0.75cm 0 !important; /* Professional list spacing */
          padding-left: 1.5cm !important; /* Professional indentation */
          list-style-position: outside !important;
          text-align: left !important;
        }

        .google-docs-renderer li,
        .google-docs-renderer li[style],
        .google-docs-renderer li[style*="margin"],
        .google-docs-renderer li[style*="text-align"],
        .google-docs-renderer li[style*="font-size"],
        .google-docs-renderer ul[style] li,
        .google-docs-renderer ol[style] li,
        .google-docs-renderer [style] li {
          margin: 0.25cm 0 !important; /* Professional list item spacing */
          line-height: 1.5 !important;
          font-size: 11pt !important; /* Match reduced body text size */
          text-align: left !important;
        }

        /* IMATGES I FIGURES - CONTROL TOTAL ULTRA-ESPECÍFIC */
        /* Sobreescriu TOTS els estils inline de Google Docs per imatges */
        .google-docs-renderer figure,
        .google-docs-renderer figure[style],
        .google-docs-renderer figure[style*="margin"],
        .google-docs-renderer figure[style*="text-align"],
        .google-docs-renderer div[style] figure,
        .google-docs-renderer p[style] figure,
        .google-docs-renderer [style*="text-align"] figure {
          margin: 0.25cm 0 !important; /* Minimal spacing to integrate with text */
          text-align: left !important; /* Align with document flow */
          border: none !important;
          padding: 0 !important;
        }

        .google-docs-renderer img,
        .google-docs-renderer img[style],
        .google-docs-renderer img[style*="margin"],
        .google-docs-renderer img[style*="width"],
        .google-docs-renderer img[style*="height"],
        .google-docs-renderer img[style*="border"],
        .google-docs-renderer img[style*="padding"],
        .google-docs-renderer figure[style] img,
        .google-docs-renderer div[style] img,
        .google-docs-renderer p[style] img,
        .google-docs-renderer [style] img {
          max-width: 100% !important;
          height: auto !important;
          border: none !important;
          padding: 0 !important;
          margin: 0.25cm 0 !important; /* Minimal spacing to integrate with text */
          display: block !important;
        }

        .google-docs-renderer figcaption,
        .google-docs-renderer figcaption[style],
        .google-docs-renderer figcaption[style*="font-size"],
        .google-docs-renderer figcaption[style*="text-align"],
        .google-docs-renderer figcaption[style*="color"],
        .google-docs-renderer figure[style] figcaption,
        .google-docs-renderer [style] figcaption {
          font-style: italic !important;
          font-size: 10pt !important; /* Smaller caption size */
          margin-top: 0.25cm !important;
          text-align: left !important;
          color: #666666 !important;
        }

        /* ELEMENTS PROFESSIONALS - CONTROL TOTAL ULTRA-ESPECÍFIC */
        /* Sobreescriu TOTS els estils inline per elements professionals */
        .google-docs-renderer .signature,
        .google-docs-renderer .signature[style],
        .google-docs-renderer [class*="signature"],
        .google-docs-renderer [class*="signature"][style],
        .google-docs-renderer div[style*="text-align: right"],
        .google-docs-renderer div[style*="text-align:right"] {
          margin-top: 2cm !important; /* Professional signature spacing */
          text-align: right !important; /* Right-aligned signature */
          font-size: 11pt !important; /* Smaller signature text */
          border-top: 1px solid #dddddd !important; /* Professional separator line */
          padding-top: 0.5cm !important;
        }

        .google-docs-renderer .signature p,
        .google-docs-renderer .signature p[style],
        .google-docs-renderer [class*="signature"] p,
        .google-docs-renderer [class*="signature"] p[style] {
          margin-bottom: 0.25cm !important; /* Reduced signature line spacing */
          text-align: right !important;
        }

        .google-docs-renderer header,
        .google-docs-renderer header[style],
        .google-docs-renderer header[style*="text-align"],
        .google-docs-renderer header[style*="font-size"],
        .google-docs-renderer [style] header {
          text-align: center !important;
          font-size: 10pt !important; /* Small header text */
          color: #666666 !important; /* Lighter header color */
          margin-bottom: 1cm !important;
          border-bottom: 1px solid #eeeeee !important;
          padding-bottom: 0.5cm !important;
        }

        .google-docs-renderer footer,
        .google-docs-renderer footer[style],
        .google-docs-renderer footer[style*="text-align"],
        .google-docs-renderer footer[style*="font-size"],
        .google-docs-renderer [style] footer {
          text-align: center !important;
          font-size: 10pt !important; /* Small footer text */
          color: #666666 !important; /* Lighter footer color */
          margin-top: 1cm !important;
          border-top: 1px solid #eeeeee !important;
          padding-top: 0.5cm !important;
        }

        /* CODE BLOCKS - CONTROL TOTAL ULTRA-ESPECÍFIC */
        /* Sobreescriu TOTS els estils inline per blocs de codi */
        .google-docs-renderer code,
        .google-docs-renderer code[style],
        .google-docs-renderer code[style*="font-family"],
        .google-docs-renderer code[style*="background"],
        .google-docs-renderer pre,
        .google-docs-renderer pre[style],
        .google-docs-renderer pre[style*="font-family"],
        .google-docs-renderer pre[style*="background"],
        .google-docs-renderer [style] code,
        .google-docs-renderer [style] pre {
          font-family: 'Courier New', monospace !important;
          background-color: #f9f9f9 !important;
          padding: 0.25cm !important;
          border: 1px solid #eeeeee !important;
          border-radius: 4px !important;
          font-size: 11pt !important;
          text-align: left !important;
        }

        /* SELECTORS UNIVERSALS ULTRA-ESPECÍFICS - CONTROL TOTAL ABSOLUT */
        /* Aquests selectors capturen QUALSEVOL element amb estils inline que se'ns pugui escapar */
        
        /* Força alineació esquerra per TOTS els elements de text */
        .google-docs-renderer *[style*="text-align: center"],
        .google-docs-renderer *[style*="text-align:center"],
        .google-docs-renderer *[style*="text-align: right"], 
        .google-docs-renderer *[style*="text-align:right"],
        .google-docs-renderer *[style*="text-align: justify"],
        .google-docs-renderer *[style*="text-align:justify"],
        .google-docs-renderer div[style*="text-align"],
        .google-docs-renderer p[style*="text-align"],
        .google-docs-renderer span[style*="text-align"],
        .google-docs-renderer h1[style*="text-align"],
        .google-docs-renderer h2[style*="text-align"],
        .google-docs-renderer h3[style*="text-align"],
        .google-docs-renderer h4[style*="text-align"],
        .google-docs-renderer h5[style*="text-align"],
        .google-docs-renderer h6[style*="text-align"] {
          text-align: left !important;
        }

        /* Força text-align: justify per paràgrafs normals (excepte títols) */
        .google-docs-renderer p:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6),
        .google-docs-renderer p[style]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6),
        .google-docs-renderer div:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6) p,
        .google-docs-renderer div[style]:not(h1):not(h2):not(h3):not(h4):not(h5):not(h6) p {
          text-align: justify !important;
        }

        /* Elimina marges excessius de QUALSEVOL element */
        .google-docs-renderer *[style*="margin-top"],
        .google-docs-renderer *[style*="margin-bottom"],
        .google-docs-renderer *[style*="margin:"],
        .google-docs-renderer *[style*="margin "] {
          margin-top: 0.25cm !important;
          margin-bottom: 0.25cm !important;
        }

        /* Forçar mides de font consistents */
        .google-docs-renderer *[style*="font-size: 18pt"],
        .google-docs-renderer *[style*="font-size:18pt"] { font-size: 18pt !important; }
        .google-docs-renderer *[style*="font-size: 14pt"],
        .google-docs-renderer *[style*="font-size:14pt"] { font-size: 14pt !important; }
        .google-docs-renderer *[style*="font-size: 12pt"],
        .google-docs-renderer *[style*="font-size:12pt"] { font-size: 12pt !important; }
        .google-docs-renderer *[style*="font-size: 11pt"],
        .google-docs-renderer *[style*="font-size:11pt"] { font-size: 11pt !important; }
        .google-docs-renderer *[style*="font-size: 10pt"],
        .google-docs-renderer *[style*="font-size:10pt"] { font-size: 10pt !important; }

        /* Elimina borders i decoracions no desitjades */
        .google-docs-renderer *[style*="border"],
        .google-docs-renderer *[style*="text-decoration"] {
          border: none !important;
          text-decoration: none !important;
        }

        /* CONTEXTS */
        .google-docs-renderer--preview {
          max-width: 20cm !important; /* Preview mode wider */
          padding: 2cm 2.5cm !important;
          box-shadow: 0 0 10px rgba(0,0,0,0.1) !important;
        }
        
        .google-docs-renderer--analysis {
          max-width: 17cm !important; /* Analysis mode more compact */
          padding: 1.5cm 2cm !important;
        }
        
        /* ANALYSIS CONTEXT - Professional but compact */
        .google-docs-renderer--analysis h1 { 
          font-size: 16pt !important; /* Proportionally reduced */
          margin: 1cm 0 0.75cm 0 !important;
          border-bottom: 1px solid #cccccc !important; /* Thinner border */
        }
        .google-docs-renderer--analysis h2 { 
          font-size: 12pt !important; /* Proportionally reduced */
          margin: 0.75cm 0 0.5cm 0 !important;
          border-bottom: 1px solid #eeeeee !important; /* Lighter border */
        }
        .google-docs-renderer--analysis h3 { 
          font-size: 11pt !important; /* Proportionally reduced */
          margin: 0.5cm 0 0.25cm 0 !important;
        }
        .google-docs-renderer--analysis p { 
          font-size: 10pt !important; /* Proportionally reduced */
          margin: 0 0 0.5cm 0 !important;
        }
        .google-docs-renderer--analysis table {
          margin: 0.5cm 0 !important; /* Tighter table spacing in analysis */
          font-size: 10pt !important; /* Even smaller for analysis tables */
        }

        /* PLACEHOLDERS */
        .google-docs-renderer .placeholder-highlight {
          background-color: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          padding: 2px 4px !important;
        }
      `}</style>
    </>
  );
}

// Utility functions
function cleanGoogleDocsHTML(html: string): string {
  return html
    // Remove Google Docs specific artifacts
    .replace(/class="c\d+"/gi, '')
    .replace(/font-family:\s*Arial[^;]*/gi, '')
    .replace(/font-size:\s*11pt/gi, '')
    .replace(/line-height:\s*1\.15[^;]*/gi, '')
    .replace(/margin:\s*0pt[^;]*/gi, '')
    // Clean empty elements
    .replace(/<p[^>]*>\s*<\/p>/gi, '')
    .replace(/<div[^>]*>\s*<\/div>/gi, '')
    .replace(/<span[^>]*>\s*<\/span>/gi, '')
    // Fix multiple line breaks
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '<br />')
    .replace(/^\s*<br\s*\/?>/gi, '');
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