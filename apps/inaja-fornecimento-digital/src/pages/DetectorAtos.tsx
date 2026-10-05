import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, BarChart3, CalendarDays, CalendarRange, ChevronRight, CheckCircle2, ExternalLink, FileSearch, FileText, Loader2, Newspaper, RefreshCw, Search, Server, Tags } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { AppFooter } from "@/components/AppFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type Tab = "edicoes" | "publicacoes" | "panorama" | "operacao";
type Edicao = {
  id: number;
  titulo: string | null;
  data_publicacao: string | null;
  url: string | null;
  ocr_processado: number;
  tem_inaja: number;
  publicacoes_count: number;
  mencoes_count: number;
  ultimo_status: string | null;
  ultima_etapa: string | null;
  ultima_mensagem: string | null;
};
type JobEdicao = { id: number; etapa: string; status: string; mensagem: string | null; progress_current?: number | null; progress_total?: number | null; progress_step?: string | null; iniciado_em?: string | null; finalizado_em?: string | null };
type LiveStatus = { edicao_id: number; jobs: JobEdicao[]; has_running: boolean; current: JobEdicao | null };
type Progresso = { etapa: string; mensagem: string; status: string; atual?: number | null; total?: number | null; jobs?: JobEdicao[]; iniciadoEm?: number; atualizadoEm?: number; finalizadoEm?: number };
type Publicacao = {
  id: number;
  edicao_id: number;
  pagina: number | null;
  categoria: string | null;
  orgao: string | null;
  tipo: string | null;
  numero: string | null;
  data_documento: string | null;
  assunto: string | null;
  valor: string | null;
  trecho: string | null;
  edicao_titulo: string | null;
  data_publicacao: string | null;
  url: string | null;
};
type Health = {
  status: string;
  ok: boolean;
  bot_vivo: boolean;
  pendentes_ocr: number;
  pendentes_elegiveis: number;
  fila_proximo_ciclo: number;
  jobs_rodando: number;
  web_ultimo: string | null;
  bot_ultimo: string | null;
  problemas: string[];
  auto_process: boolean;
  modo?: string;
  ia_config_source?: string;
  deteccao_em_execucao?: boolean;
  analise_em_execucao?: boolean;
};
type Automacao = Record<string, string | number | boolean | null>;
type PorMes = { mes: string; total: number; com_inaja: number };
type PorTipo = { tipo: string; total: number };
type DiaEdicao = { dia: string; edicoes: Edicao[] };
type SemanaEdicao = { numero: number; inicio: number; fim: number; dias: DiaEdicao[] };
type MesEdicao = { mes: string; semanas: SemanaEdicao[] };
type AnoEdicao = { ano: string; meses: MesEdicao[] };

const tabs: PageTab<Tab>[] = [
  { id: "edicoes", label: "Edições", icon: Newspaper },
  { id: "publicacoes", label: "Publicações", icon: FileSearch },
  { id: "panorama", label: "Panorama", icon: BarChart3 },
  { id: "operacao", label: "Operação", icon: Activity },
];

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api/detector-atos${caminho}`, { credentials: "same-origin", ...init });
  const json = await resposta.json();
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o Detector de Atos.");
  return json.data as T;
}

function dataBr(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor.length === 10 ? `${valor}T12:00:00` : valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR");
}

function texto(valor: string | null | undefined) {
  return valor?.trim() || "—";
}

function mesAnoBr(valor: string) {
  if (valor === "sem-data") return "Sem data";
  const [ano, mes] = valor.split("-").map(Number);
  const data = new Date(ano, mes - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function semanaDoMes(valor: string | null | undefined) {
  if (!valor || valor.length < 10) return { numero: 0, inicio: 0, fim: 0 };
  const [ano, mes, dia] = valor.slice(0, 10).split("-").map(Number);
  const primeiroDia = new Date(ano, mes - 1, 1);
  const deslocamento = (primeiroDia.getDay() + 6) % 7;
  const numero = Math.floor((dia - 1 + deslocamento) / 7) + 1;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return {
    numero,
    inicio: Math.max(1, 1 + ((numero - 1) * 7) - deslocamento),
    fim: Math.min(ultimoDia, 1 + (numero * 7) - deslocamento),
  };
}

function intervaloSemanaBr(mes: string, inicio: number, fim: number) {
  if (mes === "sem-data") return "Sem período";
  const [ano, numeroMes] = mes.split("-").map(Number);
  const data = new Date(ano, numeroMes - 1, inicio);
  const nomeMes = data.toLocaleDateString("pt-BR", { month: "long" });
  return `${String(inicio).padStart(2, "0")} a ${String(fim).padStart(2, "0")} de ${nomeMes}`;
}

export default function DetectorAtos() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("edicoes");
  const [health, setHealth] = useState<Health | null>(null);
  const [automacao, setAutomacao] = useState<Automacao | null>(null);
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [edicoesDetectadas, setEdicoesDetectadas] = useState<Edicao[]>([]);
  const [porMes, setPorMes] = useState<PorMes[]>([]);
  const [porTipo, setPorTipo] = useState<PorTipo[]>([]);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [detalhe, setDetalhe] = useState<Publicacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [processandoId, setProcessandoId] = useState<number | null>(null);
  const [progressoPorEdicao, setProgressoPorEdicao] = useState<Record<number, Progresso>>({});
  const [mesEdicoes, setMesEdicoes] = useState("todos");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (notificar = false, silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const [novoHealth, novasEdicoes, novasPublicacoes, novosMeses, novosTipos, novaAutomacao] = await Promise.all([
        api<Health>("/health"),
        api<Edicao[]>("/edicoes"),
        api<Publicacao[]>("/publicacoes"),
        api<PorMes[]>("/graficos/por-mes"),
        api<PorTipo[]>("/graficos/por-tipo"),
        api<Automacao>("/automacao"),
      ]);
      setHealth(novoHealth);
      if (!novoHealth.deteccao_em_execucao) setEdicoesDetectadas(novasEdicoes);
      setPublicacoes(novasPublicacoes);
      setPorMes(novosMeses);
      setPorTipo(novosTipos);
      setAutomacao(novaAutomacao);
      setErro(null);
      if (notificar) toast({ title: "Detector atualizado", description: "Os dados mais recentes foram carregados." });
    } catch (error) {
      const mensagem = (error as Error).message;
      setErro(mensagem);
      if (!silencioso) setHealth(null);
      if (notificar) toast({ title: "Detector indisponível", description: mensagem, variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => {
    const timer = window.setInterval(() => void carregar(false, true), 10_000);
    return () => window.clearInterval(timer);
  }, [carregar]);

  const executarBusca = async () => {
    setExecutando(true);
    try {
      const resultado = await api<{ status: "started" | "running"; message: string }>("/executar", { method: "POST" });
      toast({ title: resultado.status === "running" ? "Detecção já em andamento" : "Detecção iniciada", description: resultado.message });
      setTab("edicoes");
      for (let tentativa = 0; tentativa < 120; tentativa += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const status = await api<Health>("/health");
        setHealth(status);
        if (!status.deteccao_em_execucao) {
          await carregar();
          toast({ title: "Detecção concluída", description: "A lista completa de edições foi atualizada." });
          break;
        }
      }
    } catch (error) {
      toast({ title: "Não foi possível iniciar a busca", description: (error as Error).message, variant: "destructive" });
    } finally {
      setExecutando(false);
    }
  };

  const processarEdicao = async (edicao: Edicao) => {
    setProcessandoId(edicao.id);
    setProgressoPorEdicao((atual) => ({ ...atual, [edicao.id]: { etapa: "Preparando edição", mensagem: "Aguardando o início do download…", status: "rodando", jobs: [], iniciadoEm: Date.now(), atualizadoEm: Date.now() } }));
    try {
      const estadoInicial = await api<LiveStatus>(`/edicoes/${edicao.id}/live-status`);
      const ultimoJobAntes = Math.max(0, ...estadoInicial.jobs.map((item) => item.id));
      const resultado = await api<{ status: "started"; message: string }>(`/edicoes/${edicao.id}/processar`, { method: "POST" });
      toast({ title: "Processamento iniciado", description: resultado.message });
      let observouAtividade = false;
      for (let tentativa = 0; tentativa < 1800; tentativa += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const [live, status] = await Promise.all([api<LiveStatus>(`/edicoes/${edicao.id}/live-status`), api<Health>("/health")]);
        setHealth(status);
        const job = live.current || live.jobs.find((item) => item.id > ultimoJobAntes) || null;
        if (job) setProgressoPorEdicao((atual) => ({ ...atual, [edicao.id]: { ...atual[edicao.id], etapa: job.etapa, mensagem: job.mensagem || "Executando etapa…", status: job.status, atual: job.progress_current, total: job.progress_total, jobs: live.jobs, iniciadoEm: atual[edicao.id]?.iniciadoEm || Date.now(), atualizadoEm: Date.now() } }));
        if ((job && job.status === "rodando") || status.analise_em_execucao) observouAtividade = true;
        const novoJobFinalizado = Boolean(job && job.status !== "rodando");
        if (novoJobFinalizado || (observouAtividade && !live.has_running && !status.analise_em_execucao) || (!observouAtividade && tentativa >= 4)) {
          setProgressoPorEdicao((atual) => ({ ...atual, [edicao.id]: { ...atual[edicao.id], etapa: job?.etapa || "Processamento concluído", mensagem: job?.mensagem || "Todas as etapas foram finalizadas.", status: job?.status || "concluido", jobs: live.jobs, atualizadoEm: Date.now(), finalizadoEm: Date.now() } }));
          await carregar();
          const falhou = live.jobs.some((item) => item.status === "erro");
          toast({ title: falhou ? "Processamento concluído com erro" : "Edição processada", description: job?.mensagem || (falhou ? "Consulte o detalhe da operação." : "OCR e detecção concluídos."), variant: falhou ? "destructive" : "default" });
          break;
        }
      }
    } catch (error) {
      toast({ title: "Não foi possível processar a edição", description: (error as Error).message, variant: "destructive" });
      setProgressoPorEdicao((atual) => ({ ...atual, [edicao.id]: { ...atual[edicao.id], etapa: "Falha no processamento", mensagem: (error as Error).message, status: "erro", atualizadoEm: Date.now(), finalizadoEm: Date.now() } }));
    } finally {
      setProcessandoId(null);
    }
  };

  const tipos = useMemo(() => Array.from(new Set(publicacoes.map((item) => item.tipo).filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b, "pt-BR")), [publicacoes]);
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return publicacoes.filter((item) => {
      if (tipo !== "todos" && item.tipo !== tipo) return false;
      if (!termo) return true;
      return [item.tipo, item.numero, item.orgao, item.assunto, item.trecho, item.edicao_titulo].some((valor) => valor?.toLocaleLowerCase("pt-BR").includes(termo));
    });
  }, [busca, publicacoes, tipo]);
  const maiorMes = Math.max(1, ...porMes.map((item) => Number(item.total || 0)));
  const maiorTipo = Math.max(1, ...porTipo.map((item) => Number(item.total || 0)));
  const ultimaPublicacao = publicacoes.find((item) => item.data_publicacao)?.data_publicacao || null;
  const pendentesVisiveis = useMemo(() => edicoesDetectadas.filter((item) => !item.ocr_processado).length, [edicoesDetectadas]);
  const mesesEdicoes = useMemo(() => Array.from(new Set(edicoesDetectadas.map((item) => item.data_publicacao?.slice(0, 7)).filter((item): item is string => Boolean(item)))).sort().reverse(), [edicoesDetectadas]);
  const edicoesPorAnoMesSemanaDia = useMemo(() => {
    const filtradas = mesEdicoes === "todos" ? edicoesDetectadas : edicoesDetectadas.filter((item) => item.data_publicacao?.startsWith(mesEdicoes));
    const grupos = new Map<string, Map<string, Map<number, Map<string, Edicao[]>>>>();
    for (const edicao of filtradas) {
      const ano = edicao.data_publicacao?.slice(0, 4) || "sem-data";
      const mes = edicao.data_publicacao?.slice(0, 7) || "sem-data";
      const dia = edicao.data_publicacao?.slice(0, 10) || "sem-data";
      const semana = semanaDoMes(edicao.data_publicacao);
      if (!grupos.has(ano)) grupos.set(ano, new Map());
      const meses = grupos.get(ano)!;
      if (!meses.has(mes)) meses.set(mes, new Map());
      const semanas = meses.get(mes)!;
      if (!semanas.has(semana.numero)) semanas.set(semana.numero, new Map());
      const dias = semanas.get(semana.numero)!;
      if (!dias.has(dia)) dias.set(dia, []);
      dias.get(dia)!.push(edicao);
    }
    return Array.from(grupos, ([ano, meses]) => ({
      ano,
      meses: Array.from(meses, ([mes, semanas]) => ({
        mes,
        semanas: Array.from(semanas, ([numero, dias]) => {
          const intervalo = semanaDoMes(Array.from(dias.keys()).find((dia) => dia !== "sem-data"));
          return { numero, inicio: intervalo.inicio, fim: intervalo.fim, dias: Array.from(dias, ([dia, edicoes]) => ({ dia, edicoes })) };
        }).sort((a, b) => a.numero - b.numero),
      })),
    }))
      .sort((a, b) => (a.ano === "sem-data" ? 1 : b.ano === "sem-data" ? -1 : b.ano.localeCompare(a.ano)))
      .map((grupoAno) => ({ ...grupoAno, meses: grupoAno.meses.sort((a, b) => (a.mes === "sem-data" ? 1 : b.mes === "sem-data" ? -1 : b.mes.localeCompare(a.mes))) }));
  }, [edicoesDetectadas, mesEdicoes]);

  const cards = [
    { titulo: "Atos encontrados", valor: publicacoes.length.toLocaleString("pt-BR"), icon: FileText },
    { titulo: "Edições detectadas", valor: edicoesDetectadas.length.toLocaleString("pt-BR"), icon: Newspaper },
    { titulo: "Pendentes de OCR", valor: pendentesVisiveis.toLocaleString("pt-BR"), icon: FileSearch },
    { titulo: "Última publicação", valor: dataBr(ultimaPublicacao), icon: CalendarDays },
  ];

  return <div className="min-h-screen bg-background flex flex-col">
    <PageHeader icon={Newspaper} title="Detector de Atos" subtitle="Detecção e processamento seletivo de edições" username={user} actions={<div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => void carregar(true)} disabled={carregando} aria-label="Atualizar dados">{carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</Button><Button size="sm" onClick={() => void executarBusca()} disabled={executando || Number(health?.jobs_rodando || 0) > 0}>{executando || Number(health?.jobs_rodando || 0) > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Detectar edições</Button></div>} />
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      <div className={`mb-5 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${erro ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
        <div className="flex items-start gap-3">
          {erro ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /> : <Activity className="mt-0.5 h-5 w-5 shrink-0 text-primary" />}
          <div><p className="text-sm font-semibold">{erro ? "Serviço do detector indisponível" : health?.deteccao_em_execucao ? "Detectando edições" : Number(health?.jobs_rodando || 0) > 0 ? "Processamento em andamento" : "Detector pronto para consulta"}</p><p className="mt-0.5 text-xs text-muted-foreground">{erro || (health?.deteccao_em_execucao ? "A lista completa será exibida quando a detecção terminar." : "Primeiro detecte as edições; depois escolha individualmente qual deseja processar.")}</p></div>
        </div>
        <Badge variant={erro ? "destructive" : "secondary"} className="w-fit">{erro ? "Desconectado" : health?.status === "ok" ? "Operacional" : "Atenção"}</Badge>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ titulo, valor, icon: Icon }) => <Card key={titulo}><CardContent className="p-4"><Icon className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">{titulo}</p><p className="mt-1 text-lg font-bold sm:text-xl">{carregando && !health ? "…" : valor}</p></CardContent></Card>)}</div>

      <PageTabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === "edicoes" && <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Edições detectadas</h2><p className="text-sm text-muted-foreground">Organizadas por ano, mês, semana e dia. O OCR e a IA só rodam na edição que você escolher. O acervo legado do Hnet não é exibido.</p></div>
          <Select value={mesEdicoes} onValueChange={setMesEdicoes}><SelectTrigger className="sm:w-64" aria-label="Filtrar edições por mês"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os meses</SelectItem>{mesesEdicoes.map((mes) => <SelectItem key={mes} value={mes}>{mesAnoBr(mes)}</SelectItem>)}</SelectContent></Select>
        </div>
        {carregando && !edicoesDetectadas.length ? <EstadoCarregando /> : erro ? <EstadoVazio icon={Server} titulo="Detector não conectado" descricao="Inicie o sistema pelo modo integrado e tente atualizar novamente." /> : !edicoesPorAnoMesSemanaDia.length ? <EstadoVazio icon={Newspaper} titulo="Nenhuma edição detectada" descricao="Clique em “Detectar edições” para consultar o jornal. Nada será processado automaticamente." /> : <div className="space-y-6">
          <EdicoesOrganizadas grupos={edicoesPorAnoMesSemanaDia} progressoPorEdicao={progressoPorEdicao} processandoId={processandoId} health={health} processarEdicao={processarEdicao} />
        </div>}
      </section>}

      {tab === "publicacoes" && <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar órgão, assunto, número ou trecho" className="pl-9" aria-label="Buscar publicações" /></div><Select value={tipo} onValueChange={setTipo}><SelectTrigger className="sm:w-64" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem>{tipos.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        {carregando ? <EstadoCarregando /> : erro ? <EstadoVazio icon={Server} titulo="Detector não conectado" descricao="Inicie o sistema pelo modo integrado e tente atualizar novamente." /> : filtradas.length ? <Card className="overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Publicação</TableHead><TableHead>Órgão</TableHead><TableHead>Data</TableHead><TableHead>Página</TableHead></TableRow></TableHeader><TableBody>{filtradas.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => setDetalhe(item)}><TableCell className="min-w-72"><p className="font-semibold">{texto(item.tipo)}{item.numero ? ` nº ${item.numero}` : ""}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{texto(item.assunto || item.trecho)}</p></TableCell><TableCell>{texto(item.orgao)}</TableCell><TableCell className="whitespace-nowrap">{dataBr(item.data_documento || item.data_publicacao)}</TableCell><TableCell>{item.pagina ?? "—"}</TableCell></TableRow>)}</TableBody></Table></div></Card> : <EstadoVazio icon={FileSearch} titulo={publicacoes.length ? "Nenhum resultado" : "Nenhum ato encontrado ainda"} descricao={publicacoes.length ? "Ajuste a busca ou o filtro de tipo." : "Os atos aparecerão aqui após o processamento das edições."} />}
      </section>}

      {tab === "panorama" && <section className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />Publicações por mês</CardTitle></CardHeader><CardContent>{porMes.length ? <div className="space-y-3">{porMes.map((item) => <Barra key={item.mes} label={item.mes?.split("-").reverse().join("/") || "Sem data"} valor={item.total} maximo={maiorMes} />)}</div> : <p className="text-sm text-muted-foreground">Ainda não há dados mensais.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tags className="h-4 w-4 text-primary" />Tipos de ato</CardTitle></CardHeader><CardContent>{porTipo.length ? <div className="space-y-3">{porTipo.map((item) => <Barra key={item.tipo} label={item.tipo} valor={item.total} maximo={maiorTipo} />)}</div> : <p className="text-sm text-muted-foreground">Ainda não há tipos classificados.</p>}</CardContent></Card>
      </section>}

      {tab === "operacao" && <section className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Saúde do monitor</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3"><Info titulo="Estado" valor={Number(health?.jobs_rodando || 0) > 0 ? "Em execução" : "Aguardando solicitação"} /><Info titulo="Processamento" valor="Sob demanda" /><Info titulo="Trabalhos em execução" valor={String(health?.jobs_rodando ?? 0)} /><Info titulo="Próxima busca" valor="Somente quando solicitada" /><Info titulo="Última varredura web" valor={dataBr(health?.web_ultimo)} /><Info titulo="Último ciclo executado" valor={dataBr(health?.bot_ultimo)} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="h-4 w-4 text-primary" />Fila e automação</CardTitle></CardHeader><CardContent className="space-y-3"><Info titulo="Pendentes de OCR" valor={String(pendentesVisiveis)} /><Info titulo="Edições disponíveis" valor={String(edicoesDetectadas.length)} /><Info titulo="Inteligência artificial" valor={health?.ia_config_source === "prefeitura" ? "Configuração da Prefeitura" : "Configuração própria"} /><Info titulo="Estado informado pelo serviço" valor={String(automacao?.bot_status || automacao?.status || health?.status || "Indisponível")} />{health?.problemas?.length ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><p className="font-medium">Pontos de atenção</p><p className="mt-1 text-muted-foreground">{health.problemas.join(", ")}</p></div> : <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">Nenhum problema crítico informado pelo detector.</div>}</CardContent></Card>
      </section>}
    </main>
    <AppFooter />

    <Dialog open={Boolean(detalhe)} onOpenChange={(aberto) => { if (!aberto) setDetalhe(null); }}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto text-foreground"><DialogHeader><DialogTitle className="text-foreground">{texto(detalhe?.tipo)}{detalhe?.numero ? ` nº ${detalhe.numero}` : ""}</DialogTitle></DialogHeader>{detalhe && <div className="min-w-0 space-y-4"><div className="grid min-w-0 gap-3 sm:grid-cols-2"><Info titulo="Órgão" valor={texto(detalhe.orgao)} /><Info titulo="Data do documento" valor={dataBr(detalhe.data_documento || detalhe.data_publicacao)} /><Info titulo="Edição" valor={texto(detalhe.edicao_titulo)} /><Info titulo="Página" valor={String(detalhe.pagina ?? "—")} /><Info titulo="Categoria" valor={texto(detalhe.categoria)} /><Info titulo="Valor" valor={texto(detalhe.valor)} /></div><div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">Assunto</p><p className="break-words text-sm leading-relaxed text-foreground">{texto(detalhe.assunto)}</p></div><div className="min-w-0"><p className="mb-1 text-xs text-muted-foreground">Trecho identificado</p><p className="break-words whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground">{texto(detalhe.trecho)}</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => window.open(`/api/detector-atos/edicoes/${detalhe.edicao_id}/pdf`, "_blank", "noopener,noreferrer")}><FileText className="mr-2 h-4 w-4" />Abrir PDF</Button>{detalhe.url && <Button variant="outline" onClick={() => window.open(detalhe.url!, "_blank", "noopener,noreferrer")}><ExternalLink className="mr-2 h-4 w-4" />Fonte original</Button>}</div></div>}</DialogContent></Dialog>
  </div>;
}

