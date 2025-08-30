// lib/documents/excel-reader.ts
// Lector d'Excel SIMPLIFICAT per Textami MVP

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

/**
 * Dades d'Excel processades
 */
export interface ExcelData {
  headers: string[];
  rows: any[];
  totalRows: number;
}

/**
 * Llegeix un fitxer Excel des de Supabase Storage
 * SIMPLIFICAT per MVP - només funcionalitat essencial
 */
export async function readExcelFromStorage(excelStoragePath: string): Promise<ExcelData> {
  log.debug(`[readExcelFromStorage] Llegint: ${excelStoragePath}`);
  
  // Client amb service role
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    // Descarregar Excel
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('template-docx')
      .download(excelStoragePath);

    if (downloadError) {
      throw new Error(`Error accedint Excel: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error('No s\'ha pogut obtenir l\'Excel');
    }

    // Processar Excel
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // Primer full
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Excel buit');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Excel sense dades');
    }

    // Headers i files
    const headers = jsonData[0] as string[];
    const rawRows = jsonData.slice(1);

    if (!headers || headers.length === 0) {
      throw new Error('No hi ha capçaleres');
    }

    // Processar files
    const processedRows = rawRows
      .filter(row => Array.isArray(row) && row.some(cell => 
        cell !== null && cell !== undefined && cell !== ''
      ))
      .map((row: any) => {
        const rowObj: any = {};
        headers.forEach((header, index) => {
          rowObj[header] = row[index] || '';
        });
        return rowObj;
      });

    log.debug(`[readExcelFromStorage] ✅ Processat: ${headers.length} columnes, ${processedRows.length} files`);

    return {
      headers,
      rows: processedRows,
      totalRows: processedRows.length
    };

  } catch (error) {
    log.error('[readExcelFromStorage] ❌ Error:', error);
    throw new Error(`Error processant Excel: ${error instanceof Error ? error.message : 'Error desconegut'}`);
  }
}