'use client';
import { useState, useEffect } from 'react';

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

interface MappingProposal {
  placeholder: string;
  excelColumn: string;
  excelHeader: string;
  confidence: number;
  reasoning: string;
  dataTypeMatch: boolean;
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

  const [mappingState, setMappingState] = useState<{
    loading: boolean;
    mappings: MappingProposal[];
    error: string | null;
  }>({
    loading: false,
    mappings: [],
    error: null
  });

  const [generateState, setGenerateState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
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

  // AUTO-TRIGGER MAPPINGS when both files are uploaded
  useEffect(() => {
    if (aiState.aiAnalysis?.placeholders && excelState.analysis?.columns) {
      console.log('🤖 Both files ready, fetching AI mappings...', {
        placeholders: aiState.aiAnalysis.placeholders.length,
        columns: excelState.analysis.columns.length
      });
      fetchMappings();
    }
  }, [aiState.aiAnalysis, excelState.analysis]);

  const fetchMappings = async () => {
    if (!aiState.aiAnalysis?.placeholders || !excelState.analysis?.columns) return;

    setMappingState({ loading: true, mappings: [], error: null });

    try {
      console.log('📤 Calling /api/ai-docx/mapping with data:', {
        placeholders: aiState.aiAnalysis.placeholders,
        columns: excelState.analysis.columns
      });

      const response = await fetch('/api/ai-docx/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeholders: aiState.aiAnalysis.placeholders,
          columns: excelState.analysis.columns
        })
      });

      const result = await response.json();
      console.log('📥 Mappings response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error en AI mapping');
      }

      setMappingState({
        loading: false,
        mappings: result.proposals || [],
        error: null
      });

      console.log('✅ Mappings loaded:', result.proposals?.length || 0);

    } catch (error) {
      console.error('❌ Mapping error:', error);
      setMappingState({
        loading: false,
        mappings: [],
        error: error instanceof Error ? error.message : 'Error desconegut en AI mapping'
      });
    }
  };

  const handleGenerate = async () => {
    if (!aiState.template?.templateId || !mappingState.mappings.length || !excelState.analysis) return;

    setGenerateState({ loading: true, error: null });

    try {
      console.log('🚀 Starting document generation...');

      // Create sample data from Excel for generation (first 5 rows for testing)
      const sampleData = Array.from({ length: Math.min(5, excelState.analysis.totalRows) }, (_, i) => {
        const row: Record<string, any> = {};
        excelState.analysis!.columns.forEach(col => {
          row[col.header] = col.sampleData[i % col.sampleData.length] || `Sample ${i + 1}`;
        });
        return row;
      });

      const response = await fetch('/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: aiState.template.templateId,
          mappings: mappingState.mappings.map(m => ({
            placeholder: m.placeholder,
            excelColumn: m.excelColumn,
            excelHeader: m.excelHeader
          })),
          excelData: sampleData,
          batchSize: 5
        })
      });

      const result = await response.json();
      console.log('📄 Generation response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error en document generation');
      }

      setGenerateState({ loading: false, error: null });
      console.log('✅ Documents generated:', result.totalGenerated);

      // Show success message
      alert(`✅ Generated ${result.totalGenerated} documents successfully!`);

    } catch (error) {
      console.error('❌ Generation error:', error);
      setGenerateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconegut en generation'
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
                
                {mappingState.mappings.length > 0 && !generateState.loading && (
                  <button 
                    onClick={handleGenerate}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    🚀 Generate amb GPT-5
                  </button>
                )}

                {generateState.loading && (
                  <button 
                    disabled 
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md cursor-not-allowed"
                  >
                    🧠 Generating documents...
                  </button>
                )}

                {mappingState.mappings.length === 0 && !mappingState.loading && (
                  <button 
                    disabled 
                    className="w-full bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed"
                  >
                    Generate amb GPT-5
                  </button>
                )}

                {generateState.error && (
                  <p className="text-xs text-red-600 mt-2">{generateState.error}</p>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  {mappingState.mappings.length > 0 
                    ? `Ready: ${mappingState.mappings.length} mappings configured`
                    : mappingState.loading 
                      ? 'Waiting for AI mappings...'
                      : 'Upload both files first'}
                </p>
              </div>
            </div>
          </div>

          {/* Field Mappings Section */}
          {(mappingState.loading || mappingState.mappings.length > 0 || mappingState.error) && (
            <div className="mt-8 bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">🔗 Field Mappings (AI Suggested)</h3>
                <p className="text-sm text-gray-600">GPT-5 intelligent mapping between document placeholders and Excel columns</p>
              </div>

              {mappingState.loading && (
                <div className="text-center py-4">
                  <div className="text-blue-600">🧠 GPT-5 analyzing mappings...</div>
                  <div className="text-xs text-gray-500 mt-2">This may take 5-10 seconds</div>
                </div>
              )}

              {mappingState.error && (
                <div className="text-center py-4">
                  <div className="text-red-600 text-sm">❌ {mappingState.error}</div>
                </div>
              )}

              {mappingState.mappings.length > 0 && (
                <div className="space-y-3">
                  {mappingState.mappings.map((mapping, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                            {mapping.placeholder}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                            {mapping.excelHeader} ({mapping.excelColumn})
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            mapping.confidence >= 80 ? 'bg-green-100 text-green-700' :
                            mapping.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {mapping.confidence}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1 italic">
                          {mapping.reasoning}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="text-center mt-4 p-3 bg-green-50 rounded-md">
                    <div className="text-green-700 font-medium">
                      ✅ {mappingState.mappings.length} mappings ready for generation
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      GPT-5 will use these mappings to generate personalized documents
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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