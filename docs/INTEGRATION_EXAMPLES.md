# INTEGRATION EXAMPLES: Google Docs + Instructions
## Real-world implementation examples for API routes

### 📋 OVERVIEW

This document provides **copy-paste ready** examples for integrating the Hierarchical AI Instructions System with existing Google Docs and Sheets API routes.

---

## 🚀 GOOGLE DOCS INTEGRATION

### Current Google Docs Route Enhancement

**File**: `/app/api/google/docs/analyze/route.ts`

#### BEFORE (Current Implementation)
```typescript
export async function POST(request: NextRequest) {
  try {
    // ... existing validation and authentication ...
    
    const analysisResult = await analyzeGoogleDocsHTML(docResult.cleanedHtml, {
      templateId,
      fileName: fileName || docResult.metadata.name,
      performAIAnalysis: true,
    });

    // Save template to database...
    
    return NextResponse.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    // ... error handling ...
  }
}
```

#### AFTER (With Instructions Integration) ✅
```typescript
import { GoogleDocsIntegration } from '@/lib/instructions';

export async function POST(request: NextRequest) {
  try {
    // ... existing validation and authentication ...
    
    // 🔧 PREPARE INSTRUCTION CONTEXT
    const instructionContext = await GoogleDocsIntegration.prepare(
      request, 
      user, 
      templateId
    );

    // ... existing Google Docs processing ...
    
    const analysisResult = await analyzeGoogleDocsHTML(docResult.cleanedHtml, {
      templateId,
      fileName: fileName || docResult.metadata.name,
      performAIAnalysis: true,
    });

    // 🚀 APPLY INSTRUCTIONS IF ENABLED
    let finalResult = analysisResult;
    if (instructionContext.enableInstructions) {
      log.debug('🎯 Applying instructions to Google Docs analysis');
      finalResult = await GoogleDocsIntegration.apply(analysisResult, instructionContext);
    }

    // Save enhanced template to database...
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({
        id: templateId,
        user_id: user.id,
        name: fileName || docResult.metadata.name,
        source_type: 'google-docs',
        // 📊 SAVE ENHANCED CONTENT
        html_content: finalResult.transcription,
        placeholders: finalResult.placeholders,
        sections: finalResult.sections,
        metadata: {
          ...finalResult.metadata,
          // 🏷️ ADD INSTRUCTION METADATA
          instructionsApplied: finalResult.instructionProcessing?.successful || 0,
          enhancedWithInstructions: !!(finalResult.instructionProcessing?.successful)
        }
      });

    // 📦 RETURN ENHANCED RESPONSE
    return NextResponse.json(
      GoogleDocsIntegration.wrap(finalResult, instructionContext)
    );

  } catch (error) {
    // ... existing error handling ...
  }
}
```

### Key Integration Points

1. **Prepare Context**: `GoogleDocsIntegration.prepare(request, user, templateId)`
2. **Apply Instructions**: `GoogleDocsIntegration.apply(result, context)`
3. **Wrap Response**: `GoogleDocsIntegration.wrap(result, context)`

---

## 📊 GOOGLE SHEETS INTEGRATION

### Current Sheets Route Enhancement

**File**: `/app/api/google/sheets/data/route.ts`

#### Enhanced POST Method ✅
```typescript
import { GoogleSheetsIntegration } from '@/lib/instructions';

export async function POST(request: NextRequest) {
  try {
    // ... existing authentication ...

    // 🔧 PREPARE INSTRUCTION CONTEXT FOR SHEETS
    const instructionContext = await GoogleSheetsIntegration.prepare(
      request,
      user,
      templateId
    );

    // ... existing sheets data retrieval ...

    const sheetsService = new GoogleSheetsService(oauth2Client);
    const sheetData = await sheetsService.getSheetData(spreadsheetId, range, sheetName);

    // 🚀 APPLY TABLE/CELL INSTRUCTIONS
    let enhancedResult = { data: sheetData };
    
    if (instructionContext.enableInstructions) {
      log.debug('🎯 Applying table/cell instructions to Google Sheets');
      enhancedResult = await GoogleSheetsIntegration.apply(enhancedResult, instructionContext);
    }

    // 📦 RETURN ENHANCED SHEETS DATA
    return NextResponse.json(
      GoogleSheetsIntegration.wrap(enhancedResult, instructionContext)
    );

  } catch (error) {
    // ... error handling ...
  }
}
```

---

## 🎛️ FRONTEND INTEGRATION

### React Hook for Instructions

**File**: `/hooks/useInstructions.ts`

```typescript
import { useState, useEffect } from 'react';
import { InstructionType, EnhancedAIInstruction } from '@/lib/instructions';

export function useInstructions(templateId: string, userId: string) {
  const [instructions, setInstructions] = useState<EnhancedAIInstruction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInstructions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/instructions?templateId=${templateId}`);
      const data = await response.json();
      setInstructions(data.instructions || []);
    } catch (error) {
      console.error('Failed to fetch instructions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInstruction = async (instructionData: {
    type: InstructionType;
    title: string;
    instruction: string;
    target?: any;
  }) => {
    try {
      const response = await fetch('/api/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          userId,
          ...instructionData
        })
      });
      
      if (response.ok) {
        await fetchInstructions(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to create instruction:', error);
    }
  };

  useEffect(() => {
    if (templateId && userId) {
      fetchInstructions();
    }
  }, [templateId, userId]);

  return {
    instructions,
    loading,
    createInstruction,
    refreshInstructions: fetchInstructions
  };
}
```

### Using Instructions in Components

```typescript
// In your document processing component
import { useInstructions } from '@/hooks/useInstructions';

export function DocumentProcessor({ templateId, userId }) {
  const { instructions, createInstruction } = useInstructions(templateId, userId);
  const [enableInstructions, setEnableInstructions] = useState(true);

  const processDocument = async (documentId: string) => {
    try {
      // 🔧 Include instruction parameters in API call
      const response = await fetch('/api/google/docs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          fileName: 'My Document',
          // 🎯 ENABLE INSTRUCTIONS
          enableInstructions,
          instructionTypes: ['global', 'section', 'paragraph']
        })
      });

      const result = await response.json();
      
      if (result.enhancedWithInstructions) {
        console.log(`✅ Document processed with ${result.instructionContext.appliedInstructions} instructions`);
      }
      
      return result.data;
    } catch (error) {
      console.error('Document processing failed:', error);
    }
  };

  return (
    <div>
      <div>
        <label>
          <input 
            type="checkbox" 
            checked={enableInstructions}
            onChange={(e) => setEnableInstructions(e.target.checked)}
          />
          Enable AI Instructions ({instructions.length} available)
        </label>
      </div>
      
      {/* Document processing UI */}
    </div>
  );
}
```

---

## 🛣️ API ROUTES FOR INSTRUCTION MANAGEMENT

### Instructions CRUD API

**File**: `/app/api/instructions/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { instructionService } from '@/lib/instructions';
import { validateUserSession } from '@/lib/security/auth-middleware';

// GET /api/instructions?templateId=xxx
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await validateUserSession(request);
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    const type = searchParams.get('type');
    const active = searchParams.get('active');

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const instructions = await instructionService.getInstructions(
      templateId,
      user.id,
      {
        type: type as any,
        active: active === 'true' ? true : active === 'false' ? false : undefined
      }
    );

    return NextResponse.json({ 
      success: true,
      instructions,
      count: instructions.length 
    });

  } catch (error) {
    console.error('Failed to fetch instructions:', error);
    return NextResponse.json({ error: 'Failed to fetch instructions' }, { status: 500 });
  }
}

// POST /api/instructions
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await validateUserSession(request);
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, ...instructionData } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const instruction = await instructionService.createInstruction(
      user.id,
      templateId,
      instructionData
    );

    return NextResponse.json({ 
      success: true,
      instruction 
    });

  } catch (error) {
    console.error('Failed to create instruction:', error);
    return NextResponse.json({ error: 'Failed to create instruction' }, { status: 500 });
  }
}
```

**File**: `/app/api/instructions/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { instructionService } from '@/lib/instructions';
import { validateUserSession } from '@/lib/security/auth-middleware';

// PUT /api/instructions/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await validateUserSession(request);
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const instructionId = params.id;
    const updates = await request.json();

    const instruction = await instructionService.updateInstruction(
      instructionId,
      user.id,
      updates
    );

    return NextResponse.json({ 
      success: true,
      instruction 
    });

  } catch (error) {
    console.error('Failed to update instruction:', error);
    return NextResponse.json({ error: 'Failed to update instruction' }, { status: 500 });
  }
}

// DELETE /api/instructions/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await validateUserSession(request);
    if (error || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const instructionId = params.id;
    
    await instructionService.deleteInstruction(instructionId, user.id);

    return NextResponse.json({ 
      success: true,
      message: 'Instruction deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete instruction:', error);
    return NextResponse.json({ error: 'Failed to delete instruction' }, { status: 500 });
  }
}
```

---

## ⚡ QUICK START CHECKLIST

### For Developers Integrating Instructions

- [ ] **Import Integration Helper**:
  ```typescript
  import { GoogleDocsIntegration } from '@/lib/instructions';
  ```

- [ ] **Add Context Preparation**:
  ```typescript
  const context = await GoogleDocsIntegration.prepare(request, user, templateId);
  ```

- [ ] **Apply Instructions**:
  ```typescript
  if (context.enableInstructions) {
    result = await GoogleDocsIntegration.apply(result, context);
  }
  ```

- [ ] **Wrap Response**:
  ```typescript
  return NextResponse.json(GoogleDocsIntegration.wrap(result, context));
  ```

- [ ] **Handle URL Parameters**:
  - `?enableInstructions=true/false`
  - `?instructionTypes=global,section,paragraph`

- [ ] **Update Database Schema**: Ensure templates table includes:
  - `instructionsApplied: number`
  - `enhancedWithInstructions: boolean`

---

## 🔧 DEBUGGING & MONITORING

### Adding Debug Logs

```typescript
import { log } from '@/lib/logger';

// In your API route
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  log.debug('🚀 Starting Google Docs analysis with instructions', {
    templateId,
    userId: user.id,
    enableInstructions: context.enableInstructions
  });

  // ... processing ...

  log.info('✅ Google Docs processing completed', {
    templateId,
    processingTime: Date.now() - startTime,
    instructionsApplied: result.instructionProcessing?.successful || 0,
    placeholdersFound: result.placeholders?.length || 0
  });
}
```

### Monitoring Integration Health

```typescript
// Add to your health check endpoint
export async function GET() {
  const { checkInstructionSystemHealth } = await import('@/lib/instructions');
  
  const systemHealth = await checkInstructionSystemHealth();
  
  return NextResponse.json({
    instructionSystem: systemHealth,
    timestamp: new Date().toISOString()
  });
}
```

---

**🎯 Result**: Copy-paste ready integration examples that maintain the Google-first approach while providing production-ready instruction processing capabilities.