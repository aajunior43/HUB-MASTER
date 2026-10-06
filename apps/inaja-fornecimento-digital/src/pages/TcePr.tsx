import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Building2, CalendarRange, Download, ExternalLink, FileSearch, FileSpreadsheet, Gavel, Landmark, Loader2, MapPin, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { DataPagination } from "@/components/DataPagination";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { exportarTcePrExcel, exportarTcePrPdf } from "@/lib/tceprExport";

type Tab = "licitacoes" | "obras" | "pendencias";
type Licitacao = {
  id: string;
  chave_externa: string;
  orgao_nome: string | null;
  codigo_ibge: string | null;
  municipio: string | null;
  ano: number | null;
  processo: string | null;
  edital: string | null;
  modalidade: string | null;
  tipo_avaliacao: string | null;
  objeto: string | null;
  data_abertura: string | null;
  data_publicacao: string | null;
  valor_referencia: number;
  data_cancelamento: string | null;
  situacao: string;
  pncp_encontrado?: number;
};
type Obra = {
  id: string;
  chave_externa: string;
  id_intervencao: string;
  orgao_nome: string | null;
  codigo_ibge: string | null;
  municipio: string | null;
  ano: number | null;
  tipo_intervencao: string | null;
  nome_intervencao: string | null;
  tipo_obra: string | null;
  objeto: string | null;
  valor: number;
  data_inicio: string | null;
  prazo_execucao: number | null;
  regime: string | null;
  situacao: string;
  percentual_fisico: number | null;
  ultimo_acompanhamento: string | null;
  observacao_ultimo_acompanhamento: string | null;
};
type Status = {
  config: { cnpj: string; ibge: string; anos: number[]; intervaloHoras: number };
  resumo: { licitacoes: number; valor_licitacoes: number; obras: number; valor_obras: number; obras_paralisadas: number; obras_sem_acompanhamento: number };
  ultima: { status: string; iniciado_em: string; finalizado_em: string | null; erros: string } | null;
  isAdmin: boolean;
  sincronizacaoAutomatica: boolean;
};
type Pendencias = {
  semPncp: (Licitacao & { edital: string | null })[];
  pncpSemTce: { id: string; numero: string | null; ano: number | null; processo: string | null; objeto: string | null; valor: number; data_publicacao: string | null; situacao: string | null; fornecedor_nome: string | null }[];
  obrasParalisadas: Obra[];
  obrasSemAcompanhamento: Obra[];
  totais: { semPncp: number; pncpSemTce: number; obrasParalisadas: number; obrasSemAcompanhamento: number };
};
type Acompanhamento = {
  id: string;
  origem: string | null;
  numero: string | null;
  data: string | null;
  tipo: string | null;
  responsavel: string | null;
  tipo_documento_responsavel: string | null;
  documento_responsavel: string | null;
  observacao: string | null;
  tipo_medicao: string | null;
  percentual_fisico: number | null;
  motivo_paralisacao: string | null;
};
type DetalheLicitacaoItem = Licitacao & { raw: Record<string, string>; fonte: string };
type DetalheObraItem = Obra & { raw: Record<string, string>; acompanhamentos: Acompanhamento[] };
type Detalhe =
  | { tipo: "licitacao"; item: DetalheLicitacaoItem }
  | { tipo: "obra"; item: DetalheObraItem };

