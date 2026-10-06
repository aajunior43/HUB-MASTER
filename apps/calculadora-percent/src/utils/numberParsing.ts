export function parseNumber(input: string): number | null {
  if (typeof input !== "string") return null;
  const normalized = input
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    // Permite dígitos, ponto, sinais +/-, e/E para notação científica
    .replace(/[^\d.+eE-]/g, "");
  if (normalized.trim() === "") return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function formatNumber(value: number, decimals = 2, locale = "pt-BR"): string {
  const d = Math.min(6, Math.max(0, Math.floor(decimals)));
  return new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(value);
}

export function formatPercent(value: number, decimals = 2, locale = "pt-BR"): string {
  const d = Math.min(6, Math.max(0, Math.floor(decimals)));
  return new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: d, maximumFractionDigits: d }).format(value / 100);
}