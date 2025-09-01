// Instruction Service Tests
// Comprehensive test suite for the instruction service layer

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InstructionService, instructionService } from '../instruction-service';
import { EnhancedAIInstruction, InstructionType, InstructionExecutionContext } from '../instruction-types';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: mockInstructionData, 
            error: null 
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: mockInstructionData, 
            error: null 
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockReturnThis()
      }))
    })),
    rpc: jest.fn(() => Promise.resolve({ error: null }))
  }))
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

const mockInstructionData = {
  id: 'test-instruction-id',
  template_id: 'test-template-id',
  user_id: 'test-user-id',
  title: 'Test Instruction',
  instruction: 'Convert all text to uppercase',
  instruction_type: 'global',
  instruction_scope: 'document',
  target_config: { selector: 'all' },
  is_active: true,
  priority: 5,
  execution_order: 1,
  preserve_formatting: true,
  variable_substitution: true,
  context_aware: true,
  dependent_variables: [],
  execution_conditions: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'test-user-id',
  version: 1
};

describe('InstructionService', () => {
  let service: InstructionService;

  beforeEach(() => {
    service = new InstructionService();
    jest.clearAllMocks();
  });

  describe('createInstruction', () => {
    test('should create a new instruction successfully', async () => {
      const userId = 'test-user-id';
      const templateId = 'test-template-id';
      const instructionData = {
        type: 'global' as InstructionType,
        scope: 'document' as const,
        title: 'Test Global Instruction',
        instruction: 'Make all text bold',
        target: { selector: 'all', elementType: 'global' as const },
        isActive: true,
        priority: 5
      };

      const result = await service.createInstruction(userId, templateId, instructionData);

      expect(result).toBeDefined();
      expect(result.id).toBe('test-instruction-id');
      expect(result.title).toBe('Test Instruction');
      expect(result.type).toBe('global');
    });

    test('should throw error for invalid instruction data', async () => {
      const userId = 'test-user-id';
      const templateId = 'test-template-id';
      const invalidData = {
        // Missing required fields
      };

      await expect(service.createInstruction(userId, templateId, invalidData))
        .rejects.toThrow();
    });
  });

  describe('getInstructions', () => {
    test('should retrieve instructions for a template', async () => {
      const templateId = 'test-template-id';
      const userId = 'test-user-id';

      const result = await service.getInstructions(templateId, userId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should filter instructions by type', async () => {
      const templateId = 'test-template-id';
      const userId = 'test-user-id';
      const filters = { type: 'global' as InstructionType };

      const result = await service.getInstructions(templateId, userId, filters);

      expect(result).toBeDefined();
    });
  });

  describe('executeInstruction', () => {
    test('should execute global instruction successfully', async () => {
      const instruction: EnhancedAIInstruction = {
        id: 'test-id',
        type: 'global',
        scope: 'document',
        title: 'Test Global',
        instruction: 'Make text bold',
        target: { selector: 'all', elementType: 'global' },
        isActive: true,
        priority: 5,
        executionOrder: 1,
        variables: [],
        conditions: [],
        preserveFormatting: true,
        variableSubstitution: true,
        contextAware: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        version: 1
      };

      const context: InstructionExecutionContext = {
        templateId: 'test-template',
        documentId: 'test-doc',
        currentContent: '<p>Hello world</p>',
        originalContent: '<p>Hello world</p>',
        variables: {},
        knowledgeDocuments: [],
        executionLevel: 0,
        parentInstructions: []
      };

      // Mock the IA processing engine
      const mockResult = {
        instruction,
        success: true,
        originalContent: context.currentContent,
        modifiedContent: '<p><strong>Hello world</strong></p>',
        contentChanges: [],
        executionTime: 1500,
        errors: [],
        warnings: [],
        targetElement: 'document',
        affectedElements: ['document'],
        contextUsed: {
          variables: [],
          knowledgeDocuments: [],
          parentInstructions: []
        },
        executedAt: new Date(),
        executedBy: 'test-doc'
      };

      // Mock IA processing engine import
      jest.doMock('../ia-processing-engine', () => ({
        iaProcessingEngine: {
          executeGlobalInstruction: jest.fn().mockResolvedValue(mockResult)
        }
      }));

      const result = await service.executeInstruction(instruction, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.instruction).toBe(instruction);
    });

    test('should handle execution errors gracefully', async () => {
      const instruction: EnhancedAIInstruction = {
        id: 'test-id',
        type: 'global',
        scope: 'document',
        title: 'Failing Instruction',
        instruction: 'This will fail',
        target: { selector: 'all', elementType: 'global' },
        isActive: true,
        priority: 5,
        executionOrder: 1,
        variables: [],
        conditions: [],
        preserveFormatting: true,
        variableSubstitution: true,
        contextAware: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        version: 1
      };

      const context: InstructionExecutionContext = {
        templateId: 'test-template',
        documentId: 'test-doc',
        currentContent: '<p>Hello world</p>',
        originalContent: '<p>Hello world</p>',
        variables: {},
        knowledgeDocuments: [],
        executionLevel: 0,
        parentInstructions: []
      };

      // Mock IA processing engine to throw error
      jest.doMock('../ia-processing-engine', () => ({
        iaProcessingEngine: {
          executeGlobalInstruction: jest.fn().mockRejectedValue(new Error('AI service failed'))
        }
      }));

      const result = await service.executeInstruction(instruction, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toContain('AI service failed');
    });
  });

  describe('validateInstruction', () => {
    test('should validate correct instruction data', async () => {
      const instructionData = {
        title: 'Valid Instruction',
        instruction: 'Do something useful',
        type: 'global' as InstructionType,
        priority: 5,
        target: { selector: 'all' }
      };

      const result = await service.validateInstruction(instructionData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid instruction data', async () => {
      const invalidData = {
        // Missing required fields
        title: '',
        instruction: '',
        type: 'invalid' as any
      };

      const result = await service.validateInstruction(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('detectConflicts', () => {
    test('should detect no conflicts for compatible instructions', async () => {
      const templateId = 'test-template';

      const conflicts = await service.detectConflicts(templateId);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });
});

// Test utilities for creating mock data
export function createMockInstruction(overrides: Partial<EnhancedAIInstruction> = {}): EnhancedAIInstruction {
  return {
    id: 'mock-id',
    type: 'global',
    scope: 'document',
    title: 'Mock Instruction',
    instruction: 'Mock instruction text',
    target: { selector: 'all', elementType: 'global' },
    isActive: true,
    priority: 5,
    executionOrder: 1,
    variables: [],
    conditions: [],
    preserveFormatting: true,
    variableSubstitution: true,
    contextAware: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'mock-user',
    version: 1,
    ...overrides
  };
}

export function createMockExecutionContext(overrides: Partial<InstructionExecutionContext> = {}): InstructionExecutionContext {
  return {
    templateId: 'mock-template',
    documentId: 'mock-document',
    currentContent: '<p>Mock content</p>',
    originalContent: '<p>Mock content</p>',
    variables: {},
    knowledgeDocuments: [],
    executionLevel: 0,
    parentInstructions: [],
    ...overrides
  };
}