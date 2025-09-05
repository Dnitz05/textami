-- Google-First Refactor: Remove DOCX support and make system Google-only
-- Date: 2025-09-05
-- This migration transforms the hybrid system into a Google-native system

-- Update templates table to remove DOCX-specific constraints and make Google-only
BEGIN;

-- Remove the old hybrid constraint
ALTER TABLE templates DROP CONSTRAINT IF EXISTS valid_template_source;

-- Update the source_type to only allow google-docs
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_source_type_check;
ALTER TABLE templates ADD CONSTRAINT templates_source_type_check 
  CHECK (source_type IN ('google-docs'));

-- Set default source_type to google-docs
ALTER TABLE templates ALTER COLUMN source_type SET DEFAULT 'google-docs';

-- Update existing DOCX templates to google-docs (this should be coordinated with data migration)
-- UPDATE templates SET source_type = 'google-docs' WHERE source_type = 'docx';

-- Add new Google-only constraint: google_doc_id and html_content must be present
ALTER TABLE templates ADD CONSTRAINT google_docs_required_fields CHECK (
  source_type = 'google-docs' AND 
  google_doc_id IS NOT NULL AND 
  html_content IS NOT NULL
);

-- Make google_doc_id required
ALTER TABLE templates ALTER COLUMN google_doc_id SET NOT NULL;

-- Make html_content required 
ALTER TABLE templates ALTER COLUMN html_content SET NOT NULL;

-- Update file_url and storage_path to be optional (Google Docs don't use local storage)
-- (These were already made optional in the previous migration)

-- Update the google_docs_templates view to be the primary templates view
DROP VIEW IF EXISTS google_docs_templates;
CREATE OR REPLACE VIEW active_templates AS
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
  updated_at,
  category,
  premium_features,
  sample_data,
  variables
FROM templates 
WHERE source_type = 'google-docs' AND is_active = true;

-- Grant permissions
GRANT SELECT ON active_templates TO authenticated;
ALTER VIEW active_templates OWNER TO postgres;

-- Update comments to reflect Google-only architecture
COMMENT ON COLUMN templates.source_type IS 'Template source: google-docs (Google Drive document only)';
COMMENT ON COLUMN templates.source_id IS 'Google Doc ID (same as google_doc_id)';
COMMENT ON COLUMN templates.google_doc_id IS 'Google Drive document ID - REQUIRED for all templates';
COMMENT ON COLUMN templates.html_content IS 'Processed HTML content from Google Docs API - REQUIRED';
COMMENT ON COLUMN templates.file_url IS 'Optional: cached file URL for Google Docs export';
COMMENT ON COLUMN templates.storage_path IS 'Optional: cached storage path for Google Docs export';

-- Clean up legacy DOCX-specific data (commented out for safety)
-- These should be run manually after confirming no DOCX data needs to be preserved
/*
-- Remove any remaining DOCX-specific indexes
DROP INDEX IF EXISTS templates_storage_path_unique;

-- Clean up any DOCX templates (RUN MANUALLY AFTER BACKUP)
-- DELETE FROM templates WHERE source_type = 'docx';
-- DELETE FROM generations WHERE template_id IN (SELECT id FROM templates WHERE source_type = 'docx');
*/

COMMIT;

-- Update plantilla_configs table to remove DOCX references
BEGIN;

-- This table appears to be legacy and may need cleanup
-- Add comment to indicate it's legacy
COMMENT ON TABLE plantilla_configs IS 'LEGACY TABLE: Used in old DOCX system, may be deprecated in Google-first architecture';

COMMIT;