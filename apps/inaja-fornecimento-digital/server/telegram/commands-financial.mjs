import { bold, code, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import { trustedTelegramRpc } from "./interactions.mjs";
import { back, fmtMoney, pageButtons, semModulo, slicePage, temModulo, trustedQuery } from "./commands-data-common.mjs";
import { cmdCredoresFixos, executeCredorMutation, handleCredorCallback, handleCredorInput } from "./commands-financial-credores.mjs";

export { cmdCredoresFixos } from "./commands-financial-credores.mjs";

const CURRENT_YEAR = new Date().getFullYear();

function cleanId(raw, prefix) {
  return String(raw || "").slice(prefix.length);
}

function rowsData(result) {
  return Array.isArray(result.data?.rows) ? result.data.rows : [];
}

function totalPages(result) {
  return Math.max(1, Number(result.data?.totalPaginas) || 1);
}

function webOnly(feature, target = "menu:financeiro") {
  return {
    text: `Esta acao fica no sistema web: ${feature}. Pelo Telegram ha apenas consulta financeira.`,
    edit: true,
    reply_markup: inlineKeyboard([[back(target)]]),
  };
}

export function cmdFinanceiro(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  const rows = [];
  if (temModulo(ctx, "empenhos")) rows.push([{ text: "Empenhos", data: "menu:empenhos" }]);
  if (temModulo(ctx, "rpas")) rows.push([{ text: "RPAs", data: "menu:rpas" }]);
  if (temModulo(ctx, "extratos")) rows.push([{ text: "Extratos", data: "menu:extrato" }]);
  if (temModulo(ctx, "credores-fixos")) rows.push([{ text: "Credores fixos", data: "menu:credores" }]);
  rows.push([back()]);
  return {
    text: rows.length > 1 ? bold("Financeiro") : "Sem modulos financeiros liberados para esta conta.",
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard(rows),
  };
}


export async function cmdEmpenhos(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "empenhos")) return semModulo("empenhos");
  const stats = await trustedTelegramRpc(ctx, "empenhos_stats", {}, { moduleId: "empenhos" });
  if (stats.error) return { text: escHtml(stats.error.message) };
  const list = await trustedTelegramRpc(ctx, "empenhos_listar", { _pagina: page, _por_pagina: 5, _ordenacao: "recentes" }, { moduleId: "empenhos" });
  if (list.error) return { text: escHtml(list.error.message) };
  const totals = stats.data?.totais || stats.data || {};
  const rows = rowsData(list);
  const pages = totalPages(list);
  const lines = rows.length
    ? rows.map((row) => `- ${code(`${row.numero_empenho || "- "}/${row.ano_empenho || "- "}`)} - ${escHtml(row.nome_credor || "- ")} - ${code(fmtMoney(row.valor_empenhado_bruto))}`).join("\n")
    : "Nenhum empenho encontrado.";
  const keyboard = rows.map((row) => [{ text: truncate(`${row.numero_empenho || "-"} ${row.nome_credor || ""}`, 32), data: `tg4:fin:e:${row.id}` }]);
  const pageRow = pageButtons(ctx, "finemp", page, pages);
  if (pageRow.length) keyboard.push(pageRow);
  keyboard.push([back("menu:financeiro")]);
  return {
    text: truncate(`${bold("Empenhos")} ${code(`${page}/${pages}`)}\nRegistros: ${code(totals.total_registros ?? list.data?.total ?? 0)}\nValor empenhado: ${code(fmtMoney(totals.total_empenhado || 0))}\nSaldo a pagar: ${code(fmtMoney(totals.total_saldo_pagar || 0))}\n\n${lines}`),
    reply_markup: inlineKeyboard(keyboard),
    edit: Boolean(ctx.callbackId),
  };
}

