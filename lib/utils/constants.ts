// lib/utils/constants.ts
// Totes les constants de Textami en UN sol lloc - Fàcil de mantenir

export const APP_INFO = {
  name: 'Textami',
  version: '0.1.0-mvp',
  author: 'Aitor Gilabert Juan',
  email: 'aitordelriu@gmail.com',
  copyright: '© 2025 Aitor Gilabert Juan'
};

export const FILE_LIMITS = {
  maxTemplateSize: 10 * 1024 * 1024,  // 10MB
  maxDataSize: 50 * 1024 * 1024,      // 50MB
  maxDocuments: 500,                   // Per batch
  allowedTemplates: ['.docx'],
  allowedData: ['.xlsx', '.xls', '.csv']
};

export const MESSAGES = {
  // Errors
  templateRequired: 'Cal pujar una plantilla',
  dataRequired: 'Cal pujar les dades',
  mappingRequired: 'Cal mapejar les columnes',
  
  // Èxits
  templateUploaded: 'Plantilla pujada correctament',
  dataUploaded: 'Dades carregades correctament',
  documentsGenerated: 'Documents generats!',
  
  // Info
  processing: 'Processant...',
  generating: 'Generant documents...'
};