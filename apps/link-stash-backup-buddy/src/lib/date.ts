// Utilitários de data puros e testáveis.

/**
 * Dias restantes até o próximo pagamento a partir de uma data ISO (yyyy-mm-dd)
 * e um intervalo em dias. Retorna também a data-alvo.
 */
export function daysUntilNext(lastPaidAt: string, intervalDays: number) {
  const next = new Date(`${lastPaidAt}T00:00:00`);
  next.setDate(next.getDate() + intervalDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((next.getTime() - today.getTime()) / 86400000);
  return { diff, nextDate: next };
}

/** Formata como "hoje", "amanhã", "há N dias" ou "em N dias". */
export function formatRelativeDays(diff: number): string {
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  if (diff === -1) return 'ontem';
  return diff > 0 ? `em ${diff} dias` : `há ${Math.abs(diff)} dias`;
}
