export function normalizarTelefoneAutentique(valor: string): string | null {
  const original = String(valor || "").trim();
  if (!original) return null;
  const internacional = original.startsWith("+") || original.startsWith("00");
  let digits = original.replace(/\D/g, "");
  if (original.startsWith("00")) digits = digits.slice(2);
  if (!internacional && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  else if (!internacional) return null;
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return `+${digits}`;
}
