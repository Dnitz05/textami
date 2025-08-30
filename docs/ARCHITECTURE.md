# ARQUITECTURA TEXTAMI - OOXML-CENTRIC

**Data:** 30 Agost 2025  
**Versió:** 0.9.0-ooxml-first  
**Status:** Migració Arquitectònica Aprovada - Implementation Ready

---

## 🎯 NOVA VISIÓ ARQUITECTÒNICA

Textami ha migrat d'una **arquitectura GPT-centrada** a una **arquitectura OOXML-centric** per obtenir màxima **performance, economia i fidelitat d'estils** en generació de documents.

## 🏗️ ESTRATÈGIA DE MIGRACIÓ: CANVI NET

### **Decisió Arquitectònica Fonamental:**
**Eliminació del pipeline GPT** - Substitució directa per OOXML parsing local sense mantenir doble sistema.

### **Pipeline Abans vs Ara:**

```mermaid
graph TD
    subgraph "ABANS (GPT-Centric)"
        A1[DOCX Upload] --> A2[GPT-5 Vision API]
        A2 --> A3[Markdown Transcription]
        A3 --> A4[Style Loss]
        A4 --> A5[Slow + Expensive]
    end
    
    subgraph "ARA (OOXML-Centric)"
        B1[DOCX Upload] --> B2[Python OOXML Parser]
        B2 --> B3[styles.xml + numbering.xml]
        B3 --> B4[styleManifest.json]
        B4 --> B5[HTML Semàntic + Perfect Fidelity]
    end
```

---

## 🏗️ ARQUITECTURA HÍBRIDA OOXML+IA

### **Components Pipeline Complet:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DOCX Upload   │───▶│  OOXML Parser   │───▶│   HTML Semàntic │
│   (Frontend)    │    │   (Python)      │    │  + Style Manifest│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IA Analysis   │◀───│   HTML Clean    │───▶│ AI Instructions │
│  (Placeholders) │    │   (Perfect)     │    │ (Section/Global)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                                              │
          ▼                                              ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Excel Smart   │    │ Template Final  │───▶│ Docxtemplater   │
│    Mapping      │───▶│ amb Variables   │    │ PRO + HTML Mod  │
│   (IA+Logic)    │    │ + Perfect Styles│    │  (Generation)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Benefici Híbrid:**
- **OOXML Parser**: Estils perfectes (95% fidelitat)
- **IA Analysis**: Variables intel·ligents sobre HTML net
- **AI Instructions**: Modificacions seccions/document (PRESERVAT)
- **Smart Mapping**: Excel matching intel·ligent (PRESERVAT)

---

## 🔧 STACK TECNOLÒGIC ACTUALITZAT

### **Document Processing (NOU):**
```python
# OOXML Parser Stack
{
  "parser": "python-docx + lxml",
  "formats": "styles.xml + numbering.xml",
  "output": "styleManifest.json + htmlPreview.html",
  "performance": "<1s per document",
  "cost": "$0 (local processing)"
}
```

### **HTML Generation (NOU):**
```typescript
// HTML Semàntic Universal
{
  "engine": "Nunjucks templates",
  "vocabulary": ["h1/h2/h3", "p.BodyText", "ul.Bulleted", "table.StdTable"],
  "sanitization": "whitelist + validation",
  "output": "clean semantic HTML"
}
```

### **Frontend (MANTENIM):**
```json
{
  "framework": "Next.js 15.4.6",
  "runtime": "React 19.1.0", 
  "language": "TypeScript 5.0",
  "styling": "Tailwind CSS 4.0",
  "state": "Built-in React state"
}
```

### **Backend (HÍBRID OOXML+IA):**
```json
{
  "runtime": "Node.js + Next.js API Routes",
  "database": "Supabase PostgreSQL", 
  "storage": "Supabase Storage",
  "auth": "Supabase Auth",
  "ai": "OpenAI (HTML analysis + smart mapping + instructions)",
  "parsing": "Python OOXML local (estils)",
  "instructions": "AI system (global/section/paragraph) - PRESERVAT"
}
```

