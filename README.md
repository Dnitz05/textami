# Textami AI-First

**Generador intel·ligent de documents** que utilitza GPT-5 Vision per transformar plantilles Word i dades Excel en documents personalitzats amb **zero configuració manual**.

## 📋 Estat Actual del Projecte

**Status:** Fase 1 - Desenvolupament Intel·ligència Artificial  
**Backend:** 80% implementat (4/4 APIs funcionals)  
**Frontend:** 20% implementat (MVP bàsic)  
**Motor Generació:** PENDENT DECISIÓ (docxtemplater vs alternatives)

## 🚀 Característiques AI-First

✅ **Upload DOCX** → GPT-5 Vision llegeix i analitza automàticament (UI funcional)
✅ **AI Placeholder Detection** → Detecta camps automàticament amb confidence scores (backend)
🔄 **Excel Intelligence** → Analitza columnes i proposa mappings intel·ligents (backend ready, UI pending)
🔄 **AI Document Generation** → Genera documents preservant format (backend ready, UI pending)  
❌ **Batch Processing** → Processos massius optimitzats amb IA (no implementat)
✅ **Zero Configuration** → Cap setup manual, tot automàtic (AI endpoints)  

## 🏗️ Estratègia de Desenvolupament

**Arquitectura de 4 Fases (AI-First, Docxtemplater-Last):**
- **Fase 1:** 🔄 Intel·ligència Artificial (EN CURS)
- **Fase 2:** ⏳ Interfície d'Usuari Professional  
- **Fase 3:** ⏳ Backend Agnòstic amb Factory Pattern
- **Fase 4:** 🎯 DECISIÓ + Implementació Motor de Generació

## 🧠 Stack AI-First

- **AI Engine**: OpenAI GPT-5 Vision API
- **Frontend**: Next.js 15.4.6, React 19.1.0, TypeScript strict
- **Database**: Supabase (PostgreSQL + Storage)
- **Styling**: Tailwind CSS 4.0
- **Deploy**: Vercel Edge Functions
- **Motor Generació**: PER DETERMINAR (docxtemplater vs alternatives)

## ⚡ Quick Start

```bash
# Clone repository
git clone https://github.com/Dnitz05/textami.git
cd textami

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Add your OpenAI API key: OPENAI_API_KEY=sk-...

# Run database migrations
# Execute supabase/migrations/001_complete_schema.sql in Supabase Dashboard

# Start development
npm run dev
```

## 🎯 AI Workflow

```
📤 Upload DOCX → 🧠 GPT-5 Analysis → 📊 Excel Upload → 🎯 AI Mapping → ✨ Generate Documents
     (2s)              (5s)              (1s)           (3s)           (10s)
```

## 🔮 Roadmap AI-Enhanced

### ✅ v0.1 AI MVP (Current)
- GPT-5 Vision document analysis
- AI placeholder detection
- Intelligent mapping proposals  
- AI document generation

### 🚀 v0.2 AI Enhanced (Next Month)
- Multi-model AI (Claude, Gemini fallbacks)
- AI template library
- Advanced confidence scoring
- Context memory

### 🌟 v1.0 AI Enterprise (Q1 2026)  
- Custom AI model training
- RAG Knowledge Base
- White-label AI platform
- API ecosystem

## 🚀 Deployment a Vercel

### Variables d'Entorn Requerides

Configura aquestes variables a Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Supabase Configuration  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: OpenAI Organization ID
OPENAI_ORG_ID=your-org-id-here
```

### Configuració de Branques

- **Production**: `main` branch (recomanat)
- **Preview**: `master` branch 

**Important**: Configura totes les variables d'entorn abans del primer deployment per evitar errors de build.

## 📄 Llicència

© 2025 Aitor Gilabert Juan. Tots els drets reservats.

## 🙏 Crèdits

Reutilitza components Supabase del projecte [ai-sdk-next-openai](https://github.com/Dnitz05/ai-sdk-next-openai).

---

Creat per [Aitor Gilabert Juan](mailto:aitordelriu@gmail.com)

