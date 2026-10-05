
import { Trash2, Download, X, Activity, FolderInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BulkActionsProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onExportSelected: () => void;
  onMoveToFolder?: () => void;
  onCheckSelected?: () => void;
  onClearSelection: () => void;
  isVisible: boolean;
}

export const BulkActions = ({
  selectedCount,
  onDeleteSelected,
  onExportSelected,
  onMoveToFolder,
  onCheckSelected,
  onClearSelection,
  isVisible,
}: BulkActionsProps) => {
  if (!isVisible || selectedCount === 0) return null;

  return (
    <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900/95 border-green-400 z-50 animate-fade-in">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-green-400 font-mono text-sm font-bold">
            {selectedCount} SELECIONADO{selectedCount !== 1 ? 'S' : ''}
          </span>
        </div>
        
        <div className="h-4 w-px bg-green-400/30"></div>
        
        <div className="flex gap-2">
          {onCheckSelected && (
            <Button
              size="sm"
              onClick={onCheckSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white font-mono"
            >
              <Activity className="h-3 w-3 mr-1" />
              VERIFICAR
            </Button>
          )}

          {onMoveToFolder && (
            <Button
              size="sm"
              onClick={onMoveToFolder}
              className="bg-amber-600 hover:bg-amber-700 text-white font-mono"
            >
              <FolderInput className="h-3 w-3 mr-1" />
              PASTA
            </Button>
          )}
          
          <Button
            size="sm"
            onClick={onExportSelected}
            variant="outline"
            className="border-green-400/50 text-green-400 hover:bg-green-900/30 bg-gray-900/50 font-mono"
          >
            <Download className="h-3 w-3 mr-1" />
            EXPORTAR
          </Button>
          
          <Button
            size="sm"
            onClick={onDeleteSelected}
            variant="outline"
            className="border-red-400/50 text-red-400 hover:bg-red-900/30 bg-gray-900/50 font-mono"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            EXCLUIR
          </Button>
        </div>
        
        <div className="h-4 w-px bg-green-400/30"></div>
        
        <Button
          size="sm"
          onClick={onClearSelection}
          variant="ghost"
          className="text-green-400 hover:bg-green-900/30 font-mono h-8 w-8 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
