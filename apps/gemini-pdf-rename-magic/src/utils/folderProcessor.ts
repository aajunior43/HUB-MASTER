import { logger } from './logger';

export interface ProcessedFile {
  file: File;
  relativePath: string;
  folderName: string;
}

export interface FolderProcessingResult {
  files: ProcessedFile[];
  totalFiles: number;
  supportedFiles: number;
  unsupportedFiles: number;
  folders: string[];
}

export class FolderProcessor {
  private static readonly SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/tiff'
  ];

  private static readonly SUPPORTED_EXTENSIONS = [
    '.pdf',
    '.docx',
    '.doc',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.heic',
    '.heif',
    '.tiff',
    '.tif'
  ];

  /**
   * Processa arquivos de entrada, incluindo pastas
   */
  static async processDroppedItems(items: DataTransferItemList): Promise<FolderProcessingResult> {
    const result: FolderProcessingResult = {
      files: [],
      totalFiles: 0,
      supportedFiles: 0,
      unsupportedFiles: 0,
      folders: []
    };

    const seen = new Set<string>();

    logger.info('Iniciando processamento de itens arrastados', {
      itemCount: items.length
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      logger.debug('Processando item', {
        index: i,
        kind: item.kind,
        type: item.type
      });
      
      if (item.kind === 'file') {
        try {
          // Primeiro, tente obter o arquivo diretamente. Para pastas, isso retornará null.
          const file = item.getAsFile();
          
          logger.debug('Resultado getAsFile', {
            hasFile: !!file,
            fileName: file?.name,
            fileType: file?.type,
            fileSize: file?.size
          });

          // Tente acessar webkitGetAsEntry de forma segura (nem todos os navegadores suportam)
          const webkitGetAsEntry = (item as unknown as { webkitGetAsEntry?: () => FileSystemEntry }).webkitGetAsEntry?.bind(item);
          const entry: FileSystemEntry | null = typeof webkitGetAsEntry === 'function' ? webkitGetAsEntry() : null;

          logger.debug('Resultado webkitGetAsEntry', {
            hasEntry: !!entry,
            entryName: entry?.name,
            isFile: entry ? (entry as FileSystemFileEntry).isFile : null,
            isDirectory: entry ? (entry as FileSystemDirectoryEntry).isDirectory : null
          });

          if (file) {
            // Se obtivemos um arquivo, tratamos como arquivo independente do que o entry reporta
            const sig = this.computeSignature(file);
            if (seen.has(sig)) {
              logger.debug('Arquivo duplicado ignorado (drop items via getAsFile)', {
                fileName: file.name,
                fileSize: file.size,
                lastModified: file.lastModified
              });
            } else {
              seen.add(sig);
              logger.info('Processando arquivo via getAsFile', {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size
              });
              await this.processFile(file, '', result);
            }
            continue;
          }

          if (entry) {
            if ((entry as FileSystemFileEntry).isFile) {
              // Arquivo individual (fallback)
              logger.info('Processando arquivo via entry (fallback)', {
                entryName: entry.name
              });
              const fileFromEntry = await this.getFileFromEntry(entry as FileSystemFileEntry);
              if (fileFromEntry) {
                const sig = this.computeSignature(fileFromEntry);
                if (seen.has(sig)) {
                  logger.debug('Arquivo duplicado ignorado (drop items via entry)', {
                    fileName: fileFromEntry.name,
                    fileSize: fileFromEntry.size,
                    lastModified: fileFromEntry.lastModified
                  });
                } else {
                  seen.add(sig);
                  await this.processFile(fileFromEntry, '', result);
                }
              }
            } else if ((entry as FileSystemDirectoryEntry).isDirectory) {
              // Pasta
              logger.info('Processando pasta', {
                folderName: entry.name
              });
              result.folders.push((entry as FileSystemDirectoryEntry).name);
              await this.processDirectory(entry as FileSystemDirectoryEntry, (entry as FileSystemDirectoryEntry).name, result);
            }
          } else {
            logger.warn('Item sem arquivo e sem entry válido', {
              itemKind: item.kind,
              itemType: item.type
            });
          }
        } catch (error) {
          logger.error('Erro ao processar item individual', error instanceof Error ? error : new Error(String(error)), {
            itemIndex: i,
            itemKind: item.kind,
            itemType: item.type
          });
        }
      }
    }

    logger.info('Processamento de itens concluído', {
      totalFiles: result.totalFiles,
      supportedFiles: result.supportedFiles,
      unsupportedFiles: result.unsupportedFiles,
      folders: result.folders.length
    });

    return result;
  }

  /**
   * Processa uma pasta recursivamente
   */
  private static async processDirectory(
    directoryEntry: FileSystemDirectoryEntry,
    folderPath: string,
    result: FolderProcessingResult
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = directoryEntry.createReader();
      
      const readEntries = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            resolve();
            return;
          }

          try {
            for (const entry of entries) {
              const currentPath = folderPath ? `${folderPath}/${entry.name}` : entry.name;
              
              if (entry.isFile) {
                const file = await this.getFileFromEntry(entry as FileSystemFileEntry);
                if (file) {
                  await this.processFile(file, folderPath, result);
                }
              } else if (entry.isDirectory) {
                result.folders.push(currentPath);
                await this.processDirectory(entry as FileSystemDirectoryEntry, currentPath, result);
              }
            }
            
            // Continue lendo se houver mais entradas
            readEntries();
          } catch (error) {
            logger.error('Erro ao processar entradas da pasta', error instanceof Error ? error : new Error(String(error)));
            reject(error);
          }
        }, (error) => {
          logger.error('Erro ao ler pasta', error);
          reject(error);
        });
      };
      
      readEntries();
    });
  }

  /**
   * Converte FileSystemFileEntry em File
   */
  private static async getFileFromEntry(fileEntry: FileSystemFileEntry): Promise<File | null> {
    return new Promise((resolve) => {
      fileEntry.file((file) => {
        resolve(file);
      }, (error) => {
        logger.error('Erro ao obter arquivo da entrada', error);
        resolve(null);
      });
    });
  }

  // Gera uma assinatura estável para deduplicação de arquivos
  private static computeSignature(file: File): string {
    return `${file.name}::${file.size}::${file.lastModified}`;
  }

  /**
   * Processa um arquivo individual
   */
  private static async processFile(
    file: File,
    folderPath: string,
    result: FolderProcessingResult
  ): Promise<void> {
    logger.info('[PROCESS_FILE] Processando arquivo', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      folderPath,
      currentTotalFiles: result.totalFiles
    });

    result.totalFiles++;

    const isSupported = this.isSupportedFile(file);

    if (isSupported) {
      result.supportedFiles++;
      const processedFile = {
        file,
        relativePath: folderPath ? `${folderPath}/${file.name}` : file.name,
        folderName: folderPath || 'Root'
      };
      result.files.push(processedFile);

      logger.info('[PROCESS_FILE] ✅ Arquivo ADICIONADO à lista', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folderPath,
        relativePath: processedFile.relativePath,
        folderName: processedFile.folderName,
        totalFilesNow: result.totalFiles,
        supportedFilesNow: result.supportedFiles,
        filesArrayLength: result.files.length
      });
    } else {
      result.unsupportedFiles++;

      logger.warn('[PROCESS_FILE] ❌ Arquivo NÃO ADICIONADO (não suportado)', {
        fileName: file.name,
        fileType: file.type,
        folderPath,
        totalFilesNow: result.totalFiles,
        unsupportedFilesNow: result.unsupportedFiles
      });
    }
  }

  /**
   * Verifica se o arquivo é suportado
   */
  private static isSupportedFile(file: File): boolean {
    logger.info('[FILE_SUPPORT] Verificando suporte do arquivo', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });

    // Verificar por extensão primeiro (mais confiável para PDFs arrastados)
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop() || '';
    const extensionWithDot = '.' + fileExtension;

    const extensionSupported = this.SUPPORTED_EXTENSIONS.includes(extensionWithDot);

    logger.info('[FILE_SUPPORT] Verificação por extensão', {
      fileName,
      fileExtension,
      extensionWithDot,
      extensionSupported,
      supportedExtensions: this.SUPPORTED_EXTENSIONS
    });

    if (extensionSupported) {
      logger.info('[FILE_SUPPORT] ✅ Arquivo APROVADO por extensão', {
        fileName: file.name,
        extension: extensionWithDot
      });
      return true;
    }

    // Verificar por tipo MIME (fallback)
    const mimeSupported = this.SUPPORTED_TYPES.includes(file.type);
    logger.info('[FILE_SUPPORT] Verificação por MIME type', {
      fileType: file.type,
      mimeSupported,
      supportedTypes: this.SUPPORTED_TYPES
    });

    if (mimeSupported) {
      logger.info('[FILE_SUPPORT] ✅ Arquivo APROVADO por MIME type', {
        fileName: file.name,
        fileType: file.type
      });
      return true;
    }

    // Se chegou até aqui, não é suportado
    logger.warn('[FILE_SUPPORT] ❌ Arquivo REJEITADO', {
      fileName: file.name,
      fileType: file.type,
      detectedExtension: fileExtension,
      extensionWithDot,
      reason: 'Nem extensão nem MIME type são suportados',
      supportedExtensions: this.SUPPORTED_EXTENSIONS,
      supportedTypes: this.SUPPORTED_TYPES
    });

    return false;
  }

  /**
   * Processa arquivos selecionados via input file (fallback)
   */
  static async processSelectedFiles(fileList: FileList): Promise<FolderProcessingResult> {
    const result: FolderProcessingResult = {
      files: [],
      totalFiles: 0,
      supportedFiles: 0,
      unsupportedFiles: 0,
      folders: []
    };

    logger.info('Processando arquivos selecionados', {
      fileCount: fileList.length
    });

    const seen = new Set<string>();

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const sig = this.computeSignature(file);
      if (seen.has(sig)) {
        logger.debug('Arquivo duplicado ignorado (selected files)', {
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified
        });
        continue;
      }
      seen.add(sig);
      await this.processFile(file, '', result);
    }

    return result;
  }

  /**
   * Agrupa arquivos por pasta
   */
  static async processFilesArray(files: File[]): Promise<FolderProcessingResult> {
    const result: FolderProcessingResult = {
      files: [],
      totalFiles: 0,
      supportedFiles: 0,
      unsupportedFiles: 0,
      folders: []
    };

    logger.info('Processando array de arquivos', {
      fileCount: files.length,
      files: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
    });

    const seen = new Set<string>();

    for (const file of files) {
      const sig = this.computeSignature(file);
      if (seen.has(sig)) {
        logger.debug('Arquivo duplicado ignorado (files array)', {
          fileName: file.name,
          fileSize: file.size,
          lastModified: file.lastModified
        });
        continue;
      }
      seen.add(sig);
      await this.processFile(file, '', result);
    }

    logger.info('Processamento de array concluído', {
      totalFiles: result.totalFiles,
      supportedFiles: result.supportedFiles,
      unsupportedFiles: result.unsupportedFiles
    });

    return result;
  }

  /**
   * Agrupa arquivos por pasta
   */
  static groupFilesByFolder(processedFiles: ProcessedFile[]): Map<string, ProcessedFile[]> {
    const grouped = new Map<string, ProcessedFile[]>();
    
    processedFiles.forEach(processedFile => {
      const folderName = processedFile.folderName;
      
      if (!grouped.has(folderName)) {
        grouped.set(folderName, []);
      }
      
      grouped.get(folderName)!.push(processedFile);
    });
    
    return grouped;
  }

  /**
   * Gera estatísticas do processamento
   */
  static generateProcessingStats(result: FolderProcessingResult): {
    summary: string;
    details: string[];
  } {
    const { totalFiles, supportedFiles, unsupportedFiles, folders } = result;
    
    const summary = `${supportedFiles} arquivos suportados de ${totalFiles} total`;
    
    const details = [
      `📁 ${folders.length} pasta(s) processada(s)`,
      `✅ ${supportedFiles} arquivo(s) suportado(s)`,
      `❌ ${unsupportedFiles} arquivo(s) não suportado(s)`,
      `📄 Tipos suportados: PDF, Word, Imagens (JPEG, PNG, GIF, WEBP, HEIC/HEIF, TIFF)`
    ];
    
    if (folders.length > 0) {
      details.push(`📂 Pastas: ${folders.slice(0, 3).join(', ')}${folders.length > 3 ? '...' : ''}`);
    }
    
    return { summary, details };
  }
}

export default FolderProcessor;