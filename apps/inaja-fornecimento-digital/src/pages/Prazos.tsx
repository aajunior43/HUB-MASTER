import { useCallback, useEffect, useMemo, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { AlertCircle, AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Obrigacao = {
  id: string;
  titulo: string;
  descricao: string;
  data_limite: string;
  categoria: string;
  resolvido: number;
};

type Resumo = { vencidos: number; urgentes: number; atencao: number; ok: number };

const categorias = ["geral", "prestacao_contas", "tribunal_contas", "licitacao", "contrato", "convenio", "folha_pagamento", "fiscal", "obra", "rh", "saude", "educacao", "outro"];
const categoriaLabel: Record<string, string> = { geral: "Geral", prestacao_contas: "Prestação de contas", tribunal_contas: "Tribunal de Contas", licitacao: "Licitação", contrato: "Contrato", convenio: "Convênio", folha_pagamento: "Folha de pagamento", fiscal: "Fiscal", obra: "Obra", rh: "Recursos humanos", saude: "Saúde", educacao: "Educação", outro: "Outro" };

const toDate = (value: string) => parseISO(`${value}T12:00:00`);
const diasRestantes = (data: string) => Math.ceil((toDate(data).getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86400000);

export default function Prazos() {
  const { user } = useAuth();
  const { confirm, confirmElement } = useConfirm();
  const [obrigacoes, setObrigacoes] = useState<Obrigacao[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ vencidos: 0, urgentes: 0, atencao: 0, ok: 0 });
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [diaSelecionado, setDiaSelecionado] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [formAberto, setFormAberto] = useState(false);
  const [edicao, setEdicao] = useState<Obrigacao | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [categoria, setCategoria] = useState("geral");

  const carregar = useCallback(async () => {
    setLoading(true);
    const [lista, dadosResumo] = await Promise.all([
      db.rpc("prazos_listar", { _caller: user, _pagina: 1, _por_pagina: 500 }) as unknown as Promise<{ data: { rows: Obrigacao[] } | null; error: { message: string } | null }>,
      db.rpc("prazos_resumo", { _caller: user }) as unknown as Promise<{ data: Resumo | null; error: { message: string } | null }>,
    ]);
    if (lista.error) toast({ title: "Não foi possível carregar as obrigações", description: lista.error.message, variant: "destructive" });
    else setObrigacoes(lista.data?.rows ?? []);
    if (dadosResumo.error) toast({ title: "Não foi possível carregar o resumo", description: dadosResumo.error.message, variant: "destructive" });
    else if (dadosResumo.data) setResumo(dadosResumo.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { void carregar(); }, [carregar]);

  const obrigacoesFiltradas = useMemo(() => obrigacoes.filter((item) => filtroCategoria === "todas" || item.categoria === filtroCategoria), [filtroCategoria, obrigacoes]);
  const datasComObrigacoes = useMemo(() => obrigacoesFiltradas.filter((item) => !item.resolvido).map((item) => toDate(item.data_limite)), [obrigacoesFiltradas]);
  const obrigacoesDoDia = useMemo(() => {
    if (!diaSelecionado) return [];
    const chave = format(diaSelecionado, "yyyy-MM-dd");
    return obrigacoesFiltradas.filter((item) => item.data_limite === chave).sort((a, b) => Number(a.resolvido) - Number(b.resolvido));
  }, [diaSelecionado, obrigacoesFiltradas]);
  const pendentes = useMemo(() => obrigacoesFiltradas.filter((item) => !item.resolvido).length, [obrigacoesFiltradas]);

  const abrirNovo = (data?: Date) => {
    setEdicao(null);
    setTitulo("");
    setDescricao("");
    setDataLimite(format(data ?? diaSelecionado ?? new Date(), "yyyy-MM-dd"));
    setCategoria("geral");
    setFormAberto(true);
  };

  const abrirEdicao = (item: Obrigacao) => {
    setEdicao(item);
    setTitulo(item.titulo);
    setDescricao(item.descricao || "");
    setDataLimite(item.data_limite);
    setCategoria(item.categoria || "geral");
    setFormAberto(true);
  };

  const salvar = async () => {
    if (!titulo.trim() || !dataLimite) return toast({ title: "Informe o título e a data", variant: "destructive" });
    const params = { _caller: user, _titulo: titulo.trim(), _descricao: descricao.trim(), _data_limite: dataLimite, _categoria: categoria };
    const resultado = edicao ? await db.rpc("prazos_atualizar", { ...params, _id: edicao.id }) : await db.rpc("prazos_criar", params);
    if (resultado.error) return toast({ title: "Não foi possível salvar", description: resultado.error.message, variant: "destructive" });
    setFormAberto(false);
    toast({ title: edicao ? "Obrigação atualizada" : "Obrigação cadastrada" });
    void carregar();
  };

  const concluir = async (item: Obrigacao) => {
    const { error } = await db.rpc("prazos_atualizar", { _caller: user, _id: item.id, _resolvido: !item.resolvido });
    if (error) return toast({ title: "Não foi possível atualizar", description: error.message, variant: "destructive" });
    void carregar();
  };

  const excluir = async (item: Obrigacao) => {
    if (!await confirm({ title: "Excluir obrigação", description: `Excluir “${item.titulo}”?`, confirmLabel: "Excluir" })) return;
    const { error } = await db.rpc("prazos_excluir", { _caller: user, _id: item.id });
    if (error) return toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
    toast({ title: "Obrigação excluída" });
    void carregar();
  };

  const status = (item: Obrigacao) => {
    if (item.resolvido) return <Badge className="border-0 bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" />Concluída</Badge>;
    const dias = diasRestantes(item.data_limite);
    if (dias < 0) return <Badge className="border-0 bg-muted text-muted-foreground"><AlertCircle className="mr-1 h-3 w-3" />Prazo passou</Badge>;
    if (dias <= 7) return <Badge className="border-0 bg-orange-500 text-white"><AlertTriangle className="mr-1 h-3 w-3" />{dias === 0 ? "Hoje" : `${dias} dia${dias > 1 ? "s" : ""}`}</Badge>;
    return <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary"><Clock3 className="mr-1 h-3 w-3" />{dias} dias</Badge>;
  };

  const resumoCards = [
    ["Já passaram", resumo.vencidos, AlertCircle, "bg-muted text-muted-foreground", "border-border"],
    ["Próximos 7 dias", resumo.urgentes, AlertTriangle, "bg-orange-500/10 text-orange-600", "border-orange-500/15"],
    ["Próximos 30 dias", resumo.atencao, Clock3, "bg-amber-500/10 text-amber-600", "border-amber-500/15"],
    ["Concluídas", resumo.ok, CheckCircle2, "bg-emerald-500/10 text-emerald-600", "border-emerald-500/15"],
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={CalendarDays} title="Obrigações" subtitle="Entregas, vencimentos e compromissos da prefeitura" actions={<Button size="sm" onClick={() => abrirNovo()}><Plus className="mr-1.5 h-4 w-4" />Nova obrigação</Button>} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-card to-card shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><CalendarDays className="h-6 w-6" /></div>
              <div><p className="text-sm font-semibold text-primary">Visão operacional</p><h2 className="mt-0.5 text-xl font-bold tracking-tight">Controle seus próximos compromissos</h2><p className="mt-1 text-sm text-muted-foreground">{pendentes} pendência{pendentes === 1 ? "" : "s"} no filtro atual. Selecione uma data para ver os detalhes.</p></div>
            </div>
            <Button variant="outline" className="bg-background/70" onClick={() => { setDiaSelecionado(new Date()); setMes(startOfMonth(new Date())); }}>Ir para hoje</Button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {resumoCards.map(([label, valor, Icon, iconClass, borderClass]) => <Card key={label} className={cn("overflow-hidden border", borderClass)}><CardContent className="flex items-center gap-3 p-4"><span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconClass)}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-2xl font-bold leading-none">{valor}</p><p className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</p></div></CardContent></Card>)}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => setMes((valor) => subMonths(valor, 1))} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button><CardTitle className="min-w-48 text-center text-lg capitalize">{format(mes, "MMMM 'de' yyyy", { locale: ptBR })}</CardTitle><Button size="icon" variant="outline" onClick={() => setMes((valor) => addMonths(valor, 1))} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button></div>
                <div className="flex gap-2"><Select value={filtroCategoria} onValueChange={setFiltroCategoria}><SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as categorias</SelectItem>{categorias.map((item) => <SelectItem value={item} key={item}>{categoriaLabel[item]}</SelectItem>)}</SelectContent></Select><Button className="shrink-0" onClick={() => abrirNovo()}><Plus className="mr-1.5 h-4 w-4" />Nova</Button></div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {loading ? <div className="flex justify-center py-28"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : <><Calendar locale={ptBR} month={mes} onMonthChange={setMes} mode="single" selected={diaSelecionado} onSelect={setDiaSelecionado} modifiers={{ obrigacao: datasComObrigacoes }} modifiersClassNames={{ obrigacao: "font-bold text-primary underline decoration-primary decoration-2 underline-offset-4" }} className="mx-auto rounded-xl border bg-card p-4 shadow-sm" /><p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Datas com obrigações pendentes</p></>}
            </CardContent>
          </Card>

          <Card className="flex min-h-[480px] flex-col overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Agenda do dia</p><CardTitle className="mt-1 text-lg capitalize">{diaSelecionado ? format(diaSelecionado, "dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{obrigacoesDoDia.length} obrigação{obrigacoesDoDia.length === 1 ? "" : "es"} agendada{obrigacoesDoDia.length === 1 ? "" : "s"}</p></div><Button size="icon" variant="outline" onClick={() => abrirNovo(diaSelecionado)} aria-label="Adicionar obrigação nesta data"><Plus className="h-4 w-4" /></Button></div></CardHeader>
            <CardContent className="flex-1 space-y-3 p-4">
              {loading ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : obrigacoesDoDia.length === 0 ? <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><CalendarDays className="h-5 w-5 text-muted-foreground" /></div><p className="mt-3 text-sm font-medium">Agenda livre</p><p className="mt-1 text-xs text-muted-foreground">Nenhuma obrigação para esta data.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => abrirNovo(diaSelecionado)}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar obrigação</Button></div> : obrigacoesDoDia.map((item) => <article key={item.id} className={cn("group rounded-xl border p-4 transition-colors hover:bg-muted/30", item.resolvido && "bg-muted/20 opacity-70")}><div className="flex items-start gap-3"><span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", item.resolvido ? "bg-emerald-500" : diasRestantes(item.data_limite) < 0 ? "bg-red-500" : diasRestantes(item.data_limite) <= 7 ? "bg-orange-500" : "bg-primary")} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className={cn("text-sm font-semibold leading-5", item.resolvido && "line-through")}>{item.titulo}</p><div className="-mt-1 -mr-2 flex shrink-0 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(item)} aria-label={`Editar ${item.titulo}`}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => void excluir(item)} aria-label={`Excluir ${item.titulo}`}><Trash2 className="h-3.5 w-3.5" /></Button></div></div><p className="mt-1 text-xs text-muted-foreground">{categoriaLabel[item.categoria] ?? item.categoria}</p>{item.descricao && <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.descricao}</p>}<div className="mt-3 flex items-center justify-between gap-2">{status(item)}<Button variant={item.resolvido ? "ghost" : "outline"} size="sm" className="h-7 px-2.5 text-xs" onClick={() => void concluir(item)}>{item.resolvido ? "Reabrir" : "Concluir"}</Button></div></div></div></article>)}
            </CardContent>
          </Card>
        </section>
      </main>

      <Dialog open={formAberto} onOpenChange={setFormAberto}><DialogContent><DialogHeader><DialogTitle>{edicao ? "Editar obrigação" : "Nova obrigação"}</DialogTitle><DialogDescription>Defina o título, a data limite e a categoria da obrigação.</DialogDescription></DialogHeader><div className="space-y-4 py-3"><div className="space-y-2"><Label htmlFor="titulo">Título *</Label><Input id="titulo" value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ex.: Envio do SIOPE" /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="data">Data limite *</Label><Input id="data" type="date" value={dataLimite} onChange={(event) => setDataLimite(event.target.value)} /></div><div className="space-y-2"><Label>Categoria</Label><Select value={categoria} onValueChange={setCategoria}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categorias.map((item) => <SelectItem value={item} key={item}>{categoriaLabel[item]}</SelectItem>)}</SelectContent></Select></div></div><div className="space-y-2"><Label htmlFor="descricao">Descrição</Label><Textarea id="descricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={3} placeholder="Orientações ou observações" /></div></div><DialogFooter><Button variant="outline" onClick={() => setFormAberto(false)}>Cancelar</Button><Button onClick={() => void salvar()}>Salvar obrigação</Button></DialogFooter></DialogContent></Dialog>
      {confirmElement}
    </div>
  );
}
