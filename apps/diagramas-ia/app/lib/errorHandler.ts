/**
 * Sistema de tratamento de erros centralizado
 */

import { useAppStore } from '../store/useAppStore'

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AI_GENERATION = 'AI_GENERATION',
  EXPORT = 'EXPORT',
  PARSING = 'PARSING',
  PERMISSION = 'PERMISSION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType
  message: string
  description?: string
  code?: string
  details?: any
  timestamp: number
  stack?: string
  userAction?: string
}

export class DiagramError extends Error {
  public type: ErrorType
  public code?: string
  public details?: any
  public userAction?: string

  constructor(
    type: ErrorType, 
    message: string, 
    code?: string, 
    details?: any,
    userAction?: string
  ) {
    super(message)
    this.name = 'DiagramError'
    this.type = type
    this.code = code
    this.details = details
    this.userAction = userAction
  }
}

/**
 * Mapeia erros conhecidos para tipos específicos
 */
export function classifyError(error: any): ErrorType {
  if (!error) return ErrorType.UNKNOWN

  const message = error.message?.toLowerCase() || ''
  const code = error.code || error.status

  // Erros de rede
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    code === 'NETWORK_ERROR' ||
    code >= 500
  ) {
    return ErrorType.NETWORK
  }

  // Erros de validação
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    code >= 400 && code < 500
  ) {
    return ErrorType.VALIDATION
  }

  // Erros de IA
  if (
    message.includes('ai') ||
    message.includes('generation') ||
    message.includes('prompt') ||
    message.includes('gemini') ||
    code === 'AI_ERROR'
  ) {
    return ErrorType.AI_GENERATION
  }

  // Erros de exportação
  if (
    message.includes('export') ||
    message.includes('download') ||
    message.includes('file') ||
    code === 'EXPORT_ERROR'
  ) {
    return ErrorType.EXPORT
  }

  // Erros de parsing
  if (
    message.includes('parse') ||
    message.includes('json') ||
    message.includes('syntax') ||
    code === 'PARSE_ERROR'
  ) {
    return ErrorType.PARSING
  }

  // Erros de permissão
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    code === 401 ||
    code === 403
  ) {
    return ErrorType.PERMISSION
  }

  // Quota excedida
  if (
    message.includes('quota') ||
    message.includes('limit') ||
    message.includes('rate') ||
    code === 429
  ) {
    return ErrorType.QUOTA_EXCEEDED
  }

  return ErrorType.UNKNOWN
}

/**
 * Gera mensagens de erro amigáveis para o usuário
 */
export function getErrorMessage(error: AppError): { message: string; description?: string; userAction?: string } {
  switch (error.type) {
    case ErrorType.NETWORK:
      return {
        message: 'Problema de conexão',
        description: 'Verifique sua conexão com a internet e tente novamente.',
        userAction: 'Tentar novamente'
      }

    case ErrorType.VALIDATION:
      return {
        message: 'Dados inválidos',
        description: error.description || 'Verifique se todas as informações estão corretas.',
        userAction: 'Corrigir dados'
      }

    case ErrorType.AI_GENERATION:
      return {
        message: 'Erro na geração do diagrama',
        description: 'A IA encontrou dificuldades. Tente reformular o prompt ou usar configurações mais simples.',
        userAction: 'Simplificar prompt'
      }

    case ErrorType.EXPORT:
      return {
        message: 'Falha na exportação',
        description: 'Não foi possível exportar o arquivo. Tente um formato diferente.',
        userAction: 'Tentar formato diferente'
      }

    case ErrorType.PARSING:
      return {
        message: 'Erro de processamento',
        description: 'Os dados recebidos não puderam ser processados corretamente.',
        userAction: 'Recarregar página'
      }

    case ErrorType.PERMISSION:
      return {
        message: 'Acesso negado',
        description: 'Você não tem permissão para realizar esta ação.',
        userAction: 'Verificar conta'
      }

    case ErrorType.QUOTA_EXCEEDED:
      return {
        message: 'Limite atingido',
        description: 'Você atingiu o limite de uso. Tente novamente mais tarde ou faça upgrade.',
        userAction: 'Aguardar ou fazer upgrade'
      }

    default:
      return {
        message: 'Erro inesperado',
        description: 'Algo deu errado. Nossa equipe foi notificada.',
        userAction: 'Tentar novamente'
      }
  }
}

