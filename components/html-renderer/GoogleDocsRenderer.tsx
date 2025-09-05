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
      
      <style jsx global>{`
        /* GOOGLE DOCS RENDERER - ESTILS GLOBALS */
        
        .google-docs-renderer {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #374151;
          background: white;
          word-wrap: break-word;
        }
        
        /* NETEJA INICIAL */
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

        /* HEADERS - JERARQUIA CLARA I VISIBLE */
        .google-docs-renderer__content h1 {
          font-size: 32px !important;
          font-weight: 700 !important;
          color: #111827 !important;
          margin: 48px 0 24px 0 !important;
          line-height: 1.1 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          border-bottom: 3px solid #3b82f6 !important;
          padding-bottom: 12px !important;
        }

        .google-docs-renderer__content h2 {
          font-size: 26px !important;
          font-weight: 600 !important;
          color: #1f2937 !important;
          margin: 40px 0 20px 0 !important;
          line-height: 1.2 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .google-docs-renderer__content h3 {
          font-size: 22px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin: 32px 0 16px 0 !important;
          line-height: 1.3 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .google-docs-renderer__content h4 {
          font-size: 20px !important;
          font-weight: 600 !important;
          color: #374151 !important;
          margin: 28px 0 14px 0 !important;
          line-height: 1.3 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .google-docs-renderer__content h5 {
          font-size: 18px !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
          margin: 24px 0 12px 0 !important;
          line-height: 1.4 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .google-docs-renderer__content h6 {
          font-size: 16px !important;
          font-weight: 600 !important;
          color: #6b7280 !important;
          margin: 20px 0 10px 0 !important;
          line-height: 1.4 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-style: italic !important;
        }

        /* PARÀGRAFS */
        .google-docs-renderer__content p {
          margin: 0 0 20px 0 !important;
          line-height: 1.7 !important;
          font-size: 16px !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          color: #374151 !important;
        }

        /* NEGRETES, CURSIVES, SUBRATLLATS */
        .google-docs-renderer__content strong,
        .google-docs-renderer__content b {
          font-weight: 700 !important;
        }

        .google-docs-renderer__content em,
        .google-docs-renderer__content i {
          font-style: italic !important;
        }

        .google-docs-renderer__content u {
          text-decoration: underline !important;
        }

        /* TAULES */
        .google-docs-renderer__content table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 32px 0 !important;
          border: 2px solid #d1d5db !important;
          background: white !important;
          border-radius: 8px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }

        .google-docs-renderer__content td,
        .google-docs-renderer__content th {
          border: 1px solid #e5e7eb !important;
          padding: 16px 20px !important;
          text-align: left !important;
          vertical-align: top !important;
          line-height: 1.5 !important;
          font-size: 15px !important;
        }

        .google-docs-renderer__content th {
          background-color: #f8fafc !important;
          font-weight: 600 !important;
          color: #374151 !important;
          border-bottom: 2px solid #d1d5db !important;
        }

        /* LLISTES */
        .google-docs-renderer__content ul,
        .google-docs-renderer__content ol {
          margin: 24px 0 !important;
          padding-left: 32px !important;
        }

        .google-docs-renderer__content li {
          margin: 8px 0 !important;
          line-height: 1.6 !important;
          font-size: 16px !important;
        }

        /* IMATGES */
        .google-docs-renderer__content img {
          max-width: 100% !important;
          height: auto !important;
          margin: 32px 0 !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
        }

        /* CONTEXTS */
        .google-docs-renderer--preview {
          padding: 40px !important;
          max-width: 800px !important;
          margin: 0 auto !important;
          background: white !important;
        }
        
        .google-docs-renderer--analysis {
          padding: 24px !important;
        }
        
        /* ANALYSIS CONTEXT - Font més petita */
        .google-docs-renderer--analysis .google-docs-renderer__content h1 { 
          font-size: 24px !important; 
          margin: 32px 0 16px 0 !important;
        }
        .google-docs-renderer--analysis .google-docs-renderer__content h2 { 
          font-size: 20px !important; 
          margin: 28px 0 12px 0 !important;
        }
        .google-docs-renderer--analysis .google-docs-renderer__content h3 { 
          font-size: 18px !important; 
          margin: 24px 0 10px 0 !important;
        }
        .google-docs-renderer--analysis .google-docs-renderer__content p { 
          font-size: 14px !important; 
          margin: 0 0 16px 0 !important;
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