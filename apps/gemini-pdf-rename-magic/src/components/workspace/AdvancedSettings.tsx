
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PromptTemplateManager } from '../PromptTemplateManager';
import { promptTemplateService, PromptTemplate } from '@/services/promptTemplateService';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles } from 'lucide-react';

const DEFAULT_PROMPT = `Analise este documento [FILETYPE] e crie um nome de arquivo profissional e descritivo baseado no conteúdo. 

REGRAS OBRIGATÓRIAS:
- Nome claro, específico e informativo sobre o conteúdo
- Apenas letras, números, hífens e underscores (sem acentos ou caracteres especiais)
- Máximo 60 caracteres
- Em português brasileiro
- SEM a extensão do arquivo
- SEMPRE EM CAIXA ALTA (MAIÚSCULAS)

INSTRUÇÕES ESPECÍFICAS:
1. Para documentos escaneados/imagens: analise elementos visuais como logotipos, cabeçalhos, estrutura e texto visível
2. Identifique o tipo de documento: nota fiscal, contrato, relatório, memorando, certidão, comprovante, etc.
3. Inclua informações relevantes como: empresa, data (se visível), número do documento, tipo específico
4. Para documentos Word: considere títulos, formatação e estrutura do conteúdo

EXEMPLOS DE FORMATO:
- NOTA_FISCAL_EMPRESA_XYZ_123456_2024
- CONTRATO_PRESTACAO_SERVICOS_ABC_DEZ2024  
- RELATORIO_VENDAS_TRIMESTRE_Q4_2024
- COMPROVANTE_PAGAMENTO_FORNECEDOR_456

RESPONDA APENAS COM O NOME SUGERIDO EM CAIXA ALTA, SEM EXPLICAÇÕES ADICIONAIS.`;

export const AdvancedSettings = () => {
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

  useEffect(() => {
    const savedPrompt = localStorage.getItem('geminiCustomPrompt');
    const savedUseCustom = localStorage.getItem('geminiUseCustomPrompt');
    const savedTemplateId = localStorage.getItem('selectedTemplateId');
    
    if (savedPrompt) {
      setCustomPrompt(savedPrompt);
    }
    
    if (savedUseCustom === 'true') {
      setUseCustomPrompt(true);
    }
    
    if (savedTemplateId) {
      const template = promptTemplateService.getTemplate(savedTemplateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, []);

  const handlePromptSave = () => {
    localStorage.setItem('geminiCustomPrompt', customPrompt);
    localStorage.setItem('geminiUseCustomPrompt', useCustomPrompt.toString());
    
    // Se um template está selecionado, salvar a referência
    if (selectedTemplate) {
      localStorage.setItem('selectedTemplateId', selectedTemplate.id);
    } else {
      localStorage.removeItem('selectedTemplateId');
    }
  };

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setCustomPrompt(template.prompt);
    setUseCustomPrompt(true);
    
    // Salvar automaticamente quando um template é selecionado
    localStorage.setItem('geminiCustomPrompt', template.prompt);
    localStorage.setItem('geminiUseCustomPrompt', 'true');
    localStorage.setItem('selectedTemplateId', template.id);
  };

  const handleResetPrompt = () => {
    setCustomPrompt(DEFAULT_PROMPT);
    setUseCustomPrompt(false);
    setSelectedTemplate(null);
    localStorage.removeItem('selectedTemplateId');
  };

  return (
    <div className="space-y-4">
      {/* Template Manager */}
      <div className="glass-panel p-3 rounded border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Templates de Prompts
            </Label>
            <p className="text-xs text-muted-foreground">
              Use templates otimizados para diferentes tipos de documentos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <PromptTemplateManager 
            onTemplateSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
            className="flex-1"
          />
          
          {selectedTemplate && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {selectedTemplate.name}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      <Separator />
      
      {/* Compact Toggle */}
      <div className="glass-panel p-3 rounded border border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="use-custom-prompt" className="text-sm font-semibold text-foreground">
              🧠 Prompt Personalizado
            </Label>
            <p className="text-xs text-muted-foreground">
              {selectedTemplate ? 'Editar template selecionado' : 'Criar prompt personalizado'}
            </p>
          </div>
          <Switch 
            id="use-custom-prompt" 
            checked={useCustomPrompt}
            onCheckedChange={setUseCustomPrompt}
          />
        </div>
      </div>

      {/* Compact Prompt Editor */}
      {useCustomPrompt && (
        <div className="space-y-2">
          <div className="glass-panel p-1 rounded border border-border/50">
            <Textarea 
              id="custom-prompt"
              placeholder="Digite seu prompt personalizado..."
              className="min-h-[120px] text-xs bg-transparent border-0 resize-none p-2 focus:ring-0 focus:outline-none"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
            />
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border">
            💡 Use <code className="bg-primary/20 text-primary px-1 rounded text-xs">[FILETYPE]</code> para o tipo de arquivo
          </div>
        </div>
      )}

      {/* Compact Action Buttons */}
      <div className="flex gap-2">
        <Button 
          variant="minimal" 
          onClick={handleResetPrompt}
          size="compact"
          className="flex-1"
        >
          Restaurar
        </Button>
        <Button 
          onClick={handlePromptSave}
          size="compact"
          className="flex-1"
        >
          Salvar
        </Button>
      </div>
    </div>
  );
};
