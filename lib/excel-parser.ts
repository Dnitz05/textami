// lib/excel-parser.ts
// Excel file parsing utilities for header extraction

/**
 * Mock Excel parsing for development
 * In production, use SheetJS (xlsx) library
 */
export function parseExcelHeaders(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const fileName = file.name.toLowerCase();
    
    // Mock different Excel file scenarios
    if (fileName.includes('municipal') || fileName.includes('informe')) {
      resolve([
        'Nom Solicitant',
        'Cognoms', 
        'Adreça Obra',
        'Municipi',
        'Data Informe',
        'Import Pressupost',
        'Import Total',
        'Observacions'
      ]);
    } else if (fileName.includes('client') || fileName.includes('customer')) {
      resolve([
        'Name',
        'Surname', 
        'Address',
        'City',
        'Date',
        'Amount',
        'Total Amount',
        'Notes'
      ]);
    } else if (fileName.includes('empresa') || fileName.includes('company')) {
      resolve([
        'Nom Empresa',
        'CIF',
        'Direcció',
        'Població', 
        'Data Contracte',
        'Pressupost Inicial',
        'Import Final',
        'Estat'
      ]);
    } else {
      // Generic Excel structure
      resolve([
        'Nom',
        'Cognoms',
        'Correu Electronic',
        'Telefon',
        'Adreca',
        'Ciutat',
        'Data',
        'Import',
        'Comentaris'
      ]);
    }
  });
}

/**
 * Extract sample data from Excel (mock)
 */
export function parseExcelData(file: File): Promise<Record<string, any>[]> {
  return new Promise((resolve) => {
    // Mock data based on file name
    const fileName = file.name.toLowerCase();
    
    if (fileName.includes('municipal')) {
      resolve([
        {
          'Nom Solicitant': 'Paquita Ferre SL',
          'Cognoms': '',
          'Adreça Obra': 'carrer Llarg de Sant Vicent, 56',
          'Municipi': 'Tortosa',
          'Data Informe': '08/04/2021',
          'Import Pressupost': '683,00',
          'Import Total': '101,96',
          'Observacions': 'Llicència obra menor'
        },
        {
          'Nom Solicitant': 'Maria Garcia Construccions',
          'Cognoms': '',
          'Adreça Obra': 'Avinguda Catalunya, 123',
          'Municipi': 'Tortosa',
          'Data Informe': '15/04/2021',
          'Import Pressupost': '1200,00',
          'Import Total': '180,00',
          'Observacions': 'Reforma interior'
        }
      ]);
    } else {
      // Generic mock data
      resolve([
        {
          'Nom': 'Joan',
          'Cognoms': 'Martínez',
          'Correu Electronic': 'joan@example.com',
          'Telefon': '677123456',
          'Adreca': 'Carrer Principal, 1',
          'Ciutat': 'Barcelona',
          'Data': '01/05/2024',
          'Import': '250,00',
          'Comentaris': 'Client preferent'
        }
      ]);
    }
  });
}

/**
 * Validate Excel file format
 */
export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  const validExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: `Invalid file type. Supported formats: ${validExtensions.join(', ')}`
    };
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return {
      valid: false,
      error: 'File size too large. Maximum size is 10MB.'
    };
  }
  
  return { valid: true };
}