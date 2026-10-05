import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Pencil, Trash2, FileDown, Wallet, Loader2, Mail, FileText, Search, Files, Sheet, Users, CheckCircle2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { NumberInput } from "@/components/ui/number-input";
import { AppFooter } from "@/components/AppFooter";
import { TransparenciaFornecedor } from "@/components/TransparenciaFornecedor";
import { DossieFornecedorModal } from "@/components/DossieFornecedorModal";
import {
  DEPARTAMENTOS, MESES, MESES_NOMES, brl,
} from "@/lib/empenhos";
import {
  generateRequestPDF, generateBatchPDF,
} from "@/lib/pdfGenerator";
import {
  empenhoDe as lookupEmpenho,
  filtrarCredores,
  montarSolicitacao,
  nomeArquivoCredor,
  totalEmpenhadoAno as calcTotalEmpenhado,
} from "@/lib/credoresHelpers";
import { gerarRelatorioCredoresPdf } from "@/lib/credoresRelatorioPdf";
import { gerarChecklistCredoresPdf } from "@/lib/credoresChecklistPdf";
import { exportarCredoresExcel } from "@/lib/credoresExcel";
import { CredorForm } from "@/components/credores/CredorForm";
import { SolicitacaoDialog } from "@/components/credores/SolicitacaoDialog";
import { LoteSolicitacaoDialog } from "@/components/credores/LoteSolicitacaoDialog";
import { EmpenhoDialog } from "@/components/credores/EmpenhoDialog";
import type { CredorFixo, EmpenhoCredor } from "@/types/credor";

type Credor = CredorFixo;
type Empenho = EmpenhoCredor;

export default function CredoresFixos() {
  const [credores, setCredores] = useState<Credor[]>([]);
  const [empenhos, setEmpenhos] = useState<Empenho[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [filtroDep, setFiltroDep] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [mesCheckout, setMesCheckout] = useState<number>(new Date().getMonth() + 1);
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Credor | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [empenhoDialog, setEmpenhoDialog] = useState<{ credor: Credor; mes: number } | null>(null);
  const [solicitacaoDialog, setSolicitacaoDialog] = useState<Credor | null>(null);
  const [openLote, setOpenLote] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [dossieCredor, setDossieCredor] = useState<{ cnpj: string; nome: string } | null>(null);
  const togglingMes = useRef(new Set<string>());
  const carregamentoSeq = useRef(0);
  const isMobile = useIsMobile();

  const carregar = useCallback(async () => {
    const seq = ++carregamentoSeq.current;
    setEmpenhos([]);
    const [c, e] = await Promise.all([
      db.from<Credor>("credores_fixos").select("*").order("nome"),
      db.from<Empenho>("empenhos_mensais").select("*").eq("ano", ano),
    ]);
    if (seq !== carregamentoSeq.current) return;
    if (c.error) {
      toast({ title: "Erro ao carregar credores", description: c.error.message, variant: "destructive" });
    } else {
      setCredores(c.data ?? []);
    }
    if (e.error) {
      toast({ title: "Erro ao carregar empenhos", description: e.error.message, variant: "destructive" });
    } else {
      setEmpenhos(e.data ?? []);
    }
    setLoadingInicial(false);
  }, [ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const empenhoDe = useCallback(
    (credorId: string, mes: number) => lookupEmpenho(empenhos, credorId, mes),
    [empenhos],
  );

  const credoresFiltrados = useMemo(
    () => filtrarCredores(credores, empenhos, { busca, filtroDep, filtroStatus }),
    [credores, empenhos, busca, filtroDep, filtroStatus],
  );

  const totalValorMensal = useMemo(
    () => credoresFiltrados.reduce((s, c) => s + Number(c.valor_mensal || 0), 0),
    [credoresFiltrados],
  );

  const totalEmpenhadoAno = useCallback(
    (credorId: string) => calcTotalEmpenhado(empenhos, credorId),
    [empenhos],
  );

  const salvarCredor = async (data: Partial<Credor>) => {
    if (!data.nome?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const valorMensal = Number(data.valor_mensal);
    if (!Number.isFinite(valorMensal) || valorMensal < 0) {
      toast({ title: "Valor mensal inválido", description: "Informe um valor igual ou maior que zero.", variant: "destructive" });
      return;
    }
    const email = data.email?.trim() || "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    const diaValido = (valor: string | null | undefined) => {
      if (!valor?.trim()) return true;
      const dia = Number(valor);
      return Number.isInteger(dia) && dia >= 1 && dia <= 31;
    };
    if (!diaValido(data.solicitacao) || !diaValido(data.pagamento)) {
      toast({ title: "Dia inválido", description: "Os dias devem estar entre 1 e 31.", variant: "destructive" });
      return;
    }
    const payload = {
      nome: data.nome.trim(),
      documento: data.documento?.trim() || null,
      departamento: data.departamento || "Administração",
      valor_mensal: valorMensal,
      descricao: data.descricao?.trim() || null,
      email: email || null,
      tipo_valor: data.tipo_valor || "FIXO",
      solicitacao: data.solicitacao?.trim() || null,
      pagamento: data.pagamento?.trim() || null,
      obs: data.obs?.trim() || null,
    };
    if (editing?.id) {
      const { error } = await db.from("credores_fixos").update(payload).eq("id", editing.id);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      const { error } = await db.from("credores_fixos").insert(payload);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    toast({ title: "Credor salvo" });
    setOpenForm(false);
    setEditing(null);
    await carregar();
  };

  const excluirCredor = async (id: string) => {
    setExcluirId(null);
    const { error } = await db.from("credores_fixos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Credor excluído" });
    await carregar();
  };

  const alternarEmpenho = async (credor: Credor, mes: number, dados?: Partial<Empenho>) => {
    const atual = empenhoDe(credor.id, mes);
    if (atual) {
      const novoStatus = dados?.status ?? (atual.status === "empenhado" ? "pendente" : "empenhado");
      const { error } = await db.from("empenhos_mensais").update({
        status: novoStatus,
        valor: dados?.valor ?? atual.valor ?? credor.valor_mensal,
        numero_empenho: dados?.numero_empenho ?? atual.numero_empenho,
        observacao: dados?.observacao ?? atual.observacao,
        empenhado_em: novoStatus === "empenhado" ? new Date().toISOString() : null,
      }).eq("id", atual.id);
      if (error) {
        toast({ title: "Erro ao atualizar empenho", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      const { error } = await db.from("empenhos_mensais").insert({
        credor_id: credor.id, ano, mes,
        status: dados?.status ?? "empenhado",
        valor: dados?.valor ?? credor.valor_mensal,
        numero_empenho: dados?.numero_empenho ?? null,
        observacao: dados?.observacao ?? null,
        empenhado_em: new Date().toISOString(),
      });
      if (error) {
        toast({ title: "Erro ao criar empenho", description: error.message, variant: "destructive" });
        return;
      }
    }
    setEmpenhoDialog(null);
    await carregar();
  };

  const tickMes = async (credor: Credor, mes: number) => {
    const key = `${credor.id}:${ano}:${mes}`;
    if (togglingMes.current.has(key)) return;
    togglingMes.current.add(key);
    try {
      await alternarEmpenho(credor, mes);
    } finally {
      togglingMes.current.delete(key);
    }
  };

  const abrirDetalheMes = (credor: Credor, mes: number, e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    setEmpenhoDialog({ credor, mes });
  };

  const salvarHistorico = async (
    request: ReturnType<typeof montarSolicitacao>["request"],
    valor: number,
  ): Promise<boolean> => {
    try {
      const { error } = await db.from("solicitacoes").insert({
        solicitante: request.solicitante,
        empresa: request.empresa,
        data_solicitacao: request.dataSolicitacao,
        observacoes: request.observacoes,
        items: request.items,
        valor_total: valor,
      });
      return !error;
    } catch {
      return false;
    }
  };

  const carregarEmpenhosAno = useCallback(async (anoRef: number): Promise<Empenho[]> => {
    if (anoRef === ano) return empenhos;
    const { data, error } = await db.from<Empenho>("empenhos_mensais").select("*").eq("ano", anoRef);
    if (error) throw new Error(error.message);
    return data ?? [];
  }, [ano, empenhos]);

  const gerarPDF = async () => {
    try {
      await gerarRelatorioCredoresPdf({
        ano,
        filtroDep,
        busca,
        credores: credoresFiltrados,
        empenhos,
        totalValorMensal,
      });
    } catch {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
  };

  const gerarChecklist = async () => {
    try {
      await gerarChecklistCredoresPdf({
        ano,
        mes: mesCheckout,
        filtroDep,
        busca,
        credores: credoresFiltrados,
        empenhos,
      });
      toast({ title: "Checklist de checkout gerado" });
    } catch {
      toast({ title: "Erro ao gerar checklist", variant: "destructive" });
    }
  };

  const gerarExcel = async () => {
    if (credoresFiltrados.length === 0) {
      toast({ title: "Nenhum credor para exportar", variant: "destructive" });
      return;
    }
    setExportandoExcel(true);
    try {
      await exportarCredoresExcel({
        ano,
        credores: credoresFiltrados,
        empenhos,
      });
      toast({ title: "Excel exportado" });
    } catch {
      toast({ title: "Erro ao exportar Excel", variant: "destructive" });
    } finally {
      setExportandoExcel(false);
    }
  };

  const gerarSolicitacaoPDF = async (c: Credor, mesRef: number, anoRef: number) => {
    const empenhosAnoRef = await carregarEmpenhosAno(anoRef);
    const { request, valor, mes, mesNome } = montarSolicitacao(c, mesRef, anoRef, {
      anoEmpenhos: anoRef,
      empenhos: empenhosAnoRef,
    });
    const nomeArq = nomeArquivoCredor(c.nome);
    const mesStr = String(mes).padStart(2, "0");
    await generateRequestPDF(request, 12, `solicitacao_${nomeArq}_${mesStr}_${anoRef}.pdf`);
    const historicoSalvo = await salvarHistorico(request, valor);
    return { mesNome, valor, historicoSalvo };
  };

  const gerarLoteSolicitacoes = async (mesRef: number, anoRef: number, lista: Credor[]) => {
    if (lista.length === 0) {
      throw new Error("Nenhum credor para o lote");
    }
    const empenhosAnoRef = await carregarEmpenhosAno(anoRef);
    const built = lista.map((c) => montarSolicitacao(c, mesRef, anoRef, {
      anoEmpenhos: anoRef,
      empenhos: empenhosAnoRef,
    }));
    const mesStr = String(Math.min(12, Math.max(1, mesRef))).padStart(2, "0");
    await generateBatchPDF(
      built.map((b) => b.request),
      12,
      `solicitacoes_lote_${mesStr}_${anoRef}.pdf`,
    );
    let falhasHistorico = 0;
    for (const b of built) if (!(await salvarHistorico(b.request, b.valor))) falhasHistorico++;
    return {
      qtd: lista.length,
      total: built.reduce((s, b) => s + b.valor, 0),
      mesNome: MESES_NOMES[Math.min(12, Math.max(1, mesRef)) - 1],
      falhasHistorico,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Wallet}
        title="Credores recorrentes"
        subtitle="Credores mensais recorrentes"
      />

      {loadingInicial ? (
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </main>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Credores recorrentes" value={String(credoresFiltrados.length)} icon={Users} variant="primary" />
          <StatCard label="Soma mensal" value={brl(totalValorMensal)} icon={Wallet} variant="success" />
          <StatCard
            label={`Empenhado em ${ano}`}
            value={brl(credoresFiltrados.reduce((s, c) => s + totalEmpenhadoAno(c.id), 0))}
            icon={CheckCircle2}
            variant="warning"
          />
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-primary">Filtros & Ações</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => { setEditing(null); setOpenForm(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Novo Credor
              </Button>
              <Button variant="outline" onClick={() => setOpenLote(true)} disabled={credoresFiltrados.length === 0}>
                <Files className="w-4 h-4 mr-2" /> Solicitações em lote
              </Button>
              <Button variant="outline" onClick={gerarPDF}>
                <FileDown className="w-4 h-4 mr-2" /> Relatório PDF
              </Button>
              <div className="flex items-center gap-2">
                <Select value={String(mesCheckout)} onValueChange={(v) => setMesCheckout(Number(v))}>
                  <SelectTrigger className="w-[110px]" aria-label="Mês do checkout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES_NOMES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={gerarChecklist}>
                  <FileText className="w-4 h-4 mr-2" /> Checklist checkout
                </Button>
              </div>
              <Button variant="outline" onClick={gerarExcel} disabled={exportandoExcel || credoresFiltrados.length === 0}>
                {exportandoExcel
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Sheet className="w-4 h-4 mr-2" />}
                Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2 lg:col-span-1">
              <Label htmlFor="busca-credor">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="busca-credor"
                  className="pl-9"
                  placeholder="Nome, CNPJ ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="filtro-ano">Ano</Label>
              <NumberInput id="filtro-ano" value={ano} onValueChange={(v) => setAno(v || ano)} />
            </div>
            <div>
              <Label>Departamento</Label>
                <Select value={filtroDep} onValueChange={setFiltroDep}>
                  <SelectTrigger aria-label="Filtrar por departamento"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {DEPARTAMENTOS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Com pendência</SelectItem>
                  <SelectItem value="empenhado">Com empenhos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {!isMobile && (
        <Card className="w-full max-w-full">
          <CardContent className="p-0 overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Credor</TableHead>
                  <TableHead>Depto</TableHead>
                  <TableHead>Mensal</TableHead>
                  <TableHead className="text-right">Emp. {ano}</TableHead>
                  {MESES.map((m) => <TableHead key={m} className="text-center px-0.5 text-xs">{m}</TableHead>)}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credoresFiltrados.map((c) => {
                  const tooltipParts = [
                    c.documento && `CNPJ: ${c.documento}`,
                    c.email && `Email: ${c.email}`,
                    c.solicitacao && `Sol. dia ${c.solicitacao}`,
                    c.pagamento && `Pag. dia ${c.pagamento}`,
                    c.obs && `Obs: ${c.obs}`,
                  ].filter(Boolean).join("\n");
                  return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium" title={tooltipParts || undefined}>
                      <div className="font-semibold text-primary text-sm leading-tight">{c.nome}</div>
                      {c.descricao && <div className="text-[11px] text-muted-foreground/80 italic leading-tight">{c.descricao}</div>}
                      {c.obs && <span className="text-[10px] text-orange-500 font-medium">{c.obs}</span>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] px-1.5">{c.departamento}</Badge></TableCell>
                    <TableCell className="text-sm">{brl(Number(c.valor_mensal))}</TableCell>
                    <TableCell className="text-right font-medium text-sm">{brl(totalEmpenhadoAno(c.id))}</TableCell>
                    {MESES.map((_, i) => {
                      const e = empenhoDe(c.id, i + 1);
                      const empenhado = e?.status === "empenhado";
                      const mes = i + 1;
                      return (
                        <TableCell key={i} className="text-center p-1">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={empenhado}
                            aria-label={`${MESES[i]} — ${empenhado ? "Empenhado" : "Pendente"}`}
                            onClick={(ev) => {
                              if (ev.shiftKey || ev.altKey) {
                                abrirDetalheMes(c, mes);
                                return;
                              }
                              tickMes(c, mes);
                            }}
                            onContextMenu={(ev) => abrirDetalheMes(c, mes, ev)}
                            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                              empenhado
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/70 text-muted-foreground"
                            }`}
                            title={
                              empenhado
                                ? `Empenhado ${e?.numero_empenho ?? ""} — clique para desmarcar · botão direito / Shift+clique para detalhes`
                                : "Pendente — clique para marcar empenhado · botão direito / Shift+clique para detalhes"
                            }
                          >
                            <span className="text-xs font-bold tabular-nums leading-none">{mes}</span>
                          </button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setSolicitacaoDialog(c)} aria-label="Gerar solicitação PDF">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => c.documento && setDossieCredor({ cnpj: c.documento, nome: c.nome })} disabled={!c.documento || c.documento.replace(/\D/g, "").length !== 14} title="Dossiê 360° do Fornecedor" aria-label="Dossiê 360° do fornecedor">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <TransparenciaFornecedor cnpj={c.documento} nome={c.nome} modo="button" />
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpenForm(true); }} aria-label="Editar credor">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setExcluirId(c.id)} aria-label="Excluir credor">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {credoresFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                      {busca.trim() || filtroDep !== "todos" || filtroStatus !== "todos"
                        ? "Nenhum credor encontrado com os filtros atuais."
                        : "Nenhum credor cadastrado."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}

        {isMobile && (
        <div className="space-y-3">
          {credoresFiltrados.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-primary">{c.nome}</div>
                    {c.documento && <div className="text-xs text-muted-foreground mt-0.5">{c.documento}</div>}
                    {c.descricao && <div className="text-xs text-muted-foreground/80 mt-0.5 italic">{c.descricao}</div>}
                    {c.email && (
                      <div className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" />{c.email.toLowerCase()}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary">{c.departamento}</Badge>
                      {c.tipo_valor && c.tipo_valor !== "FIXO" && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.tipo_valor}</Badge>}
                      {c.solicitacao && <span className="text-[10px] text-muted-foreground">Sol. dia {c.solicitacao}</span>}
                      {c.pagamento && <span className="text-[10px] text-muted-foreground">Pag. dia {c.pagamento}</span>}
                      {c.obs && <span className="text-[10px] text-orange-500 font-medium">{c.obs}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Valor mensal</p>
                    <p className="font-semibold text-emerald">{brl(Number(c.valor_mensal))}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Empenhado {ano}</p>
                    <p className="font-semibold text-gold">{brl(totalEmpenhadoAno(c.id))}</p>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {MESES.map((m, i) => {
                    const e = empenhoDe(c.id, i + 1);
                    const empenhado = e?.status === "empenhado";
                    const mes = i + 1;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="checkbox"
                        aria-checked={empenhado}
                        aria-label={`${m} — ${empenhado ? "Empenhado" : "Pendente"}`}
                        onClick={(ev) => {
                          if (ev.shiftKey || ev.altKey) {
                            abrirDetalheMes(c, mes);
                            return;
                          }
                          tickMes(c, mes);
                        }}
                        onContextMenu={(ev) => abrirDetalheMes(c, mes, ev)}
                        className={`h-9 rounded-md flex flex-col items-center justify-center transition-colors ${
                          empenhado
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/70 text-muted-foreground"
                        }`}
                        title={
                          empenhado
                            ? `${m} – Empenhado ${e?.numero_empenho ?? ""} — clique para desmarcar · botão direito / Shift+clique para detalhes`
                            : `${m} – Pendente — clique para marcar empenhado · botão direito / Shift+clique para detalhes`
                        }
                      >
                        <span className="text-sm font-bold tabular-nums leading-none">{mes}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1" onClick={() => setSolicitacaoDialog(c)}>
                    <FileText className="w-4 h-4 mr-2" /> Solicitação PDF
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => c.documento && setDossieCredor({ cnpj: c.documento, nome: c.nome })} disabled={!c.documento || c.documento.replace(/\D/g, "").length !== 14} title="Dossiê 360°" aria-label="Dossiê 360°">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </Button>
                  <TransparenciaFornecedor cnpj={c.documento} nome={c.nome} modo="button" />
                  <Button size="icon" variant="outline" onClick={() => { setEditing(c); setOpenForm(true); }} aria-label="Editar credor">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setExcluirId(c.id)} aria-label="Excluir credor">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {credoresFiltrados.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">
              {busca.trim() || filtroDep !== "todos" || filtroStatus !== "todos"
                ? "Nenhum credor encontrado com os filtros atuais."
                : "Nenhum credor cadastrado."}
            </p>
          )}
        </div>
        )}
        </main>
      )}

      <CredorForm
        open={openForm}
        credor={editing}
        onClose={() => { setOpenForm(false); setEditing(null); }}
        onSave={salvarCredor}
      />

      <EmpenhoDialog
        data={empenhoDialog}
        empenho={empenhoDialog ? empenhoDe(empenhoDialog.credor.id, empenhoDialog.mes) : undefined}
        onClose={() => setEmpenhoDialog(null)}
        onSave={(dados) => empenhoDialog && alternarEmpenho(empenhoDialog.credor, empenhoDialog.mes, dados)}
      />

      <SolicitacaoDialog
        credor={solicitacaoDialog}
        anoPadrao={ano}
        empenhos={empenhos}
        carregarEmpenhosAno={carregarEmpenhosAno}
        onClose={() => setSolicitacaoDialog(null)}
        onGerar={async (mesRef, anoRef) => {
          if (!solicitacaoDialog) return;
          try {
            const r = await gerarSolicitacaoPDF(solicitacaoDialog, mesRef, anoRef);
            setSolicitacaoDialog(null);
            toast({
              title: r.historicoSalvo ? "Solicitação gerada" : "PDF gerado sem salvar no histórico",
              description: r.historicoSalvo
                ? `${r.mesNome}/${anoRef} · salva no histórico`
                : `${r.mesNome}/${anoRef} · verifique a conexão e tente salvar novamente`,
              variant: r.historicoSalvo ? "default" : "destructive",
            });
          } catch {
            toast({
              title: "Erro ao gerar PDF",
              description: "Tente novamente.",
              variant: "destructive",
            });
          }
        }}
      />

      <LoteSolicitacaoDialog
        open={openLote}
        credores={credoresFiltrados}
        anoPadrao={ano}
        filtroDep={filtroDep}
        empenhos={empenhos}
        carregarEmpenhosAno={carregarEmpenhosAno}
        onClose={() => setOpenLote(false)}
        onGerar={async (mesRef, anoRef) => {
          try {
            const r = await gerarLoteSolicitacoes(mesRef, anoRef, credoresFiltrados);
            setOpenLote(false);
            toast({
              title: r.falhasHistorico === 0 ? "Lote gerado" : "Lote gerado com falhas no histórico",
              description: r.falhasHistorico === 0
                ? `${r.qtd} solicitação(ões) · ${r.mesNome}/${anoRef} · ${brl(r.total)}`
                : `${r.qtd} solicitação(ões) · ${r.falhasHistorico} não salva(s) no histórico`,
              variant: r.falhasHistorico === 0 ? "default" : "destructive",
            });
          } catch {
            toast({
              title: "Erro ao gerar lote",
              description: "Tente novamente.",
              variant: "destructive",
            });
          }
        }}
      />

      <AlertDialog open={!!excluirId} onOpenChange={(o) => !o && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir credor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todo o histórico de empenhos será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluirCredor(excluirId!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DossieFornecedorModal
        aberto={Boolean(dossieCredor)}
        onOpenChange={(aberto) => { if (!aberto) setDossieCredor(null); }}
        cnpj={dossieCredor?.cnpj}
        nomeFornecedor={dossieCredor?.nome}
      />
      <AppFooter />
    </div>
  );
}
