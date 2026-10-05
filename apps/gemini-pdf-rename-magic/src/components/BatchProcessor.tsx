import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MinimalProgress, MinimalSpinner, ProcessingIndicator, BatchProgress } from '@/components/ui/minimal-progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Trash2, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Package,
  Clock,
  BarChart3,
  Eye,
  X
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';
import { historyService } from '@/services/historyService';
import { PreviewDialog, PreviewItem } from './PreviewDialog';
import JSZip from 'jszip';
import { logger } from '@/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BatchFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped';
  originalName: string;
  newName?: string;
  error?: string;
  progress?: number;
}

interface BatchProcessorProps {
  onFileProcess: (file: File) => Promise<string>;
  className?: string;
}

export const BatchProcessor = ({ onFileProcess, className }: BatchProcessorProps) => {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [concurrentProcessing, setConcurrentProcessing] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BatchFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      originalName: file.name,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Arquivos adicionados",
      description: `${acceptedFiles.length} arquivo(s) adicionado(s) à fila de processamento.`,
    });

    logger.info('Arquivos adicionados ao lote', {
      count: acceptedFiles.length,
      totalFiles: files.length + acceptedFiles.length
    });
  }, [files.length, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp']
    },
    multiple: true
  });

  const generatePreviews = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setCurrentFileIndex(0);
    setStartTime(new Date());
    
    const previews: PreviewItem[] = [];
    
    logger.info('Gerando previews para lote', {
      totalFiles: files.length
    });

    try {
      for (let i = 0; i < files.length; i++) {
        if (isPaused) break;
        
        const fileItem = files[i];
        setCurrentFileIndex(i);
        
        // Atualizar status para processando
        setFiles(prev => prev.map((f, index) => 
          index === i ? { ...f, status: 'processing' } : f
        ));
        
        try {
          const suggestedName = await onFileProcess(fileItem.file);
          
          previews.push({
            id: fileItem.id,
            file: fileItem.file,
            originalName: fileItem.originalName,
            suggestedName,
            status: 'pending',
            fileType: getFileType(fileItem.file),
            fileSize: fileItem.file.size
          });
          
          // Atualizar status para concluído
          setFiles(prev => prev.map((f, index) => 
            index === i ? { ...f, status: 'completed', newName: suggestedName } : f
          ));
        } catch (error) {
          logger.error('Erro ao gerar preview', {
            fileName: fileItem.originalName,
            error
          });
          
          // Atualizar status para erro
          setFiles(prev => prev.map((f, index) => 
            index === i ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            } : f
          ));
        }
      }
      
      if (previews.length > 0) {
        setPreviewItems(previews);
        setShowPreview(true);
      }
    } catch (error) {
      logger.error('Erro durante geração de previews', { error });
      toast({
        title: "Erro na geração de previews",
        description: "Ocorreu um erro durante a geração dos previews.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsPaused(false);
    }
  };

  const startBatchProcessing = async (approvedItems?: PreviewItem[]) => {
    const itemsToProcess = approvedItems || previewItems;
    if (itemsToProcess.length === 0) return;

    setIsProcessing(true);
    setIsPaused(false);
    setShowPreview(false);
    
    // Iniciar operação em lote no histórico
    const newBatchId = historyService.startBatchOperation(itemsToProcess.length);
    setBatchId(newBatchId);

    logger.info('Aplicando nomes aprovados', {
      batchId: newBatchId,
      totalFiles: itemsToProcess.length
    });

    try {
      // Registrar no histórico
      for (const item of itemsToProcess) {
        const finalName = item.editedName || item.suggestedName;
        
        historyService.addBatchEntry(newBatchId, {
          originalName: item.originalName,
          newName: finalName,
          fileType: item.fileType,
          fileSize: item.fileSize,
          action: 'rename'
        });
        
        // Atualizar arquivo na lista
        setFiles(prev => prev.map(f => 
          f.id === item.id ? { ...f, status: 'completed', newName: finalName } : f
        ));
      }
      
      historyService.finalizeBatchOperation(newBatchId);
      
      toast({
        title: "Processamento concluído",
        description: `${itemsToProcess.length} arquivo(s) processado(s) com sucesso.`,
      });
    } catch (error) {
      logger.error('Erro durante aplicação dos nomes', { error, batchId: newBatchId });
      toast({
        title: "Erro no processamento",
        description: "Ocorreu um erro durante a aplicação dos nomes.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsPaused(false);
    }
  };

  const processFilesSequentially = async () => {
    for (let i = 0; i < files.length; i++) {
      if (isPaused) {
        logger.info('Processamento pausado pelo usuário', { currentIndex: i });
        break;
      }

      setCurrentFileIndex(i);
      await processFile(i);
    }
  };

  const processFilesConcurrently = async () => {
    const chunks = [];
    for (let i = 0; i < files.length; i += concurrentProcessing) {
      chunks.push(files.slice(i, i + concurrentProcessing));
    }

    for (const chunk of chunks) {
      if (isPaused) break;
      
      const promises = chunk.map((_, index) => {
        const globalIndex = files.indexOf(chunk[index]);
        return processFile(globalIndex);
      });
      
      await Promise.allSettled(promises);
    }
  };

  const processFile = async (index: number) => {
    const fileItem = files[index];
    if (!fileItem || fileItem.status !== 'pending') return;

    // Atualizar status para processando
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'processing', progress: 0 } : f
    ));

    try {
      logger.info('Processando arquivo', {
        fileName: fileItem.originalName,
        index,
        batchId
      });

      // Simular progresso
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => 
          i === index && f.status === 'processing' 
            ? { ...f, progress: Math.min((f.progress || 0) + 10, 90) }
            : f
        ));
      }, 200);

      const newName = await onFileProcess(fileItem.file);
      
      clearInterval(progressInterval);

      // Registrar no histórico do lote
      if (batchId) {
        historyService.addBatchEntry(batchId, {
          originalName: fileItem.originalName,
          newName,
          fileType: getFileType(fileItem.file),
          fileSize: fileItem.file.size,
          action: 'rename'
        });
      }

      // Atualizar status para concluído
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'completed', 
          newName, 
          progress: 100 
        } : f
      ));

      logger.info('Arquivo processado com sucesso', {
        fileName: fileItem.originalName,
        newName,
        index
      });

    } catch (error) {
      logger.error('Erro ao processar arquivo', {
        fileName: fileItem.originalName,
        error,
        index
      });

      // Atualizar status para erro
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          progress: 0
        } : f
      ));
    }
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    logger.info('Processamento pausado pelo usuário');
  };

  const resumeProcessing = () => {
    setIsPaused(false);
    logger.info('Processamento retomado pelo usuário');
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setIsPaused(false);
    setCurrentFileIndex(0);
    
    // Resetar arquivos pendentes e em processamento
    setFiles(prev => prev.map(f => 
      f.status === 'processing' || f.status === 'pending'
        ? { ...f, status: 'skipped', progress: 0 }
        : f
    ));
    
    logger.info('Processamento interrompido pelo usuário');
    
    toast({
      title: "Processamento interrompido",
      description: "O processamento em lote foi interrompido.",
    });
  };

  const clearFiles = () => {
    setFiles([]);
    setCurrentFileIndex(0);
    setBatchId(null);
    setStartTime(null);
    
    toast({
      title: "Lista limpa",
      description: "Todos os arquivos foram removidos da lista.",
    });
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const downloadResults = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.newName);
    
    if (completedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo para download",
        description: "Não há arquivos processados para download.",
        variant: "destructive"
      });
      return;
    }

    try {
      const zip = new JSZip();
      
      for (const fileItem of completedFiles) {
        const fileExtension = fileItem.originalName.split('.').pop();
        const newFileName = `${fileItem.newName}.${fileExtension}`;
        zip.file(newFileName, fileItem.file);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arquivos-renomeados-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download iniciado",
        description: `${completedFiles.length} arquivo(s) baixado(s) com sucesso.`,
      });
    } catch (error) {
      logger.error('Erro ao gerar ZIP', { error });
      toast({
        title: "Erro no download",
        description: "Não foi possível gerar o arquivo ZIP.",
        variant: "destructive"
      });
    }
  };

  const getFileType = (file: File): string => {
    if (file.type === 'application/pdf') return 'PDF';
    if (file.type.includes('word')) return 'Word';
    if (file.type.startsWith('image/')) return 'Imagem';
    return 'Documento';
  };

  const getStatusIcon = (status: BatchFile['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing': return <MinimalSpinner size="sm" variant="default" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: BatchFile['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'skipped': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const overallProgress = files.length > 0 ? (completedCount / files.length) * 100 : 0;

  return (
    <Card className={`glass-panel border-primary/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Processamento em Lote
          {files.length > 0 && (
            <Badge variant="secondary">{files.length} arquivo(s)</Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Área de Upload */}
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive 
              ? 'Solte os arquivos aqui...' 
              : 'Arraste arquivos aqui ou clique para selecionar'
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Suporta: PDF, Word, Imagens
          </p>
        </div>

        {/* Controles de Processamento */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {!isProcessing ? (
              <>
                <Button onClick={generatePreviews} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Gerar Preview
                </Button>
                
                {previewItems.length > 0 && (
                  <Button 
                    onClick={() => setShowPreview(true)} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Ver Preview ({previewItems.length})
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                {!isPaused ? (
                  <Button onClick={pauseProcessing} variant="outline" className="flex items-center gap-2">
                    <Pause className="h-4 w-4" />
                    Pausar
                  </Button>
                ) : (
                  <Button onClick={resumeProcessing} className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Retomar
                  </Button>
                )}
                <Button onClick={stopProcessing} variant="destructive" className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Parar
                </Button>
              </div>
            )}
            
            {completedCount > 0 && (
              <Button onClick={downloadResults} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download ({completedCount})
              </Button>
            )}
            
            <Button onClick={clearFiles} variant="outline" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Limpar Lista
            </Button>
          </div>
        )}

        {/* Estatísticas */}
        {files.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">{processingCount}</div>
              <div className="text-xs text-muted-foreground">Processando</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-gray-600">{pendingCount}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-red-600">{errorCount}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>
        )}

        {/* Barra de Progresso Geral */}
        {isProcessing && (
          <div className="space-y-3">
            <BatchProgress
              total={files.length}
              completed={completedCount}
              processing={processingCount}
              errors={errorCount}
              showDetails={true}
            />
            {startTime && (
              <div className="text-xs text-muted-foreground text-center">
                Tempo decorrido: {formatDistanceToNow(startTime, { locale: ptBR })}
              </div>
            )}
          </div>
        )}

        {/* Lista de Arquivos */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Arquivos na Fila</h4>
              <Badge variant="outline">{files.length} arquivo(s)</Badge>
            </div>
            
            <ScrollArea className="h-64 w-full border rounded-md p-2">
              <div className="space-y-2">
                {files.map((fileItem, index) => (
                  <div key={fileItem.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                    <div className="flex-shrink-0">
                      {getStatusIcon(fileItem.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {fileItem.originalName}
                      </div>
                      {fileItem.newName && (
                        <div className="text-xs text-muted-foreground truncate">
                          → {fileItem.newName}
                        </div>
                      )}
                      {fileItem.error && (
                        <div className="text-xs text-red-600 truncate">
                          Erro: {fileItem.error}
                        </div>
                      )}
                      {fileItem.status === 'processing' && fileItem.progress !== undefined && (
                        <MinimalProgress 
                          value={fileItem.progress} 
                          size="xs" 
                          className="mt-1" 
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(fileItem.status)}`}
                      >
                        {fileItem.status === 'pending' && 'Pendente'}
                        {fileItem.status === 'processing' && 'Processando'}
                        {fileItem.status === 'completed' && 'Concluído'}
                        {fileItem.status === 'error' && 'Erro'}
                        {fileItem.status === 'skipped' && 'Ignorado'}
                      </Badge>
                      
                      {!isProcessing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(fileItem.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Configurações de Processamento */}
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span>Processamento Simultâneo:</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(num => (
                <Button
                  key={num}
                  size="sm"
                  variant={concurrentProcessing === num ? "default" : "outline"}
                  onClick={() => setConcurrentProcessing(num)}
                  disabled={isProcessing}
                  className="h-6 w-6 p-0 text-xs"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Preview Dialog */}
        <PreviewDialog
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          items={previewItems}
          onApprove={(approvedItems) => startBatchProcessing(approvedItems)}
          onRegenerate={async (item) => {
            const newName = await onFileProcess(item.file);
            return newName;
          }}
          title="Preview do Processamento em Lote"
          description="Revise os nomes sugeridos antes de aplicá-los aos arquivos"
        />
      </CardContent>
    </Card>
  );
};

export default BatchProcessor;