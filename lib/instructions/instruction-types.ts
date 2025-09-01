// Enhanced Instruction System Types
// Supports hierarchical instructions from global down to individual cells

export type InstructionType = 'global' | 'section' | 'paragraph' | 'table' | 'cell';

export type InstructionScope = 'document' | 'section' | 'element' | 'table' | 'cell';

export interface InstructionTarget {
  type: InstructionType;
  selector?: string;          // CSS selector for targeting
  elementId?: string;         // Unique element ID  
  sectionId?: string;         // Section identifier
  tableId?: string;           // Table identifier
  cellCoordinates?: {         // For cell-specific instructions
    tableId: string;
    rowIndex: number;
    columnIndex: number;
    cellId?: string;
  };
}

export interface EnhancedAIInstruction {
  id: string;
  type: InstructionType;
  scope: InstructionScope;
  title: string;
  instruction: string;
  target: InstructionTarget;
  
  // Execution properties
  isActive: boolean;
  priority: number;           // For conflict resolution (1-10, higher = more priority)
  executionOrder: number;     // Determines execution sequence within same type
  
  // Context and metadata
  variables?: string[];       // Variables this instruction depends on
  conditions?: string[];      // Conditions for when to apply this instruction
  
  // Content processing options
  preserveFormatting?: boolean;
  variableSubstitution?: boolean;
  contextAware?: boolean;
  
  // Template and example data
  promptTemplate?: string;    // Template with placeholders
  exampleBefore?: string;     // Example content before instruction
  exampleAfter?: string;      // Example content after instruction
  
  // Audit and versioning
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
  
  // Performance and analytics
  averageExecutionTime?: number;
  successRate?: number;
  lastExecuted?: Date;
}

// Instruction execution context
export interface InstructionExecutionContext {
  documentId: string;
  templateId?: string;
  
  // Current document state
  originalContent: string;
  currentContent: string;
  
  // Variable context
  variables: Record<string, any>;
  mappings: Record<string, string>;
  
  // Section context (if applicable)
  currentSection?: {
    id: string;
    title: string;
    content: string;
  };
  
  // Table context (if applicable)
  currentTable?: {
    id: string;
    headers: string[];
    rows: any[][];
    metadata?: any;
  };
  
  // Cell context (if applicable)
  currentCell?: {
    tableId: string;
    rowIndex: number;
    columnIndex: number;
    value: any;
    header: string;
  };
  
  // Knowledge and reference documents
  knowledgeDocuments?: Array<{
    filename: string;
    content: string;
    type: string;
    description: string;
  }>;
  
  // Execution metadata
  executionLevel: number;     // Depth level (0 = global, 1 = section, etc.)
  parentInstructions: EnhancedAIInstruction[];
  siblingInstructions: EnhancedAIInstruction[];
}

// Instruction execution result
export interface InstructionExecutionResult {
  instruction: EnhancedAIInstruction;
  success: boolean;
  
  // Content changes
  originalContent: string;
  modifiedContent: string;
  contentChanges: any[]; // Simplified type for now
  
  // Execution metadata
  executionTime: number;
  tokensUsed?: number;
  aiModel?: string;
  confidence?: number;
  
  // Targeting information
  targetElement?: string;
  affectedElements: string[];
  
  // Error handling
  errors: string[];
  warnings: string[];
  
  // Variable substitutions made
  variableSubstitutions?: Record<string, string>;
  
  // Context used
  contextUsed: {
    variables: string[];
    knowledgeDocuments: string[];
    parentInstructions: string[];
  };
  
  // Execution timestamp and audit
  executedAt: Date;
  executedBy: string;
}

// Batch instruction execution
export interface InstructionBatch {
  id: string;
  instructions: EnhancedAIInstruction[];
  executionOrder: EnhancedAIInstruction[];
  
  // Batch configuration
  parallelExecution?: boolean;
  stopOnError?: boolean;
  validateAfterEach?: boolean;
  
  // Batch context
  context: InstructionExecutionContext;
  
  // Results tracking
  results?: InstructionExecutionResult[];
  batchStatus: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  
  // Performance metrics
  totalExecutionTime?: number;
  successfulInstructions?: number;
  failedInstructions?: number;
  
  startedAt?: Date;
  completedAt?: Date;
}

// Instruction validation
export interface InstructionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  
  // Specific validation categories  
  targeting: {
    isValid: boolean;
    canResolveTarget: boolean;
    targetExists: boolean;
    conflicts: string[];
  };
  
  syntax: {
    isValid: boolean;
    variablesResolved: boolean;
    templateValid: boolean;
    issues: string[];
  };
  
  context: {
    isValid: boolean;
    hasRequiredContext: boolean;
    dependenciesMet: boolean;
    missingDependencies: string[];
  };
  
  performance: {
    estimatedExecutionTime: number;
    complexityScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

// Instruction conflict resolution
export interface InstructionConflict {
  type: 'targeting' | 'priority' | 'dependency' | 'variable' | 'content';
  severity: 'warning' | 'error' | 'blocking';
  
  instructions: EnhancedAIInstruction[];
  description: string;
  
  // Resolution options
  resolutionOptions: Array<{
    type: 'priority' | 'merge' | 'sequence' | 'exclude';
    description: string;
    impact: string;
    recommended: boolean;
  }>;
  
  // Auto-resolution (if possible)
  autoResolved?: boolean;
  resolution?: string;
}

// Instruction performance analytics
export interface InstructionAnalytics {
  instruction: EnhancedAIInstruction;
  
  // Usage statistics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  
  // Performance trends
  executionTrend: Array<{
    date: Date;
    executionTime: number;
    success: boolean;
    context: string;
  }>;
  
  // Content impact analysis
  averageContentChange: number;
  contentImpactScore: number;
  
  // User feedback and ratings
  userRatings?: Array<{
    rating: number;
    feedback?: string;
    date: Date;
  }>;
  averageRating?: number;
  
  // Optimization suggestions
  optimizationSuggestions: string[];
  
  // Comparative analysis
  similarInstructions?: Array<{
    instruction: EnhancedAIInstruction;
    similarity: number;
    performance: number;
  }>;
}