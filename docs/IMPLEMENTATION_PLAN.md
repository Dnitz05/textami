# PLA COMPLET IMPLEMENTACIÓ HÍBRIDA GOOGLE DOCS
**Data:** 1 Setembre 2025  
**Objectiu:** Sistema Textami completament funcional amb Google Docs + Sheets  
**Timeline:** 4-5 setmanes (20-25 dies de desenvolupament)

---

## 🎯 OBJECTIU FINAL
Sistema que permeti:
1. **Upload Google Doc** → HTML fidedigne
2. **Mapping Google Sheets** intel·ligent amb IA
3. **Instruccions IA** (globals, seccions, paràgrafs, cel·les taules)  
4. **Generació massiva** → Google Docs resultants en carpeta Drive

---

# 📋 FASE 1: GOOGLE APIS + AUTENTICACIÓ (5-6 dies)

## 1.1 Setup Google Cloud Project (1 dia)
### Subtasques:
- [ ] **1.1.1** Crear Google Cloud Project per Textami
- [ ] **1.1.2** Activar APIs necessàries:
  - Google Drive API v3
  - Google Docs API v1  
  - Google Sheets API v4
  - Google OAuth2 API
- [ ] **1.1.3** Crear Service Account amb permisos adequats
- [ ] **1.1.4** Generar i descarregar credencials JSON
- [ ] **1.1.5** Configurar OAuth2 consent screen
- [ ] **1.1.6** Definir scopes necessaris:
  ```
  https://www.googleapis.com/auth/drive
  https://www.googleapis.com/auth/documents
  https://www.googleapis.com/auth/spreadsheets
  ```

## 1.2 Integració Google Auth (2 dies)
### Subtasques:
- [ ] **1.2.1** Instal·lar dependencies:
  ```bash
  npm install googleapis @google-cloud/storage google-auth-library
  ```
- [ ] **1.2.2** Crear `lib/google/auth.ts`:
  - Setup OAuth2 client
  - Token refresh logic
  - Error handling per permisos
- [ ] **1.2.3** Crear `lib/google/drive-client.ts`:
  - Initialize Drive API client
  - File access methods
  - Permission checking
- [ ] **1.2.4** Implementar middleware d'autenticació Google
- [ ] **1.2.5** Crear component `GoogleAuthButton.tsx`
- [ ] **1.2.6** Gestió tokens a Supabase:
  ```sql
  ALTER TABLE profiles ADD COLUMN google_tokens JSONB;
  ALTER TABLE profiles ADD COLUMN google_refresh_token TEXT;
  ```

## 1.3 Google Drive Integration (2 dies)
### Subtasques:
- [ ] **1.3.1** Crear `lib/google/drive-service.ts`:
  - `listFiles()` - llistar docs/sheets
  - `getFileMetadata()` - info document
  - `checkPermissions()` - verificar accés
  - `createFolder()` - carpetes resultats
- [ ] **1.3.2** Crear `components/google/DriveFilePicker.tsx`:
  - UI per seleccionar Google Docs
  - Preview document metadata
  - Validació permisos
- [ ] **1.3.3** Implementar rate limiting per Google APIs
- [ ] **1.3.4** Error handling per:
  - Documents privats
  - Permisos insuficients
  - API quotas exceeded
- [ ] **1.3.5** Testing amb documents reals

---

# 📋 FASE 2: GOOGLE DOCS PROCESSING (6-7 dies)

## 2.1 Google Docs Export + Parse (3 dies)
### Subtasques:
- [ ] **2.1.1** Crear `lib/google/docs-service.ts`:
  - `exportToHTML()` - export document HTML
  - `getDocumentStructure()` - metadata extraction
  - `parseDocumentContent()` - structure analysis
- [ ] **2.1.2** Implementar HTML cleaning pipeline:
  - Remove Google Docs CSS noise
  - Preserve semantic structure
  - Clean inline styles
- [ ] **2.1.3** Crear parser HTML fidedigne:
  ```typescript
  interface GoogleDocsParser {
    parseHeadings(): HeadingElement[]
    parseParagraphs(): ParagraphElement[]
    parseTables(): TableElement[]
    parseImages(): ImageElement[]
    extractStyles(): StyleInfo
  }
  ```
