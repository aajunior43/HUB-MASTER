export const ISS_ALIQUOTA = 0.05;

function arredondarCentavos(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularIss(valor: number) {
  const base = arredondarCentavos(Number.isFinite(valor) ? Math.max(valor, 0) : 0);
  const desconto = arredondarCentavos(base * ISS_ALIQUOTA);
  const liquido = arredondarCentavos(base - desconto);

  return { base, desconto, liquido };
}
