
import { useState, useEffect } from 'react';
import { X, Save, Calendar, Hash, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Prompt, CreatePromptData } from '@/types/prompt';
import { useToast } from '@/hooks/use-toast';
import { PromptForm } from './PromptForm';
import { VariableManager } from './VariableManager';
import { GeminiApiConfig } from './GeminiApiConfig';
import { GeminiFeatures } from './GeminiFeatures';

interface PromptModalProps {
  prompt?: Prompt;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePromptData) => void;
  onMultipleSave?: (prompts: CreatePromptData[]) => void;
  mode: 'create' | 'edit' | 'view';
}

export const PromptModal = ({ 
  prompt, 
  isOpen, 
  onClose, 
  onSave, 
  onMultipleSave,
  mode 
}: PromptModalProps) => {
  const [formData, setFormData] = useState<CreatePromptData>({
    title: '',
    content: '',
    tags: [],
    category: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const { toast } = useToast();

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o prompt.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formData.content);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o conteúdo.",
        variant: "destructive",
      });
    }
  };

  const handleGeminiPromptUpdate = (data: CreatePromptData) => {
    setFormData(prev => ({
      ...prev,
      ...data
    }));
  };

  const handleMultiplePromptsGenerated = async (prompts: CreatePromptData[]) => {
    if (onMultipleSave) {
      try {
        console.log('Saving multiple prompts:', prompts);
        await onMultipleSave(prompts);
        toast({
          title: "Prompts salvos!",
          description: `${prompts.length} variações foram salvas automaticamente.`,
        });
      } catch (error) {
        console.error('Error saving multiple prompts:', error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar todas as variações.",
          variant: "destructive",
        });
      }
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Novo Prompt';
      case 'edit': return 'Editar Prompt';
      case 'view': return 'Visualizar Prompt';
      default: return 'Prompt';
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">{getTitle()}</DialogTitle>
            {mode === 'view' && prompt && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(prompt.updated_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  <span>v{prompt.version}</span>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="prompt" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="gemini">
              <Settings className="w-4 h-4 mr-2" />
              IA Gemini
            </TabsTrigger>
            <TabsTrigger value="variables">Variáveis</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
            <TabsContent value="prompt" className="space-y-6 mt-6">
              <PromptForm
                prompt={prompt}
                mode={mode}
                onDataChange={setFormData}
                onCopy={handleCopy}
              />
            </TabsContent>

            <TabsContent value="gemini" className="space-y-6 mt-6">
              <GeminiApiConfig onApiKeySet={setGeminiApiKey} />
              <GeminiFeatures
                apiKey={geminiApiKey}
                onPromptGenerated={handleGeminiPromptUpdate}
                onMultiplePromptsGenerated={handleMultiplePromptsGenerated}
                currentPrompt={{
                  title: formData.title,
                  content: formData.content,
                  category: formData.category || ''
                }}
              />
            </TabsContent>

            <TabsContent value="variables" className="space-y-6 mt-6">
              <VariableManager 
                content={formData.content}
                onContentReady={(processedContent) => {
                  // Optional: Could save processed content somewhere
                }}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            {mode === 'view' ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSave} disabled={isLoading} className="bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
