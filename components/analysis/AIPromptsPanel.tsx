// components/analysis/AIPromptsPanel.tsx
// Left sidebar panel for AI instructions to modify document content
import React, { useState } from 'react';
import { useUser } from '../../hooks/useUser';

interface AIInstruction {
  id: string;
  type: 'global' | 'section' | 'paragraph';
  title: string;
  instruction: string;
  target?: string; // For section/paragraph specific instructions
  isActive: boolean; // New: whether instruction is active/enabled
}

interface AIPromptsPanelProps {
  pipelineStatus?: string;
  onInstructionExecute?: (instruction: AIInstruction) => void;
  isExecuting?: boolean;
  executingInstructionId?: string | null;
  documentSections?: Array<{id: string; title: string;}>;
  // Removed: sectionSpecificInstructions (no longer needed)
  openFormWithSection?: string | null; // Section ID to auto-open form with
}

const AIPromptsPanel: React.FC<AIPromptsPanelProps> = ({
  pipelineStatus = 'uploaded',
  onInstructionExecute,
  isExecuting = false,
  executingInstructionId = null,
  documentSections = [],
  openFormWithSection = null
}) => {
  const { user } = useUser();
  const [knowledgeFiles, setKnowledgeFiles] = useState<Array<{
    id: string;
    title: string;
    filename: string;
    type: string;
  }>>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  // Load knowledge files on component mount
  React.useEffect(() => {
    // Don't wait for user - load immediately with fallback
    const loadKnowledgeFiles = async () => {
      setLoadingKnowledge(true);
      try {
        const userId = user?.id || 'anonymous';
        console.log('🔍 Debug - Loading knowledge for userId:', userId);
        const response = await fetch(`/api/knowledge?userId=${userId}`);
        const result = await response.json();
        console.log('📚 Debug - Knowledge API response:', result);
        if (result.success) {
          setKnowledgeFiles(result.data.map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            filename: doc.filename,
            type: doc.type
          })));
        }
      } catch (error) {
        console.error('Error loading knowledge files:', error);
      } finally {
        setLoadingKnowledge(false);
      }
    };

    loadKnowledgeFiles();
  }, [user]); // Still depend on user to reload if auth status changes

  const [instructions, setInstructions] = useState<AIInstruction[]>([
    {
      id: '1',
      type: 'global',
      title: 'To més formal',
      instruction: 'Reescriu tot el document amb un to més formal i professional, mantenint el contingut tècnic i les estructures existents.',
      isActive: false
    },
    {
      id: '2', 
      type: 'global',
      title: 'Simplificar vocabulari',
      instruction: 'Simplifica el llenguatge tècnic i especialitzat per fer el document més accessible, mantenint la precisió del contingut.',
      isActive: false
    },
    {
      id: '3',
      type: 'section',
      title: 'Resumir secció',
      instruction: 'Genera un resum executiu concís de la secció seleccionada, destacant els punts clau en màxim 3 paràgrafs.',
      isActive: false
    },
    {
      id: '4',
      type: 'global',
      title: 'Verificar compliment normatiu',
      instruction: 'Analitza si el document compleix amb les normatives i regulacions carregades a la base de coneixement i proporciona recomanacions.',
      isActive: false
    }
  ]);

  const [newInstruction, setNewInstruction] = useState({
    type: 'global' as 'global' | 'section' | 'paragraph',
    knowledgeFileId: '',
    instruction: ''
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInstructionId, setEditingInstructionId] = useState<string | null>(null);
  const [editingInstruction, setEditingInstruction] = useState({ title: '', instruction: '' });

  // Auto-open form when openFormWithSection is provided
  React.useEffect(() => {
    if (openFormWithSection) {
      setShowAddForm(true);
      // Pre-select the section in the dropdown
      setNewInstruction(prev => ({
        ...prev,
        type: openFormWithSection as 'global' | 'section' | 'paragraph'
      }));
    }
  }, [openFormWithSection]);

  const handleAddInstruction = () => {
    if (newInstruction.instruction) {
      const selectedKnowledge = knowledgeFiles.find(f => f.id === newInstruction.knowledgeFileId);
      const isSection = documentSections.some(s => s.id === newInstruction.type);
      
      const instruction: AIInstruction = {
        id: Date.now().toString(),
        type: isSection ? 'section' : newInstruction.type,
        title: selectedKnowledge 
          ? `${newInstruction.instruction} (amb ${selectedKnowledge.title})`
          : newInstruction.instruction,
        instruction: selectedKnowledge 
          ? `Utilitza el document "${selectedKnowledge.filename}" com a context per: ${newInstruction.instruction}`
          : newInstruction.instruction,
        target: isSection ? newInstruction.type : undefined,
        isActive: false // Will be overridden to true below
      };
      const newInstructionWithActive = { ...instruction, isActive: true }; // Auto-activate new instructions
      setInstructions([...instructions, newInstructionWithActive]);
      setNewInstruction({ type: 'global', knowledgeFileId: '', instruction: '' });
      setShowAddForm(false);
      // Auto-execute immediately
      onInstructionExecute && onInstructionExecute(newInstructionWithActive);
    }
  };

  const executeInstruction = (instruction: AIInstruction) => {
    onInstructionExecute?.(instruction);
  };

  const toggleInstructionActive = (id: string) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, isActive: !inst.isActive } : inst
    ));
  };

  const deleteInstruction = (id: string) => {
    setInstructions(instructions.filter(inst => inst.id !== id));
  };

  const startEditing = (instruction: AIInstruction) => {
    setEditingInstructionId(instruction.id);
    setEditingInstruction({ title: instruction.title, instruction: instruction.instruction });
  };

  const saveEdit = () => {
    if (editingInstructionId) {
      setInstructions(instructions.map(inst => 
        inst.id === editingInstructionId 
          ? { ...inst, title: editingInstruction.title, instruction: editingInstruction.instruction }
          : inst
      ));
      setEditingInstructionId(null);
      setEditingInstruction({ title: '', instruction: '' });
    }
  };

  const cancelEdit = () => {
    setEditingInstructionId(null);
    setEditingInstruction({ title: '', instruction: '' });
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
                 className={`px-4 py-3 rounded-lg border transition-all duration-200 ${
                   instruction.isActive 
                     ? 'border-green-300 bg-green-50 shadow-md' 
                     : 'border-gray-200 bg-white hover:bg-gray-50'
                 }`}>
              
              {editingInstructionId === instruction.id ? (
                // Edit Mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingInstruction.title}
                    onChange={(e) => setEditingInstruction({...editingInstruction, title: e.target.value})}
                    className="w-full text-sm font-medium border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Títol de la instrucció"
                  />
                  <textarea
                    value={editingInstruction.instruction}
                    onChange={(e) => setEditingInstruction({...editingInstruction, instruction: e.target.value})}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Descripció de la instrucció"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveEdit}
                      className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                    >
                      Cancel·lar
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{instruction.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{instruction.instruction}</div>
                      
                      {/* Show knowledge context if available */}
                      {instruction.title.includes(' (amb ') && (
                        <div className="mt-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          📚 <span className="font-medium text-yellow-800">
                            Context: {instruction.title.match(/\(amb (.+)\)/)?.[1] || 'Document de coneixement'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      {/* Toggle Active/Inactive */}
                      <button
                        onClick={() => toggleInstructionActive(instruction.id)}
                        className={`w-8 h-5 rounded-full flex items-center transition-colors ${
                          instruction.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                          instruction.isActive ? 'translate-x-3' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Scope and Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {instruction.type === 'global' ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${getInstructionTypeColor(instruction.type)}`}>
                          🌐 Tot el document
                        </span>
                      ) : instruction.target ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${getInstructionTypeColor(instruction.type)}`}>
                          📋 {documentSections.find(s => s.id === instruction.target)?.title || instruction.target}
                        </span>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full ${getInstructionTypeColor(instruction.type)}`}>
                          📝 Paràgraf específic
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {/* Execute Button */}
                      {instruction.isActive && (
                        <button
                          onClick={() => executeInstruction(instruction)}
                          disabled={isExecuting}
                          className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isExecuting && executingInstructionId === instruction.id ? (
                            <div className="flex items-center">
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                              Executant...
                            </div>
                          ) : (
                            'Executar'
                          )}
                        </button>
                      )}
                      
                      {/* Edit Button */}
                      <button
                        onClick={() => startEditing(instruction)}
                        className="text-xs text-gray-600 hover:text-blue-600 px-2 py-1"
                      >
                        ✏️
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteInstruction(instruction.id)}
                        className="text-xs text-gray-600 hover:text-red-600 px-2 py-1"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Section-specific instructions now use the standard "Nova Instrucció AI" form */}

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
              
              <select
                value={newInstruction.knowledgeFileId}
                onChange={(e) => setNewInstruction({...newInstruction, knowledgeFileId: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              >
                <option value="">context</option>
                {loadingKnowledge ? (
                  <option value="" disabled>⏳ Carregant documents...</option>
                ) : knowledgeFiles.length === 0 ? (
                  <option value="" disabled>❌ Cap document de coneixement disponible</option>
                ) : (
                  knowledgeFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      📄 {file.title} ({file.type})
                    </option>
                  ))
                )}
              </select>
              
              <textarea
                placeholder="Què vols fer amb aquest document de coneixement? Ex: 'Comprova si el document compleix aquesta normativa', 'Utilitza aquestes directrius per millorar el text'..."
                value={newInstruction.instruction}
                onChange={(e) => setNewInstruction({...newInstruction, instruction: e.target.value})}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
              />
              
              <div className="flex space-x-2">
                <button
                  onClick={handleAddInstruction}
                  disabled={!newInstruction.instruction}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded border border-blue-600 hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  style={{fontFamily: 'Calibri, Segoe UI, Arial, sans-serif'}}
                >
                  crear
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