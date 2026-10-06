import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  Download, 
  Upload, 
  Trash2, 
  FileText, 
  Calendar,
  BarChart3,
  Package,
  Clock,
  File
} from 'lucide-react';
import { historyService, HistoryEntry, BatchOperation } from '@/services/historyService';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryPanelProps {
  className?: string;
}

export const HistoryPanel = ({ className }: HistoryPanelProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [batchHistory, setBatchHistory] = useState<BatchOperation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setHistory(historyService.getHistory());
    setBatchHistory(historyService.getBatchHistory());
  };

  const handleClearHistory = () => {
    historyService.clearHistory();
    loadHistory();
    toast({
      title: "Histórico limpo",
      description: "Todo o histórico foi removido com sucesso.",
    });
  };

  const handleExportHistory = () => {
    try {
      const exportData = historyService.exportHistory();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historico-renomeacao-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Histórico exportado",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar o histórico.",
        variant: "destructive"
      });
    }
  };

  const handleImportHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = historyService.importHistory(content);
        
        if (success) {
          loadHistory();
          toast({
            title: "Histórico importado",
            description: "O histórico foi importado com sucesso.",
          });
        } else {
          throw new Error('Falha na importação');
        }
      } catch (error) {
        toast({
          title: "Erro ao importar",
          description: "Arquivo inválido ou corrompido.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
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
      case 'pdf':
        return '📄';
      case 'word':
        return '📝';
      case 'imagem':
        return '🖼️';
      default:
        return '📁';
    }
  };

  const statistics = historyService.getStatistics();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`glass-panel border-primary/20 hover:border-primary/40 transition-all duration-300 ${className}`}
        >
          <History className="h-4 w-4 mr-2" />
          Histórico
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {history.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Renomeações
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recent">Recentes</TabsTrigger>
            <TabsTrigger value="batches">Lotes</TabsTrigger>
            <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
            <TabsTrigger value="manage">Gerenciar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Renomeações Recentes</h3>
              <Badge variant="outline">{history.length} operações</Badge>
            </div>
            
            <ScrollArea className="h-[400px] w-full">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma renomeação realizada ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <Card key={entry.id} className="glass-panel border-primary/10">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getFileTypeIcon(entry.fileType)}</span>
                              <Badge variant={entry.action === 'batch_rename' ? 'secondary' : 'default'} className="text-xs">
                                {entry.action === 'batch_rename' ? 'Lote' : 'Individual'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(entry.fileSize)}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-muted-foreground">De:</span>
                                <span className="ml-2 font-mono text-xs bg-muted px-2 py-1 rounded">
                                  {entry.originalName}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Para:</span>
                                <span className="ml-2 font-mono text-xs bg-primary/10 px-2 py-1 rounded">
                                  {entry.newName}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right text-xs text-muted-foreground">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(entry.timestamp, { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {entry.timestamp.toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="batches" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Operações em Lote</h3>
              <Badge variant="outline">{batchHistory.length} lotes</Badge>
            </div>
            
            <ScrollArea className="h-[400px] w-full">
              {batchHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma operação em lote realizada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batchHistory.map((batch) => (
                    <Card key={batch.id} className="glass-panel border-primary/10">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span className="font-semibold">Lote #{batch.id.slice(-8)}</span>
                          </div>
                          <Badge variant="secondary">
                            {batch.completedFiles}/{batch.totalFiles} arquivos
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-2">
                          {formatDistanceToNow(batch.timestamp, { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                        
                        <div className="space-y-1">
                          {batch.entries.slice(0, 3).map((entry) => (
                            <div key={entry.id} className="text-xs bg-muted/50 p-2 rounded">
                              <span className="font-mono">{entry.originalName}</span>
                              <span className="mx-2">→</span>
                              <span className="font-mono text-primary">{entry.newName}</span>
                            </div>
                          ))}
                          {batch.entries.length > 3 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +{batch.entries.length - 3} arquivos...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="statistics" className="space-y-4">
            <h3 className="text-lg font-semibold">Estatísticas de Uso</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalRenames}</div>
                  <div className="text-sm text-muted-foreground">Total de Renomeações</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">{statistics.singleRenames}</div>
                  <div className="text-sm text-muted-foreground">Individuais</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">{statistics.batchRenames}</div>
                  <div className="text-sm text-muted-foreground">Em Lote</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-500">{statistics.totalBatches}</div>
                  <div className="text-sm text-muted-foreground">Lotes Processados</div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Tipos de Arquivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(statistics.fileTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getFileTypeIcon(type)}</span>
                        <span className="text-sm">{type}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {statistics.averageFileSize > 0 && (
              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{formatFileSize(statistics.averageFileSize)}</div>
                    <div className="text-sm text-muted-foreground">Tamanho Médio dos Arquivos</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4">
            <h3 className="text-lg font-semibold">Gerenciar Histórico</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={handleExportHistory}
                variant="outline"
                className="flex items-center gap-2"
                disabled={history.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar Histórico
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportHistory}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-history"
                />
                <Button 
                  variant="outline"
                  className="w-full flex items-center gap-2"
                  asChild
                >
                  <label htmlFor="import-history" className="cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Importar Histórico
                  </label>
                </Button>
              </div>
              
              <Button 
                onClick={handleClearHistory}
                variant="destructive"
                className="flex items-center gap-2"
                disabled={history.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Limpar Histórico
              </Button>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Exportar:</strong> Salva todo o histórico em um arquivo JSON para backup.</p>
              <p><strong>Importar:</strong> Carrega um histórico previamente exportado.</p>
              <p><strong>Limpar:</strong> Remove permanentemente todo o histórico local.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryPanel;