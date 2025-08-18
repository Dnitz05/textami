// lib/docxtemplater/processor.ts
// Processador SIMPLE de documents amb Docxtemplater Premium

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { getDocxtemplaterOptions } from './config';

/**
 * Processa una plantilla amb dades
 * FUNCIONALITAT CORE del MVP - no complicar mai
 */
export async function processDocument(
  templateBuffer: Buffer,
  data: Record<string, any>
): Promise<Buffer> {
  
  // Validacions SIMPLES i CLARES
  if (!templateBuffer) {
    throw new Error('Cal proporcionar una plantilla');
  }
  
  if (!data) {
    throw new Error('Cal proporcionar dades');
  }
  
  try {
    console.log('[processDocument] Iniciant generació...');
    console.log('[processDocument] Dades rebudes:', Object.keys(data));
    
    // Carregar plantilla
    const zip = new PizZip(templateBuffer);
    
    // Configurar Docxtemplater amb mòduls premium
    const doc = new Docxtemplater(zip, getDocxtemplaterOptions());
    
    // Processar amb les dades
    doc.render(data);
    
    // Generar document final
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    console.log(`[processDocument] ✅ Document generat: ${buffer.length} bytes`);
    return buffer;
    
  } catch (error: any) {
    console.error('[processDocument] ❌ Error:', error);
    
    // Error més detallat per debug
    if (error.properties) {
      console.error('[processDocument] Detalls error:', {
        id: error.properties.id,
        tag: error.properties.tag,
        context: error.properties.context
      });
    }
    
    throw new Error(`Error generant document: ${error.message}`);
  }
}

/**
 * Processa múltiples documents (batch)
 * Per generar molts documents amb diferents dades
 */
export async function processMultipleDocuments(
  templateBuffer: Buffer,
  dataArray: Record<string, any>[]
): Promise<Buffer[]> {
  
  if (!templateBuffer) {
    throw new Error('Cal proporcionar una plantilla');
  }
  
  if (!dataArray || dataArray.length === 0) {
    throw new Error('Cal proporcionar dades per processar');
  }
  
  console.log(`[processMultipleDocuments] Generant ${dataArray.length} documents...`);
  
  const results: Buffer[] = [];
  
  for (let i = 0; i < dataArray.length; i++) {
    try {
      console.log(`[processMultipleDocuments] Processant document ${i + 1}/${dataArray.length}...`);
      
      const documentBuffer = await processDocument(templateBuffer, dataArray[i]);
      results.push(documentBuffer);
      
    } catch (error: any) {
      console.error(`[processMultipleDocuments] Error al document ${i + 1}:`, error);
      throw new Error(`Error al document ${i + 1}: ${error.message}`);
    }
  }
  
  console.log(`[processMultipleDocuments] ✅ Generats ${results.length} documents`);
  return results;
}