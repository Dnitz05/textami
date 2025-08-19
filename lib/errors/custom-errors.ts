// lib/errors/custom-errors.ts
// TEXTAMI CUSTOM ERRORS - NO TECHNICAL DEBT ALLOWED
// Production-ready error classes with stack traces and error codes
// Zero 'any' types - strict TypeScript enforcement

export enum ErrorCode {
  // Authentication Errors (AUTH_xxx)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_REGISTRATION_FAILED = 'AUTH_REGISTRATION_FAILED',
  AUTH_EMAIL_NOT_CONFIRMED = 'AUTH_EMAIL_NOT_CONFIRMED',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',

  // Validation Errors (VAL_xxx)
  VAL_REQUIRED_FIELD = 'VAL_REQUIRED_FIELD',
  VAL_INVALID_FORMAT = 'VAL_INVALID_FORMAT',
  VAL_INVALID_LENGTH = 'VAL_INVALID_LENGTH',
  VAL_INVALID_FILE_TYPE = 'VAL_INVALID_FILE_TYPE',
  VAL_FILE_TOO_LARGE = 'VAL_FILE_TOO_LARGE',
  VAL_INVALID_EMAIL = 'VAL_INVALID_EMAIL',
  VAL_PASSWORD_TOO_WEAK = 'VAL_PASSWORD_TOO_WEAK',

  // Database Errors (DB_xxx)
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  DB_RECORD_NOT_FOUND = 'DB_RECORD_NOT_FOUND',
  DB_DUPLICATE_RECORD = 'DB_DUPLICATE_RECORD',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  DB_TIMEOUT = 'DB_TIMEOUT',

  // Business Logic Errors (BIZ_xxx)
  BIZ_INSUFFICIENT_CREDITS = 'BIZ_INSUFFICIENT_CREDITS',
  BIZ_TEMPLATE_NOT_COMPATIBLE = 'BIZ_TEMPLATE_NOT_COMPATIBLE',
  BIZ_GENERATION_IN_PROGRESS = 'BIZ_GENERATION_IN_PROGRESS',
  BIZ_RESOURCE_NOT_OWNED = 'BIZ_RESOURCE_NOT_OWNED',
  BIZ_OPERATION_NOT_ALLOWED = 'BIZ_OPERATION_NOT_ALLOWED',
  
  // File/Storage Errors (FILE_xxx)
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_DOWNLOAD_FAILED = 'FILE_DOWNLOAD_FAILED',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_PROCESSING_FAILED = 'FILE_PROCESSING_FAILED',
  
  // System Errors (SYS_xxx)
  SYS_INTERNAL_ERROR = 'SYS_INTERNAL_ERROR',
  SYS_SERVICE_UNAVAILABLE = 'SYS_SERVICE_UNAVAILABLE',
  SYS_RATE_LIMIT_EXCEEDED = 'SYS_RATE_LIMIT_EXCEEDED',
  SYS_CONFIGURATION_ERROR = 'SYS_CONFIGURATION_ERROR'
}

export interface ErrorContext {
  userId?: string
  resourceId?: string
  resourceType?: string
  operation?: string
  timestamp?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: ErrorContext
  public readonly cause?: Error

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = {
      ...context,
      timestamp: context?.timestamp || new Date().toISOString()
    }
    this.cause = cause

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
      cause: this.cause?.message
    }
  }

  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}${this.context?.userId ? ` (User: ${this.context.userId})` : ''}`
  }
}

export class AuthError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AUTH_REQUIRED,
    statusCode: number = 401,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message, code, statusCode, true, context, cause)
  }

  static required(context?: ErrorContext): AuthError {
    return new AuthError(
      'Authentication required. Please log in to continue.',
      ErrorCode.AUTH_REQUIRED,
      401,
      context
    )
  }

  static invalidToken(context?: ErrorContext, cause?: Error): AuthError {
    return new AuthError(
      'Invalid or expired authentication token.',
      ErrorCode.AUTH_INVALID_TOKEN,
      401,
      context,
      cause
    )
  }

  static sessionExpired(context?: ErrorContext): AuthError {
    return new AuthError(
      'Your session has expired. Please log in again.',
      ErrorCode.AUTH_SESSION_EXPIRED,
      401,
      context
    )
  }

  static invalidCredentials(context?: ErrorContext): AuthError {
    return new AuthError(
      'Invalid email or password. Please try again.',
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      401,
      context
    )
  }

  static permissionDenied(operation: string, context?: ErrorContext): AuthError {
    return new AuthError(
      `Permission denied. You don't have access to perform this operation: ${operation}`,
      ErrorCode.AUTH_PERMISSION_DENIED,
      403,
      { ...context, operation }
    )
  }

  static registrationFailed(reason: string, context?: ErrorContext, cause?: Error): AuthError {
    return new AuthError(
      `Registration failed: ${reason}`,
      ErrorCode.AUTH_REGISTRATION_FAILED,
      400,
      context,
      cause
    )
  }
}

export class ValidationError extends AppError {
  public readonly field?: string
  public readonly value?: unknown

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.VAL_INVALID_FORMAT,
    field?: string,
    value?: unknown,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message, code, 400, true, context, cause)
    this.field = field
    this.value = value
  }

  static requiredField(field: string, context?: ErrorContext): ValidationError {
    return new ValidationError(
      `Field '${field}' is required and cannot be empty.`,
      ErrorCode.VAL_REQUIRED_FIELD,
      field,
      undefined,
      context
    )
  }

  static invalidFormat(field: string, expectedFormat: string, value?: unknown, context?: ErrorContext): ValidationError {
    return new ValidationError(
      `Field '${field}' has invalid format. Expected: ${expectedFormat}`,
      ErrorCode.VAL_INVALID_FORMAT,
      field,
      value,
      context
    )
  }

  static invalidLength(field: string, min?: number, max?: number, currentLength?: number, context?: ErrorContext): ValidationError {
    let message = `Field '${field}' has invalid length`
    if (min !== undefined && max !== undefined) {
      message += ` (must be between ${min} and ${max} characters)`
    } else if (min !== undefined) {
      message += ` (must be at least ${min} characters)`
    } else if (max !== undefined) {
      message += ` (must be no more than ${max} characters)`
    }
    if (currentLength !== undefined) {
      message += `. Current length: ${currentLength}`
    }

    return new ValidationError(
      message,
      ErrorCode.VAL_INVALID_LENGTH,
      field,
      currentLength,
      context
    )
  }

  static invalidFileType(allowedTypes: string[], receivedType: string, context?: ErrorContext): ValidationError {
    return new ValidationError(
      `Invalid file type '${receivedType}'. Allowed types: ${allowedTypes.join(', ')}`,
      ErrorCode.VAL_INVALID_FILE_TYPE,
      'file',
      receivedType,
      context
    )
  }

  static fileTooLarge(maxSize: number, actualSize: number, context?: ErrorContext): ValidationError {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    const actualSizeMB = Math.round(actualSize / (1024 * 1024))
    
    return new ValidationError(
      `File too large. Maximum size: ${maxSizeMB}MB, actual size: ${actualSizeMB}MB`,
      ErrorCode.VAL_FILE_TOO_LARGE,
      'file',
      actualSize,
      context
    )
  }

  static invalidEmail(email: string, context?: ErrorContext): ValidationError {
    return new ValidationError(
      'Invalid email address format.',
      ErrorCode.VAL_INVALID_EMAIL,
      'email',
      email,
      context
    )
  }

  static passwordTooWeak(requirements: string[], context?: ErrorContext): ValidationError {
    return new ValidationError(
      `Password too weak. Requirements: ${requirements.join(', ')}`,
      ErrorCode.VAL_PASSWORD_TOO_WEAK,
      'password',
      undefined,
      context
    )
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value
    }
  }
}

export class DatabaseError extends AppError {
  public readonly query?: string
  public readonly table?: string

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DB_QUERY_FAILED,
    statusCode: number = 500,
    query?: string,
    table?: string,
    context?: ErrorContext,
    cause?: Error
  ) {
    super(message, code, statusCode, true, context, cause)
    this.query = query
    this.table = table
  }

  static connectionFailed(context?: ErrorContext, cause?: Error): DatabaseError {
    return new DatabaseError(
      'Database connection failed. Please try again later.',
      ErrorCode.DB_CONNECTION_FAILED,
      503,
      undefined,
      undefined,
      context,
      cause
    )
  }

  static queryFailed(query: string, table?: string, context?: ErrorContext, cause?: Error): DatabaseError {
    return new DatabaseError(
      `Database query failed${table ? ` on table '${table}'` : ''}`,
      ErrorCode.DB_QUERY_FAILED,
      500,
      query,
      table,
      context,
      cause
    )
  }

  static recordNotFound(table: string, identifier: string, context?: ErrorContext): DatabaseError {
    return new DatabaseError(
      `Record not found in table '${table}' with identifier '${identifier}'`,
      ErrorCode.DB_RECORD_NOT_FOUND,
      404,
      undefined,
      table,
      { ...context, resourceId: identifier }
    )
  }

  static duplicateRecord(table: string, field: string, value: string, context?: ErrorContext): DatabaseError {
    return new DatabaseError(
      `Duplicate record in table '${table}'. Field '${field}' with value '${value}' already exists.`,
      ErrorCode.DB_DUPLICATE_RECORD,
      409,
      undefined,
      table,
      context
    )
  }

  static constraintViolation(constraint: string, table?: string, context?: ErrorContext, cause?: Error): DatabaseError {
    return new DatabaseError(
      `Database constraint violation: ${constraint}${table ? ` in table '${table}'` : ''}`,
      ErrorCode.DB_CONSTRAINT_VIOLATION,
      400,
      undefined,
      table,
      context,
      cause
    )
  }

  static transactionFailed(operation: string, context?: ErrorContext, cause?: Error): DatabaseError {
    return new DatabaseError(
      `Database transaction failed during operation: ${operation}`,
      ErrorCode.DB_TRANSACTION_FAILED,
      500,
      undefined,
      undefined,
      { ...context, operation },
      cause
    )
  }

  static timeout(query?: string, context?: ErrorContext): DatabaseError {
    return new DatabaseError(
      'Database operation timed out. Please try again.',
      ErrorCode.DB_TIMEOUT,
      408,
      query,
      undefined,
      context
    )
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      query: this.query,
      table: this.table
    }
  }
}

// Helper function to check if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

// Helper function to extract user-friendly message
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof AppError) {
    // Return the original message for operational errors
    if (error.isOperational) {
      return error.message
    }
  }
  
  // Generic message for system errors
  return 'An unexpected error occurred. Please try again later.'
}

// Helper function to log errors properly
export function logError(error: Error, additionalContext?: Record<string, unknown>): void {
  const logData = {
    timestamp: new Date().toISOString(),
    error: error instanceof AppError ? error.toJSON() : {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    ...additionalContext
  }

  if (error instanceof AppError && error.isOperational) {
    console.warn('Operational Error:', JSON.stringify(logData, null, 2))
  } else {
    console.error('System Error:', JSON.stringify(logData, null, 2))
  }
}