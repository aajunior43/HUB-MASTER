import type { DossieFornecedorData } from "@/types/dossie";

function formatarMoeda(valor: number): string {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function exportarDossieExcel(dados: DossieFornecedorData): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const wb = XLSX.utils.book_new();

  const resumo = [
    { Campo: "CNPJ", Valor: dados.cnpjFormatado },
    { Campo: "Razão Social", Valor: dados.cadastral?.razao_social || dados.transparencia.tcu.consolidada?.razaoSocial || "" },
    { Campo: "Nome Fantasia", Valor: dados.cadastral?.nome_fantasia || "" },
    { Campo: "Classificação de Risco", Valor: `Risco ${dados.diagnostico.nivelRisco} - ${dados.diagnostico.status}` },
    { Campo: "Apto para Contratação/Pagamento", Valor: dados.diagnostico.apto ? "SIM" : "NÃO" },
    { Campo: "Data de Geração", Valor: new Date(dados.geradoEm).toLocaleString("pt-BR") },
    { Campo: "Inidôneo no TCU", Valor: dados.transparencia.tcu.inidoneos.length > 0 ? "SIM" : "NÃO" },
    { Campo: "Sanções no CEIS/CNEP", Valor: dados.transparencia.portal.ceis.length + dados.transparencia.portal.cnep.length },
    { Campo: "Total Contratações PNCP", Valor: dados.pncp.total },
    { Campo: "Valor Total PNCP", Valor: formatarMoeda(dados.pncp.valorTotal) },
    { Campo: "Total Empenhos Inajá", Valor: dados.municipio.totalEmpenhos },
    { Campo: "Total Empenhado Inajá", Valor: formatarMoeda(dados.municipio.totalEmpenhado) },
    { Campo: "Total Liquidado Inajá", Valor: formatarMoeda(dados.municipio.totalLiquidado) },
    { Campo: "Total Pago Inajá", Valor: formatarMoeda(dados.municipio.totalPago) },
    { Campo: "Saldo a Pagar Inajá", Valor: formatarMoeda(dados.municipio.saldoPagar) },
    { Campo: "Credor Fixo", Valor: dados.municipio.credorFixo ? `SIM (${dados.municipio.credorFixo.departamento})` : "NÃO" },
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  if (dados.cadastral) {
    const cad = [
      { Propriedade: "CNPJ", Valor: dados.cadastral.cnpj },
      { Propriedade: "Razão Social", Valor: dados.cadastral.razao_social },
      { Propriedade: "Nome Fantasia", Valor: dados.cadastral.nome_fantasia },
      { Propriedade: "Situação Cadastral", Valor: dados.cadastral.situacao },
      { Propriedade: "Data da Situação", Valor: dados.cadastral.data_situacao },
      { Propriedade: "Data de Abertura", Valor: dados.cadastral.data_abertura },
      { Propriedade: "Natureza Jurídica", Valor: dados.cadastral.natureza_juridica },
      { Propriedade: "Porte", Valor: dados.cadastral.porte },
      { Propriedade: "Capital Social", Valor: dados.cadastral.capital_social },
      { Propriedade: "Simples Nacional", Valor: dados.cadastral.simples },
      { Propriedade: "MEI", Valor: dados.cadastral.mei },
      { Propriedade: "Matriz/Filial", Valor: dados.cadastral.matriz },
      { Propriedade: "Endereço", Valor: dados.cadastral.endereco },
      { Propriedade: "CNAE Principal", Valor: dados.cadastral.cnae_principal },
      { Propriedade: "Telefones", Valor: dados.cadastral.telefones?.join(", ") || "" },
      { Propriedade: "E-mails", Valor: dados.cadastral.emails?.join(", ") || "" },
      { Propriedade: "Sócios", Valor: dados.cadastral.socios?.map(s => `${s.nome} (${s.qualificacao})`).join("; ") || "" },
    ];
    const wsCad = XLSX.utils.json_to_sheet(cad);
    XLSX.utils.book_append_sheet(wb, wsCad, "Dados Cadastrais");
  }

  const sancoes: Record<string, string | number>[] = [];
  for (const inid of dados.transparencia.tcu.inidoneos) {
    sancoes.push({
      Fonte: "TCU - Inidôneo",
      Cadastro: "Licitante Inidôneo",
      Processo: inid.processo,
      Acórdão: inid.acordo,
      "Fim Sanção": inid.fimSancao,
      Município: inid.municipio ? `${inid.municipio}/${inid.uf}` : "",
      "Órgão Sancionador": "Tribunal de Contas da União",
    });
  }
  for (const item of [...dados.transparencia.portal.ceis, ...dados.transparencia.portal.cnep]) {
    sancoes.push({
      Fonte: "Portal da Transparência",
      Cadastro: item.cadastro,
      Processo: item.processo,
      Tipo: item.tipo,
      "Início Vigência": item.dataInicio,
      "Fim Sanção": item.dataFim,
      "Órgão Sancionador": item.orgaoSancionador,
      Fundamentação: item.fundamentacao,
    });
  }
  const wsSancoes = XLSX.utils.json_to_sheet(sancoes.length ? sancoes : [{ Fonte: "Nenhuma sanção encontrada nas fontes consultadas" }]);
  XLSX.utils.book_append_sheet(wb, wsSancoes, "Sanções e TCU");

  const pncpRows = dados.pncp.registros.map(r => ({
    "Número / Ano": `${r.numero || r.chave_pncp}/${r.ano || "—"}`,
    Tipo: r.tipo,
    Modalidade: r.modalidade || "—",
    Situação: r.situacao || "—",
    Objeto: r.objeto || r.titulo || "—",
    "Valor (R$)": Number(r.valor) || 0,
    "Data Publicação": r.data_publicacao || "—",
    "Início Vigência": r.vigencia_inicio || "—",
    "Fim Vigência": r.vigencia_fim || "—",
    "Chave PNCP": r.chave_pncp,
    Link: r.url || "",
  }));
  const wsPncp = XLSX.utils.json_to_sheet(pncpRows.length ? pncpRows : [{ Resultado: "Nenhum registro do PNCP vinculado" }]);
  XLSX.utils.book_append_sheet(wb, wsPncp, "Contratações PNCP");

  const empRows = dados.municipio.ultimosEmpenhos.map(e => ({
    "Número Empenho": e.numero_empenho,
    Ano: e.ano_empenho,
    Tipo: e.tipo_empenho,
    Modalidade: e.modalidade,
    Data: e.data,
    Especificação: e.especificacao,
    "Valor Empenhado": Number(e.valor_empenhado_bruto) || 0,
    "Valor Liquidado": Number(e.valor_liquidado_bruto) || 0,
    "Saldo a Pagar": Number(e.saldo_pagar) || 0,
    Credor: e.nome_credor,
  }));
  const wsEmp = XLSX.utils.json_to_sheet(empRows.length ? empRows : [{ Resultado: "Nenhum empenho registrado em Inajá" }]);
  XLSX.utils.book_append_sheet(wb, wsEmp, "Empenhos Inajá");

  XLSX.writeFile(wb, `dossie-fornecedor-${dados.cnpj}.xlsx`);
}
