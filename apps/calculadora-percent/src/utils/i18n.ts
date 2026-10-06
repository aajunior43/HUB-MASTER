export type Messages = typeof ptBR;

export const ptBR = {
  site: {
    title: "Cálculos de Porcentagem",
    description: "Calculadoras de porcentagem rápidas e precisas, com explicações claras.",
  },
  common: {
    calculate: "Calcular",
    clear: "Limpar",
    copy: "Copiar resultado",
    share: "Compartilhar",
    formula: "Fórmula usada",
    result: "Resultado",
    history: "Histórico",
    decimals: "Casas decimais",
    theme: "Tema",
    light: "Claro",
    dark: "Escuro",
  },
  home: {
    heading: "Calculadoras de Porcentagem",
    intro: "Escolha uma calculadora para começar:"
  }
};

export const enUS: Messages = {
  site: {
    title: "Percentage Calculations",
    description: "Fast and accurate percentage calculators with clear explanations.",
  },
  common: {
    calculate: "Calculate",
    clear: "Clear",
    copy: "Copy result",
    share: "Share",
    formula: "Formula used",
    result: "Result",
    history: "History",
    decimals: "Decimals",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
  },
  home: {
    heading: "Percentage Calculators",
    intro: "Choose a calculator to start:"
  }
};

export type Locale = "pt-BR" | "en-US";

export function getMessages(locale: Locale = "pt-BR"): Messages {
  return locale === "en-US" ? enUS : ptBR;
}