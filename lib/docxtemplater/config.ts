// lib/docxtemplater/config.ts
// Configuració dels 4 mòduls premium de Docxtemplater

// Imports dels mòduls premium pagats (€1250)
const HTMLModule = require('docxtemplater-html-module');
const ImageModule = require('docxtemplater-image-module');
const XLSXModule = require('docxtemplater-xlsx-module');
const StylingModule = require('docxtemplater-styling-module');

/**
 * Configuració dels mòduls premium de Docxtemplater
 * SIMPLE i CLARA - no complicar
 */
export function getDocxtemplaterModules() {
  return [
    new HTMLModule(),      // Per {>html} contingut ric
    new ImageModule({      // Per {%image} logos dinàmics
      getImage: (tag: string) => {
        // Les imatges vindran en base64
        return Buffer.from(tag, 'base64');
      },
      getSize: () => [100, 100] // Mida per defecte
    }),
    new XLSXModule(),      // Per generar Excel
    new StylingModule()    // Per estils dinàmics {text:color=red}
  ];
}

/**
 * Configuració base de Docxtemplater
 */
export function getDocxtemplaterOptions() {
  return {
    modules: getDocxtemplaterModules(),
    paragraphLoop: true,    // Suport per loops
    linebreaks: true,       // Suport salts de línia
    errorLogging: false     // MVP: no logs d'error complexos
  };
}