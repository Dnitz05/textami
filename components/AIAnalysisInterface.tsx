'use client';

import React, { useState } from 'react';
import { AnalysisData, ParsedTag, PipelineStatus } from '../lib/types';
import DocumentPreviewPanel from './analysis/DocumentPreviewPanel';
import DetectedTagsPanel from './analysis/DetectedTagsPanel';
import ExcelMappingPanel from './analysis/ExcelMappingPanel';
import TemplateFreezePanel from './analysis/TemplateFreezePanel';

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
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Analysis Results</h2>
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

      {/* 4-Panel Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Document Preview */}
        <DocumentPreviewPanel 
          markdown={analysisData.markdown}
          sections={analysisData.sections}
          tables={analysisData.tables}
          signatura={analysisData.signatura}
        />

        {/* Panel 2: Detected Tags */}
        <DetectedTagsPanel 
          tags={analysisData.tags}
          onTagUpdate={onTagUpdate}
          editingEnabled={pipelineStatus !== 'frozen'}
        />

        {/* Panel 3: Excel Mapping */}
        <ExcelMappingPanel 
          tags={analysisData.tags}
          excelHeaders={excelHeaders}
          onMappingUpdate={handleMappingUpdate}
          pipelineStatus={pipelineStatus}
        />

        {/* Panel 4: Template Freeze */}
        <TemplateFreezePanel 
          pipelineStatus={pipelineStatus}
          onFreeze={onFreeze}
          mappingsCount={getMappedCount()}
          totalTags={analysisData.tags.length}
        />
      </div>
    </div>
  );
};

export default AIAnalysisInterface;