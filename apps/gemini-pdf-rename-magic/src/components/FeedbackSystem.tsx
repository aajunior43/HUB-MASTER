import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Loader2, 
  X, 
  Zap,
  Clock,
  TrendingUp,
  Activity,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  description?: string;
  progress?: number;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    action: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }[];
}

interface FeedbackSystemProps {
  messages: FeedbackMessage[];
  onDismiss: (id: string) => void;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

export const FeedbackSystem = ({ 
  messages, 
  onDismiss, 
  className,
  position = 'top-right'
}: FeedbackSystemProps) => {
  const [visibleMessages, setVisibleMessages] = useState<FeedbackMessage[]>([]);

  useEffect(() => {
    setVisibleMessages(messages);

    // Auto-dismiss non-persistent messages
    messages.forEach(message => {
      if (!message.persistent && message.type !== 'loading') {
        const duration = message.duration || (message.type === 'error' ? 5000 : 3000);
        setTimeout(() => {
          onDismiss(message.id);
        }, duration);
      }
    });
  }, [messages, onDismiss]);

  const getIcon = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getColorClasses = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      case 'loading':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50';
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50';
      case 'center':
        return 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  if (visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className={cn(getPositionClasses(), className)}>
      <div className="space-y-3 max-w-sm">
        {visibleMessages.map((message, index) => (
          <Card 
            key={message.id}
            className={cn(
              'glass-panel border shadow-lg transition-all duration-300 hover:shadow-xl',
              'animate-slide-in-right',
              getColorClasses(message.type)
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(message.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground mb-1">
                        {message.title}
                      </h4>
                      
                      {message.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {message.description}
                        </p>
                      )}
                      
                      {message.progress !== undefined && (
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-xs">
                            <span>Progresso</span>
                            <span>{Math.round(message.progress)}%</span>
                          </div>
                          <Progress 
                            value={message.progress} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {message.actions.map((action, actionIndex) => (
                            <Button
                              key={actionIndex}
                              size="sm"
                              variant={action.variant || 'outline'}
                              onClick={action.action}
                              className="h-6 text-xs"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {!message.persistent && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDismiss(message.id)}
                        className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Hook para gerenciar mensagens de feedback
export const useFeedback = () => {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const { toast } = useToast();

  const addMessage = (message: Omit<FeedbackMessage, 'id'>) => {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMessage: FeedbackMessage = { ...message, id };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Também usar o toast padrão como fallback
    toast({
      title: message.title,
      description: message.description,
      variant: message.type === 'error' ? 'destructive' : 'default'
    });
    
    return id;
  };

  const updateMessage = (id: string, updates: Partial<FeedbackMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  const dismissMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAll = () => {
    setMessages([]);
  };

  // Métodos de conveniência
  const success = (title: string, description?: string, options?: Partial<FeedbackMessage>) => {
    return addMessage({ type: 'success', title, description, ...options });
  };

  const error = (title: string, description?: string, options?: Partial<FeedbackMessage>) => {
    return addMessage({ type: 'error', title, description, persistent: true, ...options });
  };

  const warning = (title: string, description?: string, options?: Partial<FeedbackMessage>) => {
    return addMessage({ type: 'warning', title, description, ...options });
  };

  const info = (title: string, description?: string, options?: Partial<FeedbackMessage>) => {
    return addMessage({ type: 'info', title, description, ...options });
  };

  const loading = (title: string, description?: string, options?: Partial<FeedbackMessage>) => {
    return addMessage({ type: 'loading', title, description, persistent: true, ...options });
  };

  return {
    messages,
    addMessage,
    updateMessage,
    dismissMessage,
    clearAll,
    success,
    error,
    warning,
    info,
    loading
  };
};

// Componente de status em tempo real
interface StatusIndicatorProps {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
  progress?: number;
  className?: string;
}

export const StatusIndicator = ({ 
  status, 
  message, 
  progress, 
  className 
}: StatusIndicatorProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Aguardando'
        };
      case 'processing':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          label: 'Processando'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          label: 'Concluído'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          label: 'Erro'
        };
      default:
        return {
          icon: <Activity className="h-4 w-4" />,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          label: 'Desconhecido'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-lg', config.bgColor, className)}>
      <div className={config.color}>
        {config.icon}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium', config.color)}>
            {message || config.label}
          </span>
          
          {progress !== undefined && (
            <span className={cn('text-xs', config.color)}>
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {progress !== undefined && (
          <Progress 
            value={progress} 
            className="h-1 mt-1"
          />
        )}
      </div>
    </div>
  );
};

// Componente de métricas em tempo real
interface MetricsDisplayProps {
  metrics: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
    color?: string;
  }[];
  className?: string;
}

export const MetricsDisplay = ({ metrics, className }: MetricsDisplayProps) => {
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      case 'stable':
        return <Activity className="h-3 w-3 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {metrics.map((metric, index) => (
        <Card key={index} className="glass-panel animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className={cn('text-lg font-bold', metric.color || 'text-primary')}>
                {metric.value}
              </span>
              {getTrendIcon(metric.trend)}
            </div>
            <div className="text-xs text-muted-foreground">
              {metric.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Componente de loading aprimorado
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dots' | 'pulse' | 'bounce';
  message?: string;
  className?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'default', 
  message, 
  className 
}: LoadingSpinnerProps) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-6 w-6';
      case 'lg': return 'h-8 w-8';
      default: return 'h-6 w-6';
    }
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={cn('bg-primary rounded-full animate-pulse', getSizeClasses())}></div>
        );
      case 'bounce':
        return (
          <div className={cn('bg-primary rounded-full animate-bounce', getSizeClasses())}></div>
        );
      default:
        return (
          <Loader2 className={cn('animate-spin text-primary', getSizeClasses())} />
        );
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {renderSpinner()}
      {message && (
        <span className="text-sm text-muted-foreground animate-pulse">
          {message}
        </span>
      )}
    </div>
  );
};

export default FeedbackSystem;