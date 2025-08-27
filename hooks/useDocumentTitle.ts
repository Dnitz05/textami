// hooks/useDocumentTitle.ts
// Custom hook for document title extraction and management
import { useMemo } from 'react';

interface UseDocumentTitleProps {
  title?: string;
  fileName?: string;
  markdown: string;
}

interface UseDocumentTitleReturn {
  displayTitle: string;
  extractedTitle: string;
  cleanedText: string;
}

export const useDocumentTitle = ({
  title,
  fileName,
  markdown
}: UseDocumentTitleProps): UseDocumentTitleReturn => {
  
  const { extractedTitle, cleanedText } = useMemo(() => {
    const extractTitleFromMarkdown = (text: string) => {
      const lines = text.split('\n');
      if (lines.length > 0 && lines[0].startsWith('# ')) {
        const extractedTitle = lines[0].replace('# ', '').trim();
        const cleanedText = lines.slice(1).join('\n').replace(/^\n+/, '');
        return { extractedTitle, cleanedText };
      }
      return { extractedTitle: '', cleanedText: text };
    };

    return extractTitleFromMarkdown(markdown);
  }, [markdown]);

  const displayTitle = useMemo(() => {
    if (fileName) return fileName; // Show complete filename with extension
    if (title) return title;
    return extractedTitle;
  }, [fileName, title, extractedTitle]);

  const removeDocumentTitle = useMemo(() => {
    if (!displayTitle) return cleanedText;
    
    const lines = cleanedText.split('\n');
    // Remove the first H1 header if it matches the display title
    if (lines.length > 0 && lines[0].trim() === `# ${displayTitle}`) {
      return lines.slice(1).join('\n').replace(/^\n+/, '');
    }
    return cleanedText;
  }, [displayTitle, cleanedText]);

  return {
    displayTitle,
    extractedTitle,
    cleanedText: removeDocumentTitle
  };
};