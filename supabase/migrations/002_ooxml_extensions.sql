-- =============================================================================
-- TEXTAMI OOXML EXTENSIONS - Database Schema Extensions
-- =============================================================================
-- Afegeix suport per arquitectura OOXML+IA híbrida
-- Author: OOXML-Centric Implementation
-- Date: 30 Agost 2025
-- =============================================================================

-- Enable necessary extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- EXTENSIONS TO EXISTING TEMPLATES TABLE
-- =============================================================================

-- Add OOXML-specific columns to existing templates table
ALTER TABLE templates ADD COLUMN IF NOT EXISTS style_manifest JSONB DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS html_content TEXT DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS html_preview TEXT DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ooxml_report JSONB DEFAULT NULL;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS parsing_version TEXT DEFAULT 'ooxml-1.0';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS ai_placeholders JSONB DEFAULT '[]'::jsonb;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS html_elements_used JSONB DEFAULT '[]'::jsonb;

-- Add comments for new columns
COMMENT ON COLUMN templates.style_manifest IS 'OOXML style mappings (Word styles → HTML semantic elements)';
COMMENT ON COLUMN templates.html_content IS 'Generated semantic HTML content from OOXML parser';
COMMENT ON COLUMN templates.html_preview IS 'HTML preview for QA and validation';
COMMENT ON COLUMN templates.ooxml_report IS 'OOXML processing report with statistics and warnings';
COMMENT ON COLUMN templates.parsing_version IS 'Version of OOXML parser used';
COMMENT ON COLUMN templates.ai_placeholders IS 'AI-detected placeholder variables with confidence scores';
COMMENT ON COLUMN templates.html_elements_used IS 'List of HTML semantic elements used in template';

-- =============================================================================
-- NEW OOXML STORAGE BUCKETS (via Supabase CLI or Dashboard)
-- =============================================================================

-- Note: These buckets should be created via Supabase interface:
-- - template-docx: Original DOCX files
-- - template-manifests: styleManifest.json files  
-- - template-html: HTML content and previews
-- - ooxml-outputs: Generated documents and reports

-- =============================================================================
-- INDEXES FOR OOXML DATA PERFORMANCE
-- =============================================================================

-- Index for style manifest queries
CREATE INDEX IF NOT EXISTS idx_templates_style_manifest ON templates USING gin(style_manifest) 
WHERE style_manifest IS NOT NULL;

-- Index for parsing version filtering
CREATE INDEX IF NOT EXISTS idx_templates_parsing_version ON templates(parsing_version) 
WHERE parsing_version IS NOT NULL;

-- Index for AI placeholders searches
CREATE INDEX IF NOT EXISTS idx_templates_ai_placeholders ON templates USING gin(ai_placeholders)
WHERE ai_placeholders IS NOT NULL AND ai_placeholders != '[]'::jsonb;

-- Index for HTML elements queries
CREATE INDEX IF NOT EXISTS idx_templates_html_elements ON templates USING gin(html_elements_used)
WHERE html_elements_used IS NOT NULL AND html_elements_used != '[]'::jsonb;

-- =============================================================================
-- OOXML PROCESSING STATISTICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ooxml_processing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  processing_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- OOXML Parser Statistics
  ooxml_processing_time_ms INTEGER NOT NULL CHECK (ooxml_processing_time_ms >= 0),
  styles_extracted INTEGER DEFAULT 0 CHECK (styles_extracted >= 0),
  numbering_extracted INTEGER DEFAULT 0 CHECK (numbering_extracted >= 0),
  document_elements INTEGER DEFAULT 0 CHECK (document_elements >= 0),
  
  -- HTML Generation Statistics
  html_generation_time_ms INTEGER NOT NULL CHECK (html_generation_time_ms >= 0),
  html_elements_generated INTEGER DEFAULT 0 CHECK (html_elements_generated >= 0),
  html_size_bytes INTEGER DEFAULT 0 CHECK (html_size_bytes >= 0),
  
  -- AI Analysis Statistics
  ai_analysis_time_ms INTEGER NOT NULL CHECK (ai_analysis_time_ms >= 0),
  placeholders_detected INTEGER DEFAULT 0 CHECK (placeholders_detected >= 0),
  ai_confidence_avg DECIMAL(5,2) DEFAULT 0.00 CHECK (ai_confidence_avg >= 0 AND ai_confidence_avg <= 100),
  
  -- Overall Pipeline
  total_processing_time_ms INTEGER NOT NULL CHECK (total_processing_time_ms >= 0),
  pipeline_version TEXT DEFAULT 'ooxml+ia-1.0' NOT NULL,
  success BOOLEAN DEFAULT true NOT NULL,
  error_message TEXT,
  warnings JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- Add RLS for ooxml_processing_stats
