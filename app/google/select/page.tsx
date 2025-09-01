'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNavBar from '@/components/TopNavBar';
import GoogleAuthButton from '@/components/google/GoogleAuthButton';
import GoogleDriveFilePicker from '@/components/google/GoogleDriveFilePicker';
import { useUser } from '@/hooks/useUser';
import { GoogleDriveFile } from '@/lib/google/types';

export default function GoogleSelectPage() {
  const { user, isAuthenticated } = useUser();
  const router = useRouter();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [fileType, setFileType] = useState<'documents' | 'spreadsheets'>('documents');

  const handleGoogleConnection = (connected: boolean) => {
    setIsGoogleConnected(connected);
  };

  const handleFileSelected = async (file: GoogleDriveFile) => {
    try {
      // Store selected Google Drive file info
      sessionStorage.setItem('selectedGoogleFile', JSON.stringify({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        type: 'google-drive'
      }));

      // Redirect to analysis page
      router.push('/analyze');
    } catch (error) {
      console.error('Error processing selected file:', error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Selecciona un document de Google Drive
            </h1>
            <button 
              onClick={() => window.history.back()}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Tornar
            </button>
          </div>
          
          {!isAuthenticated ? (
            <div className="text-center py-12">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Autenticació necessària</h2>
                <p className="text-gray-600 mb-6">
                  Per accedir als teus documents de Google Drive, primer has d'iniciar sessió.
                </p>
              </div>
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Anar al Login
              </button>
            </div>
          ) : !isGoogleConnected ? (
            <div className="text-center py-12">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecta Google Drive</h2>
                <p className="text-gray-600 mb-6">
                  Necessites connectar el teu compte de Google per accedir als documents.
                </p>
              </div>
              <GoogleAuthButton onConnectionChange={handleGoogleConnection} />
            </div>
          ) : (
            <div>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      <strong>Google Drive connectat!</strong> Ara pots seleccionar els teus documents.
                    </p>
                  </div>
                </div>
              </div>

              {/* File Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipus de document:
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setFileType('documents')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      fileType === 'documents' 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                    </svg>
                    <span>Google Docs</span>
                  </button>
                  <button
                    onClick={() => setFileType('spreadsheets')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      fileType === 'spreadsheets' 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
                    </svg>
                    <span>Google Sheets</span>
                  </button>
                </div>
              </div>

              <GoogleDriveFilePicker 
                fileType={fileType}
                onFileSelected={handleFileSelected}
                onCancel={handleCancel}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}