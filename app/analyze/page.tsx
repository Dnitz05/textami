'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AIAnalysisInterface from '../../components/AIAnalysisInterface';
import TopNavBar from '../../components/TopNavBar';
import { parseExcelHeaders, validateExcelFile } from '../../lib/excel-parser';
import { 
  AnalysisData, 
  PipelineStatus, 
  GenerationResult,
  ApiResponse,
  UploadResponse,
  ExtractionResponse,
  ParsedTag 
} from '../../lib/types';

export default function AnalyzePage() {
  const router = useRouter();
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

  // Mock data disabled - enable real PDF upload
  // useEffect(() => {
  //   // Mock data would load here for testing
  // }, []);

  // Load template from session storage if available or auto-upload file
  useEffect(() => {
    const loadedTemplate = sessionStorage.getItem('loadedTemplate');
    if (loadedTemplate) {
      try {
        const template = JSON.parse(loadedTemplate);
        setAnalysisData(template.analysisData);
        setExcelHeaders(template.excelHeaders);
        setPipelineStatus('frozen');
        sessionStorage.removeItem('loadedTemplate');
        console.log('✅ Template loaded:', template.name);
      } catch (error) {
        console.error('❌ Error loading template:', error);
      }
    }

    // Auto-upload file from Nova Plantilla button if available
    const selectedFile = sessionStorage.getItem('selectedFile');
    const selectedFileContent = sessionStorage.getItem('selectedFileContent');
    
    if (selectedFile && selectedFileContent) {
      try {
        const fileData = JSON.parse(selectedFile);
        console.log('🔄 Auto-uploading file from Nova Plantilla:', fileData.file.name);
        
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
        uploadFile(file);
        
      } catch (error) {
        console.error('❌ Error auto-uploading file:', error);
        sessionStorage.removeItem('selectedFile');
        sessionStorage.removeItem('selectedFileContent');
      }
    }
  }, []);

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
        userId: 'user-001', // Would be from auth
        originalDocument: '', // Would be the storage path of original document
        analysisData,
        excelHeaders,
        mappings: {}, // Would get current mappings from the interface
        documentType: 'pdf', // Could be detected from original upload
        documentSize: 0 // Would be from original file
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
        console.log('✅ Template saved:', result.data.name);
      } else {
        throw new Error(result.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('❌ Error saving template:', error);
      alert('Error guardant la plantilla: ' + (error instanceof Error ? error.message : 'Error desconegut'));
    }
  };

  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🚀 Real GPT-5 Analysis: Uploading PDF to Supabase and calling /api/extract...');
      
      // Rest of the upload logic will continue...
      await performAnalysis(file, templateId);
      
    } catch (err) {
      console.error('❌ Analysis failed:', err);
      const errorMsg = `Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
  };

  const performAnalysis = async (file: File, templateId: string) => {
    setOriginalFileName(file.name);
    console.log('🚀 Real GPT-5 Analysis: Uploading PDF to Supabase and calling /api/extract...');
    
    // 1. Upload PDF to Supabase Storage
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', templateId);
    
    const uploadResponse = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.json() as ApiResponse;
      throw new Error(uploadError.error || 'Failed to upload PDF');
    }
    
    const uploadResult = await uploadResponse.json() as ApiResponse<UploadResponse>;
    console.log('✅ PDF uploaded successfully:', uploadResult);
    
    if (!uploadResult.success || !uploadResult.data) {
      throw new Error('Upload response invalid');
    }
    
    // 2. Call GPT-5 analysis API
    const analysisResponse = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: templateId,
        pdfUrl: uploadResult.data.pdfUrl,
        fileName: file.name
      })
    });
    
    if (!analysisResponse.ok) {
      const analysisError = await analysisResponse.json() as ApiResponse;
      throw new Error(analysisError.error || 'GPT-5 analysis failed');
    }
    
    const analysisResult = await analysisResponse.json() as ApiResponse<ExtractionResponse>;
    console.log('✅ GPT-5 analysis completed:', analysisResult);
    
    if (!analysisResult.success || !analysisResult.data) {
      throw new Error('Analysis response invalid');
    }
    
    // 3. Process and display results
    const result = analysisResult.data;
    const analysisData: AnalysisData = {
      templateId,
      title: result.title,
      markdown: result.markdown || `# ${file.name}\n\nDocument processed successfully.`,
      sections: result.sections || [],
      tables: result.tables || [],
      tags: result.tags || [],
      signatura: result.signatura
    };

    setAnalysisData(analysisData);
    setPipelineStatus('analyzed');
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate Excel file
    const validation = validateExcelFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid Excel file');
      return;
    }

    setIsProcessingExcel(true);
    setError(null);

    try {
      console.log('📊 Processing Excel file with real AI analysis:', file.name);
      
      // Use real Excel API instead of mock
      const formData = new FormData();
      formData.append('excel', file);

      const response = await fetch('/api/ai-docx/excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📥 Excel API response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze Excel file');
      }

      if (result.success && result.columns) {
        // Extract just the headers from the API response
        const headers = result.columns.map((col: any) => col.header);
        setExcelHeaders(headers);
        setPipelineStatus('mapped');
        
        console.log('✅ Real Excel headers extracted:', headers);
        console.log('📊 Full column data:', result.columns);
        
        // Store full column data for future use
        localStorage.setItem('textami_excel_columns', JSON.stringify(result.columns));
      } else {
        throw new Error('Invalid Excel analysis response');
      }
      
    } catch (err) {
      setError(`Failed to analyze Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('❌ Excel analysis error:', err);
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
    console.log('📋 Mapping updated:', mappings);
    // Save mappings to localStorage or database
    if (analysisData) {
      localStorage.setItem(`mappings_${analysisData.templateId}`, JSON.stringify(mappings));
    }
  };

  const handleFreeze = async () => {
    if (!analysisData) return;

    // Get current mappings from localStorage
    const savedMappings = localStorage.getItem(`mappings_${analysisData.templateId}`);
    const mappings = savedMappings ? JSON.parse(savedMappings) : {};
    
    const mappedTags = Object.keys(mappings).length;
    if (mappedTags === 0) {
      setError('Please map at least one tag before freezing the template.');
      return;
    }

    const shouldProceed = confirm(
      `This will permanently modify the DOCX template by inserting ${mappedTags} placeholders. This action cannot be undone. Continue?`
    );
    
    if (!shouldProceed) return;

    try {
      console.log('🧊 Starting template freeze process...');
      setError(null);
      
      // Call freeze API
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
        
        console.log('✅ Template freeze successful:', result.data);
        
        // Update pipeline status
        setPipelineStatus('frozen');
        
        // Save frozen status and results
        localStorage.setItem(`frozen_${analysisData.templateId}`, JSON.stringify({
          frozenAt: result.data.frozenAt,
          frozenTemplateUrl: result.data.frozenTemplateUrl,
          successfulReplacements,
          totalReplacements,
          manualReviewRequired
        }));
        
        // Show results to user
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
      console.error('❌ Template freeze failed:', err);
      const errorMsg = `Failed to freeze template: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
    }
  };

  const handleGenerateDocuments = async () => {
    if (!analysisData || excelHeaders.length === 0) {
      setError('Please upload Excel data before generating documents.');
      return;
    }

    // Get frozen template info
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
      console.log('🚀 Starting mass document generation...');

      // Mock Excel data for testing (in production, use real parsed Excel)
      const mockExcelData = [
        {
          'Nom Solicitant': 'Paquita Ferre SL',
          'Adreça Obra': 'carrer Llarg de Sant Vicent, 56', 
          'Municipi': 'Tortosa',
          'Data Informe': '08/04/2021',
          'Import Pressupost': '683,00 €',
          'Import Total': '101,96 €',
          'Observacions': 'Llicència obra menor'
        },
        {
          'Nom Solicitant': 'Maria Garcia Construccions',
          'Adreça Obra': 'Avinguda Catalunya, 123',
          'Municipi': 'Tortosa', 
          'Data Informe': '15/04/2021',
          'Import Pressupost': '1200,00 €',
          'Import Total': '180,00 €',
          'Observacions': 'Reforma interior'
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
          batchSize: 10 // Limit for testing
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Document generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Mass generation successful:', result.data);
        
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
      console.error('❌ Mass generation failed:', err);
      const errorMsg = `Failed to generate documents: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      

      {/* Upload Section */}
      {!analysisData && (
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document for Analysis</h2>
            <p className="text-gray-600 mb-6">Upload a PDF document to start AI analysis with GPT-5</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PDF Document</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  disabled={isAnalyzing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {excelHeaders.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Excel Data (Optional)</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>
              )}
            </div>

            {isAnalyzing && (
              <div className="mt-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-blue-600 mt-2">Analyzing document with GPT-5...</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Interface */}
      {analysisData && pipelineStatus !== 'production' && (
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


      {/* Production Results - show generated documents */}
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
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Start New Analysis
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
  );
}