
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Download, Save, Upload, Key, FileText, Sparkles, CheckCircle, AlertCircle, Loader2, Wifi } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { APIValidator } from '@/utils/apiValidator';
import { ErrorDisplay } from '@/components/ui/error-display';
import { AppError } from '@/types/errors';
import { logger } from '@/utils/logger';

interface APIKeyManagerProps {
  onApiKeyChange: (geminiKey: string) => void;
}

const APIKeyManager = ({ onApiKeyChange }: APIKeyManagerProps) => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: AppError;
    recommendedModel?: string;
    performance?: { responseTime: number; quotaRemaining?: number };
  } | null>(null);
  const geminiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
    
    setGeminiApiKey(savedGeminiKey);
    onApiKeyChange(savedGeminiKey);
  }, [onApiKeyChange]);

  const validateApiKey = async (apiKey: string) => {
    if (!apiKey.trim()) {
      setValidationResult(null);
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      logger.info('Iniciando validação de API key');
      const result = await APIValidator.validateAndOptimize(apiKey);
      
      setValidationResult(result);
      
      if (result.isValid) {
        toast({
          title: "✅ API Key Válida",
          description: `Conectividade confirmada${result.recommendedModel ? ` - Modelo recomendado: ${result.recommendedModel}` : ''}`,
        });
        
        if (result.performance) {
          logger.info('Validação de API bem-sucedida', {
            responseTime: result.performance.responseTime,
            quotaRemaining: result.performance.quotaRemaining,
            recommendedModel: result.recommendedModel
          });
        }
      } else {
        logger.error('Validação de API falhou', result.error);
      }
    } catch (error) {
      logger.error('Erro durante validação de API', error instanceof Error ? error : new Error(String(error)));
      
      setValidationResult({
        isValid: false,
        error: error instanceof AppError ? error : new AppError({
          type: 'UNKNOWN_ERROR' as any,
          message: error instanceof Error ? error.message : String(error),
          userMessage: 'Erro inesperado durante validação',
          retryable: true
        })
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "⚠️ Campo Obrigatório",
        description: "Por favor, insira uma chave API do Gemini",
        variant: "destructive"
      });
      return;
    }

    // Validação básica de formato
    if (!APIValidator.validateKeyFormat(geminiApiKey)) {
      toast({
        title: "⚠️ Formato Inválido",
        description: "A chave API do Gemini deve começar com 'AIza' e ter pelo menos 30 caracteres",
        variant: "destructive"
      });
      return;
    }

    // Testar conectividade antes de salvar
    await validateApiKey(geminiApiKey);
    
    if (validationResult?.isValid) {
      localStorage.setItem('gemini_api_key', geminiApiKey);
      onApiKeyChange(geminiApiKey);
      
      toast({
        title: "✅ Sucesso",
        description: "Chave API salva e validada com sucesso!"
      });
    }
  };

  const handleDownloadBackup = () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "⚠️ Erro",
        description: "Nenhuma chave API do Gemini para fazer backup",
        variant: "destructive"
      });
      return;
    }

    const blob = new Blob([geminiApiKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini_api_key_backup.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "💾 Backup criado",
      description: "Backup da chave API do Gemini baixado com sucesso!"
    });
  };

  const handleFileUpload = () => {
    geminiFileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      toast({
        title: "⚠️ Formato Inválido",
        description: "Por favor, selecione um arquivo .txt",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const trimmedContent = content.trim();
      
      if (trimmedContent) {
        setGeminiApiKey(trimmedContent);
        setValidationResult(null); // Reset validation
        
        toast({
          title: "📁 Arquivo Carregado",
          description: "Chave API do Gemini carregada do arquivo. Clique em 'Testar' para validar.",
        });
      } else {
        toast({
          title: "⚠️ Arquivo Vazio",
          description: "O arquivo selecionado está vazio",
          variant: "destructive"
        });
      }
    };

    reader.onerror = () => {
      logger.error('Erro ao ler arquivo de API key');
      toast({
        title: "⚠️ Erro de Leitura",
        description: "Erro ao ler o arquivo",
        variant: "destructive"
      });
    };

    reader.readAsText(file);
    
    // Reset the input
    if (geminiFileInputRef.current) {
      geminiFileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <Key className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="text-base font-medium">API Gemini</div>
          </div>
          {geminiApiKey && (
            <Badge 
              variant={geminiApiKey.length > 0 ? "default" : "secondary"} 
              className="text-xs"
            >
              {geminiApiKey.length > 0 ? 'Configurada' : 'Pendente'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-3">
          <div className="relative">
            <Input
              id="gemini-api-key"
              type={showGeminiKey ? "text" : "password"}
              placeholder="Cole sua chave API (AIzaSyC...)"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="pr-10 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 hover:bg-muted"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
            >
              {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200/30">
            <span>💡 Obtenha gratuitamente em: </span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              Google AI Studio
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => validateApiKey(geminiApiKey)}
            disabled={!geminiApiKey.trim() || isValidating}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            {isValidating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            {isValidating ? 'Testando...' : 'Testar'}
          </Button>
          
          <Button 
            onClick={handleSaveKeys}
            disabled={!validationResult?.isValid}
            size="sm"
            className="text-sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleFileUpload}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Carregar
          </Button>
          
          <Button 
            onClick={handleDownloadBackup}
            variant="outline"
            size="sm"
            className="text-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Backup
          </Button>
        </div>

        {/* Compact Status */}
        {validationResult && (
          <div className="mt-2">
            {validationResult.isValid ? (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
                <CheckCircle className="h-3 w-3" />
                <div className="text-xs">
                  <div className="font-medium">✅ Válida</div>
                  {validationResult.performance && (
                    <div className="opacity-80">{validationResult.performance.responseTime}ms</div>
                  )}
                </div>
              </div>
            ) : (
              validationResult.error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200">
                  <AlertCircle className="h-3 w-3" />
                  <div className="text-xs">
                    <div className="font-medium">❌ Erro</div>
                    <div className="opacity-80">{validationResult.error.userMessage}</div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Compact Security Notice */}
        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 p-2 rounded border border-green-200">
          <div className="flex items-center gap-1 mb-1">
            <span>🛡️</span>
            <span className="font-semibold">Seguro</span>
          </div>
          <div>Armazenado localmente no seu navegador</div>
        </div>
      </CardContent>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={geminiFileInputRef}
        onChange={handleFileChange}
        accept=".txt"
        style={{ display: 'none' }}
      />
    </Card>
  );
};

export default APIKeyManager;
