import { useState, useEffect } from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Cpu, Activity, Settings, FileText, Zap } from 'lucide-react';
import MinimalistAPIKeyManager from './MinimalistAPIKeyManager';
import MinimalistAIConfigManager from './MinimalistAIConfigManager';
import MinimalistPromptToggle from './MinimalistPromptToggle';
import HealthCheckPanel from '../HealthCheckPanel';

interface MinimalistConfigurationPanelProps {
  onApiKeyChange: (geminiKey: string) => void;
  onAIConfigChange: (model: string) => void;
}

export const MinimalistConfigurationPanel = ({ 
  onApiKeyChange, 
  onAIConfigChange 
}: MinimalistConfigurationPanelProps) => {
  const [currentApiKey, setCurrentApiKey] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['api-config']);

  useEffect(() => {
    // Carregar chave API atual do localStorage
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    setCurrentApiKey(savedApiKey);
  }, []);

  const handleApiKeyChange = (apiKey: string) => {
    setCurrentApiKey(apiKey);
    onApiKeyChange(apiKey);
  };

  // Determinar status das configurações
  const getConfigStatus = () => {
    const hasApiKey = currentApiKey.length > 0;
    const hasModel = localStorage.getItem('ai_model') !== null;
    
    return {
      api: hasApiKey ? 'configured' : 'pending',
      model: hasModel ? 'configured' : 'pending',
      overall: hasApiKey && hasModel ? 'ready' : 'incomplete'
    };
  };

  const status = getConfigStatus();

  return (
    <Card className="border border-border/50 shadow-sm">
      {/* Header minimalista */}
      <div className="p-6 pb-4 border-b border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Configuração</h2>
              <p className="text-sm text-muted-foreground">Configure sua IA para renomear documentos</p>
            </div>
          </div>
          
          {/* Status geral */}
          <Badge 
            variant={status.overall === 'ready' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {status.overall === 'ready' ? '✅ Pronto' : '⚠️ Incompleto'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-0">
        <Accordion 
          type="multiple" 
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="w-full"
        >
          {/* Seção: Configuração da API */}
          <AccordionItem value="api-config" className="border-b border-border/30">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500/10 rounded-md flex items-center justify-center">
                  <Key className="h-3 w-3 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">Configuração da API</div>
                  <div className="text-xs text-muted-foreground">
                    Chave API do Google Gemini
                  </div>
                </div>
                <Badge 
                  variant={status.api === 'configured' ? 'default' : 'secondary'}
                  className="ml-auto mr-4 text-xs"
                >
                  {status.api === 'configured' ? 'Configurada' : 'Pendente'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <MinimalistAPIKeyManager onApiKeyChange={handleApiKeyChange} />
            </AccordionContent>
          </AccordionItem>

          {/* Seção: Modelo de IA */}
          <AccordionItem value="ai-model" className="border-b border-border/30">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-500/10 rounded-md flex items-center justify-center">
                  <Cpu className="h-3 w-3 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">Modelo de IA</div>
                  <div className="text-xs text-muted-foreground">
                    Escolha o modelo Gemini para processamento
                  </div>
                </div>
                <Badge 
                  variant={status.model === 'configured' ? 'default' : 'secondary'}
                  className="ml-auto mr-4 text-xs"
                >
                  {status.model === 'configured' ? 'Configurado' : 'Padrão'}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <MinimalistAIConfigManager onConfigChange={onAIConfigChange} />
            </AccordionContent>
          </AccordionItem>

          {/* Seção: Templates de Prompt */}
          <AccordionItem value="prompt-templates" className="border-b border-border/30">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-purple-500/10 rounded-md flex items-center justify-center">
                  <FileText className="h-3 w-3 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">Templates de Prompt</div>
                  <div className="text-xs text-muted-foreground">
                    Personalize como a IA analisa documentos
                  </div>
                </div>
                <Badge variant="outline" className="ml-auto mr-4 text-xs">
                  Opcional
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <MinimalistPromptToggle />
            </AccordionContent>
          </AccordionItem>

          {/* Seção: Status do Sistema */}
          <AccordionItem value="system-status" className="border-b-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-500/10 rounded-md flex items-center justify-center">
                  <Activity className="h-3 w-3 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">Status do Sistema</div>
                  <div className="text-xs text-muted-foreground">
                    Verificação de conectividade e saúde
                  </div>
                </div>
                <Badge variant="outline" className="ml-auto mr-4 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Diagnóstico
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <HealthCheckPanel apiKey={currentApiKey} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};