import { sheets_v4, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { handleGoogleApiError } from './auth';
import { GoogleSheetMetadata } from './types';

// Sheet data interfaces
export interface SheetData {
  sheetId: number;
  title: string;
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
  columnCount: number;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    rowCount: number;
    columnCount: number;
  }>;
}

export interface DataValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  emptyRows: number;
  totalRows: number;
}

// Google Sheets client wrapper
export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  
  constructor(private oauth2Client: OAuth2Client) {
    this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  }

  // Get spreadsheet metadata
  async getSpreadsheetMetadata(spreadsheetId: string): Promise<GoogleSheetMetadata> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties,sheets.properties',
      });

      const spreadsheet = response.data;
      
      if (!spreadsheet.properties || !spreadsheet.sheets) {
        throw new Error('Invalid spreadsheet data received');
      }

      return {
        spreadsheetId,
        properties: {
          title: spreadsheet.properties.title || 'Untitled Spreadsheet',
          locale: spreadsheet.properties.locale || 'en',
          timeZone: spreadsheet.properties.timeZone || 'UTC',
        },
        sheets: spreadsheet.sheets.map(sheet => ({
          properties: {
            sheetId: sheet.properties?.sheetId || 0,
            title: sheet.properties?.title || 'Untitled Sheet',
            index: sheet.properties?.index || 0,
            gridProperties: {
              rowCount: sheet.properties?.gridProperties?.rowCount || 1000,
              columnCount: sheet.properties?.gridProperties?.columnCount || 26,
            },
          },
        })),
      };
    } catch (error) {
      throw handleGoogleApiError(error);
    }
  }

  // Get sheet data with range
  async getSheetData(
    spreadsheetId: string, 
    range: string = 'A:Z',
    sheetName?: string
  ): Promise<SheetData> {
    try {
      const fullRange = sheetName ? `${sheetName}!${range}` : range;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange,
        valueRenderOption: 'UNFORMATTED_VALUE', // Get raw values
        dateTimeRenderOption: 'FORMATTED_STRING', // Format dates as strings
      });

      const values = response.data.values || [];
      
      if (values.length === 0) {
        throw new Error('No data found in the specified range');
      }

      // Extract headers (first row)
      const headers = values[0]?.map(header => String(header).trim()) || [];
      
      if (headers.length === 0) {
        throw new Error('No headers found in the first row');
      }

      // Process data rows
      const dataRows = values.slice(1); // Skip header row
      const data: Record<string, any>[] = [];

      dataRows.forEach((row, index) => {
        const rowData: Record<string, any> = {};
        let hasData = false;

        headers.forEach((header, colIndex) => {
          const cellValue = row[colIndex];
          
          // Convert cell value to appropriate type
          if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
            rowData[header] = this.parseValue(cellValue);
            hasData = true;
          } else {
            rowData[header] = '';
          }
        });

        // Only include rows with at least some data
        if (hasData) {
          rowData['__rowIndex'] = index + 2; // +2 because we skip header and arrays are 0-indexed
          data.push(rowData);
        }
      });

      // Get sheet properties for metadata
      const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
      const sheet = sheetName 
        ? metadata.sheets.find(s => s.properties.title === sheetName)?.properties
        : metadata.sheets[0]?.properties;

      return {
        sheetId: sheet?.sheetId || 0,
        title: sheet?.title || 'Sheet1',
        headers,
        data,
        rowCount: data.length,
        columnCount: headers.length,
      };
    } catch (error) {
      console.error('Error getting sheet data:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Get all sheets info from a spreadsheet
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    try {
      const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
      
      return {
        spreadsheetId,
        title: metadata.properties.title,
        sheets: metadata.sheets.map(sheet => ({
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount,
        })),
      };
    } catch (error) {
      console.error('Error getting spreadsheet info:', error);
      throw handleGoogleApiError(error);
    }
  }

  // Validate sheet data quality
  async validateSheetData(spreadsheetId: string, range?: string): Promise<DataValidationResult> {
    try {
      const sheetData = await this.getSheetData(spreadsheetId, range);
      const warnings: string[] = [];
      const errors: string[] = [];
      let emptyRows = 0;

      // Check for common issues
      if (sheetData.headers.length === 0) {
        errors.push('No headers found in the first row');
      }

      // Check for duplicate headers
      const duplicateHeaders = sheetData.headers.filter((header, index) => 
        sheetData.headers.indexOf(header) !== index && header.trim() !== ''
      );
      if (duplicateHeaders.length > 0) {
        warnings.push(`Duplicate headers found: ${duplicateHeaders.join(', ')}`);
      }

      // Check for empty headers
      const emptyHeaders = sheetData.headers.filter(header => header.trim() === '');
      if (emptyHeaders.length > 0) {
        warnings.push(`${emptyHeaders.length} empty headers found`);
      }

      // Analyze data quality
      sheetData.data.forEach((row, index) => {
        const nonEmptyValues = Object.values(row).filter(value => 
          value !== null && value !== undefined && value !== ''
        ).length;
        
        if (nonEmptyValues === 1) { // Only __rowIndex
          emptyRows++;
        }
      });

      if (emptyRows > 0) {
        warnings.push(`${emptyRows} rows appear to be empty or have minimal data`);
      }

      // Check data types consistency
      this.validateDataTypes(sheetData, warnings);

      return {
        isValid: errors.length === 0,
        warnings,
        errors,
        emptyRows,
        totalRows: sheetData.data.length,
      };
    } catch (error) {
      return {
        isValid: false,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        emptyRows: 0,
        totalRows: 0,
      };
    }
  }

  // Get data preview (first few rows)
  async getDataPreview(spreadsheetId: string, sheetName?: string, rows: number = 5): Promise<SheetData> {
    const range = `A1:Z${rows + 1}`; // +1 for header
    return this.getSheetData(spreadsheetId, range, sheetName);
  }

  // Alias for getSheetData to match test expectations
  async getSpreadsheetData(spreadsheetId: string, range?: string, sheetName?: string): Promise<any> {
    const fullRange = sheetName && range ? `${sheetName}!${range}` : range || 'A:Z';
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: fullRange,
        majorDimension: 'ROWS',
      });

      return {
        values: response.data.values || [],
        range: response.data.range || fullRange,
        majorDimension: response.data.majorDimension || 'ROWS'
      };
    } catch (error) {
      throw handleGoogleApiError(error);
    }
  }

  // Search for specific values in sheet
  async searchValues(spreadsheetId: string, searchTerm: string, sheetName?: string): Promise<{
    matches: Array<{
      row: number;
      column: string;
      value: any;
      cellAddress: string;
    }>;
    totalMatches: number;
  }> {
    try {
      const sheetData = await this.getSheetData(spreadsheetId, undefined, sheetName);
      const matches: Array<{
        row: number;
        column: string;
        value: any;
        cellAddress: string;
      }> = [];

      sheetData.data.forEach((row, rowIndex) => {
        sheetData.headers.forEach((header, colIndex) => {
          const value = row[header];
          if (value && String(value).toLowerCase().includes(searchTerm.toLowerCase())) {
            matches.push({
              row: rowIndex + 2, // +2 for header and 0-index
              column: header,
              value,
              cellAddress: `${this.numberToColumnLetter(colIndex + 1)}${(rowIndex + 2).toString()}`,
            });
          }
        });
      });

      return {
        matches: matches.slice(0, 100), // Limit results
        totalMatches: matches.length,
      };
    } catch (error) {
      throw handleGoogleApiError(error);
    }
  }

  // Helper: Parse cell value to appropriate type
  private parseValue(value: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    const strValue = String(value).trim();
    
    // Empty string
    if (strValue === '') {
      return '';
    }

    // Boolean
    if (strValue.toLowerCase() === 'true') return true;
    if (strValue.toLowerCase() === 'false') return false;

    // Number
    if (!isNaN(Number(strValue)) && strValue !== '') {
      const numValue = Number(strValue);
      return Number.isInteger(numValue) ? numValue : parseFloat(numValue);
    }

    // Date (basic detection)
    if (strValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/) || 
        strValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(strValue);
      if (!isNaN(date.getTime())) {
        return strValue; // Keep as formatted string
      }
    }

    // Default: return as string
    return strValue;
  }

  // Helper: Validate data types consistency
  private validateDataTypes(sheetData: SheetData, warnings: string[]): void {
    sheetData.headers.forEach(header => {
      const columnValues = sheetData.data
        .map(row => row[header])
        .filter(value => value !== null && value !== undefined && value !== '');

      if (columnValues.length === 0) return;

      const types = new Set(columnValues.map(value => typeof value));
      
      if (types.size > 1 && types.has('string') && (types.has('number') || types.has('boolean'))) {
        warnings.push(`Column "${header}" has mixed data types: ${Array.from(types).join(', ')}`);
      }
    });
  }

  // Helper: Convert column number to letter (A, B, C, ..., AA, AB, etc.)
  private numberToColumnLetter(columnNumber: number): string {
    let columnName = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      columnName = String.fromCharCode(65 + remainder) + columnName;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return columnName;
  }
}

// Factory function for creating Google Sheets service
export async function createGoogleSheetsService(
  tokens: any,
  onTokenRefresh?: (tokens: any) => void
): Promise<GoogleSheetsService> {
  const { createAuthenticatedClient } = await import('./auth');
  const oauth2Client = await createAuthenticatedClient(tokens, onTokenRefresh);
  return new GoogleSheetsService(oauth2Client);
}