// components/analysis/DataMappingPanel.tsx
// Universal Data Mapping Panel - Supports both Excel and Google Sheets
import React, { useState, useEffect, useRef } from 'react';
import { ParsedTag } from '@/lib/types';
import { log } from '@/lib/logger';
import { useMapping } from '@/contexts/MappingContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GoogleSheetsSelector from '@/components/google/GoogleSheetsSelector';
import { SheetData } from '@/lib/google/sheets-service';

interface DataMappingPanelProps {
  tags: ParsedTag[];
  placeholders?: Array<{
    text: string;
    variable: string;
    confidence: number;
    context: string;
    type: 'text' | 'date' | 'number' | 'currency' | 'email' | 'other';
  }>;
  excelHeaders?: string[]; // Optional for backwards compatibility
  dataSource?: {
    type: 'excel' | 'sheets';
    headers: string[];
    data?: Record<string, any>[];
    metadata?: any;
  };
  onMappingUpdate?: (mappings: Record<string, string>) => void;
  onDataSourceChange?: (dataSource: any) => void;
  pipelineStatus?: string;
  onExcelUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessingExcel?: boolean;
  documentMarkdown?: string;
}

interface MappingSuggestion {
  tagSlug: string;
  tagName: string;
  tagType?: string;
  tagExample?: string;
  suggestedHeader: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  alternativeHeaders?: string[];
}

type DataSourceType = 'excel' | 'sheets' | null;

const DataMappingPanel: React.FC<DataMappingPanelProps> = ({
  tags,
  placeholders,
  excelHeaders = [],
  dataSource,
  onMappingUpdate,
  onDataSourceChange,
  pipelineStatus,
  onExcelUpload,
  isProcessingExcel = false,
  documentMarkdown = ''
}) => {
  const [selectedDataSourceType, setSelectedDataSourceType] = useState<DataSourceType>(
    dataSource?.type || (excelHeaders.length > 0 ? 'excel' : null)
  );
  const [currentDataSource, setCurrentDataSource] = useState(dataSource);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showGoogleSheetsSelector, setShowGoogleSheetsSelector] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use mapping context for manual text selection
  const {
    isManualMappingActive,
    activeManualHeader,
    manualTextMappings,
    manualTagInfo,
    activateManualMapping,
    deactivateManualMapping
  } = useMapping();

  // Initialize data source from props
  useEffect(() => {
    if (dataSource) {
      setCurrentDataSource(dataSource);
      setSelectedDataSourceType(dataSource.type);
    } else if (excelHeaders.length > 0) {
      // Backwards compatibility - convert Excel headers to data source format
      setCurrentDataSource({
        type: 'excel',
        headers: excelHeaders,
        data: [],
        metadata: { source: 'legacy' }
      });
      setSelectedDataSourceType('excel');
    }
  }, [dataSource, excelHeaders]);

  // Load intelligent AI mapping suggestions when data source changes
  useEffect(() => {
    if ((tags.length > 0 || (placeholders && placeholders.length > 0)) && 
        currentDataSource && currentDataSource.headers.length > 0) {
      loadIntelligentMappings();
    }
  }, [tags, placeholders, currentDataSource]);

  // Handle data source selection
  const handleDataSourceSelect = (sourceType: 'excel' | 'sheets') => {
    setSelectedDataSourceType(sourceType);
    
    if (sourceType === 'excel') {
      // Trigger Excel file upload
      fileInputRef.current?.click();
    } else if (sourceType === 'sheets') {
      // Show Google Sheets selector
      setShowGoogleSheetsSelector(true);
    }
  };

  // Handle Google Sheets selection
  const handleGoogleSheetSelected = (sheetData: SheetData & { spreadsheetId: string; spreadsheetName: string }) => {
    const newDataSource = {
      type: 'sheets' as const,
      headers: sheetData.headers,
      data: sheetData.data,
      metadata: {
        spreadsheetId: sheetData.spreadsheetId,
        spreadsheetName: sheetData.spreadsheetName,
        sheetId: sheetData.sheetId,
        sheetTitle: sheetData.title,
        rowCount: sheetData.rowCount,
        columnCount: sheetData.columnCount,
      }
    };

    setCurrentDataSource(newDataSource);
    setShowGoogleSheetsSelector(false);
    
    // Notify parent component
    if (onDataSourceChange) {
      onDataSourceChange(newDataSource);
    }

    log.info('🟢 Google Sheets data source selected:', {
      spreadsheet: sheetData.spreadsheetName,
      sheet: sheetData.title,
      headers: sheetData.headers.length,
      rows: sheetData.data.length
    });
  };

  // Load intelligent AI mapping suggestions
  const loadIntelligentMappings = async () => {
    if (!currentDataSource) return;

    setIsLoadingSuggestions(true);
    try {
      log.debug('🧠 Loading intelligent AI mappings...', {
        dataSourceType: currentDataSource.type,
        headersCount: currentDataSource.headers.length
      });
      
      // Clean headers
      const cleanedHeaders = currentDataSource.headers
        .map(header => header.trim())
        .filter(header => header.length > 0);
      
      // Prepare request body
      const requestBody: any = {
        excelHeaders: cleanedHeaders, // Keep same API endpoint name for compatibility
        documentContent: documentMarkdown || '',
        dataSourceType: currentDataSource.type, // New field to help AI understand context
      };
      
      // Add placeholders or legacy tags
      if (placeholders && placeholders.length > 0) {
        requestBody.placeholders = placeholders;
        log.debug('🔄 Using OOXML+IA placeholders format');
      } else {
        requestBody.tags = tags;
        log.debug('🔄 Using legacy tags format');
      }

      // Add data source specific metadata
      if (currentDataSource.type === 'sheets' && currentDataSource.metadata) {
        requestBody.sheetsMetadata = {
          spreadsheetName: currentDataSource.metadata.spreadsheetName,
          sheetTitle: currentDataSource.metadata.sheetTitle,
          sampleData: currentDataSource.data?.slice(0, 3) || [] // First 3 rows for context
        };
      }

      const response = await fetch('/api/ai-excel/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.suggestions) {
        setSuggestions(result.suggestions);
        
        // Auto-apply high confidence mappings
        const autoMappings: Record<string, string> = {};
        result.suggestions.forEach((suggestion: MappingSuggestion) => {
          if (suggestion.confidence === 'high' && suggestion.score >= 0.8) {
            autoMappings[suggestion.tagSlug] = suggestion.suggestedHeader;
          }
        });

        if (Object.keys(autoMappings).length > 0) {
          setMappings(prev => ({ ...prev, ...autoMappings }));
          if (onMappingUpdate) {
            onMappingUpdate({ ...mappings, ...autoMappings });
          }
          log.info(`✅ Auto-applied ${Object.keys(autoMappings).length} high-confidence mappings`);
        }
      }
    } catch (error) {
      log.error('❌ Failed to load intelligent mappings:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle manual mapping
  const handleMappingChange = (tagSlug: string, headerName: string) => {
    const newMappings = { ...mappings, [tagSlug]: headerName };
    setMappings(newMappings);
    
    if (onMappingUpdate) {
      onMappingUpdate(newMappings);
    }
    
    log.debug('🔄 Manual mapping updated:', { tagSlug, headerName });
  };

  // Apply AI suggestion
  const applySuggestion = (suggestion: MappingSuggestion) => {
    handleMappingChange(suggestion.tagSlug, suggestion.suggestedHeader);
  };

  // Get variables to map (placeholders or legacy tags)
  const getVariablesToMap = () => {
    if (placeholders && placeholders.length > 0) {
      return placeholders.map(p => ({
        slug: p.variable,
        name: p.text,
        type: p.type,
        example: p.context,
        confidence: p.confidence
      }));
    }
    
    return tags.map(tag => ({
      slug: tag.slug,
      name: tag.name,
      type: tag.type,
      example: tag.example || '',
      confidence: 1.0
    }));
  };

  const variablesToMap = getVariablesToMap();
  const dataSourceHeaders = currentDataSource?.headers || [];

  // If no data source is selected, show selector
  if (!selectedDataSourceType) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Afegir dades per generació massiva
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Excel Option */}
          <Card 
            className="cursor-pointer transition-all duration-200 border-gray-200 hover:border-blue-300 hover:shadow-md"
            onClick={() => handleDataSourceSelect('excel')}
          >
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-2xl">📊</div>
                <div>
                  <h4 className="font-medium text-gray-900">Excel (.xlsx)</h4>
                  <p className="text-sm text-gray-600">Puja un fitxer des de l'ordinador</p>
                </div>
              </div>
              <div className="space-y-2">
                {['Format tradicional', 'Compatible amb totes les versions', 'Dades locals'].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Google Sheets Option */}
          <Card 
            className="cursor-pointer transition-all duration-200 border-gray-200 hover:border-green-300 hover:shadow-md"
            onClick={() => handleDataSourceSelect('sheets')}
          >
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-2xl">📋</div>
                <div>
                  <h4 className="font-medium text-gray-900">Google Sheets</h4>
                  <p className="text-sm text-gray-600">Connecta des de Google Drive</p>
                </div>
              </div>
              <div className="space-y-2">
                {['Sempre actualitzat', 'Col·laboració en temps real', 'Accés des del núvol'].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Hidden file input for Excel upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={onExcelUpload}
          className="hidden"
        />

        {/* Google Sheets Selector Modal */}
        {showGoogleSheetsSelector && (
          <GoogleSheetsSelector
            onSheetSelected={handleGoogleSheetSelected}
            onCancel={() => setShowGoogleSheetsSelector(false)}
          />
        )}
      </Card>
    );
  }

  // Main mapping interface
  return (
    <div className="space-y-6">
      {/* Data Source Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {currentDataSource?.type === 'sheets' ? '📋' : '📊'}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                {currentDataSource?.type === 'sheets' 
                  ? `${currentDataSource.metadata?.spreadsheetName} - ${currentDataSource.metadata?.sheetTitle}`
                  : 'Excel File'
                }
              </h4>
              <p className="text-sm text-gray-600">
                {dataSourceHeaders.length} columnes, {currentDataSource?.data?.length || 0} files de dades
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDataSourceType(null);
              setCurrentDataSource(null);
            }}
          >
            Canviar font de dades
          </Button>
        </div>
      </Card>

      {/* Mapping Interface */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Mapping Intel·ligent de Variables
          </h3>
          {isLoadingSuggestions && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Generant suggeriments IA...</span>
            </div>
          )}
        </div>

        {variablesToMap.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔍</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No s'han trobat variables</h4>
            <p className="text-gray-600">
              Primer analitza un document per detectar variables abans de fer el mapping
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {variablesToMap.map((variable) => {
              const suggestion = suggestions.find(s => s.tagSlug === variable.slug);
              const currentMapping = mappings[variable.slug];
              
              return (
                <div key={variable.slug} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-medium text-gray-900">{variable.name}</h5>
                      {variable.example && (
                        <p className="text-sm text-gray-600 mt-1">Exemple: {variable.example}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {variable.confidence !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          variable.confidence > 0.8 
                            ? 'bg-green-100 text-green-800' 
                            : variable.confidence > 0.6 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(variable.confidence * 100)}%
                        </span>
                      )}
                      {variable.type && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
                          {variable.type}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={currentMapping || ''}
                      onChange={(e) => handleMappingChange(variable.slug, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecciona una columna...</option>
                      {dataSourceHeaders.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>

                    {suggestion && !currentMapping && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applySuggestion(suggestion)}
                        className={`${
                          suggestion.confidence === 'high' 
                            ? 'border-green-300 text-green-700 hover:bg-green-50'
                            : suggestion.confidence === 'medium'
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-red-300 text-red-700 hover:bg-red-50'
                        }`}
                      >
                        ✨ {suggestion.suggestedHeader} ({Math.round(suggestion.score * 100)}%)
                      </Button>
                    )}
                  </div>

                  {suggestion && !currentMapping && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        <strong>IA suggereix:</strong> {suggestion.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mapping Summary */}
        {variablesToMap.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Variables mapejades: {Object.keys(mappings).length} de {variablesToMap.length}
              </span>
              <span className={`font-medium ${
                Object.keys(mappings).length === variablesToMap.length 
                  ? 'text-green-600' 
                  : 'text-yellow-600'
              }`}>
                {Object.keys(mappings).length === variablesToMap.length ? '✅ Complet' : '⚠️ Pendent'}
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DataMappingPanel;