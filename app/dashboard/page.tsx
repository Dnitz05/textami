'use client';

// Force dynamic rendering to avoid SSR issues with Supabase
export const dynamic = 'force-dynamic';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopNavBar from '@/components/TopNavBar';
import { useUser } from '@/hooks/useUser';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TemplateSourceSelector from '@/components/TemplateSourceSelector';
import GoogleAuthButton from '@/components/google/GoogleAuthButton';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTemplateSourceModal, setShowTemplateSourceModal] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Handle Google OAuth callback
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    const email = searchParams.get('email');
    const userId = searchParams.get('user_id');

    if (googleAuth === 'success' && email && userId) {
      setSessionLoading(true);
      
      // Create Supabase session
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, user_id: userId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.session_url) {
          // Redirect to session URL to establish auth
          window.location.href = data.session_url;
        } else {
          console.error('Session creation failed:', data);
          setSessionLoading(false);
        }
      })
      .catch(error => {
        console.error('Error creating session:', error);
        setSessionLoading(false);
      });
    }
  }, [searchParams]);

  // Redirect unauthenticated users to landing page (skip if handling OAuth)
  useEffect(() => {
    const isHandlingOAuth = searchParams.get('google_auth') === 'success';
    if (!isHandlingOAuth && !isAuthenticated && user !== null) {
      router.push('/');
    }
  }, [isAuthenticated, user, router, searchParams]);

  const handleNovaPlantillaClick = () => {
    setShowTemplateSourceModal(true);
  };

  const handleTemplateSourceSelection = (sourceType: 'docx' | 'google-docs') => {
    setShowTemplateSourceModal(false);
    
    if (sourceType === 'docx') {
      // Traditional DOCX upload
      fileInputRef.current?.click();
    } else if (sourceType === 'google-docs') {
      // Redirect to Google Docs selection flow
      router.push('/google/select');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 🎯 Generate unique templateId for DOCX
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const templateId = `template_docx_${timestamp}_${random}`;
      
      // Store the selected file in sessionStorage to pass to analyze page
      const fileData = {
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        },
        templateId: templateId  // 🔥 Include templateId
      };
      sessionStorage.setItem('selectedFile', JSON.stringify(fileData));
      sessionStorage.setItem('templateName', file.name.replace('.docx', ''));
      
      // Create FileReader to store file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        
        sessionStorage.setItem('selectedFileContent', base64String);
        
        // 🚀 Navigate to dynamic analyze page with templateId
        router.push(`/analyze/${templateId}`);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Show loading while checking authentication or handling OAuth
  if (user === null || sessionLoading) {
    const isHandlingOAuth = searchParams.get('google_auth') === 'success';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            {sessionLoading ? 'Establint sessió...' : 
             isHandlingOAuth ? 'Processant autenticació Google...' : 
             'Carregant...'}
          </p>
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
          
          {/* Nova Plantilla */}
          <div 
            onClick={handleNovaPlantillaClick}
            className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-blue-200"
          >
            <div className="text-6xl mb-6">📄</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nova Plantilla</h2>
            <p className="text-gray-600 mb-6">
              Puja un document DOCX i deixa que la IA analitzi automàticament les variables i l'estructura
            </p>
            <div className="flex items-center justify-center space-x-2 text-blue-600 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Començar Anàlisi</span>
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

        {/* Hidden file input for Nova Plantilla */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-600">Plantilles creades</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-600">Documents generats</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Documents knowledge</div>
          </div>
        </div>

        {/* Google Account Integration */}
        <div className="mt-16 max-w-md mx-auto">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Google Integration</h3>
            <GoogleAuthButton />
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

      {/* Template Source Selector Modal */}
      {showTemplateSourceModal && (
        <TemplateSourceSelector
          onSourceSelected={handleTemplateSourceSelection}
          onClose={() => setShowTemplateSourceModal(false)}
        />
      )}
    </div>
  );
}