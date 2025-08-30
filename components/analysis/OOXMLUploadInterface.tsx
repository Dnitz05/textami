'use client';

import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { HTMLPreviewPanel } from './HTMLPreviewPanel';

interface OOXMLUploadResult {
  templateId: string;
  styleManifest: any;
  htmlContent: string;
  aiAnalysis: {
    placeholders: Array<{
      text: string;
      variable: string;
      confidence: number;
      context: string;
      type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
    }>;
    sections: any[];
    processingTime: number;
  };
  ooxmlReport: {
    stylesFound: number;
    processingTime: number;
    warnings: string[];
  };
}

interface OOXMLUploadInterfaceProps {
  onUploadComplete?: (result: OOXMLUploadResult) => void;
}

export function OOXMLUploadInterface({ onUploadComplete }: OOXMLUploadInterfaceProps) {
  const [file, setFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<OOXMLUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setError('Només es permeten fitxers DOCX');
      return;
    }
    
    setFile(selectedFile);
    setTemplateName(selectedFile.name.replace('.docx', ''));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Selecciona un fitxer DOCX');
      return;
    }

    if (!templateName.trim()) {
      setError('Introdueix un nom per la plantilla');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('docx', file);
      formData.append('name', templateName.trim());
      formData.append('description', templateDescription.trim());
      formData.append('userId', 'anonymous'); // TODO: Real user ID

      const response = await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la càrrega');
      }

      const { success, data } = await response.json();
      
      if (!success) {
        throw new Error('Error en el processament OOXML');
      }

      setUploadResult(data);
      setCurrentStep('preview');

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Error desconegut');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlaceholdersUpdate = (updatedPlaceholders: any[]) => {
    if (uploadResult) {
      setUploadResult({
        ...uploadResult,
        aiAnalysis: {
          ...uploadResult.aiAnalysis,
          placeholders: updatedPlaceholders
        }
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!uploadResult) return;

    // Here you would save the final template with validated placeholders
    // For now, just complete the process
    setCurrentStep('complete');
    onUploadComplete?.(uploadResult);
  };

  const resetUpload = () => {
    setFile(null);
    setTemplateName('');
    setTemplateDescription('');
    setUploadResult(null);
    setError(null);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
            currentStep === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-300'
          }`}>1</div>
          Càrrega DOCX
        </div>
        <div className="w-16 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
            currentStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-300'
          }`}>2</div>
          Validació Variables
        </div>
        <div className="w-16 h-0.5 bg-gray-300"></div>
        <div className={`flex items-center ${currentStep === 'complete' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
            currentStep === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'
          }`}>3</div>
          Plantilla Creada
        </div>
      </div>

      {/* Step 1: Upload */}
      {currentStep === 'upload' && (
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Càrrega Plantilla DOCX</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fitxer DOCX</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="w-full p-3 border border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors"
              />
              {file && (
                <p className="text-sm text-green-600 mt-2">✓ {file.name} seleccionat</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nom de la Plantilla</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nom descriptiu per la plantilla"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripció (opcional)</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Breu descripció de la plantilla i el seu ús"
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <p className="text-red-800">{error}</p>
              </Alert>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || !templateName.trim() || isProcessing}
              className="w-full py-3"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processant OOXML...
                </>
              ) : (
                'Processar Plantilla'
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Preview & Validation */}
      {currentStep === 'preview' && uploadResult && (
        <div className="space-y-6">
          {/* Processing Results Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Resultats del Processament</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{uploadResult.ooxmlReport.stylesFound}</div>
                <div className="text-sm text-gray-600">Estils trobats</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{uploadResult.aiAnalysis.placeholders.length}</div>
                <div className="text-sm text-gray-600">Variables detectades</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{uploadResult.ooxmlReport.processingTime}ms</div>
                <div className="text-sm text-gray-600">Temps processament</div>
              </div>
            </div>

            {uploadResult.ooxmlReport.warnings.length > 0 && (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <p className="text-yellow-800">
                  <strong>Avisos:</strong> {uploadResult.ooxmlReport.warnings.length} estils no reconeguts automàticament
                </p>
              </Alert>
            )}
          </Card>

          {/* HTML Preview and Placeholder Management */}
          <HTMLPreviewPanel
            htmlContent={uploadResult.htmlContent}
            placeholders={uploadResult.aiAnalysis.placeholders}
            onPlaceholdersUpdate={handlePlaceholdersUpdate}
            isEditable={true}
          />

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={resetUpload}>
              ← Tornar a començar
            </Button>
            <Button onClick={handleSaveTemplate}>
              Guardar Plantilla →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {currentStep === 'complete' && uploadResult && (
        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Plantilla Creada Correctament!</h2>
            <p className="text-gray-600">ID: {uploadResult.templateId}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Següents passos:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Pujar fitxer Excel amb dades</li>
                <li>• Configurar correspondències Excel ↔ Variables</li>
                <li>• Generar documents personalitzats</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={resetUpload} variant="outline">
                Crear Nova Plantilla
              </Button>
              <Button onClick={() => window.location.href = '/generator'}>
                Anar a Generació →
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}