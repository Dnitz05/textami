# TEXTAMI - Implementation Roadmap basada en UI Reference

**Data:** 24 Agost 2025  
**Objectiu:** Pla d'implementació per crear la interfície avançada de Textami  
**Status Actual:** Backend 80% implementat, Frontend 20% implementat  

---

## 🎯 VISIÓ GENERAL

Transformar l'actual interfície básica de Textami (`/app/generator/page.tsx`) en una interfície professional de 3 panells basada en la referència HTML proporcionada, mantenint la compatibilitat amb els APIs existents.

## 📊 ASSESSMENT ACTUAL vs TARGET

### **ACTUAL (Textami MVP):**
```
┌────────────────────────────────────┐
│          Simple Cards Layout       │
│                                    │
│  [Step 1] [Step 2] [Step 3]      │
│     ✅      🔄      ❌           │
│                                    │
│  Only DOCX upload functional      │
└────────────────────────────────────┘
```

### **TARGET (UI Reference):**
```
┌─────────────┬─────────────────────────┬─────────────────┐
│  Workflow   │     Document Viewer     │   Fields &      │
│  & AI       │     with Detection      │   Data Panel    │
│  (320px)    │     (Flexible)          │   (340px)       │
└─────────────┴─────────────────────────┴─────────────────┘
```

## 🚧 FASES D'IMPLEMENTACIÓ

### **🔥 FASE 1: Layout Foundation (5-7 dies)**

#### **1.1 Three-Panel Layout Component**
```tsx
// /components/textami/ThreePanelLayout.tsx
interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  mainContent: React.ReactNode; 
  rightPanel: React.ReactNode;
}
```

#### **1.2 Sidebar Left Structure**
```tsx
// /components/textami/SidebarLeft.tsx
- Logo & branding
- Tab system (Workflow/AI/Knowledge)
- Workflow steps visual
- Basic styling matching reference
```

#### **1.3 Main Content Structure**
```tsx
// /components/textami/MainContent.tsx  
- Top bar amb document info
- Document viewer container
- AI status indicator
- Basic document display
```

#### **1.4 Sidebar Right Structure**
```tsx
// /components/textami/SidebarRight.tsx
- Fields list section
- Excel data preview
- Action buttons
- Status indicators
```

#### **Tasks Fase 1:**
- [ ] Create `ThreePanelLayout.tsx`
- [ ] Migrate current `/generator/page.tsx` to new layout
- [ ] Implement responsive flexbox system
- [ ] Add basic Tailwind styling
- [ ] Test layout on different screen sizes

---

### **⚡ FASE 2: Core Functionality (7-10 dies)**

#### **2.1 Workflow Integration**
- Connect workflow steps to actual backend API calls
- Visual progress tracking with real states
- Error handling and loading states

#### **2.2 Document Viewer Enhancement**
```tsx
// /components/textami/DocumentViewer.tsx
- Display document content from AI analysis
- Basic field highlighting
- Scrollable document container
- Responsive document scaling
```

#### **2.3 Fields Detection Display**
```tsx
// /components/textami/FieldsList.tsx  
- Show placeholders from `/api/ai-docx/analyze`
- Field type indicators
- Mapping status display
- Count badges and stats
```

#### **2.4 Excel Data Integration**
```tsx
// /components/textami/ExcelPreview.tsx
- Display columns from `/api/ai-docx/excel`
- Data preview with sample rows
- Column type detection
- File info display
```

#### **Tasks Fase 2:**
- [ ] Integrate with existing `/api/ai-docx/analyze`
- [ ] Connect Excel upload to `/api/ai-docx/excel`
- [ ] Display AI analysis results in UI
- [ ] Implement basic field mapping interface
- [ ] Add action buttons functionality

---

### **🎨 FASE 3: Advanced Interactions (10-15 dies)**

#### **3.1 Field Mapping System**
```tsx
// /components/textami/FieldMapping.tsx
- Dropdown menus per field mapping
- Drag & drop interface (opcional)
- Visual mapping connections
- Confidence score display
```

#### **3.2 AI Integration UI**
```tsx
// /components/textami/AIInterface.tsx
- AI status indicators
- Processing states
- Error handling amb retry
- Success feedback
```

#### **3.3 Interactive Document**
```tsx
// /components/textami/InteractiveDocument.tsx
- Clickable field highlights
- Hover states and tooltips
- Field editing inline
- Visual feedback
```

#### **Tasks Fase 3:**
- [ ] Build mapping dropdown system
- [ ] Implement field-to-column connections
- [ ] Add hover and interaction effects
- [ ] Create AI processing indicators
- [ ] Test complete workflow end-to-end

---

### **✨ FASE 4: Polish & Advanced Features (15-20 dies)**

#### **4.1 Animations & Micro-interactions**
- Smooth transitions between states
- Loading animations
- Success/error animations
- Hover effects and feedback

