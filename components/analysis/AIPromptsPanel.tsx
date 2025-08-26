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
    <div style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}>
      <div>
        {/* Existing Instructions */}
        <div className="space-y-1">
          {instructions.map((instruction) => (
            <div key={instruction.id} 
                 className="px-3 py-2 hover:bg-gray-100 rounded cursor-pointer border border-gray-200 bg-white transition-colors"
                 onClick={() => executeInstruction(instruction)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{instruction.title}</div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {isExecuting && executingInstructionId === instruction.id ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Instruction Form */}
        {showAddForm && (
          <div className="mt-4 border border-gray-300 rounded-lg p-4 bg-blue-50">
            <h4 className="font-medium text-sm mb-3 text-gray-800">Nova Instrucció AI</h4>
            
            <div className="space-y-3">
              <select
                value={newInstruction.type}
                onChange={(e) => setNewInstruction({...newInstruction, type: e.target.value as any})}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              >
                <option value="global">Global (tot el document)</option>
                <option value="section">Secció específica</option>
                <option value="paragraph">Paràgraf específic</option>
              </select>
              
              <input
                type="text"
                placeholder="Títol de la instrucció..."
                value={newInstruction.title}
                onChange={(e) => setNewInstruction({...newInstruction, title: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              />
              
              <textarea
                placeholder="Descripció de la instrucció..."
                value={newInstruction.instruction}
                onChange={(e) => setNewInstruction({...newInstruction, instruction: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              />
              
              <div className="flex space-x-2">
                <button
                  onClick={handleAddInstruction}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded border border-blue-600 hover:bg-blue-700 transition-colors"
                  style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
                >
                  Afegir
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-sm border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 transition-colors"
                  style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
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