import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Image,
  FileType
} from 'lucide-react';
import { MinimalSpinner } from './minimal-progress';
import { MinimalActions } from './minimal-actions';

export interface ResultItem {
  id: string;
  originalName: string;
  newName?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  fileType: string;
  fileSize: number;
  error?: string;
  relativePath?: string;
  folderName?: string;
}

interface MinimalResultsListProps {
  items: ResultItem[];
  onDownload?: (item: ResultItem) => void;
  onPreview?: (item: ResultItem) => void;
  onRetry?: (item: ResultItem) => void;
  onRemove?: (item: ResultItem) => void;
  onProcess?: (item: ResultItem) => void;
  onCopyName?: (item: ResultItem) => void;
  onOpenExternal?: (item: ResultItem) => void;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
  actionsVariant?: 'inline' | 'dropdown' | 'compact';
}

const getFileIcon = (fileType: string, fileName: string) => {
  const lowerType = fileType.toLowerCase();
  const lowerName = fileName.toLowerCase();
  
  if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  
  if (lowerType.includes('word') || lowerName.match(/\.(docx?|dotx?)$/)) {
    return <FileType className="h-4 w-4 text-blue-500" />;
  }
  
  if (lowerType.includes('image') || lowerName.match(/\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp)$/i)) {
    return <Image className="h-4 w-4 text-green-500" />;
  }
  
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const getStatusIcon = (status: ResultItem['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'processing':
      return <MinimalSpinner size="sm" variant="default" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: ResultItem['status']) => {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
    case 'processing':
      return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">Processando</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Concluído</Badge>;
    case 'error':
      return <Badge variant="destructive" className="text-xs">Erro</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const MinimalResultsList: React.FC<MinimalResultsListProps> = ({
  items,
  onDownload,
  onPreview,
  onRetry,
  onRemove,
  onProcess,
  onCopyName,
  onOpenExternal,
  className = '',
  showActions = true,
  compact = false,
  actionsVariant = 'inline'
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-muted/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-border/30">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum resultado para exibir</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <Card 
          key={item.id} 
          className="minimal-card border-border/40 transition-all duration-200 hover:border-border/60"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <CardContent className={compact ? "p-3" : "p-4"}>
            <div className="flex items-center gap-3">
              {/* File Icon */}
              <div className="flex-shrink-0 w-8 h-8 bg-muted/20 rounded-lg flex items-center justify-center border border-border/30">
                {getFileIcon(item.fileType, item.originalName)}
              </div>
              
              {/* File Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate text-sm">
                    {item.originalName}
                  </h4>
                  {getStatusBadge(item.status)}
                </div>
                
                {/* File Details */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatFileSize(item.fileSize)}</span>
                  <span className="capitalize">{item.fileType}</span>
                  {item.folderName && item.folderName !== 'Root' && (
                    <span className="bg-muted/30 px-2 py-0.5 rounded-md">
                      {item.folderName}
                    </span>
                  )}
                </div>
                
                {/* New Name Display */}
                {item.newName && (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-2 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">→</span>
                      <code className="font-mono text-success font-medium text-xs">
                        {item.newName}.{item.originalName.split('.').pop()}
                      </code>
                    </div>
                  </div>
                )}
                
                {/* Error Display */}
                {item.error && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-2 mt-2">
                    <div className="text-xs text-destructive">
                      {item.error}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {getStatusIcon(item.status)}
              </div>
              
              {/* Actions */}
              {showActions && (
                <div className="flex-shrink-0">
                  <MinimalActions
                    item={item}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onRetry={onRetry}
                    onRemove={onRemove}
                    onProcess={onProcess}
                    onCopyName={onCopyName}
                    onOpenExternal={onOpenExternal}
                    variant={actionsVariant}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MinimalResultsList;