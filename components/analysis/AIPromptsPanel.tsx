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
}

const AIPromptsPanel: React.FC<AIPromptsPanelProps> = ({
  pipelineStatus = 'uploaded',
  onInstructionExecute
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

  const [executing, setExecuting] = useState<string | null>(null);

  const executeInstruction = async (instruction: AIInstruction) => {
    setExecuting(instruction.id);
    try {
      console.log('🤖 Executing AI instruction:', instruction);
      // Here you would call your AI service to execute the instruction
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      onInstructionExecute?.(instruction);
    } catch (error) {
      console.error('Error executing instruction:', error);
      alert('Error executant la instrucció.');
    } finally {
      setExecuting(null);
    }
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
    <div className="bg-white rounded-lg shadow border">
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Instructions
            </h3>
            <p className="text-sm text-gray-600 mt-1">Modifica el document amb IA</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-purple-600 hover:text-purple-800 text-sm"
          >
            + Afegir
          </button>
        </div>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        {/* Existing Instructions */}
        <div className="space-y-3 mb-4">
          {instructions.map((instruction) => (
            <div key={instruction.id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getInstructionTypeIcon(instruction.type)}</span>
                  <span className="font-medium text-sm">{instruction.title}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getInstructionTypeColor(instruction.type)}`}>
                    {instruction.type}
                  </span>
                </div>
                <button
                  onClick={() => executeInstruction(instruction)}
                  disabled={executing === instruction.id}
                  className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  {executing === instruction.id ? (
                    <>
                      <svg className="animate-spin w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Executant...</span>
                    </>
                  ) : (
                    <span>Executar</span>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-600">{instruction.instruction}</p>
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
                  Afegir
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