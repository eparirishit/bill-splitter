export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  userId?: string;
  receiptId?: string;
  provider?: string;
  model?: string;
  operation?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, any>;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL) || LogLevel.INFO;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private parseLogLevel(level: string | undefined): LogLevel | null {
    if (!level) return null;
    
    const upperLevel = level.toUpperCase();
    if (upperLevel in LogLevel) {
      return LogLevel[upperLevel as keyof typeof LogLevel];
    }
    
    return null;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      metadata,
    };
  }

  private outputLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const logMethod = this.getLogMethod(entry.level);
    const formattedMessage = this.formatMessage(entry);
    
    if (entry.error) {
      logMethod(formattedMessage, entry.error);
    } else {
      logMethod(formattedMessage);
    }

    // In development, also log to console with colors
    if (this.isDevelopment) {
      this.logToConsole(entry);
    }
  }

  private getLogMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${LogLevel[entry.level]}]`,
      entry.message,
    ];

    if (entry.context) {
      const contextStr = Object.entries(entry.context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      if (contextStr) {
        parts.push(`(${contextStr})`);
      }
    }

    return parts.join(' ');
  }

  private logToConsole(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
    };

    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';
    
    console.log(`${color}${this.formatMessage(entry)}${reset}`);
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.outputLog(this.formatLog(LogLevel.DEBUG, message, context, undefined, metadata));
  }

  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.outputLog(this.formatLog(LogLevel.INFO, message, context, undefined, metadata));
  }

  warn(message: string, context?: LogContext, error?: Error, metadata?: Record<string, any>): void {
    this.outputLog(this.formatLog(LogLevel.WARN, message, context, error, metadata));
  }

  error(message: string, context?: LogContext, error?: Error, metadata?: Record<string, any>): void {
    this.outputLog(this.formatLog(LogLevel.ERROR, message, context, error, metadata));
  }

  // AI-specific logging methods
  aiRequest(provider: string, model: string, operation: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.info(`AI request initiated`, {
      ...context,
      provider,
      model,
      operation,
    }, metadata);
  }

  aiResponse(provider: string, model: string, operation: string, processingTimeMs: number, tokensUsed?: number, context?: LogContext, metadata?: Record<string, any>): void {
    this.info(`AI response received`, {
      ...context,
      provider,
      model,
      operation,
      processingTimeMs,
      tokensUsed,
    }, metadata);
  }

  aiError(provider: string, model: string, operation: string, error: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.error(`AI request failed`, {
      ...context,
      provider,
      model,
      operation,
    }, error, metadata);
  }
}

export const logger = new Logger(); 