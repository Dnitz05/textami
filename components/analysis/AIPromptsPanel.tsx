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
  documentSections?: Array<{id: string; title: string;}>;
  sectionSpecificInstructions?: Array<{
    id: string;
    sectionTitle: string;
    sectionIndex: number;
    instruction: string;
    created: Date;
  }>;
}

const AIPromptsPanel: React.FC<AIPromptsPanelProps> = ({
  pipelineStatus = 'uploaded',
  onInstructionExecute,
  isExecuting = false,
  executingInstructionId = null,
  documentSections = [],
  sectionSpecificInstructions = []
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
      const isSection = documentSections.some(s => s.id === newInstruction.type);
      const instruction: AIInstruction = {
        id: Date.now().toString(),
        type: isSection ? 'section' : newInstruction.type,
        title: newInstruction.title,
        instruction: newInstruction.instruction,
        target: isSection ? newInstruction.type : undefined
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
      {/* Add button section with breathing room */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full px-4 py-3 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Nova Instrucció</span>
        </button>
      </div>

      <div>
        {/* Existing Instructions with cards */}
        <div className="space-y-3">
          {instructions.map((instruction) => (
            <div key={instruction.id} 
                 className="px-4 py-3 hover:bg-blue-50 rounded-lg cursor-pointer border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                 onClick={() => executeInstruction(instruction)}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{instruction.title}</div>
                  {instruction.target && (
                    <div className="text-xs text-blue-600 mt-1">📋 {documentSections.find(s => s.id === instruction.target)?.title || instruction.target}</div>
                  )}
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

        {/* Section-Specific Instructions */}
        {sectionSpecificInstructions.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-sm mb-3 text-gray-700 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Instruccions per Seccions
            </h4>
            
            {sectionSpecificInstructions.map((sectionInstruction, index) => (
              <div
                key={sectionInstruction.id}
                className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-400 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                onClick={() => onInstructionExecute?.({
                  id: sectionInstruction.id,
                  type: 'section',
                  title: `Instrucció per ${sectionInstruction.sectionTitle}`,
                  instruction: sectionInstruction.instruction,
                  target: sectionInstruction.sectionTitle
                })}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm text-blue-800">
                    📋 {sectionInstruction.sectionTitle}
                  </h5>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1">
                    Nova
                  </span>
                </div>
                
                <p className="text-xs text-gray-700 mb-2">
                  {sectionInstruction.instruction}
                </p>
                
                <div className="text-xs text-gray-500">
                  Creada: {sectionInstruction.created.toLocaleTimeString('ca-ES')}
                </div>
                
                {isExecuting && executingInstructionId === sectionInstruction.id && (
                  <div className="mt-2 flex items-center text-blue-600">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs">Executant...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Instruction Form */}
        {showAddForm && (
          <div className="mt-6 border border-gray-300 rounded-xl p-5 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg">
            <h4 className="font-medium text-sm mb-3 text-gray-800">Nova Instrucció AI</h4>
            
            <div className="space-y-3">
              <select
                value={newInstruction.type}
                onChange={(e) => setNewInstruction({...newInstruction, type: e.target.value as any})}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              >
                <option value="global">🌐 Global (tot el document)</option>
                {documentSections.map((section) => (
                  <option key={section.id} value={section.id}>📋 {section.title}</option>
                ))}
                <option value="paragraph">📝 Paràgraf específic</option>
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