- [ ] **2.1.4** Mapping estils Google Docs → HTML semàntic:
  - h1, h2, h3 detection
  - Paragraph styles
  - Table formatting
  - Bold, italic, underline preservation

## 2.2 Structure Analysis amb IA (2 dies)
### Subtasques:
- [ ] **2.2.1** Adaptar IA analysis per HTML Google Docs:
  - Modificar prompts per HTML input
  - Mantenir placeholder detection
  - Millorar accuracy amb HTML net
- [ ] **2.2.2** Crear `lib/ai/gemini-analyzer.ts`:
  - Setup Gemini API client
  - HTML-specific prompts
  - Variable detection optimitzat
- [ ] **2.2.3** Implementar confidence scoring per HTML
- [ ] **2.2.4** Testing comparison Gemini vs OpenAI accuracy

## 2.3 Template Source Selector (1-2 dies)
### Subtasques:
- [ ] **2.3.1** Crear `components/TemplateSourceSelector.tsx`:
  - Modal amb opcions DOCX vs Google Docs
  - Icons i descriptions
  - Handler per cada opció
- [ ] **2.3.2** Modificar dashboard per mostrar selector:
  ```typescript
  // app/dashboard/page.tsx
  const [showSourceModal, setShowSourceModal] = useState(false)
  ```
- [ ] **2.3.3** Integrar amb flow existent upload DOCX
- [ ] **2.3.4** Crear `components/google/GoogleDocUploader.tsx`:
  - Drive file picker integration
  - Document preview
  - Upload progress tracking
- [ ] **2.3.5** Update navigation i breadcrumbs

---

# 📋 FASE 3: GOOGLE SHEETS INTEGRATION (4-5 dies)

## 3.1 Google Sheets API Integration (2 dies)
### Subtasques:
- [ ] **3.1.1** Crear `lib/google/sheets-service.ts`:
  - `getSpreadsheetData()` - read sheet data
  - `getSheetMetadata()` - sheet info
  - `parseHeaders()` - column detection
  - `parseRows()` - data extraction
- [ ] **3.1.2** Implementar data validation:
  - Empty cells handling
  - Data type detection
  - Error rows identification
- [ ] **3.1.3** Crear cache system per sheets data:
  ```typescript
  interface SheetsCache {
    spreadsheetId: string
    data: SheetData[]
    lastUpdated: Date
    ttl: number
  }
  ```

## 3.2 Data Source Selector (1-2 dies)
### Subtasques:
- [ ] **3.2.1** Modificar `components/analysis/ExcelMappingPanel.tsx` → `DataMappingPanel.tsx`:
  - Afegir selector Excel vs Sheets
  - Mantenir interfície mapping existent
  - Reutilitzar lògica AI matching
- [ ] **3.2.2** Crear `components/google/GoogleSheetsSelector.tsx`:
  - Spreadsheet picker
  - Sheet tabs selection
  - Range specification (A1:Z100)
- [ ] **3.2.3** Implementar data preview per Sheets:
  - Sample rows display
  - Column headers detection
  - Data quality indicators

## 3.3 Universal Data Mapping (1-2 dies)
### Subtasques:
- [ ] **3.3.1** Crear interfície unificada:
  ```typescript
  interface UniversalDataSource {
    type: 'excel' | 'sheets'
    headers: string[]
    data: Record<string, any>[]
    metadata: DataSourceMetadata
  }
  ```
- [ ] **3.3.2** Adaptar AI mapping logic per Sheets
- [ ] **3.3.3** Mantenir compatibilitat amb Excel existent
- [ ] **3.3.4** Testing amb datasets mixtos

---

# 📋 FASE 4: IA INSTRUCTIONS SYSTEM (5-6 dies)

## 4.1 Instructions Architecture (2 dies)
### Subtasques:
- [ ] **4.1.1** Dissenyar sistema instruccions jeràrquic:
  ```typescript
  interface InstructionSystem {
    global: GlobalInstruction[]     // Document-wide
    sections: SectionInstruction[]  // H1, H2, H3 levels  
    paragraphs: ParagraphInstruction[] // Individual paragraphs
    tables: TableInstruction[]      // Table-level
    cells: CellInstruction[]        // Individual cells
  }
  ```
