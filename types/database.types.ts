// types/database.types.ts
// Clean Google-first database types for Textami

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          google_doc_id: string
          html_content: string
          source_type: string
          source_metadata: Json
          placeholders: Json
          sections: Json
          tables: Json
          is_active: boolean
          is_public: boolean
          usage_count: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          google_doc_id: string
          html_content: string
          source_type?: string
          source_metadata?: Json
          placeholders?: Json
          sections?: Json
          tables?: Json
          is_active?: boolean
          is_public?: boolean
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          google_doc_id?: string
          html_content?: string
          source_type?: string
          source_metadata?: Json
          placeholders?: Json
          sections?: Json
          tables?: Json
          is_active?: boolean
          is_public?: boolean
          usage_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}