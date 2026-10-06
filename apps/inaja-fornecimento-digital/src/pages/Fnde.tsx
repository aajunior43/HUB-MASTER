import { useCallback, useEffect, useState } from "react";
import { BookOpen, Download, GraduationCap, Loader2, RefreshCw, Search, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataPagination } from "@/components/DataPagination";
import { toast } from "@/hooks/use-toast";

type FndeRepasse = {
  id: string;
  ano: number;
  programa: string;
  acao: string | null;
  numero_processo: string | null;
  entidade: string;
  cnpj_entidade: string;
  escola: string | null;
  valor_pago: number;
  data_pagamento: string | null;
  numero_ordem_bancaria: string | null;
  sincronizado_em: string;
};

type FndeStatus = {
  resumo: { total: number; valor_total: number };
  porPrograma: { programa: string; total: number; valor: number }[];
  anos: number[];
  urls: { portal: string; liberacoes: string };
  isAdmin: boolean;
};

function formatarMoeda(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(v: string | null) {
  if (!v) return "—";
  const [ano, mes, dia] = v.split("-");
  if (ano && mes && dia) return `${dia}/${mes}/${ano}`;
  return v;
}

export default function Fnde() {
  const [status, setStatus] = useState<FndeStatus | null>(null);
  const [repasses, setRepasses] = useState<FndeRepasse[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [programaFiltro, setProgramaFiltro] = useState("todos");
  const [anoFiltro, setAnoFiltro] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const carregarStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/fnde/status", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.data) {
        setStatus(json.data);
      }
    } catch {
      // Ignora falha de status inicial
    }
  }, []);

  const carregarRepasses = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      if (programaFiltro !== "todos") params.set("programa", programaFiltro);
      if (anoFiltro !== "todos") params.set("ano", anoFiltro);
      params.set("pagina", String(pagina));

      const res = await fetch(`/api/fnde/repasses?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.data) {
        setRepasses(json.data.rows || []);
        setTotal(Number(json.data.total || 0));
      } else {
        toast({ title: "Erro ao consultar FNDE", description: json.error?.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Falha de comunicação", description: String(e), variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  }, [busca, programaFiltro, anoFiltro, pagina]);

  useEffect(() => {
    carregarStatus();
  }, [carregarStatus]);

  useEffect(() => {
    carregarRepasses();
  }, [carregarRepasses]);

  async function sincronizar() {
    setSincronizando(true);
    try {
      const res = await fetch("/api/fnde/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anos: [new Date().getFullYear(), new Date().getFullYear() - 1] }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Sincronização concluída", description: `${json.data?.recebidos || 0} registros sincronizados.` });
        carregarStatus();
        carregarRepasses();
      } else {
        toast({ title: "Erro na sincronização", description: json.error?.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Falha ao sincronizar", description: String(e), variant: "destructive" });
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        title="FNDE — Recursos da Educação"
        subtitle="Repasses federais do Fundo Nacional de Desenvolvimento da Educação para Inajá (PNAE, PNATE, PAR, PDDE)"
        icon={GraduationCap}
        backTo="/"
        actions={
          status?.isAdmin ? (
            <Button variant="outline" size="sm" onClick={sincronizar} disabled={sincronizando} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
              Sincronizar FNDE
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 container max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Total de Recursos Pagos</span>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatarMoeda(status?.resumo?.valor_total || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {status?.resumo?.total || 0} repasse(s) registrado(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Programas Atendidos</span>
                <BookOpen className="h-4 w-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status?.porPrograma?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {status?.porPrograma?.slice(0, 3).map(p => p.programa).join(", ") || "Nenhum no momento"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Consulta Oficial</span>
                <Download className="h-4 w-4 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <a
                  href={status?.urls?.liberacoes || "https://www.fnde.gov.br"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium flex items-center gap-1"
                >
                  Portal de Liberação de Recursos FNDE ↗
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dados abertos integrados</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por programa, ação, processo ou ordem bancária..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPagina(1);
                }}
                className="pl-9"
              />
            </div>

            <Select
              value={programaFiltro}
              onValueChange={(v) => {
                setProgramaFiltro(v);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os programas</SelectItem>
                {status?.porPrograma?.map((p) => (
                  <SelectItem key={p.programa} value={p.programa}>
                    {p.programa} ({p.total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={anoFiltro}
              onValueChange={(v) => {
                setAnoFiltro(v);
                setPagina(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos anos</SelectItem>
                {status?.anos?.map((ano) => (
                  <SelectItem key={ano} value={String(ano)}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead>Programa / Ação</TableHead>
                  <TableHead>Processo / Ordem Bancária</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando repasses do FNDE...
                    </TableCell>
                  </TableRow>
                ) : repasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum repasse do FNDE localizado para os filtros informados.
                    </TableCell>
                  </TableRow>
                ) : (
                  repasses.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold">{item.ano}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.programa}</div>
                        {item.acao && <div className="text-xs text-muted-foreground">{item.acao}</div>}
                        {item.escola && <Badge variant="outline" className="mt-1 text-[10px]">{item.escola}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>Proc: {item.numero_processo || "—"}</div>
                        <div className="text-muted-foreground">OB: {item.numero_ordem_bancaria || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatarData(item.data_pagamento)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatarMoeda(item.valor_pago)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            pagina={pagina}
            totalPaginas={Math.max(1, Math.ceil(total / 30))}
            total={total}
            onPagina={setPagina}
          />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
