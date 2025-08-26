'use client';

import React, { useState } from 'react';
import { AnalysisData, ParsedTag, PipelineStatus } from '../lib/types';
import DocumentPreviewPanel from './analysis/DocumentPreviewPanel';
import ExcelMappingPanel from './analysis/ExcelMappingPanel';
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
    <div className="h-screen flex flex-col pt-20">
      {/* Fixed layout without outer padding/margins - sidebars attached to document */}
      <div className="flex-1 flex">
        {/* Toggle buttons - positioned at top right (accounting for fixed navbar) */}
        <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
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
            title="Toggle Excel Mapping"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>


        {/* Left Sidebar - AI Instructions */}
        {showLeftSidebar && (
          <div className="w-80 flex-none bg-white border-r-2 border-gray-300 flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-none">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Instructions
              </h3>
            </div>
            
            {/* Scrollable prompts area */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <AIPromptsPanel 
                pipelineStatus={pipelineStatus}
                onInstructionExecute={handleInstructionExecute}
                isExecuting={isExecutingInstruction}
                executingInstructionId={executingInstructionId}
              />
            </div>
            
            {/* Custom instruction input area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex-none">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Instrucció personalitzada
              </label>
              <textarea
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Escriu la teva instrucció aquí..."
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                rows={3}
                disabled={isExecutingCustom}
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              />
              <button
                onClick={handleCustomInstructionExecute}
                disabled={isExecutingCustom || !customInstruction.trim()}
                className="w-full mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded border border-blue-600 hover:bg-blue-700 hover:border-blue-700 disabled:bg-gray-400 disabled:border-gray-400 transition-colors"
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              >
                {isExecutingCustom ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Executant...
                  </span>
                ) : (
                  'Executar Instrucció'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Center - Document Preview */}
        <div className="flex-1 bg-gray-100 overflow-y-auto">
          <div className="flex justify-center">
            <div className="w-full max-w-4xl bg-white shadow-xl">
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
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Smart Mapping */}
        {showRightSidebar && (
          <div className="w-80 flex-none bg-white border-l-2 border-gray-300 flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-none">
              <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Smart Mapping
              </h3>
            </div>
            
            {/* Excel Mapping Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
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

      </div>
    </div>
  );
};

export default AIAnalysisInterface;