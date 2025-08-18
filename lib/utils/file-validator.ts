// lib/utils/file-validator.ts
// Validador de fitxers SIMPLE i SEGUR

import { FILE_LIMITS } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida un fitxer de plantilla .docx
 */
export function validateTemplateFile(file: File): ValidationResult {
  // Verificar nom
  if (!file.name) {
    return { isValid: false, error: 'Nom de fitxer buit' };
  }

  // Verificar extensió
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FILE_LIMITS.allowedTemplates.includes(extension)) {
    return { isValid: false, error: 'Format no permès. Cal un .docx' };
  }

  // Verificar mida
  if (file.size > FILE_LIMITS.maxTemplateSize) {
    return { isValid: false, error: `Fitxer massa gran. Màxim ${FILE_LIMITS.maxTemplateSize / 1024 / 1024}MB` };
  }

  // Verificar mida mínima
  if (file.size < 1000) {
    return { isValid: false, error: 'Fitxer massa petit' };
  }

  return { isValid: true };
}

/**
 * Valida un fitxer de dades Excel/CSV
 */
export function validateDataFile(file: File): ValidationResult {
  // Verificar nom
  if (!file.name) {
    return { isValid: false, error: 'Nom de fitxer buit' };
  }

  // Verificar extensió
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FILE_LIMITS.allowedData.includes(extension)) {
    return { isValid: false, error: 'Format no permès. Cal .xlsx, .xls o .csv' };
  }

  // Verificar mida
  if (file.size > FILE_LIMITS.maxDataSize) {
    return { isValid: false, error: `Fitxer massa gran. Màxim ${FILE_LIMITS.maxDataSize / 1024 / 1024}MB` };
  }

  // Verificar mida mínima
  if (file.size < 100) {
    return { isValid: false, error: 'Fitxer massa petit' };
  }

  return { isValid: true };
}