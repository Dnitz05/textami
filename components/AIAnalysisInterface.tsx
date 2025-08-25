'use client';

import React, { useState } from 'react';
import { AnalysisData, ParsedTag, PipelineStatus } from '../lib/types';
import DocumentPreviewPanel from './analysis/DocumentPreviewPanel';
import DetectedTagsPanel from './analysis/DetectedTagsPanel';
import ExcelMappingPanel from './analysis/ExcelMappingPanel';
import TemplateFreezePanel from './analysis/TemplateFreezePanel';
import AIPromptsPanel from './analysis/AIPromptsPanel';
import KnowledgePanel from './analysis/KnowledgePanel';

interface AIAnalysisInterfaceProps {
  analysisData: AnalysisData | null;
  excelHeaders?: string[];
  onTagUpdate?: (tags: ParsedTag[]) => void;
  onMappingUpdate?: (mappings: Record<string, string>) => void;
  onFreeze?: () => void;
  pipelineStatus?: PipelineStatus;
}

const AIAnalysisInterface: React.FC<AIAnalysisInterfaceProps> = ({
  analysisData,
  excelHeaders = [],
  onTagUpdate,
  onMappingUpdate,
  onFreeze,
  pipelineStatus = 'uploaded'
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-none px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">Document Analysis Interface</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Toggle AI Prompts & Knowledge"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Toggle Tags & Excel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              pipelineStatus === 'analyzed' ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            Analysis
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              pipelineStatus === 'mapped' || pipelineStatus === 'frozen' ? 'bg-green-500' : 
              excelHeaders.length > 0 ? 'bg-yellow-500' : 'bg-gray-300'
            }`}></div>
            Mapping
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              pipelineStatus === 'frozen' ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            Freeze
          </div>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - AI Prompts & Knowledge */}
        {showLeftSidebar && (
          <div className="w-80 flex-none bg-gray-50 border-r overflow-y-auto">
            <div className="p-4 space-y-4">
              <AIPromptsPanel 
                pipelineStatus={pipelineStatus}
              />
              <KnowledgePanel 
                pipelineStatus={pipelineStatus}
              />
            </div>
          </div>
        )}

        {/* Center - Document Preview */}
        <div className="flex-1 bg-gray-100 overflow-y-auto">
          <div className="flex justify-center p-4 md:p-8">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg mx-4 md:mx-0">
              <DocumentPreviewPanel 
                markdown={analysisData.markdown}
                sections={analysisData.sections}
                tables={analysisData.tables}
                signatura={analysisData.signatura}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Tags & Excel */}
        {showRightSidebar && (
          <div className="w-80 flex-none bg-gray-50 border-l overflow-y-auto">
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