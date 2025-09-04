-- Add ai_features column to templates table for storing AI analysis metadata
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS ai_features JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN templates.ai_features IS 'AI analysis metadata for the template, including detected features and confidence scores';

-- Create index for better performance on queries involving ai_features
CREATE INDEX IF NOT EXISTS idx_templates_ai_features ON templates USING gin(ai_features);
