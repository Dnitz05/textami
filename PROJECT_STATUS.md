# ESTAT DELS PROJECTES - INFORMACIÓ CRÍTICA

## SITUACIÓ ACTUAL

### **TEXTAMI** - PROJECTE ACTIU ✅
- **Estat**: Projecte principal en desenvolupament actiu
- **Arquitectura**: Next.js 15 + React 19 + Supabase
- **Propòsit**: Generador de documents amb plantilles Word i Excel
- **Directori**: `C:\projects\textami\`
- **Versions**: MVP 0.1.0
- **Dependencies modernes**: Tailwind v4, TypeScript actualitzat

### **DNITZ05** - PROJECTE ABANDONAT ❌
- **Estat**: Projecte abandonat / deprecated
- **Propòsit**: Només com a font de codi reutilitzable per TEXTAMI
- **Directori**: `C:\projects\dnitz05\`
- **Problemes**: 
  - Arquitectura complexa i fragmentada
  - 59 endpoints de debug
  - 83 fitxers de documentació
  - Deute tècnic crític
  - Dependencies obsoletes

---

## ESTRATÈGIA DE DESENVOLUPAMENT

### ✅ FOCUS PRINCIPAL: TEXTAMI
- Tot el desenvolupament nou es fa a TEXTAMI
- Arquitectura neta i moderna
- Dependencies actualitzades
- Estructura organitzada

### ♻️ REUTILITZACIÓ DE DNITZ05
- **NOMÉS** extreure funcionalitats específiques útils
- **NO** migrar arquitectura ni patrons problemàtics
- **NO** portar debugging endpoints
- **NO** portar documentació excessiva

### 🎯 ELEMENTS A CONSIDERAR DE DNITZ05:
- Lògica de processament de documents DOCX
- Funcionalitats de plantilles que funcionin bé
- Integracions amb Supabase que siguin estables
- Utils de manipulació d'Excel/DOCX

---

## RECORDATORIS IMPORTANTS

1. **TEXTAMI és el projecte principal** - focus 100% aquí
2. **DNITZ05 és font de codi** - només extraure el que funcioni
3. **No portar problemes** - revisar bé abans d'importar codi
4. **Mantenir arquitectura neta** - no contaminar TEXTAMI
5. **Dependencies modernes** - mantenir stack actualitzat a TEXTAMI

## 💎 MÒDULS PREMIUM DOCXTEMPLATER - SEMPRE APROFITAR (€1,250)

**CRÍTICO**: Sempre recordar i aprofitar aquests 4 mòduls premium:

1. **HTML Module (€250)** - `{~~variable}` per contingut HTML ric
2. **Image Module (€250)** - `{%variable}` per imatges dinàmiques
3. **Style Module (€500)** - `{variable:style="..."}` per formatació avançada
4. **XLSX Module (€250)** - `{variable}` per generació Excel

**REGLA**: En QUALSEVOL funcionalitat de documents, SEMPRE oferir aquestes opcions premium per maximitzar ROI de €1,250.

---

*Actualitzat: 2025-08-21*