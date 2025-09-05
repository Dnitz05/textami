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
    <div 
      className={`google-docs-renderer google-docs-renderer--${context} ${className}`}
      onClick={handleClick}
    >
      <div 
        className="google-docs-renderer__content"
        dangerouslySetInnerHTML={{ __html: processedHTML }}
      />
      
      <style jsx>{`
        /* GOOGLE DOCS RENDERER - SISTEMA UNIFICAT I FLEXIBLE */
        
        .google-docs-renderer {
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #374151;
          background: white;
          word-wrap: break-word;
        }
        
        /* NETEJA INICIAL - ELIMINA ARTIFACTS DE GOOGLE DOCS */
        .google-docs-renderer__content > *:first-child {
          margin-top: 0 !important;
          border-top: none !important;
          padding-top: 0 !important;
        }
        
        .google-docs-renderer__content > *:last-child {
          margin-bottom: 0 !important;
        }
        
        .google-docs-renderer__content hr {
          display: none !important;
        }
        
        .google-docs-renderer__content *[style*="border-top"],
        .google-docs-renderer__content *[style*="border: 1pt solid transparent"] {
          border-top: none !important;
        }

        /* JERARQUIA DE HEADERS PROFESSIONAL */
        .google-docs-renderer__content h1 {
          font-size: 28px !important;
          font-weight: 700 !important;
          color: #1f2937 !important;
          margin: 40px 0 20px 0 !important;
          line-height: 1.2 !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          border-bottom: 2px solid #e5e7eb !important;
          padding-bottom: 8px !important;
        }

        .google-docs-renderer__content h2 {
          font-size: 24px !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 32px 0 16px 0 !important;
          line-height: 1.3 !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        }

        .google-docs-renderer__content h3 {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin: 28px 0 14px 0 !important;
          line-height: 1.4 !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        }

        .google-docs-renderer__content h4 {
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin: 24px 0 12px 0 !important;
          line-height: 1.4 !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        }

        .google-docs-renderer__content h5 {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
          margin: 20px 0 10px 0 !important;
          line-height: 1.4 !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        }

        .google-docs-renderer__content h6 {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
          margin: 18px 0 8px 0 !important;
          line-height: 1.4 !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          font-style: italic !important;
        }

        /* PARÀGRAFS AMB ESPAIAMENT PERFECTE */
        .google-docs-renderer__content p {
          margin: 0 0 18px 0 !important;
          line-height: 1.7 !important;
          font-size: 15px !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
          color: #374151 !important;
        }

        /* ESPACIAMENT ENTRE SECCIONS */
        .google-docs-renderer__content h1 + p,
        .google-docs-renderer__content h2 + p,
        .google-docs-renderer__content h3 + p {
          margin-top: 0 !important;
        }

        .google-docs-renderer__content p + h1,
        .google-docs-renderer__content p + h2,
        .google-docs-renderer__content p + h3 {
          margin-top: 48px !important;
        }

        /* FORMAT TEXT PRESERVATION - NEGRETES, CURSIVES, SUBRATLLATS */
        .google-docs-renderer__content strong,
        .google-docs-renderer__content b,
        .google-docs-renderer__content span[style*="font-weight:700"],
        .google-docs-renderer__content span[style*="font-weight: 700"],
        .google-docs-renderer__content span[style*="font-weight:bold"],
        .google-docs-renderer__content span[style*="font-weight: bold"] {
          font-weight: 700 !important;
        }

        .google-docs-renderer__content em,
        .google-docs-renderer__content i,
        .google-docs-renderer__content span[style*="font-style:italic"],
        .google-docs-renderer__content span[style*="font-style: italic"] {
          font-style: italic !important;
        }

        .google-docs-renderer__content u,
        .google-docs-renderer__content span[style*="text-decoration:underline"],
        .google-docs-renderer__content span[style*="text-decoration: underline"] {
          text-decoration: underline !important;
        }

        /* TAULES PROFESSIONALS AMB BORDES ELEGANTS */
        .google-docs-renderer__content table {
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          width: 100% !important;
          margin: 32px 0 !important;
          border: 1px solid #d1d5db !important;
          background: white !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }

        .google-docs-renderer__content td,
        .google-docs-renderer__content th {
          border: 1px solid #e5e7eb !important;
          padding: 14px 18px !important;
          text-align: left !important;
          vertical-align: top !important;
          line-height: 1.5 !important;
          font-size: 14px !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        }

        .google-docs-renderer__content th {
          background-color: #f8fafc !important;
          font-weight: 600 !important;
          color: #374151 !important;
          border-bottom: 2px solid #d1d5db !important;
        }

        .google-docs-renderer__content tr:nth-child(even) td {
          background-color: #fefefe !important;
        }

        .google-docs-renderer__content tr:hover td {
          background-color: #f1f5f9 !important;
        }

        /* LLISTES AMB ESPAIAMENT ADEQUAT */
        .google-docs-renderer__content ul,
        .google-docs-renderer__content ol {
          margin: 20px 0 !important;
          padding: 0 0 0 28px !important;
        }

        .google-docs-renderer__content li {
          margin: 10px 0 !important;
          line-height: 1.6 !important;
          font-size: 15px !important;
          font-family: 'Inter', 'Segoe UI', Arial, sans-serif !important;
        }

        /* IMATGES RESPONSIVES I ELEGANTS */
        .google-docs-renderer__content img,
        .google-docs-renderer__content .google-doc-image {
          max-width: 100% !important;
          height: auto !important;
          margin: 24px 0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
        }

        /* PLACEHOLDER HIGHLIGHTING SYSTEM */
        .placeholder-highlight {
          background-color: #fef3c7 !important;
          border: 1px solid #f59e0b !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          padding: 2px 4px !important;
        }
        
        .placeholder-highlight:hover {
          background-color: #fde68a !important;
          border-color: #d97706 !important;
          transform: scale(1.02) !important;
        }
        
        .confidence-5 { 
          border-color: #10b981 !important; 
          background-color: #d1fae5 !important; 
        }
        .confidence-4 { 
          border-color: #f59e0b !important; 
          background-color: #fef3c7 !important; 
        }
        .confidence-3 { 
          border-color: #ef4444 !important; 
          background-color: #fee2e2 !important; 
        }
        .confidence-2 { 
          border-color: #6b7280 !important; 
          background-color: #f3f4f6 !important; 
        }
        .confidence-1 { 
          border-color: #6b7280 !important; 
          background-color: #f9fafb !important; 
        }

        /* CONTEXT-SPECIFIC STYLING */
        
        /* Preview Context - Màxim visual impact */
        .google-docs-renderer--preview {
          padding: 32px !important;
          max-width: 900px !important;
          margin: 0 auto !important;
          background: white !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Editor Context - Compacte per editing */
        .google-docs-renderer--editor {
          padding: 20px !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 8px !important;
          background: #fafbfc !important;
        }
        
        /* Analysis Context - Optimitzat per anàlisi */
        .google-docs-renderer--analysis {
          padding: 16px !important;
          font-size: 14px !important;
        }
        
        .google-docs-renderer--analysis h1 { font-size: 22px !important; }
        .google-docs-renderer--analysis h2 { font-size: 19px !important; }
        .google-docs-renderer--analysis h3 { font-size: 17px !important; }
        .google-docs-renderer--analysis p { font-size: 13px !important; }
        
        /* Export Context - Minimalista per exportació */
        .google-docs-renderer--export {
          padding: 8px !important;
          font-size: 12px !important;
          color: #000 !important;
          background: white !important;
        }

        /* NETEJA D'ARTIFACTS DE DIVS I SPANS */
        .google-docs-renderer__content div {
          margin: 0 !important;
          padding: 0 !important;
        }

        .google-docs-renderer__content span {
          font-family: inherit !important;
          font-size: inherit !important;
          color: inherit !important;
          line-height: inherit !important;
        }

        /* SIGNATURES I FOOTERS */
        .google-docs-renderer__content .signature,
        .google-docs-renderer__content .footer {
          margin-top: 56px !important;
          padding-top: 24px !important;
          border-top: 2px solid #e5e7eb !important;
          text-align: center !important;
        }

        /* RESPONSIVE DESIGN */
        @media (max-width: 768px) {
          .google-docs-renderer--preview {
            padding: 16px !important;
            margin: 16px !important;
          }
          
          .google-docs-renderer__content h1 { font-size: 24px !important; }
          .google-docs-renderer__content h2 { font-size: 20px !important; }
          .google-docs-renderer__content h3 { font-size: 18px !important; }
          .google-docs-renderer__content p { font-size: 14px !important; }
        }
      `}</style>
    </div>
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