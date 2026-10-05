import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarRange,
  ExternalLink,
  Hammer,
  Loader2,
  MapPin,
  PauseCircle,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import { toast } from "@/hooks/use-toast";

export type Obra = {
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

export type Acompanhamento = {
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

type DetalheObraItem = Obra & { raw: Record<string, string>; acompanhamentos: Acompanhamento[] };

type StatusTcePr = {
  config: { cnpj: string; ibge: string; anos: number[]; intervaloHoras: number };
  anosObras?: number[];
  resumo: {
    licitacoes: number;
    valor_licitacoes: number;
    obras: number;
    valor_obras: number;
    obras_paralisadas: number;
    obras_sem_acompanhamento: number;
  };
  ultima: { status: string; iniciado_em: string; finalizado_em: string | null; erros: string } | null;
  isAdmin: boolean;
  sincronizacaoAutomatica: boolean;
};

type SyncResultado = { status: string; totais: { obras: number; acompanhamentos: number }; erros?: string[] };

async function apiTce<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`/api/tce-pr${caminho}`, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const json = await resposta.json();
  if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível carregar os dados das obras.");
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
  return valor === null || valor === undefined ? "—" : Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function diasAtras(dataStr: string | null | undefined): number | null {
  if (!dataStr) return null;
  const t = new Date(dataStr).getTime();
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function badgeSituacao(situacao: string) {
  const sit = (situacao || "").toLowerCase();
  if (sit.includes("conclu") || sit.includes("finaliz")) {
    return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Concluída</Badge>;
  }
  if (sit.includes("paralis") || sit.includes("suspens")) {
    return <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">Paralisada</Badge>;
  }
  if (sit.includes("sem") && sit.includes("acompanhamento")) {
    return <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30">Sem acompanhamento</Badge>;
  }
  if (sit.includes("andamento") || sit.includes("acompanhamento") || sit.includes("execu")) {
    return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">Em andamento</Badge>;
  }
  return <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30">Sem acompanhamento</Badge>;
}

function errosUltimaSync(erros: string | null | undefined): string[] {
  if (!erros) return [];
  try {
    const lista = JSON.parse(erros);
    return Array.isArray(lista) ? lista.map(String).filter(Boolean) : [];
  } catch {
    const texto = String(erros).trim();
    return texto ? [texto] : [];
  }
}

function rotuloStatusSync(status: string | null | undefined) {
  switch ((status || "").toLowerCase()) {
    case "concluido":
      return { texto: "Concluída com sucesso", classe: "text-emerald-600 dark:text-emerald-400" };
    case "parcial":
      return { texto: "Concluída com erros parciais", classe: "text-amber-600 dark:text-amber-400" };
    case "erro":
      return { texto: "Sincronização falhou", classe: "text-rose-600 dark:text-rose-400" };
    case "executando":
      return { texto: "Sincronização em execução", classe: "text-blue-600 dark:text-blue-400" };
    default:
      return { texto: "Status desconhecido", classe: "text-muted-foreground" };
  }
}

export default function Obras() {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [status, setStatus] = useState<StatusTcePr | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todas");
  const [filtroAno, setFiltroAno] = useState("todos");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [detalhe, setDetalhe] = useState<DetalheObraItem | null>(null);
  const [abrindo, setAbrindo] = useState(false);

  const carregarStatus = useCallback(async () => {
    try {
      const data = await apiTce<StatusTcePr>("/status");
      setStatus(data);
    } catch {
      // Falha suave de status
    }
  }, []);

  const carregarObras = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      if (filtroAno !== "todos") params.set("ano", filtroAno);
      params.set("pagina", String(pagina));

      const resposta = await apiTce<{ rows: Obra[]; total: number; pagina: number; porPagina: number }>(`/obras?${params.toString()}`);
      setObras(resposta.rows || []);
      setTotal(resposta.total || 0);
    } catch (err) {
      toast({
        title: "Erro ao carregar obras",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
      setObras([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroAno, pagina]);

  useEffect(() => {
    void carregarStatus();
  }, [carregarStatus]);

  useEffect(() => {
    void carregarObras();
  }, [carregarObras]);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const res = await apiTce<SyncResultado>("/sincronizar", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const erros = (res.erros || []).filter(Boolean);
      if (res.status === "concluido") {
        toast({
          title: "Sincronização concluída",
          description: `API do TCE-PR consultada com sucesso. ${res.totais?.obras || 0} obras processadas.`,
        });
      } else if (res.status === "parcial") {
        toast({
          title: "Sincronização parcial",
          description: erros.length ? `Algumas fontes não puderam ser consultadas: ${erros.join(" · ")}` : "Algumas fontes do TCE-PR não responderam.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Falha na sincronização",
          description: erros.length ? erros.join(" · ") : "Nenhuma fonte do TCE-PR respondeu. Tente novamente.",
          variant: "destructive",
        });
      }
      await carregarStatus();
      await carregarObras();
    } catch (err) {
      toast({
        title: "Falha na sincronização",
        description: err instanceof Error ? err.message : "Não foi possível comunicar com o TCE-PR.",
        variant: "destructive",
      });
    } finally {
      setSincronizando(false);
    }
  };

  const abrirDetalhe = async (id: string) => {
    setAbrindo(true);
    try {
      const res = await apiTce<DetalheObraItem>(`/detalhe?tipo=obra&id=${encodeURIComponent(id)}`);
      setDetalhe(res);
    } catch (err) {
      toast({
        title: "Não foi possível carregar o detalhe da obra",
        description: err instanceof Error ? err.message : "Registro indisponível.",
        variant: "destructive",
      });
    } finally {
      setAbrindo(false);
    }
  };

  const obrasFiltradas = useMemo(() => {
    if (filtroSituacao === "todas") return obras;
    return obras.filter((item) => {
      const sit = (item.situacao || "").toLowerCase();
      const semAcomp = sit.includes("sem") && sit.includes("acompanhamento");
      if (filtroSituacao === "paralisada") return sit.includes("paralis") || sit.includes("suspens");
      if (filtroSituacao === "concluida") return sit.includes("conclu") || sit.includes("finaliz");
      if (filtroSituacao === "andamento") return !semAcomp && (sit.includes("andamento") || sit.includes("acompanhamento") || sit.includes("execu"));
      if (filtroSituacao === "sem_acompanhamento") return semAcomp;
      return true;
    });
  }, [obras, filtroSituacao]);

  const anosDisponiveis = useMemo(() => {
    const lista = [...(status?.anosObras || []), ...(status?.config?.anos || [])]
      .map(Number)
      .filter((ano) => Number.isFinite(ano) && ano > 0);
    if (lista.length) return [...new Set(lista)].sort((a, b) => b - a);
    return [...new Set(obras.map((obra) => obra.ano).filter((ano): ano is number => ano !== null && ano > 0))].sort((a, b) => b - a);
  }, [status, obras]);

  const estatisticas = useMemo(() => {
    const totalObras = status?.resumo?.obras || total || 0;
    const totalValor = status?.resumo?.valor_obras || 0;
    const paralisadas = status?.resumo?.obras_paralisadas || 0;
    const semAcomp = status?.resumo?.obras_sem_acompanhamento || 0;
    return { totalObras, totalValor, paralisadas, semAcomp };
  }, [status, total]);

  const ultimaSync = status?.ultima || null;
  const rotuloSync = rotuloStatusSync(ultimaSync?.status);
  const errosSync = errosUltimaSync(ultimaSync?.erros);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Hammer}
        title="Controle de Obras Municipais"
        subtitle="Sincronizado automaticamente com a base de dados abertos do TCE-PR"
        username={user}
        actions={
          status?.isAdmin ? (
            <Button size="sm" onClick={sincronizar} disabled={sincronizando}>
              {sincronizando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar TCE-PR
            </Button>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Banner informativo de sincronização automática */}
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Alimentação Automática via API Oficial</p>
              <p className="text-xs text-muted-foreground">
                As obras, medições fiscais e vistorias de engenharia de Inajá (IBGE 4110300) são capturadas diretamente do Tribunal de Contas do Paraná.
              </p>
            </div>
          </div>
          {ultimaSync && (
            <div className="text-xs text-muted-foreground shrink-0 sm:text-right">
              <span className="block font-medium text-foreground">Última sincronização:</span>
              {dataBr(ultimaSync.iniciado_em)} às {new Date(ultimaSync.iniciado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              <span className={`block font-medium ${rotuloSync.classe}`}>{rotuloSync.texto}</span>
              {errosSync.length > 0 && (
                <span className="block max-w-xs text-amber-600 dark:text-amber-400" title={errosSync.join(" · ")}>
                  {errosSync.slice(0, 2).join(" · ")}
                  {errosSync.length > 2 ? ` (+${errosSync.length - 2})` : ""}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dashboard de Indicadores Executivos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-xs border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total de Obras Registradas</p>
                <p className="text-2xl font-bold text-foreground mt-1">{estatisticas.totalObras}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Intervenções municipais</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Building2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Valor Total Investido</p>
                <p className="text-xl font-bold text-foreground mt-1 truncate" title={moeda(estatisticas.totalValor)}>
                  {moeda(estatisticas.totalValor)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Contratos e intervenções</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Obras Paralisadas</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{estatisticas.paralisadas}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Requer atenção imediata</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <PauseCircle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Sem Acompanhamento</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{estatisticas.semAcomp}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Alerta fiscal TCE-PR</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da obra, objeto, bairro ou tipo de intervenção..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="pl-9 pr-8"
            />
            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setPagina(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filtroSituacao}
              onValueChange={(val) => {
                setFiltroSituacao(val);
                setPagina(1);
              }}
            >
              <SelectTrigger aria-label="Filtrar por situação" className="w-[180px] text-xs">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as situações</SelectItem>
                <SelectItem value="andamento">Em andamento</SelectItem>
                <SelectItem value="paralisada">Paralisadas</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="sem_acompanhamento">Sem acompanhamento</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtroAno}
              onValueChange={(val) => {
                setFiltroAno(val);
                setPagina(1);
              }}
            >
              <SelectTrigger aria-label="Filtrar por exercício" className="w-[130px] text-xs">
                <SelectValue placeholder="Exercício" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os anos</SelectItem>
                {anosDisponiveis.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    Ano {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Obras */}
        <Card className="shadow-xs border-border overflow-hidden">
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Carregando obras do município...</p>
            </div>
          ) : obrasFiltradas.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Hammer}
                title="Nenhuma obra encontrada"
                description={
                  busca || filtroSituacao !== "todas" || filtroAno !== "todos"
                    ? "Tente ajustar os termos de pesquisa ou remover os filtros aplicados."
                    : "Nenhuma obra importada do TCE-PR até o momento. Clique em Sincronizar para buscar os dados."
                }
                actionLabel={status?.isAdmin ? "Sincronizar com TCE-PR" : undefined}
                onAction={status?.isAdmin ? sincronizar : undefined}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[35%]">Intervenção / Objeto</TableHead>
                    <TableHead>Ano / Início</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-[18%]">Progresso Físico</TableHead>
                    <TableHead className="text-right">Valor Contratado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obrasFiltradas.map((obra) => {
                    const percentual = obra.percentual_fisico !== null ? Math.min(100, Math.max(0, Number(obra.percentual_fisico))) : null;
                    const diasSemMedicao = diasAtras(obra.ultimo_acompanhamento);
                    return (
                      <TableRow
                        key={obra.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => void abrirDetalhe(obra.id)}
                      >
                        <TableCell>
                          <p className="font-semibold text-foreground line-clamp-1">{obra.nome_intervencao || obra.objeto || "Intervenção sem nome"}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{obra.objeto || obra.tipo_obra || "Sem objeto detalhado"}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono">
                              <MapPin className="h-3 w-3" /> {obra.municipio || "Inajá"}
                            </span>
                            {obra.tipo_obra && <span>· {obra.tipo_obra}</span>}
                          </div>
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <p className="font-medium text-sm">{obra.ano || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Início: {dataBr(obra.data_inicio)}</p>
                          {obra.prazo_execucao && <p className="text-[11px] text-muted-foreground">{obra.prazo_execucao} dias de prazo</p>}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          <div>{badgeSituacao(obra.situacao)}</div>
                          {obra.ultimo_acompanhamento && (
                            <p className="text-[11px] text-muted-foreground mt-1" title={obra.observacao_ultimo_acompanhamento || ""}>
                              Última medição: {dataBr(obra.ultimo_acompanhamento)}
                              {diasSemMedicao !== null && diasSemMedicao > 90 && (
                                <span className="block text-amber-600 dark:text-amber-400 font-medium">({diasSemMedicao} dias atrás)</span>
                              )}
                            </p>
                          )}
                        </TableCell>

                        <TableCell>
                          {percentual !== null ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-foreground">{numeroBr(percentual)}%</span>
                                <span className="text-[11px] text-muted-foreground">{percentual >= 100 ? "Executado" : "Medido"}</span>
                              </div>
                              <Progress value={percentual} className="h-2" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem medição</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          <p className="font-semibold text-sm text-foreground">{moeda(obra.valor)}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{obra.regime || "Empreitada"}</p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {total > 30 && (
            <div className="p-4 border-t border-border">
              <DataPagination
                pagina={pagina}
                totalPaginas={Math.ceil(total / 30)}
                total={total}
                onPagina={(nova) => setPagina(nova)}
              />
            </div>
          )}
        </Card>
      </main>

      {/* Modal de Detalhes da Obra com Linha do Tempo de Medições */}
      <Dialog
        open={Boolean(detalhe) || abrindo}
        onOpenChange={(aberto) => {
          if (!aberto) setDetalhe(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-primary" />
              {abrindo && !detalhe ? "Consultando medições da obra..." : detalhe?.nome_intervencao || detalhe?.objeto || "Detalhe da Obra"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Histórico oficial de acompanhamentos, vistorias e medições da obra no TCE-PR.
            </DialogDescription>
          </DialogHeader>

          {detalhe && (
            <div className="space-y-6 text-sm pt-2">
              {/* Visão geral do contrato da obra */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="font-semibold text-base text-foreground mt-0.5">{moeda(detalhe.valor)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progresso Físico</p>
                  <p className="font-semibold text-base text-primary mt-0.5">
                    {detalhe.percentual_fisico !== null ? `${numeroBr(detalhe.percentual_fisico)}%` : "Não medido"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Situação</p>
                  <div className="mt-0.5">{badgeSituacao(detalhe.situacao)}</div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Início e Prazo</p>
                  <p className="font-medium text-xs text-foreground mt-0.5">
                    {dataBr(detalhe.data_inicio)} {detalhe.prazo_execucao ? `(${detalhe.prazo_execucao} dias)` : ""}
                  </p>
                </div>
              </div>

              {/* Informações detalhadas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Tipo de Obra</p>
                  <p className="font-medium text-foreground mt-0.5">{detalhe.tipo_obra || detalhe.tipo_intervencao || "—"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Regime de Execução</p>
                  <p className="font-medium text-foreground mt-0.5">{detalhe.regime || "—"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Município / Código IBGE</p>
                  <p className="font-medium text-foreground mt-0.5">{detalhe.municipio || "Inajá"} / {detalhe.codigo_ibge || "4110300"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Identificador TCE-PR</p>
                  <p className="font-mono text-foreground mt-0.5">{detalhe.id_intervencao || detalhe.chave_externa}</p>
                </div>
              </div>

              {/* Objeto completo */}
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Objeto da Intervenção</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{detalhe.objeto || "Objeto não informado nos dados abertos."}</p>
              </div>

              {/* Linha do Tempo de Acompanhamentos e Medições Técnicas */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarRange className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-sm">Histórico de Acompanhamentos e Vistorias ({detalhe.acompanhamentos.length})</h3>
                </div>

                {detalhe.acompanhamentos.length ? (
                  <div className="space-y-2.5">
                    {detalhe.acompanhamentos.map((acomp) => (
                      <div key={acomp.id} className="rounded-lg border border-border bg-card p-3 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-sm text-foreground">{acomp.tipo || "Vistoria / Acompanhamento"}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {dataBr(acomp.data)}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {acomp.percentual_fisico !== null && (
                            <span className="font-semibold text-primary">{numeroBr(acomp.percentual_fisico)}% medido</span>
                          )}
                          {acomp.origem && <span>Origem: {acomp.origem}</span>}
                          {acomp.responsavel && <span>Responsável: {acomp.responsavel}</span>}
                        </div>
                        {(acomp.observacao || acomp.motivo_paralisacao) && (
                          <div className="mt-2 rounded bg-muted/40 p-2 text-xs text-foreground whitespace-pre-wrap">
                            {acomp.motivo_paralisacao && (
                              <p className="text-rose-600 dark:text-rose-400 font-medium mb-1">
                                Motivo da paralisação: {acomp.motivo_paralisacao}
                              </p>
                            )}
                            {acomp.observacao && <p>{acomp.observacao}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    Nenhuma medição técnica importada para esta obra até o momento.
                  </div>
                )}
              </div>

              {/* Acesso aos dados oficiais no TCE-PR */}
              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://servicos.tce.pr.gov.br/servicos/srv_dados_abertos.aspx" target="_blank" rel="noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir portal de dados abertos do TCE-PR
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
