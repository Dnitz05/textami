'use client';
import { useState } from 'react';
import AuthForm from '@/components/AuthForm';

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">{/* Auth Modal */}
        {showAuth && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded shadow-lg p-6 relative w-full max-w-sm mx-auto">
              <button
                onClick={() => setShowAuth(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
                aria-label="Tanca"
              >
                ×
              </button>
              <AuthForm />
            </div>
          </div>
        )}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            📄 Textami
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Generador professional de documents
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Transforma plantilles Word i dades Excel en documents personalitzats 
            mantenint el format original amb qualitat professional
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-4">📤</div>
            <h3 className="text-xl font-semibold mb-3">Upload plantilles</h3>
            <p className="text-gray-600">Puja el teu .docx amb format corporatiu</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-3">Detecció automàtica</h3>
            <p className="text-gray-600">Troba variables {'{'} nom {'}'}, {'{'} data {'}'}, etc.</p>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-3">Generació massiva</h3>
            <p className="text-gray-600">Crea centenars de documents perfectes</p>
          </div>
        </div>

        <div className="text-center space-y-6">
          <div className="space-y-4">
            <div className="flex gap-4 justify-center">
              <a
                href="/generator"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
              >
                Generar Documents →
              </a>
              <button
                onClick={() => setShowAuth(true)}
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold text-lg transition-colors"
              >
                Inicia Sessió
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Prova l'MVP i genera documents Word amb qualitat professional
            </p>
          </div>
          
          <div className="inline-flex items-center gap-4 bg-white rounded-lg p-4 shadow-lg">
            <span className="text-green-600 font-medium">✅ MVP 0.1.0 amb Docxtemplater Premium</span>
            <span className="text-blue-600 font-medium">🚀 Next.js 15.4.6</span>
          </div>
        </div>

        <footer className="mt-16 text-center text-gray-500">
          <p>© 2025 Aitor Gilabert Juan - Textami MVP</p>
        </footer>
      </div>
    </div>
  );
}
