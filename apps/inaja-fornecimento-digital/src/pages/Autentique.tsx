import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, FileSignature, FileText, Folder, Gauge, Link2, Loader2, Mail, MessageCircle, Pencil, Plus, RefreshCw, Send, Settings2, Trash2, UploadCloud, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/integrations/db/client";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { normalizarTelefoneAutentique } from "@/lib/telefone";

type Signatario = { nome: string; canal: "email" | "whatsapp" | "sms" | "link"; email: string; phone: string };
type Envio = {
  id: string;
  documento_nome: string;
  signatario_nome: string;
  signatarios_json: string;
  status: string;
  assinatura_link: string | null;
  arquivo_original_url: string | null;
  arquivo_assinado_url: string | null;
  pasta_id?: string | null;
  sandbox: number;
  criado_por: string | null;
  criado_em: string;
};
type ContaToken = {
  tokenId: string;
  tokenNome: string;
  conta: { name?: string; email?: string; subscription?: { documents?: number; credits?: number } } | null;
  erro: string | null;
};
type OpcoesDocumento = { refusable: boolean; sortable: boolean; stop_on_rejected: boolean; scrolling_required: boolean; ignore_cpf: boolean; notification_finished: boolean; notification_signed: boolean };
type AssinaturaRemota = { public_id: string; name?: string | null; email?: string | null; delivery_method?: string | null; user?: { name?: string; email?: string; phone?: string }; viewed?: { created_at?: string }; signed?: { created_at?: string }; rejected?: { created_at?: string }; link?: { short_link?: string } };
type DocumentoRemoto = { id: string; name: string; message?: string; refusable?: boolean; sortable?: boolean; stop_on_rejected?: boolean; scrolling_required?: boolean; ignore_cpf?: boolean; deadline_at?: string | null; signatures?: AssinaturaRemota[] };
type PastaRemota = { id: string; name: string; children_counter?: number };

const novoSignatario = (): Signatario => ({ nome: "", canal: "email", email: "", phone: "+55" });
const opcoesIniciais: OpcoesDocumento = { refusable: true, sortable: false, stop_on_rejected: false, scrolling_required: false, ignore_cpf: false, notification_finished: true, notification_signed: true };

const statusTexto: Record<string, string> = {
  aguardando_assinaturas: "Aguardando assinaturas",
  visualizado: "Visualizado",
  parcialmente_assinado: "Parcialmente assinado",
  assinado: "Assinado",
  recusado: "Recusado",
  falha_entrega: "Falha na entrega",
  excluido: "Excluído",
};

const statusClasse: Record<string, string> = {
  assinado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  recusado: "border-destructive/30 bg-destructive/10 text-destructive",
  visualizado: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  parcialmente_assinado: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  falha_entrega: "border-destructive/30 bg-destructive/10 text-destructive",
  excluido: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(arquivo);
  });
}

async function chamarApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error) throw new Error(payload?.error?.message || "Falha ao comunicar com o servidor.");
  return payload.data as T;
}

