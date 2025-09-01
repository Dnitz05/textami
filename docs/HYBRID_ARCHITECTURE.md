# ARQUITECTURA HÍBRIDA UNIVERSAL: DOCX + GOOGLE DOCS

**Data:** 1 Setembre 2025  
**Status:** Decisió Arquitectònica Aprovada  
**Versió:** 1.0-hybrid-universal

---

## 🎯 NOVA VISIÓ: COMPATIBILITAT UNIVERSAL

Textami evoluciona cap a una **arquitectura híbrida universal** que suporta múltiples fonts de documents i dades, maximitzant l'abast de mercat mentre reutilitza 90% del codi existent.

### **Principi Fonamental:**
> **Mateixa UI, múltiples backends** - L'usuari veu la mateixa interfície però pot treballar amb DOCX/Excel o Google Docs/Sheets segons preferència.

---

## 🏗️ ARQUITECTURA HÍBRIDA

### **Pipeline Universal:**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Template  │    │   Structure │    │    HTML     │
│   Sources   │───▶│  Extraction │───▶│   Preview   │
│ DOCX/Google │    │   (Unified) │    │ (Universal) │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Output    │◀───│   Variable  │◀───│    Data     │
│ DOCX/Google │    │   Mapping   │    │   Sources   │
│    Docs     │    │ (Universal) │    │ Excel/Sheets│
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 📊 COMPONENT MAPPING

### **1. Template Input (Nou Selector):**
```typescript
// components/TemplateSourceSelector.tsx
interface TemplateSourceOption {
  type: 'docx' | 'google-docs';
  title: string;
  description: string;
  icon: string;
  handler: () => void;
}

export function TemplateSourceSelector({ onTemplateCreated }: Props) {
  const options: TemplateSourceOption[] = [
    {
      type: 'docx',
      title: 'Document Word',
      description: 'Puja un fitxer .docx des del teu ordinador',
      icon: '📄',
      handler: () => handleDocxUpload()
    },
    {
      type: 'google-docs', 
      title: 'Google Doc',
      description: 'Importa des de Google Drive',
      icon: '📝',
      handler: () => handleGoogleDocImport()
    }
  ];
  
  return (
    <div className="template-source-selector">
      <h3>Escull el tipus de plantilla:</h3>
      <div className="options-grid">
        {options.map(option => (
          <SourceOptionCard key={option.type} option={option} />
        ))}
      </div>
    </div>
  );
}
```

### **2. Data Source (Modificació ExcelMappingPanel):**
```typescript
// components/analysis/DataMappingPanel.tsx (RENAME)
export function DataMappingPanel({ analysisData, onMappingComplete }: Props) {
  const [dataSourceType, setDataSourceType] = useState<'excel' | 'sheets' | null>(null);
  
  // Selector de font de dades
  if (!dataSourceType) {
    return (
      <Card className="data-source-selector">
        <h3>Afegir dades per generació massiva</h3>
        <div className="data-source-options">
          <Button onClick={() => setDataSourceType('excel')}>
            <span className="icon">📊</span>
            Pujar Excel
          </Button>
          <Button onClick={() => setDataSourceType('sheets')}>
            <span className="icon">📋</span>
            Connectar Google Sheets
          </Button>
        </div>
      </Card>
    );
  }
  
  // Interfície de mapping (reutilitza existent)
  return (
    <div className="data-mapping-interface">
      {dataSourceType === 'excel' ? (
        <ExcelMappingInterface 
          analysisData={analysisData}
          onMappingComplete={onMappingComplete}
        />
      ) : (
        <GoogleSheetsMappingInterface 
          analysisData={analysisData}
          onMappingComplete={onMappingComplete}
        />
      )}
    </div>
  );
}
```

---

## ⚙️ BACKEND ADAPTERS

### **Source Adapters (Nou layer):**
```typescript
// lib/sources/source-adapter.ts
export interface UniversalAnalysisData extends AnalysisData {
  sourceType: 'docx' | 'google-docs';
  sourceId: string;
  sourceMetadata?: {
    originalUrl?: string;
    permissions?: string[];
    lastModified?: string;
  };
}

// lib/sources/docx-source.ts
export async function analyzeDocxSource(file: File): Promise<UniversalAnalysisData> {
  // Existing OOXML logic - NO CHANGES
  const analysis = await analyzeDocxFile(file);
  
  return {
    ...analysis,
    sourceType: 'docx',
    sourceId: analysis.templateId,
    sourceMetadata: {
      originalUrl: file.name,
      lastModified: new Date(file.lastModified).toISOString()
    }
  };
}

// lib/sources/google-docs-source.ts
export async function analyzeGoogleDocsSource(docId: string): Promise<UniversalAnalysisData> {
  // 1. Export Google Doc to HTML
  const htmlContent = await driveAPI.files.export({
    fileId: docId,
    mimeType: 'text/html'
  });
  
  // 2. Parse HTML structure (simpler than OOXML!)
  const sections = parseHTMLSections(htmlContent.data);
  const tables = parseHTMLTables(htmlContent.data);
  
  // 3. AI variable detection (same as current system)
  const placeholders = await detectVariablesWithGemini(htmlContent.data);
  
  return {
    templateId: generateId(),
    title: extractHTMLTitle(htmlContent.data),
    markdown: htmlContent.data, // Direct HTML
    sections,
    tables,
    tags: [], // Legacy compatibility
    placeholders,
    sourceType: 'google-docs',
    sourceId: docId,
    sourceMetadata: {
      originalUrl: `https://docs.google.com/document/d/${docId}`,
      permissions: await getDocPermissions(docId)
    }
  };
}
```

### **Data Adapters:**
```typescript
// lib/data-sources/excel-adapter.ts
export async function parseExcelData(file: File): Promise<DataSourceResult> {
  // Existing logic - NO CHANGES
  return {
    type: 'excel',
    headers: extractedHeaders,
    data: extractedRows,
    sourceMetadata: { fileName: file.name }
  };
}

