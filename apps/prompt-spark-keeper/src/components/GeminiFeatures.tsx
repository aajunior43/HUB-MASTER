
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Wand2, 
  Tag, 
  FileText, 
  Sparkles,
  Loader2,
  Database,
  AlertCircle
} from 'lucide-react';
import { GeminiService } from '@/services/geminiService';
import { CreatePromptData } from '@/types/prompt';
import { useToast } from '@/hooks/use-toast';

interface GeminiFeaturesProps {
  apiKey: string;
  onPromptGenerated?: (data: CreatePromptData) => void;
  onMultiplePromptsGenerated?: (prompts: CreatePromptData[]) => void;
  currentPrompt?: {
    title: string;
    content: string;
    category: string;
  };
}

export const GeminiFeatures = ({ 
  apiKey, 
  onPromptGenerated, 
  onMultiplePromptsGenerated,
  currentPrompt 
}: GeminiFeaturesProps) => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [autoSaveToSupabase, setAutoSaveToSupabase] = useState(true);
  const [generatedData, setGeneratedData] = useState<{
    name?: string;
    tags?: string[];
  }>({});
  const { toast } = useToast();

  const gemini = new GeminiService(apiKey);

  const setLoadingState = (key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const showError = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive",
    });
  };

  const showSuccess = (title: string, description: string) => {
    toast({
      title,
      description,
    });
  };

  const handleGenerateName = async () => {
    if (!currentPrompt?.content) {
      showError("Erro", "Nenhum conteúdo de prompt disponível para gerar nome.");
      return;
    }
    
    setLoadingState('name', true);
    try {
      console.log('Generating name for prompt:', currentPrompt.content);
      const name = await gemini.generatePromptName(currentPrompt.content);
      console.log('Generated name:', name);
      
      if (!name) {
        throw new Error('Nome vazio retornado');
      }
      
      setGeneratedData(prev => ({ ...prev, name: name.trim() }));
      
      if (onPromptGenerated && autoSaveToSupabase) {
        onPromptGenerated({
          title: name.trim(),
          content: currentPrompt.content,
          category: currentPrompt.category,
          tags: generatedData.tags || []
        });
        showSuccess("Nome gerado e salvo!", "O nome foi gerado com sucesso e salvo no Supabase.");
      } else {
        showSuccess("Nome gerado!", "Nome criado com sucesso. Use o botão salvar para adicionar ao Supabase.");
      }
    } catch (error) {
      console.error('Error generating name:', error);
      showError("Erro ao gerar nome", error instanceof Error ? error.message : "Não foi possível gerar o nome do prompt.");
    } finally {
      setLoadingState('name', false);
    }
  };

  const handleGenerateTags = async () => {
    if (!currentPrompt?.content) {
      showError("Erro", "Nenhum conteúdo de prompt disponível para gerar tags.");
      return;
    }
    
    setLoadingState('tags', true);
    try {
      console.log('Generating tags for prompt:', currentPrompt.content);
      const tags = await gemini.generateTags(currentPrompt.content);
      console.log('Generated tags:', tags);
      
      if (!tags || tags.length === 0) {
        throw new Error('Nenhuma tag retornada');
      }
      
      setGeneratedData(prev => ({ ...prev, tags }));
      
      if (onPromptGenerated && autoSaveToSupabase) {
        onPromptGenerated({
          title: generatedData.name || currentPrompt.title,
          content: currentPrompt.content,
          category: currentPrompt.category,
          tags
        });
        showSuccess("Tags geradas e salvas!", "As tags foram geradas com sucesso e salvas no Supabase.");
      } else {
        showSuccess("Tags geradas!", "Tags criadas com sucesso. Use o botão salvar para adicionar ao Supabase.");
      }
    } catch (error) {
      console.error('Error generating tags:', error);
      showError("Erro ao gerar tags", error instanceof Error ? error.message : "Não foi possível gerar as tags do prompt.");
    } finally {
      setLoadingState('tags', false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!currentPrompt?.content) {
      showError("Erro", "Nenhum conteúdo de prompt disponível para gerar variações.");
      return;
    }
    
    setLoadingState('variations', true);
    try {
      console.log('Generating variations for:', currentPrompt.content);
      const variations = await gemini.generatePromptVariations(currentPrompt.content, 3);
      console.log('Generated variations:', variations);
      
      if (!variations || variations.length === 0) {
        throw new Error('Nenhuma variação foi gerada');
      }

      if (autoSaveToSupabase && onMultiplePromptsGenerated) {
        onMultiplePromptsGenerated(variations);
        showSuccess("Variações geradas e salvas!", `${variations.length} variações foram criadas e salvas automaticamente no Supabase.`);
      } else {
        showSuccess("Variações geradas!", `${variations.length} variações foram criadas. Use a opção de salvar no Supabase se desejar.`);
      }
    } catch (error) {
      console.error('Error generating variations:', error);
      showError("Erro ao gerar variações", error instanceof Error ? error.message : "Não foi possível gerar as variações do prompt.");
    } finally {
      setLoadingState('variations', false);
    }
  };

  const handleSaveCurrentToSupabase = () => {
    if (!currentPrompt || !onPromptGenerated) return;
    
    onPromptGenerated({
      title: generatedData.name || currentPrompt.title,
      content: currentPrompt.content,
      category: currentPrompt.category,
      tags: generatedData.tags || []
    });
    
    showSuccess("Salvo no Supabase!", "Prompt salvo com sucesso no banco de dados.");
  };

  if (!apiKey) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-center text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <p>Configure sua API Key do Google Gemini para usar essas funcionalidades.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuração de salvamento automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            Configurações de Salvamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-save">Salvar automaticamente no Supabase</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, os prompts gerados serão salvos automaticamente no banco de dados.
              </p>
            </div>
            <Switch
              id="auto-save"
              checked={autoSaveToSupabase}
              onCheckedChange={setAutoSaveToSupabase}
            />
          </div>
        </CardContent>
      </Card>

      {/* Funcionalidades para prompt atual */}
      {currentPrompt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Melhorar Prompt Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={handleGenerateName}
                disabled={loading.name}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading.name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Gerar Nome
              </Button>

              <Button
                onClick={handleGenerateTags}
                disabled={loading.tags}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading.tags ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Tag className="w-4 h-4" />
                )}
                Gerar Tags
              </Button>

              <Button
                onClick={handleGenerateVariations}
                disabled={loading.variations}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading.variations ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Gerar Variações
              </Button>
            </div>

            {/* Resultados gerados */}
            {generatedData.name && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome gerado:</Label>
                <div className="p-2 bg-muted/50 rounded text-sm">
                  {generatedData.name}
                </div>
              </div>
            )}

            {generatedData.tags && generatedData.tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags geradas:</Label>
                <div className="flex flex-wrap gap-2">
                  {generatedData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Botão para salvar manualmente no Supabase */}
            {!autoSaveToSupabase && (generatedData.name || generatedData.tags) && (
              <Button 
                onClick={handleSaveCurrentToSupabase}
                className="w-full"
                variant="outline"
              >
                <Database className="w-4 h-4 mr-2" />
                Salvar no Supabase
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
