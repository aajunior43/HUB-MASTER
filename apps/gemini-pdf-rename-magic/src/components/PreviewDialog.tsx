import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Eye, 
  Edit, 
  Check, 
  X, 
  Download, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface PreviewItem {
  id: string;
  file: File;
  originalName: string;
  suggestedName: string;
  editedName?: string;
  status: 'pending' | 'approved' | 'edited' | 'rejected';
  fileType: string;
  fileSize: number;
  isEditing?: boolean;
}

interface PreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: PreviewItem[];
  onApprove: (items: PreviewItem[]) => void;
  onRegenerate?: (item: PreviewItem) => Promise<string>;
  title?: string;
  description?: string;
}

export const PreviewDialog = ({
  isOpen,
  onClose,
  items,
  onApprove,
  onRegenerate,
  title = "Preview dos Nomes Sugeridos",
  description = "Revise e edite os nomes sugeridos antes de aplicá-los"
}: PreviewDialogProps) => {
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreviewItems([...items]);
  }, [items]);

  const handleEditToggle = (id: string) => {
    setPreviewItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, isEditing: !item.isEditing }
        : item
    ));
  };

  const handleNameChange = (id: string, newName: string) => {
    setPreviewItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            editedName: newName,
            status: newName !== item.suggestedName ? 'edited' : 'pending'
          }
        : item
    ));
  };

  const handleApproveItem = (id: string) => {
    setPreviewItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: 'approved', isEditing: false }
        : item
    ));
  };

  const handleRejectItem = (id: string) => {
    setPreviewItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: 'rejected', isEditing: false }
        : item
    ));
  };

  const handleRegenerateItem = async (item: PreviewItem) => {
    if (!onRegenerate) return;

    setIsRegenerating(item.id);
    
    try {
      const newSuggestedName = await onRegenerate(item);
      
      setPreviewItems(prev => prev.map(prevItem => 
        prevItem.id === item.id 
          ? { 
              ...prevItem, 
              suggestedName: newSuggestedName,
              editedName: undefined,
              status: 'pending',
              isEditing: false
            }
          : prevItem
      ));
      
      toast({
        title: "Nome regenerado",
        description: "Um novo nome foi sugerido para o arquivo.",
      });
      
      logger.info('Nome regenerado com sucesso', {
        fileId: item.id,
        originalName: item.originalName,
        newSuggestedName
      });
    } catch (error) {
      toast({
        title: "Erro ao regenerar",
        description: "Não foi possível gerar um novo nome. Tente novamente.",
        variant: "destructive"
      });
      
      logger.error('Erro ao regenerar nome', {
        fileId: item.id,
        error
      });
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleApproveAll = () => {
    const approvedItems: PreviewItem[] = previewItems.map(item => ({
      ...item,
      status: (item.status === 'rejected' ? 'rejected' : 'approved') as PreviewItem['status'],
      isEditing: false
    }));
    
    setPreviewItems(approvedItems);
    onApprove(approvedItems.filter(item => item.status !== 'rejected'));
  };

  const handleApproveSelected = () => {
    const approvedItems = previewItems.filter(item => 
      item.status === 'approved' || item.status === 'edited'
    );
    
    if (approvedItems.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Aprove pelo menos um item antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    onApprove(approvedItems);
  };

  const getStatusIcon = (status: PreviewItem['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'edited': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'rejected': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: PreviewItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'edited': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PreviewItem['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'edited': return 'Editado';
      case 'rejected': return 'Rejeitado';
      default: return 'Desconhecido';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf': return '📄';
      case 'word': return '📝';
      case 'imagem': return '🖼️';
      default: return '📁';
    }
  };

  const approvedCount = previewItems.filter(item => 
    item.status === 'approved' || item.status === 'edited'
  ).length;
  const rejectedCount = previewItems.filter(item => item.status === 'rejected').length;
  const pendingCount = previewItems.filter(item => item.status === 'pending').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-primary">{previewItems.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-600">{approvedCount}</div>
            <div className="text-xs text-muted-foreground">Aprovados</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-600">{rejectedCount}</div>
            <div className="text-xs text-muted-foreground">Rejeitados</div>
          </div>
        </div>
        
        <Separator />
        
        {/* Lista de Itens */}
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-3">
            {previewItems.map((item) => {
              const finalName = item.editedName || item.suggestedName;
              
              return (
                <Card key={item.id} className="glass-panel border-primary/10">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Ícone e Info do Arquivo */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-muted/50 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">{getFileTypeIcon(item.fileType)}</span>
                        </div>
                      </div>
                      
                      {/* Conteúdo Principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.fileType}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getStatusColor(item.status)}`}
                          >
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{getStatusText(item.status)}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(item.fileSize)}
                          </span>
                        </div>
                        
                        {/* Nome Original */}
                        <div className="mb-2">
                          <Label className="text-xs text-muted-foreground">Nome Original:</Label>
                          <div className="text-sm font-mono bg-muted/30 px-2 py-1 rounded mt-1 truncate">
                            {item.originalName}
                          </div>
                        </div>
                        
                        {/* Nome Sugerido/Editado */}
                        <div className="mb-3">
                          <Label className="text-xs text-muted-foreground">
                            {item.editedName ? 'Nome Editado:' : 'Nome Sugerido:'}
                          </Label>
                          
                          {item.isEditing ? (
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={finalName}
                                onChange={(e) => handleNameChange(item.id, e.target.value)}
                                className="text-sm font-mono"
                                placeholder="Digite o nome do arquivo"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleEditToggle(item.id)}
                                className="flex-shrink-0"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-sm font-mono bg-primary/10 px-2 py-1 rounded flex-1 truncate">
                                {finalName}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditToggle(item.id)}
                                className="flex-shrink-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Ações */}
                      <div className="flex flex-col gap-2">
                        {item.status !== 'approved' && item.status !== 'edited' && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveItem(item.id)}
                            className="flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            Aprovar
                          </Button>
                        )}
                        
                        {item.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectItem(item.id)}
                            className="flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Rejeitar
                          </Button>
                        )}
                        
                        {onRegenerate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerateItem(item)}
                            disabled={isRegenerating === item.id}
                            className="flex items-center gap-1"
                          >
                            {isRegenerating === item.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Regenerar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
        
        <Separator />
        
        {/* Ações Finais */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {approvedCount > 0 && (
              <span>{approvedCount} arquivo(s) serão renomeado(s)</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            
            <Button 
              onClick={handleApproveAll}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Aprovar Todos
            </Button>
            
            <Button 
              onClick={handleApproveSelected}
              disabled={approvedCount === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Aplicar Selecionados ({approvedCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewDialog;