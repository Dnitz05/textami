'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GoogleDriveFile } from '@/lib/google/types';
import { MagnifyingGlassIcon, DocumentIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface GoogleDriveFilePickerProps {
  fileType: 'documents' | 'spreadsheets';
  onFileSelected: (file: GoogleDriveFile) => void;
  onCancel: () => void;
  className?: string;
}

export default function GoogleDriveFilePicker({
  fileType,
  onFileSelected,
  onCancel,
  className = ''
}: GoogleDriveFilePickerProps) {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [fileType]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchFiles();
      } else {
        loadFiles();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/google/drive/files?type=${fileType}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else if (response.status === 401) {
        toast.error('Google account not connected. Please connect your Google account first.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load Google Drive files');
      }
    } catch (error) {
      console.error('Error loading Google Drive files:', error);
      toast.error('Failed to connect to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const searchFiles = async () => {
    try {
      setSearchLoading(true);
      const response = await fetch(`/api/google/drive/files?type=${fileType}&search=${encodeURIComponent(searchTerm)}`);
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching files:', error);
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFileSelect = (file: GoogleDriveFile) => {
    setSelectedFile(file);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet')) {
      return <TableCellsIcon className="h-5 w-5 text-green-600" />;
    } else if (mimeType.includes('document')) {
      return <DocumentIcon className="h-5 w-5 text-blue-600" />;
    }
    return <DocumentIcon className="h-5 w-5 text-gray-600" />;
  };

  const fileTypeLabel = fileType === 'documents' ? 'Google Docs' : 'Google Sheets';

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Selecciona {fileTypeLabel}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Escull un document del teu Google Drive
            </p>
          </div>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </Button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Cerca ${fileTypeLabel.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Carregant fitxers de Google Drive...</p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No s\'han trobat fitxers' : `No tens ${fileTypeLabel.toLowerCase()}`}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? `Prova amb altres termes de cerca`
                  : `Crea alguns ${fileTypeLabel.toLowerCase()} a Google Drive primer`}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {files.map((file) => (
                <Card
                  key={file.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedFile?.id === file.id
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Modificat: {formatDate(file.modifiedTime)}</span>
                          {file.size && (
                            <span>{Math.round(parseInt(file.size) / 1024)} KB</span>
                          )}
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                          >
                            Obrir a Google Drive →
                          </a>
                        )}
                      </div>
                      {selectedFile?.id === file.id && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onCancel}
            variant="outline"
          >
            Cancel·lar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFile}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Seleccionar Fitxer
          </Button>
        </div>
      </div>
    </div>
  );
}