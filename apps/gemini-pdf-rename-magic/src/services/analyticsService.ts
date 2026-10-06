import { logger } from '@/utils/logger';

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface SessionData {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  userAgent: string;
  platform: string;
  language: string;
}

export interface UsageMetrics {
  totalSessions: number;
  totalEvents: number;
  totalFiles: number;
  totalRenames: number;
  averageSessionDuration: number;
  popularFileTypes: Record<string, number>;
  popularTemplates: Record<string, number>;
  errorRate: number;
  successRate: number;
  peakUsageHours: Record<string, number>;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
}

export interface PerformanceMetrics {
  averageProcessingTime: number;
  averageFileSize: number;
  apiResponseTimes: number[];
  errorCounts: Record<string, number>;
  cacheHitRate: number;
  memoryUsage?: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private sessions: SessionData[] = [];
  private currentSession: SessionData | null = null;
  private storageKey = 'analytics_data';
  private sessionStorageKey = 'analytics_sessions';
  private maxEvents = 1000;
  private maxSessions = 100;

  private constructor() {
    this.loadData();
    this.initializeSession();
    this.setupEventListeners();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Registra um evento de analytics
   */
  trackEvent(
    type: string,
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      category,
      action,
      label,
      value,
      timestamp: new Date(),
      sessionId: this.currentSession?.id || 'unknown',
      metadata
    };

    this.events.unshift(event);
    
    // Manter apenas os eventos mais recentes
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Atualizar contador de eventos da sessão
    if (this.currentSession) {
      this.currentSession.events++;
    }

    this.saveData();
    
    logger.info('Evento de analytics registrado', {
      type,
      category,
      action,
      label,
      sessionId: this.currentSession?.id
    });
  }

  /**
   * Eventos específicos da aplicação
   */
  trackFileUpload(fileType: string, fileSize: number): void {
    this.trackEvent('file', 'upload', 'file_uploaded', fileType, fileSize, {
      fileType,
      fileSize
    });
  }

  trackFileRename(originalName: string, newName: string, processingTime: number, method: 'individual' | 'batch'): void {
    this.trackEvent('file', 'rename', 'file_renamed', method, processingTime, {
      originalName,
      newName,
      processingTime,
      method
    });
  }

  trackTemplateUsage(templateId: string, templateName: string): void {
    this.trackEvent('template', 'usage', 'template_used', templateName, 1, {
      templateId,
      templateName
    });
  }

  trackError(errorType: string, errorMessage: string, context?: Record<string, any>): void {
    this.trackEvent('error', 'application', errorType, errorMessage, 1, {
      errorMessage,
      context
    });
  }

  trackPerformance(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.trackEvent('performance', 'timing', operation, undefined, duration, {
      duration,
      ...metadata
    });
  }

  trackFeatureUsage(feature: string, action: string, value?: number): void {
    this.trackEvent('feature', 'usage', action, feature, value, {
      feature,
      action
    });
  }

  trackUserInteraction(element: string, action: string, context?: string): void {
    this.trackEvent('interaction', 'ui', action, element, 1, {
      element,
      context
    });
  }

