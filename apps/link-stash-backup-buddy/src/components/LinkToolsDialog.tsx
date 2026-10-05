import { useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, CopyCheck, Download, HeartPulse, Loader2, Search, Smartphone, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { findDuplicateLinkGroups } from '@/lib/duplicateLinks';
import type { Link } from '@/types/link';
import type { LinkHealthResult } from '@/hooks/useBrokenLinksChecker';

type ToolTab = 'duplicates' | 'health' | 'ai' | 'pwa';
type Provider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'opencode';
type VaultItem = { id: string; name: string; service: string | null };

export type AiLinkSuggestion = {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: Link[];
  healthResults: Record<string, LinkHealthResult>;
  isCheckingLinks: boolean;
  onCheckLinks: (ids?: string[]) => Promise<void>;
  onMergeDuplicates: (keeper: Link, duplicates: Link[]) => Promise<void>;
  onApplyAiSuggestion: (link: Link, suggestion: AiLinkSuggestion) => Promise<void>;
}

const PROVIDERS: Record<Provider, { label: string; model: string }> = {
  openai: { label: 'OpenAI', model: 'gpt-4o-mini' },
  openrouter: { label: 'OpenRouter', model: 'openai/gpt-4o-mini' },
  anthropic: { label: 'Anthropic', model: 'claude-3-5-haiku-latest' },
  google: { label: 'Google', model: 'gemini-2.5-flash' },
  opencode: { label: 'OpenCode', model: 'gpt-4o-mini' },
};

const inferProvider = (service: string | null): Provider | null => {
  const value = (service ?? '').toLowerCase();
  if (value.includes('openrouter')) return 'openrouter';
  if (value.includes('anthropic') || value.includes('claude')) return 'anthropic';
  if (value.includes('google') || value.includes('gemini')) return 'google';
  if (value.includes('opencode')) return 'opencode';
  if (value.includes('openai')) return 'openai';
  return null;
};

function extractJson<T>(value: string): T {
  const cleaned = value.replace(/```json\s*|\s*```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('A IA não retornou dados válidos.');
  return JSON.parse(match[0]) as T;
}

export function LinkToolsDialog({
  open,
  onOpenChange,
  links,
  healthResults,
  isCheckingLinks,
  onCheckLinks,
  onMergeDuplicates,
  onApplyAiSuggestion,
}: Props) {
  const [tab, setTab] = useState<ToolTab>('duplicates');
  const [busyGroup, setBusyGroup] = useState('');
  const [keys, setKeys] = useState<VaultItem[]>([]);
  const [keyId, setKeyId] = useState('');
  const [provider, setProvider] = useState<Provider>('openai');
  const [selectedLinkId, setSelectedLinkId] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<AiLinkSuggestion | null>(null);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticMatches, setSemanticMatches] = useState<string[]>([]);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const duplicates = useMemo(() => findDuplicateLinkGroups(links), [links]);
  const activeLinks = useMemo(() => links.filter((link) => !link.deleted_at), [links]);
  const selectedLink = activeLinks.find((link) => link.id === selectedLinkId);
  const health = Object.values(healthResults);
  const brokenCount = health.filter((item) => item.status === 'broken').length;

  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', listener);
    return () => window.removeEventListener('beforeinstallprompt', listener);
  }, []);

  useEffect(() => {
    if (!open) return;
    supabase.from('vault_items').select('id,name,service').order('created_at', { ascending: false })
      .then(({ data }) => setKeys((data ?? []) as VaultItem[]));
  }, [open]);

  useEffect(() => {
    if (!keyId && keys[0]) {
      setKeyId(keys[0].id);
      const inferred = inferProvider(keys[0].service);
      if (inferred) setProvider(inferred);
    }
    if (!selectedLinkId && activeLinks[0]) setSelectedLinkId(activeLinks[0].id);
  }, [activeLinks, keyId, keys, selectedLinkId]);

  const askAi = async (messages: Array<{ role: 'system' | 'user'; content: string }>) => {
    if (!keyId) throw new Error('Adicione ou selecione uma chave no Cofre.');
    const { data, error } = await supabase.functions.invoke('llm-chat', {
      body: { provider, model: PROVIDERS[provider].model, vault_item_id: keyId, messages },
    });
    if (error) throw error;
    return String(data?.reply ?? '');
  };

  const generateSuggestion = async () => {
    if (!selectedLink) return;
    setAiBusy(true);
    setSuggestion(null);
    try {
      const reply = await askAi([
        {
          role: 'system',
          content: 'Você organiza favoritos. Retorne APENAS JSON válido: {"title":"...","description":"...","category":"...","tags":["..."]}. Use português, descrição de até 180 caracteres, categoria curta e no máximo 5 tags.',
        },
        {
          role: 'user',
          content: `Analise este favorito sem inventar conteúdo que não seja inferível da URL e dos dados fornecidos.\nTítulo: ${selectedLink.title}\nURL: ${selectedLink.url}\nDescrição: ${selectedLink.description ?? ''}`,
        },
      ]);
      setSuggestion(extractJson<AiLinkSuggestion>(reply));
    } catch (error) {
      setSuggestion({ description: error instanceof Error ? error.message : 'Falha ao consultar a IA.' });
    } finally {
      setAiBusy(false);
    }
  };

  const semanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setAiBusy(true);
    setSemanticMatches([]);
    try {
      const catalog = activeLinks.slice(0, 250).map((link) => ({
        id: link.id, title: link.title, url: link.url, description: link.description,
      }));
      const reply = await askAi([
        {
          role: 'system',
          content: 'Selecione favoritos semanticamente relacionados à consulta. Retorne APENAS JSON válido: {"ids":["uuid"]}, no máximo 12 IDs e somente IDs existentes no catálogo.',
        },
        { role: 'user', content: `Consulta: ${semanticQuery}\nCatálogo: ${JSON.stringify(catalog)}` },
      ]);
      const parsed = extractJson<{ ids?: string[] }>(reply);
      const validIds = new Set(activeLinks.map((link) => link.id));
      setSemanticMatches((parsed.ids ?? []).filter((id) => validIds.has(id)).slice(0, 12));
    } finally {
      setAiBusy(false);
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    await (installPrompt as Event & { prompt: () => Promise<void> }).prompt();
    setInstallPrompt(null);
  };

  const tabs: Array<{ id: ToolTab; label: string; icon: typeof CopyCheck }> = [
    { id: 'duplicates', label: 'Duplicados', icon: CopyCheck },
    { id: 'health', label: 'Monitor', icon: HeartPulse },
    { id: 'ai', label: 'IA', icon: Bot },
    { id: 'pwa', label: 'Aplicativo', icon: Smartphone },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ferramentas inteligentes</DialogTitle>
          <DialogDescription>Manutenção, organização e automação sem sobrecarregar a lista principal.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <Button key={id} variant={tab === id ? 'default' : 'ghost'} size="sm" onClick={() => setTab(id)} className="gap-1.5">
              <Icon className="h-3.5 w-3.5" /> {label}
            </Button>
          ))}
        </div>

        {tab === 'duplicates' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-card p-3">
              <p className="font-bold">{duplicates.length} grupo(s) encontrado(s)</p>
              <p className="text-xs text-muted-foreground">Parâmetros de rastreamento, protocolo, “www” e fragmentos são ignorados.</p>
            </div>
            {duplicates.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />Nenhum duplicado.</div>
            ) : duplicates.map((group) => (
              <div key={group[0].id} className="rounded-xl border border-border/60 p-3 space-y-2">
                {group.map((link, index) => (
                  <div key={link.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-center text-xs font-black text-muted-foreground">{index + 1}</span>
                    <span className="flex-1 min-w-0 truncate font-semibold">{link.title}</span>
                    <span className="hidden sm:block max-w-56 truncate text-xs text-muted-foreground">{link.url}</span>
                  </div>
                ))}
                <Button
                  size="sm"
                  disabled={busyGroup === group[0].id}
                  onClick={async () => {
                    setBusyGroup(group[0].id);
                    await onMergeDuplicates(group[0], group.slice(1));
                    setBusyGroup('');
                  }}
                >
                  {busyGroup === group[0].id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Mesclar mantendo o primeiro
                </Button>
              </div>
            ))}
          </div>
        )}

        {tab === 'health' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border p-3"><p className="text-2xl font-black">{health.length}</p><p className="text-xs text-muted-foreground">verificados</p></div>
              <div className="rounded-xl border p-3"><p className="text-2xl font-black text-destructive">{brokenCount}</p><p className="text-xs text-muted-foreground">com falha</p></div>
              <div className="rounded-xl border p-3"><p className="text-2xl font-black text-green-500">{health.length - brokenCount}</p><p className="text-xs text-muted-foreground">saudáveis</p></div>
            </div>
            <Button onClick={() => onCheckLinks()} disabled={isCheckingLinks} className="gap-2">
              {isCheckingLinks ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
              Verificar todos agora
            </Button>
            <div className="space-y-1">
              {health.filter((item) => item.status === 'broken').map((item) => {
                const link = links.find((candidate) => candidate.id === item.link_id);
                return (
                  <div key={item.link_id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-sm">
                    <p className="font-bold truncate">{link?.title ?? item.link_id}</p>
                    <p className="text-xs text-muted-foreground">{item.reason ?? 'Falha'} · {item.latency_ms} ms</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-2">
              <select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="h-9 rounded-lg border bg-background px-2 text-sm">
                {(Object.keys(PROVIDERS) as Provider[]).map((item) => <option key={item} value={item}>{PROVIDERS[item].label}</option>)}
              </select>
              <select
                value={keyId}
                onChange={(event) => {
                  setKeyId(event.target.value);
                  const inferred = inferProvider(keys.find((key) => key.id === event.target.value)?.service ?? null);
                  if (inferred) setProvider(inferred);
                }}
                className="h-9 rounded-lg border bg-background px-2 text-sm sm:col-span-2"
              >
                {keys.length === 0 && <option value="">Nenhuma chave no Cofre</option>}
                {keys.map((key) => <option key={key.id} value={key.id}>{key.name}{key.service ? ` · ${key.service}` : ''}</option>)}
              </select>
            </div>

            <div className="rounded-xl border p-3 space-y-2">
              <p className="font-bold flex items-center gap-2"><WandSparkles className="h-4 w-4" />Enriquecer link</p>
              <select value={selectedLinkId} onChange={(event) => { setSelectedLinkId(event.target.value); setSuggestion(null); }} className="w-full h-9 rounded-lg border bg-background px-2 text-sm">
                {activeLinks.map((link) => <option key={link.id} value={link.id}>{link.title}</option>)}
              </select>
              <Button size="sm" onClick={generateSuggestion} disabled={aiBusy || !selectedLink} className="gap-1.5">
                {aiBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Gerar título, resumo, categoria e tags
              </Button>
              {suggestion && (
                <div className="rounded-lg bg-muted/60 p-3 text-sm space-y-1">
                  {suggestion.title && <p><strong>Título:</strong> {suggestion.title}</p>}
                  {suggestion.description && <p><strong>Resumo:</strong> {suggestion.description}</p>}
                  {suggestion.category && <p><strong>Categoria:</strong> {suggestion.category}</p>}
                  {suggestion.tags?.length ? <p><strong>Tags:</strong> {suggestion.tags.join(', ')}</p> : null}
                  {selectedLink && (
                    <Button size="sm" className="mt-2" onClick={() => onApplyAiSuggestion(selectedLink, suggestion)}>Aplicar sugestão</Button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-3 space-y-2">
              <p className="font-bold flex items-center gap-2"><Search className="h-4 w-4" />Busca semântica</p>
              <div className="flex gap-2">
                <Input value={semanticQuery} onChange={(event) => setSemanticQuery(event.target.value)} placeholder="Ex.: materiais para aprender programação" />
                <Button size="sm" onClick={semanticSearch} disabled={aiBusy} aria-label="Buscar"><Search className="h-4 w-4" /></Button>
              </div>
              {semanticMatches.map((id) => {
                const link = links.find((item) => item.id === id);
                return link ? <a key={id} href={link.url} target="_blank" rel="noreferrer" className="block rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold hover:text-primary">{link.title}</a> : null;
              })}
            </div>
          </div>
        )}

        {tab === 'pwa' && (
          <div className="py-8 text-center space-y-3">
            <Smartphone className="mx-auto h-12 w-12 text-primary" />
            <div><p className="text-lg font-black">JR Links como aplicativo</p><p className="text-sm text-muted-foreground">Acesso rápido, tela independente e cache da interface para abertura offline.</p></div>
            {installPrompt ? (
              <Button onClick={install} className="gap-2"><Download className="h-4 w-4" />Instalar aplicativo</Button>
            ) : (
              <p className="text-xs text-muted-foreground">Se já estiver instalado, abra pelo menu de aplicativos. No iPhone, use Compartilhar → Adicionar à Tela de Início.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
