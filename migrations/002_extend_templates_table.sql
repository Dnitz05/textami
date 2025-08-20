-- Migration: Extend templates table for Visual Mapping System
-- Date: 2025-08-20  
-- Purpose: Add visual mapping support to existing templates

-- Add visual mapping columns to existing templates table
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS has_visual_mappings BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS excel_file_path TEXT,
ADD COLUMN IF NOT EXISTS word_file_path TEXT,
ADD COLUMN IF NOT EXISTS mapping_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS premium_modules_used TEXT[] DEFAULT '{}';

-- Update templates table with new indexes
CREATE INDEX IF NOT EXISTS idx_templates_visual_mappings ON templates(has_visual_mappings) WHERE has_visual_mappings = true;
CREATE INDEX IF NOT EXISTS idx_templates_premium_modules ON templates USING GIN (premium_modules_used);

-- Add triggers for automatic updates
CREATE OR REPLACE FUNCTION update_template_visual_mapping_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update has_visual_mappings flag when mappings are added/removed
    IF TG_OP = 'INSERT' THEN
        UPDATE templates 
        SET has_visual_mappings = true,
            premium_modules_used = ARRAY(
                SELECT DISTINCT docxtemplater_module 
                FROM visual_mappings 
                WHERE template_id = NEW.template_id AND is_active = true
            )
        WHERE id = NEW.template_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if template still has active mappings
        IF NOT EXISTS (
            SELECT 1 FROM visual_mappings 
            WHERE template_id = OLD.template_id AND is_active = true
        ) THEN
            UPDATE templates 
            SET has_visual_mappings = false,
                premium_modules_used = '{}'
            WHERE id = OLD.template_id;
        ELSE
            UPDATE templates 
            SET premium_modules_used = ARRAY(
                SELECT DISTINCT docxtemplater_module 
                FROM visual_mappings 
                WHERE template_id = OLD.template_id AND is_active = true
            )
            WHERE id = OLD.template_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE templates 
        SET premium_modules_used = ARRAY(
            SELECT DISTINCT docxtemplater_module 
            FROM visual_mappings 
            WHERE template_id = NEW.template_id AND is_active = true
        )
        WHERE id = NEW.template_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_template_visual_mapping_status ON visual_mappings;
CREATE TRIGGER trigger_update_template_visual_mapping_status
    AFTER INSERT OR UPDATE OR DELETE ON visual_mappings
    FOR EACH ROW EXECUTE FUNCTION update_template_visual_mapping_status();

-- Comments for documentation
COMMENT ON COLUMN templates.has_visual_mappings IS 'Flag indicating if template uses visual mapping system';
COMMENT ON COLUMN templates.excel_file_path IS 'Supabase Storage path to Excel file';
COMMENT ON COLUMN templates.word_file_path IS 'Supabase Storage path to Word file';
COMMENT ON COLUMN templates.mapping_metadata IS 'Additional metadata for visual mappings';
COMMENT ON COLUMN templates.premium_modules_used IS 'Array of premium modules used for ROI tracking';