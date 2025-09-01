// lib/logger.ts
// Secure professional logging system with data sanitization

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  sanitized?: boolean;
}

// Sensitive data patterns to scrub from logs
const SENSITIVE_PATTERNS = [
  /access_token["']?\s*:\s*["'][^"']+["']/gi,
  /refresh_token["']?\s*:\s*["'][^"']+["']/gi,
  /password["']?\s*:\s*["'][^"']+["']/gi,
  /secret["']?\s*:\s*["'][^"']+["']/gi,
  /key["']?\s*:\s*["'][^"']+["']/gi,
  /authorization["']?\s*:\s*["']Bearer [^"']+["']/gi,
  /cookie["']?\s*:\s*["'][^"']+["']/gi
];

// Fields that should never be logged in full
const SENSITIVE_FIELDS = [
  'access_token',
  'refresh_token', 
  'password',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'token'
];

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // YOLO MODE: Always log everything in development for full visibility
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  // Sanitize sensitive data from log output
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    try {
      // Handle string data
      if (typeof data === 'string') {
        let sanitized = data;
        SENSITIVE_PATTERNS.forEach(pattern => {
          sanitized = sanitized.replace(pattern, (match) => {
            // Keep the field name but mask the value
            const parts = match.split(':');
            if (parts.length >= 2) {
              return `${parts[0]}: "[REDACTED]"`;
            }
            return '[REDACTED]';
          });
        });
        return sanitized;
      }
      
      // Handle object data
      if (typeof data === 'object' && data !== null) {
        const sanitized = JSON.parse(JSON.stringify(data));
        
        const sanitizeObject = (obj: any): any => {
          if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
          }
          
          if (typeof obj === 'object' && obj !== null) {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
              const keyLower = key.toLowerCase();
              
              // Check if key is sensitive
              if (SENSITIVE_FIELDS.some(field => keyLower.includes(field))) {
                if (typeof value === 'string' && value.length > 0) {
                  result[key] = `[REDACTED:${value.substring(0, 4)}...]`;
                } else {
                  result[key] = '[REDACTED]';
                }
              } else if (typeof value === 'object') {
                result[key] = sanitizeObject(value);
              } else {
                result[key] = value;
              }
            }
            return result;
          }
          
          return obj;
        };
        
        return sanitizeObject(sanitized);
      }
      
      return data;
    } catch (error) {
      // If sanitization fails, return a safe placeholder
      return '[DATA_SANITIZATION_ERROR]';
    }
  }

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    
    // Always sanitize data before logging
    const sanitizedData = this.sanitizeData(data);
    
    if (sanitizedData !== undefined) {
      console.log(`[${timestamp}] ${levelStr}: ${message}`, sanitizedData);
    } else {
      console.log(`[${timestamp}] ${levelStr}: ${message}`);
    }
  }

  error(message: string, data?: any): void {
    this.formatMessage(LogLevel.ERROR, `❌ ${message}`, data);
  }

  warn(message: string, data?: any): void {
    this.formatMessage(LogLevel.WARN, `⚠️ ${message}`, data);
  }

  info(message: string, data?: any): void {
    this.formatMessage(LogLevel.INFO, `ℹ️ ${message}`, data);
  }

  debug(message: string, data?: any): void {
    this.formatMessage(LogLevel.DEBUG, `🔍 ${message}`, data);
  }

  // Special methods for existing patterns
  ultrathink(message: string, data?: any): void {
    this.debug(`🧠 ULTRATHINK - ${message}`, data);
  }

  mapping(message: string, data?: any): void {
    this.debug(`🎯 MAPPING - ${message}`, data);
  }

  success(message: string, data?: any): void {
    this.info(`✅ ${message}`, data);
  }

  // YOLO MODE: High visibility logging for aggressive development
  yolo(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`🚀 YOLO: ${message}`, data ? data : '');
    }
  }

  // Security event logging with enhanced visibility
  security(message: string, data?: any): void {
    // Security events are always logged regardless of log level
    const timestamp = new Date().toISOString();
    const sanitizedData = this.sanitizeData(data);
    
    if (sanitizedData !== undefined) {
      console.log(`[${timestamp}] SECURITY: 🔒 ${message}`, sanitizedData);
    } else {
      console.log(`[${timestamp}] SECURITY: 🔒 ${message}`);
    }
    
    // In production, you might want to also send to a security monitoring service
    if (!this.isDevelopment) {
      // TODO: Integrate with security monitoring service (e.g., Sentry, DataDog)
    }
  }

  // Audit trail logging for compliance
  audit(action: string, userId?: string, data?: any): void {
    const auditData = {
      action,
      userId: userId ? userId.substring(0, 8) + '...' : 'anonymous',
      timestamp: new Date().toISOString(),
      ...data
    };
    
    this.info(`AUDIT: ${action}`, auditData);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Import YOLO mode for enhanced logging
import { yolo } from './yolo-mode';

// Convenience exports for common patterns
export const log = {
  error: (message: string, data?: any) => logger.error(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  debug: (message: string, data?: any) => logger.debug(message, data),
  ultrathink: (message: string, data?: any) => logger.ultrathink(message, data),
  mapping: (message: string, data?: any) => logger.mapping(message, data),
  success: (message: string, data?: any) => logger.success(message, data),
  yolo: (message: string, data?: any) => logger.yolo(message, data),
  security: (message: string, data?: any) => logger.security(message, data),
  audit: (action: string, userId?: string, data?: any) => logger.audit(action, userId, data),
};