import React, { useMemo } from 'react';
import { MinimalResultsList, ResultItem } from './minimal-results';
import { ResultsSummary, ResultsSummaryData } from './results-summary';

interface ResultsContainerProps {
  items: ResultItem[];
  onDownload?: (item: ResultItem) => void;
  onPreview?: (item: ResultItem) => void;
  onRetry?: (item: ResultItem) => void;
  onRemove?: (item: ResultItem) => void;
  onProcess?: (item: ResultItem) => void;
  onCopyName?: (item: ResultItem) => void;
  onOpenExternal?: (item: ResultItem) => void;
  onProcessAll?: () => void;
  onDownloadAll?: () => void;
  onClearAll?: () => void;
  isProcessing?: boolean;
  isDownloading?: boolean;
  className?: string;
  showSummary?: boolean;
  showActions?: boolean;
  compact?: boolean;
  actionsVariant?: 'inline' | 'dropdown' | 'compact';
  title?: string;
  emptyMessage?: string;
}

export const ResultsContainer: React.FC<ResultsContainerProps> = ({
  items,
  onDownload,
  onPreview,
  onRetry,
  onRemove,
  onProcess,
  onCopyName,
  onOpenExternal,
  onProcessAll,
  onDownloadAll,
  onClearAll,
  isProcessing = false,
  isDownloading = false,
  className = '',
  showSummary = true,
  showActions = true,
  compact = false,
  actionsVariant = 'inline',
  title = 'Resultados',
  emptyMessage = 'Nenhum arquivo processado ainda'
}) => {
  // Calculate summary data
  const summaryData: ResultsSummaryData = useMemo(() => {
    const data = {
      total: items.length,
      pending: 0,
      processing: 0,
      completed: 0,
      errors: 0
    };
    
    items.forEach(item => {
      switch (item.status) {
        case 'pending':
          data.pending++;
          break;
        case 'processing':
          data.processing++;
          break;
        case 'completed':
          data.completed++;
          break;
        case 'error':
          data.errors++;
          break;
      }
    });
    
    return data;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
        )}
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-border/30">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            {emptyMessage}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Os arquivos processados aparecerão aqui com seus novos nomes sugeridos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <div className="text-sm text-muted-foreground">
            {summaryData.total} arquivo{summaryData.total !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      
      {/* Summary */}
      {showSummary && (
        <ResultsSummary
          data={summaryData}
          onProcessAll={onProcessAll}
          onDownloadAll={onDownloadAll}
          onClearAll={onClearAll}
          isProcessing={isProcessing}
          isDownloading={isDownloading}
          showActions={showActions}
        />
      )}
      
      {/* Results List */}
      <MinimalResultsList
        items={items}
        onDownload={onDownload}
        onPreview={onPreview}
        onRetry={onRetry}
        onRemove={onRemove}
        onProcess={onProcess}
        onCopyName={onCopyName}
        onOpenExternal={onOpenExternal}
        showActions={showActions}
        compact={compact}
        actionsVariant={actionsVariant}
      />
    </div>
  );
};

export default ResultsContainer;