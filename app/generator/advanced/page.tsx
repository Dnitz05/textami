'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface DocumentData {
  templateId: string;
  fileName: string;
  placeholders: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  transcription: string;
}

interface ExcelData {
  fileName: string;
  columns: Array<{
    column: string;
    header: string;
    dataType: string;
    sampleData: any[];
  }>;
}

interface MappingProposal {
  placeholder: string;
  excelColumn: string;
  excelHeader: string;
  confidence: number;
  reasoning: string;
}

function AdvancedGeneratorContent() {
  const searchParams = useSearchParams();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [mappings, setMappings] = useState<MappingProposal[]>([]);
  const [activeTab, setActiveTab] = useState<'workflow' | 'ai' | 'knowledge'>('workflow');
  const [generateState, setGenerateState] = useState<{
    loading: boolean;
    error: string | null;
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false
  });

  useEffect(() => {
    // Get data from URL params or localStorage
    const templateId = searchParams.get('templateId');
    const storedDoc = localStorage.getItem('textami_document_data');
    const storedExcel = localStorage.getItem('textami_excel_data');
    const storedMappings = localStorage.getItem('textami_mappings');
    const storedGeneration = localStorage.getItem('generationData');

    console.log('🔍 ADVANCED PAGE DEBUG:', {
      templateId,
      hasStoredDoc: !!storedDoc,
      hasStoredExcel: !!storedExcel,
      hasStoredMappings: !!storedMappings,
      hasGenerationData: !!storedGeneration,
      url: window.location.href
    });

    if (storedDoc) {
      const docData = JSON.parse(storedDoc);
      console.log('📄 Document data loaded:', docData);
      setDocumentData(docData);
    }
    if (storedExcel) {
      const excelData = JSON.parse(storedExcel);
      console.log('📊 Excel data loaded:', excelData);
      setExcelData(excelData);
    }
    if (storedMappings) {
      const mappingData = JSON.parse(storedMappings);
      console.log('🔗 Mappings loaded:', mappingData);
      setMappings(mappingData);
    }
    if (storedGeneration) {
      const genData = JSON.parse(storedGeneration);
      console.log('💾 Generation data loaded:', genData);
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!documentData?.templateId || !mappings.length || !excelData) return;

    setGenerateState({ loading: true, error: null, success: false });

    try {
      console.log('🚀 Starting document generation from advanced interface...');

      // Create sample data from Excel for generation (first 5 rows for testing)
      const sampleData = Array.from({ length: Math.min(5, 10) }, (_, i) => {
        const row: Record<string, any> = {};
        excelData.columns.forEach(col => {
          row[col.header] = col.sampleData[i % col.sampleData.length] || `Sample ${i + 1}`;
        });
        return row;
      });

      const response = await fetch('/api/ai-docx/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: documentData.templateId,
          mappings: mappings.map(m => ({
            placeholder: m.placeholder,
            excelColumn: m.excelColumn,
            excelHeader: m.excelHeader
          })),
          excelData: sampleData,
          batchSize: 5
        })
      });

      const result = await response.json();
      console.log('📄 Advanced generation response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error en document generation');
      }

      setGenerateState({ 
        loading: false, 
        error: null, 
        success: true 
      });

      console.log('✅ Documents generated from advanced interface:', result.totalGenerated);

      // Show success notification
      setTimeout(() => {
        setGenerateState(prev => ({ ...prev, success: false }));
      }, 5000);

    } catch (error) {
      console.error('❌ Advanced generation error:', error);
      setGenerateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconegut en generation',
        success: false
      });
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Left Sidebar - Workflow & AI */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="font-semibold text-gray-900">Textami AI</span>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`flex-1 py-2 px-3 text-xs rounded-md transition-colors ${
                activeTab === 'workflow'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-2 px-3 text-xs rounded-md transition-colors ${
                activeTab === 'ai'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AI Instructions
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex-1 py-2 px-3 text-xs rounded-md transition-colors ${
                activeTab === 'knowledge'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Knowledge
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Document Analysis</h3>
              
              {documentData ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Document Analyzed</span>
                    </div>
                    <div className="text-xs text-green-600">
                      📄 {documentData.fileName}
                    </div>
                    <div className="text-xs text-green-600">
                      🧠 {documentData.placeholders.length} placeholders detected
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 text-sm mt-4">Detected Fields</h4>
                  <div className="space-y-2">
                    {documentData.placeholders.map((placeholder, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-blue-800">{placeholder.text}</span>
                        <span className="text-xs text-blue-600 ml-auto">{placeholder.confidence}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No document loaded</div>
                </div>
              )}

              {excelData && (
                <>
                  <h3 className="font-semibold text-gray-900 text-sm mt-6">Excel Data</h3>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Excel Analyzed</span>
                    </div>
                    <div className="text-xs text-green-600">
                      📊 {excelData.fileName}
                    </div>
                    <div className="text-xs text-green-600">
                      📈 {excelData.columns.length} columns detected
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">AI Configuration</h3>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-2">GPT-5 Vision Enabled</div>
                <div className="text-xs text-blue-600">
                  • Document analysis with format preservation
                  • Intelligent field detection 
                  • Smart Excel-to-placeholder mapping
                  • Context-aware document generation
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Temperature</label>
                <div className="text-xs text-gray-500">Default (optimized for consistency)</div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Max Tokens</label>
                <div className="text-xs text-gray-500">4000 (document analysis)</div>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-sm">Knowledge Base</h3>
              <div className="text-xs text-gray-600">
                GPT-5 utilizes its training data for:
                • Document format recognition
                • Business document patterns
                • Multi-language field detection
                • Contextual data mapping
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t space-y-2">
          {generateState.loading ? (
            <button disabled className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm cursor-not-allowed">
              🧠 Generating...
            </button>
          ) : mappings.length > 0 ? (
            <button 
              onClick={handleGenerate}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm hover:bg-green-700 transition-colors"
            >
              🚀 Generate Documents
            </button>
          ) : (
            <button disabled className="w-full bg-gray-400 text-white py-2 px-4 rounded-md text-sm cursor-not-allowed">
              🚀 Generate Documents
            </button>
          )}
          
          {generateState.error && (
            <div className="text-xs text-red-600 p-2 bg-red-50 rounded">
              ❌ {generateState.error}
            </div>
          )}
          
          {generateState.success && (
            <div className="text-xs text-green-600 p-2 bg-green-50 rounded">
              ✅ Documents generated successfully!
            </div>
          )}
          
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md text-sm hover:bg-gray-200 transition-colors">
            💾 Save Configuration
          </button>
        </div>
      </div>

      {/* Main Content - Document Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              title="Back to main generator"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-semibold text-gray-900">
              {documentData?.fileName || 'Document Preview'}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">AI Analysis Complete</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow-lg rounded-lg p-8 min-h-96">
              {documentData ? (
                <div className="space-y-4">
                  <div className="prose max-w-none text-gray-900">
                    {documentData.transcription ? (
                      <div dangerouslySetInnerHTML={{ 
                        __html: documentData.transcription.replace(
                          new RegExp(`(${documentData.placeholders.map(p => p.text).join('|')})`, 'gi'),
                          '<mark class="bg-yellow-200 px-1 rounded font-semibold">$1</mark>'
                        )
                      }} />
                    ) : (
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">📄 {documentData.fileName}</h2>
                        <div className="p-6 bg-blue-50 rounded-lg">
                          <p className="text-lg text-blue-800 mb-2">Document Analysis Complete</p>
                          <p className="text-blue-600">🔍 Detected {documentData.placeholders.length} placeholders</p>
                          <div className="mt-4 flex flex-wrap gap-2 justify-center">
                            {documentData.placeholders.slice(0, 8).map((placeholder, idx) => (
                              <span key={idx} className="bg-yellow-200 px-3 py-1 rounded-full text-sm font-medium text-yellow-800">
                                {placeholder.text}
                              </span>
                            ))}
                            {documentData.placeholders.length > 8 && (
                              <span className="bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-600">
                                +{documentData.placeholders.length - 8} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {documentData.placeholders.length > 0 && (
                    <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Detected Placeholders</h4>
                      <div className="flex flex-wrap gap-2">
                        {documentData.placeholders.map((placeholder, idx) => (
                          <span key={idx} className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-md text-sm">
                            {placeholder.text}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-gray-500">No document loaded</div>
                  <div className="text-sm text-gray-400 mt-2">Upload a DOCX file to begin</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Fields & Data */}
      <div className="w-80 bg-white shadow-lg border-l flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Fields & Mapping</h3>
          <div className="text-xs text-gray-600 mt-1">AI-suggested field mappings</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mappings.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Active Mappings ({mappings.length})
              </div>
              
              {mappings.map((mapping, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{mapping.placeholder}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      mapping.confidence >= 80 ? 'bg-green-100 text-green-700' :
                      mapping.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {mapping.confidence}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>→</span>
                    <span>{mapping.excelHeader}</span>
                    <span className="text-xs text-gray-500">({mapping.excelColumn})</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 italic">
                    {mapping.reasoning}
                  </div>
                </div>
              ))}
              
              <div className="mt-6 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800 mb-1">Ready for Generation</div>
                <div className="text-xs text-green-600">
                  All fields mapped successfully. Click Generate to create documents.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">No mappings available</div>
              <div className="text-xs text-gray-500 mt-2">Upload both DOCX and Excel files</div>
            </div>
          )}
        </div>

        {/* Excel Data Preview */}
        {excelData && (
          <div className="border-t p-4">
            <h4 className="font-medium text-gray-900 text-sm mb-3">Excel Columns</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {excelData.columns.map((col, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{col.header}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {col.column}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvancedGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-8 h-8 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="text-gray-600">Loading advanced interface...</div>
        </div>
      </div>
    }>
      <AdvancedGeneratorContent />
    </Suspense>
  );
}