import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Prompt } from '@/types/entities';

export interface PromptFormValues {
  title: string;
  content: string;
  target_model: string;
  tags: string;
}

export const emptyPromptForm: PromptFormValues = { title: '', content: '', target_model: '', tags: '' };

export const promptToForm = (p: Prompt): PromptFormValues => ({
  title: p.title,
  content: p.content,
  target_model: p.target_model ?? '',
  tags: p.tags.join(', '),
});

interface Props {
  initial: PromptFormValues;
  isEditing: boolean;
  onSubmit: (values: PromptFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export default function PromptForm({ initial, isEditing, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<PromptFormValues>(initial);
  useEffect(() => setForm(initial), [initial]);

  const set = <K extends keyof PromptFormValues>(k: K, v: PromptFormValues[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
      className="rounded-2xl border border-foreground/10 bg-card p-4 mb-6 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-mono font-black text-sm">{isEditing ? 'Editar prompt' : 'Novo prompt'}</h2>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <Label className="text-xs">Título *</Label>
        <Input required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: Resumo executivo" />
      </div>
      <div>
        <Label className="text-xs">Prompt *</Label>
        <Textarea
          required
          rows={8}
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          placeholder="Escreva o prompt completo aqui..."
          className="font-mono text-sm"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Modelo alvo (opcional)</Label>
          <Input value={form.target_model} onChange={(e) => set('target_model', e.target.value)} placeholder="GPT-5, Claude, Gemini..." />
        </div>
        <div>
          <Label className="text-xs">Tags (separadas por vírgula)</Label>
          <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="código, resumo, tradução" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm">{isEditing ? 'Salvar' : 'Criar'}</Button>
      </div>
    </form>
  );
}
