import { useCallback, useEffect, useState } from "react";
import { Flame, HeartHandshake, Loader2, RefreshCw, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

type BeneficioItem = {
  id: string;
  mes_ano: string;
  tipo: string;
  codigo_ibge: string;
  municipio: string;
  uf: string;
  quantidade_beneficiarios: number;
  valor_total: number;
  sincronizado_em: string;
};

type BeneficiosStatus = {
  configurado: boolean;
  resumo: { registros: number; valor_total: number; beneficiarios_total: number };
  porTipo: { tipo: string; registros: number; valor_total: number; max_beneficiarios: number }[];
  meses: string[];
  isAdmin: boolean;
};

function formatarMoeda(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarMesAno(v: string) {
  if (v.length === 6) {
    return `${v.slice(4, 6)}/${v.slice(0, 4)}`;
  }
  return v;
}

function nomeTipo(t: string) {
  switch (t) {
    case "bolsa-familia":
      return "Bolsa Família";
    case "bpc":
      return "Benefício de Prestação Continuada (BPC)";
    case "auxilio-gas":
      return "Auxílio Gás";
    default:
      return t;
  }
}

export default function BeneficiosSociais() {
  const [status, setStatus] = useState<BeneficiosStatus | null>(null);
  const [registros, setRegistros] = useState<BeneficioItem[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const carregarStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/beneficios-sociais/status", { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.data) {
        setStatus(json.data);
      }
    } catch {
      // Ignora falha de status
    }
  }, []);

  const carregarHistorico = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (tipoFiltro !== "todos") params.set("tipo", tipoFiltro);
      const res = await fetch(`/api/beneficios-sociais/historico?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.data) {
        setRegistros(json.data.rows || []);
      } else {
        toast({ title: "Erro ao consultar benefícios", description: json.error?.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Falha de comunicação", description: String(e), variant: "destructive" });
    } finally {
      setCarregando(false);
    }
  }, [tipoFiltro]);

  useEffect(() => {
    carregarStatus();
  }, [carregarStatus]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  async function sincronizar() {
    setSincronizando(true);
    try {
      const res = await fetch("/api/beneficios-sociais/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: "Sincronização concluída", description: `${json.data?.recebidos || 0} registros atualizados da CGU.` });
        carregarStatus();
        carregarHistorico();
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
        title="Benefícios Sociais — Assistência e Cidadania"
        subtitle="Painel de transferências federais diretas às famílias de Inajá/PR (Bolsa Família, BPC e Auxílio Gás - CGU)"
        icon={HeartHandshake}
        backTo="/"
        actions={
          status?.isAdmin ? (
            <Button variant="outline" size="sm" onClick={sincronizar} disabled={sincronizando} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
              Sincronizar CGU
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 container max-w-7xl mx-auto py-6 px-4 space-y-6">
        {!status?.configurado && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-300">
            A chave do Portal da Transparência (CGU) não está configurada no servidor. É possível visualizar os dados já sincronizados ou adicionar a chave em Configurações para atualizações automáticas via API oficial.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Injetado na Economia</span>
                <Wallet className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatarMoeda(status?.resumo?.valor_total || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Registros nos meses sincronizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Beneficiários Atendidos</span>
                <Users className="h-4 w-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(status?.resumo?.beneficiarios_total || 0).toLocaleString("pt-BR")}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Famílias / cidadãos beneficiados em Inajá
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Programas Ativos</span>
                <Flame className="h-4 w-4 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status?.porTipo?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bolsa Família, BPC e Auxílio Gás
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold text-base">Histórico Mensal de Pagamentos</h3>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Tipo de Benefício" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os benefícios</SelectItem>
                <SelectItem value="bolsa-familia">Bolsa Família</SelectItem>
                <SelectItem value="bpc">BPC</SelectItem>
                <SelectItem value="auxilio-gas">Auxílio Gás</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês de Referência</TableHead>
                  <TableHead>Benefício</TableHead>
                  <TableHead>Município / UF</TableHead>
                  <TableHead className="text-right">Beneficiários</TableHead>
                  <TableHead className="text-right">Valor Total Injetado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando dados dos benefícios sociais...
                    </TableCell>
                  </TableRow>
                ) : registros.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum registro de benefício social encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  registros.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold whitespace-nowrap">
                        {formatarMesAno(item.mes_ano)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{nomeTipo(item.tipo)}</div>
                        <Badge variant="outline" className="text-[10px] mt-0.5">{item.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.municipio} - {item.uf}
                        <div className="text-muted-foreground text-[10px]">IBGE: {item.codigo_ibge}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(item.quantidade_beneficiarios || 0).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatarMoeda(item.valor_total)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
