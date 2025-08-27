// contexts/MappingContext.tsx
// Professional React Context for component communication
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { log } from '../lib/logger';

// Types
interface ManualTagInfo {
  selectedText: string;
  originalTag?: any;
}

interface MappingContextType {
  // Manual mapping state
  isManualMappingActive: boolean;
  activeManualHeader: string | null;
  manualTextMappings: Record<string, string>;
  manualTagInfo: Record<string, ManualTagInfo>;
  
  // Actions
  activateManualMapping: (header: string) => void;
  deactivateManualMapping: () => void;
  handleTextSelection: (selectedText: string, currentMappings: Record<string, string>) => void;
  updateManualMappings: (mappings: Record<string, string>, tagInfo: Record<string, ManualTagInfo>) => void;
  
  // State queries
  hasManualMapping: (header: string) => boolean;
  getManualTagInfo: (header: string) => ManualTagInfo | null;
}

// Context
const MappingContext = createContext<MappingContextType | null>(null);

// Hook for consuming context
export const useMapping = (): MappingContextType => {
  const context = useContext(MappingContext);
  if (!context) {
    throw new Error('useMapping must be used within a MappingProvider');
  }
  return context;
};

// Provider Props
interface MappingProviderProps {
  children: ReactNode;
  tags: any[];
  onMappingUpdate?: (mappings: Record<string, string>) => void;
}

// Provider Component
export const MappingProvider: React.FC<MappingProviderProps> = ({
  children,
  tags,
  onMappingUpdate
}) => {
  // State
  const [isManualMappingActive, setIsManualMappingActive] = useState(false);
  const [activeManualHeader, setActiveManualHeader] = useState<string | null>(null);
  const [manualTextMappings, setManualTextMappings] = useState<Record<string, string>>({});
  const [manualTagInfo, setManualTagInfo] = useState<Record<string, ManualTagInfo>>({});

  // Actions
  const activateManualMapping = (header: string) => {
    log.debug('Manual mapping activated', { header });
    setIsManualMappingActive(true);
    setActiveManualHeader(header);
  };

  const deactivateManualMapping = () => {
    log.debug('Manual mapping deactivated');
    setIsManualMappingActive(false);
    setActiveManualHeader(null);
  };

  const handleTextSelection = (selectedText: string, currentMappings: Record<string, string>) => {
    if (!isManualMappingActive || !activeManualHeader) {
      log.warn('Text selection attempted without active manual mapping');
      return;
    }

    log.ultrathink('Processing text selection', {
      header: activeManualHeader,
      selectedText: selectedText.substring(0, 50) + '...'
    });

    // Remove previous mappings for this header
    const newManualTextMappings = { ...manualTextMappings };
    const newManualTagInfo = { ...manualTagInfo };

    // Remove existing mapping for this header
    if (newManualTextMappings[activeManualHeader]) {
      delete newManualTextMappings[activeManualHeader];
      delete newManualTagInfo[activeManualHeader];
    }

    // Find matching tag
    const originalTag = tags.find(tag => 
      tag.example === selectedText || 
      tag.name.toLowerCase().includes(selectedText.toLowerCase()) ||
      selectedText.toLowerCase().includes(tag.name.toLowerCase())
    );

    // Create new mappings
    newManualTextMappings[activeManualHeader] = selectedText;
    newManualTagInfo[activeManualHeader] = {
      selectedText,
      originalTag: originalTag || null
    };

    // Update state
    setManualTextMappings(newManualTextMappings);
    setManualTagInfo(newManualTagInfo);

    log.success(`Manual mapping created: ${activeManualHeader}`, {
      hasOriginalTag: !!originalTag
    });

    // Notify parent about mapping update
    onMappingUpdate?.(currentMappings);

    // Deactivate manual mapping
    deactivateManualMapping();
  };

  const updateManualMappings = (
    mappings: Record<string, string>, 
    tagInfo: Record<string, ManualTagInfo>
  ) => {
    setManualTextMappings(mappings);
    setManualTagInfo(tagInfo);
  };

  // State queries
  const hasManualMapping = (header: string): boolean => {
    return !!manualTextMappings[header];
  };

  const getManualTagInfo = (header: string): ManualTagInfo | null => {
    return manualTagInfo[header] || null;
  };

  // Context value
  const contextValue: MappingContextType = {
    // State
    isManualMappingActive,
    activeManualHeader,
    manualTextMappings,
    manualTagInfo,
    
    // Actions
    activateManualMapping,
    deactivateManualMapping,
    handleTextSelection,
    updateManualMappings,
    
    // Queries
    hasManualMapping,
    getManualTagInfo
  };

  return (
    <MappingContext.Provider value={contextValue}>
      {children}
    </MappingContext.Provider>
  );
};