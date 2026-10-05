import { bold, code, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import { trustedTelegramRpc } from "./interactions.mjs";
import { back, fmtMoney, semModulo, temModulo } from "./commands-data-common.mjs";

export async function cmdEmpenhos(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "empenhos")) return semModulo("empenhos");
  const r = await trustedTelegramRpc(ctx, "empenhos_stats", {}, { moduleId: "empenhos" });
  if (r.error) return { text: escHtml(r.error.message) };
  const s = r.data || {};
  return { text: `${bold("Empenhos")}\n\nTotal registros: ${code(s.total_registros ?? s.total ?? "—")}\nValor empenhado: ${code(fmtMoney(s.total_empenhado ?? s.valor_total))}\nValor liquidado: ${code(fmtMoney(s.total_liquidado))}\nValor pago: ${code(fmtMoney(s.total_pago))}` };
}

export async function cmdEmpenhoGet(ctx, args) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "empenhos")) return semModulo("empenhos");
  const id = args[0] || "";
  if (!id) return { text: "Abra Consultar empenho no menu e informe o identificador solicitado." };
  const r = await trustedTelegramRpc(ctx, "empenhos_get", { _id: id }, { moduleId: "empenhos" });
  if (r.error) return { text: escHtml(r.error.message) };
  const e = r.data;
  if (!e) return { text: "Empenho não encontrado." };
  return { text: truncate(`${bold("Empenho")} ${code(e.id || e.numero_empenho || "")}\n\nCredor: ${escHtml(e.credor || e.fornecedor || "—")}\nValor: ${code(fmtMoney(e.valor))}\nModalidade: ${escHtml(e.modalidade || "—")}\nNatureza: ${escHtml(e.natureza_despesa || "—")}\nAno: ${code(e.ano || "—")}\nStatus: ${escHtml(e.status || "—")}\nObjeto: ${escHtml(String(e.objeto || e.historico || "").slice(0, 300))}`) };
}

export async function cmdExtrato(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "extratos")) return semModulo("extratos");
  const r = await trustedTelegramRpc(ctx, "em_dashboard", { _ano: new Date().getFullYear() }, { moduleId: "extratos" });
  if (r.error) return { text: escHtml(r.error.message) };
  const d = r.data || {};
  return { text: truncate(`${bold("Dashboard financeiro")}\n\nReceitas: ${code(fmtMoney(d.total_receitas ?? d.totalReceitas ?? 0))}\nDespesas: ${code(fmtMoney(d.total_despesas ?? d.totalDespesas ?? 0))}\nSaldo: ${code(fmtMoney((d.total_receitas ?? d.totalReceitas ?? 0) - (d.total_despesas ?? d.totalDespesas ?? 0)))}\nContas: ${code(d.total_contas ?? d.totalContas ?? "—")}`) };
}

export async function cmdRpas(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "rpas")) return semModulo("rpas");
  const r = await trustedTelegramRpc(ctx, "rpas_listar", { _pagina: 1, _por_pagina: 5, _busca: "" }, { moduleId: "rpas" });
  if (r.error) return { text: escHtml(r.error.message) };
  const rows = r.data?.rows || [];
  if (!rows.length) return { text: "Nenhum RPA encontrado." };
  return { text: bold("RPAs recentes") + "\n\n" + rows.map((p) => `• ${code(p.numero_rpa || p.numero || "—")} — ${escHtml(p.nome_prestador || "—")} — ${code(fmtMoney(p.valor_bruto || p.valor || 0))}`).join("\n") };
}

export async function cmdDocumentos(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "gestao-documentos")) return semModulo("gestão de documentos");
  const r = await trustedTelegramRpc(ctx, "gd_documento_listar", { _pagina: 1, _por_pagina: 5, _busca: "", _status: "", _tipo: "" }, { moduleId: "gestao-documentos" });
  if (r.error) return { text: escHtml(r.error.message) };
  const rows = r.data?.rows || [];
  if (!rows.length) return { text: "Nenhum documento encontrado." };
  return { text: bold("Documentos recentes") + "\n\n" + rows.map((d) => `• ${code(d.protocolo || d.id || "—")} — ${escHtml(d.assunto || "—")} — ${escHtml(d.status || "—")}`).join("\n") };
}

