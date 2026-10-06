import { useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, Send, Trash2, KeyRound, Users, Telescope, ExternalLink, Copy, Download, Share2, RefreshCw, MessageCirclePlus, Settings2, CheckCircle2, Loader2, Circle } from 'lucide-react';

type Provider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'opencode';
type Subtask = { role: string; task: string; result: string };
type Citation = string | { url?: string; title?: string };
type Message = {
  role: 'user' | 'assistant';
  content: string;
  subtasks?: Subtask[];
  citations?: Citation[];
  research?: boolean;
  query?: string;
};

type ResearchMode = 'quick' | 'reasoning' | 'deep' | 'exhaustive';
type Recency = '' | 'day' | 'week' | 'month' | 'year';
type Area = 'geral' | 'juridica' | 'cientifica' | 'saude' | 'financeira' | 'politica' | 'tecnologia' | 'administracao_publica';

const AREA_LABEL: Record<Area, string> = {
  geral: 'Geral', juridica: 'Jurídica', cientifica: 'Científica', saude: 'Saúde',
  financeira: 'Financeira', politica: 'Política', tecnologia: 'Tecnologia', administracao_publica: 'Adm. Pública',
};

const RESEARCH_STEPS = [
  'Entendendo a pergunta',
  'Dividindo em subtemas',
  'Criando plano de pesquisa',
  'Buscando fontes',
  'Analisando documentos',
  'Comparando informações',
  'Verificando divergências',
  'Avaliando confiabilidade',
  'Elaborando a resposta',
  'Revisando o relatório',
];


interface VaultItem { id: string; name: string; service: string | null }

