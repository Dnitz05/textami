// components/analysis/KnowledgePanel.tsx
// Left sidebar panel for knowledge base and context
import React, { useState } from 'react';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'tip' | 'example' | 'warning' | 'info';
}

interface KnowledgePanelProps {
  pipelineStatus?: string;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  pipelineStatus = 'uploaded'
}) => {
  const [knowledgeItems] = useState<KnowledgeItem[]>([
    {
      id: '1',
      title: 'Placeholder Format',
      content: 'Use {{variable_name}} format for placeholders. Avoid spaces and special characters.',
      type: 'tip'
    },
    {
      id: '2', 
      title: 'Excel Column Matching',
      content: 'Column headers should be descriptive. "First_Name" matches better than "Col1".',
      type: 'example'
    },
    {
      id: '3',
      title: 'Date Formatting',
      content: 'Dates will be automatically formatted. Use consistent date format in your Excel data.',
      type: 'info'
    },
    {
      id: '4',
      title: 'Large Documents',
      content: 'Documents over 50 pages may take longer to process. Consider splitting them.',
      type: 'warning'
    }
  ]);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['1']));

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getTypeIcon = (type: KnowledgeItem['type']) => {
    switch (type) {
      case 'tip':
        return '💡';
      case 'example':
        return '📝';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  const getTypeColor = (type: KnowledgeItem['type']) => {
    switch (type) {
      case 'tip':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'example':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Knowledge Base
        </h3>
        <p className="text-sm text-gray-600 mt-1">Tips and best practices</p>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {knowledgeItems.map((item) => (
            <div key={item.id} className={`border rounded-lg ${getTypeColor(item.type)}`}>
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-opacity-80 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getTypeIcon(item.type)}</span>
                  <span className="font-medium text-sm">{item.title}</span>
                </div>
                <svg 
                  className={`w-4 h-4 transition-transform ${expandedItems.has(item.id) ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedItems.has(item.id) && (
                <div className="px-3 pb-3">
                  <p className="text-sm">{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Session Info</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Status: {pipelineStatus}</div>
            <div>Model: GPT-5 Vision</div>
            <div>Format: DOCX + Excel</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgePanel;