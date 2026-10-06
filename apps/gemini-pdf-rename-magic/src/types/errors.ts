// Tipos de erro específicos para a aplicação
export enum ErrorType {
  // Erros de API
  API_KEY_INVALID = 'API_KEY_INVALID',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_SERVICE_UNAVAILABLE = 'API_SERVICE_UNAVAILABLE',
  API_MODEL_OVERLOADED = 'API_MODEL_OVERLOADED',
  
  // Erros de arquivo
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_FORMAT = 'FILE_INVALID_FORMAT',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_EMPTY = 'FILE_EMPTY',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  
  // Erros de processamento
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  NAME_GENERATION_FAILED = 'NAME_GENERATION_FAILED',
  
  // Erros de configuração
  CONFIG_INVALID = 'CONFIG_INVALID',
  MODEL_NOT_SUPPORTED = 'MODEL_NOT_SUPPORTED',
  
  // Erros gerais
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  userMessage: string;
  code?: string;
  statusCode?: number;
  retryable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly code?: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(details: Omit<ErrorDetails, 'timestamp'>) {
    super(details.message);
    this.name = 'AppError';
    this.type = details.type;
    this.userMessage = details.userMessage;
    this.code = details.code;
    this.statusCode = details.statusCode;
    this.retryable = details.retryable;
    this.timestamp = new Date();
    this.context = details.context;

    // Mantém o stack trace correto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON(): ErrorDetails {
    return {
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp,
      context: this.context
    };
  }
}

// Factory functions para criar erros específicos
export const createAPIError = (
  type: ErrorType,
  message: string,
  userMessage: string,
  statusCode?: number,
  context?: Record<string, any>
): AppError => {
  return new AppError({
    type,
    message,
    userMessage,
    statusCode,
    retryable: [ErrorType.API_NETWORK_ERROR, ErrorType.API_TIMEOUT, ErrorType.API_RATE_LIMIT].includes(type),
    context
  });
};

export const createFileError = (
  type: ErrorType,
  message: string,
  userMessage: string,
  context?: Record<string, any>
): AppError => {
  return new AppError({
    type,
    message,
    userMessage,
    retryable: false,
    context
  });
};

export const createProcessingError = (
  type: ErrorType,
  message: string,
  userMessage: string,
  retryable: boolean = true,
  context?: Record<string, any>
): AppError => {
  return new AppError({
    type,
    message,
    userMessage,
    retryable,
    context
  });
};

// Função para converter erros genéricos em AppError
export const normalizeError = (error: unknown, context?: Record<string, any>): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Detectar tipos específicos de erro baseado na mensagem
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return createAPIError(
        ErrorType.API_NETWORK_ERROR,
        error.message,
        'Erro de conexão. Verifique sua internet e tente novamente.',
        undefined,
        context
      );
    }
    
    if (message.includes('timeout')) {
      return createAPIError(
        ErrorType.API_TIMEOUT,
        error.message,
        'A operação demorou muito para responder. Tente novamente.',
        undefined,
        context
      );
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return createAPIError(
        ErrorType.API_UNAUTHORIZED,
        error.message,
        'Chave API inválida ou expirada. Verifique suas credenciais.',
        401,
        context
      );
    }
    
    if (message.includes('quota') || message.includes('limit')) {
      return createAPIError(
        ErrorType.API_QUOTA_EXCEEDED,
        error.message,
        'Limite de uso da API excedido. Tente novamente mais tarde.',
        429,
        context
      );
    }
    
    return new AppError({
      type: ErrorType.UNKNOWN_ERROR,
      message: error.message,
      userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
      retryable: true,
      context
    });
  }

  return new AppError({
    type: ErrorType.UNKNOWN_ERROR,
    message: String(error),
    userMessage: 'Ocorreu um erro inesperado. Tente novamente.',
    retryable: true,
    context
  });
};