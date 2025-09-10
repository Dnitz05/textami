'use client';

// Force dynamic rendering to avoid SSR issues with Supabase
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNavBar from '@/components/TopNavBar';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  // GLOBAL STATE AUTH GUARD - Now safe with single auth state
  useEffect(() => {
    console.log('🔍 Dashboard GLOBAL STATE debug:', { isAuthenticated, user: user ? 'exists' : 'null' });
    
    // Safe auth guard with global state - no more competing states
    if (!isAuthenticated && user === null && typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard')) {
      console.log('🚀 GLOBAL STATE REDIRECT: Unauthenticated user → Landing');
      setTimeout(() => {
        router.push('/');
      }, 1500); // Slightly longer delay for dashboard
    }
  }, [isAuthenticated, user, router]);

  const handleNovaPlantillaClick = () => {
    // Connectar directament amb Google Drive - eliminem modal intermedi
    router.push('/google/select');
  };


  // Show simple loading while checking authentication
  if (user === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <TopNavBar />
      
      {/* Welcome Section */}
      <div className="container mx-auto px-4 pt-8 pb-8 text-center flex-1 flex flex-col justify-center overflow-y-auto">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Benvingut, {user?.email?.split('@')[0] || 'Usuari'}! 👋
        </h1>
        <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
          Plataforma intel·ligent per a l'anàlisi i generació de documents amb IA
        </p>

        {/* Main Navigation Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          
          {/* Crear Plantilla - Google Drive */}
          <div 
            onClick={handleNovaPlantillaClick}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-blue-200"
          >
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Crear una Plantilla</h2>
            <p className="text-gray-600 mb-6">
              Connecta amb Google Drive per importar un document i deixa que la IA analitzi automàticament les variables
            </p>
            <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium">
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Connectar amb Google Drive</span>
            </div>
          </div>

          {/* Plantilles */}
          <div 
            onClick={() => router.push('/templates')}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-green-200"
          >
            <div className="text-6xl mb-6">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Plantilles</h2>
            <p className="text-gray-600 mb-6">
              Gestiona les teves plantilles desades, carrega plantilles anteriors i reutilitza configuracions
            </p>
            <div className="flex items-center justify-center space-x-2 text-green-600 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Veure Plantilles</span>
            </div>
          </div>

          {/* Knowledge */}
          <div 
            onClick={() => router.push('/knowledge')}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-amber-200"
          >
            <div className="text-6xl mb-6">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Knowledge</h2>
            <p className="text-gray-600 mb-6">
              Base de coneixement amb documents de referència per millorar l'anàlisi i les instruccions de la IA
            </p>
            <div className="flex items-center justify-center space-x-2 text-amber-600 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Gestionar Knowledge</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500">
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-4 shadow-sm">
            <span className="text-blue-600 font-medium">🧠 Powered by GPT-5</span>
            <span className="text-purple-600 font-medium">⚡ Zero Configuration</span>
          </div>
          <p className="mt-4">© 2025 DocMile - Document Intelligence Platform</p>
        </footer>
      </div>

    </div>
  );
}