// types/template.types.ts
// Tipus per plantilles i dades - SIMPLE i CLAR

export interface Template {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  file_url: string;
  variables: string[];
  sample_data: Record<string, any>;
  created_at: string;
}

export interface DataSource {
  id: string;
  template_id: string;
  file_url: string;
  file_type: 'excel' | 'csv';
  column_mapping: Record<string, string>; // columna Excel -> variable plantilla
  row_count?: number;
  created_at: string;
}

export interface ColumnMapping {
  [excelColumn: string]: string; // nom variable a plantilla
}

export interface ExcelColumn {
  name: string;
  index: number;
  sampleData: any;
}