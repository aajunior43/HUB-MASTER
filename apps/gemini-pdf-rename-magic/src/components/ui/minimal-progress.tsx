import React from 'react';
import { cn } from '@/lib/utils';

interface MinimalProgressProps {
  value?: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  showPercentage?: boolean;
  label?: string;
}

export const MinimalProgress: React.FC<MinimalProgressProps> = ({
  value = 0,
  className,
  size = 'md',
  variant = 'default',
  showPercentage = false,
  label
}) => {
  const sizeClasses = {
    xs: 'h-0.5',
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2'
  };

  const variantClasses = {
    default: 'bg-primary/80',
    success: 'bg-success/80',
    warning: 'bg-warning/80',
    destructive: 'bg-destructive/80'
  };

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full space-y-1', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div className={cn(
        'w-full bg-muted/20 rounded-full overflow-hidden border border-border/20',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-200 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

interface MinimalSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export const MinimalSpinner: React.FC<MinimalSpinnerProps> = ({
  size = 'md',
  className,
  variant = 'default'
}) => {
  const sizeClasses = {
    xs: 'w-2.5 h-2.5 border',
    sm: 'w-3 h-3 border',
    md: 'w-4 h-4 border-2',
    lg: 'w-5 h-5 border-2'
  };

  const variantClasses = {
    default: 'border-muted/20 border-t-primary/80',
    success: 'border-muted/20 border-t-success/80',
    warning: 'border-muted/20 border-t-warning/80',
    destructive: 'border-muted/20 border-t-destructive/80'
  };

  return (
    <div className={cn(
      'animate-spin rounded-full',
      sizeClasses[size],
      variantClasses[variant],
      className
    )} />
  );
};

interface ProcessingIndicatorProps {
  isProcessing: boolean;
  progress?: number;
  label?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  isProcessing,
  progress,
  label,
  className,
  size = 'sm'
}) => {
  if (!isProcessing && progress === undefined) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isProcessing && <MinimalSpinner size={size} />}
      {progress !== undefined && (
        <MinimalProgress 
          value={progress} 
          size={size} 
          label={label}
          className="flex-1"
        />
      )}
      {isProcessing && !progress && label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

interface BatchProgressProps {
  total: number;
  completed: number;
  processing: number;
  errors: number;
  className?: string;
  showDetails?: boolean;
}

export const BatchProgress: React.FC<BatchProgressProps> = ({
  total,
  completed,
  processing,
  errors,
  className,
  showDetails = true
}) => {
  const completedPercentage = total > 0 ? (completed / total) * 100 : 0;
  const processingPercentage = total > 0 ? (processing / total) * 100 : 0;
  const errorPercentage = total > 0 ? (errors / total) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso do lote</span>
          <span>{completed}/{total} concluídos</span>
        </div>
      )}
      
      <div className="relative h-1.5 w-full bg-muted/20 rounded-full overflow-hidden border border-border/20">
        {/* Completed progress */}
        <div
          className="absolute left-0 top-0 h-full bg-success/80 transition-all duration-200 ease-out"
          style={{ width: `${completedPercentage}%` }}
        />
        
        {/* Processing progress */}
        <div
          className="absolute top-0 h-full bg-primary/80 transition-all duration-200 ease-out"
          style={{ 
            left: `${completedPercentage}%`,
            width: `${processingPercentage}%` 
          }}
        />
        
        {/* Error progress */}
        <div
          className="absolute top-0 h-full bg-destructive/80 transition-all duration-200 ease-out"
          style={{ 
            left: `${completedPercentage + processingPercentage}%`,
            width: `${errorPercentage}%` 
          }}
        />
      </div>
      
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-success/80 rounded-full"></div>
              <span className="text-muted-foreground">{completed} concluídos</span>
            </div>
            {processing > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary/80 rounded-full"></div>
                <span className="text-muted-foreground">{processing} processando</span>
              </div>
            )}
            {errors > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-destructive/80 rounded-full"></div>
                <span className="text-muted-foreground">{errors} erros</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};