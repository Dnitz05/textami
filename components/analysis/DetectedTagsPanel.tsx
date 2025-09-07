// components/analysis/DetectedTagsPanel.tsx
// Panel 2: Detected tags with editing capabilities
import React, { useState } from 'react';
import { ParsedTag } from '../../lib/types';

interface DetectedTagsPanelProps {
  tags: ParsedTag[];
  onTagUpdate?: (tags: ParsedTag[]) => void;
  editingEnabled?: boolean;
}

const DetectedTagsPanel: React.FC<DetectedTagsPanelProps> = ({
  tags,
  onTagUpdate,
  editingEnabled = true
}) => {
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ParsedTag | null>(null);

  const handleEditStart = (index: number) => {
    if (!editingEnabled) return;
    setEditingTag(index);
    setEditForm({ ...tags[index] });
  };

  const handleEditSave = () => {
    if (editingTag !== null && editForm && onTagUpdate) {
      const updatedTags = [...tags];
      updatedTags[editingTag] = editForm;
      onTagUpdate(updatedTags);
    }
    setEditingTag(null);
    setEditForm(null);
  };

  const handleEditCancel = () => {
    setEditingTag(null);
    setEditForm(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'currency':
        return '€';
      case 'date':
        return '📅';
      case 'number':
        return '#';
      case 'percent':
        return '%';
      case 'address':
        return '📍';
      case 'id':
        return '🆔';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gray-50 h-20">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Detected Tags
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
            {tags.length}
          </span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">AI-detected variables and placeholders</p>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {tags.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-sm">No tags detected</div>
          </div>
        ) : (
          <div className="space-y-3">
            {tags.map((tag, index) => (
              <div key={`${tag.slug}-${index}`} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                {editingTag === index && editForm ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Example</label>
                      <input
                        type="text"
                        value={editForm.example}
                        onChange={(e) => setEditForm({ ...editForm, example: e.target.value })}
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="string">String</option>
                          <option value="date">Date</option>
                          <option value="currency">Currency</option>
                          <option value="number">Number</option>
                          <option value="percent">Percent</option>
                          <option value="address">Address</option>
                          <option value="id">ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Confidence</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={editForm.confidence}
                          onChange={(e) => setEditForm({ ...editForm, confidence: parseFloat(e.target.value) })}
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        onClick={handleEditCancel}
                        className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getTypeIcon(tag.type)}</span>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{tag.name}</div>
                          <div className="text-xs text-gray-500">{`{${tag.slug}}`}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(tag.confidence)}`}>
                          {Math.round(tag.confidence * 100)}%
                        </span>
                        {editingEnabled && (
                          <button
                            onClick={() => handleEditStart(index)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Example:</span>
                        <span className="text-xs text-gray-500">
                          {tag.type} • {tag.page ? `Page ${tag.page}` : 'No page'}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-800">{tag.example}</div>
                    </div>

                    {tag.anchor && (
                      <div className="mt-2 text-xs text-blue-600">
                        <span className="font-medium">Anchor:</span> {tag.anchor}
                      </div>
                    )}

                    {tag.normalized && tag.normalized !== tag.example && (
                      <div className="mt-2 text-xs text-green-600">
                        <span className="font-medium">Normalized:</span> {String(tag.normalized)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetectedTagsPanel;