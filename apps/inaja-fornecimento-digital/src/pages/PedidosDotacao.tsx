import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  FileSearch,
  History,
  Hourglass,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { AttachmentUploader } from "@/components/AttachmentUploader";
import type { Anexo } from "@/components/AttachmentUploader";
import { EmptyState } from "@/components/EmptyState";
import { createUuid } from "@/lib/uuid";

type Pedido = {
  id: string;
  protocolo?: string;
  solicitante: string;
  secretaria: string;
  descricao: string;
  valor_solicitado: number;
  status: string;
  dotacao?: string;
  ficha?: string;
  saldo_disponivel?: number;
  valor_aprovado?: number;
  resposta_contador?: string;
  respondido_por?: string;
  respondido_em?: string;
  anexos?: Anexo[] | null;
  created_at: string;
  updated_at?: string;
};
type Historico = {
  id: string;
  pedido_id: string;
  acao: string;
  status_anterior?: string;
  status_novo?: string;
  mensagem?: string;
  usuario: string;
  created_at: string;
};
const brl = (v?: number) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabel: Record<string, string> = {
  enviado: "Pedido realizado",
  procurando_dotacao: "Procurando dotação",
  em_analise: "Procurando dotação",
  aprovado: "Dotação aprovada",
  nao_aprovado: "Dotação não aprovada",
  sem_saldo: "Sem saldo",
  aguardando_suplementacao: "Aguardando suplementação",
  ajustes: "Ajustes solicitados",
  recusado: "Não aprovado",
  arquivado: "Dotação usada",
  concluido: "Concluído pelo solicitante",
  cancelado: "Cancelado",
};

const RESULTADOS_DOTACAO = ["aprovado", "nao_aprovado", "sem_saldo", "aguardando_suplementacao"];
const STATUS_CONCLUIDOS = ["concluido", "arquivado", "cancelado"];

type FlowStage = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const FLOW_STAGES: FlowStage[] = [
  { id: "pedido", title: "Pedido realizado", description: "Solicitação registrada", icon: ClipboardList },
  { id: "procura", title: "Procurando dotação", description: "Contabilidade verifica a disponibilidade", icon: FileSearch },
  { id: "dotacao", title: "Dotação passada", description: "Resultado da análise orçamentária", icon: CircleDollarSign },
  { id: "conclusao", title: "Conclusão", description: "Solicitante encerra o pedido", icon: UserCheck },
];

const RESULTADOS_VISUAIS: Array<{ status: string; title: string; description: string; icon: LucideIcon; className: string }> = [
  { status: "aprovado", title: "Aprovada", description: "Dotação disponível para utilização", icon: CheckCircle2, className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700" },
  { status: "nao_aprovado", title: "Não aprovada", description: "Pedido não autorizado", icon: XCircle, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  { status: "sem_saldo", title: "Sem saldo", description: "Aguardar disponibilidade orçamentária", icon: Ban, className: "border-amber-500/40 bg-amber-500/10 text-amber-700" },
  { status: "aguardando_suplementacao", title: "Aguardando suplementação", description: "Reanalisar após a suplementação", icon: Hourglass, className: "border-sky-500/40 bg-sky-500/10 text-sky-700" },
];

function normalizarResultado(status: string) {
  return status === "recusado" ? "nao_aprovado" : status;
}

function faseAtual(status: string) {
  if (STATUS_CONCLUIDOS.includes(status)) return 4;
  if (RESULTADOS_DOTACAO.includes(status) || status === "recusado") return 3;
  if (["procurando_dotacao", "em_analise"].includes(status)) return 2;
  return 1;
}

function variantDoStatus(status: string): "default" | "secondary" | "destructive" {
  if (["aprovado", "concluido"].includes(status)) return "default";
  if (["nao_aprovado", "recusado", "cancelado"].includes(status)) return "destructive";
  return "secondary";
}

function FluxogramaDotacao({ status }: { status: string }) {
  const etapa = faseAtual(status);
  const resultadoAtual = normalizarResultado(status);
  const conclusaoPendente = RESULTADOS_DOTACAO.includes(status) || status === "recusado";

  return (
    <section className="mt-5 rounded-xl border bg-muted/20 p-4" aria-label="Fluxograma do pedido de dotação">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Fluxo do pedido</p>
          <p className="text-xs text-muted-foreground">Acompanhe cada fase e o resultado da análise.</p>
        </div>
        <Badge variant={variantDoStatus(status)}>{statusLabel[status] || status}</Badge>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        {FLOW_STAGES.map((stage, index) => {
          const numero = index + 1;
          const concluida = etapa > numero;
          const atual = etapa === numero;
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="relative">
              <div className={`h-full rounded-lg border p-3 transition-colors ${concluida ? "border-emerald-500/40 bg-emerald-500/10" : atual ? "border-primary/50 bg-primary/10 shadow-sm" : "bg-background/60"}`}>
                <div className="flex items-start gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${concluida ? "bg-emerald-500 text-white" : atual ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {concluida ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{numero}. {stage.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
              </div>
              {index < FLOW_STAGES.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground md:block" />}
            </div>
          );
        })}
      </div>
      <div className="mt-4 border-t pt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <CircleAlert className="h-4 w-4" /> Resultado da etapa 3
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {RESULTADOS_VISUAIS.map((resultado) => {
            const Icon = resultado.icon;
            const ativo = resultadoAtual === resultado.status;
            return (
              <div key={resultado.status} className={`rounded-lg border p-3 ${ativo ? resultado.className : "border-border bg-background/50 text-muted-foreground"}`} aria-current={ativo ? "step" : undefined}>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{resultado.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed opacity-80">{resultado.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {status === "concluido" ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Conclusão registrada pelo solicitante.</p>
      ) : conclusaoPendente ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" /> Aguardando o solicitante dar conclusão nesta etapa.</p>
      ) : null}
    </section>
  );
}

const SECRETARIAS = ["Administração", "Assistência Social", "Educação", "Finanças", "Obras", "Saúde"];

export default function PedidosDotacao() {
  const { user, isAdmin, isContador } = useAuth();
  const [searchParams] = useSearchParams();
  const pedidoRef = searchParams.get("pedido");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState(false);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [somenteMeus, setSomenteMeus] = useState(false);
  const carregar = useCallback(async () => {
    setLoading(true);
    const r = await db
      .from<Pedido>("pedidos_dotacao")
      .select("*")
      .order("created_at", { ascending: false });
    if (r.error)
      toast({
        title: "Erro ao carregar pedidos",
        description: r.error.message,
        variant: "destructive",
      });
    else setPedidos(r.data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void carregar();
  }, [carregar]);
  useEffect(() => {
    if (!pedidoRef || !pedidos.some((pedido) => pedido.id === pedidoRef)) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(`pedido-${pedidoRef}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pedidoRef, pedidos]);
  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return pedidos.filter((pedido) => {
      const correspondeBusca = !termo || [pedido.secretaria, pedido.solicitante, pedido.descricao, pedido.dotacao, pedido.ficha]
        .filter(Boolean).some((valor) => String(valor).toLocaleLowerCase("pt-BR").includes(termo));
      return correspondeBusca
        && (filtroStatus === "todos" || pedido.status === filtroStatus)
        && (!somenteMeus || pedido.solicitante.toLowerCase() === String(user || "").toLowerCase());
    });
  }, [busca, filtroStatus, pedidos, somenteMeus, user]);
  const cancelarNovo = async () => {
    if (anexos.length) {
      const { error } = await db.storage.from("solicitacao-anexos").remove(anexos.map((anexo) => anexo.path));
      if (error) {
        toast({ title: "Falha ao limpar anexos", description: error.message, variant: "destructive" });
        return;
      }
    }
    setAnexos([]);
    setNovo(false);
  };
  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const secretaria = String(f.get("secretaria") || "").trim();
    if (!secretaria) {
      toast({
        title: "Informe a secretaria ou departamento",
        variant: "destructive",
      });
      return;
    }
    const valorInformado = String(f.get("valor") || "").trim();
    const valor = valorInformado ? Number(valorInformado.replace(",", ".")) : 0;
    if (!Number.isFinite(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor maior que zero.",
        variant: "destructive",
      });
      return;
    }
    setSalvando(true);
    try {
      const r = await db
        .from("pedidos_dotacao")
        .insert({
          id: createUuid(),
          solicitante: user,
          secretaria,
          descricao: String(f.get("descricao") || ""),
          valor_solicitado: valor,
          status: "enviado",
          anexos,
        });
      if (r.error) {
        toast({
          title: "Não foi possível enviar",
          description: r.error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Pedido enviado ao contador" });
        setNovo(false);
        setAnexos([]);
        void carregar();
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar pedido",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={ClipboardList}
        title="Pedidos de dotação"
        subtitle="Solicitação e resposta orçamentária"
        username={user}
        actions={
          <Button onClick={() => setNovo(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo pedido
          </Button>
        }
      />
      <main className="mx-auto max-w-6xl space-y-5 px-6 py-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total", pedidos.length],
            ["Pendentes", pedidos.filter((p) => ["enviado", "procurando_dotacao", "em_analise", "ajustes", "aguardando_suplementacao"].includes(p.status)).length],
            ["Aprovados", pedidos.filter((p) => p.status === "aprovado").length],
            ["Concluídos", pedidos.filter((p) => STATUS_CONCLUIDOS.includes(p.status)).length],
          ].map(([titulo, total]) => (
            <div key={String(titulo)} className="rounded-xl border bg-card p-4 shadow-sm">
              <p className="text-sm text-muted-foreground">{titulo}</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          ))}
        </section>
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por secretaria, solicitante, descrição, dotação ou ficha" />
          </div>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            {Object.entries(statusLabel).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
          {(isAdmin || isContador) && <label className="flex items-center gap-2 whitespace-nowrap text-sm"><input type="checkbox" checked={somenteMeus} onChange={(e) => setSomenteMeus(e.target.checked)} /> Meus pedidos</label>}
          {(busca || filtroStatus !== "todos" || somenteMeus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setBusca(""); setFiltroStatus("todos"); setSomenteMeus(false); }}
              className="text-xs text-muted-foreground hover:text-foreground h-9"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
        </section>
        {novo && (
          <form
            onSubmit={salvar}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <h2 className="mb-5 text-lg font-semibold">
              Novo pedido de dotação
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Secretaria ou departamento *</Label>
                <Input name="secretaria" list="secretarias-dotacao" required />
                <datalist id="secretarias-dotacao">
                  {SECRETARIAS.map((secretaria) => <option key={secretaria} value={secretaria} />)}
                </datalist>
              </div>
              <div>
                <Label>Valor solicitado</Label>
                <Input
                  name="valor"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição do pedido</Label>
                <Textarea
                  name="descricao"
                  rows={4}
                  required
                  placeholder="Descreva o que precisa da dotação orçamentária"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Anexos</Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Imagens, PDF ou qualquer outro arquivo. Limite de 20 MB por arquivo.
                </p>
                <AttachmentUploader scope="pedido-dotacao" value={anexos} onChange={setAnexos} />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {salvando ? "Enviando..." : "Enviar pedido"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void cancelarNovo()}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        {loading ? (
          <Loader2 className="mx-auto animate-spin" />
        ) : pedidosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-6 text-center">
            <EmptyState
              icon={Search}
              title="Nenhum pedido de dotação encontrado"
              description={
                busca || filtroStatus !== "todos" || somenteMeus
                  ? "Nenhum resultado corresponde aos filtros aplicados."
                  : "Nenhum pedido de dotação cadastrado no momento."
              }
              actionLabel={busca || filtroStatus !== "todos" || somenteMeus ? "Limpar filtros" : undefined}
              onAction={
                busca || filtroStatus !== "todos" || somenteMeus
                  ? () => { setBusca(""); setFiltroStatus("todos"); setSomenteMeus(false); }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.map((p) => (
              <PedidoCard
                key={p.id}
                pedido={p}
                destacado={pedidoRef === p.id}
                usuarioAtual={user || ""}
                administrador={isAdmin}
                contador={isAdmin || isContador}
                onSaved={carregar}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
function PedidoCard({
  pedido: p,
  destacado = false,
  usuarioAtual,
  administrador,
  contador,
  onSaved,
}: {
  pedido: Pedido;
  destacado?: boolean;
  usuarioAtual: string;
  administrador: boolean;
  contador: boolean;
  onSaved: () => void;
}) {
  const { confirm, confirmElement } = useConfirm();
  const [edit, setEdit] = useState(false);
  const [editAjustes, setEditAjustes] = useState(false);
  const [statusResposta, setStatusResposta] = useState(RESULTADOS_DOTACAO.includes(p.status) ? p.status : p.status === "recusado" ? "nao_aprovado" : "aprovado");
  const [saving, setSaving] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const podeApagar = administrador || p.solicitante.toLowerCase() === usuarioAtual.toLowerCase();
  const podeApagarAgora = administrador || (podeApagar && ["enviado", "ajustes"].includes(p.status));
  const carregarHistorico = async () => {
    setCarregandoHistorico(true);
    const r = await db.from<Historico>("pedidos_dotacao_historico").select("*").eq("pedido_id", p.id).order("created_at", { ascending: false });
    setCarregandoHistorico(false);
    if (r.error) toast({ title: "Erro ao carregar histórico", description: r.error.message, variant: "destructive" });
    else setHistorico(r.data || []);
  };
  const apagar = async () => {
    if (!(await confirm({ title: "Apagar pedido de dotação", description: "Esta ação não pode ser desfeita.", confirmLabel: "Apagar" }))) return;
    setSaving(true);
    const r = await db.from("pedidos_dotacao").delete().eq("id", p.id);
    setSaving(false);
    if (r.error) {
      toast({ title: "Erro ao apagar pedido", description: r.error.message, variant: "destructive" });
    } else {
      toast({ title: "Pedido apagado" });
      onSaved();
    }
  };
  const concluir = async () => {
    setSaving(true);
    const r = await db.from("pedidos_dotacao").update({ status: "concluido" }).eq("id", p.id);
    setSaving(false);
    if (r.error) toast({ title: "Erro ao concluir", description: r.error.message, variant: "destructive" });
    else { toast({ title: "Processo concluído", description: "A conclusão do solicitante foi registrada." }); onSaved(); }
  };
  const marcarEmAnalise = async () => {
    setSaving(true);
    const r = await db.from("pedidos_dotacao").update({ status: "procurando_dotacao", resposta_contador: "A contabilidade iniciou a procura da dotação." }).eq("id", p.id);
    setSaving(false);
    if (r.error) toast({ title: "Erro ao atualizar pedido", description: r.error.message, variant: "destructive" });
    else { toast({ title: "Procura da dotação iniciada" }); onSaved(); }
  };
  const reenviarComAjustes = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const valor = Number(f.get("valor") || 0);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const r = await db.from("pedidos_dotacao").update({
      status: "enviado",
      secretaria: String(f.get("secretaria") || "").trim(),
      descricao: String(f.get("descricao") || "").trim(),
      valor_solicitado: valor,
      anexos: p.anexos || [],
    }).eq("id", p.id);
    setSaving(false);
    if (r.error) toast({ title: "Erro ao reenviar pedido", description: r.error.message, variant: "destructive" });
    else { toast({ title: "Pedido reenviado para análise" }); setEditAjustes(false); onSaved(); }
  };
  const salvar = async (
    e: React.FormEvent<HTMLFormElement>,
    status: string,
  ) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const dotacao = String(f.get("dotacao") || "").trim();
    const resposta = String(f.get("resposta_contador") || "").trim();
    if (status === "aprovado" && !dotacao) {
      toast({ title: "Informe a dotação orçamentária", description: "A dotação é obrigatória para aprovar o pedido.", variant: "destructive" });
      return;
    }
    if (!resposta) {
      toast({ title: "Informe a resposta da contabilidade", variant: "destructive" });
      return;
    }
    const saldo = Number(f.get("saldo") || 0);
    const aprovado = Number(f.get("aprovado") || 0);
    if (!Number.isFinite(saldo) || saldo < 0 || !Number.isFinite(aprovado) || aprovado < 0) {
      toast({ title: "Valores inválidos", description: "Saldo e valor aprovado não podem ser negativos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const data = {
      status,
      dotacao: dotacao || null,
      ficha: String(f.get("ficha") || "").trim() || null,
      saldo_disponivel: saldo,
      valor_aprovado: aprovado,
      resposta_contador: resposta,
    };
    const r = await db.from("pedidos_dotacao").update(data).eq("id", p.id);
    setSaving(false);
    if (r.error)
      toast({
        title: "Erro ao responder",
        description: r.error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Pedido atualizado" });
      setEdit(false);
      onSaved();
    }
  };
  return (
    <article id={`pedido-${p.id}`} className={`rounded-xl border bg-card p-5 shadow-sm ${destacado ? "ring-2 ring-primary ring-offset-2" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{p.secretaria}</h3>
            {p.protocolo && <span className="text-xs text-muted-foreground">{p.protocolo}</span>}
            <Badge variant={variantDoStatus(p.status)}>
              {statusLabel[p.status] || p.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicitante: {p.solicitante} ·{" "}
            {new Date(p.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <strong>{brl(p.valor_solicitado)}</strong>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm">{p.descricao}</p>
      {p.anexos && p.anexos.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Anexos</p>
          <div className="flex flex-wrap gap-2">
            {p.anexos.map((anexo) => (
              <a
                key={anexo.path}
                href={anexo.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border px-3 py-2 text-xs text-primary hover:underline"
              >
                {anexo.name}
              </a>
            ))}
          </div>
        </div>
      )}
      <FluxogramaDotacao status={p.status} />
      {(p.dotacao || p.resposta_contador || RESULTADOS_DOTACAO.includes(p.status) || p.status === "recusado") && (
        <div className="mt-4 grid gap-2 rounded-lg bg-muted/50 p-4 text-sm md:grid-cols-4">
          <span>
            <b>Dotação:</b> {p.dotacao || "—"}
          </span>
          <span>
            <b>Ficha:</b> {p.ficha || "—"}
          </span>
          <span>
            <b>Saldo:</b> {brl(p.saldo_disponivel)}
          </span>
          <span>
            <b>Aprovado:</b> {brl(p.valor_aprovado)}
          </span>
          <span className="md:col-span-4">
            <b>Resposta:</b> {p.resposta_contador || "—"}
          </span>
        </div>
      )}
      {p.respondido_por && (
        <p className="mt-3 text-xs text-muted-foreground">
          Respondido por {p.respondido_por}{p.respondido_em ? ` em ${new Date(p.respondido_em).toLocaleString("pt-BR")}` : ""}.
        </p>
      )}
      {["aprovado", "nao_aprovado", "sem_saldo", "aguardando_suplementacao", "recusado"].includes(p.status) && p.solicitante.toLowerCase() === usuarioAtual.toLowerCase() && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" className="border-amber-500 text-amber-700" disabled={saving} onClick={concluir}>
            <UserCheck className="mr-2 h-4 w-4" /> Dar conclusão
          </Button>
          <span className="text-xs text-muted-foreground">Confirme que tomou ciência do resultado deste pedido.</span>
        </div>
      )}
      {p.status === "ajustes" && p.solicitante.toLowerCase() === usuarioAtual.toLowerCase() && !editAjustes && (
        <Button variant="outline" className="mt-4" onClick={() => setEditAjustes(true)}><RotateCcw className="mr-2 h-4 w-4" /> Corrigir e reenviar</Button>
      )}
      {editAjustes && (
        <form onSubmit={reenviarComAjustes} className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-2">
          <div><Label>Secretaria ou departamento *</Label><Input name="secretaria" defaultValue={p.secretaria} required /></div>
          <div><Label>Valor solicitado *</Label><Input name="valor" type="number" min="0.01" step="0.01" defaultValue={p.valor_solicitado} required /></div>
          <div className="md:col-span-2"><Label>Descrição do pedido *</Label><Textarea name="descricao" rows={4} defaultValue={p.descricao} required /></div>
          <p className="text-xs text-muted-foreground md:col-span-2">Os anexos existentes serão mantidos neste reenvio.</p>
          <div className="flex gap-2 md:col-span-2"><Button disabled={saving}><Send className="mr-2 h-4 w-4" /> Reenviar</Button><Button type="button" variant="ghost" onClick={() => setEditAjustes(false)}>Cancelar</Button></div>
        </form>
      )}
      <Button variant="ghost" className="mt-4" onClick={() => { setHistoricoAberto((aberto) => !aberto); if (!historicoAberto) void carregarHistorico(); }}>
        <History className="mr-2 h-4 w-4" /> Histórico
      </Button>
      {historicoAberto && (
        <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="mb-3 font-medium">Histórico do pedido</p>
          {carregandoHistorico ? <Loader2 className="h-4 w-4 animate-spin" /> : historico.length === 0 ? <p className="text-muted-foreground">Nenhuma movimentação registrada.</p> : <ol className="space-y-3 border-l pl-4">{historico.map((item) => <li key={item.id}><p className="font-medium">{statusLabel[item.status_novo || ""] || item.acao}</p><p>{item.mensagem || "Sem observação."}</p><p className="text-xs text-muted-foreground">{item.usuario} · {new Date(item.created_at).toLocaleString("pt-BR")}</p></li>)}</ol>}
        </div>
      )}
      {podeApagarAgora && (
        <Button
          variant="ghost"
          className="mt-4 text-destructive hover:text-destructive"
          disabled={saving}
          onClick={apagar}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Apagar pedido
        </Button>
      )}
      {contador && !["concluido", "nao_aprovado", "recusado", "arquivado", "cancelado"].includes(p.status) && !edit && (
        <div className="mt-4 flex flex-wrap gap-2">
          {["enviado", "ajustes"].includes(p.status) && <Button variant="outline" disabled={saving} onClick={marcarEmAnalise}><FileSearch className="mr-2 h-4 w-4" /> Procurar dotação</Button>}
          <Button variant="outline" onClick={() => setEdit(true)}>{p.status === "aguardando_suplementacao" ? "Atualizar suplementação" : "Registrar resultado"}</Button>
        </div>
      )}
      {contador && edit && (
        <form
          onSubmit={(e) => salvar(e, statusResposta)}
          className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <Label>Resultado da análise da dotação</Label>
            <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={statusResposta} onChange={(e) => setStatusResposta(e.target.value)}>
              <option value="aprovado">Aprovada</option>
              <option value="nao_aprovado">Não aprovada</option>
              <option value="sem_saldo">Sem saldo</option>
              <option value="aguardando_suplementacao">Aguardando suplementação</option>
            </select>
          </div>
          <div>
            <Label>Dotação orçamentária</Label>
            <Input name="dotacao" defaultValue={p.dotacao || ""} placeholder="Obrigatória somente para aprovação" />
          </div>
          <div>
            <Label>Ficha</Label>
            <Input name="ficha" defaultValue={p.ficha || ""} />
          </div>
          <div>
            <Label>Saldo disponível</Label>
            <Input name="saldo" type="number" min="0" step="0.01" defaultValue={p.saldo_disponivel ?? ""} />
          </div>
          <div>
            <Label>Valor aprovado</Label>
            <Input name="aprovado" type="number" min="0" step="0.01" defaultValue={p.valor_aprovado ?? ""} />
          </div>
          <div className="md:col-span-2">
            <Label>Resposta da contabilidade</Label>
            <Textarea name="resposta_contador" rows={2} defaultValue={p.resposta_contador || ""} required />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Salvar resultado
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEdit(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
      {confirmElement}
    </article>
  );
}
