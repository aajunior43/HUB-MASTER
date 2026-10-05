import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Download, Loader2, CheckCircle, AlertCircle, X, Play, Archive, RefreshCw, Folder, FolderOpen } from 'lucide-react';
import { MinimalProgress, MinimalSpinner, ProcessingIndicator } from '@/components/ui/minimal-progress';
import { LoadingState, ProcessingState } from '@/components/ui/loading-states';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { AppError, ErrorType } from '@/types/errors';
import { logger } from '@/utils/logger';
import { FolderProcessor, ProcessedFile } from '@/utils/folderProcessor';


interface FileUploadProps {
  onFileProcess: (file: File) => Promise<string>;
  apiKey: string;
}

interface FileItem {
  file: File;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'retrying';
  newName?: string;
  error?: AppError;
  retryCount?: number;
  fallbackName?: string;
  relativePath?: string;
  folderName?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcess, apiKey }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [isProcessingFolders, setIsProcessingFolders] = useState(false);
  const [folderStats, setFolderStats] = useState<{
    summary: string;
    details: string[];
  } | null>(null);
  const { toast } = useToast();

  // Função para processar drop com suporte a pastas
  const handleDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[], event: any) => {
    logger.info('=== INÍCIO handleDrop ===', {
      acceptedFilesCount: acceptedFiles.length,
      acceptedFiles: acceptedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
      fileRejectionsCount: fileRejections.length,
      fileRejections: fileRejections.map(r => ({
        file: { name: r.file.name, type: r.file.type, size: r.file.size },
        errors: r.errors.map(e => ({ code: e.code, message: e.message }))
      })),
      hasEvent: !!event,
      hasDataTransfer: !!(event?.dataTransfer),
      hasDataTransferItems: !!(event?.dataTransfer?.items),
      dataTransferItemsLength: event?.dataTransfer?.items?.length || 0
    });
    
    setIsProcessingFolders(true);
    setFolderStats(null);
    
    try {
      let result;

      // Verificar se temos dataTransfer.items primeiro (para suporte a pastas)
      if (event?.dataTransfer?.items && event.dataTransfer.items.length > 0) {
        // Preferir DataTransferItemList para suportar pastas
        logger.info('Usando dataTransfer.items para processamento (suporte completo)', {
          itemsLength: event.dataTransfer.items.length
        });
        result = await FolderProcessor.processDroppedItems(event.dataTransfer.items);
      } else if (acceptedFiles && acceptedFiles.length > 0) {
        // Se não há items, usar acceptedFiles do dropzone
        logger.info('Usando acceptedFiles do dropzone para processamento', {
          acceptedFilesCount: acceptedFiles.length
        });
        result = await FolderProcessor.processFilesArray(acceptedFiles);
      } else if (event?.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        // Último recurso: dataTransfer.files
        logger.info('Usando dataTransfer.files para processamento (fallback)', {
          filesLength: event.dataTransfer.files.length
        });
        result = await FolderProcessor.processSelectedFiles(event.dataTransfer.files);
      } else {
        logger.warn('Nenhum arquivo detectado no evento de drop', {
          acceptedFilesCount: acceptedFiles?.length || 0,
          rejectedFilesCount: fileRejections?.length || 0,
          hasEvent: !!event,
          hasDataTransfer: !!(event?.dataTransfer),
          dataTransferItemsLength: event?.dataTransfer?.items?.length || 0,
          dataTransferFilesLength: event?.dataTransfer?.files?.length || 0
        });
        return; // sair cedo, nada a processar
      }

      logger.info('Resultado do processamento', {
        totalFiles: result.totalFiles,
        supportedFiles: result.supportedFiles,
        unsupportedFiles: result.unsupportedFiles,
        filesArray: result.files.map(f => ({ name: f.file.name, type: f.file.type, size: f.file.size }))
      });

      if (result.totalFiles === 0) {
        logger.warn('Processamento retornou 0 arquivos totais. Verificar MIME/Extensão e fluxo.', {
          acceptedFiles: acceptedFiles?.map(f => ({ name: f.name, type: f.type, size: f.size })) || [],
          hasDataTransferItems: !!(event?.dataTransfer?.items),
          hasDataTransferFiles: !!(event?.dataTransfer?.files)
        });
        toast({
          title: 'Nenhum arquivo suportado encontrado',
          description: 'Arraste PDFs, Word (.docx/.doc) ou imagens (JPEG, PNG, GIF, WEBP, HEIC/HEIF, TIFF).',
          variant: 'destructive'
        });
        return;
      }

      if (result.supportedFiles === 0) {
        logger.warn('Nenhum arquivo suportado encontrado, mas arquivos foram processados', {
          totalFiles: result.totalFiles,
          unsupportedFiles: result.unsupportedFiles,
          processedFiles: result.files.length
        });
        toast({
          title: 'Nenhum arquivo suportado',
          description: 'Os arquivos arrastados não são de tipos suportados (PDF, Word, imagens).',
          variant: 'destructive'
        });
        return;
      }

      // Converter ProcessedFile para FileItem
      const newFiles: FileItem[] = result.files.map(processedFile => {
        const fileItem = {
          file: processedFile.file,
          id: `${processedFile.file.name}-${Date.now()}-${Math.random()}`,
          status: 'pending' as const,
          relativePath: processedFile.relativePath,
          folderName: processedFile.folderName
        };

        logger.info('[CONVERSION] ProcessedFile -> FileItem', {
          fileName: processedFile.file.name,
          fileSize: processedFile.file.size,
          fileType: processedFile.file.type,
          fileItemId: fileItem.id,
          status: fileItem.status,
          relativePath: fileItem.relativePath,
          folderName: fileItem.folderName
        });

        return fileItem;
      });

      logger.info('[FILES_UPDATE] Atualizando lista de arquivos', {
        currentFilesCount: files.length,
        newFilesCount: newFiles.length,
        newFileNames: newFiles.map(f => f.file.name)
      });

      setFiles(prev => {
        const updated = [...prev, ...newFiles];
        logger.info('[FILES_UPDATE] Lista atualizada', {
          previousCount: prev.length,
          addedCount: newFiles.length,
          newTotalCount: updated.length,
          allFileNames: updated.map(f => f.file.name)
        });
        return updated;
      });
      
      // Gerar e exibir estatísticas
      const stats = FolderProcessor.generateProcessingStats(result);
      setFolderStats(stats);
      
      toast({
        title: 'Processamento concluído',
        description: stats.summary,
      });
      
      logger.info('Arquivos processados com sucesso', {
        totalProcessed: result.files.length,
        foldersProcessed: result.folders.length
      });
        
      } catch (error) {
        logger.error('Erro ao processar pastas/arquivos', error instanceof Error ? error : new Error(String(error)));
        
        toast({
          title: "Erro no processamento",
          description: "Erro ao processar pastas. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsProcessingFolders(false);
      }
    }, [toast]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    // Aceitar todos os tipos de arquivo para permitir detecção manual
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
      'image/tiff': ['.tiff', '.tif']
    },
    multiple: true,
    noClick: false,
    noKeyboard: false,
    // Adicionar logs para debug
    onDropAccepted: (files) => {
      logger.info('Arquivos aceitos pelo dropzone', {
        fileCount: files.length,
        files: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
      });
    },
    onDropRejected: (rejections) => {
      logger.warn('Arquivos rejeitados pelo dropzone', {
        rejectionCount: rejections.length,
        rejections: rejections.map(r => ({
          file: { name: r.file.name, type: r.file.type, size: r.file.size },
          errors: r.errors.map(e => ({ code: e.code, message: e.message }))
        }))
      });
    }
  });

  const generateFallbackName = (file: File): string => {
    const name = file.name || '';
    const lower = name.toLowerCase();
    let fileTypeLabel = 'DOCUMENTO';

    const isPDF = file.type === 'application/pdf' || /\.pdf$/.test(lower);
    const isWord = file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.(docx?|dotx?)$/.test(lower);
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp)$/i.test(lower);

    if (isPDF) fileTypeLabel = 'PDF';
    else if (isWord) fileTypeLabel = 'WORD';
    else if (isImage) fileTypeLabel = 'IMAGEM';

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${fileTypeLabel}_${timestamp}_${randomId}`;
  };

  const processFile = async (fileItem: FileItem, useAI: boolean = true) => {
    const currentRetryCount = fileItem.retryCount || 0;
    
    setFiles(prev => 
      prev.map(f => 
        f.id === fileItem.id 
          ? { 
              ...f, 
              status: useAI ? 'processing' : 'retrying',
              retryCount: currentRetryCount
            } 
          : f
      )
    );

    try {
      let newName: string;
      
      if (useAI) {
        logger.logFileUpload(fileItem.file.name, fileItem.file.size, fileItem.file.type);
        newName = await onFileProcess(fileItem.file);
      } else {
        // Fallback: usar nome baseado em padrões
        newName = fileItem.fallbackName || generateFallbackName(fileItem.file);
        logger.info('Usando nome fallback para arquivo', {
          fileName: fileItem.file.name,
          fallbackName: newName
        });
      }
      
      setFiles(prev => 
        prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'completed', newName, error: undefined } 
            : f
        )
      );

      toast({
        title: useAI ? "Arquivo renomeado com IA" : "Arquivo renomeado (modo fallback)",
        description: `Novo nome: ${newName}`,
        variant: "default"
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : new AppError({
        type: ErrorType.PROCESSING_FAILED,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        userMessage: 'Falha ao processar arquivo',
        retryable: true
      });
      
      logger.error('Erro ao processar arquivo', appError, {
        fileName: fileItem.file.name,
        useAI,
        retryCount: currentRetryCount
      });
      
      // Se for um erro retryable e ainda não tentamos o fallback
      if (useAI && appError.retryable && currentRetryCount < 2) {
        const fallbackName = generateFallbackName(fileItem.file);
        
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { 
                  ...f, 
                  status: 'error', 
                  error: appError,
                  retryCount: currentRetryCount + 1,
                  fallbackName
                } 
              : f
          )
        );

        toast({
          title: "Erro ao processar com IA",
          description: `${appError.userMessage}. Você pode tentar novamente ou usar modo fallback.`,
          variant: "destructive",
        });
      } else {
        setFiles(prev => 
          prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'error', error: appError } 
              : f
          )
        );

        toast({
          title: "Erro ao processar arquivo",
          description: appError.userMessage,
          variant: "destructive",
        });
      }
    }
  };

  const processAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    // Processar em lotes menores para melhor performance
    const batchSize = 3;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      
      // Processar lote em paralelo
      await Promise.all(
        batch.map(fileItem => processFile(fileItem, true))
      );
      
      // Pequena pausa entre lotes
      if (i + batchSize < pendingFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  };

  const downloadAllFiles = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.newName);
    
    if (completedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo para baixar",
        description: "Não há arquivos renomeados para download",
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingBatch(true);
    
    try {
      const zip = new JSZip();
      
      for (const fileItem of completedFiles) {
        const extension = fileItem.file.name.split('.').pop();
        const fileName = `${fileItem.newName}.${extension}`;
        zip.file(fileName, fileItem.file);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `arquivos_renomeados_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: `${completedFiles.length} arquivos baixados em ZIP`,
      });
    } catch (error) {
      logger.error('Erro ao criar ZIP', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: "Erro no download",
        description: "Não foi possível criar o arquivo ZIP",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  const downloadFile = (fileItem: FileItem) => {
    if (!fileItem.newName) return;

    const extension = fileItem.file.name.split('.').pop();
    const fileName = `${fileItem.newName}.${extension}`;
    
    const url = URL.createObjectURL(fileItem.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setFolderStats(null);
  };

  // Agrupar arquivos por pasta
  const groupedFiles = useMemo(() => {
    const groups = new Map<string, FileItem[]>();
    
    files.forEach(file => {
      const folderName = file.folderName || 'Arquivos Individuais';
      if (!groups.has(folderName)) {
        groups.set(folderName, []);
      }
      groups.get(folderName)!.push(file);
    });
    
    return groups;
  }, [files]);

  const [showGrouped, setShowGrouped] = useState(false);

  const retryFile = (fileItem: FileItem, useAI: boolean = true) => {
    processFile(fileItem, useAI);
  };

  const getStatusIcon = (status: FileItem['status']) => {
    switch (status) {
      case 'processing':
        return <MinimalSpinner size="sm" className="text-primary" />;
      case 'retrying':
        return <MinimalSpinner size="sm" className="border-t-warning" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: FileItem['status']) => {
    switch (status) {
      case 'processing':
        return 'text-primary';
      case 'retrying':
        return 'text-orange-500';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = (status: FileItem['status']) => {
    switch (status) {
      case 'processing':
        return 'Processando com IA...';
      case 'retrying':
        return 'Tentando novamente...';
      case 'completed':
        return 'Concluído';
      case 'error':
        return 'Erro';
      default:
        return 'Aguardando';
    }
  };

  const getStatusBadge = (status: FileItem['status']) => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>;
      case 'completed':
        return <Badge variant="outline">Concluído</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'processing').length;
  const completedCount = files.filter(f => f.status === 'completed').length;

  // Debug: Log do estado atual dos arquivos a cada render
  React.useEffect(() => {
    if (files.length > 0) {
      logger.info('[COMPONENT_STATE] Estado atual dos arquivos', {
        totalFiles: files.length,
        pendingCount,
        processingCount,
        completedCount,
        fileNames: files.map(f => f.file.name),
        fileStatuses: files.map(f => ({ name: f.file.name, status: f.status, id: f.id }))
      });
    }
  }, [files, pendingCount, processingCount, completedCount]);

  return (
    <div className="space-y-6">
      {!apiKey && (
        <Alert className="border-warning/30 bg-warning/5">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            Configure sua chave API antes de fazer upload dos arquivos.
          </AlertDescription>
        </Alert>
      )}

      {/* Minimalist Upload Area */}
      <Card className="minimal-card border-border/40 overflow-hidden">
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={`relative border border-dashed rounded-xl p-8 text-center transition-minimal cursor-pointer group ${
              isDragActive
                ? 'border-primary/60 bg-primary/5'
                : isProcessingFolders
                ? 'border-warning/60 bg-warning/5'
                : 'border-border/50 hover:border-border/70 hover:bg-muted/20'
            }`}
          >
            <input {...getInputProps()} disabled={!apiKey || isProcessingFolders} />
            
            <div className="space-y-4">
              <div className="mx-auto w-14 h-14 bg-muted/30 rounded-xl flex items-center justify-center border border-border/30">
                {isProcessingFolders ? (
                  <MinimalSpinner size="lg" className="border-t-warning" />
                ) : isDragActive ? (
                  <FolderOpen className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">
                  {isProcessingFolders
                    ? 'Processando arquivos...'
                    : isDragActive
                    ? 'Solte os arquivos aqui'
                    : 'Arraste arquivos ou clique para selecionar'
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isProcessingFolders
                    ? 'Analisando estrutura de pastas'
                    : 'Suporte para PDF, Word e imagens'
                  }
                </p>
                {!isProcessingFolders && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">PDF</span>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">Word</span>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">Imagens</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Estatísticas de Processamento de Pastas */}
      {folderStats && (
        <Card className="minimal-card border-success/30 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-success/30">
                <FolderOpen className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-success mb-2">
                  {folderStats.summary}
                </h4>
                <div className="space-y-1">
                  {folderStats.details.map((detail, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Minimalist Control Panel */}
      {files.length > 0 && (
        <Card className="minimal-card border-border/40">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-base font-medium text-foreground">{files.length}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="w-px h-8 bg-border/50"></div>
                <div className="text-center">
                  <div className="text-base font-medium text-warning">{pendingCount}</div>
                  <div className="text-xs text-muted-foreground">Pendente</div>
                </div>
                <div className="w-px h-8 bg-border/50"></div>
                <div className="text-center">
                  <div className="text-base font-medium text-success">{completedCount}</div>
                  <div className="text-xs text-muted-foreground">Concluído</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <Button
                    onClick={processAllFiles}
                    disabled={processingCount > 0}
                    size="sm"
                    className="minimal-button bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 h-8 px-3"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Processar
                  </Button>
                )}
                
                {completedCount > 0 && (
                  <Button
                    onClick={downloadAllFiles}
                    disabled={isDownloadingBatch}
                    size="sm"
                    className="minimal-button h-8 px-3"
                  >
                    {isDownloadingBatch ? (
                      <MinimalSpinner size="sm" className="mr-1" />
                    ) : (
                      <Archive className="h-3 w-3 mr-1" />
                    )}
                    {isDownloadingBatch ? 'Criando...' : 'Baixar ZIP'}
                  </Button>
                )}
                
                <Button
                  onClick={clearAllFiles}
                  size="sm"
                  className="minimal-button text-muted-foreground hover:text-destructive hover:border-destructive/30 h-8 px-3"
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Arquivos Melhorada */}
      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Arquivos</h3>
          {(() => { logger.info('[RENDER] Renderizando lista de arquivos', {
            filesCount: files.length,
            fileNames: files.map(f => f.file.name),
            filesStatus: files.map(f => ({ name: f.file.name, status: f.status }))
          }); return null; })()}
          
          {showGrouped && groupedFiles.size > 1 ? (
            // Visualização agrupada por pastas
            <div className="space-y-6">
              {Array.from(groupedFiles.entries()).map(([folderName, folderFiles]) => (
                <div key={folderName} className="space-y-3">
                  {/* Cabeçalho da pasta */}
                  <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
                    <div className="w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center border border-primary/30">
                      <Folder className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">{folderName}</h4>
                      <p className="text-xs text-muted-foreground">
                        {folderFiles.length} arquivos • {folderFiles.filter(f => f.status === 'completed').length} processados
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                      {folderFiles.filter(f => f.status === 'pending').length} pendentes
                    </span>
                  </div>
                  
                  {/* Arquivos da pasta */}
                  <div className="space-y-2 ml-6">
                    {folderFiles.map((fileItem, index) => (
                      <Card 
                        key={fileItem.id} 
                        className="minimal-card border-border/30 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {getStatusIcon(fileItem.status)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-foreground truncate text-sm">
                                    {fileItem.file.name}
                                  </h5>
                                  {getStatusBadge(fileItem.status)}
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{(fileItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                  <span className="capitalize">{fileItem.file.type.split('/')[1] || 'arquivo'}</span>
                                  <span className={getStatusColor(fileItem.status)}>
                                    {getStatusText(fileItem.status)}
                                  </span>
                                  {fileItem.newName && (
                                    <span className="text-green-600 font-medium">→ {fileItem.newName}</span>
                                  )}
                                </div>
                                
                                {fileItem.error && (
                                  <div className="mt-2">
                                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                                      <div className="font-medium mb-1">Erro: {fileItem.error.type}</div>
                                      <div>{fileItem.error.userMessage}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {fileItem.status === 'pending' && (
                                <Button
                                   onClick={() => processFile(fileItem, true)}
                                   size="sm"
                                   className="gradient-primary h-7 px-2"
                                 >
                                   <Play className="h-3 w-3" />
                                 </Button>
                              )}
                              
                              {fileItem.status === 'error' && fileItem.error?.retryable && (
                                <Button
                                  onClick={() => retryFile(fileItem, true)}
                                  size="sm"
                                  variant="outline"
                                  className="text-primary hover:bg-primary/10 h-7 px-2"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              )}
                              
                              {fileItem.status === 'completed' && fileItem.newName && (
                                 <Button
                                   onClick={() => downloadFile(fileItem)}
                                   size="sm"
                                   variant="secondary"
                                   className="h-7 px-2"
                                 >
                                   <Download className="h-3 w-3" />
                                 </Button>
                               )}
                              
                              <Button
                                onClick={() => removeFile(fileItem.id)}
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive h-7 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Visualização em lista simples
            <div className="space-y-3">
              {files.map((fileItem, index) => (
                <Card 
                  key={fileItem.id} 
                  className="minimal-card border-border/40 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted/20 rounded-lg flex items-center justify-center border border-border/30">
                        {getStatusIcon(fileItem.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-foreground truncate text-sm">
                                {fileItem.file.name}
                              </h4>
                              <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md flex-shrink-0">
                                {getStatusText(fileItem.status)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{(fileItem.file.size / 1024 / 1024).toFixed(1)} MB</span>
                              {fileItem.folderName && fileItem.folderName !== 'Root' && (
                                <span className="flex items-center gap-1">
                                  <Folder className="h-3 w-3" />
                                  {fileItem.folderName}
                                </span>
                              )}
                            </div>

                            {fileItem.relativePath && fileItem.relativePath !== fileItem.file.name && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <FolderOpen className="h-3 w-3" />
                                Caminho: {fileItem.relativePath}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {fileItem.status === 'pending' && (
                               <Button
                                 size="sm"
                                 onClick={() => processFile(fileItem, true)}
                                 disabled={processingCount > 0}
                                 className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                               >
                                 <Play className="h-4 w-4 mr-1" />
                                 Renomear
                               </Button>
                             )}

                            {fileItem.status === 'error' && fileItem.error?.retryable && (
                              <Button
                                onClick={() => retryFile(fileItem, true)}
                                size="sm"
                                variant="outline"
                                className="text-warning hover:bg-warning/10 border-warning/30 h-8 px-3"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Tentar Novamente
                              </Button>
                            )}

                            {fileItem.status === 'completed' && fileItem.newName && (
                              <Button
                                size="sm"
                                onClick={() => downloadFile(fileItem)}
                                variant="secondary"
                                className="h-8 px-3"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Baixar
                              </Button>
                            )}

                            <Button
                              size="sm"
                              onClick={() => removeFile(fileItem.id)}
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive h-8 px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {fileItem.newName && (
                          <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">→</span>
                              <code className="font-mono text-success font-medium">
                                {fileItem.newName}.{fileItem.file.name.split('.').pop()}
                              </code>
                            </div>
                          </div>
                        )}
                        
                        {fileItem.error && (
                          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                            <div className="text-sm text-destructive">
                              {fileItem.error.userMessage}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado Vazio Minimalista */}
      {files.length === 0 && apiKey && (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 bg-muted/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-border/30">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Pronto para processar
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Seus documentos serão renomeados automaticamente usando inteligência artificial
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
