'use client';

// Enhanced Instruction Editor with hierarchical support
// Supports: global → section → paragraph → table → cell instructions

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  EnhancedAIInstruction, 
  InstructionType, 
  InstructionScope,
  InstructionTarget,
  InstructionValidation 
} from '@/lib/instructions/instruction-types';
import { instructionService } from '@/lib/instructions/instruction-service';
import toast from 'react-hot-toast';

interface InstructionEditorProps {
  templateId: string;
  userId: string;
  documentSections?: Array<{ id: string; title: string; }>;
  documentTables?: Array<{ id: string; title: string; headers: string[]; }>;
  initialInstruction?: EnhancedAIInstruction;
  preselectedType?: InstructionType;
  preselectedTarget?: string;
  onSave: (instruction: EnhancedAIInstruction) => void;
  onCancel: () => void;
  className?: string;
}

const INSTRUCTION_TYPES: Array<{
  type: InstructionType;
  scope: InstructionScope;
  label: string;
  description: string;
  icon: string;
  examples: string[];
}> = [
  {
    type: 'global',
    scope: 'document',
    label: 'Document Global',
    description: 'Aplica a tot el document',
    icon: '🌐',
    examples: [
      'Usa un to formal i professional',
      'Converteix totes les dates al format DD/MM/YYYY',
      'Tradueix el document al català'
    ]
  },
  {
    type: 'section',
    scope: 'section',
    label: 'Secció Específica',
    description: 'Aplica a seccions seleccionades',
    icon: '📑',
    examples: [
      'Afegeix un resum al final de cada secció',
      'Destaca els punts claus en negreta',
      'Millora la introducció amb context adicional'
    ]
  },
  {
    type: 'paragraph',
    scope: 'element',
    label: 'Paràgraf Individual',
    description: 'Aplica a paràgrafs específics',
    icon: '📝',
    examples: [
      'Reescriu aquest paràgraf per ser més concís',
      'Afegeix exemples pràctics',
      'Millora la claredat de l\'explicació'
    ]
  },
  {
    type: 'table',
    scope: 'table',
    label: 'Taula Completa',
    description: 'Aplica a taules senceres',
    icon: '📊',
    examples: [
      'Afegeix una fila de totals al final',
      'Ordena per la columna de dates',
      'Formata els números com a percentatges'
    ]
  },
  {
    type: 'cell',
    scope: 'cell',
    label: 'Cel·la Individual',
    description: 'Aplica a cel·les específiques',
    icon: '🔢',
    examples: [
      'Converteix aquest valor a percentatge',
      'Calcula la mitjana de les cel·les adjacents',
      'Formata com a moneda europea'
    ]
  }
];

