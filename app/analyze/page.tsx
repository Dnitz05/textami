'use client';

import React, { useState, useEffect } from 'react';
import AIAnalysisInterface from '../../components/AIAnalysisInterface';
import { ParsedTag, ParsedSection, ParsedTable } from '../../lib/ai-parser';
import { parseExcelHeaders, validateExcelFile } from '../../lib/excel-parser';

interface AnalysisData {
  templateId: string;
  markdown: string;
  sections: ParsedSection[];
  tables: ParsedTable[];
  tags: ParsedTag[];
  signatura?: {
    nom: string;
    carrec: string;
    data_lloc: string;
  };
}

export default function AnalyzePage() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<'uploaded' | 'analyzed' | 'mapped' | 'frozen' | 'production'>('uploaded');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{
    batchId: string;
    totalGenerated: number;
    documents: Array<{
      fileName: string;
      downloadUrl: string;
      rowIndex: number;
    }>;
  } | null>(null);

  // Mock data for immediate testing
  useEffect(() => {
    // Load mock analysis data
    const mockData: AnalysisData = {
      templateId: 'template_mock_' + Date.now(),
      markdown: `# INFORME TÈCNIC

## Assumpte
Llicència d'obra menor sol·licitada per **Paquita Ferre SL** per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa.

## Antecedents
Paquita Ferre SL sol·licita llicència d'obra menor per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa, amb un pressupost de 683,00 €.

## Informe
S'informa favorablement la concessió de la llicència sol·licitada d'acord amb la documentació presentada i les condicions particulars que s'estableixen.

## Condicions particulars
- No s'admet la reparació amb pintura de cautxú o similar
- Previ inici de l'obra s'hauran de presentar les mostres dels materials
- Els treballs s'executaran d'acord amb la normativa vigent`,
      sections: [
        {
          id: "assumpte",
          title: "Assumpte", 
          markdown: "Llicència d'obra menor sol·licitada per Paquita Ferre SL per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa."
        },
        {
          id: "antecedents",
          title: "Antecedents",
          markdown: "Paquita Ferre SL sol·licita llicència d'obra menor per a la reparació de façana situada al carrer Llarg de Sant Vicent, 56 de Tortosa, amb un pressupost de 683,00 €."
        },
        {
          id: "informe", 
          title: "Informe",
          markdown: "S'informa favorablement la concessió de la llicència sol·licitada d'acord amb la documentació presentada i les condicions particulars que s'estableixen."
        }
      ],
      tables: [
        {
          id: "liquidacio",
          title: "Informe liquidació obra",
          headers: ["Concepte", "Impost", "Taxa", "Total"],
          rows: [
            ["Quota resultant", "23,36 €", "6,15 €", "29,51 €"],
            ["Quota mínima", "0,00 €", "78,60 €", "78,60 €"],
            ["Total quota", "23,36 €", "78,60 €", "101,96 €"]
          ],
          normalized: {
            pressupost: 683.00,
            total_quota: 101.96
          }
        }
      ],
      tags: [
        { name: "nom_solicitant", slug: "nom_solicitant", example: "Paquita Ferre SL", type: "string", confidence: 0.95, page: 1, anchor: "sol·licitada per" },
        { name: "adreca_obra", slug: "adreca_obra", example: "carrer Llarg de Sant Vicent, 56", type: "address", confidence: 0.98, page: 1 },
        { name: "municipi", slug: "municipi", example: "Tortosa", type: "string", confidence: 0.99, page: 1 },
        { name: "pressupost", slug: "pressupost", example: "683,00 €", type: "currency", confidence: 0.99, page: 1, normalized: 683.0 },
        { name: "total_quota", slug: "total_quota", example: "101,96 €", type: "currency", confidence: 0.99, page: 1, anchor: "Total quota", normalized: 101.96 },
        { name: "data_informe", slug: "data_informe", example: "8 d'abril de 2021", type: "date", confidence: 0.95, page: 1, normalized: "2021-04-08" }
      ],
      signatura: {
        nom: "Aitor Gilabert Juan",
        carrec: "Arquitecte Municipal",
        data_lloc: "Tortosa, 8 d'abril de 2021"
      }
    };

    setAnalysisData(mockData);
    setPipelineStatus('analyzed');
    
    // Mock Excel headers - realistic municipal data
    setExcelHeaders(['Nom Solicitant', 'Adreça Obra', 'Municipi', 'Data Informe', 'Import Pressupost', 'Import Total', 'Observacions']);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // For now, mock the analysis (in production, upload to Supabase and call /api/extract)
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Mock API call to /api/extract
      console.log('🚀 Mock: Uploading PDF and calling /api/extract with GPT-5...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock successful analysis (replace with real API call)
      const mockResponse: AnalysisData = {
        templateId,
        markdown: `# ${file.name.replace('.pdf', '').toUpperCase()}\n\nDocument analyzed with GPT-5...`,
        sections: [
          { id: 'content', title: 'Document Content', markdown: 'Analyzed content from uploaded PDF...' }
        ],
        tables: [],
        tags: [
          { name: 'document_title', slug: 'document_title', example: file.name, type: 'string', confidence: 0.9, page: 1 }
        ]
      };

      setAnalysisData(mockResponse);
      setPipelineStatus('analyzed');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
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

    try {
      console.log('📊 Processing Excel file:', file.name);
      
      // Parse Excel headers (mock for now)
      const headers = await parseExcelHeaders(file);
      setExcelHeaders(headers);
      setPipelineStatus('mapped');
      
      console.log('✅ Excel headers extracted:', headers);
      
    } catch (err) {
      setError('Failed to parse Excel file');
      console.error('❌ Excel parsing error:', err);
    }
  };

  const handleTagUpdate = (tags: ParsedTag[]) => {
    if (analysisData) {
      setAnalysisData({ ...analysisData, tags });
    }
  };

  const handleMappingUpdate = (mappings: Record<string, string>) => {
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900">AI Document Analysis</h1>
          <p className="text-gray-600 mt-1">Upload documents, extract variables, and generate personalized content</p>
        </div>
      </div>

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
        />
      )}

      {/* Production Interface - only show when template is frozen */}
      {analysisData && pipelineStatus === 'frozen' && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🚀 Ready for Mass Production</h2>
            <p className="text-gray-600 mb-6">
              Your template has been frozen with placeholders. Now you can generate multiple documents from your Excel data.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-800 mb-2">Template Status: Frozen ✅</h3>
              <p className="text-sm text-green-700">
                Ready to process Excel data and generate personalized documents with 100% format preservation.
              </p>
            </div>

            <button
              onClick={handleGenerateDocuments}
              disabled={isGenerating || excelHeaders.length === 0}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Generating Documents...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generate Documents from Excel
                </>
              )}
            </button>

            {excelHeaders.length === 0 && (
              <p className="text-amber-600 mt-3 text-sm">
                ⚠️ Upload Excel data first to enable document generation
              </p>
            )}
          </div>
        </div>
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
    </div>
  );
}