  /**
   * Obtém métricas de uso
   */
  getUsageMetrics(): UsageMetrics {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fileEvents = this.events.filter(e => e.category === 'file');
    const renameEvents = fileEvents.filter(e => e.action === 'file_renamed');
    const uploadEvents = fileEvents.filter(e => e.action === 'file_uploaded');
    const templateEvents = this.events.filter(e => e.category === 'template');
    const errorEvents = this.events.filter(e => e.category === 'error');

    // Tipos de arquivo populares
    const popularFileTypes = uploadEvents.reduce((acc, event) => {
      const fileType = event.label || 'unknown';
      acc[fileType] = (acc[fileType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Templates populares
    const popularTemplates = templateEvents.reduce((acc, event) => {
      const templateName = event.label || 'unknown';
      acc[templateName] = (acc[templateName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Horários de pico
    const peakUsageHours = this.events.reduce((acc, event) => {
      const hour = event.timestamp.getHours().toString();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Duração média das sessões
    const completedSessions = this.sessions.filter(s => s.endTime);
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;

    // Taxas de sucesso e erro
    const totalOperations = renameEvents.length;
    const errorRate = totalOperations > 0 ? (errorEvents.length / totalOperations) * 100 : 0;
    const successRate = 100 - errorRate;

    // Usuários ativos (baseado em sessões)
    const dailyActiveSessions = this.sessions.filter(s => s.startTime >= dayAgo).length;
    const weeklyActiveSessions = this.sessions.filter(s => s.startTime >= weekAgo).length;
    const monthlyActiveSessions = this.sessions.filter(s => s.startTime >= monthAgo).length;

    return {
      totalSessions: this.sessions.length,
      totalEvents: this.events.length,
      totalFiles: uploadEvents.length,
      totalRenames: renameEvents.length,
      averageSessionDuration,
      popularFileTypes,
      popularTemplates,
      errorRate,
      successRate,
      peakUsageHours,
      dailyActiveUsers: dailyActiveSessions,
      weeklyActiveUsers: weeklyActiveSessions,
      monthlyActiveUsers: monthlyActiveSessions
    };
  }

  /**
   * Obtém métricas de performance
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const performanceEvents = this.events.filter(e => e.category === 'performance');
    const renameEvents = this.events.filter(e => e.action === 'file_renamed');
    const uploadEvents = this.events.filter(e => e.action === 'file_uploaded');
    const errorEvents = this.events.filter(e => e.category === 'error');

    // Tempo médio de processamento
    const processingTimes = renameEvents
      .map(e => e.value || 0)
      .filter(time => time > 0);
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Tamanho médio dos arquivos
    const fileSizes = uploadEvents
      .map(e => e.value || 0)
      .filter(size => size > 0);
    const averageFileSize = fileSizes.length > 0
      ? fileSizes.reduce((sum, size) => sum + size, 0) / fileSizes.length
      : 0;

    // Tempos de resposta da API
    const apiResponseTimes = performanceEvents
      .filter(e => e.action.includes('api'))
      .map(e => e.value || 0)
      .filter(time => time > 0);

    // Contagem de erros por tipo
    const errorCounts = errorEvents.reduce((acc, event) => {
      const errorType = event.action || 'unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Taxa de acerto do cache (simulada)
    const cacheEvents = performanceEvents.filter(e => e.action.includes('cache'));
    const cacheHits = cacheEvents.filter(e => e.label === 'hit').length;
    const cacheHitRate = cacheEvents.length > 0 ? (cacheHits / cacheEvents.length) * 100 : 0;

    return {
      averageProcessingTime,
      averageFileSize,
      apiResponseTimes,
      errorCounts,
      cacheHitRate
    };
  }

  /**
   * Obtém eventos filtrados
   */
  getEvents(filters?: {
    category?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AnalyticsEvent[] {
    let filteredEvents = [...this.events];

    if (filters) {
      if (filters.category) {
        filteredEvents = filteredEvents.filter(e => e.category === filters.category);
      }
      if (filters.action) {
        filteredEvents = filteredEvents.filter(e => e.action === filters.action);
      }
      if (filters.startDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate!);
      }
      if (filters.limit) {
        filteredEvents = filteredEvents.slice(0, filters.limit);
      }
    }

    return filteredEvents;
  }

  /**
   * Obtém dados da sessão atual
   */
  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Obtém todas as sessões
   */
  getSessions(): SessionData[] {
    return [...this.sessions];
  }

  /**
   * Exporta dados de analytics
   */
  exportData(): string {
    const exportData = {
      events: this.events,
      sessions: this.sessions,
      metrics: this.getUsageMetrics(),
      performance: this.getPerformanceMetrics(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Limpa dados antigos
   */
  cleanupOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialEventCount = this.events.length;
    const initialSessionCount = this.sessions.length;

    this.events = this.events.filter(event => event.timestamp >= cutoffDate);
    this.sessions = this.sessions.filter(session => session.startTime >= cutoffDate);

    this.saveData();

    logger.info('Limpeza de dados antigos concluída', {
      eventsRemoved: initialEventCount - this.events.length,
      sessionsRemoved: initialSessionCount - this.sessions.length,
      cutoffDate
    });
  }

  /**
   * Obtém insights automáticos
   */
  getInsights(): string[] {
    const metrics = this.getUsageMetrics();
    const performance = this.getPerformanceMetrics();
    const insights: string[] = [];

    // Insights de uso
    if (metrics.totalRenames > 100) {
      insights.push(`Parabéns! Você já renomeou ${metrics.totalRenames} arquivos.`);
    }

    // Insights de performance
    if (performance.averageProcessingTime > 5000) {
      insights.push('O tempo de processamento está acima da média. Considere otimizar seus prompts.');
    }

    // Insights de templates
    const topTemplate = Object.entries(metrics.popularTemplates)
      .sort(([,a], [,b]) => b - a)[0];
    if (topTemplate) {
      insights.push(`Seu template mais usado é "${topTemplate[0]}" com ${topTemplate[1]} usos.`);
    }

    // Insights de horário
    const peakHour = Object.entries(metrics.peakUsageHours)
      .sort(([,a], [,b]) => b - a)[0];
    if (peakHour) {
      insights.push(`Você é mais produtivo às ${peakHour[0]}h.`);
    }

    // Insights de qualidade
    if (metrics.successRate > 95) {
      insights.push('Excelente! Sua taxa de sucesso está acima de 95%.');
    } else if (metrics.errorRate > 10) {
      insights.push('Atenção: Taxa de erro elevada. Verifique suas configurações.');
    }

    return insights;
  }

  private generateId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSession(): void {
    this.currentSession = {
      id: this.generateId(),
      startTime: new Date(),
      pageViews: 1,
      events: 0,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    };

    this.sessions.unshift(this.currentSession);
    
    // Manter apenas as sessões mais recentes
    if (this.sessions.length > this.maxSessions) {
      this.sessions = this.sessions.slice(0, this.maxSessions);
    }

    this.saveSessionData();
    
    logger.info('Nova sessão de analytics iniciada', {
      sessionId: this.currentSession.id
    });
  }

  private setupEventListeners(): void {
    // Finalizar sessão ao sair da página
    window.addEventListener('beforeunload', () => {
      this.endCurrentSession();
    });

    // Detectar mudanças de visibilidade
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session', 'visibility', 'page_hidden');
      } else {
        this.trackEvent('session', 'visibility', 'page_visible');
        if (this.currentSession) {
          this.currentSession.pageViews++;
        }
      }
    });

    // Detectar erros JavaScript
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Detectar promessas rejeitadas
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', event.reason?.toString() || 'Unknown', {
        reason: event.reason
      });
    });
  }

  private endCurrentSession(): void {
    if (this.currentSession && !this.currentSession.endTime) {
      this.currentSession.endTime = new Date();
      this.currentSession.duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
      
      this.saveSessionData();
      
      logger.info('Sessão de analytics finalizada', {
        sessionId: this.currentSession.id,
        duration: this.currentSession.duration,
        events: this.currentSession.events
      });
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.events));
    } catch (error) {
      logger.error('Erro ao salvar dados de analytics', { error });
    }
  }

  private saveSessionData(): void {
    try {
      localStorage.setItem(this.sessionStorageKey, JSON.stringify(this.sessions));
    } catch (error) {
      logger.error('Erro ao salvar dados de sessão', { error });
    }
  }

  private loadData(): void {
    try {
      const eventsData = localStorage.getItem(this.storageKey);
      if (eventsData) {
        this.events = JSON.parse(eventsData).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }

      const sessionsData = localStorage.getItem(this.sessionStorageKey);
      if (sessionsData) {
        this.sessions = JSON.parse(sessionsData).map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined
        }));
      }
    } catch (error) {
      logger.error('Erro ao carregar dados de analytics', { error });
      this.events = [];
      this.sessions = [];
    }
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;