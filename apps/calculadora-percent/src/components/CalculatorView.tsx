"use client";

import { useMemo, useState } from "react";
import { CalculatorMeta } from "@/calculators/registry";
import { parseNumber, formatNumber, formatPercent } from "@/utils/numberParsing";
import {
  percentageOf,
  whatPercent,
  increasePercent,
  discountPercent,
  variationPercent,
  fractionToPercent,
  cumulativePercent,
  reversePercentage,
  simpleInterest,
  compoundInterest,
  marginAndMarkup,
  percentToDecimal,
  decimalToPercent,
  percentToFraction,
  fractionToPercentConverter,
  distribution,
} from "@/calculators";
import { useHistory } from "@/utils/history";
import { PercentInput } from "@/components/PercentInput";

export function CalculatorView({ meta }: { meta: CalculatorMeta }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [decimals, setDecimals] = useState(2);
  const [copied, setCopied] = useState(false);
  const { add } = useHistory();
  
  const res = useMemo(() => {
    const g = (k: string) => parseNumber(inputs[k] || "");
    try {
      switch (meta.slug) {
        case "percentage-of": {
          const x = g("x") ?? 0; const y = g("y") ?? 0;
          const { result, formula } = percentageOf(x, y);
          return { result, formula, render: formatNumber(result, decimals) };
        }
        case "what-percent": {
          const x = g("x") ?? 0; const y = g("y") ?? 0;
          const { result, formula } = whatPercent(x, y);
          return { result, formula, render: formatPercent(result, decimals) };
        }
        case "increase": {
          const a = g("a") ?? 0; const b = g("b") ?? 0;
          const { result, formula } = increasePercent(a, b);
          return { result, formula, render: formatPercent(result, decimals) };
        }
        case "discount": {
          const a = g("a") ?? 0; const b = g("b") ?? 0;
          const { result, formula } = discountPercent(a, b);
          return { result, formula, render: formatPercent(result, decimals) };
        }
        case "variation": {
          const a = g("a") ?? 0; const b = g("b") ?? 0;
          const { result, formula } = variationPercent(a, b);
          return { result, formula, render: formatPercent(result, decimals) };
        }
        case "fraction": {
          const parte = g("parte") ?? 0; const total = g("total") ?? 0;
          const { result, formula } = fractionToPercent(parte, total);
          return { result, formula, render: formatPercent(result, decimals) };
        }
        case "cumulative": {
          const base = g("base") ?? 0; const seq = inputs["seq"] || "";
          const arr = seq.split(/[;,\s]+/).filter(Boolean).map((s) => parseNumber(s) ?? 0);
          const { result, formula } = cumulativePercent(base, arr);
          return { result, formula, render: formatNumber(result, decimals) };
        }
        case "reverse": {
          const finalValue = g("final") ?? 0; const p = g("percent") ?? 0;
          const { result, formula } = reversePercentage(finalValue, p);
          return { result, formula, render: formatNumber(result, decimals) };
        }
        case "simple-interest": {
          const principal = g("principal") ?? 0; const rate = g("rate") ?? 0; const periods = g("periods") ?? 0;
          const { result, formula } = simpleInterest(principal, rate, periods);
          return { result, formula, render: formatNumber(result, decimals) };
        }
        case "compound-interest": {
          const principal = g("principal") ?? 0; const rate = g("rate") ?? 0; const periods = g("periods") ?? 0;
          const { result, formula } = compoundInterest(principal, rate, periods);
          return { result, formula, render: formatNumber(result, decimals) };
        }
        case "margin-markup": {
          const cost = g("cost") ?? 0; const sale = g("sale") ?? 0;
          const { margin, markup, formula } = marginAndMarkup(cost, sale);
          return { result: { margin, markup }, formula, render: `Margem: ${formatPercent(margin, decimals)} | Markup: ${formatPercent(markup, decimals)}` };
        }
        case "converters": {
          const value = g("value") ?? 0;
          const p2d = percentToDecimal(value);
          const d2p = decimalToPercent(value);
          const frac = percentToFraction(value);
          return { result: { p2d, d2p, frac }, formula: "Conversões diretas", render: `décimal: ${p2d} | percent: ${d2p}% | fração: ${frac.numerator}/${frac.denominator}` };
        }
        case "distribution": {
          const value = g("value") ?? 0; const seq = inputs["seq"] || "";
          const arr = seq.split(/[;,\s]+/).filter(Boolean).map((s) => parseNumber(s) ?? 0);
          const { valid, parts, sum } = distribution(value, arr);
          return { result: { valid, parts, sum }, formula: `soma = ${sum}`, render: `${valid ? "Válida" : "Inválida"}: ${parts.map((p) => formatNumber(p, decimals)).join(", ")}` };
        }
      }
    } catch (e) {
      return { result: null, formula: "", render: "" };
    }
    return { result: null, formula: "", render: "" };
  }, [inputs, meta.slug, decimals]);

  function handleSave() {
    add({ slug: meta.slug, title: meta.title, inputs, result: res.render || "", formula: String(res.formula || "") });
  }

  async function handleCopy() {
    try {
      if (!res.render) return;
      await navigator.clipboard.writeText(String(res.render));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function handleShare() {
    try {
      const shareData = {
        title: meta.title,
        text: res.render ? `Resultado: ${res.render}${res.formula ? `\nFórmula: ${res.formula}` : ""}` : meta.description,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      } as ShareData;
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (res.render) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url ?? ""}`.trim());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold">{meta.title}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{meta.description}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {renderInputs(meta.slug, inputs, setInputs)}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm" htmlFor="decimals">Casas decimais</label>
        <input
          id="decimals"
          className="border rounded px-2 py-1 w-20 bg-white/5 border-zinc-300 dark:border-zinc-700"
          type="number"
          min={0}
          max={6}
          value={decimals}
          onChange={(e) => setDecimals(Number(e.target.value))}
        />
        <button
          className="px-3 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={handleSave}
          title="Salvar esta configuração no histórico"
          aria-label="Salvar no histórico"
        >
          Salvar no histórico
        </button>
        <button
          className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 disabled:opacity-50"
          onClick={handleCopy}
          disabled={!res.render}
          title="Copiar o resultado para a área de transferência"
          aria-label="Copiar resultado"
        >
          {copied ? "Copiado!" : "Copiar resultado"}
        </button>
        <button
          className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700"
          onClick={handleShare}
          title="Compartilhar o resultado"
          aria-label="Compartilhar resultado"
        >
          Compartilhar
        </button>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Resultado</h2>
        <div className="rounded-md bg-zinc-100 dark:bg-zinc-900 p-4 text-sm">
          <div>{res.render || "—"}</div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Fórmula usada</h3>
        <div className="rounded-md bg-zinc-100 dark:bg-zinc-900 p-4 text-xs font-mono">
          {res.formula || "—"}
        </div>
      </section>
    </div>
  );
}

function renderInputs(
  slug: string,
  inputs: Record<string, string>,
  setInputs: (v: Record<string, string>) => void
) {
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setInputs({ ...inputs, [k]: e.target.value });
  const pi = (k: string, label: string, hint?: string, placeholder?: string) => (
    <PercentInput
      key={k}
      name={k}
      label={label}
      hint={hint}
      placeholder={placeholder}
      value={inputs[k] || ""}
      onChange={on(k)}
    />
  );

  switch (slug) {
    case "percentage-of":
      return [pi("x", "X%", "Use 10 para 10%"), pi("y", "Y", "Valor base")];
    case "what-percent":
      return [pi("x", "X", "Parcela"), pi("y", "Y", "Total")];
    case "increase":
    case "discount":
    case "variation":
      return [pi("a", "De A"), pi("b", "Para B")];
    case "fraction":
      return [pi("parte", "Parte"), pi("total", "Total")];
    case "cumulative":
      return [pi("base", "Valor base"), pi("seq", "Percentuais (ex.: 10, -5, 2)")];
    case "reverse":
      return [pi("final", "Valor final"), pi("percent", "% aplicado", "% positivo aumenta; negativo desconta")];
    case "simple-interest":
    case "compound-interest":
      return [pi("principal", "Principal"), pi("rate", "Taxa %"), pi("periods", "Períodos")];
    case "margin-markup":
      return [pi("cost", "Custo"), pi("sale", "Venda")];
    case "converters":
      return [pi("value", "Valor")];
    case "distribution":
      return [pi("value", "Valor"), pi("seq", "Percentuais (somam 100)")];
    default:
      return null;
  }
}