export const RAMAIS_INAJA = [
  { local: "Recepção", ramal: "1200", numero: "4431124320" },
  { local: "Gabinete", ramal: "1201" },
  { local: "Contabilidade", ramal: "1202" },
  { local: "Geise", ramal: "1203" },
  { local: "RH", ramal: "1204" },
  { local: "Licitação", ramal: "1205" },
  { local: "Tributação", ramal: "1206" },
  { local: "Tesouraria", ramal: "1207" },
  { local: "Assistência Social", ramal: "1208" },
  { local: "Jurídico", ramal: "1209" },
  { local: "Controle Interno", ramal: "1210" },
  { local: "Frotas", ramal: "1211" },
  { local: "Hospital", ramal: "2101", numero: "4431124321" },
  { local: "Hospital", ramal: "2102" },
  { local: "Recepção — Posto", ramal: "2201", numero: "4431124322" },
  { local: "Posto 2202", ramal: "2202" },
  { local: "Atendimento Posto 2", ramal: "2203", numero: "4431124328" },
  { local: "Posto 2204", ramal: "2204" },
  { local: "ESF — Recepção", ramal: "2301", numero: "4431124323" },
  { local: "ESF 2302", ramal: "2302" },
  { local: "Secretaria de Educação", ramal: "3101", numero: "4431124325" },
  { local: "3102", ramal: "3102" },
  { local: "Recepção — CMEI", ramal: "3201", numero: "4431124326" },
  { local: "CMEI 3202", ramal: "3202" },
  { local: "Escola", ramal: "3301", numero: "4431124327" },
  { local: "Escola 3302", ramal: "3302" },
  { local: "Recepção — CRAS", ramal: "4101", numero: "4431124318" },
  { local: "CRAS 4102", ramal: "4102" },
  { local: "CREAS — Recepção", ramal: "4201", numero: "4431124319" },
  { local: "CREAS 4202", ramal: "4202" },
];

export function cmdRamais(ctx, filtro = "", page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  const termo = String(filtro || "").trim().toLowerCase();
  const filtrados = RAMAIS_INAJA.filter(
    (r) => !termo || r.local.toLowerCase().includes(termo) || r.ramal.includes(termo) || (r.numero && r.numero.includes(termo))
  );

  const porPagina = 8;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(Math.max(1, page), totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const paginados = filtrados.slice(inicio, inicio + porPagina);

  let texto = `${bold("Guia de Ramais — Prefeitura de Inajá")}`;
  if (termo) texto += ` (busca: "${escHtml(termo)}")`;
  texto += ` [${paginaAtual}/${totalPaginas}]\n\n`;

  if (paginados.length === 0) {
    texto += "Nenhum ramal ou setor encontrado com esse termo.";
  } else {
    texto += paginados
      .map((r) => `📞 ${bold(r.local)}: Ramal ${code(r.ramal)}${r.numero ? ` · Tel: ${code(r.numero)}` : ""}`)
      .join("\n");
  }

  const buttons = [];
  const navRow = [];
  if (paginaAtual > 1) {
    navRow.push({ text: "⬅️ Anterior", data: `menu:ramais:p:${paginaAtual - 1}${termo ? `:${termo}` : ""}` });
  }
  if (paginaAtual < totalPaginas) {
    navRow.push({ text: "Próxima ➡️", data: `menu:ramais:p:${paginaAtual + 1}${termo ? `:${termo}` : ""}` });
  }
  if (navRow.length) buttons.push(navRow);

  buttons.push([
    { text: "🔍 Buscar setor/ramal", data: "menu:ramais:buscar" },
    { text: "Voltar ao menu", data: "menu" },
  ]);

  return {
    text: truncate(texto),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard(buttons),
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
