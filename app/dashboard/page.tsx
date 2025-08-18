'use client';

import { useSession } from '@/components/SessionProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    // This is handled by middleware, but double-check for client-side protection
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregant...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware should handle redirect, but just in case
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                📄 Textami
              </h1>
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                MVP
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Hola, {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Tancar Sessió
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h2>
          <p className="text-gray-600">
            Benvingut al teu espai de treball de Textami
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">📄</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Plantilles</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">📊</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Documents Generats</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">⚡</div>
              <div>
                <p className="text-sm font-medium text-gray-600">Projectes Actius</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Començar un nou projecte
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                <div className="text-3xl mb-2">📤</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Pujar Plantilla Word
                </h4>
                <p className="text-gray-600 text-sm">
                  Comença pujant una plantilla .docx amb les teves variables
                </p>
                <span className="inline-block mt-3 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Pròximament
                </span>
              </button>
              
              <button className="p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left">
                <div className="text-3xl mb-2">📋</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Utilitzar Plantilla Exemple
                </h4>
                <p className="text-gray-600 text-sm">
                  Prova Textami amb una plantilla d'exemple predefinida
                </p>
                <span className="inline-block mt-3 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Pròximament
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Premium Features Status */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            ✨ Funcionalitats Premium Activades
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-1">🎨</div>
              <p className="text-sm font-medium">HTML Module</p>
              <span className="text-xs text-green-600">✅ Actiu</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🖼️</div>
              <p className="text-sm font-medium">Image Module</p>
              <span className="text-xs text-green-600">✅ Actiu</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🎨</div>
              <p className="text-sm font-medium">Style Module</p>
              <span className="text-xs text-green-600">✅ Actiu</span>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <p className="text-sm font-medium">XLSX Module</p>
              <span className="text-xs text-green-600">✅ Actiu</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}