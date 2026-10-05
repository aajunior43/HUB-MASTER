import { AppError, ErrorType, createAPIError } from '@/types/errors';
import { logger } from './logger';
import { APIValidator } from './apiValidator';
import { GeminiService } from '@/services/geminiService';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: Record<string, any>;
  responseTime?: number;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  timestamp: Date;
  components: HealthCheckResult[];
  summary: {
    healthy: number;
    warning: number;
    error: number;
    totalResponseTime: number;
  };
}

export class HealthChecker {
  private static readonly TIMEOUT = 15000; // 15 segundos

  /**
   * Executa verificação completa do sistema
   */
  static async runFullCheck(apiKey?: string): Promise<SystemHealthReport> {
    const startTime = Date.now();
    logger.info('Iniciando verificação completa do sistema');

    const checks = [
      () => this.checkLoggingSystem(),
      () => this.checkLocalStorage(),
      () => this.checkBrowserAPIs(),
      () => this.checkNetworkConnectivity(),
    ];

    // Adicionar verificação de API se a chave estiver disponível
    if (apiKey) {
      checks.push(() => this.checkGeminiAPI(apiKey));
      checks.push(() => this.checkFileProcessing(apiKey));
    }

    const results: HealthCheckResult[] = [];

    // Executar verificações em paralelo com timeout
    const checkPromises = checks.map(async (check) => {
      try {
        return await Promise.race([
          check(),
          new Promise<HealthCheckResult>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.TIMEOUT)
          )
        ]);
      } catch (error) {
        return {
          component: 'Unknown',
          status: 'error' as const,
          message: `Erro durante verificação: ${error instanceof Error ? error.message : String(error)}`,
          responseTime: Date.now() - startTime
        };
      }
    });

    const checkResults = await Promise.allSettled(checkPromises);
    
    checkResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          component: 'System',
          status: 'error',
          message: `Falha na verificação: ${result.reason}`,
          responseTime: Date.now() - startTime
        });
      }
    });

    const summary = this.calculateSummary(results);
    const overall = this.determineOverallStatus(results);
    const totalTime = Date.now() - startTime;

    const report: SystemHealthReport = {
      overall,
      timestamp: new Date(),
      components: results,
      summary: {
        ...summary,
        totalResponseTime: totalTime
      }
    };

    logger.info('Verificação do sistema concluída', {
      overall,
      totalTime,
      componentsChecked: results.length,
      ...summary
    });

    return report;
  }

  /**
   * Verifica o sistema de logging
   */
  private static async checkLoggingSystem(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Testar diferentes níveis de log
      logger.debug('Health check: teste de debug');
      logger.info('Health check: teste de info');
      logger.warn('Health check: teste de warning');
      
      // Verificar se os logs estão sendo armazenados
      const logs = logger.getLogs();
      const stats = logger.getStats();
      
      if (logs.length === 0) {
        return {
          component: 'Logging System',
          status: 'warning',
          message: 'Sistema de logging funcionando, mas sem logs armazenados',
          responseTime: Date.now() - startTime,
          details: { stats }
        };
      }
      
      return {
        component: 'Logging System',
        status: 'healthy',
        message: `Sistema de logging operacional (${logs.length} logs armazenados)`,
        responseTime: Date.now() - startTime,
        details: { stats, logsCount: logs.length }
      };
    } catch (error) {
      return {
        component: 'Logging System',
        status: 'error',
        message: `Erro no sistema de logging: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica o localStorage
   */
  private static async checkLocalStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health_check_test';
      const testValue = 'test_value_' + Date.now();
      
      // Testar escrita
      localStorage.setItem(testKey, testValue);
      
      // Testar leitura
      const retrievedValue = localStorage.getItem(testKey);
      
      // Limpar teste
      localStorage.removeItem(testKey);
      
      if (retrievedValue !== testValue) {
        return {
          component: 'Local Storage',
          status: 'error',
          message: 'LocalStorage não está funcionando corretamente',
          responseTime: Date.now() - startTime
        };
      }
      
      // Verificar configurações existentes
      const existingKeys = [
        'gemini_api_key',
        'ai_model',
        'geminiCustomPrompt',
        'geminiUseCustomPrompt'
      ];
      
      const existingConfig = existingKeys.reduce((acc, key) => {
        const value = localStorage.getItem(key);
        if (value) acc[key] = value.length > 20 ? `${value.substring(0, 20)}...` : value;
        return acc;
      }, {} as Record<string, string>);
      
      return {
        component: 'Local Storage',
        status: 'healthy',
        message: 'LocalStorage funcionando corretamente',
        responseTime: Date.now() - startTime,
        details: { existingConfig }
      };
    } catch (error) {
      return {
        component: 'Local Storage',
        status: 'error',
        message: `Erro no LocalStorage: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica APIs do navegador
   */
  private static async checkBrowserAPIs(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const apis = {
        FileReader: typeof FileReader !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        URL: typeof URL !== 'undefined',
        Blob: typeof Blob !== 'undefined'
      };
      
      const missingAPIs = Object.entries(apis)
        .filter(([_, available]) => !available)
        .map(([api]) => api);
      
      if (missingAPIs.length > 0) {
        return {
          component: 'Browser APIs',
          status: 'error',
          message: `APIs não disponíveis: ${missingAPIs.join(', ')}`,
          responseTime: Date.now() - startTime,
          details: { apis }
        };
      }
      
      return {
        component: 'Browser APIs',
        status: 'healthy',
        message: 'Todas as APIs necessárias estão disponíveis',
        responseTime: Date.now() - startTime,
        details: { apis }
      };
    } catch (error) {
      return {
        component: 'Browser APIs',
        status: 'error',
        message: `Erro ao verificar APIs: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica conectividade de rede
   */
  private static async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Testar conectividade básica
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      return {
        component: 'Network Connectivity',
        status: 'healthy',
        message: 'Conectividade de rede funcionando',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        component: 'Network Connectivity',
        status: 'error',
        message: `Sem conectividade de rede: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica a API do Gemini
   */
  private static async checkGeminiAPI(apiKey: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const result = await APIValidator.testConnectivity(apiKey);
      
      if (result.isValid) {
        return {
          component: 'Gemini API',
          status: 'healthy',
          message: 'API do Gemini funcionando corretamente',
          responseTime: Date.now() - startTime,
          details: result.details
        };
      } else {
        return {
          component: 'Gemini API',
          status: 'error',
          message: result.error?.userMessage || 'Erro na API do Gemini',
          responseTime: Date.now() - startTime,
          details: { errorType: result.error?.type }
        };
      }
    } catch (error) {
      return {
        component: 'Gemini API',
        status: 'error',
        message: `Erro ao testar API: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica processamento de arquivos
   */
  private static async checkFileProcessing(apiKey: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Criar um arquivo de teste simples
      const testContent = 'Health Check Test Document';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([testBlob], 'health-check-test.txt', { type: 'text/plain' });
      
      // Testar o serviço Gemini com arquivo de teste
      const geminiService = new GeminiService(apiKey);
      
      // Usar um prompt simples para teste
      const testPrompt = 'Analise este documento de teste e responda apenas com "TESTE_HEALTH_CHECK"';
      
      try {
        const result = await geminiService.analyzeDocument(testFile, testPrompt);
        
        return {
          component: 'File Processing',
          status: 'healthy',
          message: 'Processamento de arquivos funcionando',
          responseTime: Date.now() - startTime,
          details: { testResult: result }
        };
      } catch (error) {
        // Se falhar, pode ser por limitação de tipo de arquivo, mas o sistema ainda funciona
        return {
          component: 'File Processing',
          status: 'warning',
          message: 'Sistema de processamento disponível, mas teste falhou (pode ser limitação de formato)',
          responseTime: Date.now() - startTime,
          details: { error: error instanceof Error ? error.message : String(error) }
        };
      }
    } catch (error) {
      return {
        component: 'File Processing',
        status: 'error',
        message: `Erro no processamento de arquivos: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Calcula resumo dos resultados
   */
  private static calculateSummary(results: HealthCheckResult[]) {
    return results.reduce(
      (acc, result) => {
        acc[result.status]++;
        return acc;
      },
      { healthy: 0, warning: 0, error: 0 }
    );
  }

  /**
   * Determina status geral do sistema
   */
  private static determineOverallStatus(results: HealthCheckResult[]): 'healthy' | 'warning' | 'error' {
    const hasErrors = results.some(r => r.status === 'error');
    const hasWarnings = results.some(r => r.status === 'warning');
    
    if (hasErrors) return 'error';
    if (hasWarnings) return 'warning';
    return 'healthy';
  }

  /**
   * Verificação rápida (apenas componentes essenciais)
   */
  static async runQuickCheck(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    
    const quickChecks = [
      () => this.checkLoggingSystem(),
      () => this.checkLocalStorage(),
      () => this.checkBrowserAPIs()
    ];
    
    const results = await Promise.all(
      quickChecks.map(check => check().catch(error => ({
        component: 'Quick Check',
        status: 'error' as const,
        message: `Erro: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      })))
    );
    
    const summary = this.calculateSummary(results);
    const overall = this.determineOverallStatus(results);
    
    return {
      overall,
      timestamp: new Date(),
      components: results,
      summary: {
        ...summary,
        totalResponseTime: Date.now() - startTime
      }
    };
  }
}

export default HealthChecker;