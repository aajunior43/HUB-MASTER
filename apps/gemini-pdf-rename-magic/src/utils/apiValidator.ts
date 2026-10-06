import { AppError, ErrorType, createAPIError } from '@/types/errors';
import { logger } from './logger';
import { withRetry, RETRY_CONFIGS } from './retry';

export interface APIValidationResult {
  isValid: boolean;
  error?: AppError;
  details?: {
    responseTime: number;
    model: string;
    quotaRemaining?: number;
  };
}

export class APIValidator {
  private static readonly TEST_MODELS = [
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ];

  private static readonly VALIDATION_TIMEOUT = 10000; // 10 segundos

  /**
   * Valida o formato básico da chave API do Gemini
   */
  static validateKeyFormat(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Chaves do Gemini começam com 'AIza' e têm pelo menos 30 caracteres
    return apiKey.startsWith('AIza') && apiKey.length >= 30;
  }

  /**
   * Testa a conectividade com a API do Gemini
   */
  static async testConnectivity(
    apiKey: string,
    model: string = 'gemini-2.5-flash-lite'
  ): Promise<APIValidationResult> {
    const startTime = Date.now();

    try {
      logger.info('Iniciando teste de conectividade da API', {
        model,
        hasApiKey: !!apiKey
      });

      // Validar formato primeiro
      if (!this.validateKeyFormat(apiKey)) {
        const error = createAPIError(
          ErrorType.API_KEY_INVALID,
          'Invalid API key format',
          'Formato da chave API inválido. A chave deve começar com "AIza" e ter pelo menos 30 caracteres.',
          400
        );
        
        logger.error('Formato de chave API inválido', error);
        return { isValid: false, error };
      }

      // Fazer uma requisição de teste simples
      const testResult = await withRetry(
        () => this.makeTestRequest(apiKey, model),
        'API connectivity test',
        {
          ...RETRY_CONFIGS.API_CALL,
          maxAttempts: 2 // Menos tentativas para validação
        }
      );

      const responseTime = Date.now() - startTime;
      
      logger.info('Teste de conectividade bem-sucedido', {
        model,
        responseTime,
        quotaRemaining: testResult.quotaRemaining
      });

      return {
        isValid: true,
        details: {
          responseTime,
          model,
          quotaRemaining: testResult.quotaRemaining
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const appError = error instanceof AppError ? error : createAPIError(
        ErrorType.API_NETWORK_ERROR,
        error instanceof Error ? error.message : String(error),
        'Erro ao testar conectividade com a API',
        undefined,
        { responseTime, model }
      );

      logger.error('Teste de conectividade falhou', appError);
      return { isValid: false, error: appError };
    }
  }

  /**
   * Faz uma requisição de teste mínima para validar a API
   */
  private static async makeTestRequest(
    apiKey: string,
    model: string
  ): Promise<{ quotaRemaining?: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.VALIDATION_TIMEOUT);

    try {
      // Requisição mínima para testar a API
      const requestBody = {
        contents: [{
          parts: [{
            text: 'Test'
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1,
          temperature: 0
        }
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw this.createErrorFromStatus(response.status, errorText);
        }
        
        throw this.createErrorFromResponse(response.status, errorData);
      }

      // Extrair informações de quota dos headers se disponível
      const quotaRemaining = response.headers.get('x-ratelimit-remaining');
      
      return {
        quotaRemaining: quotaRemaining ? parseInt(quotaRemaining) : undefined
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw createAPIError(
          ErrorType.API_TIMEOUT,
          'Request timeout',
          'A requisição demorou muito para responder. Verifique sua conexão.',
          408
        );
      }
      
      throw error;
    }
  }

  /**
   * Cria erro baseado no status HTTP
   */
  private static createErrorFromStatus(status: number, errorText: string): AppError {
    switch (status) {
      case 400:
        return createAPIError(
          ErrorType.API_KEY_INVALID,
          `Bad Request: ${errorText}`,
          'Requisição inválida. Verifique a chave API.',
          status
        );
      case 401:
        return createAPIError(
          ErrorType.API_UNAUTHORIZED,
          `Unauthorized: ${errorText}`,
          'Chave API inválida ou sem permissões.',
          status
        );
      case 403:
        return createAPIError(
          ErrorType.API_QUOTA_EXCEEDED,
          `Forbidden: ${errorText}`,
          'Acesso negado. Verifique sua cota da API.',
          status
        );
      case 429:
        return createAPIError(
          ErrorType.API_RATE_LIMIT,
          `Rate limit exceeded: ${errorText}`,
          'Limite de requisições excedido.',
          status
        );
      case 500:
      case 502:
      case 503:
        return createAPIError(
          ErrorType.API_SERVICE_UNAVAILABLE,
          `Server error: ${errorText}`,
          'Serviço temporariamente indisponível.',
          status
        );
      default:
        return createAPIError(
          ErrorType.API_NETWORK_ERROR,
          `HTTP ${status}: ${errorText}`,
          'Erro de comunicação com a API.',
          status
        );
    }
  }

  /**
   * Cria erro baseado na resposta da API do Gemini
   */
  private static createErrorFromResponse(status: number, errorData: any): AppError {
    const error = errorData.error || {};
    
    if (error.status === 'INVALID_ARGUMENT') {
      return createAPIError(
        ErrorType.API_KEY_INVALID,
        error.message || 'Invalid argument',
        'Parâmetros inválidos. Verifique a chave API.',
        status,
        { geminiError: error }
      );
    }
    
    if (error.status === 'PERMISSION_DENIED') {
      return createAPIError(
        ErrorType.API_UNAUTHORIZED,
        error.message || 'Permission denied',
        'Permissão negada. Verifique sua chave API.',
        status,
        { geminiError: error }
      );
    }
    
    if (error.status === 'RESOURCE_EXHAUSTED') {
      return createAPIError(
        ErrorType.API_QUOTA_EXCEEDED,
        error.message || 'Resource exhausted',
        'Cota da API esgotada.',
        status,
        { geminiError: error }
      );
    }
    
    return createAPIError(
      ErrorType.API_NETWORK_ERROR,
      error.message || 'Unknown API error',
      'Erro na API do Gemini.',
      status,
      { geminiError: error }
    );
  }

  /**
   * Testa múltiplos modelos para encontrar o melhor disponível
   */
  static async findBestAvailableModel(
    apiKey: string
  ): Promise<{ model: string; responseTime: number } | null> {
    logger.info('Procurando melhor modelo disponível');

    for (const model of this.TEST_MODELS) {
      try {
        const result = await this.testConnectivity(apiKey, model);
        
        if (result.isValid && result.details) {
          logger.info('Modelo disponível encontrado', {
            model,
            responseTime: result.details.responseTime
          });
          
          return {
            model,
            responseTime: result.details.responseTime
          };
        }
      } catch (error) {
        logger.debug('Modelo não disponível', { model, error });
        continue;
      }
    }

    logger.warn('Nenhum modelo disponível encontrado');
    return null;
  }

  /**
   * Valida e otimiza a configuração da API
   */
  static async validateAndOptimize(
    apiKey: string
  ): Promise<{
    isValid: boolean;
    recommendedModel?: string;
    error?: AppError;
    performance?: {
      responseTime: number;
      quotaRemaining?: number;
    };
  }> {
    try {
      // Primeiro, teste básico de conectividade
      const basicTest = await this.testConnectivity(apiKey);
      
      if (!basicTest.isValid) {
        return {
          isValid: false,
          error: basicTest.error
        };
      }

      // Se válido, encontre o melhor modelo
      const bestModel = await this.findBestAvailableModel(apiKey);
      
      return {
        isValid: true,
        recommendedModel: bestModel?.model || 'gemini-2.5-flash-lite',
        performance: {
          responseTime: bestModel?.responseTime || basicTest.details!.responseTime,
          quotaRemaining: basicTest.details?.quotaRemaining
        }
      };
    } catch (error) {
      const appError = error instanceof AppError ? error : createAPIError(
        ErrorType.API_NETWORK_ERROR,
        error instanceof Error ? error.message : String(error),
        'Erro durante validação da API'
      );

      return {
        isValid: false,
        error: appError
      };
    }
  }
}

export default APIValidator;