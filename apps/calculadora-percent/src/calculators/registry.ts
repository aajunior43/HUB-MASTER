export type CalculatorMeta = {
  slug: string;
  title: string;
  description: string;
};

export const calculators: Record<string, CalculatorMeta> = {
  percentageOf: {
    slug: "percentage-of",
    title: "Quanto é X% de Y",
    description: "Calcule rapidamente um percentual de um valor.",
  },
  whatPercent: {
    slug: "what-percent",
    title: "X é que % de Y",
    description: "Descubra a porcentagem que X representa de Y.",
  },
  increase: {
    slug: "increase",
    title: "Aumento percentual",
    description: "Quanto um valor aumentou em relação ao original.",
  },
  discount: {
    slug: "discount",
    title: "Desconto percentual",
    description: "Percentual de desconto de A para B.",
  },
  variation: {
    slug: "variation",
    title: "Variação percentual",
    description: "Variação positiva ou negativa entre A e B.",
  },
  fraction: {
    slug: "fraction",
    title: "Parte/Total",
    description: "Percentual com base fracionária.",
  },
  cumulative: {
    slug: "cumulative",
    title: "Porcentagem cumulativa",
    description: "Aplicação sequencial de percentuais.",
  },
  reverse: {
    slug: "reverse",
    title: "Reversão de porcentagem",
    description: "Encontre o valor original antes do ajuste.",
  },
  simpleInterest: {
    slug: "simple-interest",
    title: "Juros simples",
    description: "Aplicação única de percentual.",
  },
  compoundInterest: {
    slug: "compound-interest",
    title: "Juros compostos",
    description: "Crescimento com períodos.",
  },
  marginMarkup: {
    slug: "margin-markup",
    title: "Margem e Markup",
    description: "Lucro, preço de custo e venda.",
  },
  converters: {
    slug: "converters",
    title: "Conversores %",
    description: "% ↔ Fração ↔ Decimal.",
  },
  distribution: {
    slug: "distribution",
    title: "Distribuição percentual",
    description: "Divida um valor em percentuais.",
  },
};