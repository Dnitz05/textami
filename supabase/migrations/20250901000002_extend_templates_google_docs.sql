-- Extend templates table for Google Docs support
-- This adds the necessary fields for hybrid DOCX + Google Docs system

-- Add new columns for source type and Google Docs integration
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('docx', 'google-docs')) DEFAULT 'docx',
ADD COLUMN IF NOT EXISTS source_id TEXT, -- Google Doc ID or storage path
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS google_doc_id TEXT, -- Specific Google Doc ID
ADD COLUMN IF NOT EXISTS html_content TEXT, -- Processed HTML content for Google Docs
ADD COLUMN IF NOT EXISTS placeholders JSONB DEFAULT '[]'::jsonb, -- AI-detected placeholders
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb, -- Document sections/headings
ADD COLUMN IF NOT EXISTS tables JSONB DEFAULT '[]'::jsonb; -- Extracted tables

-- Update constraints to make file_url and storage_path optional for Google Docs
-- (Google Docs don't have local file storage)
ALTER TABLE templates 
ALTER COLUMN file_url DROP NOT NULL,
ALTER COLUMN storage_path DROP NOT NULL;

-- Add new constraint: either DOCX fields OR Google Docs fields must be present
ALTER TABLE templates 
ADD CONSTRAINT valid_template_source CHECK (
  CASE 
    WHEN source_type = 'docx' THEN 
      file_url IS NOT NULL AND storage_path IS NOT NULL
    WHEN source_type = 'google-docs' THEN 
      google_doc_id IS NOT NULL AND html_content IS NOT NULL
    ELSE false
  END
);

-- Update unique constraint for storage_path (only apply when not NULL)
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_storage_path_key;
CREATE UNIQUE INDEX templates_storage_path_unique 
ON templates (storage_path) 
WHERE storage_path IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_source_type ON templates(source_type);
CREATE INDEX IF NOT EXISTS idx_templates_google_doc_id ON templates(google_doc_id) WHERE google_doc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_templates_source_id ON templates(source_id);
CREATE INDEX IF NOT EXISTS idx_templates_html_content_search ON templates USING gin(to_tsvector('english', html_content)) WHERE html_content IS NOT NULL;

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_templates_placeholders ON templates USING gin(placeholders);
CREATE INDEX IF NOT EXISTS idx_templates_sections ON templates USING gin(sections);
CREATE INDEX IF NOT EXISTS idx_templates_tables ON templates USING gin(tables);
CREATE INDEX IF NOT EXISTS idx_templates_source_metadata ON templates USING gin(source_metadata);

-- Update RLS policies to handle both source types
-- (Existing policies should still work, but add specific ones for Google Docs)

-- Add helpful comments
COMMENT ON COLUMN templates.source_type IS 'Template source: docx (uploaded file) or google-docs (Google Drive document)';
COMMENT ON COLUMN templates.source_id IS 'Source identifier: storage path for DOCX or Google Doc ID';
COMMENT ON COLUMN templates.source_metadata IS 'Additional metadata about the source (creation date, permissions, etc.)';
COMMENT ON COLUMN templates.google_doc_id IS 'Google Drive document ID for google-docs source type';
COMMENT ON COLUMN templates.html_content IS 'Processed HTML content for Google Docs templates';
COMMENT ON COLUMN templates.placeholders IS 'AI-detected placeholders with confidence scores and types';
COMMENT ON COLUMN templates.sections IS 'Document structure: headings, sections, and hierarchy';
COMMENT ON COLUMN templates.tables IS 'Extracted tables with headers and data structure';

-- Create a view for easy querying of Google Docs templates
CREATE OR REPLACE VIEW google_docs_templates AS
SELECT 
  id,
  user_id,
  name,
  description,
  google_doc_id,
  html_content,
  placeholders,
  sections,
  tables,
  source_metadata,
  is_public,
  is_active,
  usage_count,
  last_used_at,
  created_at,
  updated_at
FROM templates 
WHERE source_type = 'google-docs' AND is_active = true;

-- Grant appropriate permissions to the view
GRANT SELECT ON google_docs_templates TO authenticated;

-- Enable RLS on the view (inherits from templates table)
ALTER VIEW google_docs_templates OWNER TO postgres;