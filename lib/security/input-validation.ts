// lib/security/input-validation.ts
// Comprehensive input validation and sanitization system
import { log } from '../logger';

// Common regex patterns for validation
export const VALIDATION_PATTERNS = {
  // Google Document ID format (alphanumeric with underscores and hyphens)
  GOOGLE_DOC_ID: /^[a-zA-Z0-9_-]{20,}$/,
  
  // UUID format for user IDs and template IDs
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Filename validation (allow most printable characters, exclude dangerous ones)
  FILENAME: /^[a-zA-Z0-9\s\.\-_,()\[\]!@#$%^&*+=:;'"?]+$/,
  
  // Email validation (basic)
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // Alphanumeric with common special characters
  SAFE_TEXT: /^[a-zA-Z0-9\s\.\-_,!?@#()]+$/,
  
  // Template name (more restrictive)
  TEMPLATE_NAME: /^[a-zA-Z0-9\s\-_]{1,100}$/
};

// Input length limits
export const LENGTH_LIMITS = {
  FILENAME: 255,
  TEMPLATE_NAME: 100,
  DESCRIPTION: 500,
  GOOGLE_DOC_ID: 200,
  USER_ID: 100,
  TEMPLATE_ID: 100,
  ANALYSIS_OPTIONS: 1000 // JSON string length
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

/**
 * Validate and sanitize Google Document ID
 */
export function validateGoogleDocId(docId: unknown): ValidationResult {
  if (typeof docId !== 'string') {
    return {
      isValid: false,
      errors: ['Document ID must be a string']
    };
  }

  // Remove whitespace
  const sanitized = docId.trim();
  
  // Check length
  if (sanitized.length === 0) {
    return {
      isValid: false,
      errors: ['Document ID cannot be empty']
    };
  }

  if (sanitized.length > LENGTH_LIMITS.GOOGLE_DOC_ID) {
    return {
      isValid: false,
      errors: [`Document ID too long (max ${LENGTH_LIMITS.GOOGLE_DOC_ID} characters)`]
    };
  }

  // Check format
  if (!VALIDATION_PATTERNS.GOOGLE_DOC_ID.test(sanitized)) {
    return {
      isValid: false,
      errors: ['Invalid Google Document ID format']
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: sanitized
  };
}

/**
 * Validate and sanitize user ID (UUID format)
 */
export function validateUserId(userId: unknown): ValidationResult {
  if (typeof userId !== 'string') {
    return {
      isValid: false,
      errors: ['User ID must be a string']
    };
  }

  const sanitized = userId.trim();
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      errors: ['User ID cannot be empty']
    };
  }

  if (!VALIDATION_PATTERNS.UUID.test(sanitized)) {
    return {
      isValid: false,
      errors: ['Invalid User ID format']
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: sanitized
  };
}

/**
 * Validate and sanitize filename
 */
export function validateFilename(filename: unknown): ValidationResult {
  if (filename === null || filename === undefined) {
    return {
      isValid: true,
      errors: [],
      sanitizedValue: undefined
    };
  }

  if (typeof filename !== 'string') {
    return {
      isValid: false,
      errors: ['Filename must be a string']
    };
  }

  // Remove dangerous characters and normalize
  let sanitized = filename.trim()
    .replace(/[<>:"/\\|?*]/g, '') // Remove Windows-forbidden chars
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, LENGTH_LIMITS.FILENAME);

  if (sanitized.length === 0) {
    return {
      isValid: false,
      errors: ['Filename cannot be empty after sanitization']
    };
  }

  // Additional safety check
  if (!VALIDATION_PATTERNS.FILENAME.test(sanitized)) {
    return {
      isValid: false,
      errors: [`Filename contains invalid characters: "${sanitized}"`]
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: sanitized
  };
}

/**
 * Validate and sanitize template name
 */
export function validateTemplateName(name: unknown): ValidationResult {
  if (typeof name !== 'string') {
    return {
      isValid: false,
      errors: ['Template name must be a string']
    };
  }

  const sanitized = name.trim();
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      errors: ['Template name cannot be empty']
    };
  }

  if (sanitized.length > LENGTH_LIMITS.TEMPLATE_NAME) {
    return {
      isValid: false,
      errors: [`Template name too long (max ${LENGTH_LIMITS.TEMPLATE_NAME} characters)`]
    };
  }

  if (!VALIDATION_PATTERNS.TEMPLATE_NAME.test(sanitized)) {
    return {
      isValid: false,
      errors: ['Template name contains invalid characters']
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: sanitized
  };
}

/**
 * Validate boolean flags with safe defaults
 */
export function validateBoolean(value: unknown, defaultValue: boolean = false): ValidationResult {
  if (value === null || value === undefined) {
    return {
      isValid: true,
      errors: [],
      sanitizedValue: defaultValue
    };
  }

  if (typeof value === 'boolean') {
    return {
      isValid: true,
      errors: [],
      sanitizedValue: value
    };
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return {
        isValid: true,
        errors: [],
        sanitizedValue: true
      };
    }
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
      return {
        isValid: true,
        errors: [],
        sanitizedValue: false
      };
    }
  }

  if (typeof value === 'number') {
    return {
      isValid: true,
      errors: [],
      sanitizedValue: value !== 0
    };
  }

  return {
    isValid: false,
    errors: ['Invalid boolean value']
  };
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtmlContent(html: unknown): ValidationResult {
  if (typeof html !== 'string') {
    return {
      isValid: false,
      errors: ['HTML content must be a string']
    };
  }

  // Basic HTML sanitization - remove script tags and dangerous attributes
  let sanitized = html
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/data:text\/html/gi, '') // Remove data: HTML URLs
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  // Limit length for safety
  if (sanitized.length > 100000) { // 100KB limit
    return {
      isValid: false,
      errors: ['HTML content too large (max 100KB)']
    };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedValue: sanitized
  };
}

/**
 * Validate request body with schema
 */
export function validateRequestSchema<T extends Record<string, unknown>>(
  body: unknown,
  schema: {
    [K in keyof T]: {
      required?: boolean;
      validator: (value: unknown) => ValidationResult;
    };
  }
): {
  isValid: boolean;
  errors: string[];
  sanitizedData?: Partial<T>;
} {
  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      errors: ['Request body must be a valid object']
    };
  }

  const bodyObj = body as Record<string, unknown>;
  const errors: string[] = [];
  const sanitizedData: Partial<T> = {};

  // Validate each field in the schema
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldValue = bodyObj[fieldName];
    const isRequired = fieldSchema.required ?? false;

    // Check if required field is missing
    if (isRequired && (fieldValue === undefined || fieldValue === null)) {
      errors.push(`Required field '${fieldName}' is missing`);
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!isRequired && (fieldValue === undefined || fieldValue === null)) {
      continue;
    }

    // Run field validator
    const result = fieldSchema.validator(fieldValue);
    
    if (!result.isValid) {
      errors.push(...result.errors.map(error => `${fieldName}: ${error}`));
    } else if (result.sanitizedValue !== undefined) {
      (sanitizedData as any)[fieldName] = result.sanitizedValue;
    }
  }

  // Log validation results for monitoring
  if (errors.length > 0) {
    log.warn('Input validation failed:', {
      errors,
      fieldCount: Object.keys(schema).length,
      providedFields: Object.keys(bodyObj)
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  };
}

/**
 * Rate limiting for validation calls to prevent abuse
 */
export function validateWithRateLimit(
  identifier: string,
  validator: () => ValidationResult
): ValidationResult {
  const rateLimitKey = `validation_${identifier}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const limit = 100; // 100 validations per minute per identifier

  // Get or create rate limit data
  const rateLimitData = (global as any)[rateLimitKey] as {
    requests: number[];
  } || { requests: [] };

  // Clean old requests
  rateLimitData.requests = rateLimitData.requests.filter(
    time => now - time < windowMs
  );

  // Check if limit exceeded
  if (rateLimitData.requests.length >= limit) {
    log.warn('Validation rate limit exceeded:', { identifier, limit });
    return {
      isValid: false,
      errors: ['Too many validation requests']
    };
  }

  // Add current request
  rateLimitData.requests.push(now);
  (global as any)[rateLimitKey] = rateLimitData;

  // Run the actual validator
  return validator();
}