export async function cmdEmpenhoGet(ctx, args) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "empenhos")) return semModulo("empenhos");
  const id = args[0] || "";
  if (!id) return { text: "Abra Consultar empenho no menu e informe o identificador solicitado." };
  const result = await trustedTelegramRpc(ctx, "empenhos_get", { _id: id }, { moduleId: "empenhos" });
  if (result.error) return { text: escHtml(result.error.message) };
  const row = result.data;
  if (!row) return { text: "Empenho nao encontrado.", edit: Boolean(ctx.callbackId), reply_markup: inlineKeyboard([[back("menu:empenhos")]]) };
  return {
    text: truncate(`${bold("Empenho")} ${code(row.numero_empenho || row.id || "-")}\n\nCredor: ${escHtml(row.nome_credor || "-")}\nValor empenhado: ${code(fmtMoney(row.valor_empenhado_bruto))}\nLiquidado: ${code(fmtMoney(row.valor_liquidado_bruto))}\nPago: ${code(fmtMoney(row.valor_baixado_bruto))}\nSaldo a pagar: ${code(fmtMoney(row.saldo_pagar))}\nModalidade: ${escHtml(row.modalidade || "-")}\nObjeto: ${escHtml(String(row.especificacao || "-").slice(0, 450))}`),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard([[back("menu:empenhos")]]),
  };
}

export async function cmdExtrato(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "extratos")) return semModulo("extratos");
  const dashboard = await trustedTelegramRpc(ctx, "em_dashboard", { _ano: CURRENT_YEAR }, { moduleId: "extratos" });
  if (dashboard.error) return { text: escHtml(dashboard.error.message) };
  const tx = await trustedTelegramRpc(ctx, "em_transacoes_listar", { _pagina: 1, _por_pagina: 5, _conta_id: "all" }, { moduleId: "extratos" });
  if (tx.error) return { text: escHtml(tx.error.message) };
  const data = dashboard.data || {};
  const rows = rowsData(tx);
  const lines = rows.length
    ? rows.map((row) => `- ${code(row.data)} - ${escHtml(row.descricao)} - ${code(fmtMoney(row.valor))} - ${escHtml(row.tipo)}`).join("\n")
    : "Nenhuma transacao recente.";
  const keyboard = rows.map((row) => [{ text: truncate(`${row.data || ""} ${row.descricao || ""}`, 32), data: `tg4:fin:x:${row.id}` }]);
  keyboard.push([back("menu:financeiro")]);
  return {
    text: truncate(`${bold("Extratos")} ${code(CURRENT_YEAR)}\nReceitas: ${code(fmtMoney(data.totalReceitas || 0))}\nDespesas: ${code(fmtMoney(data.totalDespesas || 0))}\nContas: ${code(data.totalContas || 0)}\nAlertas: ${code(data.alertasPendentes || 0)}\n\n${bold("Transacoes recentes")}\n${lines}`),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard(keyboard),
  };
}

async function cmdExtratoDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "extratos")) return semModulo("extratos");
  const result = await trustedTelegramRpc(ctx, "em_transacoes_listar", { _pagina: 1, _por_pagina: 5, _conta_id: "all" }, { moduleId: "extratos" });
  if (result.error) return { text: escHtml(result.error.message) };
  const row = rowsData(result).find((item) => String(item.id) === String(id));
  if (!row) return { text: "Transacao nao encontrada entre as recentes.", edit: Boolean(ctx.callbackId), reply_markup: inlineKeyboard([[back("menu:extrato")]]) };
  return {
    text: truncate(`${bold("Transacao")} ${code(row.data || "-")}\n\nDescricao: ${escHtml(row.descricao || "-")}\nTipo: ${escHtml(row.tipo || "-")}\nCategoria: ${escHtml(row.categoria || "-")}\nValor: ${code(fmtMoney(row.valor))}`),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard([[back("menu:extrato")]]),
  };
}

export async function cmdRpas(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "rpas")) return semModulo("rpas");
  const result = await trustedTelegramRpc(ctx, "rpas_listar", { _pagina: page, _por_pagina: 5, _busca: "" }, { moduleId: "rpas" });
  if (result.error) return { text: escHtml(result.error.message) };
  const rows = rowsData(result);
  const pages = totalPages(result);
  const lines = rows.length
    ? rows.map((row) => `- ${code(row.numero_rpa || "-")} - ${escHtml(row.nome_prestador || "-")} - ${code(fmtMoney(row.valor_bruto || 0))}`).join("\n")
    : "Nenhum RPA encontrado.";
  const keyboard = rows.map((row) => [{ text: truncate(`${row.numero_rpa || "-"} ${row.nome_prestador || ""}`, 32), data: `tg4:fin:r:${row.id}` }]);
  const pageRow = pageButtons(ctx, "finrpa", page, pages);
  if (pageRow.length) keyboard.push(pageRow);
  keyboard.push([back("menu:financeiro")]);
  return {
    text: truncate(`${bold("RPAs")} ${code(`${page}/${pages}`)}\n\n${lines}`),
    reply_markup: inlineKeyboard(keyboard),
    edit: Boolean(ctx.callbackId),
  };
}

