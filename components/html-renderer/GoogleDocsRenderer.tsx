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
          text-align: inherit !important; /* Respect original Google Docs alignment */
          border-bottom: 2px solid #cccccc !important;
          padding-bottom: 0.5cm !important;
        }

        .google-docs-renderer h2 {
          font-size: 14pt !important; /* Reduced section size */
          font-weight: bold !important;
          color: #444444 !important;
          margin: 1cm 0 0.5cm 0 !important; /* Reduced spacing */
          line-height: 1.2 !important;
          text-align: inherit !important; /* Respect original Google Docs alignment */
          border-bottom: 1px solid #dddddd !important;
          padding-bottom: 0.25cm !important;
        }

        .google-docs-renderer h3 {
          font-size: 12pt !important; /* Reduced subsection size */
          font-weight: bold !important;
          color: #555555 !important;
          margin: 0.75cm 0 0.4cm 0 !important; /* Reduced spacing */
          line-height: 1.3 !important;
          text-align: inherit !important; /* Respect original Google Docs alignment */
        }

        .google-docs-renderer h4 {
          font-size: 13pt !important;
          font-weight: bold !important;
          color: #555555 !important;
          margin: 0.8cm 0 0.4cm 0 !important;
          line-height: 1.3 !important;
          text-align: inherit !important; /* Respect original Google Docs alignment */
        }

        .google-docs-renderer h5 {
          font-size: 12pt !important;
          font-weight: bold !important;
          color: #666666 !important;
          margin: 0.6cm 0 0.3cm 0 !important;
          line-height: 1.4 !important;
          text-align: inherit !important; /* Respect original Google Docs alignment */
        }

        .google-docs-renderer h6 {
          font-size: 11pt !important;
          font-weight: bold !important;
          color: #666666 !important;
          margin: 0.5cm 0 0.25cm 0 !important;
          line-height: 1.4 !important;
          font-style: italic !important;
          text-align: inherit !important; /* Respect original Google Docs alignment */
        }

        /* PARÀGRAFS - PROFESSIONAL DOCUMENT FORMAT */
        .google-docs-renderer p {
          margin: 0 0 0.75cm 0 !important; /* Professional paragraph spacing */
          line-height: 1.5 !important; /* Professional line height */
          font-size: 11pt !important; /* Reduced body text size */
          color: #333333 !important; /* Professional text color */
          text-align: justify !important; /* Professional document justification */
        }

        /* NEGRETES, CURSIVES, SUBRATLLATS */
        .google-docs-renderer strong,
        .google-docs-renderer b {
          font-weight: 700 !important;
        }

        .google-docs-renderer em,
        .google-docs-renderer i {
          font-style: italic !important;
        }

        .google-docs-renderer u {
          text-decoration: underline !important;
        }

        /* TAULES - PROFESSIONAL DOCUMENT FORMAT */
        .google-docs-renderer table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 1cm 0 !important; /* Professional table spacing */
          border: 1px solid #cccccc !important; /* Professional border color */
          background: white !important;
          font-size: 11pt !important; /* Slightly smaller for tables */
        }

        .google-docs-renderer td,
        .google-docs-renderer th {
          border: 1px solid #cccccc !important; /* Professional border color */
          padding: 0.5cm 0.75cm !important; /* Professional cell padding */
          text-align: left !important;
          vertical-align: top !important;
          line-height: 1.5 !important;
        }

        .google-docs-renderer th {
          background-color: #f2f2f2 !important; /* Professional header background */
          font-weight: bold !important;
          color: #333333 !important;
        }

        .google-docs-renderer caption {
          caption-side: bottom !important;
          font-style: italic !important;
          margin-top: 0.5cm !important;
          text-align: center !important;
          font-size: 10pt !important;
        }

        /* LLISTES - PROFESSIONAL DOCUMENT FORMAT */
        .google-docs-renderer ul,
        .google-docs-renderer ol {
          margin: 0.5cm 0 0.75cm 0 !important; /* Professional list spacing */
          padding-left: 1.5cm !important; /* Professional indentation */
          list-style-position: outside !important;
        }

        .google-docs-renderer li {
          margin: 0.25cm 0 !important; /* Professional list item spacing */
          line-height: 1.5 !important;
          font-size: 11pt !important; /* Match reduced body text size */
        }

        /* IMATGES I FIGURES - PROFESSIONAL DOCUMENT FORMAT */
        .google-docs-renderer figure {
          margin: 0.25cm 0 !important; /* Minimal spacing to integrate with text */
          text-align: left !important; /* Align with document flow */
        }

        .google-docs-renderer img {
          max-width: 100% !important;
          height: auto !important;
          border: none !important;
          padding: 0 !important;
          margin: 0.25cm 0 !important; /* Minimal spacing to integrate with text */
          display: block !important;
        }

        .google-docs-renderer figcaption {
          font-style: italic !important;
          font-size: 10pt !important; /* Smaller caption size */
          margin-top: 0.25cm !important;
          text-align: left !important;
          color: #666666 !important;
        }

        /* ELEMENTS PROFESSIONALS ESPECÍFICS */
        .google-docs-renderer .signature {
          margin-top: 2cm !important; /* Professional signature spacing */
          text-align: right !important; /* Right-aligned signature */
          font-size: 11pt !important; /* Smaller signature text */
          border-top: 1px solid #dddddd !important; /* Professional separator line */
          padding-top: 0.5cm !important;
        }

        .google-docs-renderer .signature p {
          margin-bottom: 0.25cm !important; /* Reduced signature line spacing */
        }

        .google-docs-renderer header {
          text-align: center !important;
          font-size: 10pt !important; /* Small header text */
          color: #666666 !important; /* Lighter header color */
          margin-bottom: 1cm !important;
          border-bottom: 1px solid #eeeeee !important;
          padding-bottom: 0.5cm !important;
        }

        .google-docs-renderer footer {
          text-align: center !important;
          font-size: 10pt !important; /* Small footer text */
          color: #666666 !important; /* Lighter footer color */
          margin-top: 1cm !important;
          border-top: 1px solid #eeeeee !important;
          padding-top: 0.5cm !important;
        }

        /* CODE BLOCKS PER DOCUMENTS TÈCNICS */
        .google-docs-renderer code,
        .google-docs-renderer pre {
          font-family: 'Courier New', monospace !important;
          background-color: #f9f9f9 !important;
          padding: 0.25cm !important;
          border: 1px solid #eeeeee !important;
          border-radius: 4px !important;
          font-size: 11pt !important;
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