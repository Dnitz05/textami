# ESTRATÈGIA DE DESENVOLUPAMENT TEXTAMI

**Data:** 24 Agost 2025  
**Principi Fonamental:** AI-First, Zero Deute Tècnic  
**Status:** Arquitectura Modular Sense Motor de Generació Decidit

---

## 🎯 PRINCIPI FONAMENTAL

**NO implementar el motor de generació fins tenir una decisió informada sobre tecnologies.**

Evitar deute tècnic implementant solucions que podríem haver de refactoritzar o eliminar. És millor NO implementar que implementar malament o prematurament.

## 🏗️ ARQUITECTURA DE 4 FASES

### **FASE 1: Intel·ligència Artificial (EN CURS)**
**Durada:** 2-3 setmanes  
**Status:** 🔄 EN DESENVOLUPAMENT

#### Objectius:
- Sistema de detecció de placeholders amb IA
- Anàlisi intel·ligent de documents DOCX 
- Mapping automàtic Excel-Placeholders
- Validació i scoring de confiança

#### Components a Desenvolupar:
```typescript
interface AILayer {
  // Detecció de placeholders amb IA
  detectPlaceholders(docx: Buffer): Promise<Placeholder[]>
  
  // Mapping intel·ligent Excel ↔ Placeholders  
  suggestMappings(
    placeholders: Placeholder[], 
    excelColumns: string[]
  ): Promise<Mapping[]>
  
  // Generació de contingut amb IA
  generateContent(prompt: string, context: any): Promise<string>
  
  // Validació i scoring
  validateMapping(mapping: Mapping): Promise<ValidationResult>
}
```

#### APIs a Implementar:
- ✅ `/api/ai-docx/analyze` (DOCX → Placeholders)
- ✅ `/api/ai-docx/excel` (Excel → Columns)  
- ✅ `/api/ai-docx/mapping` (AI Mapping Proposals)
- 🔄 `/api/ai-docx/validate` (Mapping Validation)

---

### **FASE 2: Interfície d'Usuari (SEGÜENT)**
**Durada:** 2-3 setmanes  
**Status:** ⏳ PENDENT

#### Objectius:
- Interfície de 3 panells professional
- Components React moderns
- UX optimitzada per workflow AI-first
- **ZERO dependència del motor de generació**

#### Components UI:
```typescript
interface UIComponents {
  // Upload i preview
  DocumentUploader: React.FC
  ExcelUploader: React.FC
  
  // Visualització  
  PlaceholderList: React.FC
  MappingInterface: React.FC
  
  // Confirmació
  MappingConfirmation: React.FC
  GenerationProgress: React.FC<{mockMode: boolean}>
}
```

#### Arquitectura UI:
- **Layout:** 3 panells (Sidebar-Left | Main-Content | Sidebar-Right)
- **State Management:** Zustand per workflow state
- **Styling:** Tailwind CSS amb components personalitzats
- **Preview:** Mockejat fins decidir motor generació

---

### **FASE 3: Backend Agnòstic (DESPRÉS UI)**
**Durada:** 1-2 setmanes  
**Status:** ⏳ PENDENT

#### Objectius:
- API robusta i escalable
- Interfície abstracta per motors de generació  
- Sistema de cues per processos
- **Preparació per a qualsevol motor**

#### Interfície Abstracta:
```typescript
interface DocumentGenerator {
  initialize(config: GeneratorConfig): Promise<void>
  generateDocument(template: Buffer, data: any): Promise<Buffer>
  supportedFeatures(): Feature[]
  validateTemplate(template: Buffer): Promise<ValidationResult>
}

// Factory Pattern per intercanviabilitat
class GeneratorFactory {
  static create(type: GeneratorType): DocumentGenerator {
    switch(type) {
      case 'DOCXTEMPLATER_STANDARD':
        return new DocxtemplaterStandardGenerator()
      case 'DOCXTEMPLATER_PREMIUM': 
        return new DocxtemplaterPremiumGenerator()
      case 'CARBONE':
        return new CarboneGenerator()
      case 'CUSTOM_AI':
        return new CustomAIGenerator()
    }
  }
}
```

