
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePromptVariables, PromptVariable } from '@/hooks/usePromptVariables';
import { useToast } from '@/hooks/use-toast';

interface VariableManagerProps {
  content: string;
  onContentReady?: (processedContent: string) => void;
}

export const VariableManager = ({ content, onContentReady }: VariableManagerProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  
  const {
    detectedVariables,
    variables,
    syncVariables,
    processContent,
    updateVariable,
    hasVariables,
    hasUnfilledVariables
  } = usePromptVariables(content);

  useEffect(() => {
    syncVariables();
  }, [detectedVariables]);

  const handleCopyWithVariables = async () => {
    if (hasUnfilledVariables) {
      toast({
        title: "Variáveis não preenchidas",
        description: "Preencha todas as variáveis antes de copiar.",
        variant: "destructive",
      });
      return;
    }

    const processedContent = processContent(content);
    
    try {
      await navigator.clipboard.writeText(processedContent);
      toast({
        title: "Copiado!",
        description: "Prompt com variáveis substituídas copiado para a área de transferência.",
      });
      
      if (onContentReady) {
        onContentReady(processedContent);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o conteúdo.",
        variant: "destructive",
      });
    }
  };

  if (!hasVariables) {
    return null;
  }

  const processedContent = processContent(content);

  return (
    <div className="space-y-4 border border-border rounded-lg p-4 bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Variáveis do Prompt</Label>
          <Badge variant="secondary" className="text-xs">
            {variables.length} variável{variables.length !== 1 ? 'eis' : ''}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? 'Ocultar' : 'Visualizar'}
        </Button>
      </div>

      <div className="grid gap-3">
        {variables.map((variable) => (
          <div key={variable.name} className="space-y-1">
            <Label htmlFor={`var-${variable.name}`} className="text-sm">
              {variable.name}
            </Label>
            <Input
              id={`var-${variable.name}`}
              placeholder={variable.placeholder}
              value={variable.value}
              onChange={(e) => updateVariable(variable.name, e.target.value)}
              className="bg-background"
            />
          </div>
        ))}
      </div>

      {showPreview && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Preview:</Label>
          <div className="p-3 bg-muted/50 rounded border text-sm">
            {processedContent}
          </div>
        </div>
      )}

      <Button 
        onClick={handleCopyWithVariables}
        disabled={hasUnfilledVariables}
        className="w-full"
      >
        <Copy className="w-4 h-4 mr-2" />
        Copiar com Variáveis
      </Button>
    </div>
  );
};
