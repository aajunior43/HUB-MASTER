import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/integrations/db/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, X, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { EmpenhoRow, moeda, fmtData } from "@/lib/empenhos";
import { DataPagination } from "@/components/DataPagination";
import { EmptyState } from "@/components/EmptyState";
import { PainelDetalhe } from "./PainelDetalhe";


export function AbaTabela() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EmpenhoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(false);
  const consultaAtual = useRef(0);

  // Estados dos filtros
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [ano, setAno] = useState("all");
  const [status, setStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("recentes");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [tipo, setTipo] = useState("all");
  const [modalidade, setModalidade] = useState("all");
  const [natureza, setNatureza] = useState("all");
  const [recurso, setRecurso] = useState("all");
  const [despesa, setDespesa] = useState("all");
  const [programa, setPrograma] = useState("all");
  const [acao, setAcao] = useState("all");

  const [filtros, setFiltros] = useState<{
    modalidades: string[];
    naturezas: string[];
    anos: number[];
    tipos: string[];
    recursos: string[];
    programas: string[];
    acoes: string[];
    despesas: string[];
  }>({
    modalidades: [],
    naturezas: [],
    anos: [],
    tipos: [],
    recursos: [],
    programas: [],
    acoes: [],
    despesas: [],
  });

  const [detalheId, setDetalheId] = useState<string | null>(null);

  // Estados para as abas expansíveis de filtros
  const [openGerais, setOpenGerais] = useState(true);
  const [openClassificacao, setOpenClassificacao] = useState(false);
  const [openEstrutura, setOpenEstrutura] = useState(false);

  // Contagem de filtros ativos por seção
  const activeGeraisCount =
    (busca ? 1 : 0) +
    (ano !== "all" ? 1 : 0) +
    (status !== "todos" ? 1 : 0) +
    (ordenacao !== "recentes" ? 1 : 0) +
    (valorMin ? 1 : 0) +
    (valorMax ? 1 : 0);

  const activeClassificacaoCount =
    (tipo !== "all" ? 1 : 0) +
    (modalidade !== "all" ? 1 : 0) +
    (natureza !== "all" ? 1 : 0) +
    (recurso !== "all" ? 1 : 0);

  const activeEstruturaCount =
    (despesa !== "all" ? 1 : 0) +
    (programa !== "all" ? 1 : 0) +
    (acao !== "all" ? 1 : 0);


  // Carrega opções disponíveis para os selects do banco de dados
  useEffect(() => {
    let cancelado = false;
    db.rpc("empenhos_filtros_disponiveis", { _caller: user }).then(({ data, error }) => {
      if (cancelado) return;
      if (error) {
        toast({ title: "Erro ao carregar filtros", description: error.message, variant: "destructive" });
        return;
      }
      if (data) setFiltros(data as typeof filtros);
    });
    return () => { cancelado = true; };
  }, [user]);

  const fetchRows = useCallback(() => {
    const consultaId = ++consultaAtual.current;
    setLoading(true);
    setRows([]);
    setTotal(0);
    db.rpc("empenhos_listar", {
      _caller: user,
      _pagina: pagina,
      _por_pagina: 50,
      _busca: busca,
      _modalidade: modalidade !== "all" ? modalidade : null,
      _natureza: natureza !== "all" ? natureza : null,
      _ano: ano !== "all" ? parseInt(ano) : null,
      _tipo_empenho: tipo !== "all" ? tipo : null,
      _recurso: recurso !== "all" ? recurso : null,
      _programa: programa !== "all" ? programa : null,
      _acao: acao !== "all" ? acao : null,
      _despesa: despesa !== "all" ? despesa : null,
      _valor_min: valorMin !== "" ? parseFloat(valorMin) : null,
      _valor_max: valorMax !== "" ? parseFloat(valorMax) : null,
      _status: status,
      _ordenacao: ordenacao,
    }).then(({ data, error }) => {
      if (consultaId !== consultaAtual.current) return;
      if (error) {
        setRows([]);
        setTotal(0);
        setTotalPaginas(1);
        toast({ title: "Erro ao carregar empenhos", description: error.message, variant: "destructive" });
      } else {
        const d = data as { rows: EmpenhoRow[]; total: number; totalPaginas: number } | null;
        if (d) {
          setRows(d.rows);
          setTotal(d.total);
          setTotalPaginas(d.totalPaginas);
        }
      }
      setLoading(false);
    });
  }, [
    user, pagina, busca, modalidade, natureza, ano, tipo, recurso,
    programa, acao, despesa, valorMin, valorMax, status, ordenacao
  ]);

  useEffect(() => {
    fetchRows();
    return () => { consultaAtual.current += 1; };
  }, [fetchRows]);

  const aplicarBusca = () => {
    setBusca(buscaInput);
    setPagina(1);
  };

  const limparFiltros = () => {
    setBusca("");
    setBuscaInput("");
    setAno("all");
    setStatus("todos");
    setOrdenacao("recentes");
    setValorMin("");
    setValorMax("");
    setTipo("all");
    setModalidade("all");
    setNatureza("all");
    setRecurso("all");
    setDespesa("all");
    setPrograma("all");
    setAcao("all");
    setPagina(1);
  };

  const temFiltroAtivo =
    busca || ano !== "all" || status !== "todos" || ordenacao !== "recentes" ||
    valorMin || valorMax || tipo !== "all" || modalidade !== "all" || natureza !== "all" || recurso !== "all" ||
    despesa !== "all" || programa !== "all" || acao !== "all";

  return (
    <>
      {detalheId && <PainelDetalhe id={detalheId} onClose={() => setDetalheId(null)} />}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* BARRA LATERAL (SIDEBAR DE FILTROS) */}
        <aside className="w-full lg:w-72 bg-card border border-border rounded-xl p-5 shrink-0 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm tracking-wide">Filtros de Pesquisa</h3>
            {temFiltroAtivo && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {/* SEÇÃO 1: FILTROS GERAIS */}
            <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/5">
              <button
                type="button"
                onClick={() => setOpenGerais(!openGerais)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40 hover:bg-muted/40 transition-colors text-left focus:outline-none"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  Filtros Gerais
                  {activeGeraisCount > 0 && (
                    <span className="px-1.5 py-0.25 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                      {activeGeraisCount}
                    </span>
                  )}
                </span>
                {openGerais ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {openGerais && (
                <div className="p-3 space-y-3">
                  {/* Busca textual */}
                  <div className="space-y-1">
                    <label htmlFor="emp-busca" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Credor / Objeto</label>
                    <div className="flex gap-1.5">
                      <Input
                        id="emp-busca"
                        placeholder="Pesquisar..."
                        value={buscaInput}
                        onChange={e => setBuscaInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && aplicarBusca()}
                        className="h-8 text-xs focus-visible:ring-primary"
                      />
                      <Button onClick={aplicarBusca} size="sm" className="h-8 w-8 p-0 shrink-0" aria-label="Aplicar busca"><Search className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>

                  {/* Ordenação */}
                  <div className="space-y-1">
                    <label htmlFor="emp-ordenacao" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ordenar por</label>
                    <Select value={ordenacao} onValueChange={(v) => { setOrdenacao(v); setPagina(1); }}>
                      <SelectTrigger id="emp-ordenacao" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recentes">Mais recentes</SelectItem>
                        <SelectItem value="maior_valor">Maior valor empenhado</SelectItem>
                        <SelectItem value="menor_valor">Menor valor empenhado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ano */}
                  <div className="space-y-1">
                    <label htmlFor="emp-ano" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Ano</label>
                    <Select value={ano} onValueChange={(v) => { setAno(v); setPagina(1); }}>
                      <SelectTrigger id="emp-ano" className="h-8 text-xs">                      <SelectValue placeholder="Todos os anos" defaultChecked /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os anos</SelectItem>
                        {filtros.anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label htmlFor="emp-status" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Situação Pagamento</label>
                    <Select value={status} onValueChange={(v) => { setStatus(v); setPagina(1); }}>
                      <SelectTrigger id="emp-status" className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente de pagamento</SelectItem>
                        <SelectItem value="pago">Totalmente pago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valores Mínimo/Máximo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Faixa de Valor (R$)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={valorMin}
                        onChange={e => { setValorMin(e.target.value); setPagina(1); }}
                        className="h-8 text-xs focus-visible:ring-primary"
                        aria-label="Valor mínimo"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={valorMax}
                        onChange={e => { setValorMax(e.target.value); setPagina(1); }}
                        className="h-8 text-xs focus-visible:ring-primary"
                        aria-label="Valor máximo"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 2: CLASSIFICAÇÃO & ORIGEM */}
            <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/5">
              <button
                type="button"
                onClick={() => setOpenClassificacao(!openClassificacao)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40 hover:bg-muted/40 transition-colors text-left focus:outline-none"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  Classificação & Origem
                  {activeClassificacaoCount > 0 && (
                    <span className="px-1.5 py-0.25 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                      {activeClassificacaoCount}
                    </span>
                  )}
                </span>
                {openClassificacao ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {openClassificacao && (
                <div className="p-3 space-y-3">
                  {/* Tipo Empenho */}
                  <div className="space-y-1">
                    <label htmlFor="emp-tipo" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Empenho</label>
                    <Select value={tipo} onValueChange={(v) => { setTipo(v); setPagina(1); }}>
                      <SelectTrigger id="emp-tipo" className="h-8 text-xs"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {filtros.tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Modalidade */}
                  <div className="space-y-1">
                    <label htmlFor="emp-modalidade" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Modalidade Licitatória</label>
                    <Select value={modalidade} onValueChange={(v) => { setModalidade(v); setPagina(1); }}>
                      <SelectTrigger id="emp-modalidade" className="h-8 text-xs"><SelectValue placeholder="Todas as modalidades" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as modalidades</SelectItem>
                        {filtros.modalidades.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Natureza */}
                  <div className="space-y-1">
                    <label htmlFor="emp-natureza" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Natureza da Despesa</label>
                    <Select value={natureza} onValueChange={(v) => { setNatureza(v); setPagina(1); }}>
                      <SelectTrigger id="emp-natureza" className="h-8 text-xs"><SelectValue placeholder="Todas as naturezas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as naturezas</SelectItem>
                        {filtros.naturezas.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recurso */}
                  <div className="space-y-1">
                    <label htmlFor="emp-recurso" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fonte de Recurso</label>
                    <Select value={recurso} onValueChange={(v) => { setRecurso(v); setPagina(1); }}>
                      <SelectTrigger id="emp-recurso" className="h-8 text-xs"><SelectValue placeholder="Todos os recursos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os recursos</SelectItem>
                        {filtros.recursos.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 3: ESTRUTURA PROGRAMÁTICA */}
            <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/5">
              <button
                type="button"
                onClick={() => setOpenEstrutura(!openEstrutura)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 border-b border-border/40 hover:bg-muted/40 transition-colors text-left focus:outline-none"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  Estrutura Programática
                  {activeEstruturaCount > 0 && (
                    <span className="px-1.5 py-0.25 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                      {activeEstruturaCount}
                    </span>
                  )}
                </span>
                {openEstrutura ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {openEstrutura && (
                <div className="p-3 space-y-3">
                  {/* Despesa */}
                  <div className="space-y-1">
                    <label htmlFor="emp-despesa" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nº Despesa</label>
                    <Select value={despesa} onValueChange={(v) => { setDespesa(v); setPagina(1); }}>
                      <SelectTrigger id="emp-despesa" className="h-8 text-xs"><SelectValue placeholder="Todas as despesas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as despesas</SelectItem>
                        {filtros.despesas.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Programa */}
                  <div className="space-y-1">
                    <label htmlFor="emp-programa" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nº Programa</label>
                    <Select value={programa} onValueChange={(v) => { setPrograma(v); setPagina(1); }}>
                      <SelectTrigger id="emp-programa" className="h-8 text-xs"><SelectValue placeholder="Todos os programas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os programas</SelectItem>
                        {filtros.programas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ação */}
                  <div className="space-y-1">
                    <label htmlFor="emp-acao" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nº Ação</label>
                    <Select value={acao} onValueChange={(v) => { setAcao(v); setPagina(1); }}>
                      <SelectTrigger id="emp-acao" className="h-8 text-xs"><SelectValue placeholder="Todas as ações" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as ações</SelectItem>
                        {filtros.acoes.map(ac => <SelectItem key={ac} value={ac}>{ac}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* TABELA PRINCIPAL DE EMPENHOS */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="text-xs text-muted-foreground">
            {total.toLocaleString("pt-BR")} registros {temFiltroAtivo ? "filtrados" : ""}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full shadow-sm">
            <div className="overflow-x-auto w-full scrollbar-thin">
              <table className="w-full min-w-[760px] text-sm table-fixed">
                <caption className="sr-only">Lista de empenhos orçamentários paginada</caption>
                <colgroup>
                  <col className="w-[64px]" />
                  <col className="w-[44px]" />
                  <col className="w-[78px]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[64px]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[36px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Nº Emp.", "Ano", "Data", "Credor", "Modalidade", "Natureza", "Empenhado", "Pago", "Saldo"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">{h}</th>
                    ))}
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-8" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-4" /></td>
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-0">
                        <EmptyState
                          icon={Search}
                          title="Nenhum empenho encontrado"
                          description={temFiltroAtivo ? "Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os parâmetros." : "Nenhum empenho cadastrado na base de dados."}
                          actionLabel={temFiltroAtivo ? "Limpar filtros" : undefined}
                          onAction={temFiltroAtivo ? limparFiltros : undefined}
                        />
                      </td>
                    </tr>
                  ) : rows.map(r => {
                    const pago = !r.saldo_pagar || r.saldo_pagar <= 0;
                    return (
                      <tr key={r.id}
                          tabIndex={0}
                          role="button"
                          aria-label={`Abrir detalhes do empenho ${r.numero_empenho}/${r.ano_empenho}`}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          onClick={() => setDetalheId(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setDetalheId(r.id);
                            }
                          }}>
                        <td className="px-3 py-3 font-mono text-xs font-semibold overflow-hidden text-ellipsis whitespace-nowrap">{r.numero_empenho}</td>
                        <td className="px-3 py-3 text-muted-foreground">{r.ano_empenho}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">{fmtData(r.data)}</td>
                        <td className="px-3 py-3 truncate" title={r.nome_credor}>{r.nome_credor || "—"}</td>
                        <td className="px-3 py-3">
                          {r.modalidade ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] max-w-full truncate block text-center"
                              title={r.modalidade}
                            >
                              {r.modalidade}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">{r.num_natureza_desp || "—"}</td>
                        <td className="px-3 py-3 font-semibold text-primary whitespace-nowrap tabular-nums">{moeda(r.valor_empenhado_bruto)}</td>
        <td className="px-3 py-3 text-emerald whitespace-nowrap tabular-nums">{moeda(r.valor_baixado_bruto)}</td>
        <td className="px-3 py-3 whitespace-nowrap tabular-nums">
          <span className={pago ? "text-emerald" : "text-gold"} aria-label={pago ? "Pago" : "Saldo a pagar"}>
            {moeda(r.saldo_pagar)}
          </span>
                        </td>
                        <td className="px-3 py-3"><Eye className="w-4 h-4 text-muted-foreground" aria-label="Ver detalhes" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          <DataPagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            onPagina={setPagina}
          />
        </div>
      </div>
    </>
  );
}