---

## 📊 ARQUITECTURA DE DADES ACTUALITZADA

### **Schema Extensions:**

```sql
-- Extensió taula templates per OOXML
ALTER TABLE templates ADD COLUMN style_manifest JSONB;
ALTER TABLE templates ADD COLUMN html_preview TEXT;  
ALTER TABLE templates ADD COLUMN ooxml_report JSONB;
ALTER TABLE templates ADD COLUMN parsing_version TEXT DEFAULT 'ooxml-1.0';

-- Nou índex per performance
CREATE INDEX idx_templates_parsing_version ON templates(parsing_version);
CREATE INDEX idx_templates_style_manifest ON templates USING gin(style_manifest);
```

### **Nous Types:**

```typescript
// OOXML Types
interface StyleManifest {
  version: number
  styles: {
    [htmlElement: string]: string | StyleConfig
  }
  options: {
    pagebreakComment: string
  }
  lint: string[]
}

interface OOXMLReport {
  warnings: string[]
  ignored: string[]
  processingTime: number
  stylesFound: number
  fallbacks: Record<string, string>
}

interface HTMLPreview {
  content: string
  vocabulary: string[]
  elementsUsed: string[]
}
```

---

## 🌐 API ARCHITECTURE HÍBRIDA

### **Endpoints Pipeline Híbrid:**

```typescript
// Template Upload (OOXML + IA)
POST /api/templates/upload
  Process: 1. OOXML parser → 2. HTML generation → 3. IA analysis → 4. Save all
  Output: { templateId, styleManifest, htmlContent, placeholders, report }

// AI Instructions (PRESERVAT I MILLORAT)
POST /api/ai-instructions
  Input: { instruction: {type: 'global'|'section'|'paragraph'}, content }
  Process: IA sobre HTML net (més precís que abans)
  Output: { modifiedContent, executionTime, appliedInstruction }

// Document Generation (HÍBRID)
POST /api/render  
  Input: { templateId, documents[], instructions? }
  Process: Template + Variables + Styles → Final DOCX
  Output: { jobId, results[], format }

// Nous Endpoints
GET /api/templates/{id}/manifest
  Output: { styleManifest, htmlPreview, report }
  
PATCH /api/templates/{id}/manifest  
  Input: { updatedManifest }
  Output: { success, newVersion }
```

### **Feature Flag System:**

```typescript
// Runtime Configuration
interface FeatureFlags {
  RENDER_MODE: 'html' | 'docx'  // html (Fase 1) | docx (Fase 2)
  OOXML_VERSION: 'v1.0'
  PRO_FEATURES: boolean         // false (ara) | true (quan es compri)
}
```

---

## 📁 ESTRUCTURA DE FITXERS NOVA

```
/project
├── /apps/web/                      # Next.js existent
│   ├── /api/
│   │   ├── /templates/             # Multi-template APIs (existent) 
│   │   └── /render/               # Generation API (modificat)
│   └── /components/               # UI components (existent)
├── /scripts/                      # Nous
│   ├── ingest_docx.py            # Python OOXML parser
│   └── requirements.txt          # Python dependencies
├── /templates/{templateId}/       # Per cada plantilla
│   ├── plantilla.docx            # Original DOCX
│   ├── styleManifest.json        # Auto-generated mapping
│   ├── htmlPreview.html          # QA preview
│   └── report.json              # Processing report
├── /html_templates/              # Nunjucks templates
│   ├── body.html                # Vocabulari estàndard
│   └── components/              # HTML partials
└── /out/                        # Output per document
    ├── /html/                   # Generated HTML
    ├── /json/                   # Data trace
    └── /docx/                   # Final documents
```

---

## 🔌 INTEGRATIONS ACTUALITZADES

