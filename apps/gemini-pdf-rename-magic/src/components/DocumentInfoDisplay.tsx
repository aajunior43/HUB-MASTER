import React, { useState, useEffect } from 'react';
import { DocumentInfo, DocumentAnalysisResult, DocumentDisplayConfig } from '@/types/document';
import { FileText, Calendar, Building, Hash, Info, Clock, DollarSign, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface DocumentInfoDisplayProps {
  analysisResult: DocumentAnalysisResult | null;
  isLoading?: boolean;
  config?: Partial<DocumentDisplayConfig>;
  onConfigChange?: (config: DocumentDisplayConfig) => void;
}

const defaultConfig: DocumentDisplayConfig = {
  showConfidence: true,
  showAdditionalInfo: true,
  animationEnabled: true,
  compactMode: false
};

export const DocumentInfoDisplay: React.FC<DocumentInfoDisplayProps> = ({
  analysisResult,
  isLoading = false,
  config = {},
  onConfigChange
}) => {
  const [displayConfig, setDisplayConfig] = useState<DocumentDisplayConfig>({
    ...defaultConfig,
    ...config
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (analysisResult && displayConfig.animationEnabled) {
      setAnimationClass('animate-fade-in');
      const timer = setTimeout(() => setAnimationClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [analysisResult, displayConfig.animationEnabled]);

  const updateConfig = (newConfig: Partial<DocumentDisplayConfig>) => {
    const updatedConfig = { ...displayConfig, ...newConfig };
    setDisplayConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-300 bg-green-900/30 border-green-500/30';
    if (confidence >= 60) return 'text-yellow-300 bg-yellow-900/30 border-yellow-500/30';
    return 'text-red-300 bg-red-900/30 border-red-500/30';
  };

  const getDocumentTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Empenho': <FileText className="w-5 h-5 text-blue-400" />,
      'Liquidação': <CheckCircle className="w-5 h-5 text-green-400" />,
      'Solicitação de Compra': <FileText className="w-5 h-5 text-purple-400" />,
      'Nota Fiscal': <DollarSign className="w-5 h-5 text-emerald-400" />,
      'Contrato': <FileText className="w-5 h-5 text-indigo-400" />,
      'Ordem de Serviço': <User className="w-5 h-5 text-orange-400" />,
      'Recibo': <DollarSign className="w-5 h-5 text-teal-400" />,
      'Fatura': <DollarSign className="w-5 h-5 text-red-400" />,
      'Boleto': <DollarSign className="w-5 h-5 text-yellow-400" />,
      'Comprovante': <CheckCircle className="w-5 h-5 text-blue-400" />,
      'Relatório': <FileText className="w-5 h-5 text-gray-300" />,
      'Ata': <FileText className="w-5 h-5 text-slate-300" />,
      'Ofício': <FileText className="w-5 h-5 text-cyan-400" />,
      'Memorando': <FileText className="w-5 h-5 text-pink-400" />,
      'Outros': <FileText className="w-5 h-5 text-gray-400" />
    };
    return iconMap[type] || <FileText className="w-5 h-5 text-gray-400" />;
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'Data não identificada';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatValue = (value: string) => {
    if (!value || value === 'N/A') return null;
    
    // Tentar formatar como moeda se parecer com um valor monetário
    const numericValue = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    if (!isNaN(parseFloat(numericValue))) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(parseFloat(numericValue));
    }
    
    return value;
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/80 rounded-lg border border-slate-600/30 p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-slate-600/50 rounded"></div>
            <div className="h-6 bg-slate-600/50 rounded w-1/3"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-600/50 rounded w-3/4"></div>
            <div className="h-4 bg-slate-600/50 rounded w-1/2"></div>
            <div className="h-4 bg-slate-600/50 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="bg-slate-800/60 rounded-lg border border-slate-600/30 p-6 text-center">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <p className="text-slate-200">Nenhum documento analisado ainda</p>
        <p className="text-sm text-slate-400 mt-1">
          Faça upload de um documento para ver as informações estruturadas
        </p>
      </div>
    );
  }

  const { documentInfo, suggestedFileName, extractionTime } = analysisResult;

  return (
    <div className={`document-info-card rounded-xl shadow-lg ${animationClass} ${displayConfig.compactMode ? 'p-4' : 'p-6'}`} style={{
      backgroundColor: '#000000 !important',
      border: '2px solid #ffffff !important',
      color: '#ffffff !important'
    }}>
      {/* Header com controles */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: '#ffffff !important' }}>
          <Info className="w-5 h-5" style={{ color: '#ffffff !important' }} />
          Informações do Documento
        </h3>
        
        <div className="flex items-center gap-2">
          {displayConfig.showConfidence && (
            <span className="px-2 py-1 rounded-full text-xs font-medium border" style={{
              color: '#ffffff !important',
              borderColor: '#ffffff !important',
              backgroundColor: '#333333 !important'
            }}>
              {documentInfo.confidence}% confiança
            </span>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded transition-colors"
            style={{
              backgroundColor: '#333333 !important',
              color: '#ffffff !important',
              border: '1px solid #ffffff !important'
            }}
            title={isExpanded ? 'Recolher' : 'Expandir'}
          >
            {isExpanded ? <EyeOff className="w-4 h-4" style={{ color: '#ffffff !important' }} /> : <Eye className="w-4 h-4" style={{ color: '#ffffff !important' }} />}
          </button>
        </div>
      </div>

      {/* Informações principais */}
      <div className={`grid gap-4 ${displayConfig.compactMode ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {/* Tipo do documento */}
        <div className="flex items-center gap-3 p-3 rounded-lg info-item" style={{
          backgroundColor: '#111111 !important',
          border: '2px solid #ffffff !important',
          color: '#ffffff !important'
        }}>
          <div style={{ color: '#ffffff !important' }}>
            {getDocumentTypeIcon(documentInfo.type)}
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: '#ffffff !important' }}>Tipo do Documento</p>
            <p className="text-lg font-semibold" style={{ color: '#ffffff !important' }}>{documentInfo.type}</p>
          </div>
        </div>

        {/* Nome da empresa */}
        <div className="flex items-center gap-3 p-3 rounded-lg info-item" style={{
          backgroundColor: '#111111 !important',
          border: '2px solid #ffffff !important',
          color: '#ffffff !important'
        }}>
          <Building className="w-5 h-5" style={{ color: '#ffffff !important' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#ffffff !important' }}>Empresa</p>
            <p className="text-lg font-semibold" style={{ color: '#ffffff !important' }}>
              {documentInfo.companyName === 'N/A' ? 'Não identificada' : documentInfo.companyName}
            </p>
          </div>
        </div>

        {/* Data do documento */}
        <div className="flex items-center gap-3 p-3 rounded-lg info-item" style={{
          backgroundColor: '#111111 !important',
          border: '2px solid #ffffff !important',
          color: '#ffffff !important'
        }}>
          <Calendar className="w-5 h-5" style={{ color: '#ffffff !important' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#ffffff !important' }}>Data do Documento</p>
            <p className="text-lg font-semibold" style={{ color: '#ffffff !important' }}>
              {formatDate(documentInfo.documentDate)}
            </p>
          </div>
        </div>

        {/* Número do documento */}
        <div className="flex items-center gap-3 p-3 rounded-lg info-item" style={{
          backgroundColor: '#111111 !important',
          border: '2px solid #ffffff !important',
          color: '#ffffff !important'
        }}>
          <Hash className="w-5 h-5" style={{ color: '#ffffff !important' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#ffffff !important' }}>Número do Documento</p>
            <p className="text-lg font-semibold" style={{ color: '#ffffff !important' }}>
              {documentInfo.documentNumber === 'N/A' ? 'Não identificado' : documentInfo.documentNumber}
            </p>
          </div>
        </div>
      </div>

      {/* Informações adicionais (expandível) */}
      {displayConfig.showAdditionalInfo && isExpanded && documentInfo.additionalInfo && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: '#ffffff !important' }}>
          <h4 className="text-md font-medium mb-3" style={{ color: '#ffffff !important' }}>Informações Adicionais</h4>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {documentInfo.additionalInfo.value && documentInfo.additionalInfo.value !== 'N/A' && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: '#ffffff !important' }} />
                <span className="text-sm" style={{ color: '#ffffff !important' }}>Valor:</span>
                <span className="text-sm font-medium" style={{ color: '#ffffff !important' }}>
                  {formatValue(documentInfo.additionalInfo.value)}
                </span>
              </div>
            )}
            
            {documentInfo.additionalInfo.description && documentInfo.additionalInfo.description !== 'N/A' && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" style={{ color: '#ffffff !important' }} />
                <span className="text-sm" style={{ color: '#ffffff !important' }}>Descrição:</span>
                <span className="text-sm font-medium" style={{ color: '#ffffff !important' }}>
                  {documentInfo.additionalInfo.description}
                </span>
              </div>
            )}
            
            {documentInfo.additionalInfo.department && documentInfo.additionalInfo.department !== 'N/A' && (
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" style={{ color: '#ffffff !important' }} />
                <span className="text-sm" style={{ color: '#ffffff !important' }}>Departamento:</span>
                <span className="text-sm font-medium" style={{ color: '#ffffff !important' }}>
                  {documentInfo.additionalInfo.department}
                </span>
              </div>
            )}
            
            {documentInfo.additionalInfo.status && documentInfo.additionalInfo.status !== 'N/A' && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: '#ffffff !important' }} />
                <span className="text-sm" style={{ color: '#ffffff !important' }}>Status:</span>
                <span className="text-sm font-medium" style={{ color: '#ffffff !important' }}>
                  {documentInfo.additionalInfo.status}
                </span>
              </div>
            )}
            
            {documentInfo.additionalInfo.dueDate && documentInfo.additionalInfo.dueDate !== 'N/A' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: '#ffffff !important' }} />
                <span className="text-sm" style={{ color: '#ffffff !important' }}>Vencimento:</span>
                <span className="text-sm font-medium" style={{ color: '#ffffff !important' }}>
                  {formatDate(documentInfo.additionalInfo.dueDate)}
                </span>
              </div>
            )}
            
            {documentInfo.additionalInfo.reference && documentInfo.additionalInfo.reference !== 'N/A' && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" style={{ color: '#ffffff !important' }} />
                <span className="text-sm" style={{ color: '#ffffff !important' }}>Referência:</span>
                <span className="text-sm font-medium" style={{ color: '#ffffff !important' }}>
                  {documentInfo.additionalInfo.reference}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nome sugerido e tempo de extração */}
      <div className="mt-6 pt-4 border-t border-slate-600/30">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Nome sugerido: </span>
            <code className="bg-slate-700/50 border border-slate-600/30 px-2 py-1 rounded text-xs font-mono text-slate-200">
              {suggestedFileName}
            </code>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{extractionTime}ms</span>
          </div>
        </div>
      </div>

      {/* Controles de configuração */}
      <div className="mt-4 pt-4 border-t border-slate-600/30">
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={displayConfig.showConfidence}
              onChange={(e) => updateConfig({ showConfidence: e.target.checked })}
              className="rounded border-slate-500 bg-slate-700 text-blue-400 focus:ring-blue-400 focus:ring-offset-slate-800"
            />
            <span>Mostrar confiança</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={displayConfig.showAdditionalInfo}
              onChange={(e) => updateConfig({ showAdditionalInfo: e.target.checked })}
              className="rounded border-slate-500 bg-slate-700 text-blue-400 focus:ring-blue-400 focus:ring-offset-slate-800"
            />
            <span>Informações adicionais</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={displayConfig.animationEnabled}
              onChange={(e) => updateConfig({ animationEnabled: e.target.checked })}
              className="rounded border-slate-500 bg-slate-700 text-blue-400 focus:ring-blue-400 focus:ring-offset-slate-800"
            />
            <span>Animações</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={displayConfig.compactMode}
              onChange={(e) => updateConfig({ compactMode: e.target.checked })}
              className="rounded border-slate-500 bg-slate-700 text-blue-400 focus:ring-blue-400 focus:ring-offset-slate-800"
            />
            <span>Modo compacto</span>
          </label>
        </div>
      </div>
    </div>
  );
};