const PROVIDERS: Record<Provider, { label: string; models: string[] }> = {
  openai:     { label: 'OpenAI',      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'] },
  anthropic:  { label: 'Anthropic',   models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'] },
  google:     { label: 'Google',      models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'] },
  openrouter: { label: 'OpenRouter',  models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.5-flash', 'meta-llama/llama-3.3-70b-instruct'] },
  opencode:   { label: 'OpenCode Zen', models: ['deepseek-v4-flash', 'deepseek-v4', 'qwen-2.5-coder', 'gpt-4o-mini'] },
};

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [keys, setKeys] = useState<VaultItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState(PROVIDERS.openai.models[0]);
  const [customModel, setCustomModel] = useState('');
  const [keyId, setKeyId] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [orchestrate, setOrchestrate] = useState(false);

  const [research, setResearch] = useState(true);
  const [researchMode, setResearchMode] = useState<ResearchMode>('deep');
  const [recency, setRecency] = useState<Recency>('');
  const [perplexityKeyId, setPerplexityKeyId] = useState<string>('');

  // Deep Research extras
  const [area, setArea] = useState<Area>('geral');
  const [language, setLanguage] = useState('pt-BR');
  const [minSources, setMinSources] = useState(6);
  const [preferOfficial, setPreferOfficial] = useState(true);
  const [preferPdf, setPreferPdf] = useState(false);
  const [domains, setDomains] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [followupCtx, setFollowupCtx] = useState<string>('');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sending || !research) { setStepIdx(0); return; }
    setStepIdx(0);
    const stepMs = researchMode === 'deep' || researchMode === 'exhaustive' ? 8000 : 2200;
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, RESEARCH_STEPS.length - 1)), stepMs);
    return () => clearInterval(t);
  }, [sending, research, researchMode]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingKeys(true);
      const { data, error } = await supabase
        .from('vault_items')
        .select('id, name, service')
        .order('created_at', { ascending: false });
      if (error) toast({ title: 'Erro ao carregar chaves', description: error.message, variant: 'destructive' });
      else setKeys((data ?? []) as VaultItem[]);
      setLoadingKeys(false);
    })();
  }, [user, toast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const suggestedKey = useMemo(() => {
    const pref = provider === 'openrouter' ? 'openrouter' : provider;
    return keys.find((k) => (k.service ?? '').toLowerCase().includes(pref)) ?? keys[0];
  }, [keys, provider]);

  useEffect(() => { if (!keyId && suggestedKey) setKeyId(suggestedKey.id); }, [suggestedKey, keyId]);

  const suggestedPerplexity = useMemo(
    () => keys.find((k) => (k.service ?? '').toLowerCase().includes('perplex')),
    [keys],
  );
  useEffect(() => {
    if (!perplexityKeyId && suggestedPerplexity) setPerplexityKeyId(suggestedPerplexity.id);
  }, [suggestedPerplexity, perplexityKeyId]);

  const changeProvider = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDERS[p].models[0]);
    setCustomModel('');
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    if (research) {
      if (!perplexityKeyId) { toast({ title: 'Selecione sua chave Perplexity', variant: 'destructive' }); return; }
    } else {
      if (!keyId) { toast({ title: 'Selecione uma chave', variant: 'destructive' }); return; }
      const effectiveModel = customModel.trim() || model;
      if (!effectiveModel) { toast({ title: 'Informe um modelo', variant: 'destructive' }); return; }
    }

    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      if (research) {
        const domainList = domains.split(/[\s,;]+/).map((d) => d.trim()).filter(Boolean);
        // "exhaustive" reutiliza pipeline deep no backend
        const backendMode = researchMode === 'exhaustive' ? 'deep' : researchMode;
        const { data, error } = await supabase.functions.invoke('deep-research', {
          body: {
            query: text,
            vault_item_id: perplexityKeyId,
            mode: backendMode,
            recency: recency || undefined,
            area, language,
            min_sources: researchMode === 'exhaustive' ? Math.max(minSources, 10) : minSources,
            prefer_official: preferOfficial,
            prefer_pdf: preferPdf,
            domains: domainList,
            followup_context: followupCtx || undefined,
          },
        });
        if (error) throw error;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        const r = data as { content: string; citations?: Citation[]; steps?: { role: string; task: string; result: string }[] };
        setMessages((m) => [...m, { role: 'assistant', content: r.content ?? '', citations: r.citations, subtasks: r.steps, research: true, query: text }]);
        setFollowupCtx('');
      } else {
        const effectiveModel = customModel.trim() || model;
        const { data, error } = await supabase.functions.invoke('llm-chat', {
          body: {
            provider,
            model: effectiveModel,
            vault_item_id: keyId,
            messages: next.map(({ role, content }) => ({ role, content })),
            orchestrate,
          },
        });
        if (error) throw error;
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
        const reply = (data as { reply: string }).reply ?? '';
        const subtasks = (data as { subtasks?: Subtask[] }).subtasks;
        setMessages((m) => [...m, { role: 'assistant', content: reply, subtasks }]);
      }
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally { setSending(false); }
  };

  const clear = () => { if (confirm('Limpar conversa?')) setMessages([]); };

  const citationUrl = (c: Citation) => (typeof c === 'string' ? c : c?.url ?? '');
  const citationLabel = (c: Citation, i: number) => {
    const url = citationUrl(c);
    const title = typeof c === 'object' ? c?.title : undefined;
    try { return title || new URL(url).hostname.replace(/^www\./, '') || `Fonte ${i + 1}`; }
    catch { return title || `Fonte ${i + 1}`; }
  };

  const buildMarkdown = (m: Message) => {
    const src = (m.citations ?? []).map((c, i) => {
      const url = citationUrl(c);
      return `${i + 1}. ${citationLabel(c, i)}${url ? ` — ${url}` : ''}`;
    }).join('\n');
    return `# Pesquisa: ${m.query ?? ''}\n\n${m.content}\n\n---\n\n## Fontes\n${src}\n\n_Gerado em ${new Date().toLocaleString('pt-BR')}_`;
  };

  const copyResult = async (m: Message) => {
    try { await navigator.clipboard.writeText(buildMarkdown(m)); toast({ title: 'Copiado' }); }
    catch { toast({ title: 'Falha ao copiar', variant: 'destructive' }); }
  };

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportMd = (m: Message) => downloadBlob(buildMarkdown(m), `pesquisa-${Date.now()}.md`, 'text/markdown');
  const exportDoc = (m: Message) => {
    const html = `<html><head><meta charset="utf-8"><title>Pesquisa</title></head><body><pre style="font-family:Georgia,serif;white-space:pre-wrap">${buildMarkdown(m).replace(/</g, '&lt;')}</pre></body></html>`;
    downloadBlob(html, `pesquisa-${Date.now()}.doc`, 'application/msword');
  };
  const exportPdf = (m: Message) => {
    const w = window.open('', '_blank');
    if (!w) { toast({ title: 'Popup bloqueado', variant: 'destructive' }); return; }
    w.document.write(`<html><head><title>Pesquisa</title><style>body{font-family:Georgia,serif;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.55}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${buildMarkdown(m).replace(/</g, '&lt;')}</pre><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const shareResult = async (m: Message) => {
    const text = buildMarkdown(m);
    try {
      if (navigator.share) await navigator.share({ title: 'Pesquisa', text });
      else { await navigator.clipboard.writeText(text); toast({ title: 'Copiado para compartilhar' }); }
    } catch { /* cancelado */ }
  };

  const redo = (m: Message) => { if (m.query) setInput(m.query); };
  const followup = (m: Message) => {
    setFollowupCtx(m.content.slice(0, 8000));
    toast({ title: 'Pergunta complementar', description: 'Digite a nova pergunta — o resultado anterior será usado como contexto.' });
  };


  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 h-12 border-b border-foreground/10 bg-card/80 backdrop-blur flex items-center gap-2 px-3">
        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
          <RouterLink to="/" title="Voltar"><ArrowLeft className="h-4 w-4" /></RouterLink>
        </Button>
        <MessageSquare className="h-4 w-4 text-primary" />
        <h1 className="font-mono font-black tracking-wide text-sm">CHAT LLM (BYOK)</h1>
        <div className="flex-1" />
        <Button onClick={clear} size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" disabled={messages.length === 0}>
          <Trash2 className="h-3.5 w-3.5" /> Limpar
        </Button>
      </header>

      {/* Toolbar */}
      <div className="border-b border-foreground/10 bg-card/40 p-3 space-y-2">
        {!research ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Provedor</label>
              <select
                value={provider}
                onChange={(e) => changeProvider(e.target.value as Provider)}
                className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm"
              >
                {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
                  <option key={p} value={p}>{PROVIDERS[p].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Modelo</label>
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setCustomModel(''); }}
                className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm"
              >
                {PROVIDERS[provider].models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Chave (Cofre)</label>
              <select
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                disabled={loadingKeys || keys.length === 0}
                className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm disabled:opacity-50"
              >
                {keys.length === 0 && <option value="">{loadingKeys ? 'Carregando…' : 'Nenhuma chave no cofre'}</option>}
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}{k.service ? ` · ${k.service}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Profundidade</label>
              <select
                value={researchMode}
                onChange={(e) => setResearchMode(e.target.value as ResearchMode)}
                className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm"
              >
                <option value="quick">Rápida</option>
                <option value="reasoning">Moderada</option>
                <option value="deep">Profunda</option>
                <option value="exhaustive">Exaustiva</option>

              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Período</label>
              <select
                value={recency}
                onChange={(e) => setRecency(e.target.value as Recency)}
                className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm"
              >
                <option value="">Qualquer</option>
                <option value="day">24h</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Chave Perplexity</label>
              <select
                value={perplexityKeyId}
                onChange={(e) => setPerplexityKeyId(e.target.value)}
                disabled={loadingKeys || keys.length === 0}
                className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm disabled:opacity-50"
              >
                {keys.length === 0 && <option value="">{loadingKeys ? 'Carregando…' : 'Nenhuma chave'}</option>}
                {keys.length > 0 && <option value="">Selecione…</option>}
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}{k.service ? ` · ${k.service}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {research && (
          <>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground hover:text-primary"
            >
              <Settings2 className="h-3 w-3" />
              {showSettings ? 'Ocultar configurações avançadas' : 'Configurações avançadas'}
            </button>
            {showSettings && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-foreground/10 bg-background/40 p-2">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Área</label>
                  <select value={area} onChange={(e) => setArea(e.target.value as Area)}
                    className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm">
                    {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
                      <option key={a} value={a}>{AREA_LABEL[a]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Idioma</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm">
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en">Inglês</option>
                    <option value="es">Espanhol</option>
                    <option value="fr">Francês</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Mín. fontes</label>
                  <input type="number" min={1} max={30} value={minSources}
                    onChange={(e) => setMinSources(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                    className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1 justify-end">
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input type="checkbox" checked={preferOfficial} onChange={(e) => setPreferOfficial(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                    Priorizar fontes oficiais
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input type="checkbox" checked={preferPdf} onChange={(e) => setPreferPdf(e.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                    Priorizar PDFs
                  </label>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Domínios priorizados (separe por vírgula)</label>
                  <input type="text" value={domains} onChange={(e) => setDomains(e.target.value)}
                    placeholder="ex: planalto.gov.br, stf.jus.br, nature.com"
                    className="w-full h-8 rounded-md bg-background border border-foreground/10 px-2 text-sm" />
                </div>
              </div>
            )}
          </>
        )}


        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={research}
                onChange={(e) => setResearch(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <Telescope className="h-3.5 w-3.5 text-primary" />
              <span className="font-black uppercase tracking-wide">Deep Research</span>
            </label>
            <label className={`flex items-center gap-1.5 text-[11px] select-none ${research ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={orchestrate}
                disabled={research}
                onChange={(e) => setOrchestrate(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="font-black uppercase tracking-wide">Orquestrador</span>
            </label>
          </div>
          {keys.length === 0 && !loadingKeys && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <KeyRound className="h-3 w-3" />
              Sem chaves. Adicione em{' '}
              <RouterLink to="/vault" className="text-primary underline">/vault</RouterLink>.
            </p>
          )}
        </div>
      </div>

      {/* Mensagens */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {research
                  ? 'Modo Deep Research ativo — sua pergunta será respondida com base em busca web (Perplexity BYOK).'
                  : 'Selecione provedor, modelo e chave. Digite abaixo para começar. A conversa não é salva.'}
              </CardContent>
            </Card>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex flex-col items-start gap-2'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-sm whitespace-pre-wrap break-words'
                    : 'max-w-[92%] rounded-2xl bg-card border border-foreground/10 px-3 py-2 text-sm break-words'
                }
              >
                {m.role === 'assistant' && (m.research || m.citations?.length) ? (
                  <article className="prose prose-sm prose-invert max-w-none prose-headings:font-mono prose-headings:font-black prose-a:text-primary prose-code:text-primary break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </article>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-foreground/10 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Fontes</div>
                    <ol className="text-xs space-y-1 list-decimal list-inside">
                      {m.citations.map((c, j) => {
                        const url = citationUrl(c);
                        return (
                          <li key={j} className="truncate">
                            {url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                 className="text-primary hover:underline inline-flex items-center gap-1">
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {citationLabel(c, j)}
                              </a>
                            ) : citationLabel(c, j)}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
                {m.role === 'assistant' && m.research && (

                  <div className="mt-3 pt-2 border-t border-foreground/10 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => copyResult(m)}><Copy className="h-3 w-3" /> Copiar</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => exportPdf(m)}><Download className="h-3 w-3" /> PDF</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => exportDoc(m)}><Download className="h-3 w-3" /> Word</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => exportMd(m)}><Download className="h-3 w-3" /> Markdown</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => shareResult(m)}><Share2 className="h-3 w-3" /> Compartilhar</Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => redo(m)}><RefreshCw className="h-3 w-3" /> Refazer</Button>
                    <Button size="sm" className="h-7 text-[11px] gap-1" onClick={() => followup(m)}><MessageCirclePlus className="h-3 w-3" /> Pergunta complementar</Button>
                  </div>
                )}
              </div>

              {m.subtasks && m.subtasks.length > 0 && (
                <details className="max-w-[85%] w-full rounded-xl border border-foreground/10 bg-card/40 px-3 py-2 text-xs">
                  <summary className="cursor-pointer flex items-center gap-1 font-black uppercase tracking-wide text-primary">
                    <Users className="h-3 w-3" /> {m.subtasks.length} sub-agente(s)
                  </summary>
                  <div className="mt-2 space-y-2">
                    {m.subtasks.map((s, j) => (
                      <div key={j} className="rounded-lg bg-background/60 border border-foreground/5 p-2">
                        <div className="font-mono text-[10px] uppercase text-primary">{s.role}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 italic">{s.task}</div>
                        <div className="text-[11px] mt-1 whitespace-pre-wrap break-words">{s.result}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex justify-start w-full">
              {research ? (
                <div className="w-full max-w-[92%] rounded-2xl bg-card border border-foreground/10 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wide text-primary">
                    <span className="flex items-center gap-1"><Telescope className="h-3 w-3" /> Pesquisa em andamento</span>
                    <span className="text-muted-foreground">{stepIdx + 1}/{RESEARCH_STEPS.length}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${((stepIdx + 1) / RESEARCH_STEPS.length) * 100}%` }} />
                  </div>
                  <ol className="space-y-1 mt-1">
                    {RESEARCH_STEPS.map((s, i) => {
                      const done = i < stepIdx;
                      const active = i === stepIdx;
                      return (
                        <li key={s} className={`flex items-center gap-2 text-[11px] ${active ? 'text-foreground' : done ? 'text-muted-foreground line-through' : 'text-muted-foreground/60'}`}>
                          {done ? <CheckCircle2 className="h-3 w-3 text-primary" /> : active ? <Loader2 className="h-3 w-3 animate-spin text-primary" /> : <Circle className="h-3 w-3" />}
                          {s}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <div className="rounded-2xl bg-card border border-foreground/10 px-3 py-2 text-sm text-muted-foreground animate-pulse">Pensando…</div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Composer */}
      <div className="border-t border-foreground/10 bg-card/60 p-3">
        <div className="max-w-3xl mx-auto space-y-2">
          {followupCtx && (
            <div className="flex items-center justify-between gap-2 text-[11px] rounded-md bg-primary/10 border border-primary/30 px-2 py-1">
              <span className="flex items-center gap-1 text-primary font-black uppercase tracking-wide">
                <MessageCirclePlus className="h-3 w-3" /> Pergunta complementar ativa (contexto da última pesquisa)
              </span>
              <button onClick={() => setFollowupCtx('')} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={2}
              placeholder={research
                ? 'Digite o tema ou a pergunta que deseja pesquisar profundamente...'
                : 'Digite sua mensagem (Enter envia, Shift+Enter quebra linha)'}
              className="min-h-[44px] resize-none"
              disabled={sending}
            />
            <Button onClick={send} disabled={sending || !input.trim()} size="sm" className="h-11 px-3 gap-1">
              {research ? <><Telescope className="h-4 w-4" /><span className="hidden sm:inline text-[11px] font-black uppercase">Iniciar</span></> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
