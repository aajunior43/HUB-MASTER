import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  RefreshCw, 
  Wifi, 
  Key, 
  FileX, 
  Zap, 
  Clock,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AppError, ErrorType } from '@/types/errors';
import { useState } from 'react';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

const getErrorIcon = (errorType: ErrorType) => {
  switch (errorType) {
    case ErrorType.API_NETWORK_ERROR:
    case ErrorType.API_TIMEOUT:
      return Wifi;
    case ErrorType.API_KEY_INVALID:
    case ErrorType.API_UNAUTHORIZED:
      return Key;
    case ErrorType.API_RATE_LIMIT:
    case ErrorType.API_QUOTA_EXCEEDED:
      return Clock;
    case ErrorType.API_SERVICE_UNAVAILABLE:
      return Shield;
    case ErrorType.FILE_TOO_LARGE:
    case ErrorType.FILE_INVALID_FORMAT:
    case ErrorType.FILE_CORRUPTED:
    case ErrorType.FILE_EMPTY:
    case ErrorType.FILE_READ_ERROR:
      return FileX;
    case ErrorType.PROCESSING_FAILED:
    case ErrorType.ANALYSIS_FAILED:
    case ErrorType.NAME_GENERATION_FAILED:
      return Zap;
    default:
      return HelpCircle;
  }
};

const getErrorColor = (errorType: ErrorType) => {
  switch (errorType) {
    case ErrorType.API_NETWORK_ERROR:
    case ErrorType.API_TIMEOUT:
    case ErrorType.API_SERVICE_UNAVAILABLE:
      return 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200';
    case ErrorType.API_KEY_INVALID:
    case ErrorType.API_UNAUTHORIZED:
      return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200';
    case ErrorType.API_RATE_LIMIT:
    case ErrorType.API_QUOTA_EXCEEDED:
      return 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200';
    case ErrorType.FILE_TOO_LARGE:
    case ErrorType.FILE_INVALID_FORMAT:
    case ErrorType.FILE_CORRUPTED:
    case ErrorType.FILE_EMPTY:
    case ErrorType.FILE_READ_ERROR:
      return 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-200';
    default:
      return 'border-destructive/20 bg-destructive/5 text-destructive';
  }
};

const getErrorSeverity = (errorType: ErrorType): 'low' | 'medium' | 'high' | 'critical' => {
  switch (errorType) {
    case ErrorType.API_KEY_INVALID:
    case ErrorType.API_UNAUTHORIZED:
    case ErrorType.FILE_CORRUPTED:
      return 'critical';
    case ErrorType.API_QUOTA_EXCEEDED:
    case ErrorType.FILE_TOO_LARGE:
    case ErrorType.FILE_INVALID_FORMAT:
      return 'high';
    case ErrorType.API_RATE_LIMIT:
    case ErrorType.API_TIMEOUT:
    case ErrorType.PROCESSING_FAILED:
      return 'medium';
    default:
      return 'low';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-500 text-white';
    case 'high':
      return 'bg-orange-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-blue-500 text-white';
  }
};

const getRetryText = (errorType: ErrorType) => {
  switch (errorType) {
    case ErrorType.API_NETWORK_ERROR:
      return 'Tentar Novamente';
    case ErrorType.API_TIMEOUT:
      return 'Tentar Novamente';
    case ErrorType.API_RATE_LIMIT:
      return 'Aguardar e Tentar';
    case ErrorType.API_SERVICE_UNAVAILABLE:
      return 'Tentar Novamente';
    default:
      return 'Tentar Novamente';
  }
};

const getSuggestion = (errorType: ErrorType): string => {
  switch (errorType) {
    case ErrorType.API_KEY_INVALID:
      return 'Verifique se sua chave API está correta e ativa.';
    case ErrorType.API_UNAUTHORIZED:
      return 'Sua chave API pode ter expirado ou não ter as permissões necessárias.';
    case ErrorType.API_NETWORK_ERROR:
      return 'Verifique sua conexão com a internet e tente novamente.';
    case ErrorType.API_TIMEOUT:
      return 'A requisição demorou muito. Tente novamente ou use um arquivo menor.';
    case ErrorType.API_RATE_LIMIT:
      return 'Você atingiu o limite de requisições. Aguarde alguns minutos.';
    case ErrorType.API_QUOTA_EXCEEDED:
      return 'Sua cota da API foi excedida. Verifique seu plano ou aguarde a renovação.';
    case ErrorType.API_SERVICE_UNAVAILABLE:
      return 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.';
    case ErrorType.FILE_TOO_LARGE:
      return 'Reduza o tamanho do arquivo ou divida-o em partes menores.';
    case ErrorType.FILE_INVALID_FORMAT:
      return 'Use apenas arquivos PDF, Word ou imagens suportadas.';
    case ErrorType.FILE_CORRUPTED:
      return 'O arquivo pode estar corrompido. Tente com outro arquivo.';
    case ErrorType.FILE_EMPTY:
      return 'Selecione um arquivo que contenha dados.';
    case ErrorType.FILE_READ_ERROR:
      return 'Erro ao ler o arquivo. Verifique se ele não está sendo usado por outro programa.';
    case ErrorType.PROCESSING_FAILED:
      return 'Tente novamente ou use o modo fallback para gerar um nome automático.';
    case ErrorType.ANALYSIS_FAILED:
      return 'A IA não conseguiu analisar o documento. Tente com outro arquivo ou use o modo fallback.';
    default:
      return 'Tente novamente ou entre em contato com o suporte se o problema persistir.';
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const Icon = getErrorIcon(error.type);
  const severity = getErrorSeverity(error.type);
  const suggestion = getSuggestion(error.type);

  return (
    <Alert className={`${getErrorColor(error.type)} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertTitle className="text-base font-semibold">
              {error.userMessage}
            </AlertTitle>
            <Badge className={`text-xs ${getSeverityColor(severity)}`}>
              {severity.toUpperCase()}
            </Badge>
            {error.retryable && (
              <Badge variant="outline" className="text-xs">
                Recuperável
              </Badge>
            )}
          </div>
          
          <AlertDescription className="space-y-3">
            <p className="text-sm leading-relaxed">
              {suggestion}
            </p>
            
            {isExpanded && (
              <div className="space-y-2 pt-2 border-t border-current/20">
                <div className="text-xs space-y-1">
                  <div><strong>Tipo:</strong> {error.type}</div>
                  <div><strong>Código:</strong> {error.code || 'N/A'}</div>
                  <div><strong>Timestamp:</strong> {error.timestamp.toLocaleString()}</div>
                  {error.context && Object.keys(error.context).length > 0 && (
                    <div>
                      <strong>Contexto:</strong>
                      <pre className="mt-1 text-xs bg-black/10 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </AlertDescription>
          
          <div className="flex items-center gap-2 mt-4">
            {error.retryable && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="bg-background/50 hover:bg-background/80"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {getRetryText(error.type)}
              </Button>
            )}
            
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Menos detalhes
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Mais detalhes
                </>
              )}
            </Button>
            
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="text-xs ml-auto"
              >
                Dispensar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
};

export default ErrorDisplay;