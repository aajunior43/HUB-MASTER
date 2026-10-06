import { logger } from '@/utils/logger';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  originalName: string;
  newName: string;
  fileType: string;
  fileSize: number;
  action: 'rename' | 'batch_rename';
  batchId?: string;
}

export interface BatchOperation {
  id: string;
  timestamp: Date;
  totalFiles: number;
  completedFiles: number;
  entries: HistoryEntry[];
}

class HistoryService {
  private static instance: HistoryService;
  private history: HistoryEntry[] = [];
  private batchOperations: BatchOperation[] = [];
  private maxHistorySize = 100;
  private storageKey = 'renamer_history';
  private batchStorageKey = 'renamer_batch_history';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  /**
   * Adiciona uma nova entrada ao histórico
   */
  addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
    const newEntry: HistoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.history.unshift(newEntry);
    
    // Manter apenas os últimos registros
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.saveToStorage();
    
    logger.info('Nova entrada adicionada ao histórico', {
      entryId: newEntry.id,
      originalName: newEntry.originalName,
      newName: newEntry.newName,
      action: newEntry.action
    });

    return newEntry;
  }

  /**
   * Inicia uma operação em lote
   */
  startBatchOperation(totalFiles: number): string {
    const batchId = this.generateId();
    const batchOperation: BatchOperation = {
      id: batchId,
      timestamp: new Date(),
      totalFiles,
      completedFiles: 0,
      entries: []
    };

    this.batchOperations.unshift(batchOperation);
    this.saveBatchToStorage();

    logger.info('Operação em lote iniciada', {
      batchId,
      totalFiles
    });

    return batchId;
  }

  /**
   * Adiciona uma entrada a uma operação em lote
   */
  addBatchEntry(batchId: string, entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'batchId'>): HistoryEntry {
    const batchOperation = this.batchOperations.find(b => b.id === batchId);
    if (!batchOperation) {
      throw new Error(`Operação em lote ${batchId} não encontrada`);
    }

    const newEntry = this.addEntry({
      ...entry,
      action: 'batch_rename',
      batchId
    });

    batchOperation.entries.push(newEntry);
    batchOperation.completedFiles++;
    
    this.saveBatchToStorage();

    return newEntry;
  }

  /**
   * Finaliza uma operação em lote
   */
  finalizeBatchOperation(batchId: string): BatchOperation | null {
    const batchOperation = this.batchOperations.find(b => b.id === batchId);
    if (!batchOperation) {
      return null;
    }

    logger.info('Operação em lote finalizada', {
      batchId,
      totalFiles: batchOperation.totalFiles,
      completedFiles: batchOperation.completedFiles
    });

    return batchOperation;
  }

  /**
   * Obtém o histórico completo
   */
  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Obtém o histórico de operações em lote
   */
  getBatchHistory(): BatchOperation[] {
    return [...this.batchOperations];
  }

  /**
   * Obtém uma entrada específica por ID
   */
  getEntry(id: string): HistoryEntry | null {
    return this.history.find(entry => entry.id === id) || null;
  }

  /**
   * Obtém uma operação em lote específica por ID
   */
  getBatchOperation(id: string): BatchOperation | null {
    return this.batchOperations.find(batch => batch.id === id) || null;
  }

  /**
   * Remove uma entrada do histórico
   */
  removeEntry(id: string): boolean {
    const index = this.history.findIndex(entry => entry.id === id);
    if (index === -1) {
      return false;
    }

    this.history.splice(index, 1);
    this.saveToStorage();

    logger.info('Entrada removida do histórico', { entryId: id });
    return true;
  }

  /**
   * Limpa todo o histórico
   */
  clearHistory(): void {
    this.history = [];
    this.batchOperations = [];
    this.saveToStorage();
    this.saveBatchToStorage();
    
    logger.info('Histórico limpo completamente');
  }

  /**
   * Obtém estatísticas do histórico
   */
  getStatistics() {
    const totalRenames = this.history.length;
    const batchRenames = this.history.filter(entry => entry.action === 'batch_rename').length;
    const singleRenames = totalRenames - batchRenames;
    const totalBatches = this.batchOperations.length;
    
    const fileTypes = this.history.reduce((acc, entry) => {
      acc[entry.fileType] = (acc[entry.fileType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageFileSize = this.history.length > 0 
      ? this.history.reduce((sum, entry) => sum + entry.fileSize, 0) / this.history.length
      : 0;

    return {
      totalRenames,
      singleRenames,
      batchRenames,
      totalBatches,
      fileTypes,
      averageFileSize: Math.round(averageFileSize),
      oldestEntry: this.history[this.history.length - 1]?.timestamp,
      newestEntry: this.history[0]?.timestamp
    };
  }

  /**
   * Exporta o histórico para JSON
   */
  exportHistory(): string {
    const exportData = {
      history: this.history,
      batchOperations: this.batchOperations,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importa histórico de JSON
   */
  importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.history && Array.isArray(data.history)) {
        this.history = data.history.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }

      if (data.batchOperations && Array.isArray(data.batchOperations)) {
        this.batchOperations = data.batchOperations.map(batch => ({
          ...batch,
          timestamp: new Date(batch.timestamp),
          entries: batch.entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }))
        }));
      }

      this.saveToStorage();
      this.saveBatchToStorage();
      
      logger.info('Histórico importado com sucesso', {
        entriesCount: this.history.length,
        batchesCount: this.batchOperations.length
      });

      return true;
    } catch (error) {
      logger.error('Erro ao importar histórico', { error });
      return false;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history));
    } catch (error) {
      logger.error('Erro ao salvar histórico no localStorage', { error });
    }
  }

  private saveBatchToStorage(): void {
    try {
      localStorage.setItem(this.batchStorageKey, JSON.stringify(this.batchOperations));
    } catch (error) {
      logger.error('Erro ao salvar histórico de lotes no localStorage', { error });
    }
  }

  private loadFromStorage(): void {
    try {
      const historyData = localStorage.getItem(this.storageKey);
      if (historyData) {
        this.history = JSON.parse(historyData).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }

      const batchData = localStorage.getItem(this.batchStorageKey);
      if (batchData) {
        this.batchOperations = JSON.parse(batchData).map((batch: any) => ({
          ...batch,
          timestamp: new Date(batch.timestamp),
          entries: batch.entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }))
        }));
      }
    } catch (error) {
      logger.error('Erro ao carregar histórico do localStorage', { error });
      this.history = [];
      this.batchOperations = [];
    }
  }
}

export const historyService = HistoryService.getInstance();
export default historyService;