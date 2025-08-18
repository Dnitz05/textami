// lib/docxtemplater/parser.ts
// Parser per detectar variables en plantilles DOCX - SIMPLE

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { getDocxtemplaterOptions } from './config';

/**
 * Detecta les variables d'una plantilla DOCX
 * Retorna array de variables trobades: ['nom', 'data', 'import']
 */
export async function detectVariables(templateBuffer: Buffer): Promise<string[]> {
  if (!templateBuffer) {
    throw new Error('Cal proporcionar una plantilla');
  }
  
  try {
    console.log('[detectVariables] Analitzant plantilla...');
    
    // Carregar plantilla
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, getDocxtemplaterOptions());
    
    // Compilar primer per obtenir tags
    try {
      doc.compile();
    } catch (error) {
      // Ignorar errors de compilació per detectar variables
    }
    
    // Obtenir tags (variables) amb getFullText i parser regex
    const docZip = doc.getZip();
    const xml = docZip.files['word/document.xml'].asText();
    
    // Buscar variables {variable}
    const regex = /\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
      const variable = match[1].trim();
      if (variable && !variables.includes(variable)) {
        variables.push(variable);
      }
    }
    
    // Filtrar variables buides o de sistema
    const cleanVariables = variables.filter(variable => 
      variable && 
      variable.trim() !== '' &&
      !variable.startsWith('_') // Ignorem variables de sistema
    );
    
    console.log(`[detectVariables] ✅ Detectades ${cleanVariables.length} variables:`, cleanVariables);
    return cleanVariables;
    
  } catch (error: any) {
    console.error('[detectVariables] ❌ Error:', error);
    throw new Error(`Error detectant variables: ${error.message}`);
  }
}

/**
 * Valida que totes les variables requerides tenen dades
 */
export function validateVariableMapping(
  variables: string[], 
  data: Record<string, any>
): { isValid: boolean; missingVariables?: string[] } {
  
  const missingVariables = variables.filter(variable => 
    !(variable in data) || data[variable] === null || data[variable] === undefined
  );
  
  if (missingVariables.length > 0) {
    return { 
      isValid: false, 
      missingVariables 
    };
  }
  
  return { isValid: true };
}