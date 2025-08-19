# Textami MVP

Generador professional de documents que transforma plantilles Word i dades Excel en documents personalitzats mantenint el format original.

## 🚀 Característiques MVP (v0.1)

✅ **Upload plantilles** - Puja el teu .docx amb format corporatiu  
✅ **Detecció automàtica** - Troba variables {nom}, {data}, etc.  
✅ **Dades Excel/CSV** - Connecta les teves dades  
✅ **Generació massiva** - Crea centenars de documents  
✅ **Format perfecte** - Manté logos, estils, tot  
✅ **Export flexible** - DOCX editable o PDF final  

## 🛠️ Tecnologies

- **Frontend**: Next.js 15.4.6, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Documents**: Docxtemplater Premium (4 mòduls)
- **Deploy**: Vercel + GitHub Actions

## 📦 Instal·lació

```bash
# Clonar
git clone https://github.com/Dnitz05/textami.git
cd textami

# Instal·lar dependencies
npm install

# Variables entorn
cp .env.example .env.local
# Editar .env.local amb les teves claus

# Base de dades
# Executar docs/database-schema.sql a Supabase Dashboard

# Desenvolupament
npm run dev
```

## 📝 Roadmap

### ✅ v0.1 MVP (Actual)
- Funcionalitats bàsiques
- Upload → Process → Download

### 🔮 v0.2 (Mes 2)
- IA integrada (OpenAI)
- Preview millorat
- Templates biblioteca
- Historial generacions

### 🚀 v1.0 (Futur)
- Human-in-the-loop complet
- Knowledge Base amb RAG
- API pública
- White label

## 📄 Llicència

© 2025 Aitor Gilabert Juan. Tots els drets reservats.

## 🙏 Crèdits

Reutilitza components Supabase del projecte [ai-sdk-next-openai](https://github.com/Dnitz05/ai-sdk-next-openai).

---

Creat per [Aitor Gilabert Juan](mailto:aitordelriu@gmail.com)

