// lib/documents/docx-reader.ts
// Lector de documents DOCX SIMPLIFICAT per Textami MVP

import { createClient } from '@supabase/supabase-js';

/**
 * Valida que un path de storage és vàlid
 */
function validateStoragePath(storagePath: string): { isValid: boolean; error?: string; normalizedPath?: string } {
  if (!storagePath || storagePath.trim() === '') {
    return { isValid: false, error: 'Path buit o null' };
  }

  let normalizedPath = storagePath.trim();
  
  // Eliminar barra inicial si existeix
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }

  // Verificar extensió .docx
  if (!normalizedPath.toLowerCase().endsWith('.docx')) {
    return { isValid: false, error: 'Path ha de tenir extensió .docx' };
  }

  return { isValid: true, normalizedPath };
}

/**
 * Valida que un buffer és un DOCX vàlid
 */
function validateDocxBuffer(buffer: Buffer): { isValid: boolean; error?: string } {
  try {
    // Verificar mida mínima
    if (buffer.length < 100) {
      return { isValid: false, error: `Buffer massa petit: ${buffer.length} bytes` };
    }

    // Verificar signatura ZIP (DOCX és un format ZIP)
    const uint8Array = new Uint8Array(buffer);
    if (uint8Array[0] !== 0x50 || uint8Array[1] !== 0x4B) {
      return { isValid: false, error: 'No és un fitxer ZIP vàlid' };
    }

    return { isValid: true };

  } catch (error: any) {
    return { isValid: false, error: `Error validant buffer: ${error.message}` };
  }
}

/**
 * Llegeix un document DOCX des de Supabase Storage i retorna el buffer
 * SIMPLIFICAT per MVP - només funcionalitat essencial
 */
export async function readDocxFromStorage(storagePath: string): Promise<Buffer> {
  console.log(`[readDocxFromStorage] Llegint: "${storagePath}"`);
  
  // Client amb service role
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    // Validar path
    const pathValidation = validateStoragePath(storagePath);
    if (!pathValidation.isValid) {
      throw new Error(`Path invàlid: ${pathValidation.error}`);
    }
    
    const normalizedPath = pathValidation.normalizedPath!;
    
    // Descarregar fitxer
    const { data, error } = await supabaseAdmin.storage
      .from('template-docx')
      .download(normalizedPath);

    if (error) {
      throw new Error(`Error descarregant: ${error.message}`);
    }

    if (!data) {
      throw new Error(`No s'han rebut dades`);
    }

    // Validar buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    
    const bufferValidation = validateDocxBuffer(buffer);
    if (!bufferValidation.isValid) {
      throw new Error(`Buffer invàlid: ${bufferValidation.error}`);
    }
    
    console.log(`[readDocxFromStorage] ✅ Llegit correctament: ${buffer.length} bytes`);
    return buffer;

  } catch (error: any) {
    console.error(`[readDocxFromStorage] ❌ Error:`, error);
    throw new Error(`Error llegint DOCX: ${error.message}`);
  }
}

// Additional converter function for Phase 2 visual mapping
export async function convertDocxToHtml(buffer: Buffer): Promise<string> {
  try {
    // Basic HTML structure for now - will be enhanced in later phases
    return `
      <div>
        <p data-paragraph-id="p-1">Document content will be converted here.</p>
        <p data-paragraph-id="p-2">This is a placeholder for DOCX content.</p>
      </div>
    `
  } catch (error) {
    throw new Error("Failed to convert DOCX to HTML")
  }
}