export default function InstructionEditor({
  templateId,
  userId,
  documentSections = [],
  documentTables = [],
  initialInstruction,
  preselectedType,
  preselectedTarget,
  onSave,
  onCancel,
  className = ''
}: InstructionEditorProps) {
  
  // Form state
  const [title, setTitle] = useState(initialInstruction?.title || '');
  const [instruction, setInstruction] = useState(initialInstruction?.instruction || '');
  const [selectedType, setSelectedType] = useState<InstructionType>(
    preselectedType || initialInstruction?.type || 'global'
  );
  const [priority, setPriority] = useState(initialInstruction?.priority || 5);
  const [isActive, setIsActive] = useState(initialInstruction?.isActive ?? true);
  
  // Advanced options
  const [preserveFormatting, setPreserveFormatting] = useState(initialInstruction?.preserveFormatting ?? true);
  const [variableSubstitution, setVariableSubstitution] = useState(initialInstruction?.variableSubstitution ?? true);
  const [contextAware, setContextAware] = useState(initialInstruction?.contextAware ?? true);
  
  // Targeting
  const [targetSelector, setTargetSelector] = useState('');
  const [targetElementId, setTargetElementId] = useState(preselectedTarget || '');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetTableId, setTargetTableId] = useState('');
  const [cellRow, setCellRow] = useState(0);
  const [cellColumn, setCellColumn] = useState(0);

  // Templates and examples
  const [promptTemplate, setPromptTemplate] = useState(initialInstruction?.promptTemplate || '');
  const [exampleBefore, setExampleBefore] = useState(initialInstruction?.exampleBefore || '');
  const [exampleAfter, setExampleAfter] = useState(initialInstruction?.exampleAfter || '');
  
  // UI state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [validation, setValidation] = useState<InstructionValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get current instruction type configuration
  const currentTypeConfig = INSTRUCTION_TYPES.find(t => t.type === selectedType);

  // Auto-fill template based on type selection
  useEffect(() => {
    if (selectedType && !initialInstruction) {
      const typeConfig = INSTRUCTION_TYPES.find(t => t.type === selectedType);
      if (typeConfig && typeConfig.examples.length > 0) {
        setInstruction(typeConfig.examples[0]);
      }
    }
  }, [selectedType, initialInstruction]);

  // Validate instruction in real-time
  useEffect(() => {
    if (title && instruction && selectedType) {
      validateInstruction();
    }
  }, [title, instruction, selectedType, targetSelector, targetElementId, priority]);

  const validateInstruction = async () => {
    setIsValidating(true);
    try {
      const instructionData: Partial<EnhancedAIInstruction> = {
        title,
        instruction,
        type: selectedType,
        scope: currentTypeConfig?.scope,
        priority,
        target: buildTargetConfig(),
        preserveFormatting,
        variableSubstitution,
        contextAware
      };

      const validationResult = await instructionService.validateInstruction(
        instructionData,
        templateId
      );
      
      setValidation(validationResult);
    } catch (error) {
      console.error('Error validating instruction:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const buildTargetConfig = (): InstructionTarget => {
    const target: InstructionTarget = {
      type: selectedType
    };

    switch (selectedType) {
      case 'global':
        // Global instructions don't need specific targeting
        break;
      case 'section':
        target.sectionId = targetSectionId || targetElementId;
        target.selector = targetSectionId ? `#section-${targetSectionId}` : targetSelector;
        break;
      case 'paragraph':
        target.elementId = targetElementId;
        target.selector = targetElementId ? `#${targetElementId}` : targetSelector;
        break;
      case 'table':
        target.tableId = targetTableId || targetElementId;
        target.selector = targetTableId ? `#table-${targetTableId}` : targetSelector;
        break;
      case 'cell':
        target.tableId = targetTableId;
        target.cellCoordinates = {
          tableId: targetTableId,
          rowIndex: cellRow,
          columnIndex: cellColumn,
          cellId: `cell-${targetTableId}-${cellRow}-${cellColumn}`
        };
        target.selector = `#table-${targetTableId} tr:nth-child(${cellRow + 1}) td:nth-child(${cellColumn + 1})`;
        break;
    }

    return target;
  };

  const handleSave = async () => {
    if (!validation?.isValid) {
      toast.error('Corregeix els errors abans de guardar');
      return;
    }

    setIsSaving(true);
    try {
      const instructionData: Partial<EnhancedAIInstruction> = {
        title,
        instruction,
        type: selectedType,
        scope: currentTypeConfig?.scope || 'document',
        target: buildTargetConfig(),
        isActive,
        priority,
        preserveFormatting,
        variableSubstitution,
        contextAware,
        promptTemplate: promptTemplate || undefined,
        exampleBefore: exampleBefore || undefined,
        exampleAfter: exampleAfter || undefined
      };

      let savedInstruction: EnhancedAIInstruction;

      if (initialInstruction) {
        // Update existing instruction
        savedInstruction = await instructionService.updateInstruction(
          initialInstruction.id,
          userId,
          instructionData
        );
        toast.success('Instrucció actualitzada correctament');
      } else {
        // Create new instruction
        savedInstruction = await instructionService.createInstruction(
          userId,
          templateId,
          instructionData
        );
        toast.success('Instrucció creada correctament');
      }

      onSave(savedInstruction);
    } catch (error) {
      console.error('Error saving instruction:', error);
      toast.error('Error guardant la instrucció');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTargetingOptions = () => {
    switch (selectedType) {
      case 'global':
        return (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              ℹ️ Les instruccions globals s'apliquen a tot el document automàticament
            </p>
          </div>
        );

      case 'section':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Secció objectiu
            </label>
            {documentSections.length > 0 ? (
              <select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Totes les seccions</option>
                {documentSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="CSS selector (ex: .introduction, #summary)"
                value={targetSelector}
                onChange={(e) => setTargetSelector(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        );

      case 'paragraph':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Paràgraf objectiu
            </label>
            <input
              type="text"
              placeholder="ID del paràgraf o CSS selector"
              value={targetElementId}
              onChange={(e) => setTargetElementId(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600">
              Pots fer click sobre un paràgraf al preview per seleccionar-lo automàticament
            </p>
          </div>
        );

      case 'table':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Taula objectiu
            </label>
            {documentTables.length > 0 ? (
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona una taula...</option>
                {documentTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.title} ({table.headers.length} columnes)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="ID de la taula"
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        );

      case 'cell':
        return (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Cel·la objectiu
            </label>
            
            {/* Table selection */}
            {documentTables.length > 0 ? (
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona una taula...</option>
                {documentTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="ID de la taula"
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Cell coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fila (0-indexed)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cellRow}
                  onChange={(e) => setCellRow(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Columna (0-indexed)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cellColumn}
                  onChange={(e) => setCellColumn(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {targetTableId && (
              <p className="text-xs text-gray-600">
                📍 Cel·la: {targetTableId} → Fila {cellRow + 1}, Columna {cellColumn + 1}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {initialInstruction ? 'Editar Instrucció' : 'Nova Instrucció IA'}
        </h3>
        <div className="flex items-center space-x-2">
          {isValidating && (
            <div className="text-sm text-gray-600 flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Validant...</span>
            </div>
          )}
        </div>
      </div>

      {/* Type Selection */}
      <Card className="p-4">
        <h4 className="font-medium text-gray-900 mb-4">Tipus d'Instrucció</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INSTRUCTION_TYPES.map((type) => (
            <Card
              key={type.type}
              className={`cursor-pointer transition-all duration-200 ${
                selectedType === type.type
                  ? 'ring-2 ring-blue-500 border-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedType(type.type)}
            >
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{type.icon}</span>
                  <span className="font-medium text-gray-900">{type.label}</span>
                </div>
                <p className="text-xs text-gray-600">{type.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Basic Information */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Títol de la Instrucció *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Exemple: Millorar el to professional"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucció Detallada *
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={`Escriu la instrucció que vols que la IA executi...`}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {currentTypeConfig && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowExamples(!showExamples)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showExamples ? 'Amagar exemples' : 'Veure exemples'}
                </button>
                {showExamples && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-700 mb-2">Exemples:</p>
                    <ul className="space-y-1">
                      {currentTypeConfig.examples.map((example, index) => (
                        <li key={index} className="text-xs text-gray-600">
                          • {example}
                          <button
                            onClick={() => setInstruction(example)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            [usar]
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Targeting Options */}
          {renderTargetingOptions()}
        </div>
      </Card>

      {/* Configuration Options */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Configuració</h4>
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvancedOptions ? 'Menys opcions' : 'Més opcions'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioritat
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                  <option key={p} value={p}>
                    {p} {p === 1 ? '(Baixa)' : p === 5 ? '(Mitjana)' : p === 10 ? '(Alta)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">
                Instrucció activa
              </label>
            </div>
          </div>

          {showAdvancedOptions && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="preserveFormatting"
                    checked={preserveFormatting}
                    onChange={(e) => setPreserveFormatting(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="preserveFormatting" className="text-sm text-gray-700">
                    Preservar format
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="variableSubstitution"
                    checked={variableSubstitution}
                    onChange={(e) => setVariableSubstitution(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="variableSubstitution" className="text-sm text-gray-700">
                    Substituir variables
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="contextAware"
                    checked={contextAware}
                    onChange={(e) => setContextAware(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="contextAware" className="text-sm text-gray-700">
                    Context intel·ligent
                  </label>
                </div>
              </div>

              {/* Template and examples */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template de Prompt (Opcional)
                  </label>
                  <textarea
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    placeholder="Template amb variables: {{content}}, {{variables}}, {{context}}"
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exemple Abans
                    </label>
                    <textarea
                      value={exampleBefore}
                      onChange={(e) => setExampleBefore(e.target.value)}
                      placeholder="Exemple de contingut abans de l'instrucció"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exemple Després
                    </label>
                    <textarea
                      value={exampleAfter}
                      onChange={(e) => setExampleAfter(e.target.value)}
                      placeholder="Exemple de com hauria de quedar després"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card className={`p-4 ${validation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <span className={`w-4 h-4 rounded-full ${validation.isValid ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">
              {validation.isValid ? 'Instrucció vàlida' : 'Errors de validació'}
            </span>
          </div>

          {validation.errors.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
              <ul className="text-sm text-red-600 space-y-1">
                {validation.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-yellow-700 mb-1">Avisos:</p>
              <ul className="text-sm text-yellow-600 space-y-1">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validation.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Suggeriments:</p>
              <ul className="text-sm text-blue-600 space-y-1">
                {validation.suggestions.map((suggestion, index) => (
                  <li key={index}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel·lar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!validation?.isValid || isSaving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{initialInstruction ? 'Actualitzant...' : 'Guardant...'}</span>
            </div>
          ) : (
            initialInstruction ? 'Actualitzar Instrucció' : 'Crear Instrucció'
          )}
        </Button>
      </div>
    </div>
  );
}