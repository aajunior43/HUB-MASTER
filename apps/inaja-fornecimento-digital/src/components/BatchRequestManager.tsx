import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, FileText, Check, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseBatchFile, type BatchRequest, type ParseLineResult } from "@/lib/batchParser";
import { BATCH_TEMPLATE_TXT, BATCH_AI_INSTRUCTIONS_TXT } from "@/lib/batchTemplates";
import { downloadText } from "@/lib/downloadUtils";

interface BatchRequestManagerProps {
  onProcessBatch: (requests: BatchRequest[]) => void;
}

const getValidRequests = (results: ParseLineResult[]): BatchRequest[] =>
  results.filter(r => !r.error && r.data).map(r => r.data!);

export const BatchRequestManager = ({ onProcessBatch }: BatchRequestManagerProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationResults, setValidationResults] = useState<ParseLineResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    downloadText(BATCH_TEMPLATE_TXT, 'modelo_solicitacao_lote.txt');
    toast({ title: "Modelo baixado", description: "O arquivo modelo foi baixado com sucesso!" });
  };

  const handleDownloadAIInstructions = () => {
    downloadText(BATCH_AI_INSTRUCTIONS_TXT, 'instrucoes_IA_solicitacao_lote.txt');
    toast({
      title: "Instruções para IA baixadas",
      description: "O arquivo de instruções para IA foi baixado com sucesso!",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo .txt",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const content = await file.text();
      const results = parseBatchFile(content);
      setValidationResults(results);

      const validos = getValidRequests(results);
      const erros = results.filter(r => r.error).length;

      toast({
        title: erros > 0 ? "Arquivo processado com erros" : "Arquivo processado",
        description: erros > 0
          ? `${validos.length} solicitações válidas, ${erros} erros encontrados.`
          : `${validos.length} solicitações prontas para processar.`,
        variant: erros > 0 ? "destructive" : undefined,
      });
    } catch {
      toast({
        title: "Erro ao ler arquivo",
        description: "Não foi possível ler o arquivo selecionado.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProcessBatch = () => {
    const validRequests = getValidRequests(validationResults);
    if (validRequests.length === 0) {
      toast({
        title: "Nenhuma solicitação válida",
        description: "Não há solicitações válidas para processar.",
        variant: "destructive",
      });
      return;
    }

    onProcessBatch(validRequests);
    setValidationResults([]);
    toast({
      title: "Lote processado",
      description: `${validRequests.length} solicitações foram processadas com sucesso!`,
    });
  };

  const validCount = validationResults.filter(r => !r.error).length;
  const errorCount = validationResults.filter(r => r.error).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Solicitação em Lote
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="template-download">1. Baixar Modelo Manual</Label>
            <Button onClick={handleDownloadTemplate} variant="outline" className="w-full mt-2">
              <Download className="h-4 w-4 mr-2" />
              Modelo TXT
            </Button>
          </div>

          <div>
            <Label htmlFor="ai-instructions">1b. Baixar Instruções para IA</Label>
            <Button
              onClick={handleDownloadAIInstructions}
              variant="outline"
              className="w-full mt-2 border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
            >
              <Download className="h-4 w-4 mr-2" />
              Instruções IA
            </Button>
          </div>

          <div>
            <Label htmlFor="file-upload">2. Enviar Arquivo</Label>
            <div className="mt-2">
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>

        {validationResults.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusCard icon={<Check className="h-5 w-5 text-green-600" />} label="Válidas" value={validCount} tone="green" />
              <StatusCard icon={<X className="h-5 w-5 text-red-600" />} label="Erros" value={errorCount} tone="red" />
              <StatusCard icon={<FileText className="h-5 w-5 text-blue-600" />} label="Total" value={validationResults.length} tone="blue" />
            </div>

            {errorCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Erros encontrados:</div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {validationResults.filter(r => r.error).map((result, index) => (
                      <div key={index} className="text-sm">
                        <strong>Linha {result.line}:</strong> {result.error}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleProcessBatch} disabled={validCount === 0} className="flex-1">
                <Upload className="h-4 w-4 mr-2" />
                Processar {validCount} Solicitações
              </Button>
              <Button onClick={() => setValidationResults([])} variant="outline">
                Limpar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'green' | 'red' | 'blue';
}

const STATUS_TONES: Record<StatusCardProps['tone'], { bg: string; label: string; value: string }> = {
  green: { bg: 'bg-green-50 dark:bg-green-900/30', label: 'text-green-800 dark:text-green-300', value: 'text-green-600 dark:text-green-400' },
  red: { bg: 'bg-red-50 dark:bg-red-900/30', label: 'text-red-800 dark:text-red-300', value: 'text-red-600 dark:text-red-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', label: 'text-blue-800 dark:text-blue-300', value: 'text-blue-600 dark:text-blue-400' },
};

const StatusCard = ({ icon, label, value, tone }: StatusCardProps) => {
  const t = STATUS_TONES[tone];
  return (
    <div className={`text-center p-3 rounded-lg ${t.bg}`}>
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <div className={`text-sm font-medium ${t.label}`}>{label}</div>
      <div className={`text-2xl font-bold ${t.value}`}>{value}</div>
    </div>
  );
};
