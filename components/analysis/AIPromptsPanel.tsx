// components/analysis/AIPromptsPanel.tsx
// Left sidebar panel for AI instructions to modify document content
import React, { useState } from 'react';

interface AIInstruction {
  id: string;
  type: 'global' | 'section' | 'paragraph';
  title: string;
  instruction: string;
  target?: string; // For section/paragraph specific instructions
}

interface AIPromptsPanelProps {
  pipelineStatus?: string;
  onInstructionExecute?: (instruction: AIInstruction) => void;
  isExecuting?: boolean;
  executingInstructionId?: string | null;
}

const AIPromptsPanel: React.FC<AIPromptsPanelProps> = ({
  pipelineStatus = 'uploaded',
  onInstructionExecute,
  isExecuting = false,
  executingInstructionId = null
}) => {
  const [instructions, setInstructions] = useState<AIInstruction[]>([
    {
      id: '1',
      type: 'global',
      title: 'To més formal',
      instruction: 'Reescriu tot el document amb un to més formal i professional, mantenint el contingut tècnic i les estructures existents.'
    },
    {
      id: '2', 
      type: 'global',
      title: 'Simplificar vocabulari',
      instruction: 'Simplifica el llenguatge tècnic i especialitzat per fer el document més accessible, mantenint la precisió del contingut.'
    },
    {
      id: '3',
      type: 'section',
      title: 'Resumir secció',
      instruction: 'Genera un resum executiu concís de la secció seleccionada, destacant els punts clau en màxim 3 paràgrafs.'
    },
    {
      id: '4',
      type: 'global',
      title: 'Verificar compliment normatiu',
      instruction: 'Analitza si el document compleix amb les normatives i regulacions carregades a la base de coneixement i proporciona recomanacions.'
    }
  ]);

  const [newInstruction, setNewInstruction] = useState({
    type: 'global' as 'global' | 'section' | 'paragraph',
    title: '',
    instruction: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddInstruction = () => {
    if (newInstruction.title && newInstruction.instruction) {
      const instruction: AIInstruction = {
        id: Date.now().toString(),
        type: newInstruction.type,
        title: newInstruction.title,
        instruction: newInstruction.instruction
      };
      setInstructions([...instructions, instruction]);
      setNewInstruction({ type: 'global', title: '', instruction: '' });
      setShowAddForm(false);
    }
  };

  const executeInstruction = (instruction: AIInstruction) => {
    onInstructionExecute?.(instruction);
  };

  const getInstructionTypeColor = (type: AIInstruction['type']) => {
    switch (type) {
      case 'global': return 'bg-blue-100 text-blue-800';
      case 'section': return 'bg-green-100 text-green-800';
      case 'paragraph': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInstructionTypeIcon = (type: AIInstruction['type']) => {
    switch (type) {
      case 'global': return '🌐';
      case 'section': return '📋';
      case 'paragraph': return '📝';
      default: return '💬';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium text-gray-700">AI Instructions</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Existing Instructions */}
        <div className="space-y-2">
          {instructions.map((instruction) => (
            <div key={instruction.id} 
                 className="p-2 hover:bg-gray-100 rounded cursor-pointer border-b border-gray-100"
                 onClick={() => executeInstruction(instruction)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{instruction.title}</div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {isExecuting && executingInstructionId === instruction.id ? (
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <div className="text-purple-600 text-xs">▶</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Instruction Form */}
        {showAddForm && (
          <div className="border rounded-lg p-3 bg-purple-50">
            <h4 className="font-medium text-sm mb-3">Nova Instrucció AI</h4>
            
            <div className="space-y-2">
              <div>
                <select
                  value={newInstruction.type}
                  onChange={(e) => setNewInstruction({...newInstruction, type: e.target.value as any})}
                  className="w-full text-xs border rounded p-2"
                >
                  <option value="global">Global (tot el document)</option>
                  <option value="section">Secció específica</option>
                  <option value="paragraph">Paràgraf específic</option>
                </select>
              </div>
              
              <div>
                <input
                  type="text"
                  placeholder="Títol de la instrucció..."
                  value={newInstruction.title}
                  onChange={(e) => setNewInstruction({...newInstruction, title: e.target.value})}
                  className="w-full text-xs border rounded p-2"
                />
              </div>
              
              <div>
                <textarea
                  placeholder="Descripció de la instrucció..."
                  value={newInstruction.instruction}
                  onChange={(e) => setNewInstruction({...newInstruction, instruction: e.target.value})}
                  className="w-full text-xs border rounded p-2"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleAddInstruction}
                  className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-xs border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
                >
                  Cancel·lar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPromptsPanel;