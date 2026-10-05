import { AppError, ErrorType } from '@/types/errors';
import { logger } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // em millisegundos
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 segundo
  maxDelay: 10000, // 10 segundos
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorType.API_NETWORK_ERROR,
    ErrorType.API_TIMEOUT,
    ErrorType.API_RATE_LIMIT,
    ErrorType.API_SERVICE_UNAVAILABLE,
    ErrorType.API_MODEL_OVERLOADED
  ]
};

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  private shouldRetry(error: AppError, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) {
      return false;
    }

    if (!error.retryable) {
      return false;
    }

    return this.config.retryableErrors.includes(error.type);
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown',
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    let lastError: AppError;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logger.debug(`Executando ${operationName} - tentativa ${attempt}/${config.maxAttempts}`);
        
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`${operationName} bem-sucedido na tentativa ${attempt}`);
        }
        
        return result;
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError({
          type: ErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : String(error),
          userMessage: 'Erro inesperado durante a operação',
          retryable: true
        });

        lastError = appError;
        
        logger.logRetryAttempt(operationName, attempt, config.maxAttempts, appError);

        if (!this.shouldRetry(appError, attempt)) {
          logger.error(`${operationName} falhou definitivamente`, appError);
          throw appError;
        }

        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          logger.debug(`Aguardando ${delay}ms antes da próxima tentativa`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }
}

// Instância padrão do retry manager
export const retryManager = new RetryManager();

// Função de conveniência para retry simples
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName?: string,
  config?: Partial<RetryConfig>
): Promise<T> {
  return retryManager.execute(operation, operationName, config);
}

// Configurações específicas para diferentes tipos de operação
export const RETRY_CONFIGS = {
  API_CALL: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2
  },
  FILE_UPLOAD: {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 1.5
  },
  NETWORK_REQUEST: {
    maxAttempts: 4,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2.5
  },
  MODEL_OVERLOAD: {
    maxAttempts: 5,
    baseDelay: 3000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [ErrorType.API_MODEL_OVERLOADED]
  }
};

export default retryManager;