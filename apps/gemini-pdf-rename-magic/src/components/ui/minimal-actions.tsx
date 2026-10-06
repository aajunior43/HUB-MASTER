import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Eye, 
  RefreshCw, 
  Play, 
  X, 
  Copy,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MinimalSpinner } from './minimal-progress';
import { ResultItem } from './minimal-results';

interface MinimalActionsProps {
  item: ResultItem;
  onDownload?: (item: ResultItem) => void;
  onPreview?: (item: ResultItem) => void;
  onRetry?: (item: ResultItem) => void;
  onRemove?: (item: ResultItem) => void;
  onProcess?: (item: ResultItem) => void;
  onCopyName?: (item: ResultItem) => void;
  onOpenExternal?: (item: ResultItem) => void;
  variant?: 'inline' | 'dropdown' | 'compact';
  size?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

export const MinimalActions: React.FC<MinimalActionsProps> = ({
  item,
  onDownload,
  onPreview,
  onRetry,
  onRemove,
  onProcess,
  onCopyName,
  onOpenExternal,
  variant = 'inline',
  size = 'sm',
  showLabels = false,
  className = ''
}) => {
  const buttonSize = size === 'sm' ? 'sm' : 'default';
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const buttonClass = `minimal-button h-8 ${size === 'sm' ? 'w-8 p-0' : 'px-3'}`;

  // Primary actions based on status
  const getPrimaryActions = () => {
    const actions = [];

    if (item.status === 'pending' && onProcess) {
      actions.push({
        key: 'process',
        icon: <Play className={iconSize} />,
        label: 'Processar',
        onClick: () => onProcess(item),
        className: 'text-primary hover:bg-primary/10 hover:text-primary',
        title: 'Processar arquivo'
      });
    }

    if (item.status === 'error' && onRetry) {
      actions.push({
        key: 'retry',
        icon: <RefreshCw className={iconSize} />,
        label: 'Tentar novamente',
        onClick: () => onRetry(item),
        className: 'text-warning hover:bg-warning/10 hover:text-warning',
        title: 'Tentar processar novamente'
      });
    }

    if (item.status === 'completed' && item.newName) {
      if (onPreview) {
        actions.push({
          key: 'preview',
          icon: <Eye className={iconSize} />,
          label: 'Visualizar',
          onClick: () => onPreview(item),
          className: 'text-muted-foreground hover:bg-muted/20 hover:text-foreground',
          title: 'Visualizar arquivo'
        });
      }

      if (onDownload) {
        actions.push({
          key: 'download',
          icon: <Download className={iconSize} />,
          label: 'Baixar',
          onClick: () => onDownload(item),
          className: 'text-success hover:bg-success/10 hover:text-success',
          title: 'Baixar arquivo renomeado'
        });
      }
    }

    return actions;
  };

  // Secondary actions
  const getSecondaryActions = () => {
    const actions = [];

    if (item.status === 'completed' && item.newName && onCopyName) {
      actions.push({
        key: 'copy',
        icon: <Copy className={iconSize} />,
        label: 'Copiar nome',
        onClick: () => onCopyName(item),
        title: 'Copiar novo nome'
      });
    }

    if (onOpenExternal) {
      actions.push({
        key: 'external',
        icon: <ExternalLink className={iconSize} />,
        label: 'Abrir externamente',
        onClick: () => onOpenExternal(item),
        title: 'Abrir em aplicativo externo'
      });
    }

    if (onRemove) {
      actions.push({
        key: 'remove',
        icon: <X className={iconSize} />,
        label: 'Remover',
        onClick: () => onRemove(item),
        title: 'Remover da lista',
        className: 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive',
        separator: true
      });
    }

    return actions;
  };

  const primaryActions = getPrimaryActions();
  const secondaryActions = getSecondaryActions();
  const allActions = [...primaryActions, ...secondaryActions];

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={buttonSize}
            variant="ghost"
            className={`${buttonClass} ${className}`}
          >
            <MoreHorizontal className={iconSize} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {allActions.map((action, index) => (
            <React.Fragment key={action.key}>
              {action.separator && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={action.onClick}
                className="flex items-center gap-2 cursor-pointer"
              >
                {action.icon}
                <span>{action.label}</span>
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    // Show only the most relevant action + dropdown for others
    const mainAction = primaryActions[0];
    const otherActions = [...primaryActions.slice(1), ...secondaryActions];

    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {mainAction && (
          <Button
            onClick={mainAction.onClick}
            size={buttonSize}
            variant="ghost"
            className={`${buttonClass} ${mainAction.className || ''}`}
            title={mainAction.title}
          >
            {showLabels ? (
              <>
                {mainAction.icon}
                <span className="ml-1">{mainAction.label}</span>
              </>
            ) : (
              mainAction.icon
            )}
          </Button>
        )}
        
        {otherActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size={buttonSize}
                variant="ghost"
                className={buttonClass}
              >
                <MoreHorizontal className={iconSize} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {otherActions.map((action, index) => (
                <React.Fragment key={action.key}>
                  {action.separator && index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={action.onClick}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {primaryActions.map((action) => (
        <Button
          key={action.key}
          onClick={action.onClick}
          size={buttonSize}
          variant="ghost"
          className={`${buttonClass} ${action.className || ''}`}
          title={action.title}
        >
          {showLabels ? (
            <>
              {action.icon}
              <span className="ml-1">{action.label}</span>
            </>
          ) : (
            action.icon
          )}
        </Button>
      ))}
      
      {secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size={buttonSize}
              variant="ghost"
              className={`${buttonClass} text-muted-foreground hover:bg-muted/20`}
            >
              <MoreHorizontal className={iconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {secondaryActions.map((action, index) => (
              <React.Fragment key={action.key}>
                {action.separator && index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  onClick={action.onClick}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {action.icon}
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

// Batch actions component for multiple items
interface BatchActionsProps {
  selectedItems: ResultItem[];
  onProcessSelected?: (items: ResultItem[]) => void;
  onDownloadSelected?: (items: ResultItem[]) => void;
  onRemoveSelected?: (items: ResultItem[]) => void;
  onClearSelection?: () => void;
  isProcessing?: boolean;
  isDownloading?: boolean;
  className?: string;
}

export const BatchActions: React.FC<BatchActionsProps> = ({
  selectedItems,
  onProcessSelected,
  onDownloadSelected,
  onRemoveSelected,
  onClearSelection,
  isProcessing = false,
  isDownloading = false,
  className = ''
}) => {
  if (selectedItems.length === 0) {
    return null;
  }

  const pendingItems = selectedItems.filter(item => item.status === 'pending');
  const completedItems = selectedItems.filter(item => item.status === 'completed' && item.newName);

  return (
    <div className={`flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-border/30 ${className}`}>
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium text-foreground">
          {selectedItems.length} selecionado{selectedItems.length !== 1 ? 's' : ''}
        </span>
        
        {pendingItems.length > 0 && onProcessSelected && (
          <Button
            onClick={() => onProcessSelected(pendingItems)}
            disabled={isProcessing}
            size="sm"
            className="minimal-button bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
          >
            {isProcessing ? (
              <MinimalSpinner size="sm" className="mr-2" />
            ) : (
              <Play className="h-3 w-3 mr-2" />
            )}
            Processar {pendingItems.length}
          </Button>
        )}
        
        {completedItems.length > 0 && onDownloadSelected && (
          <Button
            onClick={() => onDownloadSelected(completedItems)}
            disabled={isDownloading}
            size="sm"
            variant="outline"
            className="minimal-button"
          >
            {isDownloading ? (
              <MinimalSpinner size="sm" className="mr-2" />
            ) : (
              <Download className="h-3 w-3 mr-2" />
            )}
            Baixar {completedItems.length}
          </Button>
        )}
        
        {onRemoveSelected && (
          <Button
            onClick={() => onRemoveSelected(selectedItems)}
            size="sm"
            variant="ghost"
            className="minimal-button text-muted-foreground hover:text-destructive hover:border-destructive/30"
          >
            <X className="h-3 w-3 mr-2" />
            Remover
          </Button>
        )}
      </div>
      
      {onClearSelection && (
        <Button
          onClick={onClearSelection}
          size="sm"
          variant="ghost"
          className="minimal-button text-muted-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export default MinimalActions;