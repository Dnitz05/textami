// lib/logger.ts
// Professional logging system with conditional output

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
}

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

  private formatMessage(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    
    if (data) {
      console.log(`[${timestamp}] ${levelStr}: ${message}`, data);
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
}

// Export singleton instance
export const logger = Logger.getInstance();

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
};