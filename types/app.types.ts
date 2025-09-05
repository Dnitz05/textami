// types/app.types.ts
// TEXTAMI APPLICATION TYPES - PRODUCTION-READY TYPE DEFINITIONS
// Zero technical debt - comprehensive typing for all application domains
// Strict TypeScript with no 'any' types allowed

import { Database } from './database.types'

// =============================================================================
// DATABASE TABLE TYPES (Re-exported for convenience)
// =============================================================================

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Template = Database['public']['Tables']['templates']['Row']
export type TemplateInsert = Database['public']['Tables']['templates']['Insert']
export type TemplateUpdate = Database['public']['Tables']['templates']['Update']

// Note: The following table types were removed during Google-first refactor:
// - data_sources (Excel files now processed directly via API)
// - variable_mappings (AI handles mapping automatically)  
// - generations (simplified to direct generation API calls)
// - usage_logs (logging handled by application layer)

// =============================================================================
// BUSINESS DOMAIN TYPES
// =============================================================================

// Subscription Plans
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise'

// Subscription Status
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'expired'

// Supported Languages
export type SupportedLanguage = 'ca' | 'es' | 'en' | 'fr'

// Template Categories
export type TemplateCategory = 'general' | 'business' | 'legal' | 'marketing' | 'hr' | 'finance'

// File Types
export type SupportedFileType = 'excel' | 'csv'
export type GoogleDocsMimeType = 'application/vnd.google-apps.document'

// Generation Status
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

// Generation Types
export type GenerationType = 'single' | 'batch' | 'bulk' | 'test'

// Processing Status
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Usage Log Actions
export type UsageLogAction = 
  | 'template_upload' 
  | 'template_delete' 
  | 'data_source_upload' 
  | 'data_source_delete'
  | 'variable_mapping_create' 
  | 'variable_mapping_update' 
  | 'variable_mapping_delete'
  | 'document_generation' 
  | 'document_download' 
  | 'bulk_generation'
  | 'ai_enhancement' 
  | 'ai_suggestion' 
  | 'profile_update' 
  | 'plan_upgrade' 
  | 'login' 
  | 'logout'

// Resource Types
export type ResourceType = 'template' | 'data_source' | 'mapping' | 'generation' | 'profile' | 'system'

// Operation Status
export type OperationStatus = 'success' | 'error' | 'warning'

// =============================================================================
// APPLICATION STATE TYPES
// =============================================================================

// Loading States
export interface LoadingState {
  isLoading: boolean
  operation?: string
  progress?: number
}

// Error State
export interface ErrorState {
  hasError: boolean
  message?: string
  code?: string
  details?: Record<string, unknown>
}

// Pagination
export interface PaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Sort Configuration
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// Filter Configuration
export interface FilterConfig {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'not_in'
  value: unknown
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

// Button Variants
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

// Input Types
export type InputVariant = 'default' | 'error' | 'success'
export type InputSize = 'sm' | 'md' | 'lg'

// Modal State
export interface ModalState {
  isOpen: boolean
  title?: string
  content?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

// Toast Notification
export interface ToastNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

// =============================================================================
// FILE HANDLING TYPES
// =============================================================================

// File Upload State
export interface FileUploadState {
  file: File | null
  uploading: boolean
  progress: number
  error: string | null
  url: string | null
}

// File Validation Rules
export interface FileValidationRules {
  maxSizeBytes: number
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

// File Processing Result
export interface FileProcessingResult {
  success: boolean
  url?: string
  metadata?: Record<string, unknown>
  error?: string
}

// =============================================================================
// DOCUMENT GENERATION TYPES
// =============================================================================

// Template Variable Definition
export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'image' | 'table'
  required: boolean
  description?: string
  defaultValue?: unknown
  validation?: {
    pattern?: string
    min?: number
    max?: number
    options?: string[]
  }
}

// Data Mapping Configuration
export interface DataMappingConfig {
  templateVariable: string
  dataColumn: string
  transformation?: {
    type: 'format' | 'calculate' | 'lookup' | 'conditional'
    configuration: Record<string, unknown>
  }
}

// Generation Configuration
export interface GenerationConfig {
  templateId: string
  dataSourceId?: string
  variableMappingId?: string
  outputFormat?: 'google-docs' | 'pdf'
  batchSize?: number
  priority?: number
  metadata?: Record<string, unknown>
}

// Generation Progress
export interface GenerationProgress {
  total: number
  completed: number
  failed: number
  percentage: number
  estimatedTimeRemaining?: number
  currentDocument?: string
}

// =============================================================================
// API TYPES
// =============================================================================

// API Response Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    pagination?: PaginationState
    timing?: number
    version?: string
  }
}

