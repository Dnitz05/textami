'use client';

import React, { useState, useEffect } from 'react';

// Force dynamic rendering to avoid SSR issues with Supabase
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import AIAnalysisInterface from '../../../components/AIAnalysisInterface';
import TopNavBar from '../../../components/TopNavBar';
import { useUser } from '@/hooks/useUser';
import { parseExcelHeaders, validateExcelFile } from '../../../lib/excel-parser';
import { 
  AnalysisData, 
  PipelineStatus, 
  GenerationResult,
  ApiResponse,
  UploadResponse,
  ExtractionResponse,
  ParsedTag 
} from '../../../lib/types';
import { log } from '@/lib/logger';

interface PageProps {
  params: {
    templateId: string;
  };
}

export default function DynamicAnalyzePage({ params }: PageProps) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useUser();
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('uploaded');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isProcessingExcel, setIsProcessingExcel] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [templateType, setTemplateType] = useState<'docx' | 'google-docs' | 'unknown'>('unknown');

  // 🎯 ULTRA-SMART: Detect template type from templateId
  useEffect(() => {
    const detectTemplateType = () => {
      const { templateId } = params;
      
      if (templateId.startsWith('template_gdocs_') || templateId.startsWith('template_googledocs_')) {
        setTemplateType('google-docs');
        log.debug('🔍 Template type detected: Google Docs', { templateId });
      } else if (templateId.startsWith('template_docx_') || templateId.startsWith('template_')) {
        setTemplateType('docx');
        log.debug('🔍 Template type detected: DOCX', { templateId });
      } else {
        setTemplateType('unknown');
        log.warn('⚠️ Unknown template type for templateId:', { templateId });
      }
    };

    detectTemplateType();
  }, [params.templateId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // 🧠 ULTRA-SMART: Load template data based on type and templateId
  useEffect(() => {
    const loadTemplateData = async () => {
      const { templateId } = params;
      
      // Try to load from saved templates first
      const loadedTemplate = sessionStorage.getItem('loadedTemplate');
      if (loadedTemplate) {
        try {
          const template = JSON.parse(loadedTemplate);
          setAnalysisData(template.analysisData);
          setExcelHeaders(template.excelHeaders);
          setPipelineStatus('frozen');
          sessionStorage.removeItem('loadedTemplate');
          log.debug('✅ Template loaded from session:', template.name);
          return;
        } catch (error) {
          log.error('❌ Error loading template from session:', error);
        }
      }

      // 🔄 Handle different template types
      if (templateType === 'google-docs') {
        await loadGoogleDocsTemplate(templateId);
      } else if (templateType === 'docx') {
        await loadDocxTemplate(templateId);
      }
    };

    if (templateType !== 'unknown') {
      loadTemplateData();
    }
  }, [templateType, params.templateId]);

  // 📄 Load Google Docs template
  const loadGoogleDocsTemplate = async (templateId: string) => {
    const selectedGoogleFile = sessionStorage.getItem('selectedGoogleFile');
    
    if (selectedGoogleFile) {
      try {
        const fileData = JSON.parse(selectedGoogleFile);
        log.debug('🔄 Processing Google Docs file:', fileData);
        
        setIsAnalyzing(true);
        setError(null);
        setOriginalFileName(fileData.name);

        // Call Google Docs analysis API
        const response = await fetch('/api/google/docs/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            documentId: fileData.id,
            fileName: fileData.name,
            templateId: templateId,
            useGemini: false,
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
          const analysisData: AnalysisData = {
            templateId: templateId,
            title: result.data.fileName,
            markdown: result.data.markdown || result.data.transcription || `# ${result.data.fileName}\n\nGoogle Doc analyzed successfully.`,
            sections: result.data.sections || [],
            tables: result.data.tables || [],
            tags: [], // Legacy format
            placeholders: result.data.placeholders || [],
            signatura: result.data.signatura || undefined
          };

          setAnalysisData(analysisData);
          setPipelineStatus('analyzed');
          
          log.debug('✅ Google Docs analysis completed:', {
            templateId,
            placeholders: result.data.placeholders?.length || 0,
            sections: result.data.sections?.length || 0
          });

          // Clean up session storage
          sessionStorage.removeItem('selectedGoogleFile');
        } else {
          throw new Error(result.error || 'Google Docs analysis failed');
        }

      } catch (error) {
        log.error('❌ Google Docs analysis failed:', error);
        setError(error instanceof Error ? error.message : 'Google Docs analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // No Google file data, redirect back
      log.warn('⚠️ No Google file data found for template:', templateId);
      router.push('/google/select');
    }
  };

  // 📄 Load DOCX template
  const loadDocxTemplate = async (templateId: string) => {
    const selectedFile = sessionStorage.getItem('selectedFile');
    const selectedFileContent = sessionStorage.getItem('selectedFileContent');
    
    if (selectedFile && selectedFileContent) {
      try {
        const fileData = JSON.parse(selectedFile);
        log.debug('🔄 Auto-uploading DOCX file:', fileData.file.name);
        
        // Convert base64 back to file
        const binaryString = atob(selectedFileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const file = new File([bytes], fileData.file.name, {
          type: fileData.file.type,
          lastModified: fileData.file.lastModified
        });
        
        // Clear session storage
        sessionStorage.removeItem('selectedFile');
        sessionStorage.removeItem('selectedFileContent');
        
        // Auto-trigger upload
        await performDocxAnalysis(file, templateId);
        
      } catch (error) {
        log.error('❌ Error auto-uploading DOCX file:', error);
        sessionStorage.removeItem('selectedFile');
        sessionStorage.removeItem('selectedFileContent');
        router.push('/dashboard');
      }
    } else {
      // No DOCX file data, redirect back
      log.warn('⚠️ No DOCX file data found for template:', templateId);
      router.push('/dashboard');
    }
  };

  // 🔧 Perform DOCX analysis
  const performDocxAnalysis = async (file: File, templateId: string) => {
    setIsAnalyzing(true);
    setError(null);
    setOriginalFileName(file.name);

    try {
      log.debug('🚀 Analyzing DOCX with GPT-5:', { templateId, fileName: file.name });
      
      const formData = new FormData();
      formData.append('docx', file);
      formData.append('templateId', templateId);
      
      const analysisResponse = await fetch('/api/ai-docx/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (!analysisResponse.ok) {
        const analysisError = await analysisResponse.json() as ApiResponse;
        throw new Error(analysisError.error || 'Failed to analyze DOCX');
      }
      
      const analysisResult = await analysisResponse.json();
      log.debug('✅ DOCX analysis completed:', analysisResult);
      
      if (!analysisResult.success || !analysisResult.data) {
        throw new Error('Analysis response invalid');
      }
      
      const result = analysisResult.data;
      const analysisData: AnalysisData = {
        templateId: templateId,
        title: result.fileName,
        markdown: result.transcription || result.markdown || `# ${result.fileName}\n\nDOCX document analyzed successfully.`,
        sections: result.sections || [],
        tables: result.tables || [],
        tags: [],
        placeholders: result.placeholders || [],
        signatura: result.signatura || undefined
      };

      setAnalysisData(analysisData);
      setPipelineStatus('analyzed');
      
    } catch (error) {
      log.error('❌ DOCX analysis failed:', error);
      setError(error instanceof Error ? error.message : 'DOCX analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAsTemplate = () => {
    setShowSaveTemplateDialog(true);
    setTemplateName('');
    setTemplateDescription('');
  };

  const handleSave = () => {
    handleSaveAsTemplate();
  };

  const handleSaveAs = () => {
    handleSaveAsTemplate();
  };

  const handleClose = () => {
    router.push('/templates');
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || !analysisData) {
      alert('Si us plau, introdueix un nom per la plantilla.');
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        userId: isAuthenticated && user ? user.id : 'anonymous',
        originalDocument: '',
        analysisData,
        excelHeaders,
        mappings: {},
        documentType: templateType,
        documentSize: 0
      };

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Plantilla guardada correctament!');
        setShowSaveTemplateDialog(false);
        log.debug('✅ Template saved:', result.data.name);
      } else {
        throw new Error(result.error || 'Failed to save template');
      }
    } catch (error) {
      log.error('❌ Error saving template:', error);
      alert('Error guardant la plantilla: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateExcelFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid Excel file');
      return;
    }

    setIsProcessingExcel(true);
    setError(null);

    try {
      log.debug('📊 Processing Excel file:', file.name);
      
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/ai-docx/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      log.debug('📥 Excel API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze Excel file');
      }

      if (result.success && result.columns) {
        const headers = result.columns.map((col: any) => col.header);
        setExcelHeaders(headers);
        setPipelineStatus('mapped');
        
        log.debug('✅ Excel headers extracted:', headers);
        localStorage.setItem('textami_excel_columns', JSON.stringify(result.columns));
      } else {
        throw new Error('Invalid Excel analysis response');
      }
      
    } catch (err) {
      setError(`Failed to analyze Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      log.error('❌ Excel analysis error:', err);
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const handleTagUpdate = (tags: ParsedTag[]): void => {
    if (analysisData) {
      setAnalysisData({ ...analysisData, tags });
    }
  };

  const handleMappingUpdate = (mappings: Record<string, string>): void => {
    log.debug('📋 Mapping updated:', mappings);
    if (analysisData) {
      localStorage.setItem(`mappings_${analysisData.templateId}`, JSON.stringify(mappings));
    }
  };

  const handleFreeze = async () => {
    if (!analysisData) return;

    const savedMappings = localStorage.getItem(`mappings_${analysisData.templateId}`);
    const mappings = savedMappings ? JSON.parse(savedMappings) : {};
    
    const mappedTags = Object.keys(mappings).length;
    if (mappedTags === 0) {
      setError('Please map at least one tag before freezing the template.');
      return;
    }

    const shouldProceed = confirm(
      `This will permanently modify the template by inserting ${mappedTags} placeholders. This action cannot be undone. Continue?`
    );
    
    if (!shouldProceed) return;

    try {
      log.debug('🧊 Starting template freeze process...');
      setError(null);
      
      const response = await fetch('/api/freeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: analysisData.templateId,
          storageUrl: `${analysisData.templateId}/original.docx`,
          tags: analysisData.tags,
          mappings: mappings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Freeze operation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        const { successfulReplacements, totalReplacements, manualReviewRequired } = result.data;
        
        log.debug('✅ Template freeze successful:', result.data);
        setPipelineStatus('frozen');
        
        localStorage.setItem(`frozen_${analysisData.templateId}`, JSON.stringify({
          frozenAt: result.data.frozenAt,
          frozenTemplateUrl: result.data.frozenTemplateUrl,
          successfulReplacements,
          totalReplacements,
          manualReviewRequired
        }));
        
        let message = `✅ Template frozen successfully!\n\n`;
        message += `• ${successfulReplacements}/${totalReplacements} placeholders inserted automatically\n`;
        
        if (manualReviewRequired.length > 0) {
          message += `• ${manualReviewRequired.length} items need manual review:\n`;
          message += manualReviewRequired.map((item: string) => `  - ${item}`).join('\n');
        } else {
          message += `• All placeholders inserted successfully!`;
        }
        
        alert(message);
        
      } else {
        throw new Error('Freeze operation returned unsuccessful status');
      }
      
    } catch (err) {
      log.error('❌ Template freeze failed:', err);
      const errorMsg = `Failed to freeze template: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
    }
  };

  const handleGenerateDocuments = async () => {
    if (!analysisData || excelHeaders.length === 0) {
      setError('Please upload Excel data before generating documents.');
      return;
    }

    const frozenInfo = localStorage.getItem(`frozen_${analysisData.templateId}`);
    if (!frozenInfo) {
      setError('Template must be frozen before generating documents.');
      return;
    }

    const frozenData = JSON.parse(frozenInfo);
    const savedMappings = localStorage.getItem(`mappings_${analysisData.templateId}`);
    const mappings = savedMappings ? JSON.parse(savedMappings) : {};

    if (Object.keys(mappings).length === 0) {
      setError('No mappings available for document generation.');
      return;
    }

    const shouldProceed = confirm(
      `This will generate documents for all Excel rows using the frozen template. Continue?`
    );
    
    if (!shouldProceed) return;

    setIsGenerating(true);
    setError(null);

    try {
      log.debug('🚀 Starting mass document generation...');

      const mockExcelData = [
        {
          'Nom Solicitant': 'Paquita Ferre SL',
          'Adreça Obra': 'carrer Llarg de Sant Vicent, 56', 
          'Municipi': 'Tortosa',
          'Data Informe': '08/04/2021',
          'Import Pressupost': '683,00 €',
          'Import Total': '101,96 €',
          'Observacions': 'Llicència obra menor'
        }
      ];

      const response = await fetch('/api/ai-docx/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: analysisData.templateId,
          frozenTemplateUrl: frozenData.frozenTemplateUrl,
          excelData: mockExcelData,
          mappings: mappings,
          batchSize: 10
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Document generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        log.debug('✅ Mass generation successful:', result.data);
        
        setGenerationResult({
          batchId: result.data.batchId,
          totalGenerated: result.data.totalGenerated,
          documents: result.data.documents
        });
        setPipelineStatus('production');
        
        alert(`✅ Generated ${result.data.totalGenerated} documents successfully!\n\nBatch ID: ${result.data.batchId}`);
        
      } else {
        throw new Error('Generation returned unsuccessful status');
      }
      
    } catch (err) {
      log.error('❌ Mass generation failed:', err);
      const errorMsg = `Failed to generate documents: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <TopNavBar />
      
      {/* Template Info Header */}
      <div className="bg-blue-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {templateType === 'google-docs' ? (
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {templateType === 'google-docs' ? 'Google Docs' : templateType === 'docx' ? 'DOCX' : 'Loading...'}
                </span>
              </div>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-mono text-gray-600">{params.templateId}</span>
              {originalFileName && (
                <>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-700">{originalFileName}</span>
                </>
              )}
            </div>
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div>
        {/* Loading Section */}
        {isAnalyzing && (
          <div className="pt-20">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-blue-600 text-lg">
                  Analyzing {templateType === 'google-docs' ? 'Google Doc' : 'DOCX'} with AI...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  This may take a few moments to complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Section */}
        {error && !isAnalyzing && (
          <div className="pt-20">
            <div className="max-w-7xl mx-auto px-6 py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium text-red-900 mb-2">Analysis Error</h3>
                <p className="text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Interface */}
        {analysisData && pipelineStatus !== 'production' && !isAnalyzing && (
          <AIAnalysisInterface
            analysisData={analysisData}
            excelHeaders={excelHeaders}
            onTagUpdate={handleTagUpdate}
            onMappingUpdate={handleMappingUpdate}
            onFreeze={handleFreeze}
            pipelineStatus={pipelineStatus}
            fileName={originalFileName}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onClose={handleClose}
            onExcelUpload={handleExcelUpload}
            isProcessingExcel={isProcessingExcel}
          />
        )}

        {/* Production Results */}
        {generationResult && pipelineStatus === 'production' && (
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="bg-white rounded-lg shadow-sm border p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🎉 Documents Generated Successfully!</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{generationResult.totalGenerated}</div>
                  <div className="text-sm text-green-700">Documents Generated</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-lg font-mono text-blue-600">{generationResult.batchId}</div>
                  <div className="text-sm text-blue-700">Batch ID</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-lg font-bold text-purple-600">100%</div>
                  <div className="text-sm text-purple-700">Format Preserved</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Download Generated Documents:</h3>
                {generationResult.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                    <div>
                      <div className="font-medium text-gray-900">{doc.fileName}</div>
                      <div className="text-sm text-gray-500">Row {doc.rowIndex + 1} data</div>
                    </div>
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </a>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Template Dialog */}
        {showSaveTemplateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Guardar Plantilla</h3>
                  <button
                    onClick={() => setShowSaveTemplateDialog(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); saveTemplate(); }} className="space-y-4">
                  <div>
                    <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nom de la Plantilla *
                    </label>
                    <input
                      id="templateName"
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Ex: Contracte de treball estàndard"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="templateDescription" className="block text-sm font-medium text-gray-700 mb-1">
                      Descripció
                    </label>
                    <textarea
                      id="templateDescription"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Descripció opcional de la plantilla..."
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateDialog(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel·lar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Guardar</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}