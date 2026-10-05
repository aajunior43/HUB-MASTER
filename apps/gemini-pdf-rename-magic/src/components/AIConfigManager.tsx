
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Brain, Sparkles, Cpu, FlaskConical, Star } from 'lucide-react';

interface AIConfigManagerProps {
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

const AIConfigManager = ({ onConfigChange }: AIConfigManagerProps) => {
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
    <Card className="glass-panel border-primary/20 shadow-sm hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-xs font-bold text-white">G</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold gradient-text">🤖 Modelo IA</div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0 pb-3">
        <div className="space-y-2">
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="bg-muted/50 border-border hover:border-primary/50 transition-colors h-9 text-sm">
              <SelectValue placeholder="Escolha seu modelo de IA" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border max-h-80 overflow-y-auto">
              {/* Gemini 1.5 Models */}
              <div className="px-3 py-2 text-xs font-bold text-primary border-b border-primary/20 mb-2 bg-primary/5 rounded-t">
                🚀 Gemini 1.5 (Recomendado)
              </div>
              {GEMINI_MODELS.filter(m => m.category === '1.5').map((modelOption) => {
                const IconComponent = modelOption.icon;
                return (
                  <SelectItem key={modelOption.value} value={modelOption.value} className="focus:bg-muted/50 py-3">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{modelOption.label}</div>
                          <div className="text-xs text-muted-foreground">{modelOption.description}</div>
                          <div className="text-xs font-medium text-primary mt-1">{modelOption.performance}</div>
                        </div>
                      </div>
                      <Badge 
                        variant={modelOption.badge === 'Recomendado' ? 'default' : 'secondary'} 
                        className="ml-2 text-xs animate-pulse"
                      >
                        {modelOption.badge}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
              
              {/* Gemini 1.0 Models */}
              <div className="px-3 py-2 text-xs font-bold text-orange-600 border-b border-orange-200 mb-2 mt-3 bg-orange-50 dark:bg-orange-900/20 rounded">
                🛡️ Gemini 1.0 (Estável)
              </div>
              {GEMINI_MODELS.filter(m => m.category === '1.0').map((modelOption) => {
                const IconComponent = modelOption.icon;
                return (
                  <SelectItem key={modelOption.value} value={modelOption.value} className="focus:bg-muted/50 py-3">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{modelOption.label}</div>
                          <div className="text-xs text-muted-foreground">{modelOption.description}</div>
                          <div className="text-xs font-medium text-orange-600 mt-1">{modelOption.performance}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs border-orange-200">
                        {modelOption.badge}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
              
              {/* Experimental Models */}
              <div className="px-3 py-2 text-xs font-bold text-purple-600 border-b border-purple-200 mb-2 mt-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                🧪 Experimentais (Beta)
              </div>
              {GEMINI_MODELS.filter(m => m.category === 'exp').map((modelOption) => {
                const IconComponent = modelOption.icon;
                return (
                  <SelectItem key={modelOption.value} value={modelOption.value} className="focus:bg-muted/50 py-3">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                          <IconComponent className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{modelOption.label}</div>
                          <div className="text-xs text-muted-foreground">{modelOption.description}</div>
                          <div className="text-xs font-medium text-purple-600 mt-1">{modelOption.performance}</div>
                        </div>
                      </div>
                      <Badge 
                        variant={modelOption.badge === 'Novo' ? 'destructive' : 'secondary'} 
                        className="ml-2 text-xs"
                      >
                        {modelOption.badge}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Compact Model Info */}
        {selectedModel && (
          <div className="glass-panel p-2 rounded border border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded flex items-center justify-center">
                <SelectedIcon className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-foreground">{selectedModel.label}</div>
                <div className="text-xs text-muted-foreground">{selectedModel.performance}</div>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedModel.badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{selectedModel.description}</p>
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border">
              <strong>💡</strong> Nomes gerados em CAIXA ALTA
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIConfigManager;
