'use client';
import { useState, useEffect } from 'react';
import PremiumVisualEditor from '@/components/visual-mapping/PremiumVisualEditor';

export default function EditorPage() {
  const [files, setFiles] = useState<{
    template: File | null;
    excel: File | null;
  }>({
    template: null,
    excel: null
  });

  // Recuperar informació dels fitxers del localStorage
  useEffect(() => {
    const savedTemplate = localStorage.getItem('textami_template');
    const savedExcel = localStorage.getItem('textami_excel');
    
    // Si no hi ha fitxers guardats, redirigir a l'inici
    if (!savedTemplate || !savedExcel) {
      window.location.href = '/';
      return;
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ⭐ Editor Visual Premium
              </h1>
              <p className="text-gray-600">
                Sistema intel·ligent amb tecnologia Premium Modules - Qualitat professional automàtica
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              ← Tornar a l'inici
            </button>
          </div>
        </div>

        <PremiumVisualEditor />
      </div>
    </div>
  );
}