// API Request Options
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
  retries?: number
}

// =============================================================================
// FORM TYPES
// =============================================================================

// Form Field Configuration
export interface FormFieldConfig {
  name: string
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'file'
  label: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
    options?: Array<{ value: string; label: string }>
  }
}

// Form State
export interface FormState<T = Record<string, unknown>> {
  data: T
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isValid: boolean
  isDirty: boolean
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

// Usage Statistics
export interface UsageStatistics {
  totalTemplates: number
  totalDataSources: number
  totalGenerations: number
  creditsUsed: number
  creditsRemaining: number
  popularTemplates: Array<{
    id: string
    name: string
    usageCount: number
  }>
  recentActivity: Array<{
    action: UsageLogAction
    timestamp: string
    resourceName?: string
  }>
}

// Performance Metrics
export interface PerformanceMetrics {
  averageGenerationTime: number
  successRate: number
  errorRate: number
  throughput: number
  peakUsageHours: number[]
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

// Dashboard Widget
export interface DashboardWidget {
  id: string
  type: 'stat' | 'chart' | 'list' | 'table' | 'progress'
  title: string
  data: unknown
  size: 'sm' | 'md' | 'lg'
  position: {
    x: number
    y: number
    w: number
    h: number
  }
}

// Dashboard Layout
export interface DashboardLayout {
  id: string
  name: string
  widgets: DashboardWidget[]
  isDefault: boolean
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

// Search Configuration
export interface SearchConfig {
  query: string
  fields: string[]
  fuzzy?: boolean
  caseSensitive?: boolean
  highlightResults?: boolean
}

// Advanced Filter
export interface AdvancedFilter {
  id: string
  name: string
  conditions: FilterConfig[]
  operator: 'and' | 'or'
  isActive: boolean
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

// Notification Preference
export interface NotificationPreference {
  type: 'email' | 'push' | 'in_app'
  event: string
  enabled: boolean
  settings?: Record<string, unknown>
}

// System Notification
export interface SystemNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  read: boolean
  createdAt: string
  expiresAt?: string
  actions?: Array<{
    label: string
    url?: string
    action?: string
  }>
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Omit keys utility
export type OmitKeys<T, K extends keyof T> = Omit<T, K>

// Pick keys utility
export type PickKeys<T, K extends keyof T> = Pick<T, K>

// Make optional utility
export type Optional<T, K extends keyof T> = OmitKeys<T, K> & Partial<PickKeys<T, K>>

// Make required utility
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] }

// Deep partial utility
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Strict object type (no index signatures)
export type StrictObject<T> = {
  [K in keyof T]: T[K]
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

// Application Configuration
export interface AppConfig {
  name: string
  version: string
  environment: 'development' | 'staging' | 'production'
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  features: {
    enableAnalytics: boolean
    enableNotifications: boolean
    enableAdvancedFilters: boolean
  }
  limits: {
    maxFileSize: number
    maxTemplates: number
    maxGenerationsPerDay: number
  }
}

// Theme Configuration
export interface ThemeConfig {
  name: string
  colors: {
    primary: string
    secondary: string
    success: string
    warning: string
    error: string
    background: string
    surface: string
    text: string
  }
  fonts: {
    primary: string
    secondary: string
    monospace: string
  }
  spacing: Record<string, string>
  breakpoints: Record<string, string>
}