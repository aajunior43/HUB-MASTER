import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import PromptForm, {
  emptyPromptForm,
  promptToForm,
  type PromptFormValues,
} from '@/components/prompts/PromptForm';
import PromptCard from '@/components/prompts/PromptCard';
import { useAsyncList, withToast } from '@/hooks/useAsyncList';
import type { Prompt } from '@/types/entities';


type Provider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'opencode';
interface VaultItem { id: string; name: string; service: string | null }

const PROVIDERS: Record<Provider, { label: string; models: string[] }> = {
  openai:     { label: 'OpenAI',       models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'] },
  anthropic:  { label: 'Anthropic',    models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'] },
  google:     { label: 'Google',       models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'] },
  openrouter: { label: 'OpenRouter',   models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-flash'] },
  opencode:   { label: 'OpenCode Zen', models: ['deepseek-v4-flash', 'gpt-4o-mini'] },
};

const AI_SYSTEM = `Você é um engenheiro de prompts sênior. Dado um tema/objetivo do usuário, produza UM prompt reutilizável, em português, contendo: papel/persona, contexto necessário, instruções passo a passo, formato de saída esperado e restrições/critérios de qualidade.

Exemplo de estrutura ideal:
"Identifique falhas, erros de lógica e bugs no código fornecido. Forneça a correção exata para cada problema encontrado, acompanhada de uma explicação clara sobre a causa raiz e a solução aplicada, garantindo que o código funcione perfeitamente e sem erros."

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO, sem markdown, no formato:
{"title": "curto e descritivo (máx 60 chars)", "content": "o prompt completo em markdown", "tags": ["3-5 tags curtas em minúsculo"], "target_model": "modelo sugerido ou string vazia"}`;

function extractJson(text: string): { title?: string; content?: string; tags?: string[]; target_model?: string } {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try { return JSON.parse(match[0]); } catch { return {}; }
}

export default function Prompts() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<PromptFormValues>(emptyPromptForm);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiStyle, setAiStyle] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [keys, setKeys] = useState<VaultItem[]>([]);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState<string>(PROVIDERS.openai.models[0]);
  const [keyId, setKeyId] = useState<string>('');
  const [liveModels, setLiveModels] = useState<string[] | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from('vault_items')
        .select('id, name, service')
        .order('created_at', { ascending: false });
      if (!error) setKeys((data ?? []) as VaultItem[]);
    })();
  }, [user]);

  // Infere o provider a partir do "service" da chave selecionada.
  useEffect(() => {
    if (!keyId) return;
    const k = keys.find((x) => x.id === keyId);
    const svc = (k?.service ?? '').toLowerCase();
    const detected: Provider | null =
      svc.includes('openrouter') ? 'openrouter' :
      svc.includes('anthropic') || svc.includes('claude') ? 'anthropic' :
      svc.includes('google') || svc.includes('gemini') ? 'google' :
      svc.includes('opencode') ? 'opencode' :
      svc.includes('openai') || svc.includes('gpt') ? 'openai' : null;
    if (detected && detected !== provider) {
      setProvider(detected);
      setModel(PROVIDERS[detected].models[0]);
    }
  }, [keyId, keys, provider]);

  // Sugere chave inicial pelo provider atual.
  useEffect(() => {
    if (keyId) return;
    const pref = provider === 'openrouter' ? 'openrouter' : provider;
    const suggested = keys.find((k) => (k.service ?? '').toLowerCase().includes(pref)) ?? keys[0];
    if (suggested) setKeyId(suggested.id);
  }, [keys, provider, keyId]);

  // Consulta modelos reais permitidos pela chave.
  useEffect(() => {
    if (!keyId || !aiOpen) { setLiveModels(null); return; }
    let cancelled = false;
    setLoadingModels(true);
    setLiveModels(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('list-models', {
          body: { provider, vault_item_id: keyId },
        });
        if (cancelled) return;
        if (error) throw error;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        const models = ((data as { models?: string[] }).models ?? []).slice(0, 500);
        setLiveModels(models);
        if (models.length && !models.includes(model)) setModel(models[0]);
      } catch (e) {
        if (!cancelled) toast.error(`Não foi possível listar modelos: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyId, provider, aiOpen]);

  const availableModels = liveModels && liveModels.length > 0 ? liveModels : PROVIDERS[provider].models;


  async function generateWithAI() {
    if (aiTopic.trim().length < 3) { toast.error('Descreva o tema com mais detalhes.'); return; }
    if (!keyId) { toast.error('Selecione uma chave do cofre.'); return; }
    setAiLoading(true);
    try {
      const userMsg = `Tema/objetivo: ${aiTopic.trim()}${aiStyle.trim() ? `\nEstilo/tom: ${aiStyle.trim()}` : ''}`;
      const { data, error } = await supabase.functions.invoke('llm-chat', {
        body: {
          provider,
          model,
          vault_item_id: keyId,
          messages: [
            { role: 'system', content: AI_SYSTEM },
            { role: 'user', content: userMsg },
          ],
        },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const reply = (data as { reply?: string }).reply ?? '';
      const parsed = extractJson(reply);
      if (!parsed.content) throw new Error('A IA não retornou um prompt válido. Tente novamente.');
      setEditingId(null);
      setFormInitial({
        title: (parsed.title ?? '').slice(0, 120),
        content: parsed.content,
        target_model: parsed.target_model ?? model,
        tags: Array.isArray(parsed.tags) ? parsed.tags.join(', ') : '',
      });
      setShowForm(true);
      setAiOpen(false);
      setAiTopic('');
      setAiStyle('');
      toast.success('Prompt gerado — revise e salve.');
    } catch (e) {
      toast.error((e as Error).message || 'Falha ao gerar prompt');
    } finally {
      setAiLoading(false);
    }
  }

  const fetcher = useCallback(async () => {
    if (!user) return [];
    return withToast<Prompt[]>(
      supabase
        .from('ai_prompts')
        .select('id,title,content,target_model,tags,updated_at')
        .order('updated_at', { ascending: false }),
    );
  }, [user]);

  const { items, loading, reload } = useAsyncList<Prompt>({
    fetcher,
    deps: [user?.id],
    enabled: !!user,
  });

  function openNew() {
    setEditingId(null);
    setFormInitial(emptyPromptForm);
    setShowForm(true);
  }

  function openEdit(p: Prompt) {
    setEditingId(p.id);
    setFormInitial(promptToForm(p));
    setShowForm(true);
  }

  async function submit(values: PromptFormValues) {
    if (!user) return;
    const payload = {
      user_id: user.id,
      title: values.title.trim(),
      content: values.content.trim(),
      target_model: values.target_model.trim() || null,
      tags: values.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const { error } = editingId
      ? await supabase.from('ai_prompts').update(payload).eq('id', editingId)
      : await supabase.from('ai_prompts').insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? 'Prompt atualizado' : 'Prompt salvo');
    setShowForm(false);
    setEditingId(null);
    reload();
  }

  async function confirmDelete() {
    const id = toDelete;
    setToDelete(null);
    if (!id) return;
    const { error } = await supabase.from('ai_prompts').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    reload();
  }

  async function copyPrompt(content: string) {
    await navigator.clipboard.writeText(content);
    toast.success('Copiado');
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader crumb="/ prompts" />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h1 className="font-mono font-black text-xl tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Prompts de IA
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Biblioteca pessoal de prompts</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAiOpen(true)}>
              <Wand2 className="h-4 w-4 mr-1" /> Gerar com IA
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, conteúdo ou tag..."
            className="pl-9"
          />
        </div>

        {showForm && (
          <PromptForm
            initial={formInitial}
            isEditing={!!editingId}
            onSubmit={submit}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-foreground/10 rounded-2xl">
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? 'Nenhum prompt salvo ainda.' : 'Nenhum resultado.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onCopy={copyPrompt}
                onEdit={openEdit}
                onDelete={setToDelete}
              />
            ))}
          </ul>
        )}
      </main>

      <Dialog open={aiOpen} onOpenChange={(o) => !aiLoading && setAiOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Wand2 className="h-4 w-4 text-primary" /> Gerar prompt com IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tema ou objetivo *</Label>
              <Textarea
                autoFocus
                rows={3}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Ex: prompt para revisar código React buscando bugs e melhorias de performance"
              />
            </div>
            <div>
              <Label className="text-xs">Estilo/tom (opcional)</Label>
              <Input
                value={aiStyle}
                onChange={(e) => setAiStyle(e.target.value)}
                placeholder="técnico e conciso, didático, formal…"
              />
            </div>
            <div>
              <Label className="text-xs">Chave do cofre</Label>
              <select
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                className="w-full h-9 px-2 rounded-md bg-background border border-foreground/10 text-sm"
              >
                <option value="">— selecione —</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}{k.service ? ` · ${k.service}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Provedor</Label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const p = e.target.value as Provider;
                    setProvider(p);
                    setModel(PROVIDERS[p].models[0]);
                  }}
                  className="w-full h-9 px-2 rounded-md bg-background border border-foreground/10 text-sm"
                >
                  {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
                    <option key={p} value={p}>{PROVIDERS[p].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">
                  Modelo {loadingModels && <span className="text-muted-foreground">(carregando…)</span>}
                  {!loadingModels && liveModels && (
                    <span className="text-muted-foreground">({liveModels.length} disponíveis)</span>
                  )}
                </Label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={loadingModels}
                  className="w-full h-9 px-2 rounded-md bg-background border border-foreground/10 text-sm disabled:opacity-60"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {keys.length === 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Nenhuma chave salva. Cadastre no <a href="/vault" className="underline">Cofre de Chaves</a> primeiro.
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              Usa sua chave BYOK do cofre — a mesma do Chat. Você poderá revisar o prompt antes de salvar.
            </p>

          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)} disabled={aiLoading}>
              Cancelar
            </Button>
            <Button size="sm" onClick={generateWithAI} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
              {aiLoading ? 'Gerando…' : 'Gerar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir este prompt?"
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
