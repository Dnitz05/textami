// types/generation.types.ts
// Tipus per generació de documents - MVP

export interface Generation {
  id: string;
  template_id: string;
  data_source_id?: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_documents?: number;
  completed_documents: number;
  created_at: string;
}

export interface Document {
  id: string;
  generation_id: string;
  file_url: string;
  file_type: 'google-docs' | 'pdf';
  row_index?: number;
  created_at: string;
}

export interface GenerationProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

export interface BatchGenerationRequest {
  template_id: string;
  data_source_id?: string;
  output_format: 'google-docs' | 'pdf' | 'both';
  data?: Record<string, any>[];
}