// lib/data-sources/sheets-adapter.ts  
export async function parseGoogleSheetsData(sheetId: string, range?: string): Promise<DataSourceResult> {
  const response = await sheetsAPI.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: range || 'A:Z' // Get all data
  });
  
  const [headers, ...rows] = response.data.values || [];
  
  return {
    type: 'sheets',
    headers,
    data: rows.map(row => {
      const rowData: Record<string, any> = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });
      return rowData;
    }),
    sourceMetadata: { 
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
      range
    }
  };
}
```

---

## 🚀 GENERATION ENGINE

### **Universal Generator:**
```typescript
// lib/generators/universal-generator.ts
export async function generateDocuments({
  template,
  dataSource,
  mappings,
  outputFormat
}: UniversalGenerationParams): Promise<GenerationResult[]> {
  
  const results: GenerationResult[] = [];
  
  for (const rowData of dataSource.data) {
    let generatedDoc;
    
    // Decide output format based on template source or user preference
    if (outputFormat === 'google-docs' || template.sourceType === 'google-docs') {
      generatedDoc = await generateGoogleDoc(template, rowData, mappings);
    } else {
      generatedDoc = await generateDocxFile(template, rowData, mappings);
    }
    
    results.push(generatedDoc);
  }
  
  return results;
}

async function generateGoogleDoc(
  template: UniversalAnalysisData, 
  data: Record<string, any>, 
  mappings: Record<string, string>
): Promise<GenerationResult> {
  
  // 1. Process template HTML with variables (simple!)
  let processedHTML = template.markdown; // Already HTML from Google Docs
  
  // 2. Replace variables
  for (const placeholder of template.placeholders || []) {
    const value = data[mappings[placeholder.variable]] || placeholder.variable;
    processedHTML = processedHTML.replace(
      new RegExp(`{{${placeholder.variable}}}`, 'g'),
      String(value)
    );
  }
  
  // 3. Create new Google Doc from processed HTML
  const response = await driveAPI.files.create({
    requestBody: { 
      name: `${template.title} - ${data[mappings['nom']] || 'Generated'}`,
      mimeType: 'application/vnd.google-apps.document'
    },
    media: {
      mimeType: 'text/html',
      body: processedHTML
    }
  });
  
  return {
    documentId: response.data.id!,
    documentUrl: `https://docs.google.com/document/d/${response.data.id}`,
    documentName: response.data.name!,
    sourceData: data,
    generatedAt: new Date(),
    format: 'google-docs'
  };
}
```

---

## 📱 UI MODIFICATIONS (MINIMAL)

### **1. Dashboard "Nova Plantilla" Button:**
```typescript
// app/dashboard/page.tsx - Only change the button behavior
<Button 
  onClick={() => setShowTemplateSourceModal(true)}
  className="new-template-btn"
>
  + Nova Plantilla
</Button>

{showTemplateSourceModal && (
  <TemplateSourceSelector 
    onSourceSelected={handleTemplateSourceSelection}
    onClose={() => setShowTemplateSourceModal(false)}
  />
)}
```

### **2. Analysis Interface - Add source badge:**
```typescript
// components/AIAnalysisInterface.tsx - Add source indicator
<div className="analysis-header">
  <h2>{analysisData.title}</h2>
  <span className="source-badge">
    {analysisData.sourceType === 'docx' ? '📄 Word' : '📝 Google'}
  </span>
</div>

// Rest of interface UNCHANGED
<DocumentPreviewPanel {...props} />
<DataMappingPanel {...props} />  // Renamed from ExcelMappingPanel
<AIPromptsPanel {...props} />
```

### **3. Generation Results:**
```typescript
// Show appropriate links based on output format
{result.format === 'google-docs' ? (
  <a href={result.documentUrl} target="_blank">
    📝 Obrir a Google Docs
  </a>
) : (
  <a href={result.downloadUrl}>
    📄 Descarregar DOCX
  </a>
)}
```

---

## 💾 DATABASE EXTENSIONS

### **Schema Updates:**
```sql
-- Extend existing templates table
ALTER TABLE templates 
ADD COLUMN source_type TEXT CHECK (source_type IN ('docx', 'google-docs')) DEFAULT 'docx',
ADD COLUMN source_id TEXT,
ADD COLUMN source_metadata JSONB;

