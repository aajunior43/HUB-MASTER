import React from 'react';
import { cn } from '@/lib/utils';
import { MinimalSpinner, ProcessingIndicator } from './minimal-progress';

interface LoadingStateProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  spinnerSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  children,
  loadingText = 'Carregando...',
  className,
  spinnerSize = 'sm'
}) => {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <div className="flex items-center gap-2">
          <MinimalSpinner size={spinnerSize} />
          <span className="text-sm text-muted-foreground">{loadingText}</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

interface ProcessingStateProps {
  isProcessing: boolean;
  progress?: number;
  processingText?: string;
  children: React.ReactNode;
  className?: string;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  isProcessing,
  progress,
  processingText = 'Processando...',
  children,
  className
}) => {
  if (isProcessing) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        <ProcessingIndicator
          isProcessing={isProcessing}
          progress={progress}
          label={processingText}
          size="sm"
        />
      </div>
    );
  }

  return <>{children}</>;
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const MinimalSkeleton: React.FC<SkeletonProps> = ({
  className,
  lines = 1
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-3 bg-muted/30 rounded animate-pulse"
          style={{
            width: `${Math.random() * 40 + 60}%`,
            animationDelay: `${index * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

interface FileProcessingStateProps {
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  className?: string;
}

export const FileProcessingState: React.FC<FileProcessingStateProps> = ({
  fileName,
  status,
  progress,
  className
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Aguardando...';
      case 'processing': return 'Processando...';
      case 'completed': return 'Concluído';
      case 'error': return 'Erro';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'text-muted-foreground';
      case 'processing': return 'text-primary';
      case 'completed': return 'text-success';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground truncate">
          {fileName}
        </span>
        <span className={cn('text-xs', getStatusColor())}>
          {getStatusText()}
        </span>
      </div>
      
      {status === 'processing' && (
        <ProcessingIndicator
          isProcessing={true}
          progress={progress}
          size="xs"
        />
      )}
    </div>
  );
};

interface BatchProcessingOverlayProps {
  isVisible: boolean;
  currentFile?: string;
  progress?: number;
  total?: number;
  completed?: number;
}

export const BatchProcessingOverlay: React.FC<BatchProcessingOverlayProps> = ({
  isVisible,
  currentFile,
  progress,
  total,
  completed
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg max-w-md w-full mx-4">
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Processando arquivos
            </h3>
            {currentFile && (
              <p className="text-sm text-muted-foreground truncate">
                {currentFile}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <ProcessingIndicator
              isProcessing={true}
              progress={progress}
              size="md"
            />
            
            {total && completed !== undefined && (
              <div className="text-center text-xs text-muted-foreground">
                {completed} de {total} arquivos processados
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};