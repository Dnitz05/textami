# TEXTAMI - CLAUDE CODE MEMORY

## Project Overview
**Textami** is a document generation system that transforms Word templates and Excel data into personalized documents. The key differentiator is **VISUAL MAPPING** - users visually select Excel columns and Word text to create associations, rather than using predefined {variable} syntax.

## Critical Investment
- **€1,250 investment** in 4 Docxtemplater Premium modules:
  - HTML Module: €250 - `{~~variable}` for rich content
  - Image Module: €250 - `{%variable}` for dynamic images  
  - Style Module: €500 - `{variable:style="..."}` for preserving formatting
  - XLSX Module: €250 - for Excel generation
- **ROI tracking is mandatory** for all implementations

## Technology Stack
- **Framework**: Next.js 15.4.6 with React 19.1.0 and TypeScript
- **Database**: Supabase (PostgreSQL, Storage, Authentication)
- **Document Processing**: Docxtemplater with Premium Modules
- **Excel Processing**: SheetJS (XLSX)
- **File Upload**: React-dropzone
- **Styling**: Tailwind CSS
- **Testing**: Jest with Testing Library

## Critical Workflow (NON-NEGOTIABLE)
✅ **CORRECT WORKFLOW:**
1. User uploads Excel file FIRST
2. User uploads normal Word document (no predefined variables)
3. User VISUALLY MARKS Excel columns and Word text
4. System creates automatic associations
5. Visual marking is the core value proposition worth €1,250

❌ **INCORRECT WORKFLOW:**
- Users uploading Word documents with predefined {variables}
- Manual variable syntax creation
- Any non-visual mapping approach

## Current Implementation Status

### Phase 1 - COMPLETED ✅
- **Visual mapping system** adapted from dnitz05 project (90% reuse)
- **Database schema** with ROI tracking
- **Core components**:
  - `VisualTemplateEditor.tsx` (1,004 lines) - Main visual mapping interface
  - `positionCalculator.ts` (310 lines) - Position calculation utilities
- **API endpoints** for visual mapping CRUD operations
- **Storage integration** with Supabase

### Phase 2 - COMPLETED ✅ (SIMPLIFIED APPROACH)
- **Core Generation Engine**: `templateGenerator.ts` (378 lines)
  - Essential functionality only, no animations or collaboration
  - Premium Modules integration with ROI tracking
  - Batch document generation
  - Format conversion (DOCX/PDF)
- **Generation API**: `/api/visual-mapping/generate/route.ts` (174 lines)
  - Template and mappings fetching
  - Excel data parsing
  - Document generation orchestration
- **Preview System**: `PreviewSystem.tsx` (200 lines)
  - Basic preview functionality
  - ROI visualization
  - Simple generation controls
- **Testing Suite**: Essential tests for core functionality
  - Template generator unit tests
  - API endpoint integration tests
  - Jest configuration

## Key Files and Locations

### Core Generation System
```
/lib/visual-mapping/templateGenerator.ts - Core generation engine
/app/api/visual-mapping/generate/route.ts - Generation API endpoint
/components/visual-mapping/PreviewSystem.tsx - Simple preview system
```

### Visual Mapping System  
```
/components/visual-mapping/VisualTemplateEditor.tsx - Main visual editor
/components/visual-mapping/utils/positionCalculator.ts - Position utilities
```

### API Endpoints
```
/app/api/visual-mapping/templates/route.ts - Template CRUD
/app/api/visual-mapping/templates/[id]/route.ts - Individual template ops
/app/api/visual-mapping/upload-excel/route.ts - Excel upload
/app/api/visual-mapping/upload-word/route.ts - Word upload
```

### Database
```
/migrations/001_create_visual_mappings_table.sql - Database schema
```

### Configuration
```
/lib/docxtemplater/config.ts - Premium Modules configuration
/jest.config.js - Testing configuration
/jest.setup.js - Test environment setup
```

## Commands to Remember
```bash
# Development
npm run dev              # Start development server with Turbo
npm run build           # Production build
npm run type-check      # TypeScript validation

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage

# Code Quality
npm run lint            # ESLint validation
npm run prettier        # Code formatting
```

## Development Guidelines

### Scope Management
- **Phase 2 used SIMPLIFIED approach** after initial scope creep
- Focus on **core functionality only**
- **No animations, collaboration, or advanced UI** until later phases
- Maximum line limits enforced per component

### Premium Modules Usage
- **Always track ROI** for Premium Modules usage
- Calculate module value in visual mappings
- Display ROI statistics to justify €1,250 investment
- Priority order: Style (€500) > HTML (€250) > Image (€250) > Text (€0)

### Code Standards
- **TypeScript strict mode** enforced
- **Essential functionality only** in Phase 2
- **Reuse existing patterns** from dnitz05 project
- **Comprehensive error handling** for file operations
- **Database transactions** for data consistency

### Testing Requirements  
- **Unit tests** for core generation logic
- **Integration tests** for API endpoints
- **Mocking** for external dependencies (Supabase, Docxtemplater)
- **Coverage tracking** for critical paths

## Critical Success Factors
1. **Visual mapping must work flawlessly** - core value proposition
2. **Premium Modules ROI must be tracked and maximized**
3. **Excel + Word visual association is non-negotiable**
4. **Keep implementation simple and focused** (learned from scope creep)
5. **All file operations must be robust with proper error handling**

## Next Steps Guidance
- **Phase 3**: Advanced UI/UX improvements (animations, collaboration)
- **Phase 4**: Performance optimization and scalability  
- **Phase 5**: Enterprise features and integrations
- **Always validate scope** against core visual mapping value proposition