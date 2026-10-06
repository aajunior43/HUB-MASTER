// Helpers compartilhados entre Empenhos.tsx e CredoresFixos.tsx.
// Mantém formatação BRL, parser brasileiro, e listas de meses/departamentos
// em um único lugar para evitar drift entre os dois módulos de empenho.

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;
export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;

export const DEPARTAMENTOS = ["Administração", "Saúde", "Educação", "Assistência Social"] as const;

// Formata número para moeda BRL. Retorna "R$ 0,00" para null/undefined/0-falsy.
export function moeda(v: number | null | undefined): string {
  if (!v) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Apelido curto usado em CredoresFixos.
export const brl = moeda;

// Parser brasileiro robusto ("1.234,56" → 1234.56). Rejeita negativos e
// notação científica porque valores de empenho são sempre >= 0. Retorna 0
// para entradas vazias/inválidas.
export function parseBR(v: unknown): number {
  if (v == null || v === "" || v === "0,00") return 0;
  const raw = String(v).trim();
  if (/^-/.test(raw) || /[eE]/.test(raw)) return 0;
  const s = raw.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Formata data no formato dd/mm/aaaa. Aceita dd/mm/aaaa (CSV de empenhos)
// e ISO aaaa-mm-dd[THH:MM:SS] (timestamps do SQLite).
export function fmtData(d: string): string {
  if (!d) return "—";
  const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return d.slice(0, 10);
}

// Tipos compartilhados entre dashboard/tabela/detalhe.
export interface TotaisEmpenhos {
  total_registros: number;
  total_empenhado: number;
  total_liquidado: number;
  total_pago: number;
  total_saldo_pagar: number;
}

export interface EmpenhoRow {
  id: string;
  numero_empenho: string;
  ano_empenho: number;
  data: string;
  nome_credor: string;
  modalidade: string;
  especificacao: string;
  num_natureza_desp: string;
  valor_empenhado_bruto: number;
  valor_liquidado_bruto: number;
  valor_baixado_bruto: number;
  saldo_pagar: number;
}

export interface EmpenhoMensal {
  id: string;
  credor_id: string;
  ano: number;
  mes: number;
  status: "pendente" | "empenhado";
  valor: number | null;
  numero_empenho: string | null;
  observacao: string | null;
  empenhado_em: string | null;
}

// Constantes corporativas — centralizadas para evitar drift.
export const ORGAO = "Prefeitura Municipal de Inajá";