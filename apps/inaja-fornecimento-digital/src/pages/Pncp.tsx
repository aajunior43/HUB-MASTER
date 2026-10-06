import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, CalendarRange, Download, ExternalLink, FileSearch, FileSpreadsheet, FileText, Gavel, Link2, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
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
import { exportarPncpExcel, exportarPncpPdf } from "@/lib/pncpExport";
import { DossieFornecedorModal } from "@/components/DossieFornecedorModal";

type Tab = "contratacao" | "contrato" | "ata" | "pca" | "pendencias";
type Registro = { id: string; tipo: string; chave_pncp: string; titulo: string | null; objeto: string | null; numero: string | null; ano: number | null; processo: string | null; modalidade: string | null; situacao: string | null; valor: number; fornecedor_nome: string | null; fornecedor_cnpj: string | null; data_publicacao: string | null; data_atualizacao: string | null; vigencia_inicio: string | null; vigencia_fim: string | null; url: string | null };
type Detalhe = Registro & { documentos: { id: string; titulo: string; tipo: string | null; url: string; data_publicacao: string | null }[]; vinculos: { id: string; entidade_tipo: string; entidade_id: string }[]; aviso: string | null };
type Status = { config: { cnpj: string; anos: number[]; intervaloHoras: number }; totais: Record<string, number>; ultima: { status: string; iniciado_em: string; finalizado_em: string | null; erros: string } | null; isAdmin: boolean; sincronizacaoAutomatica: boolean };
type Pendencias = { empenhos: { id: string; numero_empenho: string; ano_empenho: number; licitacao: string; nome_credor: string; valor_empenhado_bruto: number }[]; semVinculo: Registro[]; vencendo: Registro[] };

const tabs: PageTab<Tab>[] = [
  { id: "contratacao", label: "Contratações", icon: Gavel },
  { id: "contrato", label: "Contratos e empenhos", icon: FileText },
  { id: "ata", label: "Atas", icon: Archive },
  { id: "pca", label: "PCA", icon: CalendarRange },
  { id: "pendencias", label: "Pendências", icon: AlertTriangle },
];