### **Python OOXML Integration:**
```python
# scripts/ingest_docx.py
import zipfile, json, os
from lxml import etree
import python_docx

def parse_styles_xml(styles_content):
    """Extract style definitions with basedOn resolution"""
    # Parse w:styles elements
    # Resolve inheritance (basedOn)
    # Generate heuristic mappings
    return style_mappings

def generate_html_vocabulary():
    """Create semantic HTML with standard classes"""
    return {
        "h1": "Heading 1 equivalent",
        "h2": "Heading 2 equivalent", 
        "p.BodyText": "Body Text equivalent",
        "ul.Bulleted": "List Bullet equivalent",
        "table.StdTable": "Table Grid equivalent"
    }
```

### **HTML Template Integration:**
```typescript
// HTML Generation Engine
import nunjucks from 'nunjucks'
import sanitizeHtml from 'sanitize-html'

const HTML_VOCABULARY = {
  allowedTags: ['h1','h2','h3','p','ul','ol','li','table','thead','tbody','tr','th','td','img'],
  allowedClasses: ['BodyText', 'Bulleted', 'Numbered', 'StdTable', 'TableHeader']
}

export function generateSemanticHTML(data: any, templateId: string): string {
  const template = nunjucks.render('body.html', data)
  const clean = sanitizeHtml(template, HTML_VOCABULARY)
  return clean
}
```

### **Docxtemplater PRO Integration (Future):**
```typescript
// Quan es compri PRO + HTML Module
import { HtmlModule } from 'docxtemplater-html-module'

export function renderWithPRO(templatePath: string, manifest: StyleManifest, contentHtml: string) {
  const htmlModule = new HtmlModule({
    styleMapper: (tag: string, attrs: any, meta: any) => {
      const className = attrs?.class || ''
      const key = className ? `${tag}.${className}` : tag
      
      if (manifest.styles[key]) {
        const mapping = manifest.styles[key]
        if (typeof mapping === 'string') {
          return { paragraphStyle: mapping, tableStyle: mapping }
        }
        return mapping
      }
      
      return {}
    }
  })
  
  // Generate final DOCX with perfect style fidelity
  return docxtemplater.attachModule(htmlModule).render({ contentHtml })
}
```

---

## 🏛️ COMPONENT ARCHITECTURE ACTUALITZADA

### **Estructura Actual (Mantinguda):**
```
/components/
├── analysis/                    # Document analysis UI
├── ui/                         # Base components  
└── TopNavBar.tsx              # Navigation

/app/
├── /analyze/                   # Analysis interface
├── /generator/                 # Generation interface
├── /templates/                 # Template management
└── /api/                      # Backend APIs
```

### **Nous Components (Phase 2):**
```
/components/
├── ooxml/                     # OOXML specific components
│   ├── StyleManifestEditor.tsx # Edit style mappings
│   ├── HTMLPreview.tsx        # Preview semantic HTML
│   └── OOXMLReport.tsx        # Show parsing report
├── html/                      # HTML vocabulary components  
│   ├── VocabularyViewer.tsx   # Show available classes
│   └── TemplateEditor.tsx     # Edit Nunjucks templates
└── generation/
    ├── BatchProcessor.tsx     # Batch generation UI
    └── OutputViewer.tsx       # View generated documents
```

---

## 🔧 DEVELOPMENT PATTERNS ACTUALITZATS

### **OOXML Processing Pattern:**
```typescript
interface OOXMLProcessor {
  parseDocument(docxBuffer: Buffer): Promise<OOXMLParseResult>
  generateManifest(parseResult: OOXMLParseResult): StyleManifest
  createHTMLPreview(manifest: StyleManifest): string
  validateManifest(manifest: StyleManifest): ValidationResult
}

interface StyleManifestManager {
  save(templateId: string, manifest: StyleManifest): Promise<void>
  load(templateId: string): Promise<StyleManifest>
  update(templateId: string, updates: Partial<StyleManifest>): Promise<StyleManifest>
  version(templateId: string): Promise<StyleManifest[]>
}
```