/**
 * Handler principal de erros
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorHistory: AppError[] = []
  private maxHistorySize = 50

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Processa e registra um erro
   */
  handleError(error: any, context?: string): AppError {
    const type = classifyError(error)
    
    const appError: AppError = {
      type,
      message: error.message || 'Erro desconhecido',
      description: error.description,
      code: error.code || error.status,
      details: {
        context,
        originalError: error,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      },
      timestamp: Date.now(),
      stack: error.stack
    }

    // Adicionar ao histórico
    this.errorHistory.unshift(appError)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize)
    }

    // Log no console em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', appError)
    }

    // Notificar o usuário
    this.notifyUser(appError)

    // Reportar erro (em produção)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(appError)
    }

    return appError
  }

  /**
   * Notifica o usuário sobre o erro
   */
  private notifyUser(error: AppError) {
    const { message, description, userAction } = getErrorMessage(error)
    
    const addToast = useAppStore.getState().addToast
    
    addToast({
      type: 'error',
      message,
      description,
      duration: error.type === ErrorType.NETWORK ? 0 : 7000, // Erros de rede ficam até dismissal manual
      action: userAction ? {
        label: userAction,
        onClick: () => this.handleUserAction(error, userAction)
      } : undefined
    })
  }

  /**
   * Executa ação sugerida ao usuário
   */
  private handleUserAction(error: AppError, action: string) {
    switch (action) {
      case 'Tentar novamente':
        // Implementar retry baseado no contexto
        window.location.reload()
        break
        
      case 'Recarregar página':
        window.location.reload()
        break
        
      case 'Verificar conta':
        // Implementar redirecionamento para login/conta
        break
        
      default:
        // Ação padrão ou personalizada
        break
    }
  }

  /**
   * Reporta erro para serviço de monitoramento
   */
  private reportError(error: AppError) {
    // Implementar integração com Sentry, LogRocket, etc.
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      }).catch(() => {
        // Falha silenciosa no envio de erro
      })
    } catch {
      // Falha silenciosa
    }
  }

  /**
   * Obtém histórico de erros
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory]
  }

  /**
   * Limpa histórico de erros
   */
  clearErrorHistory() {
    this.errorHistory = []
  }

  /**
   * Verifica se há padrões de erro
   */
  analyzeErrorPatterns(): {
    mostCommon: ErrorType
    frequency: Record<ErrorType, number>
    suggestions: string[]
  } {
    const frequency = this.errorHistory.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1
      return acc
    }, {} as Record<ErrorType, number>)

    const mostCommon = Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as ErrorType || ErrorType.UNKNOWN

    const suggestions: string[] = []
    
    if (frequency[ErrorType.NETWORK] > 3) {
      suggestions.push('Problemas frequentes de rede detectados. Verifique sua conexão.')
    }
    
    if (frequency[ErrorType.AI_GENERATION] > 5) {
      suggestions.push('Muitos erros de IA. Tente prompts mais simples.')
    }
    
    if (frequency[ErrorType.VALIDATION] > 3) {
      suggestions.push('Erros de validação frequentes. Revise os dados inseridos.')
    }

    return { mostCommon, frequency, suggestions }
  }
}

/**
 * Hook para usar o error handler
 */
export function useErrorHandler() {
  const errorHandler = ErrorHandler.getInstance()

  return {
    handleError: (error: any, context?: string) => errorHandler.handleError(error, context),
    getErrorHistory: () => errorHandler.getErrorHistory(),
    analyzeErrors: () => errorHandler.analyzeErrorPatterns(),
    clearHistory: () => errorHandler.clearErrorHistory()
  }
}

/**
 * Wrapper para funções assíncronas com tratamento automático de erro
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      ErrorHandler.getInstance().handleError(error, context)
      return null
    }
  }
}

/**
 * Decorator para métodos de classe
 */
export function HandleErrors(context?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        ErrorHandler.getInstance().handleError(error, context || `${target.constructor.name}.${propertyKey}`)
        throw error
      }
    }

    return descriptor
  }
}

// Configurar handler global para erros não capturados
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    ErrorHandler.getInstance().handleError(event.error, 'Global error handler')
  })

  window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.getInstance().handleError(event.reason, 'Unhandled promise rejection')
  })
}
