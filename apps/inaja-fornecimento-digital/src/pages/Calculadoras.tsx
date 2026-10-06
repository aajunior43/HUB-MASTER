import { useState } from "react";
import { Calculator, Percent, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { PageTabs, type PageTab } from "@/components/PageTabs";
import { parseBR, moeda as brl } from "@/lib/empenhos";
import { calcularIss, ISS_ALIQUOTA } from "@/lib/calculadoras";
import { CalculadoraDiarias } from "./Diarias";
import AtualizacaoMonetaria from "./AtualizacaoMonetaria";

type CalculadoraTab = "diarias" | "iss" | "indices";

const tabs: PageTab<CalculadoraTab>[] = [
  { id: "diarias", label: "Diárias", icon: Calculator },
  { id: "iss", label: "ISS", icon: Percent },
  { id: "indices", label: "Índices oficiais", icon: TrendingUp },
];

function formatoBrasileiroValido(valor: string) {
  return /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{0,2})?$/.test(valor);
}

function lerNumeroBrasileiro(valor: string) {
  const texto = valor.trim();
  return texto.length > 0 && formatoBrasileiroValido(texto) ? parseBR(texto) : null;
}

function CalculadoraIss() {
  const [valorBruto, setValorBruto] = useState("");
  const texto = valorBruto.trim();
  const formatoValido = texto.length > 0 && formatoBrasileiroValido(texto);
  const valor = lerNumeroBrasileiro(valorBruto);
  const resultado = valor == null ? null : calcularIss(valor);

  return (
    <Card className="mx-auto max-w-2xl overflow-hidden">
      <div className="border-b bg-muted/35 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Retenção de ISS</p>
        <h2 className="mt-1 font-display text-lg font-bold">Calculadora de ISS</h2>
        <p className="mt-1 text-sm text-muted-foreground">Informe o valor bruto para calcular o desconto e o valor líquido.</p>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="valor-iss">Valor bruto</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
            <Input
              id="valor-iss"
              value={valorBruto}
              onChange={(event) => setValorBruto(event.target.value)}
              placeholder="Ex.: 1.000,00"
              inputMode="decimal"
              className="pl-10"
              aria-describedby="aliquota-iss"
            />
          </div>
          <p id="aliquota-iss" className="text-xs text-muted-foreground">Alíquota fixa utilizada: {(ISS_ALIQUOTA * 100).toLocaleString("pt-BR")}%. Use vírgula para os centavos.</p>
          {texto.length > 0 && !formatoValido && <p className="text-xs text-destructive">Informe um valor válido, como 1.000,00.</p>}
        </div>

        {resultado && (
          <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Valor do desconto (ISS)</p>
              <p className="mt-2 font-display text-2xl font-bold text-destructive">{brl(resultado.desconto)}</p>
              <p className="mt-1 text-xs text-muted-foreground">5% sobre o valor bruto</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Valor líquido</p>
              <p className="mt-2 font-display text-2xl font-bold text-primary">{brl(resultado.liquido)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Valor bruto menos o ISS</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Calculadoras() {
  const [aba, setAba] = useState<CalculadoraTab>("diarias");

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Calculator}
        title="Calculadoras"
        subtitle="Diárias, ISS e índices oficiais"
        maxWidth="max-w-5xl"
      />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <PageTabs tabs={tabs} value={aba} onChange={setAba} />
        {aba === "diarias" ? (
          <div className="mx-auto max-w-3xl">
            <CalculadoraDiarias />
          </div>
        ) : aba === "iss" ? (
          <CalculadoraIss />
        ) : (
          <AtualizacaoMonetaria />
        )}
      </main>
    </div>
  );
}
