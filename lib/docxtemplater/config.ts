// lib/docxtemplater/config.ts
// Configuració dels 4 mòduls premium de Docxtemplater

// Imports dels mòduls premium pagats (€1250)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HTMLModule = require('docxtemplater-html-module');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageModule = require('docxtemplater-image-module');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSXModule = require('docxtemplater-xlsx-module');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StylingModule = require('docxtemplater-style-module');

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

// Additional export needed for templateGenerator
export { createDocxtemplater } from "./config"


// Additional function for Phase 2 template generation
export function createDocxtemplater(buffer: Buffer): any {
  const zip = new (require("pizzip"))(buffer)
  return new (require("docxtemplater"))(zip, {
    paragraphLoop: true,
    linebreaks: true,
    modules: [
      new (require("docxtemplater-html-module"))({}),
      new (require("docxtemplater-image-module"))({ getImage: () => null, getSize: () => [200, 150] }),
      new (require("docxtemplater-style-module"))(),
      new (require("docxtemplater-xlsx-module"))()
    ]
  })
}
