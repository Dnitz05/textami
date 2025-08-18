# Textami MVP - Pla de Desenvolupament

## Fase 1: MVP (30 dies)

### ✅ COMPLETAT
- [x] Estructura base del projecte
- [x] Configuració Supabase
- [x] Core Docxtemplater amb 4 mòduls premium
- [x] Tipus TypeScript
- [x] Schema base de dades (4 taules)
- [x] Utilitats base

### 🔄 EN PROGRÉS
- [ ] API routes bàsiques
- [ ] Components UI amb shadcn/ui
- [ ] Pàgines principales (landing, dashboard)
- [ ] Sistema d'autenticació
- [ ] Upload de plantilles
- [ ] Upload de dades Excel

### ⏳ PENDENT
- [ ] Generació de documents
- [ ] Sistema de descàrrega
- [ ] Testing bàsic
- [ ] Deploy a Vercel

## Funcionalitats MVP

### CORE FEATURES
✅ Upload plantilla .docx  
✅ Detectar variables automàticament  
✅ Upload Excel/CSV  
✅ Mappeig columnes → variables  
✅ Preview amb dades mostra  
✅ Generar documents (Docxtemplater Premium)  
✅ Download DOCX individual  
✅ Download batch en ZIP  
✅ Convertir a PDF  

### NO INCLOURE AL MVP
❌ IA de cap tipus
❌ Knowledge Base
❌ Human-in-the-loop complet
❌ Signatura digital
❌ API pública
❌ Multi-tenant
❌ Sistema d'aprenentatge

## Timeline Detallat

### Setmana 1 (Dies 1-7): FOUNDATION ✅
- Dia 1-2: Setup, GitHub, Vercel ✅
- Dia 3-4: Supabase de dnitz05 ✅  
- Dia 5-6: Database schema ✅
- Dia 7: Upload plantilles bàsic

### Setmana 2 (Dies 8-14): TEMPLATES
- Dia 8-9: Detectar variables
- Dia 10-11: Guardar plantilles Supabase
- Dia 12-13: Llistar plantilles
- Dia 14: UI dashboard

### Setmana 3 (Dies 15-21): DATA
- Dia 15-16: Upload Excel/CSV
- Dia 17-18: Parse amb SheetJS  
- Dia 19-20: Mappeig columnes UI
- Dia 21: Preview dades

### Setmana 4 (Dies 22-28): GENERATION  
- Dia 22-23: Generar 1 document
- Dia 24-25: Batch processing
- Dia 26-27: Progress tracking
- Dia 28: Download ZIP

### Final (Dies 29-30)
- Dia 29: Testing complet
- Dia 30: Deploy producció

## Regles Absolutes MVP

- Codi SIMPLE sempre
- Comentaris en CATALÀ  
- Una funció = una tasca
- Gestió errors explícita
- NO abstraccions prematures
- NO over-engineering
- NO features no essencials