async function cmdRpaDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "rpas")) return semModulo("rpas");
  const result = await trustedTelegramRpc(ctx, "telegram_rpa_get", { _id: id }, { moduleId: "rpas" });
  if (result.error) return { text: escHtml(result.error.message) };
  const row = result.data;
  if (!row) return { text: "RPA nao encontrado.", edit: Boolean(ctx.callbackId), reply_markup: inlineKeyboard([[back("menu:rpas")]]) };
  return {
    text: truncate(`${bold("RPA")} ${code(row.numero_rpa || row.id)}\n\nPrestador: ${escHtml(row.nome_prestador || "-")}\nPeriodo: ${escHtml(row.periodo_referencia || "-")}\nValor bruto: ${code(fmtMoney(row.valor_bruto))}\nValor liquido: ${code(fmtMoney(row.valor_liquido))}\nServico: ${escHtml(row.descricao_servico || "-")}`),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard([[back("menu:rpas")]]),
  };
}

async function listSolicitacoes(ctx) {
  return trustedQuery(ctx, "solicitacoes", {
    table: "solicitacoes",
    action: "select",
    select: "id,solicitante,empresa,data_solicitacao,valor_total,observacoes",
    order: [{ column: "data_solicitacao", ascending: false }],
    limit: 100,
  });
}

export async function cmdSolicitacoes(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "solicitacoes")) return semModulo("solicitacoes");
  const result = await listSolicitacoes(ctx);
  if (result.error) return { text: escHtml(result.error.message), edit: Boolean(ctx.callbackId) };
  const rows = result.data || [];
  const paged = slicePage(rows, page);
  const lines = paged.rows.length
    ? paged.rows.map((row) => `- ${code(row.data_solicitacao || "-")} - ${escHtml(row.empresa || row.solicitante || "-")} - ${code(fmtMoney(row.valor_total || 0))}`).join("\n")
    : "Nenhuma solicitacao cadastrada.";
  const pages = pageButtons(ctx, "finsol", paged.page, paged.totalPages);
  const keyboard = pages.length ? [pages, [back("menu")]] : [[back("menu")]];
  return {
    text: truncate(`${bold("Solicitacoes")} ${code(`${paged.page}/${paged.totalPages}`)}\n\n${lines}`),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard(keyboard),
  };
}

