export default function GeneratorPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📄 Textami - Generador MVP
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Puja una plantilla Word, connecta dades Excel i genera documents professionals
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1: Upload Template */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">📤</div>
                <h3 className="text-xl font-semibold mb-3">1. Plantilla Word</h3>
                <p className="text-gray-600 mb-4">
                  Puja el teu fitxer .docx amb variables {'{'} nom {'}'}, {'{'} data {'}'}...
                </p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  Pujar Plantilla
                </button>
                <p className="text-xs text-yellow-600 mt-2">Pròximament</p>
              </div>
            </div>

            {/* Step 2: Upload Data */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-3">2. Dades Excel</h3>
                <p className="text-gray-600 mb-4">
                  Puja el fitxer Excel amb les dades per emplenar
                </p>
                <button 
                  disabled 
                  className="w-full bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                >
                  Pujar Dades
                </button>
                <p className="text-xs text-gray-500 mt-2">Després de la plantilla</p>
              </div>
            </div>

            {/* Step 3: Generate */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-semibold mb-3">3. Generar</h3>
                <p className="text-gray-600 mb-4">
                  Genera documents amb Docxtemplater Premium
                </p>
                <button 
                  disabled 
                  className="w-full bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                >
                  Generar Documents
                </button>
                <p className="text-xs text-gray-500 mt-2">Després del mapejat</p>
              </div>
            </div>
          </div>

          {/* Premium Features */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              ✨ Funcionalitats Premium Disponibles
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🎨</div>
                <p className="text-sm font-medium">HTML Rich Content</p>
                <span className="text-xs text-green-600">✅ Llest</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🖼️</div>
                <p className="text-sm font-medium">Dynamic Images</p>
                <span className="text-xs text-green-600">✅ Llest</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🎨</div>
                <p className="text-sm font-medium">Advanced Styling</p>
                <span className="text-xs text-green-600">✅ Llest</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">📊</div>
                <p className="text-sm font-medium">Excel Generation</p>
                <span className="text-xs text-green-600">✅ Llest</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}