ALTER TABLE ooxml_processing_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OOXML stats" ON ooxml_processing_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert OOXML stats" ON ooxml_processing_stats
  FOR INSERT WITH CHECK (true);

-- Indexes for performance analytics
CREATE INDEX idx_ooxml_stats_template_id ON ooxml_processing_stats(template_id);
CREATE INDEX idx_ooxml_stats_user_id ON ooxml_processing_stats(user_id);
CREATE INDEX idx_ooxml_stats_processing_date ON ooxml_processing_stats(processing_date DESC);
CREATE INDEX idx_ooxml_stats_pipeline_version ON ooxml_processing_stats(pipeline_version);
CREATE INDEX idx_ooxml_stats_success ON ooxml_processing_stats(success, processing_date DESC);

-- =============================================================================
-- OOXML STYLE MAPPINGS CACHE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ooxml_style_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_style_name TEXT NOT NULL,
  html_element TEXT NOT NULL,
  confidence_score DECIMAL(5,2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  usage_count INTEGER DEFAULT 1 CHECK (usage_count >= 0),
  created_by_template UUID REFERENCES templates ON DELETE SET NULL,
  
  -- Learning data
  user_validated BOOLEAN DEFAULT false,
  validation_count INTEGER DEFAULT 0 CHECK (validation_count >= 0),
  success_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (success_rate >= 0 AND success_rate <= 100),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure unique mappings
  CONSTRAINT unique_word_style_html_element UNIQUE (word_style_name, html_element)
);

-- Add RLS for style mappings (public read, system write)
ALTER TABLE ooxml_style_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read style mappings" ON ooxml_style_mappings
  FOR SELECT USING (true);

CREATE POLICY "System can manage style mappings" ON ooxml_style_mappings
  FOR ALL WITH CHECK (true);

-- Indexes for style mapping queries
CREATE INDEX idx_ooxml_mappings_word_style ON ooxml_style_mappings(word_style_name);
CREATE INDEX idx_ooxml_mappings_html_element ON ooxml_style_mappings(html_element);
CREATE INDEX idx_ooxml_mappings_confidence ON ooxml_style_mappings(confidence_score DESC);
CREATE INDEX idx_ooxml_mappings_usage ON ooxml_style_mappings(usage_count DESC);

-- =============================================================================
-- FUNCTIONS FOR OOXML OPERATIONS
-- =============================================================================

