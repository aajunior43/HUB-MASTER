import React from 'react';

// Sistema de cache para otimização de performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5 minutos padrão
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Limpar cache se estiver cheio
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // Remover entradas expiradas
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));

    // Se ainda estiver cheio, remover as mais antigas
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: (this.cache.size / this.maxSize) * 100
    };
  }
}

// Cache específico para resultados de IA
class AIResultCache extends MemoryCache {
  constructor() {
    super(50, 30 * 60 * 1000); // 30 minutos para resultados de IA
  }

  generateKey(file: File, prompt: string, model: string): string {
    // Gerar chave baseada no conteúdo do arquivo e parâmetros
    const fileInfo = `${file.name}-${file.size}-${file.lastModified}`;
    const promptHash = this.simpleHash(prompt);
    return `ai-${fileInfo}-${model}-${promptHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Cache para validações de API
class APIValidationCache extends MemoryCache {
  constructor() {
    super(20, 10 * 60 * 1000); // 10 minutos para validações
  }

  generateKey(apiKey: string, model: string): string {
    // Usar apenas os últimos caracteres da API key para segurança
    const keyHash = this.simpleHash(apiKey.slice(-8));
    return `api-validation-${keyHash}-${model}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Cache para processamento de pastas
class FolderProcessingCache extends MemoryCache {
  constructor() {
    super(30, 15 * 60 * 1000); // 15 minutos para processamento de pastas
  }

  generateKey(files: File[]): string {
    // Gerar chave baseada nos arquivos da pasta
    const fileSignature = files
      .map(f => `${f.name}-${f.size}`)
      .sort()
      .join('|');
    return `folder-${this.simpleHash(fileSignature)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Instâncias globais dos caches
export const aiResultCache = new AIResultCache();
export const apiValidationCache = new APIValidationCache();
export const folderProcessingCache = new FolderProcessingCache();
export const generalCache = new MemoryCache();

// Hook para usar cache com React
export const useCache = <T>(key: string, fetcher: () => Promise<T>, ttl?: number) => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      // Verificar cache primeiro
      const cached = generalCache.get<T>(key);
      if (cached) {
        setData(cached);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();
        generalCache.set(key, result, ttl);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, ttl]);

  const invalidate = () => {
    generalCache.delete(key);
    setData(null);
  };

  return { data, loading, error, invalidate };
};

// Função para limpar todos os caches
export const clearAllCaches = () => {
  aiResultCache.clear();
  apiValidationCache.clear();
  folderProcessingCache.clear();
  generalCache.clear();
};

// Função para obter estatísticas de todos os caches
export const getCacheStats = () => {
  return {
    aiResults: aiResultCache.getStats(),
    apiValidation: apiValidationCache.getStats(),
    folderProcessing: folderProcessingCache.getStats(),
    general: generalCache.getStats()
  };
};

export default {
  aiResultCache,
  apiValidationCache,
  folderProcessingCache,
  generalCache,
  useCache,
  clearAllCaches,
  getCacheStats
};