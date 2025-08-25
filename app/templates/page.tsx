// app/templates/page.tsx
// Templates management page - save and load document templates
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNavBar from '../../components/TopNavBar';

interface SavedTemplate {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  lastModified: string;
  userId: string;
  originalDocument: string;
  analysisData: {
    markdown: string;
    sections: any[];
    tables: any[];
    tags: any[];
    signatura?: any;
  };
  excelHeaders: string[];
  mappings: Record<string, string>;
  documentType: 'pdf' | 'docx';
  documentSize: number;
  tagsCount: number;
  mappedCount: number;
}

const TemplatesPage: React.FC = () => {
  const router = useRouter();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetic'>('newest');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [folders, setFolders] = useState<string[]>(['Personal', 'Treball', 'Clients']);
  
  // For now, using a simple user identifier - would be replaced with proper auth
  const userId = 'user-001';

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data);
      } else {
        console.error('Failed to load templates:', result.error);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Segur que vols eliminar aquesta plantilla?')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates?templateId=${templateId}&userId=${userId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        console.log('✅ Template deleted:', templateId);
      } else {
        throw new Error(result.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error eliminant la plantilla: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    }
  };

  const loadTemplate = (template: SavedTemplate) => {
    // Store template data in sessionStorage to pass to analyze page
    sessionStorage.setItem('loadedTemplate', JSON.stringify(template));
    router.push('/analyze');
  };

  const getDocumentTypeIcon = (type: string) => {
    return type === 'pdf' ? '📄' : '📝';
  };

  const getDocumentTypeColor = (type: string) => {
    return type === 'pdf' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getMappingPercentage = (template: SavedTemplate) => {
    if (template.tagsCount === 0) return 0;
    return Math.round((template.mappedCount / template.tagsCount) * 100);
  };

  const getSortedAndFilteredTemplates = () => {
    let filteredTemplates = [...templates];

    // Filter by folder (for now just return all since we don't have folder data)
    // In a real app, templates would have a folder property

    // Sort templates
    filteredTemplates.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        case 'oldest':
          return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime();
        case 'alphabetic':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filteredTemplates;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <svg className="w-8 h-8 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Les meves Plantilles
              </h1>
              <p className="text-gray-600 mt-2">Gestiona les teves plantilles guardades per generar documents personalitzats</p>
            </div>

            <button
              onClick={() => router.push('/analyze')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nova Plantilla</span>
            </button>
          </div>

          {/* Filters and Folders */}
          <div className="mt-6 flex flex-wrap gap-4 items-center justify-between bg-white rounded-lg border p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Sort Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Ordenar:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="newest">Més recents</option>
                  <option value="oldest">Més antigues</option>
                  <option value="alphabetic">Alfabètic</option>
                </select>
              </div>

              {/* Folder Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Carpeta:</label>
                <select
                  value={folderFilter}
                  onChange={(e) => setFolderFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">Totes les carpetes</option>
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>{folder}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Add Folder Button */}
            <button
              onClick={() => {
                const newFolder = prompt('Nom de la nova carpeta:');
                if (newFolder && !folders.includes(newFolder)) {
                  setFolders([...folders, newFolder]);
                }
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center space-x-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Nova Carpeta</span>
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <svg className="animate-spin w-12 h-12 mx-auto text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-gray-500">Carregant plantilles...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tens plantilles guardades</h3>
                <p className="text-gray-500 mb-6">Crea la teva primera plantilla analitzant un document</p>
                <button
                  onClick={() => router.push('/analyze')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Crear Primera Plantilla</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedAndFilteredTemplates().map((template) => (
                  <div key={template.id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <span className="text-3xl">{getDocumentTypeIcon(template.documentType)}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                          <p className="text-sm text-gray-500 line-clamp-2">{template.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs rounded-full ${getDocumentTypeColor(template.documentType)}`}>
                          {template.documentType.toUpperCase()}
                        </span>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar plantilla"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tags:</span>
                        <span className="font-medium">{template.tagsCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Mapped:</span>
                        <span className="font-medium">{template.mappedCount} ({getMappingPercentage(template)}%)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{template.createdDate}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Mapping Progress</span>
                        <span>{getMappingPercentage(template)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getMappingPercentage(template)}%` }}
                        ></div>
                      </div>
                    </div>

                    <button
                      onClick={() => loadTemplate(template)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Carregar Plantilla</span>
                    </button>
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

export default TemplatesPage;