async function api<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api/pncp${caminho}`, { credentials: "same-origin", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const json = await resposta.json();
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível consultar o PNCP.");
  return json.data as T;
}

function dataBr(valor: string | null | undefined) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function moeda(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Pncp() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("contratacao");
  const [status, setStatus] = useState<Status | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [pendencias, setPendencias] = useState<Pendencias | null>(null);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [entidadeTipo, setEntidadeTipo] = useState("empenho");
  const [entidadeId, setEntidadeId] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [dossieFornecedor, setDossieFornecedor] = useState<{ cnpj: string; nome: string } | null>(null);

  const carregarStatus = useCallback(async () => {
    try { setStatus(await api<Status>("/status")); } catch (erro) { toast({ title: "Falha ao abrir o painel", description: String((erro as Error).message), variant: "destructive" }); }
  }, []);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      if (tab === "pendencias") setPendencias(await api<Pendencias>("/pendencias"));
      else {
        const params = new URLSearchParams({ tipo: tab, busca, pagina: String(pagina) });
        const dados = await api<{ rows: Registro[]; total: number }>(`/registros?${params}`);
        setRegistros(dados.rows);
        setTotal(dados.total);
      }
    } catch (erro) {
      toast({ title: "Falha na consulta", description: String((erro as Error).message), variant: "destructive" });
    } finally { setCarregando(false); }
  }, [busca, pagina, tab]);

  useEffect(() => { void carregarStatus(); }, [carregarStatus]);
  useEffect(() => { const timer = window.setTimeout(() => void carregar(), 250); return () => window.clearTimeout(timer); }, [carregar]);
  useEffect(() => {
    if (!status?.sincronizacaoAutomatica) return;
    const timer = window.setInterval(() => { void carregarStatus(); void carregar(true); }, 15_000);
    return () => window.clearInterval(timer);
  }, [carregar, carregarStatus, status?.sincronizacaoAutomatica]);
  useEffect(() => { setPagina(1); }, [tab, busca]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const resultado = await api<{ status: string; recebidos: number; erros: string[] }>("/sincronizar", { method: "POST", body: JSON.stringify({}) });
      toast({ title: "Consulta concluída", description: `${resultado.recebidos.toLocaleString("pt-BR")} registros recebidos${resultado.status === "parcial" ? "; algumas consultas ficaram pendentes" : ""}.` });
      await Promise.all([carregarStatus(), carregar()]);
    } catch (erro) { toast({ title: "Falha na sincronização", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setSincronizando(false); }
  };

  const abrirDetalhe = async (id: string) => {
    setAbrindo(true);
    try { setDetalhe(await api<Detalhe>(`/detalhe?id=${encodeURIComponent(id)}&atualizar=1`)); }
    catch (erro) { toast({ title: "Falha ao abrir registro", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setAbrindo(false); }
  };

  const vincular = async () => {
    if (!detalhe || !entidadeId.trim()) return;
    setVinculando(true);
    try {
      await api("/vincular", { method: "POST", body: JSON.stringify({ registroId: detalhe.id, entidadeTipo, entidadeId: entidadeId.trim() }) });
      setEntidadeId("");
      setDetalhe(await api<Detalhe>(`/detalhe?id=${encodeURIComponent(detalhe.id)}`));
      toast({ title: "Registro vinculado" });
    } catch (erro) { toast({ title: "Não foi possível vincular", description: String((erro as Error).message), variant: "destructive" }); }
    finally { setVinculando(false); }
  };

  const desvincular = async (id: string) => {
    if (!detalhe) return;
    await api("/desvincular", { method: "POST", body: JSON.stringify({ id }) });
    setDetalhe(await api<Detalhe>(`/detalhe?id=${encodeURIComponent(detalhe.id)}`));
  };

  const handleExportarExcel = async () => {
    setExportandoExcel(true);
    try {
      await exportarPncpExcel({
        tab,
        registros,
        pendencias,
        busca,
        total,
      });
      toast({ title: "Relatório gerado", description: "Planilha Excel do PNCP exportada com sucesso." });
    } catch (e) {
      toast({ title: "Erro na exportação", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setExportandoExcel(false);
    }
  };

  const handleExportarPdf = async () => {
    setExportandoPdf(true);
    try {
      await exportarPncpPdf({
        tab,
        registros,
        pendencias,
        busca,
        total,
      });
      toast({ title: "Relatório gerado", description: "Relatório em PDF do PNCP gerado com sucesso." });
    } catch (e) {
      toast({ title: "Erro na exportação", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setExportandoPdf(false);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / 30));
  const cards = useMemo(() => [
    ["Contratações", status?.totais.contratacao || 0], ["Contratos", status?.totais.contrato || 0], ["Atas", status?.totais.ata || 0], ["Itens no PCA", status?.totais.pca || 0],
  ] as const, [status]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader icon={Gavel} title="Contratações públicas" subtitle="Consulta e conferência dos dados publicados no PNCP" username={user} actions={status?.isAdmin ? <Button size="sm" onClick={sincronizar} disabled={sincronizando}>{sincronizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Sincronizar</Button> : undefined} />
      <main className="w-full max-w-7xl mx-auto flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-5">
          {cards.map(([rotulo, valor]) => <Card key={rotulo}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{rotulo}</p><p className="text-2xl font-bold mt-1">{valor.toLocaleString("pt-BR")}</p></CardContent></Card>)}
        </div>
        <div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground flex flex-wrap justify-between gap-2">
          <span>Órgão: {status?.config.cnpj || "76.970.318/0001-67"} · Anos: {status?.config.anos.join(", ") || "—"}</span>
          <span>Última sincronização: {status?.ultima ? `${dataBr(status.ultima.finalizado_em || status.ultima.iniciado_em)} · ${status.ultima.status}` : "ainda não realizada"}</span>
        </div>
        <PageTabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          {tab !== "pendencias" ? (
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por objeto, processo, fornecedor ou número" className="pl-9" />
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
        {carregando ? <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div> : tab === "pendencias" ? (
          <div className="space-y-6">
            <SecaoPendencia titulo="Contratos próximos do vencimento" descricao="Vencimento nos próximos 60 dias" vazio="Nenhum contrato próximo do vencimento.">
              {(pendencias?.vencendo || []).map((item) => <LinhaPendencia key={item.id} titulo={item.objeto || item.numero || item.chave_pncp} detalhe={`${item.fornecedor_nome || "Fornecedor não informado"} · vence em ${dataBr(item.vigencia_fim)}`} onClick={() => void abrirDetalhe(item.id)} />)}
            </SecaoPendencia>
            <SecaoPendencia titulo="Empenhos ainda não vinculados" descricao="Empenhos locais com licitação informada" vazio="Todos os empenhos localizados estão conferidos.">
              {(pendencias?.empenhos || []).map((item) => <LinhaPendencia key={item.id} titulo={`Empenho ${item.numero_empenho || item.id}`} detalhe={`Licitação ${item.licitacao} · ${item.nome_credor || "Credor não informado"} · ${moeda(item.valor_empenhado_bruto)}`} />)}
            </SecaoPendencia>
            <SecaoPendencia titulo="Publicações ainda não vinculadas" descricao="Dados do PNCP sem ligação com registros internos" vazio="Nenhuma publicação pendente.">
              {(pendencias?.semVinculo || []).map((item) => <LinhaPendencia key={item.id} titulo={item.objeto || item.numero || item.chave_pncp} detalhe={`${item.tipo} · ${item.ano || "—"} · ${moeda(item.valor)}`} onClick={() => void abrirDetalhe(item.id)} />)}
            </SecaoPendencia>
          </div>
        ) : registros.length ? (
          <Card><Table><TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Objeto / fornecedor</TableHead><TableHead>Situação</TableHead><TableHead>Publicação</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>
            {registros.map((item) => <TableRow key={item.id} className="cursor-pointer" onClick={() => void abrirDetalhe(item.id)}><TableCell className="font-medium whitespace-nowrap">{item.numero || item.chave_pncp}<div className="text-xs text-muted-foreground">{item.ano || ""}</div></TableCell><TableCell className="max-w-xl"><p className="line-clamp-2">{item.objeto || item.titulo || "Sem descrição"}</p>{item.fornecedor_nome && <p className="text-xs text-muted-foreground mt-1">{item.fornecedor_nome}</p>}</TableCell><TableCell><Badge variant="outline">{item.situacao || item.modalidade || "Não informada"}</Badge></TableCell><TableCell>{dataBr(item.data_publicacao)}</TableCell><TableCell className="text-right whitespace-nowrap">{moeda(item.valor)}</TableCell></TableRow>)}
          </TableBody></Table><DataPagination pagina={pagina} totalPaginas={totalPaginas} total={total} onPagina={setPagina} className="p-4 border-t" /></Card>
        ) : <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground"><FileSearch className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>Nenhum registro encontrado.</p>{status?.isAdmin && !status.ultima && <Button variant="outline" className="mt-4" onClick={sincronizar}>Fazer primeira sincronização</Button>}</div>}
      </main>
      <AppFooter />
      <Dialog open={Boolean(detalhe) || abrindo} onOpenChange={(aberto) => { if (!aberto) setDetalhe(null); }}><DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto"><DialogHeader><DialogTitle>{abrindo && !detalhe ? "Carregando registro..." : detalhe?.objeto || detalhe?.titulo || detalhe?.chave_pncp}</DialogTitle></DialogHeader>{detalhe && <div className="space-y-5 text-sm">
        <div className="grid sm:grid-cols-2 gap-3"><Info label="Controle PNCP" valor={detalhe.chave_pncp} /><Info label="Número / ano" valor={`${detalhe.numero || "—"} / ${detalhe.ano || "—"}`} /><Info label="Processo" valor={detalhe.processo || "—"} /><Info label="Modalidade / situação" valor={`${detalhe.modalidade || "—"} · ${detalhe.situacao || "—"}`} /><Info label="Fornecedor" valor={detalhe.fornecedor_nome || "—"} /><Info label="Valor" valor={moeda(detalhe.valor)} /></div>
        <div className="flex flex-wrap gap-2">
          {(detalhe.url || detalhe.chave_pncp) && <Button variant="outline" asChild><a href={detalhe.url || "https://pncp.gov.br/app/editais"} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" />Abrir fonte oficial</a></Button>}
          {detalhe.fornecedor_cnpj && (
            <Button variant="outline" onClick={() => setDossieFornecedor({ cnpj: detalhe.fornecedor_cnpj!, nome: detalhe.fornecedor_nome || "" })}>
              <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
              Dossiê 360° do Fornecedor
            </Button>
          )}
        </div>
        <div><h3 className="font-semibold mb-2">Documentos publicados</h3>{detalhe.documentos.length ? <div className="space-y-2">{detalhe.documentos.map((doc) => <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted"><FileText className="w-4 h-4" /><span className="flex-1">{doc.titulo}</span><ExternalLink className="w-4 h-4" /></a>)}</div> : <p className="text-muted-foreground">Nenhum arquivo retornado pelo portal para este registro.</p>}{detalhe.aviso && <p className="text-amber-700 mt-2">O portal não respondeu à consulta de arquivos. Os dados já salvos continuam disponíveis.</p>}</div>
        <div><h3 className="font-semibold mb-2">Vínculos internos</h3>{detalhe.vinculos.length ? <div className="flex flex-wrap gap-2 mb-3">{detalhe.vinculos.map((v) => <Badge key={v.id} variant="secondary" className="gap-1"><Link2 className="w-3 h-3" />{v.entidade_tipo}: {v.entidade_id}<button type="button" aria-label="Remover vínculo" onClick={() => void desvincular(v.id)} className="ml-1 hover:text-destructive">×</button></Badge>)}</div> : <p className="text-muted-foreground mb-3">Ainda não vinculado a solicitação, dotação ou empenho.</p>}<div className="grid sm:grid-cols-[180px_1fr_auto] gap-2"><Select value={entidadeTipo} onValueChange={setEntidadeTipo}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="empenho">Empenho</SelectItem><SelectItem value="solicitacao">Solicitação</SelectItem><SelectItem value="pedido_dotacao">Pedido de dotação</SelectItem></SelectContent></Select><Input value={entidadeId} onChange={(e) => setEntidadeId(e.target.value)} placeholder="ID do registro interno" /><Button onClick={() => void vincular()} disabled={!entidadeId.trim() || vinculando}>{vinculando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vincular"}</Button></div></div>
      </div>}</DialogContent></Dialog>

      <DossieFornecedorModal
        aberto={Boolean(dossieFornecedor)}
        onOpenChange={(aberto) => { if (!aberto) setDossieFornecedor(null); }}
        cnpj={dossieFornecedor?.cnpj}
        nomeFornecedor={dossieFornecedor?.nome}
      />
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground mb-1">{label}</p><p className="font-medium break-words">{valor}</p></div>; }
function SecaoPendencia({ titulo, descricao, vazio, children }: { titulo: string; descricao: string; vazio: string; children: React.ReactNode }) { const itens = Array.isArray(children) ? children : children ? [children] : []; return <Card><CardContent className="p-5"><h2 className="font-semibold">{titulo}</h2><p className="text-sm text-muted-foreground mb-4">{descricao}</p>{itens.length ? <div className="space-y-2">{children}</div> : <p className="text-sm text-muted-foreground">{vazio}</p>}</CardContent></Card>; }
function LinhaPendencia({ titulo, detalhe, onClick }: { titulo: string; detalhe: string; onClick?: () => void }) { return <button type="button" disabled={!onClick} onClick={onClick} className="w-full text-left rounded-lg border p-3 enabled:hover:bg-muted enabled:cursor-pointer disabled:cursor-default"><p className="font-medium line-clamp-1">{titulo}</p><p className="text-xs text-muted-foreground mt-1">{detalhe}</p></button>; }
