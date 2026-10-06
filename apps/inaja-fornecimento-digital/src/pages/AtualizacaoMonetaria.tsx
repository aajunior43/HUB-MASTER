import { useState } from "react";
import { ExternalLink, Info, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Serie = "ipca" | "selic";

type Resultado = {
  serie: {
    id: Serie;
    codigo: string;
    nome: string;
    periodicidade: string;
    unidade: string;
    descricao: string;
    fonte: string;
  };
  dataInicial: string;
  dataFinal: string;
  principal: number;
  fator: number;
  percentualAcumulado: number;
  valorAtualizado: number;
  acrescimo: number;
  observacoesAplicadas: number;
  fonte: string;
  consultadoEm: string;
  emCache: boolean;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%`;
}

function dataHoje() {
  const data = new Date();
  return data.toISOString().slice(0, 10);
}

function dataUmAnoAtras() {
  const data = new Date();
  data.setUTCFullYear(data.getUTCFullYear() - 1);
  return data.toISOString().slice(0, 10);
}

export default function AtualizacaoMonetaria() {
  const [serie, setSerie] = useState<Serie>("ipca");
  const [valor, setValor] = useState("1.000,00");
  const [dataInicial, setDataInicial] = useState(dataUmAnoAtras);
  const [dataFinal, setDataFinal] = useState(dataHoje);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const calcular = async (event: React.FormEvent) => {
    event.preventDefault();
    setCarregando(true);
    setErro(null);
    setResultado(null);
    const params = new URLSearchParams({ valor, serie, dataInicial, dataFinal });
    try {
      const resposta = await fetch(`/api/bcb/calcular?${params.toString()}`, { credentials: "same-origin", headers: { Accept: "application/json" } });
      const json = await resposta.json() as { data?: Resultado; error?: { message?: string } };
      if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível calcular a atualização.");
      if (!json.data) throw new Error("O Banco Central não devolveu um resultado válido.");
      setResultado(json.data);
    } catch (e) {
      setErro(String((e as Error).message));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <div className="border-b bg-muted/35 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Banco Central · BCData/SGS</p>
            <h2 className="mt-1 font-display text-lg font-bold">Atualização por índice oficial</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aplique IPCA mensal ou Selic efetiva diária ao valor informado.</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </div>

      <CardContent className="space-y-5 p-4 sm:p-6">
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bcb-serie">Índice</Label>
            <select id="bcb-serie" value={serie} onChange={(event) => setSerie(event.target.value as Serie)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="ipca">IPCA · mensal</option>
              <option value="selic">Selic efetiva · diária</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcb-valor">Valor inicial</Label>
            <Input id="bcb-valor" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="Ex.: 1.000,00" inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcb-data-inicial">Data inicial</Label>
            <Input id="bcb-data-inicial" type="date" value={dataInicial} onChange={(event) => setDataInicial(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bcb-data-final">Data final</Label>
            <Input id="bcb-data-final" type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">O cálculo compõe as observações oficiais publicadas dentro do período.</p>
            <Button type="submit" disabled={carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}Calcular atualização</Button>
          </div>
        </form>

        {erro && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>{erro}</span></div>}

        {resultado && <div className="space-y-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3">
            <div><p className="font-semibold">{resultado.serie.nome}</p><p className="text-xs text-muted-foreground">Série SGS {resultado.serie.codigo} · {resultado.serie.unidade}</p></div>
            <Badge variant="outline">{resultado.observacoesAplicadas.toLocaleString("pt-BR")} observações</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Valor inicial</p><p className="mt-1 text-xl font-bold">{moeda(resultado.principal)}</p></div>
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Valor atualizado</p><p className="mt-1 text-xl font-bold text-primary">{moeda(resultado.valorAtualizado)}</p></div>
            <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Variação acumulada</p><p className="mt-1 text-xl font-bold">{percentual(resultado.percentualAcumulado)}</p><p className="mt-1 text-xs text-muted-foreground">Acréscimo: {moeda(resultado.acrescimo)}</p></div>
          </div>
          <p className="text-xs text-muted-foreground">Período: {resultado.dataInicial.split("-").reverse().join("/")} a {resultado.dataFinal.split("-").reverse().join("/")}. A consulta é somente leitura e serve como apoio; valide a metodologia aplicável ao contrato ou obrigação.</p>
          <a href={resultado.serie.fonte} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" />Metadados oficiais da série</a>
        </div>}
      </CardContent>
    </Card>
  );
}
