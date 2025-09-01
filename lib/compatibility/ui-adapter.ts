// lib/compatibility/ui-adapter.ts
// EMERGENCY: UI adapter to handle unified responses in existing UI components
import type { UnifiedTemplate } from './unified-system';

// Legacy interface that UI expects (from DOCX system)
interface LegacyTemplateResponse {
  success: boolean;
  templateId: string;
  fileName: string;
  size: number;
  storagePath: string;
  message: string;
}

interface LegacyAIAnalysis {
  placeholders: Array<{
    text: string;
    confidence: number;
    type?: string;
    originalMatch?: string;
    position?: number;
  }>;
  transcription: string;
  htmlPreview?: string;
}

// Convert unified template back to legacy format for UI compatibility
export function adaptUnifiedForUI(unifiedTemplate: UnifiedTemplate): {
  template: LegacyTemplateResponse;
  aiAnalysis: LegacyAIAnalysis;
} {
  const sourceData = unifiedTemplate.sourceData as any;
  
  return {
    template: {
      success: true,
      templateId: unifiedTemplate.templateId,
      fileName: unifiedTemplate.fileName,
      size: sourceData.fileSize || 0,
      storagePath: sourceData.storageUrl || sourceData.googleDocId || '',
      message: `${unifiedTemplate.sourceType === 'google-docs' ? 'Google Doc' : 'DOCX'} processed successfully`
    },
    aiAnalysis: {
      placeholders: unifiedTemplate.placeholders.map(p => ({
        text: p.text,
        confidence: p.confidence,
        type: p.type,
        originalMatch: p.text,
        position: p.position
      })),
      transcription: unifiedTemplate.transcription,
      htmlPreview: generateHtmlPreview(unifiedTemplate)
    }
  };
}

// Generate HTML preview with placeholder highlighting for UI
function generateHtmlPreview(template: UnifiedTemplate): string {
  let html = template.transcription;
  
  // Add placeholder highlighting
  template.placeholders.forEach((placeholder, index) => {
    const regex = new RegExp(escapeRegex(placeholder.text), 'gi');
    html = html.replace(regex, (match) => 
      `<span class="placeholder-highlight bg-yellow-200 border border-yellow-400 rounded px-1" 
             data-placeholder="${placeholder.text}" 
             data-type="${placeholder.type}"
             title="Placeholder: ${placeholder.text} (${placeholder.confidence}% confidence)">${match}</span>`
    );
  });
  
  return html;
}

// Helper to escape regex special characters
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Adapt UI state updates to work with unified system
export function createUIStateUpdater() {
  return {
    updateAIState: (unifiedTemplate: UnifiedTemplate, setAiState: any) => {
      const adapted = adaptUnifiedForUI(unifiedTemplate);
      
      setAiState({
        processing: false,
        template: adapted.template,
        aiAnalysis: adapted.aiAnalysis,
        error: null,
        sourceType: unifiedTemplate.sourceType,
        googleDocId: unifiedTemplate.sourceType === 'google-docs' 
          ? (unifiedTemplate.sourceData as any).googleDocId 
          : undefined
      });
    },
    
    validateStateConsistency: (aiState: any): boolean => {
      // Check that critical fields exist for UI compatibility
      const required = ['template', 'aiAnalysis'];
      for (const field of required) {
        if (!aiState[field]) {
          console.error(`UI State validation failed: missing ${field}`);
          return false;
        }
      }
      
      // Check that aiAnalysis has required fields
      if (!aiState.aiAnalysis.transcription) {
        console.error('UI State validation failed: missing transcription');
        return false;
      }
      
      if (!Array.isArray(aiState.aiAnalysis.placeholders)) {
        console.error('UI State validation failed: placeholders not array');
        return false;
      }
      
      return true;
    }
  };
}

// Emergency fallback when unified system fails
export function createEmergencyFallback(sourceType: 'docx' | 'google-docs', fileName: string) {
  return {
    template: {
      success: true,
      templateId: `emergency_${Date.now()}`,
      fileName,
      size: 0,
      storagePath: '',
      message: `${sourceType} processing failed - using fallback`
    },
    aiAnalysis: {
      placeholders: [],
      transcription: `<div class="p-8 text-center text-orange-600">
        <div class="text-4xl mb-4">⚠️</div>
        <h3 class="text-lg font-semibold mb-2">${fileName}</h3>
        <p>Document processed with emergency fallback.</p>
        <p class="text-sm mt-2">Some features may be limited.</p>
      </div>`,
      htmlPreview: undefined
    }
  };
}