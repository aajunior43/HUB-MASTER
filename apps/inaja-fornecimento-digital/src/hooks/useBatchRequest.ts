import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import type { BatchRequestInput, BatchRequestItem } from "@/lib/batchParser";

export type { BatchRequestItem, BatchRequestInput };

/** Solicitação após processar o lote (com id e totais). */
export interface ProcessedBatchRequest extends BatchRequestInput {
  id: string;
  dataSolicitacao: string;
  valorTotal: number;
  processedAt: string;
}

/** @deprecated use ProcessedBatchRequest */
export type BatchRequest = ProcessedBatchRequest;

export const useBatchRequest = () => {
  const [processedRequests, setProcessedRequests] = useState<ProcessedBatchRequest[]>([]);

  const processBatchRequests = useCallback((requests: BatchRequestInput[]) => {
    const now = new Date();
    const dataSolicitacao = now.toLocaleDateString('pt-BR');
    
    const processedBatch = requests.map((request, index) => {
      const valorTotal = request.items.reduce((total, item) => 
        total + (item.quantidade * item.valorUnitario), 0
      );

      return {
        id: `batch_${now.getTime()}_${index}`,
        ...request,
        dataSolicitacao,
        valorTotal,
        processedAt: now.toISOString()
      };
    });

    setProcessedRequests(prev => [...prev, ...processedBatch]);

    toast({
      title: "Lote processado com sucesso",
      description: `${processedBatch.length} solicitações foram criadas.`,
    });

    return processedBatch;
  }, []);

  const exportBatchToJSON = useCallback(() => {
    if (processedRequests.length === 0) {
      toast({
        title: "Nenhuma solicitação para exportar",
        description: "Processe um lote primeiro.",
        variant: "destructive",
      });
      return;
    }

    const exportData = {
      requests: processedRequests,
      exportedAt: new Date().toISOString(),
      totalRequests: processedRequests.length,
      totalValue: processedRequests.reduce((sum, req) => sum + req.valorTotal, 0)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solicitacoes_lote_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Lote exportado",
      description: "As solicitações foram exportadas para JSON.",
    });
  }, [processedRequests]);

  const clearProcessedRequests = useCallback(() => {
    setProcessedRequests([]);
    toast({
      title: "Lote limpo",
      description: "Todas as solicitações processadas foram removidas.",
    });
  }, []);

  const getRequestSummary = useCallback(() => {
    const totalRequests = processedRequests.length;
    const totalValue = processedRequests.reduce((sum, req) => sum + req.valorTotal, 0);
    const uniqueSolicitantes = new Set(processedRequests.map(req => req.solicitante)).size;
    const uniqueEmpresas = new Set(processedRequests.map(req => req.empresa)).size;

    return {
      totalRequests,
      totalValue,
      uniqueSolicitantes,
      uniqueEmpresas
    };
  }, [processedRequests]);

  return {
    processedRequests,
    processBatchRequests,
    exportBatchToJSON,
    clearProcessedRequests,
    getRequestSummary
  };
};