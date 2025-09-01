// components/google/GoogleDrivePicker.tsx
// Component for selecting Google Docs from Google Drive
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DocumentTextIcon, MagnifyingGlassIcon, CloudIcon } from '@heroicons/react/24/outline';
import { log } from '@/lib/logger';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink: string;
  thumbnailLink?: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
}

interface GoogleDrivePickerProps {
  onFileSelect: (file: GoogleDriveFile) => void;
  onCancel: () => void;
  onAuthRequired: () => void;
  className?: string;
}

export default function GoogleDrivePicker({
  onFileSelect,
  onCancel,
  onAuthRequired,
  className = ''
}: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);

  useEffect(() => {
    loadGoogleDriveFiles();
  }, []);

  const loadGoogleDriveFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/google/drive/files', {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          log.debug('Google auth required for Drive access');
          onAuthRequired();
          return;
        }
        throw new Error(data.error || 'Failed to load Google Drive files');
      }

      if (data.success) {
        const googleDocs = data.files.filter((file: GoogleDriveFile) =>
          file.mimeType === 'application/vnd.google-apps.document'
        );
        setFiles(googleDocs);
        log.debug(`Loaded ${googleDocs.length} Google Docs from Drive`);
      }

    } catch (err) {
      log.error('Failed to load Google Drive files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (file: GoogleDriveFile) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const formatFileDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ca-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Data desconeguda';
    }
  };

  const formatFileSize = (sizeString?: string) => {
    if (!sizeString) return 'Mida desconeguda';
    
    const bytes = parseInt(sizeString);
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 ${className}`}>
        <div className="p-8 text-center">
          <CloudIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Carregant Google Drive...
          </h3>
          <p className="text-gray-600">
            Cercant els teus documents de Google Docs
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 ${className}`}>
        <div className="p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error carregant Google Drive
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-3">
            <Button onClick={loadGoogleDriveFiles} className="bg-blue-600 hover:bg-blue-700">
              Tornar a intentar
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel·lar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Selecciona un Google Doc
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Tria un document de Google Drive per utilitzar com a plantilla
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={onCancel} variant="outline" size="sm">
            Cancel·lar
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-6 border-b">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No s\'han trobat documents' : 'No hi ha Google Docs'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `No hi ha documents que coincideixin amb "${searchQuery}"`
                : 'No s\'han trobat documents de Google Docs al teu Drive'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedFile?.id === file.id
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleFileSelect(file)}
              >
                <div className="p-4">
                  {/* File Icon and Name */}
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </h3>
                    </div>
                  </div>

                  {/* File Details */}
                  <div className="space-y-1 text-xs text-gray-500">
                    <div>Modificat: {formatFileDate(file.modifiedTime)}</div>
                    <div>Mida: {formatFileSize(file.size)}</div>
                    {file.owners && file.owners[0] && (
                      <div>Propietari: {file.owners[0].displayName}</div>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {selectedFile?.id === file.id && (
                    <div className="mt-3 flex items-center space-x-2 text-blue-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs font-medium">Seleccionat</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-6 border-t bg-gray-50">
        <div className="text-sm text-gray-600">
          {filteredFiles.length} document{filteredFiles.length !== 1 ? 's' : ''} trobat{filteredFiles.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={onCancel} variant="outline">
            Cancel·lar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Seleccionar document
          </Button>
        </div>
      </div>
    </div>
  );
}