function EstadoCarregando() { return <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando publicações...</div>; }
function EstadoVazio({ icon: Icon, titulo, descricao }: { icon: typeof FileSearch; titulo: string; descricao: string }) { return <div className="rounded-xl border border-dashed py-14 text-center"><Icon className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-semibold">{titulo}</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{descricao}</p></div>; }
function Info({ titulo, valor }: { titulo: string; valor: string }) { return <div className="min-w-0 rounded-lg border border-border/50 bg-muted/40 p-3 text-card-foreground"><p className="text-xs text-muted-foreground">{titulo}</p><p className="mt-1 break-words text-sm font-semibold text-foreground">{valor}</p></div>; }
function EdicoesOrganizadas({ grupos, progressoPorEdicao, processandoId, health, processarEdicao }: { grupos: AnoEdicao[]; progressoPorEdicao: Record<number, Progresso>; processandoId: number | null; health: Health | null; processarEdicao: (edicao: Edicao) => Promise<void> }) {
  const totalEdicoes = grupos.reduce((totalAno, grupoAno) => totalAno + grupoAno.meses.reduce((totalMes, grupoMes) => totalMes + grupoMes.semanas.reduce((totalSemana, grupoSemana) => totalSemana + grupoSemana.dias.reduce((totalDia, grupoDia) => totalDia + grupoDia.edicoes.length, 0), 0), 0), 0);
  const totalSemanas = grupos.reduce((totalAno, grupoAno) => totalAno + grupoAno.meses.reduce((totalMes, grupoMes) => totalMes + grupoMes.semanas.length, 0), 0);
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarRange className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Calendário de edições</p><p className="mt-0.5 break-words text-sm text-foreground">{totalEdicoes} {totalEdicoes === 1 ? "edição" : "edições"} distribuídas por período</p></div></div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{grupos.length} {grupos.length === 1 ? "ano" : "anos"}</Badge><Badge variant="outline">{totalSemanas} {totalSemanas === 1 ? "semana" : "semanas"}</Badge></div>
    </div>
    {grupos.map((grupoAno) => <section key={grupoAno.ano} className="min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><CalendarDays className="h-5 w-5" /></div><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Ano</p><h3 className="mt-0.5 text-xl font-bold">{grupoAno.ano === "sem-data" ? "Sem ano" : grupoAno.ano}</h3></div></div><Badge variant="secondary" className="w-fit">{grupoAno.meses.length} {grupoAno.meses.length === 1 ? "mês" : "meses"}</Badge></div>
      <div className="space-y-4 p-3 sm:p-5">
        {grupoAno.meses.map((grupoMes) => {
          const totalMes = grupoMes.semanas.reduce((total, grupoSemana) => total + grupoSemana.dias.reduce((totalDia, grupoDia) => totalDia + grupoDia.edicoes.length, 0), 0);
          return <div key={grupoMes.mes} className="min-w-0 rounded-xl border bg-background/35">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3 sm:px-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Mês</p><h4 className="mt-0.5 text-base font-bold capitalize">{mesAnoBr(grupoMes.mes)}</h4></div><Badge variant="outline">{totalMes} {totalMes === 1 ? "edição" : "edições"}</Badge></div>
            <div className="space-y-3 p-3 sm:p-4">
              {grupoMes.semanas.map((grupoSemana) => {
                const totalSemana = grupoSemana.dias.reduce((total, grupoDia) => total + grupoDia.edicoes.length, 0);
                return <div key={`${grupoMes.mes}-${grupoSemana.numero}`} className="min-w-0 overflow-hidden rounded-xl border border-dashed bg-background/50">
                  <div className="flex flex-col gap-2 border-b bg-muted/15 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><ChevronRight className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-sm font-bold">{grupoSemana.numero ? `Semana ${grupoSemana.numero}` : "Sem semana"}</p><p className="break-words text-xs text-muted-foreground">{intervaloSemanaBr(grupoMes.mes, grupoSemana.inicio, grupoSemana.fim)}</p></div></div><Badge variant="outline" className="w-fit">{totalSemana} {totalSemana === 1 ? "edição" : "edições"}</Badge></div>
                  <div className="divide-y divide-border/60">
                    {grupoSemana.dias.map((grupoDia) => {
                      const dataDia = grupoDia.dia === "sem-data" ? null : new Date(`${grupoDia.dia}T12:00:00`);
                      const diaNumero = dataDia ? dataDia.toLocaleDateString("pt-BR", { day: "2-digit" }) : "—";
                      const diaNome = dataDia ? dataDia.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Sem data";
                      return <div key={grupoDia.dia} className="grid min-w-0 gap-3 p-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-5 sm:p-4">
                        <div className="flex min-w-0 items-start gap-3 sm:border-r sm:pr-4"><div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary"><span className="text-lg font-bold leading-none">{diaNumero}</span><span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide">dia</span></div><div className="min-w-0 pt-1"><p className="break-words text-sm font-bold capitalize">{diaNome}</p><p className="mt-1 text-xs text-muted-foreground">{grupoDia.edicoes.length} {grupoDia.edicoes.length === 1 ? "edição" : "edições"}</p></div></div>
                        <div className="min-w-0 space-y-2">{grupoDia.edicoes.map((edicao) => {
                          const progresso = progressoPorEdicao[edicao.id];
                          const rodando = processandoId === edicao.id || edicao.ultimo_status === "rodando";
                          const status = rodando ? "Em andamento" : edicao.ocr_processado ? "Processada" : "Pendente";
                          return <div key={edicao.id} className="min-w-0 rounded-lg border bg-card p-3 shadow-sm"><div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex min-w-0 flex-wrap items-center gap-2"><p className="break-words text-sm font-semibold">{texto(edicao.titulo)}</p><Badge variant={rodando ? "default" : edicao.ocr_processado ? "secondary" : "outline"} className="shrink-0">{rodando ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : edicao.ocr_processado ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}{status}</Badge></div><div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground"><span>Edição #{edicao.id}</span>{edicao.publicacoes_count > 0 && <><span>•</span><span>{edicao.publicacoes_count} ato(s)</span></>}{edicao.mencoes_count > 0 && <><span>•</span><span>{edicao.mencoes_count} menção(ões)</span></>}</div></div><div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 lg:flex lg:w-auto">{edicao.url && <Button className="w-full min-w-0" size="sm" variant="outline" onClick={() => window.open(edicao.url!, "_blank", "noopener,noreferrer")}><ExternalLink className="mr-2 h-4 w-4 shrink-0" />Fonte</Button>}<Button className="w-full min-w-0 whitespace-normal" size="sm" onClick={() => void processarEdicao(edicao)} disabled={rodando || Number(health?.jobs_rodando || 0) > 0}>{rodando ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <FileSearch className="mr-2 h-4 w-4 shrink-0" />}{rodando ? "Processando…" : edicao.ocr_processado ? "Processar novamente" : "Processar edição"}</Button></div></div>{progresso && <ProgressoEdicao progresso={progresso} />}</div>;
                        })}</div>
                      </div>;
                    })}
                  </div>
                </div>;
              })}
            </div>
          </div>;
        })}
      </div>
    </section>)}
  </div>;
}
function ProgressoEdicao({ progresso }: { progresso: Progresso }) {
  const nomeEtapa = (valor: string) => { const normalizada = valor.toLocaleLowerCase("pt-BR"); return normalizada.includes("baix") ? "Download do PDF" : normalizada.includes("ocr") ? "OCR e extração do texto" : normalizada.includes("detect") ? "Detecção de atos e análise por IA" : normalizada.includes("notific") ? "Geração de alertas" : valor; };
  const etapa = nomeEtapa(progresso.etapa);
  const fracaoMensagem = progresso.mensagem.match(/(\d+)\s*\/\s*(\d+)/);
  const atual = Number(progresso.atual ?? fracaoMensagem?.[1] ?? 0);
  const total = Number(progresso.total ?? fracaoMensagem?.[2] ?? 0);
  const percentual = total > 0 ? Math.min(100, Math.max(0, Math.round((atual / total) * 100))) : null;
  const erro = progresso.status === "erro";
  const concluido = progresso.status === "concluido" || progresso.status === "aviso";
  const agora = progresso.finalizadoEm || Date.now();
  const segundos = progresso.iniciadoEm ? Math.max(0, Math.floor((agora - progresso.iniciadoEm) / 1000)) : 0;
  const duracao = segundos >= 60 ? `${Math.floor(segundos / 60)}min ${segundos % 60}s` : `${segundos}s`;
  const atualizadoHa = progresso.atualizadoEm ? Math.max(0, Math.floor((Date.now() - progresso.atualizadoEm) / 1000)) : 0;
  const jobs = [...(progresso.jobs || [])].sort((a, b) => a.id - b.id);
  const fases = [
    { nome: "Download do PDF", job: jobs.find((item) => item.etapa.toLocaleLowerCase("pt-BR").includes("baix")) },
    { nome: "OCR e extração", job: jobs.find((item) => item.etapa.toLocaleLowerCase("pt-BR").includes("ocr")) },
    { nome: "Detecção + IA", job: jobs.find((item) => item.etapa.toLocaleLowerCase("pt-BR").includes("detect")) },
    { nome: "Resultado", job: jobs.find((item) => item.etapa.toLocaleLowerCase("pt-BR").includes("notific")) },
  ];
  const rotuloStatus = (status: string) => status === "rodando" ? "Em andamento" : status === "concluido" ? "Concluído" : status === "aviso" ? "Concluído com aviso" : status === "erro" ? "Erro" : "Aguardando";
  return <div className={`mt-3 min-w-0 overflow-hidden rounded-xl border ${erro ? "border-destructive/40 bg-destructive/5" : concluido ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-primary/5"}`} aria-live="polite">
    <div className="border-b bg-background/60 p-3 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">{erro ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /> : concluido ? <Activity className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Etapa atual</p><p className="mt-0.5 break-words text-sm font-bold">{concluido ? "Processamento finalizado" : etapa}</p></div><Badge variant={erro ? "destructive" : "secondary"}>{rotuloStatus(progresso.status)}</Badge></div><p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{progresso.mensagem}</p></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Info titulo="Progresso da etapa" valor={percentual === null ? (concluido ? "100%" : "Calculando…") : `${percentual}%`} /><Info titulo={etapa.toLocaleLowerCase("pt-BR").includes("ocr") ? "Páginas" : "Itens da etapa"} valor={total > 0 ? `${atual} de ${total}` : "Aguardando"} /><Info titulo="Tempo decorrido" valor={duracao} /><Info titulo="Atualização" valor={concluido ? "Finalizada" : atualizadoHa <= 2 ? "Agora" : `Há ${atualizadoHa}s`} /></div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all duration-500 ${erro ? "bg-destructive" : concluido ? "bg-emerald-500" : percentual === null ? "w-1/2 animate-pulse bg-primary" : "bg-primary"}`} style={percentual === null ? undefined : { width: `${percentual}%` }} /></div>
    </div>

    <div className="space-y-4 p-3 sm:p-4">
      <div><p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Linha do tempo</p><div className="space-y-2">{fases.map((fase, indice) => {
        const faseResultado = indice === fases.length - 1 && !fase.job && concluido;
        const status = fase.job?.status || (faseResultado ? progresso.status : "pendente");
        const ativo = fase.job?.status === "rodando";
        const mensagem = fase.job?.mensagem || (faseResultado ? "Resultado salvo e painel atualizado." : ativo ? "Executando…" : "Ainda não iniciada.");
        return <div key={fase.nome} className={`flex min-w-0 gap-3 rounded-lg border p-3 ${ativo ? "border-primary/30 bg-primary/5" : status === "erro" ? "border-destructive/30" : "bg-background/50"}`}><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${status === "concluido" || status === "aviso" ? "bg-emerald-500/15 text-emerald-700" : ativo ? "bg-primary/15 text-primary" : status === "erro" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{status === "concluido" || status === "aviso" ? "✓" : status === "erro" ? "!" : indice + 1}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-xs font-semibold">{fase.nome}</p><span className="text-[11px] text-muted-foreground">{rotuloStatus(status)}</span></div><p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{mensagem}</p>{fase.job && Number(fase.job.progress_total || 0) > 0 && <p className="mt-1 text-[11px] font-medium tabular-nums">{Number(fase.job.progress_current || 0)} de {Number(fase.job.progress_total)}</p>}</div></div>;
      })}</div></div>

      {jobs.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Registro das atividades</p><div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border bg-background/50 p-2">{[...jobs].reverse().slice(0, 8).map((job) => <div key={job.id} className="min-w-0 border-b px-1 pb-2 text-[11px] last:border-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-1"><span className="font-semibold">{nomeEtapa(job.etapa)}</span><span className={job.status === "erro" ? "text-destructive" : "text-muted-foreground"}>{rotuloStatus(job.status)}</span></div><p className="mt-0.5 break-words text-muted-foreground">{job.mensagem || "Sem mensagem adicional."}</p></div>)}</div></div>}
    </div>
  </div>;
}
function Barra({ label, valor, maximo }: { label: string; valor: number; maximo: number }) { const largura = Math.max(valor > 0 ? 4 : 0, Math.round((Number(valor || 0) / maximo) * 100)); return <div><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium">{label}</span><span className="font-semibold tabular-nums">{Number(valor || 0).toLocaleString("pt-BR")}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${largura}%` }} /></div></div>; }