export async function cmdCnpj(ctx, args) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "cnpj")) return semModulo("CNPJ");
  const cnpj = (args[0] || "").replace(/\D/g, "");
  if (!cnpj) return { text: "Abra Consultar CNPJ no menu e informe somente os números solicitados." };
  if (cnpj.length !== 14) return { text: "CNPJ inválido. Envie um CNPJ completo com 14 dígitos." };

  const [resCnpj, resDossie] = await Promise.all([
    trustedTelegramRpc(ctx, "cnpj_buscar", { _cnpj: cnpj }, { moduleId: "cnpj" }),
    trustedTelegramRpc(ctx, "telegram_dossie_fornecedor", { _cnpj: cnpj }, { moduleId: "cnpj" }),
  ]);

  if (resCnpj.error && resDossie.error) {
    return { text: `Erro na consulta: ${escHtml(resCnpj.error.message || resDossie.error.message)}` };
  }

  const d = resCnpj.data || {};
  const dossie = resDossie.data || null;

  const razao = escHtml(d.razao_social || d.nome || dossie?.transparencia?.tcu?.consolidada?.razaoSocial || "—");
  const fantasia = escHtml(d.fantasia || dossie?.transparencia?.tcu?.consolidada?.nomeFantasia || "—");
  const situacao = escHtml(d.situacao || "—");
  const diagnostico = dossie?.diagnostico || {};
  const risco = diagnostico.nivelRisco || "NÃO AVALIADO";
  const riscoEmoji = risco === "BAIXO" ? "🟢" : risco === "MEDIO" ? "🟡" : "🔴";

  const totalEmp = dossie?.resumoEmpenhos?.total_empenhos ?? 0;
  const pagoEmp = dossie?.resumoEmpenhos?.total_pago ?? 0;
  const saldoPagar = dossie?.resumoEmpenhos?.saldo_pagar ?? 0;

  const tcuInid = dossie?.transparencia?.tcu?.inidoneos?.length ?? 0;
  const ceisCount = dossie?.transparencia?.portal?.ceis?.length ?? 0;
  const cnepCount = dossie?.transparencia?.portal?.cnep?.length ?? 0;
  const certProblemas = dossie?.transparencia?.resumo?.certidoesComOcorrencia ?? 0;

  const totalPncp = dossie?.pncp?.total ?? 0;
  const valorPncp = dossie?.pncp?.valorTotal ?? 0;

  let texto = `${bold("Dossiê Fornecedor")} ${code(cnpj)}\n\n`;
  texto += `Razão: ${razao}\n`;
  if (fantasia && fantasia !== "—") texto += `Fantasia: ${fantasia}\n`;
  texto += `Situação Receita: ${situacao}\n\n`;

  texto += `${bold("Diagnóstico de Risco")} ${riscoEmoji} ${bold(risco)}\n`;
  texto += `Status: ${escHtml(diagnostico.status || "Regular")}\n`;
  texto += `Impedimentos TCU: ${tcuInid > 0 ? `🚨 ${tcuInid} sanção(ões)` : "✅ Nada consta"}\n`;
  texto += `CEIS / CNEP: ${(ceisCount + cnepCount) > 0 ? `🚨 ${ceisCount + cnepCount} registro(s)` : "✅ Nada consta"}\n`;
  if (certProblemas > 0) texto += `Ressalvas em certidões TCU: ⚠️ ${certProblemas}\n`;

  texto += `\n${bold("Histórico na Prefeitura de Inajá")}\n`;
  if (totalEmp > 0) {
    texto += `Empenhos: ${code(totalEmp)}\nTotal Pago: ${code(fmtMoney(pagoEmp))}\nSaldo a Pagar: ${code(fmtMoney(saldoPagar))}\n`;
  } else {
    texto += `Nenhum empenho registrado para este CNPJ no município.\n`;
  }

  if (totalPncp > 0) {
    texto += `\n${bold("Contratações no PNCP")}: ${code(totalPncp)} (${code(fmtMoney(valorPncp))})\n`;
  }

  const links = dossie?.linksUteisCertidoes;
  if (links) {
    texto += `\n${bold("Certidões & Emissão Direta")}:\n`;
    texto += `• CND Federal: ${links.cndFederal}\n`;
    texto += `• CRF FGTS: ${links.fgts}\n`;
    texto += `• CNDT Trabalhista: ${links.cndt}\n`;
  }

  return {
    text: truncate(texto),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard([[back("menu")]]),
  };
}

export function handleFinancialInput(ctx, input) {
  return handleCredorInput(ctx, input);
}

export async function handleFinancialCallback(ctx, data) {
  if (data === "tg4:fin:credores:export" || data === "tg4:fin:empenhos:import" || data === "tg4:fin:empenhos:export" || data === "tg4:fin:solicitacao:create") return webOnly("importacao, exportacao, anexos e processamento em lote");
  const credorResult = await handleCredorCallback(ctx, data);
  if (credorResult) return credorResult;
  if (data.startsWith("tg4:fin:e:")) return cmdEmpenhoGet(ctx, [cleanId(data, "tg4:fin:e:")]);
  if (data.startsWith("tg4:fin:empenho:detail:")) return cmdEmpenhoGet(ctx, [cleanId(data, "tg4:fin:empenho:detail:")]);
  if (data.startsWith("tg4:fin:r:")) return cmdRpaDetalhe(ctx, cleanId(data, "tg4:fin:r:"));
  if (data.startsWith("tg4:fin:rpa:detail:")) return cmdRpaDetalhe(ctx, cleanId(data, "tg4:fin:rpa:detail:"));
  if (data.startsWith("tg4:fin:x:")) return cmdExtratoDetalhe(ctx, cleanId(data, "tg4:fin:x:"));
  return null;
}

export async function executeFinancialMutation(ctx, payload) {
  return executeCredorMutation(ctx, payload);
}
