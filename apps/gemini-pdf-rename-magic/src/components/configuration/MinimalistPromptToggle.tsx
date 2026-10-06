import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Settings, Sparkles } from 'lucide-react';
import { PromptTemplateManager } from '../PromptTemplateManager';
import { toast } from '@/hooks/use-toast';

interface MinimalistPromptToggleProps {
  onPromptModeChange?: (useCustomPrompt: boolean) => void;
}

const MinimalistPromptToggle = ({ onPromptModeChange }: MinimalistPromptToggleProps) => {
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  useEffect(() => {
    // Carregar configuração salva
    const savedPromptMode = localStorage.getItem('use_custom_prompt') === 'true';
    setUseCustomPrompt(savedPromptMode);
    onPromptModeChange?.(savedPromptMode);
  }, [onPromptModeChange]);

  const handleToggleChange = (checked: boolean) => {
    setUseCustomPrompt(checked);
    localStorage.setItem('use_custom_prompt', checked.toString());
    onPromptModeChange?.(checked);
    
    if (checked) {
      toast({
        title: "Prompts personalizados ativados",
        description: "Você pode configurar templates específicos para diferentes tipos de documentos.",
      });
    } else {
      toast({
        title: "Prompt padrão ativado",
        description: "Usando o prompt padrão otimizado para renomeação geral.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle minimalista */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-purple-500/10 rounded-md flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-purple-600" />
          </div>
          <div>
            <Label htmlFor="custom-prompt-toggle" className="text-sm font-medium cursor-pointer">
              Prompts Personalizados
            </Label>
            <div className="text-xs text-muted-foreground">
              Use templates específicos para diferentes documentos
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={useCustomPrompt ? "default" : "secondary"}
            className="text-xs"
          >
            {useCustomPrompt ? 'Ativo' : 'Padrão'}
          </Badge>
          <Switch
            id="custom-prompt-toggle"
            checked={useCustomPrompt}
            onCheckedChange={handleToggleChange}
          />
        </div>
      </div>

      {/* Configurações de template quando ativo */}
      {useCustomPrompt && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Templates Disponíveis</div>
            <Button
              onClick={() => setShowTemplateManager(!showTemplateManager)}
              variant="outline"
              size="sm"
              className="text-xs h-8"
            >
              <Settings className="h-3 w-3 mr-1" />
              {showTemplateManager ? 'Ocultar' : 'Gerenciar'}
            </Button>
          </div>
          
          {showTemplateManager && (
            <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
              <PromptTemplateManager />
            </div>
          )}
          
          {!showTemplateManager && (
            <div className="text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200/50">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3 w-3" />
                <span className="font-medium">Como funciona</span>
              </div>
              <div>
                Templates personalizados permitem que você configure prompts específicos 
                para diferentes tipos de documentos (notas fiscais, contratos, etc.), 
                melhorando a precisão da renomeação.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Informação sobre prompt padrão */}
      {!useCustomPrompt && (
        <div className="text-xs text-muted-foreground bg-green-50/50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200/50">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3 w-3" />
            <span className="font-medium">Prompt Padrão</span>
          </div>
          <div>
            Usando o prompt otimizado que funciona bem para a maioria dos documentos. 
            Ative os prompts personalizados para maior controle sobre a renomeação.
          </div>
        </div>
      )}
    </div>
  );
};

export default MinimalistPromptToggle;