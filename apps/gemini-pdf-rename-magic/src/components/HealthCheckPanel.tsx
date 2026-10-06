import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Zap,
  RefreshCw
} from 'lucide-react';
import { MinimalSpinner } from '@/components/ui/minimal-progress';
import { HealthChecker, SystemHealthReport, HealthCheckResult } from '@/utils/healthCheck';
import { logger } from '@/utils/logger';

interface HealthCheckPanelProps {
  apiKey?: string;
  className?: string;
}

const getStatusIcon = (status: 'healthy' | 'warning' | 'error') => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600" />;
  }
};

const getStatusColor = (status: 'healthy' | 'warning' | 'error') => {
  switch (status) {
    case 'healthy':
      return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200';
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200';
  }
};

const getBadgeVariant = (status: 'healthy' | 'warning' | 'error') => {
  switch (status) {
    case 'healthy':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'error':
      return 'destructive';
  }
};

const ComponentResult: React.FC<{ result: HealthCheckResult; expanded: boolean; onToggle: () => void }> = ({
  result,
  expanded,
  onToggle
}) => {
  return (
    <div className={`p-2 rounded border ${getStatusColor(result.status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(result.status)}
          <div>
            <div className="text-xs font-medium">{result.component}</div>
            <div className="text-xs opacity-80">{result.message}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {result.responseTime && (
            <Badge variant="outline" className="text-xs h-5">
              {result.responseTime}ms
            </Badge>
          )}
          
          <Badge variant={getBadgeVariant(result.status)} className="text-xs h-5">
            {result.status === 'healthy' ? '✓' : result.status === 'warning' ? '⚠' : '✗'}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export const HealthCheckPanel: React.FC<HealthCheckPanelProps> = ({ apiKey, className = '' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [checkType, setCheckType] = useState<'quick' | 'full'>('quick');

  const runHealthCheck = async (type: 'quick' | 'full' = 'quick') => {
    setIsRunning(true);
    setCheckType(type);
    
    try {
      logger.info('Iniciando health check', { type, hasApiKey: !!apiKey });
      
      const result = type === 'quick' 
        ? await HealthChecker.runQuickCheck()
        : await HealthChecker.runFullCheck(apiKey);
      
      setReport(result);
      
      logger.info('Health check concluído', {
        overall: result.overall,
        componentsChecked: result.components.length,
        totalTime: result.summary.totalResponseTime
      });
    } catch (error) {
      logger.error('Erro durante health check', error instanceof Error ? error : new Error(String(error)));
      
      // Criar um report de erro
      setReport({
        overall: 'error',
        timestamp: new Date(),
        components: [{
          component: 'System',
          status: 'error',
          message: `Erro durante verificação: ${error instanceof Error ? error.message : String(error)}`
        }],
        summary: {
          healthy: 0,
          warning: 0,
          error: 1,
          totalResponseTime: 0
        }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const toggleComponentExpansion = (component: string) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(component)) {
      newExpanded.delete(component);
    } else {
      newExpanded.add(component);
    }
    setExpandedComponents(newExpanded);
  };

  const exportReport = () => {
    if (!report) return;
    
    const reportData = {
      ...report,
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-check-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.info('Relatório de health check exportado');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Compact Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => runHealthCheck('quick')}
          disabled={isRunning}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          {isRunning && checkType === 'quick' ? (
            <MinimalSpinner size="xs" className="mr-1" />
          ) : (
            <Zap className="h-3 w-3 mr-1" />
          )}
          Rápido
        </Button>
        
        <Button
          onClick={() => runHealthCheck('full')}
          disabled={isRunning || !apiKey}
          size="sm"
          className="flex-1 btn-primary h-8 text-xs"
        >
          {isRunning && checkType === 'full' ? (
            <MinimalSpinner size="xs" className="mr-1" />
          ) : (
            <Activity className="h-3 w-3 mr-1" />
          )}
          Completo
        </Button>
      </div>
      
      {!apiKey && (
        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/20 p-2 rounded border border-amber-200">
          ⚠️ API necessária para verificação completa
        </div>
      )}
      
      {/* Compact Results */}
      {report && (
        <div className="space-y-2">
          {/* Compact Status */}
          <div className={`p-2 rounded border ${getStatusColor(report.overall)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(report.overall)}
                <div>
                  <div className="text-xs font-bold">
                    {report.overall === 'healthy' ? '✅ Sistema OK' : 
                     report.overall === 'warning' ? '⚠️ Avisos' : '❌ Problemas'}
                  </div>
                  <div className="text-xs opacity-80">
                    {report.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => runHealthCheck(checkType)}
                variant="ghost"
                size="sm"
                disabled={isRunning}
                className="h-6 w-6 p-0"
              >
                {isRunning ? (
                  <MinimalSpinner size="xs" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {/* Compact Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-green-600">{report.summary.healthy}</div>
                <div className="text-xs opacity-80">OK</div>
              </div>
              <div>
                <div className="text-sm font-bold text-yellow-600">{report.summary.warning}</div>
                <div className="text-xs opacity-80">Avisos</div>
              </div>
              <div>
                <div className="text-sm font-bold text-red-600">{report.summary.error}</div>
                <div className="text-xs opacity-80">Erros</div>
              </div>
            </div>
          </div>
          
          {/* Compact Components */}
          <div className="space-y-1">
            {report.components.slice(0, 3).map((component, index) => (
              <ComponentResult
                key={`${component.component}-${index}`}
                result={component}
                expanded={false}
                onToggle={() => {}}
              />
            ))}
            {report.components.length > 3 && (
              <div className="text-xs text-muted-foreground text-center p-1">
                +{report.components.length - 3} mais componentes
              </div>
            )}
          </div>
        </div>
      )}
      
      {isRunning && (
        <div className="text-center py-4">
          <MinimalSpinner size="sm" className="mx-auto mb-2" />
          <div className="text-xs text-muted-foreground">
            {checkType === 'quick' ? 'Verificação rápida...' : 'Verificação completa...'}
          </div>
        </div>
      )}
      
      {!report && !isRunning && (
        <div className="text-center py-4 text-muted-foreground">
          <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <div className="text-xs">Clique para verificar o sistema</div>
        </div>
      )}
    </div>
  );
};

export default HealthCheckPanel;