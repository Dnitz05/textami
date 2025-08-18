// types/database.types.ts
// Tipus TypeScript per a la base de dades MVP - 4 taules només

export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          file_url: string
          variables: string[]
          sample_data: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          file_url: string
          variables?: string[]
          sample_data?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          file_url?: string
          variables?: string[]
          sample_data?: Record<string, any>
          created_at?: string
        }
      }
      data_sources: {
        Row: {
          id: string
          template_id: string
          file_url: string
          file_type: 'excel' | 'csv'
          column_mapping: Record<string, any>
          row_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          file_url: string
          file_type: 'excel' | 'csv'
          column_mapping?: Record<string, any>
          row_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          file_url?: string
          file_type?: 'excel' | 'csv'
          column_mapping?: Record<string, any>
          row_count?: number | null
          created_at?: string
        }
      }
      generations: {
        Row: {
          id: string
          template_id: string
          data_source_id: string | null
          user_id: string
          status: string
          total_documents: number | null
          completed_documents: number
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          data_source_id?: string | null
          user_id: string
          status?: string
          total_documents?: number | null
          completed_documents?: number
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          data_source_id?: string | null
          user_id?: string
          status?: string
          total_documents?: number | null
          completed_documents?: number
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          generation_id: string
          file_url: string
          file_type: 'docx' | 'pdf'
          row_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          generation_id: string
          file_url: string
          file_type: 'docx' | 'pdf'
          row_index?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          generation_id?: string
          file_url?: string
          file_type?: 'docx' | 'pdf'
          row_index?: number | null
          created_at?: string
        }
      }
    }
  }
}