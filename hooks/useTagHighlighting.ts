// hooks/useTagHighlighting.ts
// Custom hook for tag highlighting and mapping logic
import { useMemo } from 'react';
import { log } from '../lib/logger';

interface UseTagHighlightingProps {
  tags: any[];
  mappedTags: Record<string, string>;
  manualTextMappings: Record<string, string>;
  manualTagInfo: Record<string, any>;
}

interface TagColors {
  [header: string]: string;
}

export const useTagHighlighting = ({
  tags,
  mappedTags,
  manualTextMappings,
  manualTagInfo
}: UseTagHighlightingProps) => {

  // Generate consistent colors for Excel headers
  const headerColors: TagColors = useMemo(() => {
    const uniqueHeaders = [...new Set(Object.keys(mappedTags))];
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    
    return uniqueHeaders.reduce((acc, header, index) => {
      acc[header] = colors[index % colors.length];
      return acc;
    }, {} as TagColors);
  }, [mappedTags]);

  // Generate consistent colors for original tags
  const getOriginalTagColor = (tag: any): string => {
    const tagColors = [
      '#059669', '#DC2626', '#7C2D12', '#1D4ED8', '#7C3AED',
      '#C2410C', '#BE185D', '#4338CA', '#0891B2', '#65A30D'
    ];
    const hash = tag.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return tagColors[hash % tagColors.length];
  };

  // Process manual text mappings with proper color preservation
  const processManualMappings = (text: string): string => {
    let processedText = text;

    Object.entries(manualTextMappings).forEach(([header, selectedText]) => {
      const tagInfo = manualTagInfo[header];
      const originalTag = tagInfo?.originalTag;
      const tagColor = originalTag ? getOriginalTagColor(originalTag) : headerColors[header];

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

        const regex = new RegExp(selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const replacements = (processedText.match(regex) || []).length;
        processedText = processedText.replace(regex, visualMapping);

        log.success(`Manual mapping applied: ${header}`, { replacements });
      }
    });

    return processedText;
  };

  // Process automatic tag mappings
  const processTagMappings = (text: string): string => {
    let processedText = text;
    const mappedTagSlugs = new Set(Object.values(mappedTags));
    const tagsToHighlight = tags.filter(tag => mappedTagSlugs.has(tag.slug));
    const sortedTags = tagsToHighlight.sort((a, b) => (b.example?.length || 0) - (a.example?.length || 0));

    log.debug('Tag mapping system initialized', {
      totalTags: tags.length,
      tagsToHighlight: tagsToHighlight.length
    });

    sortedTags.forEach((tag, index) => {
      if (tag.example && tag.example.trim()) {
        const example = tag.example.trim();
        const excelHeader = Object.keys(mappedTags).find(header => mappedTags[header] === tag.slug);

        if (excelHeader) {
          // Skip if this header has a manual text mapping
          const hasManualMapping = manualTextMappings[excelHeader];
          if (hasManualMapping) {
            log.debug('Skipping tag mapping, header has manual mapping', {
              excelHeader,
              tagExample: example
            });
            return;
          }

          const headerColor = headerColors[excelHeader];
          const visualMapping = `
            <span class="visual-mapping-container" data-excel-header="${excelHeader}">
              <span class="mapped-term" 
                    style="background-color: ${headerColor}15; border-color: ${headerColor}; color: ${headerColor}" 
                    data-tag-id="tag-${index}-${Date.now()}">
                ${excelHeader}
              </span>
            </span>
          `;

          // Multiple replacement strategies
          const strategies = [
            () => new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            () => new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            () => new RegExp(`\\b${example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'),
            () => /[\d€$.,]/.test(example) ? new RegExp(example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null
          ];

          for (let i = 0; i < strategies.length; i++) {
            const regex = strategies[i]();
            if (regex && processedText.match(regex)) {
              processedText = processedText.replace(regex, visualMapping);
              break;
            }
          }
        }
      }
    });

    return processedText;
  };

  // Main highlighting function
  const highlightTags = (text: string): string => {
    log.ultrathink('Starting highlight process', {
      mappedTagsCount: Object.keys(mappedTags).length,
      manualMappingsCount: Object.keys(manualTextMappings).length
    });

    // Process manual mappings first (higher priority)
    let highlighted = processManualMappings(text);
    
    // Then process automatic tag mappings
    highlighted = processTagMappings(highlighted);

    return highlighted;
  };

  return {
    headerColors,
    getOriginalTagColor,
    highlightTags
  };
};