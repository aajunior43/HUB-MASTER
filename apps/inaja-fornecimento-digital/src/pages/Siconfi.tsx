import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Database, ExternalLink, FileCheck2, FileText, Loader2, RefreshCw, Search, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { DataPagination } from "@/components/DataPagination";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Tab = "indicadores" | "rreo" | "rgf" | "dca" | "entregas";
type Metric = { valor: number; coluna: string | null; conta: string | null; cod_conta: string | null; anexo: string | null; periodo: number | null; exercicio: number | null } | null;
type Cobertura = {
  ano: number;
  esperados: { rreo: number; rgf: number; dca: number };
  recebidos: { rreo: number; rgf: number; dca: number };
  total: number;
  homologadas: number;
  retificadas: number;
  status: string;
};
type Indicadores = {
  ano: number | null;
  anosDisponiveis: number[];
  periodoRreo: number | null;
  periodoRgf: number | null;
  rreo: { receitaTotal: Metric; despesaEmpenhada: Metric; despesaPaga: Metric; rcl: Metric; saude: Metric; educacao: Metric };
  rgf: { pessoalPercentual: Metric; pessoalValor: Metric; limitePessoal: Metric; limiteAlerta: Metric; dividaPercentual: Metric; caixaLiquida: Metric; restosPagar: Metric };
  alertas: { nivel: string; titulo: string; detalhe: string }[];
  cobertura: Cobertura[];
  fonte: string;
};
type Status = {
  config: { ibge: string; anos: number[]; intervaloHoras: number };
  totais: { rreo?: number; rgf?: number; dca?: number; entregas?: number };
  cobertura: Cobertura[];
  ultima: { status: string; iniciado_em: string; finalizado_em: string | null; erros: string } | null;
  isAdmin: boolean;
  sincronizacaoAutomatica: boolean;
};
type Registro = {
  id: string;
  tipo: string;
  exercicio: number;
  periodo: number | null;
  periodicidade: string | null;
  demonstrativo: string | null;
  esfera: string | null;
  poder: string | null;
  cod_ibge: number | null;
  uf: string | null;
  instituicao: string | null;
  populacao: number | null;
  anexo: string | null;
  rotulo: string | null;
  coluna: string | null;
  cod_conta: string | null;
  conta: string | null;
  valor: number;
  sincronizado_em: string;
};
type Entrega = {
  id: string;
  exercicio: number;
  cod_ibge: number | null;
  populacao: number | null;
  instituicao: string | null;
  entregavel: string | null;
  periodo: number | null;
  periodicidade: string | null;
  status_relatorio: string | null;
  data_status: string | null;
  forma_envio: string | null;
  tipo_relatorio: string | null;
};

const tabs: PageTab<Tab>[] = [
  { id: "indicadores", label: "Indicadores", icon: BarChart3 },
  { id: "rreo", label: "RREO", icon: FileText },
  { id: "rgf", label: "RGF", icon: ShieldAlert },
  { id: "dca", label: "DCA", icon: Database },
  { id: "entregas", label: "Entregas", icon: FileCheck2 },
];

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch("/api/siconfi" + caminho, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await resposta.json();
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o SICONFI.");
  return json.data as T;
}

function moeda(valor: number | null | undefined) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number | null | undefined) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return "—";
  return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function dataBr(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function valorMetric(metric: Metric, formato: "moeda" | "percentual" = "moeda") {
  return formato === "percentual" ? percentual(metric?.valor) : moeda(metric?.valor);
}

function labelPeriodo(tipo: "rreo" | "rgf", periodo: number | null) {
  if (!periodo) return "sem período";
  return tipo === "rreo" ? "bimestre " + periodo : "período " + periodo;
}

function tituloConta(item: Metric) {
  if (!item) return "Sem dado para o período selecionado.";
  return (item.conta || item.cod_conta || "Linha do demonstrativo") + (item.anexo ? " · " + item.anexo : "");
}

function IndicadorCard({ titulo, metric, formato = "moeda", observacao }: { titulo: string; metric: Metric; formato?: "moeda" | "percentual"; observacao: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="mt-2 text-2xl font-bold">{valorMetric(metric, formato)}</p>
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{metric ? tituloConta(metric) : observacao}</p>
      </CardContent>
    </Card>
  );
}

function CoberturaCard({ item }: { item: Cobertura }) {
  const completo = item.status === "completo";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{item.ano}</p>
          <Badge variant={completo ? "default" : item.status === "parcial" ? "secondary" : "outline"}>{completo ? "Completo" : item.status === "parcial" ? "Parcial" : "Sem dados"}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted/50 p-2"><strong className="block text-base">{item.recebidos.rreo}/{item.esperados.rreo}</strong>RREO</div>
          <div className="rounded-md bg-muted/50 p-2"><strong className="block text-base">{item.recebidos.rgf}/{item.esperados.rgf}</strong>RGF</div>
          <div className="rounded-md bg-muted/50 p-2"><strong className="block text-base">{item.recebidos.dca}/{item.esperados.dca}</strong>DCA</div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{item.homologadas} homologadas · {item.retificadas} retificadas</p>
      </CardContent>
    </Card>
  );
}

function Dashboard({ indicadores }: { indicadores: Indicadores | null }) {
  if (!indicadores) return <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">Nenhum indicador SICONFI encontrado.</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <span>Exercício analisado: <strong>{indicadores.ano || "—"}</strong> · RREO {labelPeriodo("rreo", indicadores.periodoRreo)} · RGF {labelPeriodo("rgf", indicadores.periodoRgf)}</span>
        <a href={indicadores.fonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Fonte oficial</a>
      </div>
      <section>
        <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="font-semibold">Execução orçamentária</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IndicadorCard titulo="Receita total realizada" metric={indicadores.rreo.receitaTotal} observacao="Total até o bimestre disponível no RREO." />
          <IndicadorCard titulo="Despesa empenhada" metric={indicadores.rreo.despesaEmpenhada} observacao="Despesas empenhadas até o bimestre." />
          <IndicadorCard titulo="Despesa paga" metric={indicadores.rreo.despesaPaga} observacao="Despesas pagas até o bimestre." />
          <IndicadorCard titulo="Receita corrente líquida" metric={indicadores.rreo.rcl} observacao="Total dos últimos 12 meses." />
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /><h2 className="font-semibold">Limites e responsabilidade fiscal</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IndicadorCard titulo="Despesa com pessoal" metric={indicadores.rgf.pessoalPercentual} formato="percentual" observacao="Percentual da RCL ajustada." />
          <IndicadorCard titulo="Limite prudencial de pessoal" metric={indicadores.rgf.limitePessoal} formato="percentual" observacao="Parágrafo único do art. 22 da LRF." />
          <IndicadorCard titulo="Dívida consolidada líquida" metric={indicadores.rgf.dividaPercentual} formato="percentual" observacao="Percentual da RCL ajustada." />
          <IndicadorCard titulo="Caixa líquida após restos" metric={indicadores.rgf.caixaLiquida} observacao="Disponibilidade após inscrição de restos a pagar." />
        </div>
      </section>
      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Aplicações constitucionais</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <IndicadorCard titulo="Aplicação em saúde" metric={indicadores.rreo.saude} formato="percentual" observacao="Percentual aplicado até o bimestre." />
              <IndicadorCard titulo="Aplicação em educação" metric={indicadores.rreo.educacao} formato="percentual" observacao="Percentual localizado no RREO." />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Alertas de controle</h2>
            {indicadores.alertas.length ? <div className="mt-3 space-y-2">{indicadores.alertas.map((alerta, indice) => <div key={alerta.titulo + indice} className="flex gap-3 rounded-lg border p-3"><AlertTriangle className={"mt-0.5 h-4 w-4 shrink-0 " + (alerta.nivel === "critico" ? "text-destructive" : alerta.nivel === "atencao" ? "text-amber-600" : "text-muted-foreground")} /><div><p className="text-sm font-medium">{alerta.titulo}</p><p className="mt-1 text-xs text-muted-foreground">{alerta.detalhe}</p></div></div>)}</div> : <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Nenhum alerta calculado para o período.</p>}
          </CardContent>
        </Card>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-primary" /><h2 className="font-semibold">Cobertura da prestação de contas</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{indicadores.cobertura.length ? indicadores.cobertura.map((item) => <CoberturaCard key={item.ano} item={item} />) : <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">Ainda não há extrato de entregas salvo.</div>}</div>
      </section>
    </div>
  );
}

export default function Siconfi() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("indicadores");
  const [status, setStatus] = useState<Status | null>(null);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const carregarStatus = useCallback(async () => {
    try { setStatus(await api<Status>("/status")); }
    catch (erro) { toast({ title: "Falha ao abrir o SICONFI", description: String((erro as Error).message), variant: "destructive" }); }
  }, []);

  const carregarIndicadores = useCallback(async () => {
    try {
      const query = ano ? "?ano=" + encodeURIComponent(ano) : "";
      setIndicadores(await api<Indicadores>("/indicadores" + query));
    } catch (erro) { toast({ title: "Falha ao calcular indicadores", description: String((erro as Error).message), variant: "destructive" }); }
  }, [ano]);

  const carregarLista = useCallback(async () => {
    if (tab === "indicadores") return;
    setCarregando(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina) });
      if (busca) params.set("busca", busca);
      if (ano) params.set("ano", ano);
      if (tab === "entregas") {
        const resultado = await api<{ rows: Entrega[]; total: number }>("/entregas?" + params.toString());
        setEntregas(resultado.rows);
        setTotal(resultado.total);
      } else {
        params.set("tipo", tab);
        if (periodo && tab !== "dca") params.set("periodo", periodo);
        const resultado = await api<{ rows: Registro[]; total: number }>("/registros?" + params.toString());
        setRegistros(resultado.rows);
        setTotal(resultado.total);
      }
    } catch (erro) { toast({ title: "Falha na consulta", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setCarregando(false); }
  }, [ano, busca, pagina, periodo, tab]);

  useEffect(() => { void carregarStatus(); }, [carregarStatus]);
  useEffect(() => { void carregarIndicadores(); }, [carregarIndicadores]);
  useEffect(() => { const timer = window.setTimeout(() => void carregarLista(), 250); return () => window.clearTimeout(timer); }, [carregarLista]);
  useEffect(() => { setPagina(1); }, [ano, busca, periodo, tab]);
  useEffect(() => {
    if (!status?.sincronizacaoAutomatica && status?.ultima?.status !== "executando") return;
    const timer = window.setInterval(() => {
      void carregarStatus();
      void carregarIndicadores();
      void carregarLista();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, [carregarIndicadores, carregarLista, carregarStatus, status?.sincronizacaoAutomatica, status?.ultima?.status]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const resultado = await api<{ status: string; recebidos: number; erros: string[] }>("/sincronizar", { method: "POST", body: JSON.stringify({}) });
      toast({ title: "Sincronização SICONFI concluída", description: resultado.recebidos.toLocaleString("pt-BR") + " registros recebidos." });
      await Promise.all([carregarStatus(), carregarIndicadores(), carregarLista()]);
    } catch (erro) { toast({ title: "Falha na sincronização", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setSincronizando(false); }
  };

  const atualizando = sincronizando || Boolean(status?.sincronizacaoAutomatica || status?.ultima?.status === "executando");
  const anos = useMemo(() => [...new Set([...(status?.config.anos || []), ...(indicadores?.anosDisponiveis || [])])].sort((a, b) => b - a), [indicadores?.anosDisponiveis, status?.config.anos]);
  const totalPaginas = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageHeader icon={BarChart3} title="SICONFI - Indicadores fiscais" subtitle="Prestação de contas, execução orçamentária e responsabilidade fiscal" username={user} actions={status?.isAdmin ? <Button size="sm" onClick={sincronizar} disabled={atualizando}>{atualizando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{atualizando ? "Atualizando..." : "Sincronizar"}</Button> : undefined} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">RREO</p><p className="mt-1 text-2xl font-bold">{(status?.totais.rreo || 0).toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">RGF</p><p className="mt-1 text-2xl font-bold">{(status?.totais.rgf || 0).toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">DCA</p><p className="mt-1 text-2xl font-bold">{(status?.totais.dca || 0).toLocaleString("pt-BR")}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Entregas localizadas</p><p className="mt-1 text-2xl font-bold">{(status?.totais.entregas || 0).toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>
        <div className="mb-5 flex flex-wrap justify-between gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <span>Município IBGE: <strong>{status?.config.ibge || "4110300"}</strong> · Exercícios: {status?.config.anos.join(", ") || "—"}</span>
          <span>Última sincronização: {status?.ultima ? dataBr(status.ultima.finalizado_em || status.ultima.iniciado_em) + " · " + status.ultima.status : "ainda não realizada"}</span>
        </div>
        <PageTabs tabs={tabs} value={tab} onChange={setTab} />
        {tab === "indicadores" ? <Dashboard indicadores={indicadores} /> : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[250px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={tab === "entregas" ? "Buscar relatório ou instituição" : "Buscar conta, anexo ou coluna"} className="pl-9" /></div>
              <select aria-label="Exercício" value={ano} onChange={(e) => setAno(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os exercícios</option>{anos.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              {tab !== "dca" && tab !== "entregas" && <select aria-label="Período" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os períodos</option>{[1, 2, 3, 4, 5, 6].map((item) => <option key={item} value={item}>{tab === "rreo" ? "Bimestre " : "Período "}{item}</option>)}</select>}
            </div>
            {carregando ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : tab === "entregas" ? (
              entregas.length ? <Card><Table><TableHeader><TableRow><TableHead>Exercício</TableHead><TableHead>Entregável</TableHead><TableHead>Instituição</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead></TableRow></TableHeader><TableBody>{entregas.map((item) => <TableRow key={item.id}><TableCell>{item.exercicio}</TableCell><TableCell className="font-medium">{item.entregavel || item.tipo_relatorio || "—"}</TableCell><TableCell>{item.instituicao || "—"}</TableCell><TableCell>{item.periodo || "Anual"}{item.periodicidade ? " · " + item.periodicidade : ""}</TableCell><TableCell><Badge variant={item.status_relatorio === "HO" ? "default" : item.status_relatorio === "RE" ? "secondary" : "outline"}>{item.status_relatorio || "Entrega localizada"}</Badge></TableCell><TableCell>{dataBr(item.data_status)}</TableCell></TableRow>)}</TableBody></Table><DataPagination pagina={pagina} totalPaginas={totalPaginas} total={total} onPagina={setPagina} className="border-t p-4" /></Card> : <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">Nenhuma entrega SICONFI encontrada.</div>
            ) : registros.length ? (
              <Card><Table><TableHeader><TableRow><TableHead>Exercício / período</TableHead><TableHead>Anexo</TableHead><TableHead>Conta</TableHead><TableHead>Coluna</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{registros.map((item) => <TableRow key={item.id}><TableCell className="whitespace-nowrap">{item.exercicio}<div className="text-xs text-muted-foreground">{item.periodo ? (item.tipo === "rreo" ? "Bimestre " : "Período ") + item.periodo : "Anual"}</div></TableCell><TableCell className="max-w-[190px]">{item.anexo || "—"}{item.rotulo && <div className="text-xs text-muted-foreground">{item.rotulo}</div>}</TableCell><TableCell className="max-w-[330px]"><p className="line-clamp-2 font-medium">{item.conta || item.cod_conta || "Conta não informada"}</p><p className="mt-1 text-xs text-muted-foreground">{item.cod_conta || "—"}</p></TableCell><TableCell className="max-w-[260px] text-xs">{item.coluna || "—"}</TableCell><TableCell className="text-right font-medium whitespace-nowrap">{moeda(item.valor)}</TableCell></TableRow>)}</TableBody></Table><DataPagination pagina={pagina} totalPaginas={totalPaginas} total={total} onPagina={setPagina} className="border-t p-4" /></Card>
            ) : <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground"><Database className="mx-auto mb-3 h-10 w-10 opacity-50" /><p>Nenhum dado SICONFI encontrado.</p>{status?.isAdmin && !status.ultima && <Button variant="outline" className="mt-4" onClick={sincronizar}><RefreshCw className="mr-2 h-4 w-4" />Fazer primeira sincronização</Button>}</div>}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
