'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import TopNavBar from '@/components/TopNavBar';

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNovaPlantillaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Store the selected file in sessionStorage to pass to analyze page
      const fileData = {
        file: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };
      sessionStorage.setItem('selectedFile', JSON.stringify(fileData));
      sessionStorage.setItem('templateName', file.name.replace('.pdf', ''));
      
      // Create FileReader to store file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64String = btoa(String.fromCharCode(...uint8Array));
        
        sessionStorage.setItem('selectedFileContent', base64String);
        
        // Navigate to analyze page
        router.push('/analyze');
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <TopNavBar />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          🧠 Textami
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
              Puja un document PDF i deixa que la IA analitzi automàticament les variables i l'estructura
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
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500">
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-4 shadow-sm">
            <span className="text-blue-600 font-medium">🧠 Powered by GPT-5</span>
            <span className="text-purple-600 font-medium">⚡ Zero Configuration</span>
          </div>
          <p className="mt-4">© 2025 Textami - Document Intelligence Platform</p>
        </footer>
      </div>
    </div>
  );
}
