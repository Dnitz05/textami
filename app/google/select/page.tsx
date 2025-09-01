'use client';

import { useState } from 'react';
import TopNavBar from '@/components/TopNavBar';
import GoogleAuthButton from '@/components/google/GoogleAuthButton';
import GoogleDriveFilePicker from '@/components/google/GoogleDriveFilePicker';
import { useUser } from '@/hooks/useUser';

export default function GoogleSelectPage() {
  const { user, isAuthenticated } = useUser();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const handleGoogleConnection = (connected: boolean) => {
    setIsGoogleConnected(connected);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Selecciona un document de Google Drive
          </h1>
          
          {!isAuthenticated ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">
                Has d'estar autenticat per accedir als documents de Google Drive.
              </p>
              <button 
                onClick={() => window.location.href = '/auth'}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Iniciar Sessió
              </button>
            </div>
          ) : !isGoogleConnected ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-6">
                Connecta el teu compte de Google per accedir als teus documents.
              </p>
              <GoogleAuthButton onConnectionChange={handleGoogleConnection} />
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-6">
                Selecciona un document de Google Docs o Google Sheets per començar:
              </p>
              <GoogleDriveFilePicker />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}