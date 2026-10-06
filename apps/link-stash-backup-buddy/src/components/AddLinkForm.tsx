
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTags, Tag } from '@/hooks/useTags';
import { TagInput } from './TagInput';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LinkData {
  id: string;
  title: string;
  url: string;
  description?: string;
  category_id?: string;
}

interface AddLinkFormProps {
  onSubmit: (link: { title: string; url: string; description?: string; categoryId?: string; tagIds?: string[] }) => Promise<void>;
  onCancel: () => void;
  existingLinks: LinkData[];
  initialUrl?: string;
  initialTitle?: string;
}

const normalizeUrl = (u: string) => {
  try {
    const obj = new URL(u.startsWith('http') ? u : `https://${u}`);
    return obj.hostname.replace('www.', '') + obj.pathname.replace(/\/$/, '') + obj.search;
  } catch { return u.toLowerCase().trim(); }
};

export const AddLinkForm = ({ onSubmit, onCancel, existingLinks, initialUrl, initialTitle }: AddLinkFormProps) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();

  const duplicateLink = useMemo(() => {
    if (!url.trim()) return null;
    const normalized = normalizeUrl(url.trim());
    return existingLinks?.find(l => normalizeUrl(l.url) === normalized) ?? null;
  }, [url, existingLinks]);
  const { tags, addTag } = useTags();

  const fetchUrlPreview = useCallback(async (urlToFetch: string) => {
    const trimmed = urlToFetch.trim();
    if (!trimmed) return;

    let fullUrl = trimmed;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }

    setIsFetchingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-preview', { body: { url: fullUrl } });
      if (error) throw error;
      if (data?.title) setTitle((current) => current.trim() ? current : data.title);
      if (data?.description) setDescription((current) => current.trim() ? current : data.description);
      setPreviewImage(data?.image ?? null);
    } catch {
      // silent fail — user can still fill manually
    } finally {
      setIsFetchingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (initialUrl && !initialTitle) fetchUrlPreview(initialUrl);
  }, [fetchUrlPreview, initialTitle, initialUrl]);

  const handleUrlBlur = () => {
    fetchUrlPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !url.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e a URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit({
        title: title.trim(),
        url: url.trim(),
        description: description.trim() || undefined,
        tagIds: selectedTags.map(tag => tag.id)
      });
      resetForm();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setUrl('');
    setDescription('');
    setSelectedTags([]);
    setPreviewImage(null);
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
        <Label htmlFor="url" className="text-sm">
          URL
        </Label>
        <div className="relative">
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="URL do link"
            className="bg-background border-border text-foreground font-mono text-sm pr-8"
            disabled={isLoading}
          />
          {isFetchingPreview && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        {isFetchingPreview && (
          <p className="text-[11px] text-muted-foreground font-bold">Buscando informações do link...</p>
        )}
        {!isFetchingPreview && duplicateLink && (
          <p className="text-[11px] font-bold text-destructive flex items-center gap-1">
            ⚠️ Já salvo como <span className="underline truncate max-w-[200px]">{duplicateLink.title}</span>
          </p>
        )}
        {!isFetchingPreview && previewImage && (
          <div className="flex items-center gap-2 p-2 border-2 border-foreground/20 rounded-md bg-muted/40">
            <img
              src={previewImage}
              alt="preview"
              className="w-14 h-10 object-cover rounded border border-foreground/20 shrink-0"
              onError={() => setPreviewImage(null)}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{title || url}</p>
              <p className="text-[11px] text-muted-foreground truncate">{description}</p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm">
          Título
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do link"
          className="text-sm"
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
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading || isFetchingPreview}
        >
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
};
