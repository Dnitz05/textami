'use client';
import { useState } from 'react';

interface TemplateUploadResponse {
  success: boolean;
  templateId: string;
  fileName: string;
  size: number;
  storagePath: string;
  message: string;
}

interface ExcelAnalysisResponse {
  success: boolean;
  fileName: string;
  sheetName: string;
  totalRows: number;
  totalColumns: number;
  columns: Array<{
    column: string;
    header: string;
    dataType: string;
    sampleData: any[];
    confidence: number;
    aiDescription: string;
  }>;
  processingTime: number;
}

export default function GeneratorPage() {
  const [aiState, setAiState] = useState<{
    processing: boolean;
    template: TemplateUploadResponse | null;
    aiAnalysis: {
      placeholders: Array<{text: string, confidence: number}>;
      transcription: string;
    } | null;
    error: string | null;
  }>({
    processing: false,
    template: null,
    aiAnalysis: null,
    error: null
  });

  const [excelState, setExcelState] = useState<{
    processing: boolean;
    analysis: ExcelAnalysisResponse | null;
    error: string | null;
  }>({
    processing: false,
    analysis: null,
    error: null
  });

  const handleAiDocumentAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiState({ processing: true, template: null, aiAnalysis: null, error: null });

    try {
      const formData = new FormData();
      formData.append('docx', file);

      // AI-first endpoint for GPT-5 Vision analysis
      const response = await fetch('/api/ai-docx/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en AI analysis');
      }

      setAiState({
        processing: false,
        template: result,
        aiAnalysis: {
          placeholders: result.placeholders || [],
          transcription: result.transcription || ''
        },
        error: null
      });

    } catch (error) {
      setAiState({
        processing: false,
        template: null,
        aiAnalysis: null,
        error: error instanceof Error ? error.message : 'Error desconegut en AI'
      });
    }
  };

  const handleExcelAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📊 Excel file selected:', file.name, file.size);
    setExcelState({ processing: true, analysis: null, error: null });

    try {
      const formData = new FormData();
      formData.append('excel', file);

      console.log('📤 Calling /api/ai-docx/excel...');
      const response = await fetch('/api/ai-docx/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📥 Excel API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error en Excel AI analysis');
      }

      setExcelState({
        processing: false,
        analysis: result,
        error: null
      });

      console.log('✅ Excel analysis completed:', result.columns?.length + ' columns detected');

    } catch (error) {
      console.error('❌ Excel analysis error:', error);
      setExcelState({
        processing: false,
        analysis: null,
        error: error instanceof Error ? error.message : 'Error desconegut en Excel AI'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 Textami AI Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            GPT-5 Vision analitza documents, Excel intelligence, i genera amb format preservation perfecte
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1: AI Document Analysis */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">🧠</div>
                <h3 className="text-xl font-semibold mb-3">1. GPT-5 Vision Analysis</h3>
                <p className="text-gray-600 mb-4">
                  Upload DOCX → AI detecta placeholders automàticament
                </p>
                
                {!aiState.template && (
                  <>
                    <label className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors cursor-pointer block text-center">
                      {aiState.processing ? 'GPT-5 Analitzant...' : 'Upload per AI Analysis'}
                      <input
                        type="file"
                        accept=".docx"
                        onChange={handleAiDocumentAnalysis}
                        disabled={aiState.processing}
                        className="hidden"
                      />
                    </label>
                    {aiState.error && (
                      <p className="text-xs text-red-600 mt-2">{aiState.error}</p>
                    )}
                  </>
                )}

                {aiState.template && aiState.aiAnalysis && (
                  <div className="space-y-2">
                    <div className="text-green-600 text-sm">
                      ✅ {aiState.template.fileName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(aiState.template.size / 1024)} KB
                    </div>
                    <div className="text-xs text-blue-600">
                      🧠 {aiState.aiAnalysis.placeholders.length} placeholders detectats
                    </div>
                    <div className="text-xs text-green-600">
                      Llest per Excel mapping
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: AI Excel Intelligence */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-3">2. AI Excel Intelligence</h3>
                <p className="text-gray-600 mb-4">
                  AI analitza columnes i proposa mappings intel·ligents
                </p>

                {!excelState.analysis && (
                  <>
                    <label className={`w-full py-2 px-4 rounded-md transition-colors block text-center ${
                        aiState.template && !excelState.processing
                          ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer' 
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      }`}>
                      {excelState.processing ? 'GPT-5 Mini Analitzant Excel...' : 'Upload Excel per AI'}
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        disabled={!aiState.template || excelState.processing}
                        className="hidden"
                        onChange={handleExcelAnalysis}
                      />
                    </label>
                    {excelState.error && (
                      <p className="text-xs text-red-600 mt-2">{excelState.error}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {aiState.template ? 'Ready per AI analysis' : 'Primer AI analysis del DOCX'}
                    </p>
                  </>
                )}

                {excelState.analysis && (
                  <div className="space-y-3">
                    <div className="text-green-600 text-sm">
                      ✅ {excelState.analysis.fileName}
                    </div>
                    <div className="text-xs text-gray-500">
                      📊 {excelState.analysis.totalRows} rows, {excelState.analysis.totalColumns} columns
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center mt-2">
                      {excelState.analysis.columns.slice(0, 4).map((col, idx) => (
                        <span key={idx} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {col.header}
                        </span>
                      ))}
                      {excelState.analysis.columns.length > 4 && (
                        <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                          +{excelState.analysis.columns.length - 4} more
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-blue-600">
                      🧠 Ready per AI mapping amb {aiState.aiAnalysis?.placeholders.length} placeholders
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: AI Generation */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-xl font-semibold mb-3">3. AI Generation</h3>
                <p className="text-gray-600 mb-4">
                  GPT-5 genera documents amb format preservation perfecte
                </p>
                <button 
                  disabled 
                  className="w-full bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                >
                  Generate amb GPT-5
                </button>
                <p className="text-xs text-gray-500 mt-2">Després d'AI mapping confirmation</p>
              </div>
            </div>
          </div>

          {/* AI Features */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              🧠 AI-First Features Powered by GPT-5
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">👁️</div>
                <p className="text-sm font-medium">Vision Document Reading</p>
                <span className="text-xs text-green-600">✅ GPT-5</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🎯</div>
                <p className="text-sm font-medium">Smart Placeholder Detection</p>
                <span className="text-xs text-green-600">✅ AI-Powered</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🧠</div>
                <p className="text-sm font-medium">Intelligent Mapping</p>
                <span className="text-xs text-green-600">✅ Context-Aware</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">✨</div>
                <p className="text-sm font-medium">Format Preservation</p>
                <span className="text-xs text-green-600">✅ Zero Config</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}