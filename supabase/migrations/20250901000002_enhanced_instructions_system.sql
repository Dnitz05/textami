-- Enhanced AI Instructions System Database Schema
-- Supports hierarchical instructions: global → section → paragraph → table → cell

-- Create instructions table with enhanced schema
CREATE TABLE IF NOT EXISTS ai_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Instruction identification
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  
  -- Instruction type and scope
  instruction_type TEXT NOT NULL CHECK (instruction_type IN ('global', 'section', 'paragraph', 'table', 'cell')),
  instruction_scope TEXT NOT NULL CHECK (instruction_scope IN ('document', 'section', 'element', 'table', 'cell')),
  
  -- Targeting information (JSONB for flexibility)
  target_config JSONB NOT NULL DEFAULT '{}',
  -- Structure: {
  --   "type": "section",
  --   "selector": "#section-1",
  --   "elementId": "section-intro",
  --   "sectionId": "introduction", 
  --   "tableId": "table-financial-data",
  --   "cellCoordinates": {
  --     "tableId": "table-1",
  --     "rowIndex": 2,
  --     "columnIndex": 1,
  --     "cellId": "cell-total"
  --   }
  -- }
  
  -- Execution control
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  execution_order INTEGER NOT NULL DEFAULT 0,
  
  -- Content processing options
  preserve_formatting BOOLEAN DEFAULT true,
  variable_substitution BOOLEAN DEFAULT true,
  context_aware BOOLEAN DEFAULT true,
  
  -- Dependencies and conditions
  dependent_variables TEXT[] DEFAULT '{}',
  execution_conditions TEXT[] DEFAULT '{}',
  
  -- Template and examples (for AI training/context)
  prompt_template TEXT,
  example_before TEXT,
  example_after TEXT,
  
  -- Performance and analytics
  average_execution_time_ms INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  version INTEGER DEFAULT 1
);

-- Create instruction executions log table
CREATE TABLE IF NOT EXISTS instruction_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id UUID REFERENCES ai_instructions(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Execution context
  document_id TEXT,
  generation_batch_id UUID, -- Links to document generation batches
  
  -- Content changes
  original_content TEXT,
  modified_content TEXT,
  content_changes JSONB DEFAULT '[]',
  -- Structure: [{
  --   "type": "insert|delete|modify",
  --   "location": "css-selector",
  --   "oldValue": "...",
  --   "newValue": "..."
  -- }]
  
  -- Execution results
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  ai_model TEXT DEFAULT 'openai-gpt-4',
  confidence DECIMAL(5,2),
  
  -- Targeting results
  target_element TEXT,
  affected_elements TEXT[] DEFAULT '{}',
  
  -- Context used during execution
  variables_used JSONB DEFAULT '{}',
  knowledge_documents_used TEXT[] DEFAULT '{}',
  parent_instructions UUID[] DEFAULT '{}',
  
  -- Variable substitutions made
  variable_substitutions JSONB DEFAULT '{}',
  
  -- Error handling
  errors TEXT[] DEFAULT '{}',
  warnings TEXT[] DEFAULT '{}',
  
  -- Execution metadata
  execution_level INTEGER DEFAULT 0, -- 0=global, 1=section, 2=paragraph, etc
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by UUID REFERENCES auth.users(id)
);

-- Create instruction conflicts tracking
CREATE TABLE IF NOT EXISTS instruction_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Conflict information
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('targeting', 'priority', 'dependency', 'variable', 'content')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'blocking')),
  description TEXT NOT NULL,
  
  -- Conflicting instructions
  instruction_ids UUID[] NOT NULL,
  
  -- Resolution information
  auto_resolved BOOLEAN DEFAULT false,
  resolution_applied TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Conflict metadata
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Create instruction analytics view for performance tracking
CREATE OR REPLACE VIEW instruction_performance_analytics AS
SELECT 
  ai.id,
  ai.title,
  ai.instruction_type,
  ai.instruction_scope,
  ai.template_id,
  ai.user_id,
  
  -- Execution statistics
  ai.total_executions,
  ai.successful_executions,
  ai.failed_executions,
  CASE 
    WHEN ai.total_executions > 0 
    THEN (ai.successful_executions::DECIMAL / ai.total_executions * 100)
    ELSE 0 
  END as success_percentage,
  
  ai.average_execution_time_ms,
  ai.last_executed_at,
  
  -- Recent performance (last 30 days)
  COALESCE(recent_stats.recent_executions, 0) as recent_executions_30d,
  COALESCE(recent_stats.recent_success_rate, 0) as recent_success_rate_30d,
  COALESCE(recent_stats.recent_avg_time, ai.average_execution_time_ms) as recent_avg_time_30d,
  
  -- Usage trend
  CASE 
    WHEN ai.last_executed_at > NOW() - INTERVAL '7 days' THEN 'active'
    WHEN ai.last_executed_at > NOW() - INTERVAL '30 days' THEN 'moderate'
    WHEN ai.last_executed_at > NOW() - INTERVAL '90 days' THEN 'low'
    ELSE 'inactive'
  END as usage_trend,
  
  ai.created_at,
  ai.updated_at