#### **4.2 Modal Systems**
- Settings modal per configurations
- Help system amb tooltips
- Confirmation dialogs
- Advanced options

#### **4.3 Responsive Design**
- Mobile-first approach
- Tablet layout adaptations
- Desktop optimizations
- Touch interactions

#### **Tasks Fase 4:**
- [ ] Add Framer Motion animations
- [ ] Implement modal system
- [ ] Create responsive breakpoints
- [ ] Add keyboard navigation
- [ ] Comprehensive testing

---

## 🛠 TECHNICAL IMPLEMENTATION PLAN

### **Component Architecture:**
```
/app/generator-v2/
├── page.tsx (New advanced interface)
├── components/
│   ├── layout/
│   │   ├── ThreePanelLayout.tsx
│   │   ├── SidebarLeft.tsx
│   │   ├── MainContent.tsx
│   │   └── SidebarRight.tsx
│   ├── workflow/
│   │   ├── WorkflowSteps.tsx
│   │   ├── WorkflowStep.tsx
│   │   └── ProgressBar.tsx
│   ├── document/
│   │   ├── DocumentViewer.tsx
│   │   ├── FieldHighlight.tsx
│   │   └── DocumentContent.tsx
│   ├── fields/
│   │   ├── FieldsList.tsx
│   │   ├── FieldItem.tsx
│   │   ├── ExcelPreview.tsx
│   │   └── MappingInterface.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── Dropdown.tsx
│       └── LoadingSpinner.tsx
└── hooks/
    ├── useWorkflow.ts
    ├── useFieldMapping.ts
    └── useDocumentAnalysis.ts
```

### **State Management Strategy:**
```tsx
// Global state with Zustand
interface TextamiStore {
  // Workflow state
  currentStep: WorkflowStep;
  setCurrentStep: (step: WorkflowStep) => void;
  
  // Document state
  document: DocumentAnalysis | null;
  setDocument: (doc: DocumentAnalysis) => void;
  
  // Fields state
  detectedFields: Field[];
  fieldMappings: FieldMapping[];
  updateMapping: (fieldId: string, column: string) => void;
  
  // Excel state
  excelData: ExcelData | null;
  setExcelData: (data: ExcelData) => void;
}
```

### **API Integration:**
- **Reuse existing endpoints**: `/api/ai-docx/*`
- **Enhance response handling** with better error states
- **Add optimistic updates** for better UX
- **Implement loading states** throughout UI

## 📝 MIGRATION STRATEGY

### **Phase A: Parallel Development**
1. Keep current `/generator/page.tsx` functional
2. Create new `/generator-v2/page.tsx` amb advanced UI
3. Test thoroughly abans de migration

### **Phase B: Gradual Migration**
1. Add feature flag per switch between versions
2. A/B testing amb users (if applicable)
3. Monitor performance and usability

### **Phase C: Full Replacement**
1. Replace `/generator/page.tsx` amb advanced version
2. Remove old components
3. Update navigation and links

## ⚡ QUICK WIN OPPORTUNITIES

### **Immediate Improvements (2-3 dies):**
1. **Better Visual Layout** - Even basic 3-panel layout
2. **Progress Indicators** - Visual workflow steps
3. **Loading States** - Better user feedback
4. **Error Handling** - User-friendly error messages

### **Medium Term (1 setmana):**
1. **Field Display** - Show detected fields clearly
2. **Excel Integration** - Display uploaded Excel data
3. **Status Updates** - Real-time processing feedback

## 🎯 SUCCESS METRICS

### **User Experience:**
- **Reduced Confusion**: Clear workflow steps
- **Faster Task Completion**: Visual guidance
- **Error Recovery**: Better error handling
- **Professional Feel**: Polished interface

### **Technical:**
- **Performance**: <3s initial load
- **Responsiveness**: 60fps interactions
- **Accessibility**: WCAG 2.1 AA compliance
- **Browser Support**: 95%+ modern browsers

## 🚀 NEXT IMMEDIATE ACTIONS

### **Week 1:**
1. Create `ThreePanelLayout` component
2. Migrate current generator to new layout
3. Implement basic workflow steps display
4. Connect to existing analyze API

### **Week 2:**
1. Build fields display components
2. Integrate Excel data preview
3. Add basic mapping interface
4. Test complete flow

### **Dependencies:**
- **Existing APIs**: All functional ✅
- **UI Library**: Use existing Tailwind + ShadCN ✅
- **State Management**: Add Zustand if needed
- **Animation**: Add Framer Motion if needed

---

**CONCLUSIÓ**: La implementació d'aquesta interfície avançada convertirà Textami d'un MVP bàsic a una aplicació professional amb UX comparable a eines enterprise, mantenint la simplicitat del backend AI-first existent.