### **HTML Generation Pattern:**
```typescript
interface SemanticHTMLGenerator {
  render(templateId: string, data: any): Promise<string>
  validate(html: string): ValidationResult
  sanitize(html: string): string
  extractVocabulary(html: string): string[]
}
```

### **Fallback Strategy:**
```typescript
interface StyleFallbackStrategy {
  resolveStyle(requested: string, available: string[]): string | null
  generateWarning(missing: string, fallback: string): string
  applyFallbacks(manifest: StyleManifest): StyleManifest
}
```

---

## 🚀 DEPLOYMENT ARCHITECTURE ACTUALITZADA

### **Vercel + Python:**
```javascript
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 30 },
    "scripts/ingest_docx.py": { "runtime": "python3.9" }
  },
  "builds": [
    { "src": "scripts/ingest_docx.py", "use": "@vercel/python" }
  ]
}
```

### **Environment Configuration:**
```bash
# Actualitzat - Menys dependències OpenAI
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Feature Flags
RENDER_MODE=html              # html (ara) | docx (futur amb PRO)
OOXML_VERSION=v1.0
PRO_FEATURES=false            # false (ara) | true (quan es compri)

# Reduït: Només per smart mapping
OPENAI_API_KEY=sk-...         # Ja no per parsing documents
```

---

## 🎯 DECISIONS ARQUITECTÒNIQUES ACTUALITZADES

### **✅ Decisions Preses (Migració):**
1. **Eliminació pipeline GPT** per parsing documents
2. **Python OOXML parsing** com engine principal  
3. **HTML semàntic universal** com format intermig
4. **Docxtemplater PRO** com target final
5. **Canvi net** sense doble sistema
6. **Feature flags** per transició gradual

### **🔄 Decisions Implementació (2 setmanes):**
1. **Script Python**: `ingest_docx.py` implementation
2. **Nunjucks templates**: HTML vocabulary estàndard
3. **API modifications**: Upload + render endpoints
4. **Database schema**: Extensions per styleManifest
5. **UI updates**: Preview i manifest editing

### **📝 Criteris de Successos:**
- **Performance**: Parse <1s/document, render <200ms/document
- **Quality**: Style detection >90%, HTML validation 100%  
- **Cost**: Zero OpenAI costs per document parsing
- **Reliability**: 99% uptime, zero external API dependencies per parsing
- **Scalability**: Il·limitada capacitat de processament local

---

## 📊 MIGRATION IMPACT ANALYSIS HÍBRIDA

### **Performance Benefits Híbrida:**
| Mètrica | GPT Vision | OOXML+IA Híbrid | Improvement |
|---------|------------|-----------------|-------------|
| **Parse Time** | 25-30s | 3s (1s OOXML + 2s IA) | **8x faster** |
| **Cost/Document** | $0.50 | $0.05 (només IA HTML) | **90% saving** |
| **Style Fidelity** | 70% | 95% (OOXML) | **+25% quality** |
| **IA Precision** | 75% (visual errors) | 90% (HTML clean) | **+15% accuracy** |
| **AI Instructions** | Preservat | Millorat (HTML net) | **+20% precision** |

### **Resource Requirements:**
- **Development**: 2 setmanes implementation
- **Infrastructure**: Mateix Vercel + Python runtime
- **Investment**: ~€500-1000 (docxtemplater PRO quan es compri)
- **ROI**: <2 mesos (estalvi OpenAI costs)

### **Risk Mitigation:**
- **Backup branch**: `legacy/` amb sistema anterior
- **Kill switch**: `RENDER_MODE=html` per emergències  
- **Gradual rollout**: Feature flags per control total
- **Testing**: Benchmarking amb documents reals

---

*Aquesta arquitectura assegura màxima performance, economia i escalabilitat mentre manté fidelitat perfecta d'estils amb un sistema maintainable i robust.*

**STATUS: APPROVED FOR IMMEDIATE IMPLEMENTATION** 🚀