const tabs: PageTab<Tab>[] = [
  { id: "licitacoes", label: "Licitações", icon: Gavel },
  { id: "obras", label: "Obras municipais", icon: Building2 },
  { id: "pendencias", label: "Conferências", icon: AlertTriangle },
];

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api/tce-pr${caminho}`, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const json = await resposta.json();
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o TCE-PR.");
  return json.data as T;
}

function dataBr(valor: string | null | undefined) {
  if (!valor) return "—";
  const base = String(valor).slice(0, 10);
  const data = new Date(`${base}T00:00:00Z`);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function moeda(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numeroBr(valor: number | null | undefined) {
  return valor === null || valor === undefined ? "—" : Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export default function TcePr() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("licitacoes");
  const [status, setStatus] = useState<Status | null>(null);
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [pendencias, setPendencias] = useState<Pendencias | null>(null);
  const [busca, setBusca] = useState("");
  const [ano, setAno] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);

  const carregarStatus = useCallback(async () => {
    try {
      setStatus(await api<Status>("/status"));
    } catch (erro) {
      toast({ title: "Falha ao abrir o TCE-PR", description: String((erro as Error).message), variant: "destructive" });
    }
  }, []);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      if (tab === "pendencias") {
        setPendencias(await api<Pendencias>("/pendencias"));
      } else {
        const params = new URLSearchParams({ busca, pagina: String(pagina) });
        if (ano !== "todos") params.set("ano", ano);
        const dados = await api<{ rows: Licitacao[] | Obra[]; total: number }>(`/${tab}?${params}`);
        setTotal(dados.total);
        if (tab === "licitacoes") setLicitacoes(dados.rows as Licitacao[]);
        else setObras(dados.rows as Obra[]);
      }
    } catch (erro) {
      toast({ title: "Falha na consulta", description: String((erro as Error).message), variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  }, [ano, busca, pagina, tab]);

  useEffect(() => { void carregarStatus(); }, [carregarStatus]);
  useEffect(() => { const timer = window.setTimeout(() => void carregar(), 250); return () => window.clearTimeout(timer); }, [carregar]);
  useEffect(() => {
    if (!status?.sincronizacaoAutomatica) return;
    const timer = window.setInterval(() => { void carregarStatus(); void carregar(true); }, 15_000);
    return () => window.clearInterval(timer);
  }, [carregar, carregarStatus, status?.sincronizacaoAutomatica]);
  useEffect(() => { setPagina(1); }, [ano, busca, tab]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const resultado = await api<{ status: string; recebidos: number; totais: { licitacoes: number; obras: number; acompanhamentos: number }; erros: string[] }>("/sincronizar", { method: "POST", body: JSON.stringify({}) });
      toast({ title: resultado.status === "parcial" ? "Sincronização parcial" : "Consulta concluída", description: `${resultado.recebidos.toLocaleString("pt-BR")} registros processados${resultado.erros.length ? `; ${resultado.erros.length} fonte(s) com falha` : "."}` });
      await Promise.all([carregarStatus(), carregar()]);
    } catch (erro) {
      toast({ title: "Falha na sincronização", description: String((erro as Error).message), variant: "destructive" });
    } finally {
      setSincronizando(false);
    }
  };

  const abrirDetalhe = async (tipo: "licitacao" | "obra", id: string) => {
    setAbrindo(true);
    try {
      const item = await api<Record<string, unknown>>(`/detalhe?tipo=${tipo}&id=${encodeURIComponent(id)}`);
      if (tipo === "obra") setDetalhe({ tipo, item: item as unknown as DetalheObraItem });
      else setDetalhe({ tipo, item: item as unknown as DetalheLicitacaoItem });
    } catch (erro) {
      toast({ title: "Falha ao abrir registro", description: String((erro as Error).message), variant: "destructive" });
    } finally {
      setAbrindo(false);
    }
  };

  const handleExportarExcel = async () => {
    setExportandoExcel(true);
    try {
      await exportarTcePrExcel({
        tab,
        licitacoes,
        obras,
        pendencias,
        ano,
        busca,
        total,
      });
      toast({ title: "Relatório gerado", description: "Planilha Excel do TCE-PR exportada com sucesso." });
    } catch (e) {
      toast({ title: "Erro na exportação", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleExportarPdf = async () => {
    setExportandoPdf(true);
    try {
      await exportarTcePrPdf({
        tab,
        licitacoes,
        obras,
        pendencias,
        ano,
        busca,
        total,
      });
      toast({ title: "Relatório gerado", description: "Relatório em PDF do TCE-PR gerado com sucesso." });
    } catch (e) {
      toast({ title: "Erro na exportação", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setExportandoPdf(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / 30));
  const anos = useMemo(() => status?.config.anos || [], [status]);
  const cards = [
    ["Licitações", status?.resumo.licitacoes || 0, ""],
    ["Valor de referência", moeda(status?.resumo.valor_licitacoes), ""],
    ["Obras municipais", status?.resumo.obras || 0, ""],
    ["Obras paralisadas", status?.resumo.obras_paralisadas || 0, ""],
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader icon={Landmark} title="TCE-PR — Dados abertos" subtitle="Licitações, obras e conferência com o PNCP" username={user} actions={status?.isAdmin ? <Button size="sm" onClick={sincronizar} disabled={sincronizando}>{sincronizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Sincronizar</Button> : undefined} />
      <main className="w-full max-w-7xl mx-auto flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
          {cards.map(([rotulo, valor]) => <Card key={rotulo}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{rotulo}</p><p className="text-2xl font-bold mt-1">{typeof valor === "number" ? valor.toLocaleString("pt-BR") : valor}</p></CardContent></Card>)}
        </div>
        <div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>Órgão: {status?.config.cnpj || "76.970.318/0001-67"} · IBGE: {status?.config.ibge || "4110300"} · Anos: {status?.config.anos.join(", ") || "—"}</span>
          <span>Última sincronização: {status?.ultima ? `${dataBr(status.ultima.finalizado_em || status.ultima.iniciado_em)} · ${status.ultima.status}` : "ainda não realizada"}</span>
        </div>
        <PageTabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          {tab !== "pendencias" ? (
            <div className="flex flex-col sm:flex-row gap-2 max-w-2xl flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por objeto, município, processo ou modalidade" className="pl-9" />
              </div>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger className="sm:w-40"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : <div className="flex-1" />}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button size="sm" variant="outline" onClick={() => void handleExportarExcel()} disabled={exportandoExcel || carregando}>
              {exportandoExcel ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />}
              Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleExportarPdf()} disabled={exportandoPdf || carregando}>
              {exportandoPdf ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
              PDF
            </Button>
          </div>
        </div>
        {carregando ? <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div> : tab === "pendencias" ? <PainelPendencias pendencias={pendencias} abrirDetalhe={abrirDetalhe} /> : tab === "licitacoes" ? (
          licitacoes.length ? <Card><Table><TableHeader><TableRow><TableHead>Processo / edital</TableHead><TableHead>Objeto</TableHead><TableHead>Modalidade</TableHead><TableHead>Publicação</TableHead><TableHead className="text-right">Referência</TableHead><TableHead>PNCP</TableHead></TableRow></TableHeader><TableBody>{licitacoes.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => void abrirDetalhe("licitacao", item.id)}><TableCell className="font-medium whitespace-nowrap">{item.processo || item.edital || "Sem número"}<div className="text-xs text-muted-foreground">{item.ano || ""}</div></TableCell><TableCell className="max-w-md"><p className="line-clamp-2">{item.objeto || "Sem objeto informado"}</p><p className="text-xs text-muted-foreground mt-1">{item.municipio || "Município não informado"}</p></TableCell><TableCell><Badge variant="outline">{item.modalidade || "Não informada"}</Badge></TableCell><TableCell>{dataBr(item.data_publicacao || item.data_abertura)}</TableCell><TableCell className="text-right whitespace-nowrap">{moeda(item.valor_referencia)}</TableCell><TableCell>{item.pncp_encontrado ? <Badge variant="secondary">Conferida</Badge> : <Badge variant="outline">Revisar</Badge>}</TableCell></TableRow>)}</TableBody></Table><DataPagination pagina={pagina} totalPaginas={totalPaginas} total={total} onPagina={setPagina} className="p-4 border-t" /></Card> : <Vazio isAdmin={Boolean(status?.isAdmin)} sincronizar={sincronizar} texto="Nenhuma licitação do TCE-PR encontrada." />
        ) : obras.length ? <Card><Table><TableHeader><TableRow><TableHead>Intervenção / objeto</TableHead><TableHead>Município / ano</TableHead><TableHead>Situação</TableHead><TableHead>Último acompanhamento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{obras.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => void abrirDetalhe("obra", item.id)}><TableCell className="max-w-lg"><p className="font-medium line-clamp-1">{item.nome_intervencao || item.objeto || "Intervenção sem nome"}</p><p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.objeto || item.tipo_obra || "Sem objeto informado"}</p></TableCell><TableCell className="whitespace-nowrap"><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{item.municipio || "—"}</span><span className="text-xs text-muted-foreground">{item.ano || "—"}</span></TableCell><TableCell><Badge variant={item.situacao === "Paralisada" ? "destructive" : item.situacao === "Concluída" ? "secondary" : "outline"}>{item.situacao}</Badge><div className="text-xs text-muted-foreground mt-1">{item.percentual_fisico === null ? "Percentual não informado" : `${numeroBr(item.percentual_fisico)}% físico`}</div></TableCell><TableCell>{dataBr(item.ultimo_acompanhamento)}<div className="text-xs text-muted-foreground max-w-xs line-clamp-1">{item.observacao_ultimo_acompanhamento || ""}</div></TableCell><TableCell className="text-right whitespace-nowrap">{moeda(item.valor)}</TableCell></TableRow>)}</TableBody></Table><DataPagination pagina={pagina} totalPaginas={totalPaginas} total={total} onPagina={setPagina} className="p-4 border-t" /></Card> : <Vazio isAdmin={Boolean(status?.isAdmin)} sincronizar={sincronizar} texto="Nenhuma obra municipal do TCE-PR encontrada." />}
      </main>
      <AppFooter />
      <Dialog open={Boolean(detalhe) || abrindo} onOpenChange={(aberto) => { if (!aberto) setDetalhe(null); }}><DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>{abrindo && !detalhe ? "Carregando registro..." : detalhe?.item.objeto || (detalhe?.tipo === "obra" ? detalhe.item.nome_intervencao : detalhe?.item.processo) || "Detalhe TCE-PR"}</DialogTitle></DialogHeader>{detalhe?.tipo === "licitacao" && <DetalheLicitacao item={detalhe.item} />}{detalhe?.tipo === "obra" && <DetalheObra item={detalhe.item} />}</DialogContent></Dialog>
    </div>
  );
}

function Vazio({ texto, isAdmin, sincronizar }: { texto: string; isAdmin: boolean; sincronizar: () => Promise<void> }) {
  return <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground"><FileSearch className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>{texto}</p>{isAdmin && <Button variant="outline" className="mt-4" onClick={() => void sincronizar()}>Fazer sincronização</Button>}</div>;
}

function PainelPendencias({ pendencias, abrirDetalhe }: { pendencias: Pendencias | null; abrirDetalhe: (tipo: "licitacao" | "obra", id: string) => Promise<void> }) {
  return <div className="space-y-6"><ResumoPendencia titulo="Licitações do TCE-PR sem correspondência no PNCP" descricao="Confira se a publicação precisa ser cadastrada ou vinculada no PNCP." vazio="Nenhuma licitação pendente." itens={(pendencias?.semPncp || []).map((item) => <Linha key={item.id} titulo={item.objeto || item.processo || item.edital || "Licitação sem objeto"} detalhe={`${item.modalidade || "Modalidade não informada"} · ${item.ano || "—"} · ${moeda(item.valor_referencia)}`} onClick={() => void abrirDetalhe("licitacao", item.id)} />)} /><ResumoPendencia titulo="Publicações do PNCP sem correspondência no TCE-PR" descricao="Diferenças podem indicar atraso, divergência de processo ou cadastro incompleto." vazio="Nenhuma publicação pendente." itens={(pendencias?.pncpSemTce || []).map((item) => <Linha key={item.id} titulo={item.objeto || item.numero || "Publicação sem objeto"} detalhe={`${item.numero || "Sem número"} · ${item.ano || "—"} · ${moeda(item.valor)}`} />)} /><ResumoPendencia titulo="Obras paralisadas" descricao="Intervenções com acompanhamento ou observação indicando paralisação." vazio="Nenhuma obra paralisada identificada." itens={(pendencias?.obrasParalisadas || []).map((item) => <Linha key={item.id} titulo={item.nome_intervencao || item.objeto || "Obra sem nome"} detalhe={`${item.municipio || "Município não informado"} · ${numeroBr(item.percentual_fisico)}% físico · último registro ${dataBr(item.ultimo_acompanhamento)}`} onClick={() => void abrirDetalhe("obra", item.id)} />)} /><ResumoPendencia titulo="Obras sem acompanhamento" descricao="Obras do cadastro do TCE-PR sem registro de acompanhamento importado." vazio="Todas as obras possuem acompanhamento." itens={(pendencias?.obrasSemAcompanhamento || []).map((item) => <Linha key={item.id} titulo={item.nome_intervencao || item.objeto || "Obra sem nome"} detalhe={`${item.municipio || "Município não informado"} · início ${dataBr(item.data_inicio)} · ${moeda(item.valor)}`} onClick={() => void abrirDetalhe("obra", item.id)} />)} /></div>;
}

function ResumoPendencia({ titulo, descricao, vazio, itens }: { titulo: string; descricao: string; vazio: string; itens: ReactNode[] }) {
  return <Card><CardContent className="p-5"><h2 className="font-semibold">{titulo}</h2><p className="text-sm text-muted-foreground mb-4">{descricao}</p>{itens.length ? <div className="space-y-2">{itens}</div> : <p className="text-sm text-muted-foreground">{vazio}</p>}</CardContent></Card>;
}

function Linha({ titulo, detalhe, onClick }: { titulo: string; detalhe: string; onClick?: () => void }) {
  return <button type="button" disabled={!onClick} onClick={onClick} className="w-full text-left rounded-lg border p-3 enabled:hover:bg-muted enabled:cursor-pointer disabled:cursor-default"><p className="font-medium line-clamp-1">{titulo}</p><p className="text-xs text-muted-foreground mt-1">{detalhe}</p></button>;
}

function Info({ label, valor }: { label: string; valor: string }) {
  return <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground mb-1">{label}</p><p className="font-medium break-words">{valor}</p></div>;
}

function DetalheLicitacao({ item }: { item: Licitacao & { raw: Record<string, string>; fonte: string } }) {
  return <div className="space-y-5 text-sm"><div className="grid sm:grid-cols-2 gap-3"><Info label="Órgão / município" valor={`${item.orgao_nome || "—"} · ${item.municipio || "—"}`} /><Info label="Processo / edital" valor={`${item.processo || "—"} / ${item.edital || "—"}`} /><Info label="Modalidade" valor={item.modalidade || "—"} /><Info label="Tipo de avaliação" valor={item.tipo_avaliacao || "—"} /><Info label="Abertura / publicação" valor={`${dataBr(item.data_abertura)} / ${dataBr(item.data_publicacao)}`} /><Info label="Valor de referência" valor={moeda(item.valor_referencia)} /><Info label="Situação" valor={item.situacao} /><Info label="Código IBGE" valor={item.codigo_ibge || "—"} /></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground mb-1">Objeto</p><p className="whitespace-pre-wrap">{item.objeto || "Não informado"}</p></div><Button variant="outline" asChild><a href={item.fonte} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Abrir dados oficiais do TCE-PR</a></Button></div>;
}

function DetalheObra({ item }: { item: Obra & { raw: Record<string, string>; acompanhamentos: Acompanhamento[] } }) {
  return <div className="space-y-5 text-sm"><div className="grid sm:grid-cols-2 gap-3"><Info label="Intervenção" valor={item.nome_intervencao || "—"} /><Info label="Município / código IBGE" valor={`${item.municipio || "—"} / ${item.codigo_ibge || "—"}`} /><Info label="Tipo de obra" valor={item.tipo_obra || item.tipo_intervencao || "—"} /><Info label="Início / prazo" valor={`${dataBr(item.data_inicio)} / ${item.prazo_execucao ? `${item.prazo_execucao} dias` : "—"}`} /><Info label="Valor" valor={moeda(item.valor)} /><Info label="Situação / físico" valor={`${item.situacao} / ${numeroBr(item.percentual_fisico)}%`} /><Info label="Regime" valor={item.regime || "—"} /><Info label="Intervenção TCE-PR" valor={item.id_intervencao} /></div><div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground mb-1">Objeto</p><p className="whitespace-pre-wrap">{item.objeto || "Não informado"}</p></div><div><div className="flex items-center gap-2 mb-2"><CalendarRange className="w-4 h-4" /><h3 className="font-semibold">Acompanhamentos ({item.acompanhamentos.length})</h3></div>{item.acompanhamentos.length ? <div className="space-y-2">{item.acompanhamentos.map((acompanhamento) => <div key={acompanhamento.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{acompanhamento.tipo || "Acompanhamento"}</span><Badge variant="outline">{dataBr(acompanhamento.data)}</Badge></div><p className="text-xs text-muted-foreground mt-1">{acompanhamento.origem || "Origem não informada"} · {numeroBr(acompanhamento.percentual_fisico)}% físico · {acompanhamento.responsavel || "Responsável não informado"}</p>{(acompanhamento.observacao || acompanhamento.motivo_paralisacao) && <p className="mt-2 whitespace-pre-wrap">{acompanhamento.observacao || acompanhamento.motivo_paralisacao}</p>}</div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum acompanhamento importado para esta intervenção.</p>}</div><Button variant="outline" asChild><a href="https://servicos.tce.pr.gov.br/servicos/srv_dados_abertos.aspx" target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Abrir dados oficiais do TCE-PR</a></Button></div>;
}