-- Extend generations table
ALTER TABLE generations
ADD COLUMN output_format TEXT CHECK (output_format IN ('docx', 'google-docs', 'pdf')) DEFAULT 'docx';

-- Create index for new fields
CREATE INDEX idx_templates_source_type ON templates(source_type);
CREATE INDEX idx_generations_output_format ON generations(output_format);
```

---

## 🔧 DEVELOPMENT ROADMAP

### **Phase 1: Google Docs Input (1-2 setmanes)**
- ✅ Google Docs API integration
- ✅ HTML extraction and parsing  
- ✅ TemplateSourceSelector component
- ✅ Google Docs source adapter
- ✅ Update existing upload flow

### **Phase 2: Google Sheets Integration (1 setmana)**
- ✅ Google Sheets API integration
- ✅ GoogleSheetsMappingInterface component  
- ✅ Data source selector in mapping panel
- ✅ Sheets data adapter

### **Phase 3: Universal Generation (1 setmana)**
- ✅ Google Docs output generation
- ✅ Universal generator logic
- ✅ Output format selection
- ✅ Results display updates

### **Phase 4: Polish & Testing (1 setmana)**
- ✅ Error handling for Google APIs
- ✅ Rate limiting and quotas
- ✅ User permissions management  
- ✅ Comprehensive testing

---

## 💰 COST-BENEFIT ANALYSIS

### **Development Effort:**
- **New Code:** ~30% (adapters, selectors, Google APIs)
- **Reused Code:** ~70% (UI, logic, types, database)
- **Timeline:** 4-5 setmanes vs 12+ setmanes from scratch
- **Cost:** €20-25K vs €60K+ new system

### **Market Expansion:**
- **Current:** DOCX users (Enterprise heavy)
- **New:** Google Docs users (Startups, Education, SMB)
- **Total Addressable Market:** 2x-3x larger
- **User Acquisition:** 2 channels instead of 1

### **Technical Benefits:**
- **Simplicity:** Google Docs API is 10x simpler than OOXML
- **Reliability:** Less XML parsing edge cases
- **Performance:** HTML round-trip is faster
- **Maintenance:** Fewer dependencies and complexity

---

## 🎯 STRATEGIC ADVANTAGES

### **1. Universal Compatibility:**
- **Enterprise users:** Continue with DOCX workflow
- **Modern users:** Prefer Google Docs simplicity
- **Mixed teams:** Can use both in same organization

### **2. Competitive Differentiation:**
- **vs DOCX-only tools:** "We support Google Docs too"
- **vs Google-only tools:** "We support professional DOCX too"
- **vs Generic tools:** "Specialized for both ecosystems"

### **3. Risk Mitigation:**
- **Google API changes:** Still have DOCX fallback
- **Microsoft dependency:** Still have Google fallback
- **Market shifts:** Covered in both directions

---

## 🔄 IMPLEMENTATION STRATEGY

### **Backward Compatibility:**
- **Existing users:** Zero impact, same interface
- **Existing templates:** Continue working as before
- **Existing API:** No breaking changes

### **Forward Compatibility:**
- **New features:** Built for both sources
- **UI components:** Universal design patterns
- **Database:** Extensible schema for future sources

### **Migration Path:**
- **Phase 1:** Add Google options alongside existing
- **Phase 2:** A/B test user preferences
- **Phase 3:** Optimize based on usage patterns

---

## 📋 SUCCESS METRICS

### **Technical KPIs:**
- **Source Coverage:** >90% of templates work in both formats
- **Performance:** <3s analysis time for both sources
- **Accuracy:** >95% variable detection in both
- **Reliability:** >99% successful generations

### **Business KPIs:**
- **User Growth:** 2x growth rate with dual compatibility
- **Market Expansion:** 40% Google Docs users, 60% DOCX users
- **Customer Satisfaction:** >4.5/5 rating for both flows
- **Revenue:** 50% increase from market expansion

---

## 🔮 FUTURE EXPANSIONS

### **Additional Sources (Phase 5):**
- **Notion pages** → Same AnalysisData interface
- **Markdown files** → Same conversion pattern
- **PDF templates** → OCR + structure detection

### **Additional Outputs (Phase 6):**
- **PDF generation** with full formatting
- **PowerPoint** for presentation templates
- **HTML websites** for web publishing

---

**CONCLUSIÓ:** L'arquitectura híbrida universal proporciona màxima flexibilitat, creixement de mercat i reutilització de codi mentre manté simplicitat d'implementació i experiència d'usuari consistent.

**STATUS: READY FOR IMPLEMENTATION** 🚀