export default function Autentique() {
  const { user } = useAuth();
  const { confirm, confirmElement } = useConfirm();
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [signatarios, setSignatarios] = useState<Signatario[]>([novoSignatario()]);
  const [sandbox, setSandbox] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesDocumento>(opcoesIniciais);
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [contas, setContas] = useState<ContaToken[]>([]);
  const [gerenciando, setGerenciando] = useState<Envio | null>(null);
  const [documento, setDocumento] = useState<DocumentoRemoto | null>(null);
  const [acaoEmCurso, setAcaoEmCurso] = useState("");
  const [novoAssinante, setNovoAssinante] = useState({ canal: "email", name: "", email: "", phone: "+55" });
  const [pastas, setPastas] = useState<PastaRemota[]>([]);
  const [pastaSelecionada, setPastaSelecionada] = useState("");
  const [pastasAbertas, setPastasAbertas] = useState(false);
  const [novaPasta, setNovaPasta] = useState("");

  const formularioValido = useMemo(() => Boolean(
    nome.trim() && arquivo && signatarios.length > 0 && signatarios.every((item) => item.canal === "whatsapp" || item.canal === "sms"
      ? Boolean(normalizarTelefoneAutentique(item.phone))
      : item.canal === "link" ? Boolean(item.nome.trim()) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email.trim())),
  ), [arquivo, nome, signatarios]);

  const carregarEnvios = useCallback(async () => {
    if (!user) return;
    setCarregando(true);
    const [{ data, error }, config, contasResult] = await Promise.all([
      db.rpc("autentique_envios_listar", { _caller: user }),
      chamarApi<{ configurado: boolean; tokensAtivos: number }>("/api/autentique/config").catch(() => ({ configurado: false, tokensAtivos: 0 })),
      chamarApi<ContaToken[]>("/api/autentique/contas").catch(() => []),
    ]);
    setConfigurado(config.configurado);
    setContas(contasResult);
    if (error) toast({ title: "Não foi possível carregar os envios", description: error.message, variant: "destructive" });
    else setEnvios((data as Envio[]) || []);
    setCarregando(false);
  }, [user]);

  useEffect(() => { void carregarEnvios(); }, [carregarEnvios]);

  function atualizarSignatario<K extends keyof Signatario>(indice: number, campo: K, valor: Signatario[K]) {
    setSignatarios((atuais) => atuais.map((item, i) => i === indice ? { ...item, [campo]: valor } : item));
  }

  async function enviar() {
    if (!formularioValido || !arquivo) return;
    if (arquivo.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O PDF deve ter no máximo 20 MB.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      const contentBase64 = await arquivoParaBase64(arquivo);
      await chamarApi("/api/autentique/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), mensagem: mensagem.trim(), signatarios: signatarios.map((item) => item.canal === "whatsapp" || item.canal === "sms" ? { ...item, phone: normalizarTelefoneAutentique(item.phone) } : item), contentBase64, mime: arquivo.type, arquivoNome: arquivo.name, sandbox, opcoes }),
      });
      toast({ title: sandbox ? "Documento de teste enviado" : "Documento enviado para assinatura", description: `${signatarios.length} signatário(s) recebeu(ram) a solicitação.` });
      setNome("");
      setMensagem("");
      setArquivo(null);
      setSignatarios([novoSignatario()]);
      setOpcoes(opcoesIniciais);
      await carregarEnvios();
    } catch (error) {
      toast({ title: "Não foi possível enviar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  }

  async function sincronizar(id: string) {
    setSincronizando(id);
    try {
      await chamarApi("/api/autentique/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await carregarEnvios();
      toast({ title: "Status atualizado" });
    } catch (error) {
      toast({ title: "Não foi possível atualizar", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setSincronizando(null);
    }
  }

  async function carregarDocumento(envio: Envio) {
    if (gerenciando?.id !== envio.id) setPastaSelecionada(envio.pasta_id || "");
    setGerenciando(envio);
    setDocumento(null);
    setAcaoEmCurso("carregar");
    try {
      const remoto = await chamarApi<DocumentoRemoto>("/api/autentique/documento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: envio.id }) });
      setDocumento(remoto);
    } catch (error) {
      toast({ title: "Não foi possível abrir o documento", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
      setGerenciando(null);
    } finally { setAcaoEmCurso(""); }
  }

  async function operar(acao: string, dados: Record<string, unknown> = {}, fechar = false) {
    if (!gerenciando) return;
    setAcaoEmCurso(acao);
    try {
      const resultado = await chamarApi<Record<string, unknown>>("/api/autentique/operar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: gerenciando.id, acao, dados }) });
      if (acao === "criar_link") {
        const link = (resultado?.createLinkToSignature as { short_link?: string } | undefined)?.short_link;
        if (link) await navigator.clipboard.writeText(link);
        toast({ title: link ? "Link copiado" : "Link criado" });
      } else toast({ title: "Operação concluída" });
      await carregarEnvios();
      if (fechar || acao === "excluir") setGerenciando(null);
      else await carregarDocumento(gerenciando);
    } catch (error) {
      toast({ title: "Não foi possível concluir", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally { setAcaoEmCurso(""); }
  }

  async function listarPastas(abrir = true) {
    if (abrir) setPastasAbertas(true);
    setAcaoEmCurso("pastas");
    try {
      const resultado = await chamarApi<{ folders?: { data?: PastaRemota[] } }>("/api/autentique/pastas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "listar", envioId: abrir ? null : gerenciando?.id }) });
      setPastas(resultado?.folders?.data || []);
    } catch (error) { toast({ title: "Não foi possível carregar as pastas", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setAcaoEmCurso(""); }
  }

  async function gerenciarPasta(acao: "criar" | "excluir", id = "") {
    setAcaoEmCurso(`pasta_${acao}`);
    try {
      await chamarApi("/api/autentique/pastas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, id, nome: novaPasta }) });
      setNovaPasta("");
      await listarPastas();
      toast({ title: acao === "criar" ? "Pasta criada" : "Pasta excluída" });
    } catch (error) { toast({ title: "Não foi possível concluir", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); }
    finally { setAcaoEmCurso(""); }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={FileSignature} title="Enviar para assinatura" subtitle="Envio seguro de documentos para assinatura" username={user} />

      <section className="mx-auto grid max-w-7xl gap-3 px-4 pt-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {contas.map((item) => (
          <Card key={item.tokenId} className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Gauge className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.tokenNome}</p>
              {item.conta ? <p className="mt-1 text-xs text-muted-foreground"><strong className="text-foreground">{item.conta.subscription?.documents ?? "—"}</strong> documentos · <strong className="text-foreground">{item.conta.subscription?.credits ?? "—"}</strong> créditos disponíveis</p> : <p className="mt-1 truncate text-xs text-destructive">{item.erro || "Conta indisponível"}</p>}
            </div>
          </Card>
        ))}
        {!carregando && configurado && contas.length === 0 && <Card className="p-4 text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">Não foi possível consultar os saldos agora. Os envios continuam disponíveis.</Card>}
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:py-8">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/35 px-5 py-4 sm:px-6">
            <h2 className="font-display text-lg font-semibold">Novo envio</h2>
            <p className="mt-1 text-sm text-muted-foreground">Selecione um PDF e indique quem deve assinar.</p>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            {configurado === false && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                Nenhum token de assinatura está ativo. Cadastre um ou mais tokens em Administração &gt; Configurações.
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="documento-nome">Nome do documento</Label>
              <Input id="documento-nome" value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Ex.: Contrato administrativo 042/2026" maxLength={180} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documento-arquivo">Arquivo PDF</Label>
              <label htmlFor="documento-arquivo" className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[0.03] px-4 py-5 text-center transition-colors hover:bg-primary/[0.06]">
                {arquivo ? <FileText className="mb-2 h-7 w-7 text-primary" /> : <UploadCloud className="mb-2 h-7 w-7 text-muted-foreground" />}
                <span className="text-sm font-semibold">{arquivo?.name || "Clique para escolher o PDF"}</span>
                <span className="mt-1 text-xs text-muted-foreground">{arquivo ? `${(arquivo.size / 1024 / 1024).toFixed(2)} MB` : "Tamanho máximo: 20 MB"}</span>
              </label>
              <Input id="documento-arquivo" className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => setArquivo(event.target.files?.[0] || null)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><Label>Signatários</Label><p className="mt-1 text-xs text-muted-foreground">Envie por e-mail, WhatsApp ou gere um link.</p></div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSignatarios((atuais) => [...atuais, novoSignatario()])} disabled={signatarios.length >= 20}>
                  <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                </Button>
              </div>
              {signatarios.map((signatario, indice) => (
                <div key={indice} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant={signatario.canal === "email" ? "default" : "outline"} onClick={() => atualizarSignatario(indice, "canal", "email")}><Mail className="mr-1.5 h-3.5 w-3.5" />E-mail</Button>
                    <Button type="button" size="sm" variant={signatario.canal === "whatsapp" ? "default" : "outline"} onClick={() => atualizarSignatario(indice, "canal", "whatsapp")}><MessageCircle className="mr-1.5 h-3.5 w-3.5" />WhatsApp</Button>
                    <Button type="button" size="sm" variant={signatario.canal === "sms" ? "default" : "outline"} onClick={() => atualizarSignatario(indice, "canal", "sms")}><MessageCircle className="mr-1.5 h-3.5 w-3.5" />SMS</Button>
                    <Button type="button" size="sm" variant={signatario.canal === "link" ? "default" : "outline"} onClick={() => atualizarSignatario(indice, "canal", "link")}><Link2 className="mr-1.5 h-3.5 w-3.5" />Link</Button>
                    <Button className="ml-auto" type="button" variant="ghost" size="icon" aria-label={`Remover signatário ${indice + 1}`} onClick={() => setSignatarios((atuais) => atuais.filter((_, i) => i !== indice))} disabled={signatarios.length === 1}>
                    <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input aria-label={`Nome do signatário ${indice + 1}`} value={signatario.nome} onChange={(event) => atualizarSignatario(indice, "nome", event.target.value)} placeholder="Nome (opcional)" maxLength={120} />
                    {signatario.canal === "email"
                      ? <Input aria-label={`E-mail do signatário ${indice + 1}`} type="email" value={signatario.email} onChange={(event) => atualizarSignatario(indice, "email", event.target.value)} placeholder="email@exemplo.com" />
                      : signatario.canal === "whatsapp" || signatario.canal === "sms" ? <Input aria-label={`${signatario.canal === "sms" ? "SMS" : "WhatsApp"} do signatário ${indice + 1}`} type="tel" value={signatario.phone} onChange={(event) => atualizarSignatario(indice, "phone", event.target.value)} placeholder="+55 44 99999-9999" /> : <div className="flex items-center rounded-md border px-3 text-xs text-muted-foreground">Informe o nome para gerar o link.</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documento-mensagem">Mensagem aos signatários</Label>
              <Textarea id="documento-mensagem" value={mensagem} onChange={(event) => setMensagem(event.target.value)} placeholder="Mensagem opcional que acompanhará o convite." maxLength={1000} rows={3} />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div><Label>Opções do documento</Label><p className="mt-1 text-xs text-muted-foreground">Recursos padrão disponíveis no plano gratuito.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["refusable", "Permitir recusa"],
                  ["sortable", "Assinar na ordem"],
                  ["stop_on_rejected", "Parar se houver recusa"],
                  ["scrolling_required", "Exigir leitura completa"],
                  ["ignore_cpf", "Não exigir CPF"],
                  ["notification_finished", "Avisar ao finalizar"],
                  ["notification_signed", "Avisar cada assinatura"],
                ] as [keyof OpcoesDocumento, string][]).map(([chave, texto]) => (
                  <label key={chave} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={opcoes[chave]} onCheckedChange={(valor) => setOpcoes((atual) => ({ ...atual, [chave]: valor === true }))} />{texto}</label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div><Label htmlFor="sandbox">Modo de teste</Label><p className="mt-1 text-xs text-muted-foreground">Não consome créditos; documentos são temporários e não têm validade.</p></div>
              <Switch id="sandbox" checked={sandbox} onCheckedChange={setSandbox} />
            </div>

            <Button className="w-full" size="lg" onClick={() => void enviar()} disabled={!formularioValido || enviando || configurado !== true}>
              {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {enviando ? "Enviando..." : sandbox ? "Enviar documento de teste" : "Enviar para assinatura"}
            </Button>
          </div>
        </Card>

        <Card className="h-fit overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b bg-muted/35 px-5 py-4">
            <div><h2 className="font-display text-lg font-semibold">Envios recentes</h2><p className="mt-1 text-sm text-muted-foreground">Acompanhe a situação de cada documento.</p></div>
            <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => void listarPastas()} aria-label="Gerenciar pastas"><Folder className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void carregarEnvios()} aria-label="Atualizar lista"><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /></Button></div>
          </div>
          <div className="divide-y">
            {carregando && envios.length === 0 && <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>}
            {!carregando && envios.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">Nenhum documento enviado ainda.</div>}
            {envios.map((envio) => {
              let quantidade = 1;
              let canais = "";
              try {
                const lista = JSON.parse(envio.signatarios_json || "[]") as Signatario[];
                quantidade = lista.length || 1;
                const totalWhatsapp = lista.filter((item) => item.canal === "whatsapp").length;
                const totalSms = lista.filter((item) => item.canal === "sms").length;
                const totalLink = lista.filter((item) => item.canal === "link").length;
                const totalEmail = lista.length - totalWhatsapp - totalSms - totalLink;
                canais = [totalEmail ? `${totalEmail} por e-mail` : "", totalWhatsapp ? `${totalWhatsapp} por WhatsApp` : "", totalSms ? `${totalSms} por SMS` : "", totalLink ? `${totalLink} por link` : ""].filter(Boolean).join(" · ");
              } catch { quantidade = 1; }
              return (
                <article key={envio.id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{envio.documento_nome}</h3><p className="mt-1 text-xs text-muted-foreground">{quantidade} signatário(s){canais ? ` · ${canais}` : ""} · {new Date(envio.criado_em).toLocaleString("pt-BR")}</p></div>
                    {envio.sandbox ? <Badge variant="outline">Teste</Badge> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className={statusClasse[envio.status] || ""}>{statusTexto[envio.status] || envio.status}</Badge>
                    <div className="flex gap-1">
                      {envio.arquivo_original_url && <Button variant="ghost" size="sm" asChild><a href={envio.arquivo_original_url} target="_blank" rel="noreferrer"><FileText className="mr-1.5 h-3.5 w-3.5" />Original</a></Button>}
                      {envio.arquivo_assinado_url && <Button variant="ghost" size="sm" asChild><a href={envio.arquivo_assinado_url} target="_blank" rel="noreferrer"><Download className="mr-1.5 h-3.5 w-3.5" />Assinado</a></Button>}
                      {envio.assinatura_link && <Button variant="ghost" size="sm" asChild><a href={envio.assinatura_link} target="_blank" rel="noreferrer">Abrir link</a></Button>}
                      <Button variant="outline" size="sm" onClick={() => void sincronizar(envio.id)} disabled={sincronizando === envio.id}>
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${sincronizando === envio.id ? "animate-spin" : ""}`} /> Atualizar
                      </Button>
                      {envio.status !== "excluido" && <Button variant="outline" size="sm" onClick={() => void carregarDocumento(envio)}><Settings2 className="mr-1.5 h-3.5 w-3.5" /> Gerenciar</Button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </main>

      <Dialog open={Boolean(gerenciando)} onOpenChange={(aberta) => { if (!aberta) setGerenciando(null); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Gerenciar documento</DialogTitle><DialogDescription>Edite configurações, signatários, links e organização do envio.</DialogDescription></DialogHeader>
          {!documento ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div> : (
            <div className="space-y-6">
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2 font-semibold"><Pencil className="h-4 w-4" /> Dados e regras</div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="grid gap-2"><Label>Nome</Label><Input value={documento.name || ""} onChange={(e) => setDocumento({ ...documento, name: e.target.value })} /></div><div className="grid gap-2"><Label>Mensagem</Label><Input value={documento.message || ""} onChange={(e) => setDocumento({ ...documento, message: e.target.value })} /></div></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([ ["refusable", "Permitir recusa"], ["sortable", "Assinar na ordem"], ["stop_on_rejected", "Parar se houver recusa"], ["scrolling_required", "Exigir leitura completa"], ["ignore_cpf", "Não exigir CPF"] ] as [keyof DocumentoRemoto, string][]).map(([chave, texto]) => <label key={chave} className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(documento[chave])} onCheckedChange={(v) => setDocumento({ ...documento, [chave]: v === true })} />{texto}</label>)}
                </div>
                <div className="grid max-w-sm gap-2"><Label htmlFor="prazo-assinatura">Prazo para assinatura</Label><Input id="prazo-assinatura" type="datetime-local" value={documento.deadline_at ? documento.deadline_at.slice(0, 16) : ""} onChange={(e) => setDocumento({ ...documento, deadline_at: e.target.value || null })} /><p className="text-xs text-muted-foreground">Depois do prazo, novas assinaturas ficam bloqueadas.</p></div>
                <Button size="sm" onClick={() => void operar("editar", { name: documento.name, message: documento.message, refusable: documento.refusable, sortable: documento.sortable, stop_on_rejected: documento.stop_on_rejected, scrolling_required: documento.scrolling_required, ignore_cpf: documento.ignore_cpf, deadline_at: documento.deadline_at })} disabled={Boolean(acaoEmCurso)}>{acaoEmCurso === "editar" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alterações</Button>
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 font-semibold"><FileSignature className="h-4 w-4" /> Signatários</div>{Boolean(documento.signatures?.length) && <Button size="sm" variant="outline" onClick={() => void operar("reenviar", { public_ids: documento.signatures?.filter((s) => !s.signed?.created_at && !s.rejected?.created_at).map((s) => s.public_id) })} disabled={Boolean(acaoEmCurso)}>Reenviar pendentes</Button>}</div>
                <div className="divide-y rounded-md border">
                  {(documento.signatures || []).map((assinatura) => {
                    const identificacao = assinatura.name || assinatura.user?.name || assinatura.email || assinatura.user?.email || assinatura.user?.phone || "Signatário";
                    const situacao = assinatura.signed?.created_at ? "Assinado" : assinatura.rejected?.created_at ? "Recusado" : assinatura.viewed?.created_at ? "Visualizado" : "Pendente";
                    return <div key={assinatura.public_id} className="flex flex-wrap items-center justify-between gap-2 p-3"><div><p className="text-sm font-medium">{identificacao}</p><p className="text-xs text-muted-foreground">{situacao}</p></div><div className="flex gap-1">{assinatura.link?.short_link && <Button size="icon" variant="ghost" asChild><a href={assinatura.link.short_link} target="_blank" rel="noreferrer" aria-label="Abrir link"><Link2 className="h-4 w-4" /></a></Button>}<Button size="icon" variant="ghost" aria-label="Copiar link" onClick={() => void operar("criar_link", { public_id: assinatura.public_id })} disabled={Boolean(acaoEmCurso)}><Copy className="h-4 w-4" /></Button>{!assinatura.signed?.created_at && <Button size="icon" variant="ghost" aria-label="Remover signatário" onClick={() => void operar("remover_signatario", { public_id: assinatura.public_id })} disabled={Boolean(acaoEmCurso)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>;
                  })}
                </div>
                <div className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_auto]">
                  <select className="h-10 rounded-md border bg-background px-3 text-sm" value={novoAssinante.canal} onChange={(e) => setNovoAssinante({ ...novoAssinante, canal: e.target.value })}><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="link">Somente link</option></select>
                  <Input placeholder="Nome" value={novoAssinante.name} onChange={(e) => setNovoAssinante({ ...novoAssinante, name: e.target.value })} />
                  {novoAssinante.canal === "email" ? <Input placeholder="email@exemplo.com" value={novoAssinante.email} onChange={(e) => setNovoAssinante({ ...novoAssinante, email: e.target.value })} /> : novoAssinante.canal === "whatsapp" || novoAssinante.canal === "sms" ? <Input placeholder="+55 44 99999-9999" value={novoAssinante.phone} onChange={(e) => setNovoAssinante({ ...novoAssinante, phone: e.target.value })} /> : <div className="flex items-center text-xs text-muted-foreground">O link será gerado após adicionar.</div>}
                  <Button size="icon" aria-label="Adicionar signatário" onClick={() => void operar("adicionar_signatario", novoAssinante)} disabled={Boolean(acaoEmCurso)}><UserPlus className="h-4 w-4" /></Button>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-4"><div className="flex items-center gap-2 font-semibold"><Folder className="h-4 w-4" /> Pasta</div><div className="flex gap-2"><select className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={pastaSelecionada} onFocus={() => { if (!pastas.length) void listarPastas(false); }} onChange={(e) => setPastaSelecionada(e.target.value)}><option value="">Sem pasta</option>{pastas.map((pasta) => <option key={pasta.id} value={pasta.id}>{pasta.name}</option>)}</select><Button variant="outline" onClick={() => void operar("mover_pasta", { folder_id: pastaSelecionada })} disabled={Boolean(acaoEmCurso)}>Mover</Button></div></div>
            </div>
          )}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => void operar("assinar")} disabled={Boolean(acaoEmCurso)}>Assinar como titular do token</Button><Button variant="destructive" onClick={() => void (async () => { if (await confirm({ title: "Excluir documento", description: "O documento será removido da plataforma de assinatura. Esta ação não pode ser desfeita.", confirmLabel: "Excluir" })) operar("excluir", {}, true); })()} disabled={Boolean(acaoEmCurso)}><Trash2 className="mr-2 h-4 w-4" />Excluir documento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pastasAbertas} onOpenChange={setPastasAbertas}>
        <DialogContent><DialogHeader><DialogTitle>Pastas de documentos</DialogTitle><DialogDescription>Crie e organize pastas da conta vinculada ao token.</DialogDescription></DialogHeader><div className="flex gap-2"><Input value={novaPasta} onChange={(e) => setNovaPasta(e.target.value)} placeholder="Nome da nova pasta" maxLength={120} /><Button onClick={() => void gerenciarPasta("criar")} disabled={!novaPasta.trim() || Boolean(acaoEmCurso)}><Plus className="mr-2 h-4 w-4" />Criar</Button></div><div className="max-h-72 divide-y overflow-y-auto rounded-md border">{acaoEmCurso === "pastas" && <div className="p-4 text-sm text-muted-foreground">Carregando...</div>}{!acaoEmCurso && pastas.length === 0 && <div className="p-4 text-sm text-muted-foreground">Nenhuma pasta encontrada.</div>}{pastas.map((pasta) => <div key={pasta.id} className="flex items-center justify-between gap-2 p-3"><div><p className="text-sm font-medium">{pasta.name}</p><p className="text-xs text-muted-foreground">{pasta.children_counter || 0} subpasta(s)</p></div><Button size="icon" variant="ghost" aria-label="Excluir pasta" onClick={() => { void (async () => { if (await confirm({ title: "Excluir pasta", description: `Excluir a pasta ${pasta.name}? Os documentos ficarão sem pasta.`, confirmLabel: "Excluir" })) gerenciarPasta("excluir", pasta.id); })(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>)}</div></DialogContent>
      </Dialog>
      {confirmElement}
    </div>
  );
}
