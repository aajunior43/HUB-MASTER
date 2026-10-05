import { consultarTransparenciaCnpj, chavePortalTransparencia } from "./transparencia.mjs";

function digitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function cnpjValido(cnpj) {
  const valor = digitos(cnpj);
  if (valor.length !== 14 || valor === valor[0].repeat(14)) return false;
  const numeros = [...valor].map(Number);
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const resto1 = numeros.slice(0, 12).reduce((total, numero, indice) => total + numero * pesos1[indice], 0) % 11;
  if (numeros[12] !== (resto1 < 2 ? 0 : 11 - resto1)) return false;
  const resto2 = numeros.slice(0, 13).reduce((total, numero, indice) => total + numero * pesos2[indice], 0) % 11;
  return numeros[13] === (resto2 < 2 ? 0 : 11 - resto2);
}

function formatarCnpj(cnpj) {
  const v = digitos(cnpj);
  return v.length === 14 ? `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}` : cnpj;
}

export async function obterDossieFornecedor(db, cnpj, opcoes = {}) {
  const cnpjLimpo = digitos(cnpj);
  if (!cnpjValido(cnpjLimpo)) {
    throw new Error("CNPJ inválido");
  }

  const apiKey = opcoes.apiKey !== undefined ? opcoes.apiKey : chavePortalTransparencia(db);
  const transparencia = await consultarTransparenciaCnpj(cnpjLimpo, {
    apiKey,
    fetchImpl: opcoes.fetchImpl,
    semCache: opcoes.semCache,
  });

  const pncpStmt = db.prepare(`
    SELECT id, tipo, chave_pncp, titulo, objeto, numero, ano, processo, modalidade, situacao, valor,
           fornecedor_nome, data_publicacao, vigencia_inicio, vigencia_fim, url
    FROM pncp_registros
    WHERE fornecedor_cnpj = ?
    ORDER BY date(data_publicacao) DESC, ano DESC, id DESC
    LIMIT 50
  `);
  const pncpRegistros = pncpStmt.all(cnpjLimpo);

  const pncpTotalStmt = db.prepare(`
    SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total
    FROM pncp_registros
    WHERE fornecedor_cnpj = ?
  `);
  const pncpTotais = pncpTotalStmt.get(cnpjLimpo) || { total: 0, valor_total: 0 };

  const credorFixoStmt = db.prepare(`
    SELECT id, nome, documento, departamento, valor_mensal, tipo_valor, descricao, email, solicitacao, pagamento, obs
    FROM credores_fixos
    WHERE replace(replace(replace(replace(documento, '.', ''), '/', ''), '-', ''), ' ', '') = ?
    LIMIT 1
  `);
  const credorFixo = credorFixoStmt.get(cnpjLimpo) || null;

  const nomesParaBusca = new Set();
  if (credorFixo?.nome) nomesParaBusca.add(credorFixo.nome.trim());
  if (transparencia?.tcu?.consolidada?.razaoSocial) nomesParaBusca.add(transparencia.tcu.consolidada.razaoSocial.trim());
  if (transparencia?.tcu?.consolidada?.nomeFantasia) nomesParaBusca.add(transparencia.tcu.consolidada.nomeFantasia.trim());
  if (opcoes.razaoSocial) nomesParaBusca.add(String(opcoes.razaoSocial).trim());
  if (opcoes.nomeFantasia) nomesParaBusca.add(String(opcoes.nomeFantasia).trim());

  let empenhosCond = "replace(replace(replace(replace(id_credor, '.', ''), '/', ''), '-', ''), ' ', '') = ?";
  const empenhosParams = [cnpjLimpo];

  if (nomesParaBusca.size > 0) {
    const nomesFiltro = Array.from(nomesParaBusca).filter(n => n.length >= 3);
    for (const n of nomesFiltro) {
      empenhosCond += " OR UPPER(nome_credor) LIKE UPPER(?)";
      empenhosParams.push(`%${n}%`);
    }
  }

  const empResumoSql = `
    SELECT
      COUNT(*) AS total_empenhos,
      COALESCE(SUM(valor_empenhado_bruto - valor_empenhado_anulado), 0) AS total_empenhado,
      COALESCE(SUM(valor_liquidado_bruto - valor_liquidado_anulado), 0) AS total_liquidado,
      COALESCE(SUM(valor_pago_restos_proc + valor_pago_restos_nao_proc + valor_baixado_bruto - valor_baixado_anulado), 0) AS total_pago,
      COALESCE(SUM(saldo_pagar), 0) AS saldo_pagar,
      MAX(ano_empenho) AS ultimo_ano,
      MIN(ano_empenho) AS primeiro_ano
    FROM empenhos_orcamentarios
    WHERE ${empenhosCond}
  `;
  const resumoEmpenhos = db.prepare(empResumoSql).get(...empenhosParams) || {
    total_empenhos: 0,
    total_empenhado: 0,
    total_liquidado: 0,
    total_pago: 0,
    saldo_pagar: 0,
    ultimo_ano: null,
    primeiro_ano: null,
  };

  const ultimosEmpenhosSql = `
    SELECT id, numero_empenho, ano_empenho, tipo_empenho, modalidade, data,
           especificacao, valor_empenhado_bruto, valor_liquidado_bruto, saldo_pagar,
           nome_credor, id_credor
    FROM empenhos_orcamentarios
    WHERE ${empenhosCond}
    ORDER BY ano_empenho DESC, date(data) DESC, id DESC
    LIMIT 15
  `;
  const ultimosEmpenhos = db.prepare(ultimosEmpenhosSql).all(...empenhosParams);

  const anosSql = `
    SELECT DISTINCT ano_empenho
    FROM empenhos_orcamentarios
    WHERE ${empenhosCond} AND ano_empenho > 0
    ORDER BY ano_empenho DESC
  `;
  const anosEmpenhos = db.prepare(anosSql).all(...empenhosParams).map(r => r.ano_empenho);

  const pontosAtencao = [];
  const pontosPositivos = [];

  const temInidoneo = transparencia?.tcu?.inidoneos?.length > 0;
  const temCeisCnep = (transparencia?.portal?.ceis?.length || 0) + (transparencia?.portal?.cnep?.length || 0) > 0;
  const certidoesComProblema = transparencia?.resumo?.certidoesComOcorrencia || 0;

  if (temInidoneo) {
    pontosAtencao.push(`Inidôneo no TCU: constam ${transparencia.tcu.inidoneos.length} registros impeditivos.`);
  }
  if (temCeisCnep) {
    pontosAtencao.push(`Sanções vigentes: constam registros no CEIS/CNEP do Portal da Transparência.`);
  }
  if (certidoesComProblema > 0) {
    pontosAtencao.push(`Certidões com ressalva: ${certidoesComProblema} certidão(ões) do TCU indicam ocorrências.`);
  }

  if (!temInidoneo && !temCeisCnep && certidoesComProblema === 0 && transparencia.tcu.disponivel) {
    pontosPositivos.push("Sem sanções ou inidoneidades no TCU e no Portal da Transparência.");
  }

  if (pncpTotais.total > 0) {
    pontosPositivos.push(`Histórico no PNCP: ${pncpTotais.total} contratação(ões) / ata(s) registradas.`);
  }

  if (resumoEmpenhos.total_empenhos > 0) {
    pontosPositivos.push(`Fornecedor ativo em Inajá: ${resumoEmpenhos.total_empenhos} empenho(s) localizados (${anosEmpenhos.join(", ")}).`);
  } else {
    pontosAtencao.push("Sem histórico prévio de empenhos no município de Inajá.");
  }

  if (credorFixo) {
    pontosPositivos.push(`Cadastrado como Credor Fixo no departamento ${credorFixo.departamento}.`);
  }

  let nivelRisco = "BAIXO";
  let statusTexto = "Regular";
  if (temInidoneo || temCeisCnep) {
    nivelRisco = "ALTO";
    statusTexto = "Inidôneo / Impedido";
  } else if (certidoesComProblema > 0 || !transparencia.portal.configurado) {
    nivelRisco = "MEDIO";
    statusTexto = "Atenção necessária";
  }

  const linksUteisCertidoes = {
    cndt: `https://cndt-certidao.tst.jus.br/inicio.faces`,
    fgts: `https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf`,
    cndFederal: `https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir`,
    cnjImprobidade: `https://www.cnj.jus.br/improbidade_adm/consultar_requerido.php`,
  };

  return {
    cnpj: cnpjLimpo,
    cnpjFormatado: formatarCnpj(cnpjLimpo),
    geradoEm: new Date().toISOString(),
    diagnostico: {
      nivelRisco,
      status: statusTexto,
      apto: nivelRisco !== "ALTO",
      pontosAtencao,
      pontosPositivos,
    },
    linksUteisCertidoes,
    transparencia,
    pncp: {
      total: Number(pncpTotais.total || 0),
      valorTotal: Number(pncpTotais.valor_total || 0),
      registros: pncpRegistros,
    },
    municipio: {
      totalEmpenhos: Number(resumoEmpenhos.total_empenhos || 0),
      totalEmpenhado: Number(resumoEmpenhos.total_empenhado || 0),
      totalLiquidado: Number(resumoEmpenhos.total_liquidado || 0),
      totalPago: Number(resumoEmpenhos.total_pago || 0),
      saldoPagar: Number(resumoEmpenhos.saldo_pagar || 0),
      primeiroAno: resumoEmpenhos.primeiro_ano,
      ultimoAno: resumoEmpenhos.ultimo_ano,
      anos: anosEmpenhos,
      ultimosEmpenhos,
      credorFixo,
    },
  };
}
