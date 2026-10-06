
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTags, Tag } from '@/hooks/useTags';
import { TagInput } from './TagInput';

interface Link {
  id: string;
  title: string;
  url: string;
  created_at: string;
  updated_at: string;
  category_id?: string;
  description?: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  user_id: string;
  tagIds?: string[];
}

interface EditLinkFormProps {
  link: Link;
  onSubmit: (link: Link) => Promise<void>;
  onCancel: () => void;
}

export const EditLinkForm = ({ link, onSubmit, onCancel }: EditLinkFormProps) => {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const [description, setDescription] = useState(link.description || '');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { tags, addTag, getTagsByIds } = useTags();

  useEffect(() => {
    if (link.tagIds) {
      setSelectedTags(getTagsByIds(link.tagIds));
    }
  }, [link.tagIds, getTagsByIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !url.trim()) {
      toast({
        title: "ERRO DE VALIDAÇÃO",
        description: "Título e URL são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        ...link,
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || null,
        tagIds: selectedTags.map(tag => tag.id)
      });
    } catch (error) {
      toast({
        title: "ERRO",
        description: "Erro ao atualizar link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagSelect = (tag: Tag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleTagRemove = (tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm">
          Título
        </Label>
        <Input
          id="title"
          placeholder="Título do link"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-background border-border text-foreground font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="url" className="text-sm">
          URL
        </Label>
        <Input
          id="url"
          placeholder="URL do link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-background border-border text-foreground font-mono text-sm"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm">
          Descrição / Resumo
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição do link (opcional)..."
          className="bg-background border-border text-foreground font-mono text-sm"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags" className="text-sm">
          Tags
        </Label>
        <TagInput
          selectedTags={selectedTags}
          availableTags={tags}
          onTagAdd={addTag}
          onTagRemove={handleTagRemove}
          onTagSelect={handleTagSelect}
          placeholder="Adicionar tags..."
        />
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          className="border-destructive text-destructive hover:bg-destructive/10"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};
