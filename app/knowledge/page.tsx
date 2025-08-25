// app/knowledge/page.tsx
// Knowledge base management page
'use client';

import React, { useState, useEffect } from 'react';
import TopNavBar from '../../components/TopNavBar';

interface KnowledgeDocument {
  id: string;
  filename: string;
  title: string;
  uploadDate: string;
  size: number;
  type: 'normativa' | 'reglament' | 'guia' | 'referencia';
  description: string;
  url?: string;
  userId: string;
  storagePath: string;
}

const KnowledgePage: React.FC = () => {
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // For now, using a simple user identifier - would be replaced with proper auth
  const userId = 'user-001';

  // Load user's knowledge base on component mount
  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/knowledge?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setKnowledgeDocuments(result.data);
      } else {
        console.error('Failed to load knowledge base:', result.error);
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Si us plau, selecciona un arxiu PDF.');
      return;
    }

    setUploading(true);
    try {
      // Upload to persistent knowledge base
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('userId', userId);
      formData.append('type', 'referencia');
      formData.append('description', 'Document de referència per contexte IA');

      const response = await fetch('/api/knowledge', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (result.success) {
        // Add to local state
        setKnowledgeDocuments(prev => [result.data, ...prev]);
        console.log('✅ PDF uploaded to knowledge base:', result.data.filename);
      } else {
        throw new Error(result.error || 'Failed to upload PDF');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error al pujar el document: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeDocument = async (doc: KnowledgeDocument) => {
    if (!confirm(`Segur que vols eliminar "${doc.filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/knowledge?documentId=${doc.id}&storagePath=${encodeURIComponent(doc.storagePath)}&userId=${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setKnowledgeDocuments(prev => prev.filter(d => d.id !== doc.id));
        console.log('✅ PDF removed from knowledge base:', doc.filename);
      } else {
        throw new Error(result.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error removing document:', error);
      alert('Error eliminant el document: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    }
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
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <svg className="w-8 h-8 mr-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Base de Coneixement
              </h1>
              <p className="text-gray-600 mt-2">Gestiona els teus documents PDF de referència per proporcionar contexte a la IA</p>
            </div>

            {/* Upload Button */}
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
                className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>{uploading ? 'Pujant...' : 'Pujar PDF'}</span>
              </label>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{knowledgeDocuments.length}</p>
                  <p className="text-sm text-gray-600">Documents</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(knowledgeDocuments.reduce((total, doc) => total + doc.size, 0) / 1024 / 1024)}
                  </p>
                  <p className="text-sm text-gray-600">MB Total</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">AI</p>
                  <p className="text-sm text-gray-600">Context Ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <svg className="animate-spin w-12 h-12 mx-auto text-amber-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-gray-500">Carregant base de coneixement...</p>
              </div>
            ) : knowledgeDocuments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hi ha documents</h3>
                <p className="text-gray-500 mb-6">Comença pujant PDFs per crear la teva base de coneixement</p>
                <label
                  htmlFor="knowledge-pdf-upload"
                  className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Pujar primer PDF</span>
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {knowledgeDocuments.map((doc) => (
                  <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <span className="text-2xl flex-shrink-0">{getTypeIcon(doc.type)}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
                          <p className="text-sm text-gray-500 truncate">{doc.filename}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(doc.type)}`}>
                          {doc.type}
                        </span>
                        <button
                          onClick={() => removeDocument(doc)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar document"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Mida:</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data:</span>
                        <span>{doc.uploadDate}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-xs text-gray-500">{doc.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgePage;