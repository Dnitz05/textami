// lib/template-state.ts
// Template state management utilities

export interface TemplateState {
  templateId: string;
  status: 'uploaded' | 'analyzed' | 'mapped' | 'frozen' | 'production';
  analyzedAt?: string;
  mappedAt?: string;
  frozenAt?: string;
  frozenTemplateUrl?: string;
  successfulReplacements?: number;
  totalReplacements?: number;
  manualReviewRequired?: string[];
  mappings?: Record<string, string>;
}

export class TemplateStateManager {
  private static getStorageKey(templateId: string, type: string): string {
    return `textami_${type}_${templateId}`;
  }

  static getTemplateState(templateId: string): TemplateState {
    const baseState: TemplateState = {
      templateId,
      status: 'uploaded'
    };

    try {
      // Check if analyzed
      const analysis = localStorage.getItem(this.getStorageKey(templateId, 'analysis'));
      if (analysis) {
        baseState.status = 'analyzed';
        baseState.analyzedAt = JSON.parse(analysis).timestamp;
      }

      // Check if mapped
      const mappings = localStorage.getItem(this.getStorageKey(templateId, 'mappings'));
      if (mappings) {
        const mappingData = JSON.parse(mappings);
        if (Object.keys(mappingData).length > 0) {
          baseState.status = 'mapped';
          baseState.mappings = mappingData;
          baseState.mappedAt = new Date().toISOString();
        }
      }

      // Check if frozen
      const frozen = localStorage.getItem(this.getStorageKey(templateId, 'frozen'));
      if (frozen) {
        const frozenData = JSON.parse(frozen);
        baseState.status = 'frozen';
        baseState.frozenAt = frozenData.frozenAt;
        baseState.frozenTemplateUrl = frozenData.frozenTemplateUrl;
        baseState.successfulReplacements = frozenData.successfulReplacements;
        baseState.totalReplacements = frozenData.totalReplacements;
        baseState.manualReviewRequired = frozenData.manualReviewRequired;
      }

      return baseState;

    } catch (error) {
      console.error('Error loading template state:', error);
      return baseState;
    }
  }

  static saveAnalysisState(templateId: string, analysisData: any): void {
    try {
      localStorage.setItem(
        this.getStorageKey(templateId, 'analysis'),
        JSON.stringify({
          ...analysisData,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error saving analysis state:', error);
    }
  }

  static saveMappingState(templateId: string, mappings: Record<string, string>): void {
    try {
      localStorage.setItem(
        this.getStorageKey(templateId, 'mappings'),
        JSON.stringify(mappings)
      );
    } catch (error) {
      console.error('Error saving mapping state:', error);
    }
  }

  static saveFrozenState(templateId: string, frozenData: {
    frozenAt: string;
    frozenTemplateUrl: string;
    successfulReplacements: number;
    totalReplacements: number;
    manualReviewRequired: string[];
  }): void {
    try {
      localStorage.setItem(
        this.getStorageKey(templateId, 'frozen'),
        JSON.stringify(frozenData)
      );
    } catch (error) {
      console.error('Error saving frozen state:', error);
    }
  }

  static clearTemplateState(templateId: string): void {
    try {
      const keys = ['analysis', 'mappings', 'frozen'];
      keys.forEach(key => {
        localStorage.removeItem(this.getStorageKey(templateId, key));
      });
    } catch (error) {
      console.error('Error clearing template state:', error);
    }
  }

  static getAllTemplates(): TemplateState[] {
    try {
      const templates: TemplateState[] = [];
      const keys = Object.keys(localStorage);
      
      const templateIds = new Set<string>();
      keys.forEach(key => {
        if (key.startsWith('textami_')) {
          const parts = key.split('_');
          if (parts.length >= 3) {
            const templateId = parts.slice(2).join('_');
            templateIds.add(templateId);
          }
        }
      });

      templateIds.forEach(templateId => {
        templates.push(this.getTemplateState(templateId));
      });

      return templates.sort((a, b) => {
        const aTime = a.frozenAt || a.mappedAt || a.analyzedAt || '';
        const bTime = b.frozenAt || b.mappedAt || b.analyzedAt || '';
        return bTime.localeCompare(aTime);
      });

    } catch (error) {
      console.error('Error getting all templates:', error);
      return [];
    }
  }
}

export default TemplateStateManager;