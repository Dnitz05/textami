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

    try {
      console.log('🧊 Freezing template:', analysisData.templateId);
      // Mock freeze process (in production, call /api/freeze)
      setPipelineStatus('frozen');
      
      // Save frozen status
      localStorage.setItem(`frozen_${analysisData.templateId}`, 'true');
      
    } catch (err) {
      setError('Failed to freeze template');
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
      {analysisData && (
        <AIAnalysisInterface
          analysisData={analysisData}
          excelHeaders={excelHeaders}
          onTagUpdate={handleTagUpdate}
          onMappingUpdate={handleMappingUpdate}
          onFreeze={handleFreeze}
          pipelineStatus={pipelineStatus}
        />
      )}
    </div>
  );
}