FROM ai_instructions ai
LEFT JOIN (
  SELECT 
    ie.instruction_id,
    COUNT(*) as recent_executions,
    AVG(CASE WHEN ie.success THEN 1.0 ELSE 0.0 END) * 100 as recent_success_rate,
    AVG(ie.execution_time_ms) as recent_avg_time
  FROM instruction_executions ie 
  WHERE ie.executed_at > NOW() - INTERVAL '30 days'
  GROUP BY ie.instruction_id
) recent_stats ON ai.id = recent_stats.instruction_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_instructions_template_id ON ai_instructions(template_id);
CREATE INDEX IF NOT EXISTS idx_ai_instructions_user_id ON ai_instructions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_instructions_type ON ai_instructions(instruction_type);
CREATE INDEX IF NOT EXISTS idx_ai_instructions_scope ON ai_instructions(instruction_scope);
CREATE INDEX IF NOT EXISTS idx_ai_instructions_active ON ai_instructions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_instructions_execution_order ON ai_instructions(template_id, instruction_type, execution_order);

-- GIN index for JSONB target_config for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_instructions_target_config ON ai_instructions USING gin(target_config);

-- Indexes for instruction_executions
CREATE INDEX IF NOT EXISTS idx_instruction_executions_instruction_id ON instruction_executions(instruction_id);
CREATE INDEX IF NOT EXISTS idx_instruction_executions_template_id ON instruction_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_instruction_executions_user_id ON instruction_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_instruction_executions_executed_at ON instruction_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_instruction_executions_success ON instruction_executions(success);

-- Index for conflicts
CREATE INDEX IF NOT EXISTS idx_instruction_conflicts_template_id ON instruction_conflicts(template_id);
CREATE INDEX IF NOT EXISTS idx_instruction_conflicts_active ON instruction_conflicts(is_active) WHERE is_active = true;

-- RLS Policies for security
ALTER TABLE ai_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_conflicts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own instructions
CREATE POLICY "Users can view their own instructions" ON ai_instructions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own instructions" ON ai_instructions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own instructions" ON ai_instructions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own instructions" ON ai_instructions
  FOR DELETE USING (user_id = auth.uid());

-- Users can only access execution logs for their instructions
CREATE POLICY "Users can view their own instruction executions" ON instruction_executions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create instruction executions" ON instruction_executions
  FOR INSERT WITH CHECK (true); -- System-level inserts allowed

-- Users can view conflicts for their templates
CREATE POLICY "Users can view conflicts for their templates" ON instruction_conflicts
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM templates WHERE user_id = auth.uid()
    )
  );

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_instruction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_instructions_timestamp
  BEFORE UPDATE ON ai_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_instruction_timestamp();

-- Function to update instruction performance statistics
CREATE OR REPLACE FUNCTION update_instruction_performance(
  p_instruction_id UUID,
  p_success BOOLEAN,
  p_execution_time_ms INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE ai_instructions SET
    total_executions = total_executions + 1,
    successful_executions = successful_executions + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_executions = failed_executions + CASE WHEN p_success THEN 0 ELSE 1 END,
    average_execution_time_ms = (
      (average_execution_time_ms * total_executions + p_execution_time_ms) / 
      (total_executions + 1)
    ),
    success_rate = (
      (successful_executions + CASE WHEN p_success THEN 1 ELSE 0 END)::DECIMAL /
      (total_executions + 1) * 100
    ),
    last_executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_instruction_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ai_instructions IS 'Enhanced AI instructions supporting hierarchical document modification';
COMMENT ON TABLE instruction_executions IS 'Execution log and audit trail for AI instructions';
COMMENT ON TABLE instruction_conflicts IS 'Tracking and resolution of instruction conflicts';
COMMENT ON VIEW instruction_performance_analytics IS 'Performance analytics and insights for AI instructions';

COMMENT ON COLUMN ai_instructions.target_config IS 'JSONB configuration for instruction targeting (CSS selectors, element IDs, table coordinates)';
COMMENT ON COLUMN ai_instructions.priority IS 'Instruction priority for conflict resolution (1-10, higher wins)';
COMMENT ON COLUMN ai_instructions.execution_order IS 'Order of execution within same instruction type';

-- Insert default global instruction templates for common use cases
INSERT INTO ai_instructions (
  template_id, user_id, title, instruction, 
  instruction_type, instruction_scope, target_config,
  prompt_template, example_before, example_after,
  is_active, priority, execution_order
) VALUES 
  -- Global tone instructions
  (
    NULL, -- Will be filled when creating templates
    NULL, -- Will be filled by user
    'Professional Tone',
    'Rewrite the entire document using a professional and formal tone. Maintain all facts and data but enhance the language to be more business-appropriate.',
    'global',
    'document',
    '{"type": "global"}',
    'Rewrite this content using a professional tone: {{content}}',
    'The project went well and we got good results.',
    'The project achieved successful outcomes and delivered satisfactory results.',
    false, -- Inactive by default, user activates as needed
    5,
    1
  ),
  -- Section enhancement template
  (
    NULL,
    NULL,
    'Enhance Section Conclusions',
    'For each section conclusion, add a brief summary of key points and ensure logical flow to the next section.',
    'section',
    'section',
    '{"type": "section", "selector": ".conclusion"}',
    'Enhance this section conclusion: {{content}}. Context from previous sections: {{context}}',
    'In summary, the analysis shows positive trends.',
    'In summary, the analysis demonstrates consistently positive trends across all measured parameters, indicating strong performance and establishing a solid foundation for the strategic recommendations outlined in the following section.',
    false,
    6,
    1
  );

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'Enhanced AI Instructions System database schema created successfully!';
  RAISE NOTICE 'Tables created: ai_instructions, instruction_executions, instruction_conflicts';
  RAISE NOTICE 'Performance analytics view and RLS policies configured';
  RAISE NOTICE 'Ready for hierarchical instruction processing: global → section → paragraph → table → cell';
END $$;