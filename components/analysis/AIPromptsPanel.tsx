// components/analysis/AIPromptsPanel.tsx
// Left sidebar panel for AI prompts and instructions
import React, { useState } from 'react';

interface AIPromptsPanelProps {
  pipelineStatus?: string;
  onPromptUpdate?: (prompts: Record<string, string>) => void;
}

const AIPromptsPanel: React.FC<AIPromptsPanelProps> = ({
  pipelineStatus = 'uploaded',
  onPromptUpdate
}) => {
  const [prompts, setPrompts] = useState({
    extraction: 'Detect all placeholders and variable fields in this document. Focus on names, dates, amounts, and any field that might change between documents.',
    mapping: 'Create intelligent mappings between detected placeholders and Excel column headers. Consider semantic similarity and data types.',
    generation: 'Generate documents maintaining exact formatting and styling while replacing placeholders with mapped Excel data.'
  });

  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);

  const handlePromptChange = (key: string, value: string) => {
    const updatedPrompts = { ...prompts, [key]: value };
    setPrompts(updatedPrompts);
    onPromptUpdate?.(updatedPrompts);
  };

  return (
    <div className="space-y-4">
      {/* AI Instructions Header */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Instructions
          </h3>
          <p className="text-sm text-gray-600 mt-1">Customize AI behavior and prompts</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Extraction Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Extraction Prompt</label>
              <button
                onClick={() => setEditingPrompt(editingPrompt === 'extraction' ? null : 'extraction')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {editingPrompt === 'extraction' ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingPrompt === 'extraction' ? (
              <textarea
                value={prompts.extraction}
                onChange={(e) => handlePromptChange('extraction', e.target.value)}
                className="w-full p-2 text-xs border rounded-md resize-none"
                rows={3}
              />
            ) : (
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                {prompts.extraction}
              </p>
            )}
          </div>

          {/* Mapping Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Mapping Prompt</label>
              <button
                onClick={() => setEditingPrompt(editingPrompt === 'mapping' ? null : 'mapping')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {editingPrompt === 'mapping' ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingPrompt === 'mapping' ? (
              <textarea
                value={prompts.mapping}
                onChange={(e) => handlePromptChange('mapping', e.target.value)}
                className="w-full p-2 text-xs border rounded-md resize-none"
                rows={3}
              />
            ) : (
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                {prompts.mapping}
              </p>
            )}
          </div>

          {/* Generation Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Generation Prompt</label>
              <button
                onClick={() => setEditingPrompt(editingPrompt === 'generation' ? null : 'generation')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {editingPrompt === 'generation' ? 'Done' : 'Edit'}
              </button>
            </div>
            {editingPrompt === 'generation' ? (
              <textarea
                value={prompts.generation}
                onChange={(e) => handlePromptChange('generation', e.target.value)}
                className="w-full p-2 text-xs border rounded-md resize-none"
                rows={3}
              />
            ) : (
              <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md">
                {prompts.generation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPromptsPanel;