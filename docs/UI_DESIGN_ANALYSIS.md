# TEXTAMI - Anàlisi de Disseny UI de Referència

**Data:** 24 Agost 2025  
**Finalitat:** Guia d'implementació basada en la interfície de referència HTML  
**Origen:** Interface HTML proporcionada per l'usuari

---

## 📋 RESUM EXECUTIU

L'interfície de referència proporciona un **disseny complet i avançat** per a un sistema de generació intel·ligent de documents. Presenta una arquitectura de **3 panells** amb workflow visual, detecció de camps AI, i mapejat intel·ligent.

## 🎯 ARQUITECTURA VISUAL PRINCIPAL

### **Layout de 3 Panells:**
```
┌─────────────┬─────────────────────────┬─────────────────┐
│  Sidebar    │     Main Content        │   Fields &      │
│  Left       │     Document Viewer     │   Data Panel    │
│  (320px)    │     (Flexible)          │   (340px)       │
│             │                         │                 │
│ • Workflow  │ • Top Bar               │ • Camps         │
│ • AI Instr. │ • Document Preview      │   Detectats     │
│ • Knowledge │ • Field Detection       │ • Excel Data    │
└─────────────┴─────────────────────────┴─────────────────┘
```

## 🧩 COMPONENTS CLAU IDENTIFICATS

### 1. **SIDEBAR LEFT - Workflow & AI (320px)**

#### **Tabs System:**
- **Workflow Tab** 📋 - Visual step tracking
- **AI Instructions Tab** 🤖 - General & specific AI rules
- **Knowledge Base Tab** 📚 - Reusable knowledge items

#### **Workflow Steps:**
```jsx
// Step states: pending, active, completed
<div className="workflow-step active">
  <div className="step-icon">📤</div>
  <div className="step-info">
    <div className="step-name">Document Upload</div>
    <div className="step-status">Analitzant amb IA...</div>
  </div>
</div>
```

#### **AI Instructions System:**
- **General Instructions** - Apply to entire document
- **Specific Instructions** - Target sections/paragraphs/fields
- **Knowledge References** - Link to knowledge base items
- **Interactive Cards** - Hover effects, expandable details

### 2. **MAIN CONTENT - Document Viewer**

#### **Top Bar:**
- Document title with icon
- AI Status indicator (active/inactive)
- AI Model display (GPT-5 Vision)

#### **Document Container:**
- **Professional document styling** (Times New Roman, margins)
- **Field Detection System** - Yellow highlights with labels
- **Interactive Dropdowns** - Field mapping options
- **AI Instruction Markers** - Blue circles with tooltips
- **Hover States** - Rich interaction feedback

#### **Field Detection Features:**
```css
.field-detected {
  background: rgba(255, 193, 7, 0.15);
  border-bottom: 2px solid #ffc107;
  position: relative;
}

.field-label {
  position: absolute;
  top: -28px;
  background: #495057;
  color: white;
  padding: 3px 10px;
  border-radius: 4px;
}
```

### 3. **SIDEBAR RIGHT - Fields & Data (340px)**

#### **Sections:**
- **Detected Fields List** - With status indicators
- **Excel Data Preview** - Column list with count
- **Action Buttons** - Primary CTA for generation

#### **Field Items:**
```jsx
<div className="field-item mapped">
  <div className="field-item-header">
    <span className="field-name">Propietari_Nom</span>
    <span className="field-type">text</span>
  </div>
  <div className="field-meta">
    <span className="mapped-to">✓ Mapejat</span>
  </div>
</div>
```

## 🎨 DESIGN SYSTEM ANALYSIS

### **Color Palette:**
- **Primary Blue**: #3b82f6 (buttons, active states)
- **Success Green**: #22c55e (completed, mapped items)
- **Warning Yellow**: #ffc107 (field detection)
- **Background**: #f8f9fa (neutral base)
- **Text**: #2c3e50 (primary), #6c757d (secondary)

### **Typography:**
- **System Font**: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Document Font**: 'Times New Roman', serif (for document content)
- **Font Sizes**: 11px-22px range with semantic hierarchy

### **Spacing & Layout:**
- **Consistent 8px grid system**
- **Padding**: 12px, 16px, 20px, 24px standard increments
- **Border Radius**: 4px, 6px, 8px, 12px progression
- **Shadows**: Subtle elevation system (0-4px blur)

## ⚙️ INTERACTIVE FEATURES ANALYSIS

### **Advanced Interactions:**
1. **Field Dropdown System** - Complex mapping interface
2. **Drag-like Animations** - Transform effects on hover
3. **Modal System** - For AI instruction creation
4. **Tab Switching** - Smooth transitions
5. **Tooltip System** - Contextual help

### **State Management:**
- Visual feedback for all actions
- Progressive disclosure of information
- Consistent loading and success states
- Error handling patterns

## 🚀 IMPLEMENTACIÓ PRIORITÀRIA PER TEXTAMI

### **Phase 1: Core Layout (5-7 dies)**
1. **3-Panel Layout** - Responsive flex system
2. **Basic Document Viewer** - Simple document display
3. **Workflow Steps** - Static visual progress
4. **Field Detection UI** - Basic highlighting system

### **Phase 2: Interactive Features (7-10 dies)**
1. **Tab System** - Sidebar navigation
2. **Field Mapping Dropdowns** - Core mapping functionality
3. **Action Buttons** - Connect to existing APIs
4. **Excel Data Display** - Show uploaded data

### **Phase 3: Advanced Features (10-15 dies)**
1. **AI Instructions System** - Full modal interface
2. **Knowledge Base** - Reference system
3. **Advanced Animations** - Polish interactions
4. **Responsive Design** - Mobile considerations

## 📐 NEXT.JS IMPLEMENTATION STRATEGY

### **Component Architecture:**
```
/components/textami/
├── layout/
│   ├── ThreePanelLayout.tsx
│   ├── SidebarLeft.tsx
│   ├── MainContent.tsx
│   └── SidebarRight.tsx
├── workflow/
│   ├── WorkflowSteps.tsx
│   ├── WorkflowStep.tsx
│   └── StatusIndicator.tsx
├── document/
│   ├── DocumentViewer.tsx
│   ├── FieldHighlight.tsx
│   ├── FieldDropdown.tsx
│   └── AIMarker.tsx
├── fields/
│   ├── FieldsList.tsx
│   ├── FieldItem.tsx
│   ├── ExcelPreview.tsx
│   └── MappingInterface.tsx
└── ai/
    ├── AIInstructions.tsx
    ├── InstructionCard.tsx
    ├── KnowledgeBase.tsx
    └── InstructionModal.tsx
```

### **State Management:**
- **Zustand Store** per workflow state
- **React Query** per API calls
- **Context Providers** per UI state

### **CSS Strategy:**
- **Tailwind CSS** amb custom components
- **CSS Modules** per complex components
- **Framer Motion** per animations

## 🎯 ADAPTACIONS PER TEXTAMI MVP

### **Simplificacions Necessàries:**
1. **Remove Knowledge Base** - Not needed for MVP
2. **Simplify AI Instructions** - Basic text input only
3. **Remove Advanced Animations** - Focus on core functionality
4. **Static Workflow** - No dynamic step management

### **Core Features a Mantenir:**
1. **3-Panel Layout** - Essential for usability
2. **Field Detection** - Core AI functionality
3. **Mapping Dropdowns** - Critical for user control
4. **Document Preview** - Must-have for validation
5. **Status Indicators** - Important for UX

## 📊 TECHNICAL SPECIFICATIONS

### **Performance Requirements:**
- **Layout Shift**: Minimize CLS with fixed dimensions
- **Smooth Interactions**: 60fps animations
- **Responsive**: Mobile-first considerations
- **Accessibility**: ARIA labels, keyboard navigation

### **Browser Compatibility:**
- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+
- **CSS Grid/Flexbox**: Full support required
- **CSS Custom Properties**: Variable support needed

---

**CONCLUSIÓ**: La interfície de referència proporciona una base sólida per al desenvolupament de Textami amb patrons d'interacció avançats i un sistema de disseny coherent. La implementació per fases permetrà obtenir un MVP funcional ràpidament mentre es mantenen les bases per funcionalitats avançades futures.