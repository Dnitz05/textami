// components/analysis/KnowledgePanel.tsx
// Left sidebar panel for knowledge base with uploaded PDFs for AI context
import React, { useState } from 'react';

interface KnowledgeDocument {
  id: string;
  filename: string;
  title: string;
  uploadDate: string;
  size: number;
  type: 'normativa' | 'reglament' | 'guia' | 'referencia';
  description: string;
  url?: string; // PDF URL
}

interface KnowledgePanelProps {
  pipelineStatus?: string;
  onDocumentUpload?: (document: File) => void;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({
  pipelineStatus = 'uploaded',
  onDocumentUpload
}) => {
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Si us plau, selecciona un arxiu PDF.');
      return;
    }

    setUploading(true);
    try {
      // Here you would upload the PDF to your storage and add it to the knowledge base
      const newDocument: KnowledgeDocument = {
        id: Date.now().toString(),
        filename: file.name,
        title: file.name.replace('.pdf', ''),
        uploadDate: new Date().toLocaleDateString(),
        size: file.size,
        type: 'referencia',
        description: 'Document de referència per contexte IA'
      };
      
      setKnowledgeDocuments(prev => [...prev, newDocument]);
      onDocumentUpload?.(file);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al pujar el document.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeDocument = (id: string) => {
    setKnowledgeDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const getTypeIcon = (type: KnowledgeDocument['type']) => {
    switch (type) {
      case 'normativa': return '📋';
      case 'reglament': return '⚖️';
      case 'guia': return '📖';
      case 'referencia': return '📄';
      default: return '📄';
    }
  };

  const getTypeColor = (type: KnowledgeDocument['type']) => {
    switch (type) {
      case 'normativa': return 'bg-blue-100 text-blue-800';
      case 'reglament': return 'bg-red-100 text-red-800';
      case 'guia': return 'bg-green-100 text-green-800';
      case 'referencia': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Knowledge Base
            </h3>
            <p className="text-sm text-gray-600 mt-1">PDFs per contexte IA</p>
          </div>
          <div className="relative">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="knowledge-pdf-upload"
              disabled={uploading}
            />
            <label
              htmlFor="knowledge-pdf-upload"
              className="cursor-pointer text-amber-600 hover:text-amber-800 text-sm flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>{uploading ? 'Pujant...' : '+ PDF'}</span>
            </label>
          </div>
        </div>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        {knowledgeDocuments.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-gray-500 mb-2">No hi ha documents de referència</p>
            <p className="text-xs text-gray-400">Puja PDFs per proporcionar contexte a la IA</p>
          </div>
        ) : (
          <div className="space-y-3">
            {knowledgeDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(doc.type)}</span>
                    <span className="font-medium text-sm truncate">{doc.title}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(doc.type)}`}>
                      {doc.type}
                    </span>
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>{doc.filename}</span>
                    <span>{formatFileSize(doc.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{doc.description}</span>
                    <span>{doc.uploadDate}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Session Info</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Status: {pipelineStatus}</div>
            <div>Documents: {knowledgeDocuments.length}</div>
            <div>Model: GPT-5 Vision</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgePanel;