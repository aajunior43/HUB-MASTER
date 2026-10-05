import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Download, 
  Archive, 
  Play,
  Trash2,
  BarChart3
} from 'lucide-react';
import { MinimalSpinner } from './minimal-progress';

export interface ResultsSummaryData {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  errors: number;
}

interface ResultsSummaryProps {
  data: ResultsSummaryData;
  onProcessAll?: () => void;
  onDownloadAll?: () => void;
  onClearAll?: () => void;
  isProcessing?: boolean;
  isDownloading?: boolean;
  className?: string;
  showActions?: boolean;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  data,
  onProcessAll,
  onDownloadAll,
  onClearAll,
  isProcessing = false,
  isDownloading = false,
  className = '',
  showActions = true
}) => {
  const { total, pending, processing, completed, errors } = data;
  
  if (total === 0) {
    return null;
  }

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasErrors = errors > 0;
  const hasCompleted = completed > 0;
  const hasPending = pending > 0;

  return (
    <Card className={`minimal-card border-border/40 ${className}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Statistics */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">{total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            
            <div className="w-px h-8 bg-border/50"></div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-warning">{pending}</div>
              <div className="text-xs text-muted-foreground">Pendente</div>
            </div>
            
            {processing > 0 && (
              <>
                <div className="w-px h-8 bg-border/50"></div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600 flex items-center justify-center gap-1">
                    {processing}
                    <MinimalSpinner size="xs" />
                  </div>
                  <div className="text-xs text-muted-foreground">Processando</div>
                </div>
              </>
            )}
            
            <div className="w-px h-8 bg-border/50"></div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-success">{completed}</div>
              <div className="text-xs text-muted-foreground">Concluído</div>
            </div>
            
            {hasErrors && (
              <>
                <div className="w-px h-8 bg-border/50"></div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-destructive">{errors}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </>
            )}
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                {completionRate}% concluído
              </div>
              <div className="text-xs text-muted-foreground">
                {completed} de {total} arquivos
              </div>
            </div>
            
            <div className="w-12 h-12 relative">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted/30"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={hasErrors ? "text-destructive" : "text-success"}
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${completionRate}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {processing > 0 ? (
                  <MinimalSpinner size="sm" />
                ) : hasErrors ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : completed === total ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
            {hasPending && onProcessAll && (
              <Button
                onClick={onProcessAll}
                disabled={isProcessing}
                size="sm"
                className="minimal-button bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              >
                {isProcessing ? (
                  <MinimalSpinner size="sm" className="mr-2" />
                ) : (
                  <Play className="h-3 w-3 mr-2" />
                )}
                {isProcessing ? 'Processando...' : `Processar ${pending}`}
              </Button>
            )}
            
            {hasCompleted && onDownloadAll && (
              <Button
                onClick={onDownloadAll}
                disabled={isDownloading}
                size="sm"
                variant="outline"
                className="minimal-button"
              >
                {isDownloading ? (
                  <MinimalSpinner size="sm" className="mr-2" />
                ) : (
                  <Archive className="h-3 w-3 mr-2" />
                )}
                {isDownloading ? 'Criando ZIP...' : `Baixar ${completed}`}
              </Button>
            )}
            
            {onClearAll && (
              <Button
                onClick={onClearAll}
                size="sm"
                variant="ghost"
                className="minimal-button text-muted-foreground hover:text-destructive hover:border-destructive/30"
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Limpar Lista
              </Button>
            )}
          </div>
        )}
        
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {processing > 0 && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
              <MinimalSpinner size="xs" className="mr-1" />
              {processing} processando
            </Badge>
          )}
          
          {hasErrors && (
            <Badge variant="destructive" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              {errors} com erro
            </Badge>
          )}
          
          {hasPending && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {pending} pendente{pending > 1 ? 's' : ''}
            </Badge>
          )}
          
          {hasCompleted && (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              {completed} concluído{completed > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsSummary;