import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Brain, Sparkles, Cpu, FlaskConical, Star, Info } from 'lucide-react';

interface MinimalistAIConfigManagerProps {
  onConfigChange: (model: string) => void;
}

const GEMINI_MODELS = [
  // Gemini 2.5 - Modelos Mais Recentes
  { 
    value: 'gemini-2.5-flash-lite', 
    label: 'Gemini 2.5 Flash-Lite', 
    description: 'Modelo mais econômico que oferece alta capacidade de processamento', 
    badge: 'Recomendado',
    icon: Zap,
    performance: '💰 Econômico',
    category: '2.5'
  },
  
  // Gemini 1.5 - Modelos Principais
  { 
    value: 'gemini-1.5-flash', 
    label: 'Gemini 1.5 Flash', 
    description: 'Rápido e eficiente para uso geral', 
    badge: 'Clássico',
    icon: Zap,
    performance: '⚡ Ultra Rápido',
    category: '1.5'
  },
  { 
    value: 'gemini-1.5-flash-8b', 
    label: 'Gemini 1.5 Flash 8B', 
    description: 'Versão otimizada e ultra leve', 
    badge: 'Rápido',
    icon: Cpu,
    performance: '🚀 Instantâneo',
    category: '1.5'
  },
  { 
    value: 'gemini-1.5-pro', 
    label: 'Gemini 1.5 Pro', 
    description: 'Máxima precisão e capacidades avançadas', 
    badge: 'Pro',
    icon: Brain,
    performance: '🎯 Preciso',
    category: '1.5'
  },
  
  // Gemini 1.0 - Modelos Anteriores
  { 
    value: 'gemini-1.0-pro', 
    label: 'Gemini 1.0 Pro', 
    description: 'Modelo anterior confiável e estável', 
    badge: 'Estável',
    icon: Star,
    performance: '🛡️ Confiável',
    category: '1.0'
  },
  { 
    value: 'gemini-1.0-pro-vision', 
    label: 'Gemini 1.0 Pro Vision', 
    description: 'Especializado em análise visual', 
    badge: 'Visão',
    icon: Sparkles,
    performance: '👁️ Visual',
    category: '1.0'
  },
  
  // Modelos Experimentais
  { 
    value: 'gemini-exp-1114', 
    label: 'Gemini Experimental 1114', 
    description: 'Recursos experimentais em teste', 
    badge: 'Beta',
    icon: FlaskConical,
    performance: '🧪 Experimental',
    category: 'exp'
  },
  { 
    value: 'gemini-exp-1121', 
    label: 'Gemini Experimental 1121', 
    description: 'Versão experimental mais recente', 
    badge: 'Beta',
    icon: FlaskConical,
    performance: '🧪 Experimental',
    category: 'exp'
  },
  { 
    value: 'gemini-exp-1206', 
    label: 'Gemini Experimental 1206', 
    description: 'Última versão experimental disponível', 
    badge: 'Novo',
    icon: FlaskConical,
    performance: '✨ Novíssimo',
    category: 'exp'
  }
];

const MinimalistAIConfigManager = ({ onConfigChange }: MinimalistAIConfigManagerProps) => {
  const [model, setModel] = useState('gemini-2.5-flash-lite');

  useEffect(() => {
    const savedModel = localStorage.getItem('ai_model') || 'gemini-2.5-flash-lite';
    setModel(savedModel);
    onConfigChange(savedModel);
  }, [onConfigChange]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    localStorage.setItem('ai_model', newModel);
    onConfigChange(newModel);
  };

  const selectedModel = GEMINI_MODELS.find(m => m.value === model);
  const SelectedIcon = selectedModel?.icon || Brain;

  return (
    <div className="space-y-4">
      {/* Seletor de modelo minimalista */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-model-select" className="text-sm font-medium">
            Modelo de IA
          </Label>
          {selectedModel && (
            <Badge 
              variant={selectedModel.badge === 'Recomendado' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {selectedModel.badge}
            </Badge>
          )}
        </div>
        
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger 
            id="ai-model-select"
            className="border-border/50 hover:border-primary/50 transition-colors h-10"
          >
            <SelectValue placeholder="Escolha seu modelo de IA" />
          </SelectTrigger>
          <SelectContent className="max-h-80 overflow-y-auto">
            {/* Gemini 1.5 Models */}
            <div className="px-3 py-2 text-xs font-semibold text-primary border-b border-primary/20 mb-2 bg-primary/5">
              🚀 Gemini 1.5 (Recomendado)
            </div>
            {GEMINI_MODELS.filter(m => m.category === '1.5').map((modelOption) => {
              const IconComponent = modelOption.icon;
              return (
                <SelectItem key={modelOption.value} value={modelOption.value} className="py-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{modelOption.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{modelOption.description}</div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            
            {/* Gemini 1.0 Models */}
            <div className="px-3 py-2 text-xs font-semibold text-orange-600 border-b border-orange-200 mb-2 mt-3 bg-orange-50 dark:bg-orange-900/20">
              🛡️ Gemini 1.0 (Estável)
            </div>
            {GEMINI_MODELS.filter(m => m.category === '1.0').map((modelOption) => {
              const IconComponent = modelOption.icon;
              return (
                <SelectItem key={modelOption.value} value={modelOption.value} className="py-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-3 w-3 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{modelOption.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{modelOption.description}</div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
            
            {/* Experimental Models */}
            <div className="px-3 py-2 text-xs font-semibold text-purple-600 border-b border-purple-200 mb-2 mt-3 bg-purple-50 dark:bg-purple-900/20">
              🧪 Experimentais (Beta)
            </div>
            {GEMINI_MODELS.filter(m => m.category === 'exp').map((modelOption) => {
              const IconComponent = modelOption.icon;
              return (
                <SelectItem key={modelOption.value} value={modelOption.value} className="py-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-md flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">{modelOption.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{modelOption.description}</div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Informações do modelo selecionado */}
      {selectedModel && (
        <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-5 h-5 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded flex items-center justify-center">
              <SelectedIcon className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground">{selectedModel.label}</div>
              <div className="text-xs text-muted-foreground">{selectedModel.performance}</div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3">{selectedModel.description}</p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border/30">
            <Info className="h-3 w-3 flex-shrink-0" />
            <span>Nomes gerados em CAIXA ALTA para melhor organização</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinimalistAIConfigManager;