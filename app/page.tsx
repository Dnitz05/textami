'use client';
import { useState } from 'react';
import AuthForm from '@/components/AuthForm';

interface UploadState {
  template: {
    fileName: string
    size: number
  } | null
  excel: {
    fileName: string
    size: number
    rows: number
  } | null
  uploading: boolean
  error: string | null
}

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    template: null,
    excel: null,
    uploading: false,
    error: null
  });

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadState(prev => ({ ...prev, uploading: true, error: null }))

    try {
      // Validar tipus de fitxer
      if (!file.name.match(/\.docx$/)) {
        throw new Error('Només fitxers Word (.docx)')
      }

      // Simular upload
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setUploadState(prev => ({
        ...prev,
        template: {
          fileName: file.name,
          size: file.size
        },
        uploading: false
      }))

      console.log('Template carregat:', file.name)
      
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error pujant template',
        uploading: false
      }))
    }
  }

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadState(prev => ({ ...prev, uploading: true, error: null }))

    try {
      // Validar tipus de fitxer
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        throw new Error('Només fitxers Excel (.xlsx, .xls)')
      }

      // Simular upload
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setUploadState(prev => ({
        ...prev,
        excel: {
          fileName: file.name,
          size: file.size,
          rows: Math.floor(Math.random() * 100) + 10 // Simular rows
        },
        uploading: false
      }))

      console.log('Excel carregat:', file.name)
      
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error pujant Excel',
        uploading: false
      }))
    }
  }

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
          {/* Step 1: Upload Template */}
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-xl font-semibold mb-3">1. Plantilla Word</h3>
              <p className="text-gray-600 mb-4">
                Puja el teu fitxer .docx original
              </p>
              
              {!uploadState.template && (
                <>
                  <label className={`w-full py-2 px-4 rounded-md transition-colors cursor-pointer block text-center ${
                    uploadState.uploading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    {uploadState.uploading ? 'Pujant...' : 'Pujar Template'}
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleTemplateUpload}
                      disabled={uploadState.uploading}
                      className="hidden"
                    />
                  </label>
                  {uploadState.error && (
                    <p className="text-xs text-red-600 mt-2">{uploadState.error}</p>
                  )}
                </>
              )}

              {uploadState.template && (
                <div className="space-y-2">
                  <div className="text-green-600 text-sm">
                    ✅ {uploadState.template.fileName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(uploadState.template.size / 1024)} KB
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Step 2: Upload Excel */}
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-3">2. Dades Excel</h3>
              <p className="text-gray-600 mb-4">
                Puja el fitxer amb les dades
              </p>
              
              {!uploadState.excel && (
                <>
                  <label className={`w-full py-2 px-4 rounded-md transition-colors cursor-pointer block text-center ${
                    uploadState.template 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}>
                    {uploadState.uploading ? 'Pujant...' : 'Pujar Dades'}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      disabled={!uploadState.template || uploadState.uploading}
                      className="hidden"
                    />
                  </label>
                  {uploadState.error && (
                    <p className="text-xs text-red-600 mt-2">{uploadState.error}</p>
                  )}
                </>
              )}

              {uploadState.excel && (
                <div className="space-y-2">
                  <div className="text-green-600 text-sm">
                    ✅ {uploadState.excel.fileName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(uploadState.excel.size / 1024)} KB
                  </div>
                  <div className="text-xs text-blue-600">
                    📊 {uploadState.excel.rows} files de dades
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Step 3: Visual Editor */}
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-3">3. Editor Visual</h3>
              <p className="text-gray-600 mb-4">
                Associa visualment les columnes amb el text
              </p>
              <button 
                disabled={!uploadState.template || !uploadState.excel}
                onClick={() => window.location.href = '/generator'}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                  uploadState.template && uploadState.excel
                    ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer' 
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                Obrir Editor Visual
              </button>
            </div>
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
