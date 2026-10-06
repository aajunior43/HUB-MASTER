import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Clock, 
  Zap,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Activity,
  Calendar,
  Target,
  Lightbulb
} from 'lucide-react';
import { MinimalSpinner } from '@/components/ui/minimal-progress';
import { useToast } from '@/hooks/use-toast';
import { analyticsService, UsageMetrics, PerformanceMetrics, AnalyticsEvent } from '@/services/analyticsService';
import { MetricsDisplay } from './FeedbackSystem';
import { logger } from '@/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsDashboardProps {
  className?: string;
}

export const AnalyticsDashboard = ({ className }: AnalyticsDashboardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAnalyticsData();
    }
  }, [isOpen, timeRange]);

  const loadAnalyticsData = () => {
    try {
      const usage = analyticsService.getUsageMetrics();
      const performance = analyticsService.getPerformanceMetrics();
      const events = analyticsService.getEvents({ limit: 50 });
      const appInsights = analyticsService.getInsights();

      setUsageMetrics(usage);
      setPerformanceMetrics(performance);
      setRecentEvents(events);
      setInsights(appInsights);

      logger.info('Dados de analytics carregados', {
        totalEvents: events.length,
        totalSessions: usage.totalSessions
      });
    } catch (error) {
      logger.error('Erro ao carregar dados de analytics', { error });
      toast({
        title: "Erro ao carregar analytics",
        description: "Não foi possível carregar os dados de analytics.",
        variant: "destructive"
      });
    }
  };

  const handleExportData = () => {
    try {
      const exportData = analyticsService.exportData();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Dados exportados",
        description: "Os dados de analytics foram exportados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    }
  };

  const handleCleanupData = () => {
    try {
      analyticsService.cleanupOldData(30);
      loadAnalyticsData();
      
      toast({
        title: "Limpeza concluída",
        description: "Dados antigos foram removidos com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro na limpeza",
        description: "Não foi possível limpar os dados antigos.",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'file': return '📄';
      case 'template': return '📝';
      case 'error': return '❌';
      case 'performance': return '⚡';
      case 'feature': return '🔧';
      case 'interaction': return '👆';
      case 'session': return '👤';
      default: return '📊';
    }
  };

  const getEventColor = (category: string) => {
    switch (category) {
      case 'file': return 'bg-blue-100 text-blue-800';
      case 'template': return 'bg-purple-100 text-purple-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'performance': return 'bg-green-100 text-green-800';
      case 'feature': return 'bg-orange-100 text-orange-800';
      case 'interaction': return 'bg-gray-100 text-gray-800';
      case 'session': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!usageMetrics || !performanceMetrics) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="minimal" 
            size="sm" 
            className={className}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <MinimalSpinner size="lg" className="mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando dados de analytics...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`glass-panel border-primary/20 hover:border-primary/40 transition-all duration-300 ${className}`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Analytics
          {usageMetrics.totalEvents > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {usageMetrics.totalEvents}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dashboard de Analytics
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid w-full grid-cols-5 max-w-2xl">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="usage">Uso</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="events">Eventos</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Último dia</SelectItem>
                  <SelectItem value="7d">Última semana</SelectItem>
                  <SelectItem value="30d">Último mês</SelectItem>
                  <SelectItem value="all">Todo período</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={loadAnalyticsData} variant="minimal" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <TabsContent value="overview" className="space-y-4">
            <MetricsDisplay
              metrics={[
                {
                  label: 'Total de Sessões',
                  value: usageMetrics.totalSessions,
                  trend: 'up',
                  color: 'text-blue-600'
                },
                {
                  label: 'Arquivos Processados',
                  value: usageMetrics.totalRenames,
                  trend: 'up',
                  color: 'text-green-600'
                },
                {
                  label: 'Taxa de Sucesso',
                  value: `${usageMetrics.successRate.toFixed(1)}%`,
                  trend: usageMetrics.successRate > 90 ? 'up' : 'down',
                  color: usageMetrics.successRate > 90 ? 'text-green-600' : 'text-red-600'
                },
                {
                  label: 'Tempo Médio',
                  value: formatDuration(performanceMetrics.averageProcessingTime),
                  trend: 'stable',
                  color: 'text-purple-600'
                }
              ]}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Tipos de Arquivo Populares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(usageMetrics.popularFileTypes)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm">{type}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Horários de Pico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(usageMetrics.peakUsageHours)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([hour, count]) => (
                        <div key={hour} className="flex items-center justify-between">
                          <span className="text-sm">{hour}:00</span>
                          <Badge variant="outline">{count} eventos</Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="usage" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{usageMetrics.totalFiles}</div>
                  <div className="text-sm text-muted-foreground">Arquivos Enviados</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{usageMetrics.totalRenames}</div>
                  <div className="text-sm text-muted-foreground">Renomeações</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{usageMetrics.dailyActiveUsers}</div>
                  <div className="text-sm text-muted-foreground">Usuários Ativos (24h)</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatDuration(usageMetrics.averageSessionDuration)}
                  </div>
                  <div className="text-sm text-muted-foreground">Duração Média</div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Templates Mais Usados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(usageMetrics.popularTemplates)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([template, count]) => (
                      <div key={template} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="text-sm font-medium">{template}</span>
                        <Badge variant="secondary">{count} uso(s)</Badge>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(performanceMetrics.averageProcessingTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">Tempo Médio</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatFileSize(performanceMetrics.averageFileSize)}
                  </div>
                  <div className="text-sm text-muted-foreground">Tamanho Médio</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceMetrics.cacheHitRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {Object.values(performanceMetrics.errorCounts).reduce((a, b) => a + b, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total de Erros</div>
                </CardContent>
              </Card>
            </div>
            
            {Object.keys(performanceMetrics.errorCounts).length > 0 && (
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4" />
                    Tipos de Erro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(performanceMetrics.errorCounts)
                      .sort(([,a], [,b]) => b - a)
                      .map(([errorType, count]) => (
                        <div key={errorType} className="flex items-center justify-between">
                          <span className="text-sm">{errorType}</span>
                          <Badge variant="destructive">{count}</Badge>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="events" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Eventos Recentes</h3>
              <Badge variant="outline">{recentEvents.length} evento(s)</Badge>
            </div>
            
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <Card key={event.id} className="glass-panel border-primary/10">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="text-lg">{getEventIcon(event.category)}</div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getEventColor(event.category)}`}
                            >
                              {event.category}
                            </Badge>
                            <span className="text-sm font-medium">{event.action}</span>
                            {event.label && (
                              <span className="text-xs text-muted-foreground">• {event.label}</span>
                            )}
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(event.timestamp, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                            {event.value && (
                              <span className="ml-2">• Valor: {event.value}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">Insights Automáticos</h3>
            </div>
            
            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <Card key={index} className="glass-panel border-yellow-200 bg-yellow-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <p className="text-sm">{insight}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-panel">
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Continue usando a aplicação para gerar insights personalizados</p>
                </CardContent>
              </Card>
            )}
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleExportData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Dados
              </Button>
              
              <Button 
                onClick={handleCleanupData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Limpar Dados Antigos
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyticsDashboard;