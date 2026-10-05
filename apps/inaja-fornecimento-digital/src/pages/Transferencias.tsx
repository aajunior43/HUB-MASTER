import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, FileText, HandCoins, Landmark, Loader2, RefreshCw, Search, TrendingUp, WalletCards } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { DataPagination } from "@/components/DataPagination";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Tab = "painel" | "instrumentos" | "movimentacoes" | "alertas";
type Instrumento = { id: string; fonte: string; tipo: string; codigo: string | null; ano: number | null; situacao: string | null; objeto: string | null; orgao_repassador: string | null; parlamentar: string | null; numero_emenda: string | null; inicio_vigencia: string | null; fim_vigencia: string | null; valor_total: number; valor_custeio: number; valor_investimento: number; saldo: number };
type Movimento = { id: string; fonte: string; tipo: string; numero: string | null; data: string | null; valor: number; situacao: string | null; favorecido: string | null; descricao: string | null; instrumento_codigo: string | null; instrumento_objeto: string | null };
type Status = { config: { cnpj: string; intervaloHoras: number }; resumo: { instrumentos: number; valor_total: number; custeio: number; investimento: number; saldo: number; empenhado: number; recebido: number; executado: number }; porFonte: { fonte: string; total: number; valor: number }[]; ultima: { status: string; iniciado_em: string; finalizado_em: string | null } | null; isAdmin: boolean; sincronizacaoAutomatica: boolean };
type Alertas = { vencendo: Instrumento[]; vencidos: Instrumento[]; impedimentos: Instrumento[] };
type Detalhe = Instrumento & { movimentacoes: Movimento[] };

const tabs: PageTab<Tab>[] = [
  { id: "painel", label: "Visão geral", icon: TrendingUp },
  { id: "instrumentos", label: "Transferências", icon: HandCoins },
  { id: "movimentacoes", label: "Empenhos e pagamentos", icon: Banknote },
  { id: "alertas", label: "Alertas", icon: AlertTriangle },
];

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api/transferencias${caminho}`, { credentials: "same-origin", ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const json = await resposta.json();
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o Transferegov.");
  return json.data as T;
}

function moeda(valor: number | null | undefined) { return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataBr(valor: string | null | undefined) { if (!valor) return "—"; const data = new Date(valor); return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "UTC" }); }
function fonteNome(fonte: string) { return fonte === "especial" ? "Transferência especial" : fonte === "fundo_a_fundo" ? "Fundo a fundo" : "Gestão de parcerias"; }

export default function Transferencias() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("painel");
  const [status, setStatus] = useState<Status | null>(null);
  const [instrumentos, setInstrumentos] = useState<Instrumento[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [busca, setBusca] = useState("");
  const [fonte, setFonte] = useState("todas");
  const [tipoMovimento, setTipoMovimento] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  const carregarStatus = useCallback(async () => { try { setStatus(await api<Status>("/status")); } catch (erro) { toast({ title: "Falha ao carregar transferências", description: String((erro as Error).message), variant: "destructive" }); } }, []);
  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      if (tab === "alertas") setAlertas(await api<Alertas>("/alertas"));
      else if (tab === "movimentacoes") {
        const params = new URLSearchParams({ pagina: String(pagina) });
        if (tipoMovimento !== "todos") params.set("tipo", tipoMovimento);
        const dados = await api<{ rows: Movimento[]; total: number }>(`/movimentacoes?${params}`);
        setMovimentos(dados.rows); setTotal(dados.total);
      } else if (tab === "instrumentos") {
        const params = new URLSearchParams({ pagina: String(pagina), busca });
        if (fonte !== "todas") params.set("fonte", fonte);
        const dados = await api<{ rows: Instrumento[]; total: number }>(`/instrumentos?${params}`);
        setInstrumentos(dados.rows); setTotal(dados.total);
      }
    } catch (erro) { toast({ title: "Falha na consulta", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setCarregando(false); }
  }, [busca, fonte, pagina, tab, tipoMovimento]);

  useEffect(() => { void carregarStatus(); }, [carregarStatus]);
  useEffect(() => { const timer = window.setTimeout(() => void carregar(), 200); return () => window.clearTimeout(timer); }, [carregar]);
  useEffect(() => { setPagina(1); }, [tab, busca, fonte, tipoMovimento]);
  useEffect(() => {
    if (!status?.sincronizacaoAutomatica && status?.ultima?.status !== "executando") return;
    const timer = window.setInterval(() => { void carregarStatus(); void carregar(true); }, 5_000);
    return () => window.clearInterval(timer);
  }, [carregar, carregarStatus, status?.sincronizacaoAutomatica, status?.ultima?.status]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const resultado = await api<{ status: string; totais: { instrumentos: number; movimentacoes: number }; erros: string[] }>("/sincronizar", { method: "POST", body: "{}" });
      toast({ title: "Sincronização concluída", description: `${resultado.totais.instrumentos} transferências e ${resultado.totais.movimentacoes} movimentações atualizadas${resultado.status === "parcial" ? " parcialmente" : ""}.` });
      await carregarStatus(); await carregar();
    } catch (erro) { toast({ title: "Falha na sincronização", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setSincronizando(false); }
  };

  const atualizando = sincronizando || Boolean(status?.sincronizacaoAutomatica || status?.ultima?.status === "executando");
  const abrir = async (id: string) => { try { setDetalhe(await api<Detalhe>(`/detalhe?id=${encodeURIComponent(id)}`)); } catch (erro) { toast({ title: "Falha ao abrir transferência", description: String((erro as Error).message), variant: "destructive" }); } };
  const cards = useMemo(() => [
    ["Total previsto", status?.resumo.valor_total || 0, HandCoins], ["Empenhado", status?.resumo.empenhado || 0, FileText], ["Créditos recebidos", status?.resumo.recebido || 0, Banknote], ["Débitos executados", status?.resumo.executado || 0, WalletCards],
  ] as const, [status]);

  return <div className="min-h-screen bg-background flex flex-col">
    <PageHeader icon={HandCoins} title="Transferências e convênios" subtitle="Emendas, parcerias e recursos fundo a fundo" username={user} actions={status?.isAdmin ? <Button size="sm" onClick={sincronizar} disabled={atualizando}>{atualizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}{atualizando ? "Atualizando..." : "Sincronizar"}</Button> : undefined} />
    <main className="w-full max-w-7xl mx-auto flex-1 px-4 py-6 sm:px-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{cards.map(([titulo, numero, Icon]) => <Card key={titulo}><CardContent className="p-4"><Icon className="w-4 h-4 text-primary mb-2" /><p className="text-xs text-muted-foreground">{titulo}</p><p className="text-lg sm:text-xl font-bold mt-1">{moeda(numero)}</p></CardContent></Card>)}</div>
      <div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-wrap justify-between gap-2"><span>CNPJ: {status?.config.cnpj || "76.970.318/0001-67"} · {Number(status?.resumo.instrumentos || 0).toLocaleString("pt-BR")} instrumentos</span><span>Última sincronização: {status?.ultima ? `${dataBr(status.ultima.finalizado_em || status.ultima.iniciado_em)} · ${status.ultima.status}` : "ainda não realizada"}</span></div>
      <PageTabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "painel" ? <div className="grid md:grid-cols-3 gap-4">{(status?.porFonte || []).map((item) => <Card key={item.fonte}><CardHeader><CardTitle className="text-base flex items-center gap-2"><Landmark className="w-4 h-4" />{fonteNome(item.fonte)}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{moeda(item.valor)}</p><p className="text-sm text-muted-foreground mt-1">{item.total} instrumentos</p></CardContent></Card>)}{!status?.porFonte.length && <EstadoVazio texto="A primeira sincronização será iniciada automaticamente." />}</div> : tab === "instrumentos" ? <>
        <div className="flex flex-col sm:flex-row gap-3 mb-4"><div className="relative flex-1 max-w-xl"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar objeto, código, emenda ou parlamentar" /></div><Select value={fonte} onValueChange={setFonte}><SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as fontes</SelectItem><SelectItem value="especial">Transferências especiais</SelectItem><SelectItem value="parceria">Parcerias</SelectItem><SelectItem value="fundo_a_fundo">Fundo a fundo</SelectItem></SelectContent></Select></div>
        {carregando ? <Carregando /> : instrumentos.length ? <Card><Table><TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Objeto / origem</TableHead><TableHead>Situação</TableHead><TableHead>Vigência</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{instrumentos.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => void abrir(item.id)}><TableCell className="font-medium">{item.codigo || "—"}<p className="text-xs text-muted-foreground">{item.ano || ""}</p></TableCell><TableCell className="max-w-xl"><p className="line-clamp-2">{item.objeto || item.tipo}</p><p className="text-xs text-muted-foreground mt-1">{item.parlamentar || item.orgao_repassador || fonteNome(item.fonte)}</p></TableCell><TableCell><Badge variant="outline">{item.situacao || "Não informada"}</Badge></TableCell><TableCell>{dataBr(item.fim_vigencia)}</TableCell><TableCell className="text-right whitespace-nowrap">{moeda(item.valor_total)}</TableCell></TableRow>)}</TableBody></Table><DataPagination pagina={pagina} totalPaginas={Math.max(1, Math.ceil(total / 30))} total={total} onPagina={setPagina} className="p-4 border-t" /></Card> : <EstadoVazio texto="Nenhuma transferência encontrada." />}
      </> : tab === "movimentacoes" ? <><div className="mb-4"><Select value={tipoMovimento} onValueChange={setTipoMovimento}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os movimentos</SelectItem><SelectItem value="empenho">Empenhos</SelectItem><SelectItem value="movimentacao">Movimentação financeira</SelectItem></SelectContent></Select></div>{carregando ? <Carregando /> : movimentos.length ? <Card><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo / número</TableHead><TableHead>Descrição</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{movimentos.map((item) => <TableRow key={item.id}><TableCell>{dataBr(item.data)}</TableCell><TableCell><Badge variant="secondary">{item.tipo}</Badge><p className="text-xs mt-1">{item.numero || "—"}</p></TableCell><TableCell className="max-w-xl"><p className="line-clamp-2">{item.descricao || item.instrumento_objeto || "Sem descrição"}</p><p className="text-xs text-muted-foreground">{item.favorecido || item.instrumento_codigo}</p></TableCell><TableCell>{item.situacao || "—"}</TableCell><TableCell className="text-right whitespace-nowrap">{moeda(item.valor)}</TableCell></TableRow>)}</TableBody></Table><DataPagination pagina={pagina} totalPaginas={Math.max(1, Math.ceil(total / 40))} total={total} onPagina={setPagina} className="p-4 border-t" /></Card> : <EstadoVazio texto="Nenhuma movimentação encontrada." />}</> : <div className="space-y-5"><SecaoAlerta titulo="Vencendo nos próximos 90 dias" itens={alertas?.vencendo || []} vazio="Nenhuma vigência próxima do vencimento." onOpen={abrir} /><SecaoAlerta titulo="Vigências vencidas sem encerramento identificado" itens={alertas?.vencidos || []} vazio="Nenhuma pendência desse tipo." onOpen={abrir} /><SecaoAlerta titulo="Impedimentos" itens={alertas?.impedimentos || []} vazio="Nenhum impedimento identificado." onOpen={abrir} /></div>}
    </main><AppFooter />
    <Dialog open={Boolean(detalhe)} onOpenChange={(aberto) => { if (!aberto) setDetalhe(null); }}><DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>{detalhe?.codigo || "Detalhes da transferência"}</DialogTitle></DialogHeader>{detalhe && <div className="space-y-5 text-sm"><p>{detalhe.objeto || "Objeto não informado"}</p><div className="grid sm:grid-cols-2 gap-3"><Info titulo="Fonte" valor={fonteNome(detalhe.fonte)} /><Info titulo="Situação" valor={detalhe.situacao || "—"} /><Info titulo="Órgão repassador" valor={detalhe.orgao_repassador || "—"} /><Info titulo="Parlamentar / emenda" valor={[detalhe.parlamentar, detalhe.numero_emenda].filter(Boolean).join(" · ") || "—"} /><Info titulo="Vigência" valor={`${dataBr(detalhe.inicio_vigencia)} a ${dataBr(detalhe.fim_vigencia)}`} /><Info titulo="Valor total" valor={moeda(detalhe.valor_total)} /></div><div><h3 className="font-semibold mb-2">Movimentações relacionadas</h3>{detalhe.movimentacoes.length ? <div className="space-y-2">{detalhe.movimentacoes.map((item) => <div key={item.id} className="rounded-lg border p-3 flex justify-between gap-3"><div><p className="font-medium">{item.tipo} · {item.numero || "sem número"}</p><p className="text-xs text-muted-foreground">{dataBr(item.data)} · {item.situacao || "situação não informada"}</p></div><strong>{moeda(item.valor)}</strong></div>)}</div> : <p className="text-muted-foreground">Nenhuma movimentação relacionada.</p>}</div></div>}</DialogContent></Dialog>
  </div>;
}

function Carregando() { return <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>; }
function EstadoVazio({ texto }: { texto: string }) { return <div className="col-span-full rounded-xl border border-dashed py-14 text-center text-muted-foreground"><HandCoins className="w-9 h-9 mx-auto mb-3 opacity-50" /><p>{texto}</p></div>; }
function Info({ titulo, valor }: { titulo: string; valor: string }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground mb-1">{titulo}</p><p className="font-medium">{valor}</p></div>; }
function SecaoAlerta({ titulo, itens, vazio, onOpen }: { titulo: string; itens: Instrumento[]; vazio: string; onOpen: (id: string) => Promise<void> }) { return <Card><CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader><CardContent>{itens.length ? <div className="space-y-2">{itens.map((item) => <button key={item.id} type="button" onClick={() => void onOpen(item.id)} className="w-full rounded-lg border p-3 text-left hover:bg-muted"><p className="font-medium">{item.codigo || item.tipo}</p><p className="text-xs text-muted-foreground mt-1">{item.objeto || item.situacao} · {dataBr(item.fim_vigencia)} · {moeda(item.valor_total)}</p></button>)}</div> : <p className="text-sm text-muted-foreground">{vazio}</p>}</CardContent></Card>; }
