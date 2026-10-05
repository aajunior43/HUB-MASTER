import { useState, useEffect, useCallback } from "react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { DataPagination } from "@/components/DataPagination";
import { NumberInput } from "@/components/ui/number-input";
import { StatCard } from "@/components/StatCard";
import { BarraSimples } from "@/components/BarraSimples";
import { EmptyState } from "@/components/EmptyState";
import { useConfirm } from "@/components/ConfirmDialog";
import { brl, fmtData } from "@/lib/empenhos";
import {
  Landmark, TrendingUp, TrendingDown, AlertTriangle, Plus, Pencil, Trash2, CheckCircle2,
  CreditCard, Bell, ListChecks, Wallet,
} from "lucide-react";

type Tab = "dashboard" | "contas" | "transacoes" | "alertas";

type Conta = {
  id: string;
  nome: string;
  banco: string;
  tipo: string;
  saldo_inicial: number;
  ativo: number;
  saldo_calculado?: number;
  criado_em: string;
};

type Transacao = {
  id: string;
  conta_id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
  categoria: string;
  documento: string;
  observacoes: string;
  conciliado: number;
  criado_em: string;
};

type Alerta = {
  id: string;
  conta_id: string;
  tipo: string;
  mensagem: string;
  severidade: string;
  resolvido: number;
  criado_em: string;
};

const CATEGORIAS = [
  "outros", "alimentacao", "transporte", "moradia", "saude", "educacao",
  "lazer", "servicos", "impostos", "salario", "investimento", "agua", "energia", "telefone",
];

const coresSeveridade: Record<string, string> = {
  baixa: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  media: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  alta: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  critica: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
};

export default function Extratos() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { confirm, confirmElement } = useConfirm();

  const [contas, setContas] = useState<Conta[]>([]);
  const [transacoes, setTransacoes] = useState<{ rows: Transacao[]; total: number; pagina: number; porPagina: number; totalPaginas: number; totais: { receitas: number; despesas: number } }>({ rows: [], total: 0, pagina: 1, porPagina: 50, totalPaginas: 0, totais: { receitas: 0, despesas: 0 } });
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [dashboardData, setDashboardData] = useState<{ totalContas: number; totalTransacoes: number; totalReceitas: number; totalDespesas: number; alertasPendentes: number; porCategoria: { categoria: string; qtd: number; total: number }[] } | null>(null);

  const [filtroConta, setFiltroConta] = useState<string>("all");
  const [pagina, setPagina] = useState(1);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString());

  const [contaDialog, setContaDialog] = useState<Conta | null>(null);
  const [contaDialogOpen, setContaDialogOpen] = useState(false);
  const [transacaoDialog, setTransacaoDialog] = useState<Transacao | null>(null);
  const [transacaoDialogOpen, setTransacaoDialogOpen] = useState(false);

  const carregarContas = useCallback(async () => {
    const { data, error } = await db.rpc("em_contas_listar", { _caller: user }) as unknown as { data: Conta[] | null; error: { message: string } | null };
    if (error) {
      setErro(error.message);
      return;
    }
    setContas(data ?? []);
  }, [user]);

  const carregarDashboard = useCallback(async () => {
    const { data, error } = await db.rpc("em_dashboard", { _caller: user, _ano: anoFiltro }) as unknown as { data: typeof dashboardData; error: { message: string } | null };
    if (error) {
      setErro(error.message);
      return;
    }
    setDashboardData(data);
  }, [user, anoFiltro]);

  const carregarTransacoes = useCallback(async (pg: number) => {
    const { data, error } = await db.rpc("em_transacoes_listar", { _conta_id: filtroConta === "all" ? "" : filtroConta, _pagina: pg, _por_pagina: 50, _caller: user }) as unknown as { data: typeof transacoes; error: { message: string } | null };
    if (error) {
      setErro(error.message);
      return;
    }
    setTransacoes(data);
  }, [user, filtroConta]);

  const carregarAlertas = useCallback(async () => {
    const { data, error } = await db.rpc("em_alertas_listar", { _conta_id: filtroConta === "all" ? "" : filtroConta, _caller: user }) as unknown as { data: Alerta[] | null; error: { message: string } | null };
    if (error) {
      setErro(error.message);
      return;
    }
    setAlertas(data ?? []);
  }, [user, filtroConta]);

  const carregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    const p: Promise<unknown>[] = [];
    p.push(carregarContas());
    if (tab === "transacoes") p.push(carregarTransacoes(pagina));
    if (tab === "alertas") p.push(carregarAlertas());
    if (tab === "dashboard") p.push(carregarDashboard());
    Promise.all(p).finally(() => setLoading(false));
  }, [tab, pagina, carregarContas, carregarDashboard, carregarTransacoes, carregarAlertas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tabs: PageTab<Tab>[] = [
    { id: "dashboard", label: "Painel", icon: TrendingUp },
    { id: "contas", label: "Contas", icon: CreditCard },
    { id: "transacoes", label: "Transações", icon: ListChecks },
    { id: "alertas", label: "Alertas", icon: Bell },
  ];

  const salvarConta = async (data: Partial<Conta>) => {
    if (!data.nome?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      _nome: data.nome.trim(),
      _banco: data.banco ?? "",
      _tipo: data.tipo ?? "corrente",
    };
    if (contaDialog?.id) {
      const { error } = await db.rpc("em_conta_atualizar", { _id: contaDialog.id, _caller: user, ...payload }) as unknown as { error: { message: string } | null };
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const { error } = await db.rpc("em_conta_criar", { _caller: user, ...payload }) as unknown as { error: { message: string } | null };
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    toast({ title: "Conta salva" });
    setContaDialogOpen(false);
    setContaDialog(null);
    carregarContas();
    carregarDashboard();
  };

  const excluirConta = async (id: string) => {
    const ok = await confirm({
      title: "Excluir conta",
      description: "Exclui esta conta e todas as suas transações e alertas.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const { error } = await db.rpc("em_conta_excluir", { _id: id, _caller: user }) as unknown as { error: { message: string } | null };
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Conta excluída" });
    carregarContas();
    carregarDashboard();
  };

  const salvarTransacao = async (data: Partial<Transacao>) => {
    if (!data.conta_id || !data.descricao?.trim()) {
      toast({ title: "Conta e descrição obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      _conta_id: data.conta_id,
      _data: data.data || new Date().toISOString().slice(0, 10),
      _descricao: data.descricao.trim(),
      _valor: Number(data.valor) || 0,
      _tipo: data.tipo || "despesa",
      _categoria: data.categoria || "outros",
      _documento: data.documento || "",
      _observacoes: data.observacoes || "",
    };
    if (transacaoDialog?.id) {
      const { error } = await db.rpc("em_transacao_atualizar", { _id: transacaoDialog.id, _caller: user, ...payload }) as unknown as { error: { message: string } | null };
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const { error } = await db.rpc("em_transacao_criar", { _caller: user, ...payload }) as unknown as { error: { message: string } | null };
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    toast({ title: "Transação salva" });
    setTransacaoDialogOpen(false);
    setTransacaoDialog(null);
    carregarTransacoes(pagina);
    carregarDashboard();
  };

  const excluirTransacao = async (id: string) => {
    const ok = await confirm({
      title: "Excluir transação",
      description: "Esta transação será removida permanentemente.",
      confirmLabel: "Excluir",
    });
    if (!ok) return;
    const { error } = await db.rpc("em_transacao_excluir", { _id: id, _caller: user }) as unknown as { error: { message: string } | null };
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transação excluída" });
    carregarTransacoes(pagina);
    carregarDashboard();
  };

  const conciliarTransacao = async (id: string, conciliado: boolean) => {
    const { error } = await db.rpc("em_transacao_atualizar", { _id: id, _conciliado: conciliado, _caller: user }) as unknown as { error: { message: string } | null };
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: conciliado ? "Conciliada" : "Desconciliada" });
    carregarTransacoes(pagina);
  };

  const resolverAlerta = async (id: string) => {
    const { error } = await db.rpc("em_alerta_resolver", { _id: id, _caller: user }) as unknown as { error: { message: string } | null };
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Alerta resolvido" });
    carregarAlertas();
    carregarDashboard();
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Landmark}
        title="Extratos bancários"
        subtitle="Contas, transações e conciliação"
        username={user}
      />

      <main className="max-w-7xl mx-auto px-6 mt-8">
        <PageTabs tabs={tabs} value={tab} onChange={(t) => { setTab(t); setPagina(1); }} />

        <div className="pb-16">
          {loading ? (
            <div className="space-y-6" aria-busy="true">
              <span className="sr-only">Carregando...</span>
              <Skeleton className="h-10 w-64 rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ) : erro ? (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-12 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
              <p className="text-sm font-medium">Erro ao carregar dados</p>
              <p className="max-w-md text-xs text-muted-foreground">{erro}</p>
              <Button size="sm" variant="outline" onClick={carregar}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {tab === "dashboard" && <AbaDashboard data={dashboardData} anoFiltro={anoFiltro} onAnoFiltro={setAnoFiltro} />}
              {tab === "contas" && (
                <AbaContas
                  contas={contas}
                  onEditar={(c) => { setContaDialog(c); setContaDialogOpen(true); }}
                  onExcluir={excluirConta}
                  onNovo={() => { setContaDialog(null); setContaDialogOpen(true); }}
                />
              )}
              {tab === "transacoes" && (
                <AbaTransacoes
                  transacoes={transacoes}
                  contas={contas}
                  filtroConta={filtroConta}
                  onFiltroConta={(v) => { setFiltroConta(v); setPagina(1); }}
                  onPagina={setPagina}
                  onEditar={(t) => { setTransacaoDialog(t); setTransacaoDialogOpen(true); }}
                  onExcluir={excluirTransacao}
                  onConciliar={conciliarTransacao}
                  onNovo={() => { setTransacaoDialog(null); setTransacaoDialogOpen(true); }}
                  carregar={() => carregarTransacoes(pagina)}
                />
              )}
              {tab === "alertas" && (
                <AbaAlertas alertas={alertas} contas={contas} onResolver={resolverAlerta} />
              )}
            </>
          )}
        </div>
      </main>

      <ContaDialog
        open={contaDialogOpen}
        conta={contaDialog}
        onClose={() => { setContaDialogOpen(false); setContaDialog(null); }}
        onSave={salvarConta}
      />

      <TransacaoDialog
        open={transacaoDialogOpen}
        transacao={transacaoDialog}
        contas={contas}
        onClose={() => { setTransacaoDialogOpen(false); setTransacaoDialog(null); }}
        onSave={salvarTransacao}
      />

      {confirmElement}

      <AppFooter />
    </div>
  );
}

function AbaDashboard({ data, anoFiltro, onAnoFiltro }: { data: { totalContas: number; totalTransacoes: number; totalReceitas: number; totalDespesas: number; alertasPendentes: number; porCategoria: { categoria: string; qtd: number; total: number }[] } | null; anoFiltro: string; onAnoFiltro: (v: string) => void }) {
  if (!data) return <EmptyState icon={Landmark} title="Nenhum dado disponível" />;
  const maxCat = data.porCategoria.length > 0 ? Math.max(...data.porCategoria.map(c => c.total)) : 0;
  const cores: Array<"primary" | "emerald" | "blue"> = ["primary", "emerald", "blue"];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Label className="text-xs">Ano</Label>
        <Select value={anoFiltro} onValueChange={onAnoFiltro}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Contas ativas" value={String(data.totalContas)} icon={CreditCard} variant="primary" />
        <StatCard label="Transações" value={String(data.totalTransacoes)} icon={ListChecks} variant="info" />
        <StatCard label="Receitas" value={brl(data.totalReceitas)} icon={TrendingUp} variant="success" />
        <StatCard label="Despesas" value={brl(data.totalDespesas)} icon={TrendingDown} variant="danger" />
        <StatCard label="Alertas Pendentes" value={String(data.alertasPendentes)} icon={AlertTriangle} variant="warning" />
      </div>

      <Card>
        <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
          ) : (
            data.porCategoria.map((c, i) => (
              <BarraSimples
                key={c.categoria}
                label={c.categoria}
                value={c.total}
                max={maxCat}
                cor={cores[i % cores.length]}
                valueLabel={`${brl(c.total)} (${c.qtd}x)`}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AbaContas({ contas, onEditar, onExcluir, onNovo }: { contas: Conta[]; onEditar: (c: Conta) => void; onExcluir: (id: string) => void; onNovo: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={onNovo}><Plus className="w-4 h-4 mr-2" /> Nova Conta</Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Lista de contas cadastradas</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map(c => (
                <TableRow key={c.id} className={!c.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.banco || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                  <TableCell className={`text-right font-medium ${(c.saldo_calculado ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {brl(c.saldo_calculado ?? 0)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => onEditar(c)} aria-label="Editar conta">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onExcluir(c.id)} aria-label="Excluir conta">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {contas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState icon={CreditCard} title="Nenhuma conta cadastrada" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AbaTransacoes({
  transacoes, contas, filtroConta, onFiltroConta, onPagina,
  onEditar, onExcluir, onConciliar, onNovo, carregar,
}: {
  transacoes: { rows: Transacao[]; total: number; pagina: number; porPagina: number; totalPaginas: number; totais: { receitas: number; despesas: number } };
  contas: Conta[]; filtroConta: string; onFiltroConta: (v: string) => void;
  onPagina: (p: number) => void; onEditar: (t: Transacao) => void;
  onExcluir: (id: string) => void; onConciliar: (id: string, c: boolean) => void;
  onNovo: () => void; carregar: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-end">
        <div className="w-60">
          <Label className="text-xs">Conta</Label>
          <Select value={filtroConta} onValueChange={onFiltroConta}>
            <SelectTrigger><SelectValue placeholder="Todas as contas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onNovo}><Plus className="w-4 h-4 mr-2" /> Nova Transação</Button>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="text-emerald-600 font-medium">Receitas: {brl(transacoes.totais.receitas)}</span>
        <span className="text-red-600 font-medium">Despesas: {brl(transacoes.totais.despesas)}</span>
        <span className="text-muted-foreground">Saldo: {brl(transacoes.totais.receitas - transacoes.totais.despesas)}</span>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Lista de transações da conta</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conciliado</TableHead>
                <TableHead className="text-right w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.rows.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs">{fmtData(t.data)}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{t.descricao}</TableCell>
                  <TableCell className="text-right font-medium">{brl(t.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={t.tipo === "receita" ? "default" : "destructive"} className={t.tipo === "receita" ? "bg-emerald-600" : ""}>
                      {t.tipo === "receita" ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : <TrendingDown className="w-3 h-3 mr-1 inline" />}
                      {t.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{t.categoria}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant={t.conciliado ? "default" : "outline"} className="h-7 text-xs"
                      onClick={() => onConciliar(t.id, !t.conciliado)}>
                      <CheckCircle2 className={`w-3 h-3 mr-1 ${t.conciliado ? "" : "opacity-40"}`} />
                      {t.conciliado ? "Sim" : "Não"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => onEditar(t)} aria-label="Editar transação">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onExcluir(t.id)} aria-label="Excluir transação">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {transacoes.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState icon={ListChecks} title="Nenhuma transação encontrada" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataPagination
        pagina={transacoes.pagina}
        totalPaginas={transacoes.totalPaginas}
        total={transacoes.total}
        onPagina={onPagina}
      />
    </div>
  );
}

function AbaAlertas({ alertas, contas, onResolver }: { alertas: Alerta[]; contas: Conta[]; onResolver: (id: string) => void }) {
  const nomeConta = (id: string) => contas.find(c => c.id === id)?.nome || id;
  const pendentes = alertas.filter(a => !a.resolvido);
  return (
    <div className="space-y-3">
      {pendentes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p>Nenhum alerta pendente.</p>
          </CardContent>
        </Card>
      ) : (
        pendentes.map(a => (
          <Card key={a.id} className="border-l-4 border-l-amber-400">
            <CardContent className="py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${coresSeveridade[a.severidade] || coresSeveridade.media}`}>
                    {a.severidade}
                  </span>
                  <span className="text-xs text-muted-foreground">{nomeConta(a.conta_id)}</span>
                </div>
                <p className="font-medium text-sm">{a.mensagem}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtData(a.criado_em)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onResolver(a.id)}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Resolver
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function ContaDialog({ open, conta, onClose, onSave }: { open: boolean; conta: Conta | null; onClose: () => void; onSave: (data: Partial<Conta>) => void }) {
  const [form, setForm] = useState<Partial<Conta>>({});
  useEffect(() => {
    setForm(conta ?? { nome: "", banco: "", tipo: "corrente" });
  }, [conta, open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{conta ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          <DialogDescription className="sr-only">Dados da conta bancária.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Banco</Label>
            <Input value={form.banco ?? ""} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo ?? "corrente"} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransacaoDialog({ open, transacao, contas, onClose, onSave }: { open: boolean; transacao: Transacao | null; contas: Conta[]; onClose: () => void; onSave: (data: Partial<Transacao>) => void }) {
  const [form, setForm] = useState<Partial<Transacao>>({});
  useEffect(() => {
    setForm(transacao ?? { conta_id: contas[0]?.id || "", data: new Date().toISOString().slice(0, 10), descricao: "", valor: 0, tipo: "despesa", categoria: "outros", documento: "", observacoes: "" });
  }, [transacao, open, contas]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transacao ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          <DialogDescription className="sr-only">Dados da transação bancária.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Conta *</Label>
            <Select value={form.conta_id || ""} onValueChange={(v) => setForm({ ...form, conta_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.data ?? ""} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <NumberInput step="0.01" value={form.valor ?? 0} onValueChange={(v) => setForm({ ...form, valor: v })} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo ?? "despesa"} onValueChange={(v) => setForm({ ...form, tipo: v as "receita" | "despesa" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria ?? "outros"} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Documento</Label>
            <Input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div>
            <Label>Observações</Label>
            <Input value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
