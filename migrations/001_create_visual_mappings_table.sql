-- Migration: Create visual_mappings table for Textami Visual Mapping System
-- Date: 2025-08-20
-- Purpose: Support Excel ↔ Word visual mapping with Premium Modules integration

-- Create visual_mappings table
CREATE TABLE IF NOT EXISTS visual_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    
    -- Excel Column Information
    excel_column_name TEXT NOT NULL,
    excel_column_type TEXT NOT NULL CHECK (excel_column_type IN ('text', 'number', 'date', 'boolean')),
    excel_sample_data JSONB, -- Store sample data for preview
    
    -- Word Selection Information  
    word_selection_text TEXT NOT NULL,
    word_paragraph_id TEXT NOT NULL, -- data-paragraph-id from Word document
    word_selection_position JSONB NOT NULL, -- {start, end, rect} for precise positioning
    captured_styling JSONB, -- CSS styling for Style Module (€500 investment)
    
    -- Mapping Configuration
    mapping_type TEXT NOT NULL CHECK (mapping_type IN ('text', 'html', 'image', 'style')),
    generated_variable_name TEXT NOT NULL,
    generated_syntax TEXT NOT NULL, -- "{var}", "{~~html}", "{%img}", "{var:style=...}"
    docxtemplater_module TEXT NOT NULL CHECK (docxtemplater_module IN ('text', 'html', 'image', 'style')),
    
    -- Premium Module Value Tracking (ROI €1,250)
    module_value INTEGER DEFAULT 0, -- 0=text(free), 250=html/image, 500=style
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_template_variable UNIQUE (template_id, generated_variable_name),
    CONSTRAINT unique_template_word_selection UNIQUE (template_id, word_paragraph_id, word_selection_text)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visual_mappings_template ON visual_mappings(template_id);
CREATE INDEX IF NOT EXISTS idx_visual_mappings_type ON visual_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_visual_mappings_module ON visual_mappings(docxtemplater_module);
CREATE INDEX IF NOT EXISTS idx_visual_mappings_paragraph ON visual_mappings(word_paragraph_id);

-- ROI tracking view for Premium Modules
CREATE OR REPLACE VIEW premium_modules_roi AS
SELECT 
    template_id,
    docxtemplater_module,
    COUNT(*) as usage_count,
    SUM(module_value) as total_value,
    AVG(module_value) as avg_value_per_usage
FROM visual_mappings 
WHERE is_active = true
GROUP BY template_id, docxtemplater_module;

-- Template ROI summary view
CREATE OR REPLACE VIEW template_roi_summary AS
SELECT 
    t.id as template_id,
    t.name as template_name,
    COUNT(vm.id) as total_mappings,
    SUM(vm.module_value) as total_roi_value,
    ROUND(SUM(vm.module_value)::numeric / 1250 * 100, 2) as roi_percentage,
    COUNT(CASE WHEN vm.docxtemplater_module = 'html' THEN 1 END) as html_usage,
    COUNT(CASE WHEN vm.docxtemplater_module = 'image' THEN 1 END) as image_usage, 
    COUNT(CASE WHEN vm.docxtemplater_module = 'style' THEN 1 END) as style_usage
FROM templates t
LEFT JOIN visual_mappings vm ON t.id = vm.template_id AND vm.is_active = true
GROUP BY t.id, t.name;

-- Comments for documentation
COMMENT ON TABLE visual_mappings IS 'Visual mapping connections between Excel columns and Word text selections for Premium Modules exploitation';
COMMENT ON COLUMN visual_mappings.module_value IS 'ROI value: 0=text(free), 250=html/image, 500=style - tracks €1,250 investment';
COMMENT ON COLUMN visual_mappings.captured_styling IS 'CSS styling captured from Word for Style Module processing';
COMMENT ON COLUMN visual_mappings.generated_syntax IS 'Docxtemplater syntax generated: {var}, {~~html}, {%img}, {var:style=...}';