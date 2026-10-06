import { AppError, ErrorType } from '@/types/errors';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: AppError | Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLevel;
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log no console em desenvolvimento
    if (import.meta.env.DEV) {
      this.logToConsole(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.error || entry.context);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    this.addLog({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      context
    });
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    this.addLog({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      context
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    this.addLog({
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      context
    });
  }

  error(message: string, errorOrContext?: AppError | Error | Record<string, any>, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const isErr = errorOrContext instanceof Error;
    this.addLog({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      error: isErr ? (errorOrContext as AppError | Error) : undefined,
      context: isErr ? context : (errorOrContext as Record<string, any> | undefined),
    });
  }

  // Métodos específicos para diferentes operações
  logFileUpload(fileName: string, fileSize: number, fileType: string): void {
    this.info('Arquivo carregado', {
      fileName,
      fileSize,
      fileType,
      operation: 'file_upload'
    });
  }

  logAPICall(model: string, fileType: string, duration?: number): void {
    this.info('Chamada API realizada', {
      model,
      fileType,
      duration,
      operation: 'api_call'
    });
  }

  logAPIError(error: AppError, model: string, attempt: number): void {
    this.error('Erro na API', error, {
      model,
      attempt,
      errorType: error.type,
      retryable: error.retryable,
      operation: 'api_error'
    });
  }

  logFileProcessing(fileName: string, status: 'start' | 'success' | 'error', duration?: number): void {
    const level = status === 'error' ? LogLevel.ERROR : LogLevel.INFO;
    const message = `Processamento de arquivo ${status}`;
    
    this.addLog({
      level,
      message,
      timestamp: new Date(),
      context: {
        fileName,
        status,
        duration,
        operation: 'file_processing'
      }
    });
  }

  logRetryAttempt(operation: string, attempt: number, maxAttempts: number, error: AppError): void {
    this.warn(`Tentativa ${attempt}/${maxAttempts} falhou para ${operation}`, {
      operation,
      attempt,
      maxAttempts,
      errorType: error.type,
      errorMessage: error.message
    });
  }

  // Obter logs para debugging
  getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  // Exportar logs para debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Limpar logs
  clearLogs(): void {
    this.logs = [];
  }

  // Obter estatísticas dos logs
  getStats(): Record<string, number> {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    this.logs.forEach(log => {
      switch (log.level) {
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
      }
    });

    return stats;
  }
}

// Instância singleton do logger
export const logger = new Logger();

// Configurar nível baseado no ambiente
if (import.meta.env.DEV) {
  logger.setLevel(LogLevel.DEBUG);
} else {
  logger.setLevel(LogLevel.DEBUG);
}

export default logger;