#### Backend Components:
- **Models:** Supabase amb types TypeScript
- **API:** Next.js API routes RESTful  
- **Queue System:** Per a processos batch
- **Storage:** Documents temporals i finals
- **Logging:** Tracking i analytics

---

### **FASE 4: DECISIÓ + MOTOR DE GENERACIÓ (FINAL)**
**Durada:** 1 setmana decisió + 2-3 setmanes implementació  
**Status:** 🔮 FUTUR

#### Moment de Decisió Informada:

**Criteris d'Avaluació:**
```markdown
## Opcions a Evaluar

### A) Docxtemplater Estàndard (Gratuït)
✅ Pros:
- Cost: €0
- Simplicitat: {{placeholders}} estàndard
- Comunitat activa

❌ Contres:  
- Funcionalitats limitades
- No suporta imatges dinàmiques
- Format de placeholders basic

### B) Docxtemplater Premium (€1,250)
✅ Pros:
- Funcionalitats avançades (imatges, gràfics, Excel)
- Suport professional 
- Documentació completa

❌ Contres:
- Cost significatiu
- Dependència de vendor
- Overhead de funcionalitats no usades

### C) Alternatives (Carbone.io, etc)
✅ Pros:
- Possibles millors preus
- Different feature sets
- Flexibilitat

❌ Contres:
- Learning curve nou
- Menys documentació
- Risc de vendor lock-in diferent
```

#### Implementació Post-Decisió:
1. **Instalar dependencies** del motor escollit
2. **Implementar interfície** DocumentGenerator específica  
3. **Integrar amb Factory** pattern existent
4. **Testing exhaustiu** del motor escollit
5. **Optimitzacions** específiques del motor

---

## 🛡️ AVANTATGES D'AQUESTA ESTRATÈGIA

### **1. Zero Deute Tècnic**
- No escrivim codi que potser haurem de llençar
- Decisions basades en necessitats reals, no assumptions

### **2. Flexibilitat Màxima**
- Canviar de motor sense refactoritzar fases 1-3
- Provar diferents motors en paral·lel
- Negociar millors preus amb vendors

### **3. MVP Més Ràpid**
- Fases 1-3 desenvolupables independentment
- No bloquejos per decisions de compra
- Valor demostrable abans de inversions

### **4. Decisió Informada**  
- Context complet abans de decidir
- ROI calculable per cada opció
- Needs assessment real vs teòric

### **5. Arquitectura Escalable**
- Preparada per a qualsevol motor futur
- Intercanviabilitat sense refactoring
- Abstraccions apropiades

---

## 🎯 TASQUES IMMEDIATES

### **Setmana Actual (Fase 1):**
- [ ] Optimitzar detecció de placeholders amb GPT-5
- [ ] Implementar sistema de confiança per mappings
- [ ] Millorar suggeriments intel·ligents
- [ ] Afegir validació de formats

### **Pròximes 2 Setmanes:**
- [ ] Començar disseny UI components
- [ ] Crear mockups dels 3 panells
- [ ] Implementar workflow visual
- [ ] Preparar preview amb dades mockejades

### **NO Fer Ara:**
- ❌ Instalar docxtemplater (cap versió)
- ❌ Implementar generació real de documents
- ❌ Decidir format de placeholders específic
- ❌ Contractar mòduls premium

---

## 🚨 PRINCIPIS A MANTENIR

1. **Abstracció Correcta:** Interfaces que permetin qualsevol motor
2. **Decisió Tardana:** Decidir quan tinguem màxima informació
3. **Valor Incremental:** Cada fase aporta valor independent
4. **Flexibilitat:** Arquitectura preparada per canvis
5. **Simplicitat:** No over-engineer per futures necessitats

---

*Aquesta estratègia assegura que construïm el projecte correcte abans de construir-lo correctament amb la tecnologia definitiva.*