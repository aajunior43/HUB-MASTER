export function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(";").map(h => h.trim().replace(/"/g, ""));
  const camelMap: Record<string, string> = {
    idEntidade:"idEntidade", nomeEntidade:"nomeEntidade", idEmpenho:"idEmpenho",
    numeroEmpenho:"numeroEmpenho", anoEmpenho:"anoEmpenho", tipoEmpenho:"tipoEmpenho",
    numProcesso:"numProcesso", anoProcesso:"anoProcesso", contrato:"contrato",
    SF:"sf", modalidade:"modalidade", licitacao:"licitacao", especificacao:"especificacao",
    data:"data",
    valorEmpenhadoBruto:"valorEmpenhadoBruto", valorEmpenhadoAnulado:"valorEmpenhadoAnulado",
    valorLiquidadoBruto:"valorLiquidadoBruto", valorLiquidadoAnulado:"valorLiquidadoAnulado",
    valorBaixadoBruto:"valorBaixadoBruto", valorBaixadoAnulado:"valorBaixadoAnulado",
    valorRetidoBruto:"valorRetidoBruto", valorRetidoAnulado:"valorRetidoAnulado",
    valorPagoRestosPagarProcessados:"valorPagoRestosPagarProcessados",
    valorPagoRestosPagarNaoProcessados:"valorPagoRestosPagarNaoProcessados",
    valorPagoAnuladoRestosPagarProcessados:"valorPagoAnuladoRestosPagarProcessados",
    valorPagoAnuladoRestosPagarNaoProcessados:"valorPagoAnuladoRestosPagarNaoProcessados",
    idCredor:"idCredor", nomeCredor:"nomeCredor",
    numContaCredor:"numContaCredor", digContaCredor:"digContaCredor",
    numDespesa:"numDespesa", numPrograma:"numPrograma", numAcao:"numAcao",
    numFuncao:"numFuncao", numSubfuncao:"numSubfuncao",
    numNaturezaEmp:"numNaturezaEmp", numRecurso:"numRecurso", numNaturezaDesp:"numNaturezaDesp",
    saldoBaixado:"saldoBaixado", saldoAnulado:"saldoAnulado",
    saldoLiquidar:"saldoLiquidar", saldoPagar:"saldoPagar",
  };

  const rows: Record<string, string>[] = [];
  let i = 1;
  while (i < lines.length) {
    let line = lines[i];
    while ((line.match(/"/g) || []).length % 2 !== 0 && i + 1 < lines.length) {
      i++;
      line += "\n" + lines[i];
    }
    const cells: string[] = [];
    let inQ = false, cur = "";
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ";" && !inQ) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const key = camelMap[h] ?? h;
      row[key] = (cells[idx] ?? "").trim();
    });
    rows.push(row);
    i++;
  }
  return rows;
}
