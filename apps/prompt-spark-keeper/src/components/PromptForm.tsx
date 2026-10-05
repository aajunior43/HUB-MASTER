
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';
import { Prompt, CreatePromptData } from '@/types/prompt';

interface PromptFormProps {
  prompt?: Prompt;
  mode: 'create' | 'edit' | 'view';
  onDataChange: (data: CreatePromptData) => void;
  onCopy?: () => void;
}

export const PromptForm = ({ prompt, mode, onDataChange, onCopy }: PromptFormProps) => {
  const [formData, setFormData] = useState<CreatePromptData>({
    title: '',
    content: '',
    tags: [],
    category: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (prompt && (mode === 'edit' || mode === 'view')) {
      setFormData({
        title: prompt.title,
        content: prompt.content,
        tags: prompt.tags || [],
        category: prompt.category || ''
      });
    } else if (mode === 'create') {
      setFormData({
        title: '',
        content: '',
        tags: [],
        category: ''
      });
    }
    setTagInput('');
    setInstructions('');
  }, [prompt, mode]);

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags?.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleInstructionsApply = () => {
    if (instructions.trim()) {
      const enhancedContent = `${instructions.trim()}\n\n${formData.content}`;
      setFormData(prev => ({
        ...prev,
        content: enhancedContent
      }));
      setInstructions('');
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            placeholder="Digite o título do prompt"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            disabled={isReadOnly}
            className="bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            placeholder="Ex: Development, Marketing, Creative"
            value={formData.category || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            disabled={isReadOnly}
            className="bg-background"
          />
        </div>
      </div>

      {/* Configuração de Instruções */}
      {!isReadOnly && (
        <div className="space-y-2">
          <Label htmlFor="instructions">Instruções para o Prompt</Label>
          <div className="space-y-2">
            <Textarea
              id="instructions"
              placeholder="Digite instruções que serão adicionadas ao início do seu prompt (ex: 'Você é um especialista em marketing digital...')"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[80px] bg-background"
            />
            <Button
              onClick={handleInstructionsApply}
              disabled={!instructions.trim()}
              variant="outline"
              size="sm"
            >
              Aplicar Instruções ao Prompt
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo *</Label>
        <div className="relative">
          <Textarea
            id="content"
            placeholder="Digite o conteúdo do seu prompt aqui... Use [variavel] ou [variavel:placeholder] para criar variáveis."
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            disabled={isReadOnly}
            className="min-h-[200px] bg-background resize-none"
          />
          {mode === 'view' && onCopy && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCopy}
              className="absolute top-2 right-2"
            >
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma tag e pressione Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              className="bg-background"
            />
            <Button onClick={addTag} variant="outline" size="sm">
              Adicionar
            </Button>
          </div>
        )}
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-accent text-accent-foreground"
              >
                {tag}
                {!isReadOnly && (
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
