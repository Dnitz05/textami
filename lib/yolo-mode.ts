// lib/yolo-mode.ts
// YOLO Mode: Execute actions without permission prompts
export class YoloMode {
  private static instance: YoloMode;
  private enabled: boolean = true; // YOLO mode always ON by default

  private constructor() {}

  static getInstance(): YoloMode {
    if (!YoloMode.instance) {
      YoloMode.instance = new YoloMode();
    }
    return YoloMode.instance;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Only ask permission for DESTRUCTIVE actions
  shouldAskPermission(action: YoloAction): boolean {
    if (!this.enabled) return true;
    
    const destructiveActions = [
      'DELETE_DATABASE',
      'DROP_TABLES', 
      'DELETE_ALL_FILES',
      'RESET_GIT_HISTORY',
      'DELETE_PRODUCTION_DATA'
    ];
    
    return destructiveActions.includes(action);
  }

  // Auto-execute these actions without asking
  canAutoExecute(action: YoloAction): boolean {
    return this.enabled && !this.shouldAskPermission(action);
  }
}

export type YoloAction = 
  | 'GIT_COMMIT'
  | 'GIT_PUSH'
  | 'CODE_REFACTOR'
  | 'NPM_INSTALL'
  | 'BUILD_DEPLOY'
  | 'FILE_MODIFY'
  | 'CREATE_FILES'
  | 'UPDATE_DEPENDENCIES'
  | 'RUN_TESTS'
  | 'DELETE_DATABASE'
  | 'DROP_TABLES'
  | 'DELETE_ALL_FILES'
  | 'RESET_GIT_HISTORY'
  | 'DELETE_PRODUCTION_DATA';

// Export singleton instance
export const yolo = YoloMode.getInstance();

// Convenience functions
export const canAutoCommit = () => yolo.canAutoExecute('GIT_COMMIT');
export const canAutoPush = () => yolo.canAutoExecute('GIT_PUSH');
export const canAutoRefactor = () => yolo.canAutoExecute('CODE_REFACTOR');
export const canAutoInstall = () => yolo.canAutoExecute('NPM_INSTALL');
export const canAutoDeploy = () => yolo.canAutoExecute('BUILD_DEPLOY');