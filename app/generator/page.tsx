'use client';

// Force dynamic rendering to avoid SSR issues with Supabase
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import TopNavBar from '../../components/TopNavBar';
import TemplateSourceSelector from '../../components/TemplateSourceSelector';
import GoogleDrivePicker from '../../components/google/GoogleDrivePicker';
import { log } from '../../lib/logger';

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
  // Environment validation on mount
  useEffect(() => {
    log.debug('GeneratorPage mounted with environment check', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'
    });
    
    return () => {
      log.debug('GeneratorPage unmounted');
    };
  }, []);
  
  const [sourceSelector, setSourceSelector] = useState<{
    show: boolean;
    selectedSource: 'docx' | 'google-docs' | null;
  }>({
    show: false,
    selectedSource: null
  });

  const [googleDriveState, setGoogleDriveState] = useState<{
    show: boolean;
    processing: boolean;
    error: string | null;
  }>({
    show: false,
    processing: false,
    error: null
  });

  const [aiState, setAiState] = useState<{
    processing: boolean;
    template: TemplateUploadResponse | null;
    aiAnalysis: {
      placeholders: Array<{
        text: string, 
        confidence: number, 
        type?: string, 
        originalMatch?: string, 
        position?: number
      }>;
      transcription: string;
      htmlPreview?: string;
    } | null;
    error: string | null;
    sourceType?: 'docx' | 'google-docs';
    googleDocId?: string;
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

    const uploadId = Date.now();
    const isPDF = false; // Only DOCX supported now
    const isDOCX = file.name.toLowerCase().endsWith('.docx');
    
    log.debug(`📤 UPLOAD #${uploadId} - Starting DOCX upload:`, {
      fileName: file.name,
      size: file.size,
      fileType: 'DOCX',
      currentState: {
        hasTemplate: !!aiState.template,
        hasAnalysis: !!aiState.aiAnalysis,
        processing: aiState.processing
      }
    });

    if (!isDOCX) {
      log.error('❌ Unsupported file type');
      setAiState(prevState => ({
        ...prevState,
        error: 'Only DOCX files are supported'
      }));
      return;
    }

    setAiState(prevState => ({ 
      ...prevState, 
      processing: true, 
      error: null 
    }));

    const formData = new FormData();
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Only DOCX supported
    formData.append('docx', file);

    try {
      const endpoint = '/api/ai-docx/analyze';
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      log.debug('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        log.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const newAiState = {
          processing: false,
          template: {
            success: true,
            templateId: result.data.templateId,
            fileName: result.data.fileName,
            size: file.size,
            storagePath: result.data.storageUrl || result.data.filePath || '',
            message: 'Analysis completed successfully'
          },
          aiAnalysis: {
            placeholders: [], // Smart mapping will generate these
            transcription: result.data.transcription || result.data.markdown || 'DOCX transcribed with GPT-5',
            htmlPreview: `<div class="p-8 text-center">
              <div class="text-4xl mb-4">📄</div>
              <h3 class="text-lg font-semibold mb-2">${result.data.fileName}</h3>
              <p class="text-gray-600">DOCX transcribed successfully with GPT-5.</p>
              <p class="text-sm text-blue-600 mt-2">Ready for smart mapping.</p>
            </div>`
          },
          error: null
        };
        
        log.debug(`🔄 UPLOAD #${uploadId} - Setting new state:`, newAiState);
        setAiState(newAiState);
        
        // Guardar a localStorage per backup
        localStorage.setItem('currentTemplate', JSON.stringify(result.data));
        log.debug(`💾 UPLOAD #${uploadId} - Saved to localStorage`);
      } else {
        log.error(`❌ UPLOAD #${uploadId} - Invalid response format:`, result);
        throw new Error('Invalid response format');
      }
    } catch (error) {
      log.error(`❌ UPLOAD #${uploadId} - Upload failed:`, error);
      setAiState(prevState => ({
        ...prevState,
        processing: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
    }
  };

  const handleExcelAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    log.debug('📊 Excel file selected:', { name: file.name, size: file.size });
    setExcelState({ processing: true, analysis: null, error: null });

    try {
      const formData = new FormData();
      formData.append('excel', file);

      log.debug('📤 Calling /api/ai-docx/excel...');
      const response = await fetch('/api/ai-docx/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      log.debug('📥 Excel API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error en Excel AI analysis');
      }

      setExcelState({
        processing: false,
        analysis: result,
        error: null
      });


    } catch (error) {
      log.error('❌ Excel analysis error:', error);
      setExcelState({
        processing: false,
        analysis: null,
        error: error instanceof Error ? error.message : 'Error desconegut en Excel AI'
      });
    }
  };

  // Google Docs handlers
  const handleShowSourceSelector = () => {
    setSourceSelector({ show: true, selectedSource: null });
  };

  const handleSourceSelected = (sourceType: 'docx' | 'google-docs') => {
    setSourceSelector({ show: false, selectedSource: sourceType });
    
    if (sourceType === 'google-docs') {
      setGoogleDriveState({ show: true, processing: false, error: null });
    }
    // For DOCX, the existing file input will be used
  };

  const handleGoogleDocSelected = async (file: any) => {
    try {
      setGoogleDriveState({ show: false, processing: true, error: null });
      setAiState(prev => ({ 
        ...prev, 
        processing: true, 
        error: null,
        sourceType: 'google-docs',
        googleDocId: file.id
      }));

      log.debug('📄 Google Doc selected:', {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType
      });

      // Call Google Docs analysis endpoint
      const response = await fetch('/api/google/docs/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          documentId: file.id,
          fileName: file.name,
          useGemini: false, // Can make this configurable later
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google authentication required. Please sign in with Google.');
        }
        throw new Error(result.error || 'Failed to analyze Google Doc');
      }

      if (result.success) {
        const analysisData = result.data;
        
        // Format the response to match existing UI expectations
        const newAiState = {
          processing: false,
          template: {
            templateId: analysisData.templateId,
            fileName: analysisData.fileName,
            size: 0, // Google Docs don't have traditional file size
            storagePath: '',
            success: true,
            message: 'Google Doc analyzed successfully'
          },
          aiAnalysis: {
            placeholders: analysisData.placeholders || [],
            transcription: analysisData.markdown || analysisData.transcription,
            htmlPreview: analysisData.transcription || `<div class="p-8 text-center">
              <div class="text-4xl mb-4">📝</div>
              <h3 class="text-lg font-semibold mb-2">${analysisData.fileName}</h3>
              <p class="text-gray-600">Google Doc imported successfully.</p>
              <p class="text-sm text-green-600 mt-2">✅ ${analysisData.placeholders?.length || 0} placeholders detected</p>
            </div>`
          },
          error: null,
          sourceType: 'google-docs' as const,
          googleDocId: file.id
        };

        setAiState(newAiState);
        
        log.debug('✅ Google Doc analysis complete:', {
          templateId: analysisData.templateId,
          placeholders: analysisData.placeholders?.length || 0,
          sections: analysisData.sections?.length || 0,
          confidence: analysisData.confidence
        });

      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (error) {
      log.error('❌ Google Doc analysis failed:', error);
      setAiState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Google Doc analysis failed'
      }));
      setGoogleDriveState(prev => ({ ...prev, processing: false }));
    }
  };

  const handleGoogleAuthRequired = () => {
    // Redirect to Google auth
    window.location.href = '/api/auth/google';
  };

  const handleCancelGoogleDrive = () => {
    setGoogleDriveState({ show: false, processing: false, error: null });
    setSourceSelector({ show: true, selectedSource: null });
  };

  // AUTO-TRIGGER MAPPINGS when both files are uploaded  
  useEffect(() => {
    const shouldFetchMappings = 
      (aiState.aiAnalysis?.placeholders?.length ?? 0) > 0 &&
      (excelState.analysis?.columns?.length ?? 0) > 0 &&
      !mappingState.loading &&
      mappingState.mappings.length === 0;
    
    if (shouldFetchMappings) {
      log.debug('🤖 Both files ready, auto-fetching AI mappings...', {
        placeholders: aiState.aiAnalysis?.placeholders?.length ?? 0,
        columns: excelState.analysis?.columns?.length ?? 0,
        currentMappings: mappingState.mappings.length,
        loading: mappingState.loading
      });
      fetchMappings();
    }
  }, [aiState.aiAnalysis?.placeholders, excelState.analysis?.columns]);

  const fetchMappings = async () => {
    if (!aiState.aiAnalysis?.placeholders || !excelState.analysis?.columns) {
      log.warn('⚠️ fetchMappings called without required data');
      return;
    }
    
    // Evitar múltiples crides simultànies
    if (mappingState.loading) {
      log.debug('⏳ Mappings already loading, skipping...');
      return;
    }

    log.debug('🚀 Starting fetchMappings...');
    setMappingState({ loading: true, mappings: [], error: null });

    try {
      log.debug('📤 Calling /api/ai-docx/mapping with data:', {
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
      log.debug('📥 Mappings response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Error en AI mapping');
      }

      const mappings = result.proposals || [];
      setMappingState({
        loading: false,
        mappings: mappings,
        error: null
      });

      log.success('🎯 AI Mapping completed successfully', {
        count: mappings.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log.error('❌ Mapping error:', error);
      setMappingState({
        loading: false,
        mappings: [],
        error: error instanceof Error ? error.message : 'Error desconegut en AI mapping'
      });
    }
  };

  const handleGenerate = async () => {
    const hasDocument = !!aiState.template?.templateId;
    const hasExcel = !!excelState.analysis;
    const hasMappings = mappingState.mappings.length > 0;
    
    log.debug('🔥 GENERATE CLICKED - Progressive State Debug:', {
      hasDocument,
      hasExcel, 
      hasMappings,
      templateId: aiState.template?.templateId,
      placeholdersCount: aiState.aiAnalysis?.placeholders?.length ?? 0,
      mappingsCount: mappingState.mappings.length,
      excelColumns: excelState.analysis?.columns?.length ?? 0,
      mode: hasDocument && hasExcel && hasMappings ? 'FULL' : 
            hasDocument && hasExcel ? 'PARTIAL_MAPPINGS' :
            hasDocument ? 'DOCUMENT_ONLY' : 'ERROR'
    });
    
    // Progressive validation - allow different modes
    if (!hasDocument) {
      alert('Please upload a document first');
      return;
    }
    
    // Document-only mode (preview/setup)
    if (!hasExcel) {
      log.debug('📄 Document-only mode - going to advanced for setup');
    }
    
    // Partial mode (generating mappings)
    if (hasExcel && !hasMappings && mappingState.loading) {
      log.debug('⏳ Waiting for mappings to complete');
      return;
    }
    
    log.debug('🚀 Starting generation - preparing data for advanced interface');
    
    // Prepare data for localStorage (progressive data)
    const documentData = {
      templateId: aiState.template!.templateId,
      fileName: aiState.template!.fileName,
      placeholders: aiState.aiAnalysis?.placeholders || [],
      transcription: aiState.aiAnalysis?.transcription || '',
      htmlPreview: aiState.aiAnalysis?.htmlPreview
    };
    
    const excelData = hasExcel ? {
      fileName: excelState.analysis!.fileName,
      columns: excelState.analysis!.columns
    } : null;
    
    const generationData = {
      template: aiState.template!,
      documentData: aiState.aiAnalysis,
      mappings: mappingState.mappings,
      excelData: excelState.analysis,
      timestamp: Date.now(),
      mode: hasDocument && hasExcel && hasMappings ? 'FULL' : 
            hasDocument && hasExcel ? 'PARTIAL_MAPPINGS' :
            'DOCUMENT_ONLY'
    };
    
    // Save to localStorage
    localStorage.setItem('generationData', JSON.stringify(generationData));
    localStorage.setItem('textami_document_data', JSON.stringify(documentData));
    if (excelData) {
      localStorage.setItem('textami_excel_data', JSON.stringify(excelData));
    }
    localStorage.setItem('textami_mappings', JSON.stringify(mappingState.mappings));
    
    log.debug('💾 Progressive data saved to localStorage:', {
      hasDocument: true,
      hasExcel: !!excelData,
      mappingsCount: mappingState.mappings.length,
      mode: generationData.mode
    });
    
    // Redirect to advanced interface
    const url = `/generator/advanced?templateId=${aiState.template!.templateId}`;
    log.debug('🔄 Redirecting to advanced interface:', url);
    
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 DocMile AI Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            GPT-5 Vision analitza documents, Excel intelligence, i genera amb format preservation perfecte
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Document Preview Section - Shows Immediately After Upload */}
          {aiState.template && aiState.aiAnalysis && (
            <div className="mb-8 bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">📄 {aiState.template.fileName}</h3>
                <p className="text-sm text-gray-600">
                  {(aiState.aiAnalysis?.placeholders?.length ?? 0)} placeholders detected - Click them to see details
                </p>
              </div>
              
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Document Preview */}
                <div className="lg:col-span-2">
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    {aiState.aiAnalysis.htmlPreview ? (
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: aiState.aiAnalysis.htmlPreview }}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.classList.contains('placeholder-highlight')) {
                            const placeholder = target.dataset.placeholder;
                            const type = target.dataset.type;
                            log.debug('🖱️ Placeholder clicked:', { placeholder, type });
                          }
                        }}
                      />
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">📄</div>
                        <p>Document preview loading...</p>
                        <div className="mt-4 text-sm">
                          <strong>Content:</strong> {aiState.aiAnalysis.transcription?.substring(0, 200)}...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Placeholders Sidebar */}
                <div className="lg:col-span-1">
                  <h4 className="font-semibold mb-3">🎯 Detected Placeholders</h4>
                  <div className="space-y-2">
                    {(aiState.aiAnalysis?.placeholders ?? []).map((placeholder, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                          <span className="font-medium">{placeholder.text}</span>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {placeholder.type}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Confidence: {placeholder.confidence}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`grid gap-8 ${aiState.template ? 'md:grid-cols-1 max-w-2xl mx-auto' : 'md:grid-cols-2'}`}>
            {/* Document Upload - DOCX or Google Docs */}
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center">
                <div className="text-4xl mb-4">{aiState.sourceType === 'google-docs' ? '📝' : '📄'}</div>
                <h3 className="text-xl font-semibold mb-3">
                  {aiState.template 
                    ? (aiState.sourceType === 'google-docs' ? 'Google Doc Loaded' : 'Document Uploaded')
                    : 'Choose Template Source'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {aiState.template 
                    ? `${aiState.sourceType === 'google-docs' ? 'Google Doc' : 'DOCX'} analyzed with AI placeholder detection`
                    : 'Select DOCX upload or Google Docs import for instant AI analysis'
                  }
                </p>
                
                {!aiState.template ? (
                  // Show source selection button
                  <div>
                    <button
                      onClick={handleShowSourceSelector}
                      disabled={aiState.processing || googleDriveState.processing}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                    >
                      {aiState.processing || googleDriveState.processing ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          {aiState.processing ? '🧠 Analyzing...' : '📝 Loading Google Drive...'}
                        </span>
                      ) : (
                        '📄 Choose Template Source'
                      )}
                    </button>
                    
                    {/* Hidden file input for DOCX upload when selected */}
                    <input
                      type="file"
                      className="hidden"
                      accept=".docx,.doc"
                      onChange={handleAiDocumentAnalysis}
                      disabled={aiState.processing}
                      id="docx-upload"
                    />
                    
                    {(aiState.error || googleDriveState.error) && (
                      <p className="text-xs text-red-600 mt-2">{aiState.error || googleDriveState.error}</p>
                    )}
                  </div>
                ) : null}

                {aiState.template && aiState.aiAnalysis && (
                  <div className="space-y-3">
                    <div className="text-green-600 text-sm">
                      ✅ {aiState.template.fileName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {aiState.sourceType === 'google-docs' 
                        ? `📝 Google Doc • ${aiState.aiAnalysis?.placeholders?.length || 0} placeholders`
                        : `${Math.round(aiState.template.size / 1024)} KB`
                      }
                    </div>
                    <div className="text-xs text-blue-600">
                      📄 Transcription ready for smart mapping
                    </div>
                    <div className="text-xs text-green-600">
                      Preview available above ↑
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Excel Upload - Always Visible & Prominent when document loaded */}
            <div className={`bg-white rounded-lg p-6 shadow-lg ${aiState.template ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}>
              <div className="text-center">
                <div className="text-4xl mb-4">📊</div>
                <h3 className={`text-xl font-semibold mb-3 ${aiState.template ? 'text-green-700' : ''}`}>
                  {aiState.template ? '🎯 Now Upload Excel Data' : 'Upload Data'}
                </h3>
                <p className="text-gray-600 mb-4">
                  Upload Excel/CSV for intelligent column mapping
                  <br />
                  <span className={`text-xs font-medium ${aiState.template ? 'text-green-600' : 'text-gray-500'}`}>
                    {aiState.template ? '⭐ Document loaded - Ready for Excel upload!' : '💡 Best after document upload for smart suggestions'}
                  </span>
                </p>

                {/* Always show upload button, but change text if Excel exists */}
                <label 
                  onClick={() => log.debug('🖱️ Excel Label clicked!')}
                  className={`w-full py-3 px-4 rounded-md transition-all block text-center font-medium ${
                    !excelState.processing
                      ? aiState.template 
                        ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer ring-2 ring-green-300' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  {(() => {
                    const buttonText = excelState.processing ? '🔄 Analyzing Excel...' : 
                                      excelState.analysis ? '🔄 Replace Excel/CSV' : 
                                      aiState.template ? '📊 Upload Excel Now!' : 'Upload Excel/CSV';
                    
                    log.debug('🔍 Excel Button Debug:', {
                      processing: excelState.processing,
                      hasAnalysis: !!excelState.analysis,
                      hasTemplate: !!aiState.template,
                      templateId: aiState.template?.templateId,
                      buttonText
                    });
                    
                    return buttonText;
                  })()}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    disabled={excelState.processing}
                    className="hidden"
                    onChange={(e) => {
                      log.debug('📊 Excel Input activated!', e.target.files?.[0]?.name);
                      handleExcelAnalysis(e);
                    }}
                  />
                </label>
                {excelState.error && (
                  <p className="text-xs text-red-600 mt-2">{excelState.error}</p>
                )}
                {!excelState.analysis && (
                  <p className="text-xs text-gray-500 mt-2">
                    Independent upload - works with or without document
                    <br />
                    <span className="text-xs text-blue-600">
                      Debug: Template={!!aiState.template ? 'YES' : 'NO'}, TemplateId={aiState.template?.templateId || 'NONE'}
                    </span>
                  </p>
                )}

                {excelState.analysis && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                      <span>✅ {excelState.analysis.fileName}</span>
                      <button
                        onClick={() => {
                          log.debug('🗑️ Clearing Excel data');
                          setExcelState({ processing: false, analysis: null, error: null });
                        }}
                        className="text-red-500 hover:text-red-700 text-xs px-1"
                        title="Remove Excel file"
                      >
                        ×
                      </button>
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
                      🧠 Ready per AI mapping amb {aiState.aiAnalysis?.placeholders?.length ?? 0} placeholders
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
                
                {(() => {
                  const isReady = 
                    aiState.template?.templateId &&
                    mappingState.mappings.length > 0 &&
                    excelState.analysis &&
                    !mappingState.loading;
                  
                  return (
                    <button
                      onClick={handleGenerate}
                      disabled={!isReady}
                      className={`
                        w-full py-2 px-4 rounded-md font-semibold transition-all
                        ${isReady 
                          ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {mappingState.loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Preparing mappings...
                        </span>
                      ) : isReady ? (
                        '🚀 Generate with AI → Advanced Interface'
                      ) : (
                        '⏳ Complete all steps to generate'
                      )}
                    </button>
                  );
                })()}

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

                {/* Debug info */}
                <div className="mt-2 text-xs text-gray-500">
                  Template: {aiState.template?.templateId ? '✅' : '❌'} |
                  Placeholders: {aiState.aiAnalysis?.placeholders?.length ?? 0} |
                  Mappings: {mappingState.mappings.length} |
                  Excel: {excelState.analysis ? '✅' : '❌'}
                </div>
                
                {/* Error display */}
                {(aiState.error || mappingState.error) && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    {aiState.error || mappingState.error}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  {mappingState.mappings.length > 0 
                    ? `✅ Ready: ${mappingState.mappings.length} mappings → Click to open Advanced Interface!`
                    : mappingState.loading 
                      ? 'Waiting for AI mappings...'
                      : aiState.aiAnalysis && excelState.analysis 
                        ? 'AI mapping in progress...'
                        : 'Upload both files first'}
                </p>
              </div>
            </div>
          </div>

          {/* Generate Section - Always Available */}
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 shadow-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-3">Generate Documents</h3>
              <p className="text-gray-600 mb-6">
                Advanced interface with smart mappings and batch processing
              </p>
              
              {(() => {
                const hasDocument = !!aiState.template?.templateId;
                const hasExcel = !!excelState.analysis;
                const hasMappings = mappingState.mappings.length > 0;
                
                let status = '';
                let buttonText = '';
                let isDisabled = true;
                
                if (hasDocument && hasExcel && hasMappings) {
                  status = '✅ Ready to generate with intelligent mappings';
                  buttonText = '🚀 Launch Advanced Generator';
                  isDisabled = false;
                } else if (hasDocument && hasExcel) {
                  status = '⏳ Preparing intelligent mappings...';
                  buttonText = '🔄 Generating Mappings...';
                  isDisabled = mappingState.loading;
                } else if (hasDocument) {
                  status = '📊 Upload Excel to enable smart mapping';
                  buttonText = '📄 Preview Document Only';
                  isDisabled = false;
                } else {
                  status = '📄 Upload a document to begin';
                  buttonText = '⏳ Upload Files to Continue';
                  isDisabled = true;
                }
                
                return (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">{status}</p>
                    <button
                      onClick={handleGenerate}
                      disabled={isDisabled}
                      className={`
                        w-full max-w-md mx-auto py-3 px-6 rounded-lg font-semibold transition-all
                        ${!isDisabled 
                          ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer shadow-lg' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {buttonText}
                    </button>
                    
                    {/* Status indicators */}
                    <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                      <div className={`flex items-center gap-2 ${hasDocument ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-3 h-3 rounded-full ${hasDocument ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                        Document ({aiState.aiAnalysis?.placeholders?.length ?? 0} placeholders)
                      </div>
                      <div className={`flex items-center gap-2 ${hasExcel ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-3 h-3 rounded-full ${hasExcel ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                        Data ({excelState.analysis?.columns?.length ?? 0} columns)
                      </div>
                      <div className={`flex items-center gap-2 ${hasMappings ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-3 h-3 rounded-full ${hasMappings ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                        Mappings ({mappingState.mappings.length})
                      </div>
                    </div>
                  </div>
                );
              })()}
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

          {/* Document Preview Section */}
          {aiState.template && aiState.aiAnalysis && (
            <div className="mt-8 bg-white rounded-lg p-6 shadow-lg">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">📄 Document Preview with AI Placeholders</h3>
                <p className="text-sm text-gray-600">Interactive preview - click highlighted placeholders to see mappings</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto border rounded-lg">
                {aiState.aiAnalysis.htmlPreview ? (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: aiState.aiAnalysis.htmlPreview }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.classList.contains('placeholder-highlight')) {
                        const placeholder = target.dataset.placeholder;
                        const type = target.dataset.type;
                        log.debug('🖱️ Placeholder clicked:', { placeholder, type });
                        // Future enhancement: Show mapping info modal or inline editor
                      }
                    }}
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">📄</div>
                    <p>Document preview loading...</p>
                    <div className="mt-4 text-sm">
                      <strong>Content:</strong> {aiState.aiAnalysis.transcription?.substring(0, 200)}...
                    </div>
                    <div className="mt-2 text-sm">
                      <strong>Placeholders found:</strong> {aiState.aiAnalysis?.placeholders?.map(p => p.text).join(', ') ?? 'None'}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Detected placeholders:</span>
                {(aiState.aiAnalysis?.placeholders ?? []).map((placeholder, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    {placeholder.text} ({placeholder.type})
                  </span>
                ))}
              </div>
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
      
      {/* Modals */}
      {sourceSelector.show && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
          <TemplateSourceSelector
            onSourceSelected={(sourceType) => {
              handleSourceSelected(sourceType);
              // If DOCX selected, trigger file input
              if (sourceType === 'docx') {
                setTimeout(() => {
                  document.getElementById('docx-upload')?.click();
                }, 100);
              }
            }}
            onClose={() => setSourceSelector({ show: false, selectedSource: null })}
          />
        </div>
      )}
      
      {googleDriveState.show && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <GoogleDrivePicker
            onFileSelect={handleGoogleDocSelected}
            onCancel={handleCancelGoogleDrive}
            onAuthRequired={handleGoogleAuthRequired}
          />
        </div>
      )}
    </div>
  );
}