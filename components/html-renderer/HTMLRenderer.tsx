'use client';

import React from 'react';
import { HTMLRendererEngine } from './HTMLRendererEngine';

export type HTMLSourceType = 'google-docs' | 'microsoft-office' | 'markdown' | 'plain-html' | 'auto-detect';

export interface HTMLRendererProps {
  /** HTML content to render */
  content: string;
  
  /** Source type - 'auto-detect' will analyze the HTML to determine the best renderer */
  sourceType?: HTMLSourceType;
  
  /** Rendering context affects styling decisions */
  context?: 'preview' | 'editor' | 'export' | 'print';
  
  /** Additional CSS classes to apply */
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
  
  /** Enable image lazy loading */
  enableImageLazyLoad?: boolean;
  
  /** Custom image handler */
  onImageLoad?: (src: string) => void;
  
  /** Enable table enhancements */
  enableTableEnhancements?: boolean;
  
  /** Custom styling overrides */
  styleOverrides?: Record<string, React.CSSProperties>;
}

export function HTMLRenderer({
  content,
  sourceType = 'auto-detect',
  context = 'preview',
  className = '',
  enablePlaceholders = false,
  placeholders = [],
  onPlaceholderClick,
  enableImageLazyLoad = true,
  onImageLoad,
  enableTableEnhancements = true,
  styleOverrides = {}
}: HTMLRendererProps) {
  const renderer = new HTMLRendererEngine({
    sourceType,
    context,
    enablePlaceholders,
    enableImageLazyLoad,
    enableTableEnhancements,
    styleOverrides
  });

  const { processedHTML, detectedSource, appliedStyles } = renderer.render(content, placeholders);

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
      className={`html-renderer html-renderer--${detectedSource} html-renderer--${context} ${className}`}
      onClick={handleClick}
    >
      <div 
        className="html-renderer__content"
        dangerouslySetInnerHTML={{ __html: processedHTML }}
      />
      
      <style jsx>{`${appliedStyles}`}</style>
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="html-renderer__debug">
          <small>Source: {detectedSource} | Context: {context}</small>
        </div>
      )}
    </div>
  );
}

export default HTMLRenderer;