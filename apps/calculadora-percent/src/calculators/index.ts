/**
 * Quanto é X% de Y: (X/100) * Y
 */
export function percentageOf(xPercent: number, y: number) {
  const result = (xPercent / 100) * y;
  const formula = `${xPercent}/100 × ${y}`;
  return { result, formula, label: "Quanto é X% de Y" } as const;
}

/**
 * X é que porcentagem de Y: (X/Y) * 100
 */
export function whatPercent(x: number, y: number) {
  if (y === 0) return { result: NaN, formula: `${x}/0 × 100`, label: "X é que % de Y" } as const;
  const result = (x / y) * 100;
  const formula = `${x}/${y} × 100`;
  return { result, formula, label: "X é que % de Y" } as const;
}

/**
 * Aumento percentual de A para B: ((B-A)/A) * 100
 */
export function increasePercent(a: number, b: number) {
  if (a === 0) return { result: NaN, formula: `(${b}-${a})/${a} × 100`, label: "Aumento percentual" } as const;
  const result = ((b - a) / a) * 100;
  const formula = `(${b}-${a})/${a} × 100`;
  return { result, formula, label: "Aumento percentual" } as const;
}

/**
 * Desconto percentual de A para B: ((A-B)/A) * 100
 */
export function discountPercent(a: number, b: number) {
  if (a === 0) return { result: NaN, formula: `(${a}-${b})/${a} × 100`, label: "Desconto percentual" } as const;
  const result = ((a - b) / a) * 100;
  const formula = `(${a}-${b})/${a} × 100`;
  return { result, formula, label: "Desconto percentual" } as const;
}

/**
 * Variação percentual: ((B-A)/A) * 100 (positiva/negativa)
 */
export function variationPercent(a: number, b: number) {
  return increasePercent(a, b);
}

/**
 * Porcentagem fracionária: (parte/total) * 100
 */
export function fractionToPercent(parte: number, total: number) {
  if (total === 0) return { result: NaN, formula: `${parte}/0 × 100`, label: "Parte de Total" } as const;
  const result = (parte / total) * 100;
  const formula = `${parte}/${total} × 100`;
  return { result, formula, label: "Parte de Total" } as const;
}

/**
 * Porcentagem cumulativa: aplica sequência de percentuais sobre o valor
 * Ex.: base=100, [10,-5] => 100 * 1.10 * 0.95
 */
export function cumulativePercent(base: number, percentages: number[]) {
  const factors = percentages.map((p) => 1 + p / 100);
  const result = factors.reduce((acc, f) => acc * f, base);
  const formula = `${base} × ${factors.map((f) => f.toFixed(4)).join(" × ")}`;
  return { result, formula, label: "Porcentagem cumulativa" } as const;
}

/**
 * Reversão de porcentagem: dado valor final e percentual p, valor original = final / (1 + p/100)
 * Para desconto p, p negativo.
 */
export function reversePercentage(finalValue: number, percent: number) {
  const divisor = 1 + percent / 100;
  if (divisor === 0) return { result: NaN, formula: `${finalValue}/0`, label: "Valor original" } as const;
  const result = finalValue / divisor;
  const formula = `${finalValue} / (1 + ${percent}/100)`;
  return { result, formula, label: "Valor original" } as const;
}

/**
 * Juros simples: principal * (1 + taxa% * período)
 */
export function simpleInterest(principal: number, ratePercent: number, periods: number) {
  const result = principal * (1 + (ratePercent / 100) * periods);
  const formula = `${principal} × (1 + ${ratePercent}/100 × ${periods})`;
  return { result, formula, label: "Juros simples" } as const;
}

/**
 * Juros compostos: principal * (1 + taxa%)^períodos
 */
export function compoundInterest(principal: number, ratePercent: number, periods: number) {
  const factor = 1 + ratePercent / 100;
  const result = principal * Math.pow(factor, periods);
  const formula = `${principal} × (1 + ${ratePercent}/100)^${periods}`;
  return { result, formula, label: "Juros compostos" } as const;
}

/**
 * Margem e markup:
 * margem% = (venda - custo) / venda * 100
 * markup% = (venda - custo) / custo * 100
 */
export function marginAndMarkup(cost: number, sale: number) {
  if (sale === 0) return { margin: NaN, markup: NaN, formula: `(${sale}-${cost})/${sale} ; (${sale}-${cost})/${cost}`, label: "Margem e Markup" } as const;
  const margin = ((sale - cost) / sale) * 100;
  const markup = cost === 0 ? NaN : ((sale - cost) / cost) * 100;
  const formula = `margem=(${sale}-${cost})/${sale} × 100 ; markup=(${sale}-${cost})/${cost} × 100`;
  return { margin, markup, formula, label: "Margem e Markup" } as const;
}

/** Conversores */
export function percentToDecimal(p: number) { return p / 100; }
export function decimalToPercent(d: number) { return d * 100; }
export function percentToFraction(p: number) {
  const decimal = p / 100;
  // converter decimal para fração simples
  const tolerance = 1.0e-8;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = decimal;
  do {
    const a = Math.floor(b);
    const aux = h1; h1 = a * h1 + h2; h2 = aux;
    const aux2 = k1; k1 = a * k1 + k2; k2 = aux2;
    const frac = h1 / k1;
    if (Math.abs(decimal - frac) < tolerance) break;
    b = 1 / (b - a);
  } while (true);
  return { numerator: h1, denominator: k1 } as const;
}
export function fractionToPercentConverter(numerator: number, denominator: number) {
  if (denominator === 0) return NaN;
  return (numerator / denominator) * 100;
}

/**
 * Distribuição percentual: dividir valor em percentuais que somam 100
 */
export function distribution(value: number, percents: number[]) {
  const sum = percents.reduce((a, b) => a + b, 0);
  const parts = percents.map((p) => (p / 100) * value);
  return { sum, parts, valid: Math.abs(sum - 100) < 1e-6 } as const;
}