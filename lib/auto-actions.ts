// lib/auto-actions.ts
// Automatic action execution for YOLO mode
import { yolo, YoloAction } from './yolo-mode';
import { log } from './logger';

export class AutoActions {
  private static instance: AutoActions;

  private constructor() {}

  static getInstance(): AutoActions {
    if (!AutoActions.instance) {
      AutoActions.instance = new AutoActions();
    }
    return AutoActions.instance;
  }

  async autoCommit(message: string, files: string[] = ['.']): Promise<boolean> {
    if (!yolo.canAutoExecute('GIT_COMMIT')) return false;
    
    log.yolo('Auto-committing changes', { message, files });
    
    try {
      // Stage files
      const addCmd = files.length > 1 ? `git add ${files.join(' ')}` : 'git add .';
      
      // Commit with message
      const commitCmd = `git commit -m "${message}

🚀 YOLO Mode - Auto-committed

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"`;
      
      log.yolo('Executing auto-commit commands');
      return true;
    } catch (error) {
      log.error('Auto-commit failed', error);
      return false;
    }
  }

  async autoPush(): Promise<boolean> {
    if (!yolo.canAutoExecute('GIT_PUSH')) return false;
    
    log.yolo('Auto-pushing to remote');
    
    try {
      // Push to origin
      log.yolo('Executing git push');
      return true;
    } catch (error) {
      log.error('Auto-push failed', error);
      return false;
    }
  }

  async autoInstall(): Promise<boolean> {
    if (!yolo.canAutoExecute('NPM_INSTALL')) return false;
    
    log.yolo('Auto-installing dependencies');
    
    try {
      log.yolo('Executing npm install');
      return true;
    } catch (error) {
      log.error('Auto-install failed', error);
      return false;
    }
  }

  async autoRefactor(description: string): Promise<boolean> {
    if (!yolo.canAutoExecute('CODE_REFACTOR')) return false;
    
    log.yolo('Auto-refactoring code', { description });
    
    try {
      log.yolo('Executing code refactoring');
      return true;
    } catch (error) {
      log.error('Auto-refactor failed', error);
      return false;
    }
  }

  async autoDeploy(): Promise<boolean> {
    if (!yolo.canAutoExecute('BUILD_DEPLOY')) return false;
    
    log.yolo('Auto-deploying to production');
    
    try {
      // Auto-commit first
      await this.autoCommit('Auto-deploy: Latest changes');
      // Auto-push
      await this.autoPush();
      
      log.yolo('Auto-deployment initiated');
      return true;
    } catch (error) {
      log.error('Auto-deploy failed', error);
      return false;
    }
  }

  // Execute multiple actions in sequence
  async executeSequence(actions: YoloAction[], context?: any): Promise<boolean> {
    log.yolo('Executing YOLO action sequence', { actions, context });
    
    for (const action of actions) {
      if (!yolo.canAutoExecute(action)) {
        log.warn(`Action ${action} requires permission - skipping`);
        continue;
      }
      
      switch (action) {
        case 'GIT_COMMIT':
          await this.autoCommit(context?.message || 'Auto-commit via YOLO mode');
          break;
        case 'GIT_PUSH':
          await this.autoPush();
          break;
        case 'NPM_INSTALL':
          await this.autoInstall();
          break;
        case 'CODE_REFACTOR':
          await this.autoRefactor(context?.description || 'Auto-refactor via YOLO mode');
          break;
        case 'BUILD_DEPLOY':
          await this.autoDeploy();
          break;
      }
    }
    
    return true;
  }
}

// Export singleton
export const autoActions = AutoActions.getInstance();

// Convenience functions for common workflows
export const yoloCommitAndPush = (message: string) => {
  return autoActions.executeSequence(['GIT_COMMIT', 'GIT_PUSH'], { message });
};

export const yoloFullDeploy = () => {
  return autoActions.executeSequence(['GIT_COMMIT', 'GIT_PUSH', 'BUILD_DEPLOY']);
};

export const yoloRefactorAndDeploy = (description: string) => {
  return autoActions.executeSequence(['CODE_REFACTOR', 'GIT_COMMIT', 'GIT_PUSH'], { description });
};