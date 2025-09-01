'use client';

// Advanced Instruction Manager with hierarchical organization
// Manages all instruction types with drag & drop, visual targeting, and analytics

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  EnhancedAIInstruction, 
  InstructionType,
  InstructionConflict,
  InstructionAnalytics 
} from '@/lib/instructions/instruction-types';
import { instructionService } from '@/lib/instructions/instruction-service';
import InstructionEditor from './InstructionEditor';
import toast from 'react-hot-toast';

interface InstructionManagerProps {
  templateId: string;
  userId: string;
  documentSections?: Array<{ id: string; title: string; }>;
  documentTables?: Array<{ id: string; title: string; headers: string[]; }>;
  onInstructionUpdate?: (instructions: EnhancedAIInstruction[]) => void;
  className?: string;
}

interface InstructionGroup {
  type: InstructionType;
  label: string;
  icon: string;
  instructions: EnhancedAIInstruction[];
  totalInstructions: number;
  activeInstructions: number;
}

const INSTRUCTION_TYPE_CONFIG: Record<InstructionType, { label: string; icon: string; color: string; }> = {
  global: { label: 'Globals', icon: '🌐', color: 'blue' },
  section: { label: 'Seccions', icon: '📑', color: 'green' },
  paragraph: { label: 'Paràgrafs', icon: '📝', color: 'purple' },
  table: { label: 'Taules', icon: '📊', color: 'orange' },
  cell: { label: 'Cel·les', icon: '🔢', color: 'red' }
};

