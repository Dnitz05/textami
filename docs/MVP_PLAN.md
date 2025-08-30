# Textami OOXML-Centric Implementation Plan

## Migració Arquitectònica: GPT → OOXML (2 setmanes)

### ✅ COMPLETAT (Multi-Template Foundation)
- [x] Sistema multi-template operacional
- [x] Database schema OOXML-ready amb extensions
- [x] Docxtemplater integration funcional
- [x] Smart mapping IA (Excel intelligence preservada)
- [x] Mass generation system implementat
- [x] Supabase storage + API endpoints

### 🔄 PRIORITAT IMPLEMENTACIÓ OOXML (2 setmanes)
- [ ] Python OOXML parser (`scripts/ingest_docx.py`)
- [ ] StyleManifest auto-generation JSON
- [ ] HTML semàntic templates (Nunjucks)
- [ ] API modifications per OOXML workflow
- [ ] Preview system + QA validation
- [ ] Database extensions per styleManifest storage

### ⏳ FUTUR (Post-OOXML)
- [ ] Docxtemplater PRO + HTML Module integration
- [ ] Advanced style mapping UI
- [ ] Multi-language template support
- [ ] White-label customization

## OOXML-Centric Features

### CORE OOXML PIPELINE
🎯 **DOCX Upload** → Python OOXML parser (1s vs 25s anterior)
🎯 **Style Extraction** → styles.xml + numbering.xml processing  
🎯 **Manifest Generation** → Auto-mapping HTML → Word styles
🎯 **Excel Smart Mapping** → IA intelligence preservada
🎯 **HTML Generation** → Semantic templates universals
🎯 **Final DOCX** → Docxtemplater amb perfect fidelity

### ELIMINAT DEL SISTEMA ANTERIOR
❌ GPT-5 Vision per parsing documents (cost €0.50/doc)
❌ Markdown intermediate format (pèrdua fidelitat)
❌ Complex AI reasoning per structure detection
❌ External API dependencies per parsing
❌ Slow processing pipeline (25-30s)

## Timeline OOXML Implementation

### Setmana 1 (Dies 1-5): OOXML Foundation
- **Dia 1:** Crear `scripts/ingest_docx.py` amb python-docx + lxml
- **Dia 2:** Parsing styles.xml extraction amb heuristic mapping
- **Dia 3:** Parsing numbering.xml per llistes i numbering
- **Dia 4:** Auto-generació styleManifest.json structure
- **Dia 5:** Testing basic amb documents Word varietats

### Setmana 2 (Dies 6-10): HTML Integration & Polish
- **Dia 6:** Nunjucks templates amb vocabulari HTML semàntic  
- **Dia 7:** HTML generation engine + sanitization
- **Dia 8:** API modifications per OOXML workflow integration
- **Dia 9:** Preview system + validation QA reports
- **Dia 10:** Database extensions + testing end-to-end complet

## Regles OOXML-Centric Architecture

- **LOCAL PROCESSING**: Python OOXML parser (zero external calls)
- **PERFORMANCE**: <1s parsing vs 25s anterior
- **FIDELITAT**: 95% style preservation via direct XML reading
- **COST**: €0 per parsing vs €0.50 anterior
- **ESCALABILITAT**: Il·limitada capacity vs API throttling
- **RELIABILITY**: 99% uptime (no external dependencies)
- **MAINTAINABILITY**: Standard OOXML vs proprietary AI prompts