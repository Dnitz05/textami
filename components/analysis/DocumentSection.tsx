// components/analysis/DocumentSection.tsx
// Memoized component for individual document sections to prevent unnecessary re-renders
import React from 'react';

interface DocumentSectionProps {
  section: {
    id?: string;
    title?: string;
    markdown: string;
  };
  index: number;
  modifiedContent?: string;
  isModified: boolean;
  onSectionClick?: (section: any, index: number) => void;
  onSectionEdit?: (section: any, index: number) => void;
  highlightTags: (content: string) => string;
}

const DocumentSection: React.FC<DocumentSectionProps> = React.memo(({
  section,
  index,
  modifiedContent,
  isModified,
  onSectionClick,
  onSectionEdit,
  highlightTags
}) => {
  const sectionTitle = section.title || `Section ${index + 1}`;
  const sectionContent = isModified && modifiedContent ? modifiedContent : section.markdown;
  
  return (
    <div 
      key={section.id || index} 
      className="document-section"
    >
      {/* Section Action Buttons */}
      <div className="section-actions">
        {isModified && (
          <div className="text-xs text-blue-600 font-medium flex items-center mr-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            Modificat per IA
          </div>
        )}
        <button
          className="section-action-btn btn-edit"
          onClick={(e) => {
            e.stopPropagation();
            onSectionEdit?.(section, index);
          }}
          title="Editar aquesta secció"
        >
          ✏️ Editar
        </button>
        <button
          className="section-action-btn btn-ai"
          onClick={(e) => {
            e.stopPropagation();
            onSectionClick?.(section, index);
          }}
          title="Crear instrucció IA per aquesta secció"
        >
          🤖 IA
        </button>
      </div>

      {/* Section Content */}
      {section.title && (
        <h2>{section.title}</h2>
      )}
      <div 
        className="document-content"
        dangerouslySetInnerHTML={{ __html: highlightTags(sectionContent) }}
      />
    </div>
  );
});

DocumentSection.displayName = 'DocumentSection';

export default DocumentSection;