-- docs/database-schema.sql
-- Schema de base de dades MVP per Textami
-- Només aquestes 4 taules pel MVP - NO MÉS!

-- Taula templates: plantilles Word pujades pels usuaris
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  sample_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taula data_sources: fitxers Excel/CSV amb dades
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('excel', 'csv')),
  column_mapping JSONB DEFAULT '{}',
  row_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taula generations: processos de generació de documents
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates NOT NULL,
  data_source_id UUID REFERENCES data_sources,
  user_id UUID REFERENCES auth.users NOT NULL,
  status TEXT DEFAULT 'pending',
  total_documents INTEGER,
  completed_documents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taula documents: documents individuals generats
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID REFERENCES generations NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('docx', 'pdf')),
  row_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) políticas
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Política templates: només el propietari pot veure les seves plantilles
CREATE POLICY "Users can view own templates" ON templates
  FOR ALL USING (auth.uid() = user_id);

-- Política data_sources: només si és propietari de la plantilla
CREATE POLICY "Users can manage own data_sources" ON data_sources
  FOR ALL USING (
    template_id IN (
      SELECT id FROM templates WHERE user_id = auth.uid()
    )
  );

-- Política generations: només el propietari
CREATE POLICY "Users can manage own generations" ON generations
  FOR ALL USING (auth.uid() = user_id);

-- Política documents: només si és propietari de la generació
CREATE POLICY "Users can view own documents" ON documents
  FOR ALL USING (
    generation_id IN (
      SELECT id FROM generations WHERE user_id = auth.uid()
    )
  );

-- Índexs per millor rendiment
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_data_sources_template_id ON data_sources(template_id);
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_template_id ON generations(template_id);
CREATE INDEX idx_documents_generation_id ON documents(generation_id);

-- Storage bucket policies (per executar a Supabase Dashboard)
/*
STORAGE BUCKET: templates
- Permet upload de .docx
- Permet download per propietaris
- RLS habilitat

STORAGE BUCKET: documents
- Només documents generats
- Permet download per propietaris
- RLS habilitat
*/