- [ ] **4.1.2** Crear base de dades schema:
  ```sql
  CREATE TABLE ai_instructions (
    id UUID PRIMARY KEY,
    template_id UUID REFERENCES templates(id),
    instruction_type TEXT CHECK (instruction_type IN ('global', 'section', 'paragraph', 'table', 'cell')),
    target_selector TEXT, -- CSS selector o identifier
    instruction_text TEXT,
    prompt_template TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] **4.1.3** Implementar instruction targeting system

## 4.2 Instructions UI Components (2-3 dias)
### Subtasques:
- [ ] **4.2.1** Crear `components/instructions/InstructionEditor.tsx`:
  - Rich text editor per instruccions
  - Template variables support {{variable}}
  - Preview instruction result
- [ ] **4.2.2** Crear `components/instructions/InstructionTargeting.tsx`:
  - Visual selector per elements
  - Hierarchy tree view (Global > Section > Paragraph)
  - Drag & drop organization
- [ ] **4.2.3** Integrar amb `AIAnalysisInterface.tsx`:
  - Tabs: Variables | Instructions
  - Context-aware instruction suggestions
  - Real-time preview
- [ ] **4.2.4** Crear `components/instructions/TableInstructions.tsx`:
  - Cell-level instruction editor
  - Row/column targeting
  - Template per cell types

## 4.3 IA Processing Engine (1-2 dies)
### Subtasques:
- [ ] **4.3.1** Crear `lib/ai/instruction-processor.ts`:
  - Apply instructions in ordre jeràrquic
  - Context-aware variable substitution
  - Error handling per instructions conflictives
- [ ] **4.3.2** Implementar instruction execution pipeline:
  ```typescript
  async function processInstructions(
    content: HTMLContent,
    instructions: InstructionSystem,
    data: Record<string, any>
  ): Promise<ProcessedContent>
  ```
- [ ] **4.3.3** Crear sistema preview amb instruccions aplicades
- [ ] **4.3.4** Testing amb casos complexos

---

# 📋 FASE 5: GENERATION ENGINE (6-7 dies)

## 5.1 Google Docs Generation API (3 dies)
### Subtasques:
- [ ] **5.1.1** Crear `lib/google/docs-generator.ts`:
  - `createDocumentFromHTML()` - HTML to Google Doc
  - `applyFormatting()` - preserve styles
  - `insertTables()` - table generation
  - `handleImages()` - image embedding
- [ ] **5.1.2** Implementar HTML → Google Docs conversion:
  - Semantic HTML mapping
  - Style preservation
  - Table formatting
  - Image handling
- [ ] **5.1.3** Crear batch generation system:
  ```typescript
  async function generateBatchDocuments(
    template: GoogleDocTemplate,
    dataRows: DataRow[],
    outputFolder: string
  ): Promise<GenerationResult[]>
  ```
- [ ] **5.1.4** Error handling per generation failures

## 5.2 Output Management (2 dias)
### Subtasques:
- [ ] **5.2.1** Crear sistema carpetes Drive:
  - Auto-create output folders
  - Naming conventions
  - Permission management
- [ ] **5.2.2** Implementar progress tracking:
  - Real-time generation progress
  - Error reporting per document
  - Success/failure statistics
- [ ] **5.2.3** Crear `components/generation/GenerationResults.tsx`:
  - Links als documents generats
  - Download options
  - Error summaries
  - Re-generation capabilities

## 5.3 Universal Generation Pipeline (1-2 dies)
### Subtasques:
- [ ] **5.3.1** Crear `lib/generators/universal-generator.ts`:
  - Support DOCX + Google Docs output
  - Format selection logic
  - Unified error handling
- [ ] **5.3.2** Implementar output format selector:
  ```typescript
  interface GenerationOptions {
    outputFormat: 'docx' | 'google-docs'
    outputFolder?: string
    namingPattern?: string
  }
  ```
- [ ] **5.3.3** Testing cross-format compatibility

---

# 📋 FASE 6: API ENDPOINTS (3-4 dies)

## 6.1 Google Docs APIs (2 dies)
### Subtasques:
- [ ] **6.1.1** Crear `/api/google/auth` endpoint:
  - OAuth2 flow handling
  - Token storage/refresh
  - Permission validation
- [ ] **6.1.2** Crear `/api/google/docs/import` endpoint:
  - Document ID input
  - HTML export processing
  - Structure analysis response
- [ ] **6.1.3** Crear `/api/google/sheets/data` endpoint:
  - Spreadsheet data extraction
  - Headers + rows parsing
  - Data validation
- [ ] **6.1.4** Crear `/api/google/drive/folders` endpoint:
  - Folder creation
  - Permission management

## 6.2 Instructions APIs (1-2 dies)
### Subtasques:
- [ ] **6.2.1** Crear `/api/instructions/save` endpoint:
  - Save instruction sets
  - Validation logic
  - Version control
- [ ] **6.2.2** Crear `/api/instructions/apply` endpoint:
  - Process instructions on content
  - Real-time preview
  - Error handling
- [ ] **6.2.3** Crear `/api/instructions/templates` endpoint:
  - Pre-built instruction templates
  - Industry-specific prompts

## 6.3 Generation APIs (1 dia)
### Subtasques:
- [ ] **6.3.1** Modificar `/api/render` endpoint:
  - Support Google Docs output
  - Universal format handling
  - Batch processing
- [ ] **6.3.2** Crear `/api/generation/progress` endpoint:
  - Real-time progress tracking
  - WebSocket connection opcional
- [ ] **6.3.3** Error handling standarditzat

---

# 📋 FASE 7: UI/UX INTEGRATION (4-5 dies)

## 7.1 Dashboard Modifications (2 dies)
### Subtasques:
- [ ] **7.1.1** Modificar botó "Nova Plantilla":
  - Show TemplateSourceSelector modal
  - Update create template flow
- [ ] **7.1.2** Afegir badges per template source:
  - 📄 Word icons
  - 📝 Google Docs icons
  - Source indicators a template cards
- [ ] **7.1.3** Update template listing:
  - Filter per source type
  - Source-specific actions
- [ ] **7.1.4** Responsive design per nous components

## 7.2 Analysis Interface Updates (1-2 dies)
### Subtasques:
- [ ] **7.2.1** Modificar `AIAnalysisInterface.tsx`:
  - Add source badge display
  - Conditional rendering per source type
  - Maintain existing functionality
- [ ] **7.2.2** Update preview panels:
  - HTML preview per Google Docs
  - Maintain DOCX preview existent
- [ ] **7.2.3** Instructions tab integration

## 7.3 Generation Interface (1-2 dies)
### Subtasques:
- [ ] **7.3.1** Update generation flow:
  - Output format selection
  - Google Drive folder picker
  - Progress indicators
- [ ] **7.3.2** Results display:
  - Links per Google Docs
  - Download links per DOCX
  - Success/error statistics
- [ ] **7.3.3** Error handling UI:
  - Retry mechanisms
  - Error explanations
  - Support contact info

---

# 📋 FASE 8: DATABASE & STORAGE (2-3 dies)

## 8.1 Database Schema Extensions (1 dia)
### Subtasques:
- [ ] **8.1.1** Extend templates table:
  ```sql
  ALTER TABLE templates 
  ADD COLUMN source_type TEXT CHECK (source_type IN ('docx', 'google-docs')) DEFAULT 'docx',
  ADD COLUMN source_id TEXT,
  ADD COLUMN source_metadata JSONB,
  ADD COLUMN google_doc_id TEXT,
  ADD COLUMN html_content TEXT;
  ```
- [ ] **8.1.2** Extend generations table:
  ```sql
  ALTER TABLE generations
  ADD COLUMN output_format TEXT CHECK (output_format IN ('docx', 'google-docs', 'pdf')) DEFAULT 'docx',
  ADD COLUMN google_folder_id TEXT,
  ADD COLUMN google_doc_ids TEXT[];
  ```
- [ ] **8.1.3** Create indexes:
  ```sql
  CREATE INDEX idx_templates_source_type ON templates(source_type);
  CREATE INDEX idx_templates_google_doc ON templates(google_doc_id);
  CREATE INDEX idx_generations_output_format ON generations(output_format);
  ```

## 8.2 Migration Scripts (1-2 dies)
### Subtasques:
- [ ] **8.2.1** Crear migration script per existing data:
  - Set default source_type = 'docx'
  - Migrate existing templates
  - Validate data integrity
- [ ] **8.2.2** Backup existing data abans migration
- [ ] **8.2.3** Testing migration en development
- [ ] **8.2.4** Rollback procedures

---

# 📋 FASE 9: TESTING & QA (5-6 dies)

## 9.1 Unit Testing (2 dies)
### Subtasques:
- [ ] **9.1.1** Google APIs testing:
  - Mock Google API responses
  - Test error scenarios
  - Authentication flow testing
- [ ] **9.1.2** HTML parsing testing:
  - Various Google Docs formats
  - Edge cases handling
  - Performance testing
- [ ] **9.1.3** Instructions system testing:
  - Complex instruction combinations
  - Variable substitution edge cases
  - Error handling validation

## 9.2 Integration Testing (2-3 dies)
### Subtasques:
- [ ] **9.2.1** End-to-end flow testing:
  - Google Doc upload → processing → generation
  - Multiple data sources (Sheets + Excel)
  - Cross-format generation (DOCX ↔ Google Docs)
- [ ] **9.2.2** Performance testing:
  - Large document processing
  - Batch generation limits
  - API rate limiting
- [ ] **9.2.3** Error scenarios testing:
  - Network failures
  - API quota exceeded
  - Invalid permissions

## 9.3 User Acceptance Testing (1 dia)
### Subtasques:
- [ ] **9.3.1** Create test scenarios documentation
- [ ] **9.3.2** Test amb documents reals varies
- [ ] **9.3.3** Validate output quality
- [ ] **9.3.4** Performance benchmarking

---

# 📋 FASE 10: DEPLOYMENT & MONITORING (2-3 dies)

## 10.1 Production Setup (1-2 dies)
### Subtasques:
- [ ] **10.1.1** Environment variables configuration:
  ```bash
  # Google APIs
  GOOGLE_CLIENT_ID=
  GOOGLE_CLIENT_SECRET=
  GOOGLE_SERVICE_ACCOUNT_KEY=
  
  # Feature flags
  GOOGLE_INTEGRATION_ENABLED=true
  HYBRID_MODE_ENABLED=true
  ```
- [ ] **10.1.2** Vercel deployment configuration:
  - Update `vercel.json` per Google APIs
  - Configure build settings
  - Environment secrets setup
- [ ] **10.1.3** Database migration production:
  - Run migrations safely
  - Validate data integrity
  - Backup procedures

## 10.2 Monitoring & Analytics (1 dia)
### Subtasques:
- [ ] **10.2.1** Setup error tracking:
  - Google API failures
  - Generation errors
  - User authentication issues
- [ ] **10.2.2** Performance monitoring:
  - API response times
  - Document processing speed
  - Memory usage tracking
- [ ] **10.2.3** Usage analytics:
  - Source type usage (DOCX vs Google)
  - Feature adoption rates
  - Error rate tracking

---

# 📊 RESUM EXECUTIU

## Timeline Total: **4-5 setmanes (20-25 dies)**

### Distribució per fases:
- **Fase 1-2:** Setup + Google Docs (11-13 dies) - **Setmanes 1-2**
- **Fase 3-5:** Sheets + IA + Generation (15-18 dies) - **Setmanes 3-4** 
- **Fase 6-10:** APIs + UI + Deploy (12-15 dies) - **Setmana 5**

### Recursos necessaris:
- **1 Desenvolupador Full-Stack** (tu)
- **Google Cloud Platform** costs: ~€20-50/mes
- **Development time:** 20-25 dies x 8h = **160-200 hores**

### Deliverables finals:
✅ **Google Docs upload** completament funcional  
✅ **HTML fidedigne** amb structure preservation  
✅ **Google Sheets mapping** intelligent amb IA  
✅ **Instructions system** complet (global→cells)  
✅ **Mass generation** → Google Docs en Drive folders  
✅ **Hybrid system** DOCX + Google Docs operatiu  

### Dependencies crítiques:
- Google Cloud APIs approval (1-2 dies)
- OAuth2 consent screen approval (1-3 dies)
- Google Workspace domain verification (si requerit)

**READY TO START IMPLEMENTATION** 🚀