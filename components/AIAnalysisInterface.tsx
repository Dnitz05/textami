'use client';

import React, { useState } from 'react';
import { AnalysisData, ParsedTag, PipelineStatus } from '../lib/types';
import DocumentPreviewPanel from './analysis/DocumentPreviewPanel';
import ExcelMappingPanel from './analysis/ExcelMappingPanel';
import AIPromptsPanel from './analysis/AIPromptsPanel';
import { MappingProvider } from '../contexts/MappingContext';
import { log } from '../lib/logger';
import { useUser } from '../hooks/useUser';
// Knowledge moved to its own page - /knowledge

interface AIAnalysisInterfaceProps {
  analysisData: AnalysisData | null;
  excelHeaders?: string[];
  onTagUpdate?: (tags: ParsedTag[]) => void;
  onMappingUpdate?: (mappings: Record<string, string>) => void;
  onFreeze?: () => void;
  pipelineStatus?: PipelineStatus;
  fileName?: string;
  onSave?: () => void;
  onSaveAs?: () => void;
  onClose?: () => void;
  onExcelUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingExcel?: boolean;
}

const AIAnalysisInterface: React.FC<AIAnalysisInterfaceProps> = ({
  analysisData,
  excelHeaders = [],
  onTagUpdate,
  onMappingUpdate,
  onFreeze,
  pipelineStatus = 'uploaded',
  fileName = 'Document.pdf',
  onSave,
  onSaveAs,
  onClose,
  onExcelUpload,
  isProcessingExcel = false
}) => {
  const { user } = useUser();
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  
  // State for AI instruction execution
  const [currentMarkdown, setCurrentMarkdown] = useState(analysisData?.markdown || '');
  const [modifiedSections, setModifiedSections] = useState<Record<string, string>>({});
  const [originalSectionContent, setOriginalSectionContent] = useState<Record<string, string>>({});
  const [isExecutingInstruction, setIsExecutingInstruction] = useState(false);
  const [executingInstructionId, setExecutingInstructionId] = useState<string | null>(null);
  
  // State for custom instruction input
  const [customInstruction, setCustomInstruction] = useState('');
  const [isExecutingCustom, setIsExecutingCustom] = useState(false);
  
  // Removed: section-specific instructions state (no longer needed)
  
  // State for knowledge documents
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<Array<{
    filename: string;
    storagePath: string;
    type: string;
    description: string;
  }>>([]);
  
  // State for section-specific instruction form
  const [selectedSectionForInstruction, setSelectedSectionForInstruction] = useState<string | null>(null);
  
  // Update current markdown when analysis data changes
  React.useEffect(() => {
    if (analysisData?.markdown) {
      setCurrentMarkdown(analysisData.markdown);
    }
  }, [analysisData?.markdown]);

  // Load knowledge documents on component mount
  React.useEffect(() => {
    // Don't wait for user - load immediately with fallback
    const loadKnowledgeDocuments = async () => {
      try {
        const userId = user?.id || 'anonymous';
        const response = await fetch(`/api/knowledge?userId=${userId}`);
        const result = await response.json();
        if (result.success) {
          setKnowledgeDocuments(result.data.map((doc: any) => ({
            filename: doc.filename,
            storagePath: doc.storagePath,
            type: doc.type,
            description: doc.description
          })));
        }
      } catch (error) {
        console.error('Error loading knowledge documents:', error);
      }
    };

    loadKnowledgeDocuments();
  }, [user]);

  if (!analysisData) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="text-gray-500">Upload and analyze a document to see results here</div>
        </div>
      </div>
    );
  }

  const handleMappingUpdate = (newMappings: Record<string, string>) => {
    setMappings(newMappings);
    onMappingUpdate?.(newMappings);
  };

  const handleMappingRemove = (header: string) => {
    console.log('🗑️ Removing mapping for header:', header);
    const newMappings = { ...mappings };
    delete newMappings[header];
    setMappings(newMappings);
    onMappingUpdate?.(newMappings);
  };

  const getMappedCount = () => {
    return Object.keys(mappings).length;
  };

  const handleInstructionExecute = async (instruction: any) => {
    try {
      console.log('🤖 Executing instruction:', instruction.title);
      setIsExecutingInstruction(true);
      setExecutingInstructionId(instruction.id);

      // For section instructions, find and extract the specific section content
      let sectionContent = undefined;
      if (instruction.type === 'section' && instruction.target && analysisData?.sections) {
        const targetSection = analysisData.sections.find(s => s.id === instruction.target);
        if (targetSection) {
          sectionContent = targetSection.markdown;
          console.log('🎯 Found section content for:', instruction.target, 'Length:', sectionContent?.length);
          
          // Store original content if not already stored
          if (!originalSectionContent[instruction.target]) {
            setOriginalSectionContent(prev => ({
              ...prev,
              [instruction.target]: targetSection.markdown
            }));
            console.log('💾 Stored original content for section:', instruction.target);
          }
        } else {
          console.warn('⚠️ Section not found:', instruction.target);
          throw new Error(`Section "${instruction.target}" not found in document`);
        }
      }

      const response = await fetch('/api/ai-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruction,
          originalContent: currentMarkdown,
          sectionContent,
          knowledgeDocuments
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Handle partial updates for section modifications
        if (result.data.isPartialUpdate && result.data.targetSection && result.data.modifiedSectionContent) {
          // Update only the specific section using section ID
          setModifiedSections(prev => ({
            ...prev,
            [result.data.targetSection]: result.data.modifiedSectionContent
          }));
          console.log('✅ Section instruction executed successfully:', {
            instruction: instruction.title,
            section: result.data.targetSection,
            executionTime: result.data.executionTime + 'ms'
          });
        } else {
          // Update the entire document for global instructions
          setCurrentMarkdown(result.data.modifiedContent);
          setModifiedSections({}); // Clear section modifications
          console.log('✅ Global instruction executed successfully:', {
            instruction: instruction.title,
            executionTime: result.data.executionTime + 'ms'
          });
        }
      } else {
        throw new Error(result.error || 'Failed to execute instruction');
      }
    } catch (error) {
      console.error('❌ Error executing instruction:', error);
      alert('Error executant la instrucció: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    } finally {
      setIsExecutingInstruction(false);
      setExecutingInstructionId(null);
    }
  };

  const handleCustomInstructionExecute = async () => {
    if (!customInstruction.trim()) {
      alert('Si us plau, introdueix una instrucció');
      return;
    }

    try {
      console.log('🤖 Executing custom instruction:', customInstruction);
      setIsExecutingCustom(true);

      // Create a custom instruction object
      const instruction = {
        id: `custom_${Date.now()}`,
        type: 'global' as const,
        title: 'Instrucció personalitzada',
        instruction: customInstruction.trim()
      };

      // Use loaded knowledge documents for context

      const response = await fetch('/api/ai-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruction,
          originalContent: currentMarkdown,
          knowledgeDocuments
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the document preview with modified content
        setCurrentMarkdown(result.data.modifiedContent);
        // Clear the input after successful execution
        setCustomInstruction('');
        console.log('✅ Custom instruction executed successfully');
      } else {
        throw new Error(result.error || 'Failed to execute custom instruction');
      }
    } catch (error) {
      console.error('❌ Error executing custom instruction:', error);
      alert('Error executant la instrucció: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    } finally {
      setIsExecutingCustom(false);
    }
  };

  const handleInstructionDeactivate = (instruction: any) => {
    console.log('🔄 Deactivating instruction:', instruction.title);
    
    if (instruction.type === 'section' && instruction.target) {
      // Restore original section content
      const originalContent = originalSectionContent[instruction.target];
      if (originalContent) {
        // Remove the section from modified sections to show original content
        setModifiedSections(prev => {
          const updated = { ...prev };
          delete updated[instruction.target];
          return updated;
        });
        console.log('✅ Restored original content for section:', instruction.target);
      } else {
        console.warn('⚠️ No original content found for section:', instruction.target);
      }
    } else if (instruction.type === 'global') {
      // For global instructions, restore original markdown
      if (analysisData?.markdown) {
        setCurrentMarkdown(analysisData.markdown);
        setModifiedSections({});
        console.log('✅ Restored original global content');
      }
    }
  };

  const handleSectionClick = (section: any, index: number) => {
    log.yolo('Section instruction button clicked - opening AI prompts panel', { 
      section: section.title || `Section ${index + 1}`, 
      index 
    });
    
    // Show the left sidebar (AI prompts panel) if hidden
    setShowLeftSidebar(true);
    
    // Set the section to open the form with pre-selected section
    const sectionId = section.id || section.title;
    setSelectedSectionForInstruction(sectionId);
    
    // Clear the selection after a short delay to reset the trigger
    setTimeout(() => {
      setSelectedSectionForInstruction(null);
    }, 100);
    
    log.success(`Panel AI obert per crear instrucció específica de: ${section.title || `Secció ${index + 1}`}`);
  };

  const handleSectionEdit = (section: any, index: number) => {
    log.yolo('Section edit clicked', { 
      section: section.title || `Section ${index + 1}`, 
      index 
    });
    
    // TODO: Implement inline editing functionality
    // For now, show a notification
    alert(`Funcionalitat d'edició per "${section.title || `Secció ${index + 1}`}" - Pròximament disponible!`);
  };

  return (
    <MappingProvider 
      tags={analysisData?.tags || []} 
      onMappingUpdate={onMappingUpdate}
    >
      <div className="h-screen flex flex-col">
        {/* Fixed layout without outer padding/margins - sidebars attached to document */}
        <div className="flex-1 flex">
        {/* Toggle buttons - positioned at top right (accounting for fixed navbar) */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-sm bg-white"
            title="Toggle AI Prompts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 shadow-sm bg-white"
            title="Toggle Excel Mapping"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>


        {/* Center - Document Preview with enhanced spacing */}
        <div className="flex-1 bg-gray-50 overflow-y-auto relative">
          <div className="flex justify-center">
            <div className="bg-gray-50 border border-gray-200 relative" style={{width: '210mm'}}>
              {/* Left Sidebar - positioned to align right edge with left edge of template */}
              {showLeftSidebar && (
                <div className="fixed w-80 bg-gray-50/80 backdrop-blur-sm shadow-2xl border border-white/30 flex flex-col z-10 m-4" 
                     style={{right: 'calc(50% + 105mm)', top: '5rem', bottom: '1rem'}}>
                  {/* Sidebar Header */}
                  <div className="px-6 py-5 border-b border-gray-200/50 bg-gray-50/40 backdrop-blur-sm flex-none">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Instructions
                    </h3>
                  </div>
                  
                  {/* Scrollable prompts area with ethereal spacing */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/40 backdrop-blur-sm">
                    <AIPromptsPanel 
                      pipelineStatus={pipelineStatus}
                      onInstructionExecute={handleInstructionExecute}
                      onInstructionDeactivate={handleInstructionDeactivate}
                      isExecuting={isExecutingInstruction}
                      executingInstructionId={executingInstructionId}
                      documentSections={analysisData?.sections?.map(s => ({id: s.id || s.title, title: s.title})) || []}
                      openFormWithSection={selectedSectionForInstruction}
                      documentId={(() => {
                        // Always use a consistent identifier - prefer templateName but fallback to a stable ID
                        if (typeof window !== 'undefined') {
                          const templateName = sessionStorage.getItem('templateName');
                          if (templateName) {
                            return templateName;
                          }
                        }
                        // Fallback to a stable identifier based on analysis data
                        return `doc_${analysisData?.title || fileName || 'untitled'}`.replace(/[^a-zA-Z0-9_]/g, '_');
                      })()}
                    />
                  </div>
                </div>
              )}

              {/* Right Sidebar - positioned to align left edge with right edge of template */}
              {showRightSidebar && (
                <div className="fixed w-80 bg-gray-50/80 backdrop-blur-sm shadow-2xl border border-white/30 flex flex-col z-10 m-4" 
                     style={{left: 'calc(50% + 105mm)', top: '5rem', bottom: '1rem'}}>
                  {/* Sidebar Header */}
                  <div className="px-6 py-5 border-b border-gray-200/50 bg-gray-50/40 backdrop-blur-sm flex-none">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Smart Mapping
                    </h3>
                  </div>
                  
                  {/* Excel Mapping Content with ethereal spacing */}
                  <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/40 backdrop-blur-sm">
                    <ExcelMappingPanel 
                      tags={analysisData.tags}
                      excelHeaders={excelHeaders}
                      onMappingUpdate={handleMappingUpdate}
                      pipelineStatus={pipelineStatus}
                      onExcelUpload={onExcelUpload}
                      isProcessingExcel={isProcessingExcel}
                      documentMarkdown={currentMarkdown}
                    />
                  </div>
                </div>
              )}

              <DocumentPreviewPanel 
                title={analysisData.title}
                markdown={currentMarkdown}
                sections={analysisData.sections}
                tables={analysisData.tables}
                tags={analysisData.tags}
                signatura={analysisData.signatura}
                isProcessing={isExecutingInstruction}
                fileName={fileName}
                onSave={onSave}
                onSaveAs={onSaveAs}
                onClose={onClose}
                mappedTags={mappings}
                onMappingRemove={handleMappingRemove}
                onSectionClick={handleSectionClick}
                onSectionEdit={handleSectionEdit}
                modifiedSections={modifiedSections}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
    </MappingProvider>
  );
};

export default AIAnalysisInterface;