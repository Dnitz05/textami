'use client';

import React, { useState } from 'react';
import { AnalysisData, ParsedTag, PipelineStatus } from '../lib/types';
import DocumentPreviewPanel from './analysis/DocumentPreviewPanel';
import DetectedTagsPanel from './analysis/DetectedTagsPanel';
import ExcelMappingPanel from './analysis/ExcelMappingPanel';
import TemplateFreezePanel from './analysis/TemplateFreezePanel';
import AIPromptsPanel from './analysis/AIPromptsPanel';
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
  onClose
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  
  // State for AI instruction execution
  const [currentMarkdown, setCurrentMarkdown] = useState(analysisData?.markdown || '');
  const [isExecutingInstruction, setIsExecutingInstruction] = useState(false);
  const [executingInstructionId, setExecutingInstructionId] = useState<string | null>(null);
  
  // State for custom instruction input
  const [customInstruction, setCustomInstruction] = useState('');
  const [isExecutingCustom, setIsExecutingCustom] = useState(false);
  
  // Update current markdown when analysis data changes
  React.useEffect(() => {
    if (analysisData?.markdown) {
      setCurrentMarkdown(analysisData.markdown);
    }
  }, [analysisData?.markdown]);

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

  const getMappedCount = () => {
    return Object.keys(mappings).length;
  };

  const handleInstructionExecute = async (instruction: any) => {
    try {
      console.log('🤖 Executing instruction:', instruction.title);
      setIsExecutingInstruction(true);
      setExecutingInstructionId(instruction.id);

      // Get current knowledge base documents (would need to be passed from KnowledgePanel)
      const knowledgeDocuments: any[] = []; // TODO: Get from KnowledgePanel state

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
        console.log('✅ Instruction executed successfully:', {
          instruction: instruction.title,
          executionTime: result.data.executionTime + 'ms'
        });
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

      // Get current knowledge base documents (would need to be passed from KnowledgePanel)
      const knowledgeDocuments: any[] = []; // TODO: Get from KnowledgePanel state

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

  return (
    <div className="h-screen flex flex-col">
      {/* 3-Column Layout - Sidebars sticky to screen edges */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toggle buttons - positioned at top right */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded shadow-sm bg-white"
            title="Toggle AI Prompts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setShowRightSidebar(!showRightSidebar)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded shadow-sm bg-white"
            title="Toggle Tags & Excel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
          {/* Left Sidebar - AI Prompts */}
          {showLeftSidebar && (
            <div className="w-72 flex-none bg-gray-50 border-r flex flex-col">
              {/* Scrollable prompts area */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <AIPromptsPanel 
                    pipelineStatus={pipelineStatus}
                    onInstructionExecute={handleInstructionExecute}
                    isExecuting={isExecutingInstruction}
                    executingInstructionId={executingInstructionId}
                  />
                </div>
              </div>
              
              {/* Fixed custom instruction input area */}
              <div className="border-t bg-white p-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Instrucció personalitzada:
                  </label>
                  <textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="Escriu aquí la teva instrucció per modificar el document..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    disabled={isExecutingCustom}
                  />
                  <button
                    onClick={handleCustomInstructionExecute}
                    disabled={isExecutingCustom || !customInstruction.trim()}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isExecutingCustom ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span>Executant...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Executar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Center - Document Preview */}
          <div className="flex-1 bg-gray-100 overflow-y-auto">
            <div className="flex justify-center p-4 md:p-6">
              <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg">
                <DocumentPreviewPanel 
                  markdown={currentMarkdown}
                  sections={analysisData.sections}
                  tables={analysisData.tables}
                  signatura={analysisData.signatura}
                  isProcessing={isExecutingInstruction}
                  fileName={fileName}
                  onSave={onSave}
                  onSaveAs={onSaveAs}
                  onClose={onClose}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tags & Excel */}
          {showRightSidebar && (
            <div className="w-72 flex-none bg-gray-50 border-l overflow-y-auto">
              <div className="p-4 space-y-4">
              <DetectedTagsPanel 
                tags={analysisData.tags}
                onTagUpdate={onTagUpdate}
                editingEnabled={pipelineStatus !== 'frozen'}
              />
              
              <ExcelMappingPanel 
                tags={analysisData.tags}
                excelHeaders={excelHeaders}
                onMappingUpdate={handleMappingUpdate}
                pipelineStatus={pipelineStatus}
              />
              
              <TemplateFreezePanel 
                pipelineStatus={pipelineStatus}
                onFreeze={onFreeze}
                mappingsCount={getMappedCount()}
                totalTags={analysisData.tags.length}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisInterface;