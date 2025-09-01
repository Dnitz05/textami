# GOOGLE CLOUD PROJECT SETUP

**Data:** 1 Setembre 2025  
**Objectiu:** Configuració completa Google Cloud per integració Textami  
**Temps:** 30-45 minuts

---

## 🎯 OVERVIEW

Aquest document et guia per configurar Google Cloud Project i APIs necessàries per la integració híbrida de Textami amb Google Docs i Sheets.

---

# 📋 STEP 1: CREAR GOOGLE CLOUD PROJECT

## 1.1 Accedir a Google Cloud Console
1. Ves a [Google Cloud Console](https://console.cloud.google.com)
2. Inicia sessió amb el teu compte Google
3. Si és el primer cop, accepta els termes de servei

## 1.2 Crear Nou Project
1. Click a "Select a project" (part superior)
2. Click "NEW PROJECT"
3. Configura:
   - **Project name:** `Textami Integration`
   - **Project ID:** `textami-integration-[random]` (s'auto-genera)
   - **Organization:** (deixa per defecte si no tens organització)
4. Click "CREATE"
5. **Espera 1-2 minuts** que es creï el project
6. **IMPORTANT:** Anota el **Project ID** - el necessitaràs més tard

---

# 📋 STEP 2: ACTIVAR APIs NECESSÀRIES

## 2.1 Anar a API Library
1. Al menú lateral: **APIs & Services** → **Library**
2. Cerca i activa les següents APIs una per una:

## 2.2 APIs a Activar
### **Google Drive API**
1. Cerca: "Google Drive API"
2. Click "Google Drive API" 
3. Click **ENABLE**
4. Espera que s'activi ✅

### **Google Docs API**  
1. Cerca: "Google Docs API"
2. Click "Google Docs API"
3. Click **ENABLE**
4. Espera que s'activi ✅

### **Google Sheets API**
1. Cerca: "Google Sheets API" 
2. Click "Google Sheets API"
3. Click **ENABLE**
4. Espera que s'activi ✅

### **Google OAuth2 API**
1. Cerca: "Google+ API" o "People API"
2. Click "People API" 
3. Click **ENABLE**
4. Espera que s'activi ✅

---

# 📋 STEP 3: CONFIGURAR OAUTH CONSENT SCREEN

## 3.1 Anar a OAuth Consent Screen
1. Al menú lateral: **APIs & Services** → **OAuth consent screen**

## 3.2 Configurar Consent Screen
1. **User Type:** Selecciona **External** (per usuaris públics)
2. Click **CREATE**

## 3.3 App Information
1. **App name:** `Textami`
2. **User support email:** `[el teu email]`
3. **App logo:** (opcional - pots pujar logo després)
4. **App domain:** 
   - **Application home page:** `https://textami.vercel.app`
   - **Application privacy policy:** `https://textami.vercel.app/privacy`
   - **Application terms of service:** `https://textami.vercel.app/terms`
5. **Developer contact information:** `[el teu email]`
6. Click **SAVE AND CONTINUE**

## 3.4 Scopes (Permisos)
1. Click **ADD OR REMOVE SCOPES**
2. Selecciona aquests scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile` 
   - `../auth/drive.readonly`
   - `../auth/documents.readonly`
   - `../auth/spreadsheets.readonly`
   - `../auth/drive.file`
3. Click **UPDATE**
4. Click **SAVE AND CONTINUE**

## 3.5 Test Users (Development)
1. Click **ADD USERS**
2. Afegeix el teu email per testing
3. Click **SAVE AND CONTINUE**

## 3.6 Summary
1. Revisa la configuració
2. Click **BACK TO DASHBOARD**

---

# 📋 STEP 4: CREAR OAUTH2 CREDENTIALS

## 4.1 Anar a Credentials
1. Al menú lateral: **APIs & Services** → **Credentials**

## 4.2 Crear OAuth2 Client ID
1. Click **+ CREATE CREDENTIALS**
2. Selecciona **OAuth client ID**
3. **Application type:** `Web application`
4. **Name:** `Textami Web Client`

## 4.3 Configurar URIs
### **Authorized JavaScript origins:**
```
http://localhost:3000
https://textami.vercel.app
```

### **Authorized redirect URIs:**
```
http://localhost:3000/api/auth/google/callback
https://textami.vercel.app/api/auth/google/callback
```

5. Click **CREATE**

## 4.4 Guardar Credentials
1. **IMPORTANT:** Apareixerà un modal amb:
   - **Client ID:** `xxxxx.apps.googleusercontent.com`
   - **Client Secret:** `yyyyy`
2. **COPIA AQUESTS VALORS** - els necessites a `.env`
3. Click **OK**

---

# 📋 STEP 5: CONFIGURAR ENVIRONMENT VARIABLES

## 5.1 Afegir Variables a .env.local
Crea o actualitza el fitxer `.env.local`:

```bash
# Google Integration
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Feature Flags
GOOGLE_INTEGRATION_ENABLED=true
HYBRID_MODE_ENABLED=true
```

## 5.2 Actualitzar Vercel Environment Variables
Si uses Vercel per production:

1. Ves a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona el teu project Textami
3. **Settings** → **Environment Variables**
4. Afegeix:
   - `GOOGLE_CLIENT_ID` = `your_client_id`
   - `GOOGLE_CLIENT_SECRET` = `your_client_secret`
   - `GOOGLE_INTEGRATION_ENABLED` = `true`
   - `HYBRID_MODE_ENABLED` = `true`

---

# 📋 STEP 6: TESTING

## 6.1 Test Local
1. Executa `npm run dev`
2. Ves a `http://localhost:3000/dashboard`  
3. Hauria d'aparèixer el botó **"Connect Google Account"**
4. Click al botó → Hauria de redirigir a Google OAuth

## 6.2 Test Google OAuth Flow
1. Autoritza l'aplicació a Google
2. Hauria de tornar al dashboard amb "Google Account Connected ✅"
3. Si veus errors, revisa:
   - URLs de redirect correctes
   - Environment variables
   - Console errors al navegador

---

# 📋 STEP 7: QUOTA MANAGEMENT

## 7.1 Revisar Quotas
1. **APIs & Services** → **Quotas**
2. Revisa limits per:
   - **Drive API:** 1,000 requests/100s per user
   - **Docs API:** 300 requests/100s per user  
   - **Sheets API:** 300 requests/100s per user

## 7.2 Request Quota Increase (Si Necessari)
Per apps en producció amb molts usuaris:
1. Click **EDIT QUOTAS** 
2. Emplena el formulari justificant l'increment
3. Google revisarà en 2-5 dies laborables

---

# 🔧 TROUBLESHOOTING

## Error: "redirect_uri_mismatch"
**Solució:** 
- Revisa que les URLs de redirect a Google Console coincideixin exactament amb les del codi
- Inclou http://localhost:3000 per development
- Inclou https://textami.vercel.app per production

## Error: "invalid_client"
**Solució:**
- Verifica `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` a .env
- Assegura't que no tinguin espais extra

## Error: "access_denied"
**Solució:**
- Afegeix el teu email a "Test users" durant development
- Per production, publica l'app (veure següent secció)

## App No Verificada (Warning Screen)
**Per Development:** Normal, click "Advanced" → "Go to Textami (unsafe)"
**Per Production:** Necessites verificar l'app amb Google (procés més llarg)

---

# 🚀 PRODUCTION DEPLOYMENT

## App Verification (Per Production)
Per eliminar el warning "App not verified":

1. **OAuth consent screen** → **PUBLISH APP**
2. Google revisarà l'aplicació (1-6 setmanes)
3. O compleix el procés de verificació:
   - Dominis verificats
   - Privacy policy pública
   - Terms of service públics

## Monitoring
- **APIs & Services** → **Dashboard** per veure usage
- Setup alertes si t'apropaves als limits

---

# ✅ CHECKLIST FINAL

- [ ] ✅ Google Cloud Project creat
- [ ] ✅ 4 APIs activades (Drive, Docs, Sheets, People)
- [ ] ✅ OAuth consent screen configurat
- [ ] ✅ OAuth2 credentials creades
- [ ] ✅ Environment variables configurades
- [ ] ✅ URLs de redirect correctes
- [ ] ✅ Test OAuth flow funcional
- [ ] ✅ Google account connection working

**TEMPS TOTAL:** ~30-45 minuts

**RESULTAT:** Google Integration ready per Textami! 🎉

---

**Next Steps:** Amb Google Cloud configurat, pots continuar amb la implementació de Google Docs processing (Fase 2) del pla d'implementació.