-- Function to update style mapping statistics
CREATE OR REPLACE FUNCTION update_style_mapping_stats(
  p_word_style TEXT,
  p_html_element TEXT,
  p_success BOOLEAN DEFAULT true,
  p_template_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ooxml_style_mappings (
    word_style_name, 
    html_element, 
    created_by_template,
    usage_count,
    success_rate
  )
  VALUES (
    p_word_style, 
    p_html_element, 
    p_template_id,
    1,
    CASE WHEN p_success THEN 100.0 ELSE 0.0 END
  )
  ON CONFLICT (word_style_name, html_element) 
  DO UPDATE SET
    usage_count = ooxml_style_mappings.usage_count + 1,
    validation_count = ooxml_style_mappings.validation_count + 1,
    success_rate = (
      (ooxml_style_mappings.success_rate * ooxml_style_mappings.validation_count + 
       CASE WHEN p_success THEN 100.0 ELSE 0.0 END) / 
      (ooxml_style_mappings.validation_count + 1)
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get best style mapping for a Word style
CREATE OR REPLACE FUNCTION get_best_style_mapping(p_word_style TEXT)
RETURNS TABLE(
  html_element TEXT,
  confidence_score DECIMAL(5,2),
  usage_count INTEGER,
  success_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.html_element,
    m.confidence_score,
    m.usage_count,
    m.success_rate
  FROM ooxml_style_mappings m
  WHERE m.word_style_name ILIKE p_word_style
  ORDER BY 
    m.success_rate DESC,
    m.confidence_score DESC,
    m.usage_count DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record OOXML processing statistics
CREATE OR REPLACE FUNCTION record_ooxml_processing(
  p_template_id UUID,
  p_user_id UUID,
  p_ooxml_time_ms INTEGER,
  p_html_time_ms INTEGER,
  p_ai_time_ms INTEGER,
  p_styles_count INTEGER DEFAULT 0,
  p_placeholders_count INTEGER DEFAULT 0,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  stat_id UUID;
BEGIN
  INSERT INTO ooxml_processing_stats (
    template_id,
    user_id,
    ooxml_processing_time_ms,
    html_generation_time_ms,
    ai_analysis_time_ms,
    total_processing_time_ms,
    styles_extracted,
    placeholders_detected,
    success,
    error_message
  )
  VALUES (
    p_template_id,
    p_user_id,
    p_ooxml_time_ms,
    p_html_time_ms,
    p_ai_time_ms,
    p_ooxml_time_ms + p_html_time_ms + p_ai_time_ms,
    p_styles_count,
    p_placeholders_count,
    p_success,
    p_error_message
  )
  RETURNING id INTO stat_id;
  
  RETURN stat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- UPDATE TRIGGERS FOR TIMESTAMPS
-- =============================================================================

-- Add updated_at trigger to new tables
CREATE TRIGGER update_ooxml_stats_updated_at 
  BEFORE UPDATE ON ooxml_processing_stats
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_style_mappings_updated_at 
  BEFORE UPDATE ON ooxml_style_mappings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =============================================================================
-- USAGE LOG EXTENSIONS
-- =============================================================================

-- Add OOXML-specific action types to usage_logs check constraint
ALTER TABLE usage_logs 
DROP CONSTRAINT IF EXISTS usage_logs_action_type_check,
ADD CONSTRAINT usage_logs_action_type_check 
CHECK (action_type IN (
  'template_upload', 'template_delete', 'data_source_upload', 'data_source_delete',
  'variable_mapping_create', 'variable_mapping_update', 'variable_mapping_delete',
  'document_generation', 'document_download', 'bulk_generation',
  'ai_enhancement', 'ai_suggestion', 'profile_update', 'plan_upgrade', 'login', 'logout',
  -- OOXML-specific actions
  'ooxml_parsing', 'html_generation', 'ai_analysis', 'style_mapping_update'
));

-- =============================================================================
-- VERIFICATION AND CLEANUP
-- =============================================================================

-- Verify all extensions were applied
DO $$
DECLARE
  template_columns INTEGER;
  new_tables INTEGER;
  new_indexes INTEGER;
  new_functions INTEGER;
BEGIN
  -- Count new template columns
  SELECT COUNT(*) INTO template_columns
  FROM information_schema.columns 
  WHERE table_name = 'templates' 
    AND column_name IN ('style_manifest', 'html_content', 'ooxml_report', 'parsing_version', 'ai_placeholders');
  
  -- Count new tables
  SELECT COUNT(*) INTO new_tables
  FROM information_schema.tables 
  WHERE table_name IN ('ooxml_processing_stats', 'ooxml_style_mappings');
  
  -- Count new indexes
  SELECT COUNT(*) INTO new_indexes
  FROM pg_indexes 
  WHERE indexname LIKE 'idx_templates_style%' OR indexname LIKE 'idx_ooxml%';
  
  -- Count new functions
  SELECT COUNT(*) INTO new_functions
  FROM information_schema.routines 
  WHERE routine_name IN ('update_style_mapping_stats', 'get_best_style_mapping', 'record_ooxml_processing');
  
  RAISE NOTICE 'OOXML Extensions Applied:';
  RAISE NOTICE '- Template columns: % (expected: 5)', template_columns;
  RAISE NOTICE '- New tables: % (expected: 2)', new_tables;  
  RAISE NOTICE '- New indexes: % (expected: 8+)', new_indexes;
  RAISE NOTICE '- New functions: % (expected: 3)', new_functions;
  
  IF template_columns >= 5 AND new_tables >= 2 AND new_functions >= 3 THEN
    RAISE NOTICE '✅ SUCCESS: All OOXML extensions applied correctly';
  ELSE
    RAISE WARNING '⚠️ Some OOXML extensions may be missing';
  END IF;
END
$$;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE ooxml_processing_stats IS 'Statistics and performance data for OOXML+IA hybrid processing pipeline';
COMMENT ON TABLE ooxml_style_mappings IS 'Learned mappings between Word styles and HTML semantic elements with success tracking';

COMMENT ON FUNCTION update_style_mapping_stats IS 'Updates usage statistics and success rates for Word→HTML style mappings';
COMMENT ON FUNCTION get_best_style_mapping IS 'Returns the best HTML element mapping for a given Word style based on success rate';
COMMENT ON FUNCTION record_ooxml_processing IS 'Records complete OOXML+IA processing statistics for analytics and optimization';

-- =============================================================================
-- END OF OOXML EXTENSIONS
-- =============================================================================

RAISE NOTICE '🚀 OOXML Extensions Migration Completed Successfully';
RAISE NOTICE 'Ready for OOXML+IA Hybrid Architecture Implementation';