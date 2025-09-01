'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { GoogleDriveFile } from '@/lib/google/types';
import { SpreadsheetInfo, SheetData, DataValidationResult } from '@/lib/google/sheets-service';
import toast from 'react-hot-toast';

interface GoogleSheetsSelectorProps {
  onSheetSelected: (sheetData: SheetData & { spreadsheetId: string; spreadsheetName: string }) => void;
  onCancel: () => void;
  className?: string;
}

interface SelectedSpreadsheet extends SpreadsheetInfo {
  selectedSheetId?: number;
  selectedSheetName?: string;
}

export default function GoogleSheetsSelector({
  onSheetSelected,
  onCancel,
  className = ''
}: GoogleSheetsSelectorProps) {
  const [spreadsheets, setSpreadsheets] = useState<GoogleDriveFile[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<SelectedSpreadsheet | null>(null);
  const [previewData, setPreviewData] = useState<SheetData | null>(null);
  const [validation, setValidation] = useState<DataValidationResult | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [step, setStep] = useState<'select-spreadsheet' | 'select-sheet' | 'preview'>('select-spreadsheet');

  // Load spreadsheets on mount
  useEffect(() => {
    loadSpreadsheets();
  }, []);

  const loadSpreadsheets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google/drive/files?type=spreadsheets&limit=20');
      
      if (response.ok) {
        const data = await response.json();
        setSpreadsheets(data.files || []);
      } else if (response.status === 401) {
        toast.error('Google account not connected. Please connect your Google account first.');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load Google Sheets');
      }
    } catch (error) {
      console.error('Error loading Google Sheets:', error);
      toast.error('Failed to connect to Google Sheets');
    } finally {
      setLoading(false);
    }
  };

  const handleSpreadsheetSelect = async (spreadsheet: GoogleDriveFile) => {
    try {
      setPreviewLoading(true);
      
      // Get spreadsheet info (sheets list)
      const response = await fetch(`/api/google/sheets/data?spreadsheetId=${spreadsheet.id}&preview=true`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedSpreadsheet({
          ...data.spreadsheetInfo,
          selectedSheetId: data.spreadsheetInfo.sheets[0]?.sheetId,
          selectedSheetName: data.spreadsheetInfo.sheets[0]?.title,
        });
        setPreviewData(data.preview);
        setStep('select-sheet');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to access spreadsheet');
      }
    } catch (error) {
      console.error('Error selecting spreadsheet:', error);
      toast.error('Failed to load spreadsheet data');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSheetSelect = async (sheetId: number, sheetTitle: string) => {
    if (!selectedSpreadsheet) return;

    try {
      setPreviewLoading(true);
      
      // Get sheet preview and validation
      const response = await fetch('/api/google/sheets/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: selectedSpreadsheet.spreadsheetId,
          action: 'analyze',
          sheetName: sheetTitle,
          range: 'A1:Z100', // Limit for preview
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSpreadsheet(prev => prev ? {
          ...prev,
          selectedSheetId: sheetId,
          selectedSheetName: sheetTitle,
        } : null);
        setPreviewData(data.sheetData);
        setValidation(data.analysis.validation);
        setStep('preview');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load sheet data');
      }
    } catch (error) {
      console.error('Error loading sheet data:', error);
      toast.error('Failed to analyze sheet data');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedSpreadsheet || !previewData) return;

    onSheetSelected({
      ...previewData,
      spreadsheetId: selectedSpreadsheet.spreadsheetId,
      spreadsheetName: selectedSpreadsheet.title,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select-spreadsheet':
        return (
          <div>
            <h3 className="text-lg font-medium mb-4">Selecciona un Google Sheet</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregant Google Sheets...</p>
                </div>
              </div>
            ) : spreadsheets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No tens Google Sheets</h4>
                <p className="text-gray-600">Crea alguns fulls de càlcul a Google Sheets primer</p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {spreadsheets.map((spreadsheet) => (
                  <Card
                    key={spreadsheet.id}
                    className="cursor-pointer transition-all duration-200 border-gray-200 hover:border-gray-300 hover:shadow-md"
                    onClick={() => handleSpreadsheetSelect(spreadsheet)}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {spreadsheet.name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span>Modificat: {formatDate(spreadsheet.modifiedTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'select-sheet':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Selecciona una fulla</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('select-spreadsheet')}
              >
                ← Tornar
              </Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-gray-900">{selectedSpreadsheet?.title}</h4>
              <p className="text-sm text-gray-600">{selectedSpreadsheet?.sheets.length} fulles disponibles</p>
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {selectedSpreadsheet?.sheets.map((sheet) => (
                  <Card
                    key={sheet.sheetId}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedSpreadsheet.selectedSheetId === sheet.sheetId
                        ? 'ring-2 ring-blue-500 border-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleSheetSelect(sheet.sheetId, sheet.title)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{sheet.title}</h5>
                          <p className="text-sm text-gray-600">
                            {sheet.rowCount} files × {sheet.columnCount} columnes
                          </p>
                        </div>
                        {selectedSpreadsheet.selectedSheetId === sheet.sheetId && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'preview':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Vista prèvia de dades</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('select-sheet')}
              >
                ← Canviar fulla
              </Button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-medium text-gray-900">
                {selectedSpreadsheet?.title} - {selectedSpreadsheet?.selectedSheetName}
              </h4>
              <p className="text-sm text-gray-600">
                {previewData?.data.length} files de dades amb {previewData?.headers.length} columnes
              </p>
            </div>

            {/* Data Quality Info */}
            {validation && (
              <div className={`rounded-lg p-3 mb-4 ${
                validation.isValid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-4 h-4 rounded-full ${validation.isValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="font-medium">
                    {validation.isValid ? 'Dades vàlides' : 'Avisos de qualitat'}
                  </span>
                </div>
                {validation.warnings.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {validation.warnings.slice(0, 3).map((warning, index) => (
                      <li key={index} className="text-yellow-800">• {warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Data Preview Table */}
            {previewData && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {previewData.headers.map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.data.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {previewData.headers.map((header, colIndex) => (
                            <td key={colIndex} className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                              {String(row[header] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Google Sheets</h2>
            <p className="text-sm text-gray-600 mt-1">
              Selecciona un full de càlcul per les dades de mapping
            </p>
          </div>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <Button onClick={onCancel} variant="outline">
            Cancel·lar
          </Button>
          {step === 'preview' && (
            <Button
              onClick={handleConfirmSelection}
              disabled={!previewData}
              className="bg-green-600 hover:bg-green-700"
            >
              Utilitzar aquest full
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}