export default function InstructionManager({
  templateId,
  userId,
  documentSections = [],
  documentTables = [],
  onInstructionUpdate,
  className = ''
}: InstructionManagerProps) {
  
  // State management
  const [instructions, setInstructions] = useState<EnhancedAIInstruction[]>([]);
  const [groupedInstructions, setGroupedInstructions] = useState<InstructionGroup[]>([]);
  const [conflicts, setConflicts] = useState<InstructionConflict[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, InstructionAnalytics>>({});
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<EnhancedAIInstruction | undefined>();
  const [selectedType, setSelectedType] = useState<InstructionType | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<InstructionType, boolean>>({
    global: true,
    section: true,
    paragraph: false,
    table: false,
    cell: false
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  // Load instructions on mount
  useEffect(() => {
    loadInstructions();
    detectConflicts();
  }, [templateId, userId]);

  // Group instructions when they change
  useEffect(() => {
    const grouped = groupInstructionsByType(instructions);
    setGroupedInstructions(grouped);
    
    if (onInstructionUpdate) {
      onInstructionUpdate(instructions);
    }
  }, [instructions, onInstructionUpdate]);

  const loadInstructions = async () => {
    try {
      setLoading(true);
      const loadedInstructions = await instructionService.getInstructions(templateId, userId);
      setInstructions(loadedInstructions);
    } catch (error) {
      console.error('Error loading instructions:', error);
      toast.error('Error carregant instruccions');
    } finally {
      setLoading(false);
    }
  };

  const detectConflicts = async () => {
    try {
      const detectedConflicts = await instructionService.detectConflicts(templateId);
      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }
  };

  const groupInstructionsByType = (instructions: EnhancedAIInstruction[]): InstructionGroup[] => {
    const groups: InstructionGroup[] = [];
    
    Object.entries(INSTRUCTION_TYPE_CONFIG).forEach(([type, config]) => {
      const typeInstructions = instructions.filter(i => i.type === type);
      groups.push({
        type: type as InstructionType,
        label: config.label,
        icon: config.icon,
        instructions: typeInstructions.sort((a, b) => a.executionOrder - b.executionOrder),
        totalInstructions: typeInstructions.length,
        activeInstructions: typeInstructions.filter(i => i.isActive).length
      });
    });
    
    return groups;
  };

  const handleCreateInstruction = (type?: InstructionType) => {
    setEditingInstruction(undefined);
    setSelectedType(type || 'global');
    setShowEditor(true);
  };

  const handleEditInstruction = (instruction: EnhancedAIInstruction) => {
    setEditingInstruction(instruction);
    setSelectedType(instruction.type);
    setShowEditor(true);
  };

  const handleDeleteInstruction = async (instruction: EnhancedAIInstruction) => {
    if (!confirm(`Eliminar la instrucció "${instruction.title}"?`)) {
      return;
    }

    try {
      await instructionService.deleteInstruction(instruction.id, userId);
      await loadInstructions();
      await detectConflicts();
      toast.success('Instrucció eliminada');
    } catch (error) {
      console.error('Error deleting instruction:', error);
      toast.error('Error eliminant instrucció');
    }
  };

  const handleToggleActive = async (instruction: EnhancedAIInstruction) => {
    try {
      await instructionService.updateInstruction(instruction.id, userId, {
        isActive: !instruction.isActive
      });
      await loadInstructions();
      await detectConflicts();
      toast.success(instruction.isActive ? 'Instrucció desactivada' : 'Instrucció activada');
    } catch (error) {
      console.error('Error toggling instruction:', error);
      toast.error('Error actualitzant instrucció');
    }
  };

  const handleSaveInstruction = async (instruction: EnhancedAIInstruction) => {
    setShowEditor(false);
    setEditingInstruction(undefined);
    await loadInstructions();
    await detectConflicts();
  };

  const handleReorderInstructions = async (type: InstructionType, reorderedInstructions: EnhancedAIInstruction[]) => {
    try {
      // Update execution order for all instructions of this type
      const updates = reorderedInstructions.map((instruction, index) => 
        instructionService.updateInstruction(instruction.id, userId, {
          executionOrder: index + 1
        })
      );
      
      await Promise.all(updates);
      await loadInstructions();
      toast.success('Ordre actualitzat');
    } catch (error) {
      console.error('Error reordering instructions:', error);
      toast.error('Error actualitzant ordre');
    }
  };

  const loadAnalytics = async (instructionId: string) => {
    try {
      const instructionAnalytics = await instructionService.getInstructionAnalytics(instructionId);
      setAnalytics(prev => ({
        ...prev,
        [instructionId]: instructionAnalytics
      }));
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const toggleGroupExpanded = (type: InstructionType) => {
    setExpandedGroups(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const getConflictSeverityColor = (severity: 'warning' | 'error' | 'blocking') => {
    switch (severity) {
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'blocking': return 'text-red-800 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const renderInstructionCard = (instruction: EnhancedAIInstruction) => {
    const config = INSTRUCTION_TYPE_CONFIG[instruction.type];
    const hasAnalytics = analytics[instruction.id];

    return (
      <Card 
        key={instruction.id}
        className={`transition-all duration-200 ${
          instruction.isActive 
            ? 'border-green-200 bg-green-50/30' 
            : 'border-gray-200 bg-gray-50/50'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{config.icon}</span>
                <h4 className="font-medium text-gray-900">{instruction.title}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  instruction.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {instruction.isActive ? 'Activa' : 'Inactiva'}
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  Prioritat {instruction.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {instruction.instruction}
              </p>
              
              {/* Target info */}
              {instruction.target.selector && (
                <div className="text-xs text-gray-500 mb-2">
                  🎯 Target: {instruction.target.selector}
                </div>
              )}
              
              {/* Performance metrics */}
              {hasAnalytics && (
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Execucions: {hasAnalytics.totalExecutions}</span>
                  <span>Èxit: {Math.round((hasAnalytics.successfulExecutions / hasAnalytics.totalExecutions) * 100)}%</span>
                  <span>Temps mig: {hasAnalytics.averageExecutionTime}ms</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => loadAnalytics(instruction.id)}
                className="text-blue-600 hover:text-blue-800 text-sm"
                title="Analytics"
              >
                📊
              </button>
              <button
                onClick={() => handleEditInstruction(instruction)}
                className="text-gray-600 hover:text-gray-800 text-sm"
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => handleToggleActive(instruction)}
                className={`text-sm ${
                  instruction.isActive 
                    ? 'text-red-600 hover:text-red-800' 
                    : 'text-green-600 hover:text-green-800'
                }`}
                title={instruction.isActive ? 'Desactivar' : 'Activar'}
              >
                {instruction.isActive ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={() => handleDeleteInstruction(instruction)}
                className="text-red-600 hover:text-red-800 text-sm"
                title="Eliminar"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderInstructionGroup = (group: InstructionGroup) => {
    const config = INSTRUCTION_TYPE_CONFIG[group.type];
    const isExpanded = expandedGroups[group.type];
    
    return (
      <Card key={group.type} className="mb-4">
        <div className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleGroupExpanded(group.type)}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{group.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{group.label}</h3>
                <p className="text-sm text-gray-600">
                  {group.activeInstructions} actives de {group.totalInstructions} instruccions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateInstruction(group.type);
                }}
              >
                + Nova
              </Button>
              <span className={`transform transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}>
                ▶️
              </span>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 space-y-3">
              {group.instructions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">{group.icon}</div>
                  <p>No hi ha instruccions {group.label.toLowerCase()}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateInstruction(group.type)}
                    className="mt-2"
                  >
                    Crear Primera Instrucció
                  </Button>
                </div>
              ) : (
                group.instructions.map(renderInstructionCard)
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (showEditor) {
    return (
      <InstructionEditor
        templateId={templateId}
        userId={userId}
        documentSections={documentSections}
        documentTables={documentTables}
        initialInstruction={editingInstruction}
        preselectedType={selectedType || undefined}
        onSave={handleSaveInstruction}
        onCancel={() => {
          setShowEditor(false);
          setEditingInstruction(undefined);
        }}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Instruccions IA
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona instruccions jeràrquiques per modificar el document amb IA
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {conflicts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflicts(!showConflicts)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              ⚠️ {conflicts.length} Conflictes
            </Button>
          )}
          <Button
            onClick={() => setShowAnalytics(!showAnalytics)}
            variant="outline"
            size="sm"
          >
            📊 Analytics
          </Button>
          <Button
            onClick={() => handleCreateInstruction()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + Nova Instrucció
          </Button>
        </div>
      </div>

      {/* Conflicts Display */}
      {showConflicts && conflicts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">Conflictes Detectats</h3>
          <div className="space-y-3">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getConflictSeverityColor(conflict.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {conflict.type} Conflict ({conflict.severity})
                    </p>
                    <p className="text-sm mt-1">{conflict.description}</p>
                  </div>
                  {conflict.autoResolved && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Resolt automàticament
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Statistics */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(INSTRUCTION_TYPE_CONFIG).map(([type, config]) => {
            const group = groupedInstructions.find(g => g.type === type);
            return (
              <div key={type} className="text-center">
                <div className="text-2xl mb-1">{config.icon}</div>
                <div className="text-lg font-semibold text-gray-900">
                  {group?.activeInstructions || 0}
                </div>
                <div className="text-xs text-gray-600">
                  {config.label} Actives
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Instructions by Type */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Carregant instruccions...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedInstructions.map(renderInstructionGroup)}
        </div>
      )}

      {/* Empty State */}
      {!loading && instructions.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hi ha instruccions IA
          </h3>
          <p className="text-gray-600 mb-6">
            Crea instruccions per que la IA modifiqui automàticament el contingut del document
          </p>
          <Button
            onClick={() => handleCreateInstruction()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Crear Primera Instrucció
          </Button>
        </Card>
      )}

      {/* Analytics Panel */}
      {showAnalytics && Object.keys(analytics).length > 0 && (
        <Card className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Analytics d'Instruccions</h3>
          <div className="space-y-4">
            {Object.entries(analytics).map(([instructionId, data]) => (
              <div key={instructionId} className="border-b pb-4 last:border-b-0">
                <h4 className="font-medium text-gray-800 mb-2">{data.instruction.title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Execucions:</span>
                    <div className="font-medium">{data.totalExecutions}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Taxa d'Èxit:</span>
                    <div className="font-medium">
                      {Math.round((data.successfulExecutions / data.totalExecutions) * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Temps Mitjà:</span>
                    <div className="font-medium">{data.averageExecutionTime}ms</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Impacte:</span>
                    <div className="font-medium">{data.contentImpactScore}/10</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}