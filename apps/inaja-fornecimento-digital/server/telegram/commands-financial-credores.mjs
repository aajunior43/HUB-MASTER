import { bold, code, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import { trustedTelegramRpc } from "./interactions.mjs";
import { back, confirmMutation, fmtMoney, pageButtons, promptInput, semModulo, slicePage, splitPipe, temModulo, trustedQuery } from "./commands-data-common.mjs";

function cleanId(raw, prefix) {
  return String(raw || "").slice(prefix.length);
}

function parseBR(value) {
  const raw = String(value || "").trim();
  if (!raw) return Number.NaN;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  return Number(normalized);
}

async function listCredores(ctx) {
  return trustedQuery(ctx, "credores-fixos", {
    table: "credores_fixos",
    action: "select",
    select: "id,nome,documento,departamento,valor_mensal,descricao,email,tipo_valor,solicitacao,pagamento,obs",
    order: [{ column: "nome", ascending: true }],
    limit: 100,
  });
}

async function getCredor(ctx, id) {
  const result = await trustedQuery(ctx, "credores-fixos", {
    table: "credores_fixos",
    action: "select",
    select: "id,nome,documento,departamento,valor_mensal,descricao,email,tipo_valor,solicitacao,pagamento,obs",
    filters: [{ column: "id", value: id }],
    limit: 1,
  });
  return result.error ? result : { data: result.data?.[0] || null, error: null };
}

export async function cmdCredoresFixos(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "credores-fixos")) return semModulo("credores-fixos");
  const result = await listCredores(ctx);
  if (result.error) return { text: escHtml(result.error.message), edit: Boolean(ctx.callbackId) };
  const paged = slicePage(result.data || [], page);
  const lines = paged.rows.length
    ? paged.rows.map((row) => `- ${escHtml(row.nome)} - ${code(fmtMoney(row.valor_mensal))} - ${escHtml(row.departamento || "-")}`).join("\n")
    : "Nenhum credor fixo cadastrado.";
  const keyboard = paged.rows.map((row) => [{ text: truncate(row.nome, 32), data: `tg4:fin:cred:detail:${row.id}` }]);
  const pages = pageButtons(ctx, "fincred", paged.page, paged.totalPages);
  if (pages.length) keyboard.push(pages);
  keyboard.push([back("menu:financeiro")]);
  return { text: truncate(`${bold("Credores fixos")} ${code(`${paged.page}/${paged.totalPages}`)}\n\n${lines}`), edit: Boolean(ctx.callbackId), reply_markup: inlineKeyboard(keyboard) };
}

async function cmdCredorDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "credores-fixos")) return semModulo("credores-fixos");
  const result = await getCredor(ctx, id);
  if (result.error) return { text: escHtml(result.error.message), edit: Boolean(ctx.callbackId) };
  const row = result.data;
  if (!row) return { text: "Credor fixo nao encontrado.", edit: Boolean(ctx.callbackId), reply_markup: inlineKeyboard([[back("menu:credores")]]) };
  const now = new Date();
  return {
    text: truncate(`${bold("Credor fixo")}\n\nNome: ${escHtml(row.nome)}\nDocumento: ${escHtml(row.documento || "-")}\nDepartamento: ${escHtml(row.departamento || "-")}\nValor mensal: ${code(fmtMoney(row.valor_mensal))}\nDescricao: ${escHtml(row.descricao || "-")}\nPagamento: ${escHtml(row.pagamento || "-")}\nObs: ${escHtml(row.obs || "-")}`),
    edit: Boolean(ctx.callbackId),
    reply_markup: inlineKeyboard([[{ text: "Atualizar mes", data: `tg4:fin:cred:update:${row.id}:${now.getFullYear()}:${now.getMonth() + 1}` }], [back("menu:credores")]]),
  };
}

function parseTarget(data, prefix) {
  const [credorId = "", anoRaw = "", mesRaw = ""] = cleanId(data, prefix).split(":");
  const ano = Number.parseInt(anoRaw, 10);
  const mes = Number.parseInt(mesRaw, 10);
  return credorId && Number.isInteger(ano) && Number.isInteger(mes) && mes >= 1 && mes <= 12 ? { credorId, ano, mes } : null;
}

function parseMensal(raw) {
  const [statusRaw = "", valorRaw = "", numeroEmpenhoRaw = "", observacaoRaw = ""] = splitPipe(raw);
  const status = statusRaw.toLowerCase();
  const valor = parseBR(valorRaw);
  const numeroEmpenho = numeroEmpenhoRaw.trim();
  const observacao = observacaoRaw.trim();
  return ["pendente", "empenhado"].includes(status) && Number.isFinite(valor) && valor >= 0 && numeroEmpenho.length <= 80 && observacao.length <= 500
    ? { status, valor, numeroEmpenho, observacao }
    : null;
}

export function handleCredorInput(ctx, input) {
  const kind = String(input.kind || "");
  if (!kind.startsWith("tg4_fin_cred_update:")) return null;
  if (!temModulo(ctx, "credores-fixos")) return semModulo("credores-fixos");
  const target = parseTarget(kind, "tg4_fin_cred_update:");
  const payload = parseMensal(input.value);
  if (!target || !payload) return { text: "Entrada invalida. Use: status pendente/empenhado | valor | numero do empenho | observacao" };
  return confirmMutation(ctx, { op: "credor_mensal_update", moduleId: "credores-fixos", id: target.credorId, payload: { ...payload, ano: target.ano, mes: target.mes } }, `Confirmar atualizacao do empenho mensal ${code(`${target.mes}/${target.ano}`)}?`);
}

export async function handleCredorCallback(ctx, data) {
  if (data.startsWith("tg4:fin:cred:update:")) {
    const target = parseTarget(data, "tg4:fin:cred:update:");
    if (!target) return { text: "Competencia invalida.", edit: Boolean(ctx.callbackId) };
    return promptInput(ctx, `tg4_fin_cred_update:${target.credorId}:${target.ano}:${target.mes}`, "Envie: status pendente/empenhado | valor | numero do empenho | observacao", "credores-fixos");
  }
  if (data.startsWith("tg4:fin:cred:detail:")) return cmdCredorDetalhe(ctx, cleanId(data, "tg4:fin:cred:detail:"));
  if (data.startsWith("tg4:fin:c:")) return cmdCredorDetalhe(ctx, cleanId(data, "tg4:fin:c:"));
  if (data.startsWith("tg4:fin:cred:") || data.startsWith("tg4:fin:u:")) return cmdCredoresFixos(ctx);
  return null;
}

export async function executeCredorMutation(ctx, payload) {
  if (payload.op !== "credor_mensal_update") return null;
  const result = await trustedTelegramRpc(ctx, "telegram_credor_mensal_atualizar", {
    _credor_id: payload.id, _ano: payload.payload.ano, _mes: payload.payload.mes, _status: payload.payload.status, _valor: payload.payload.valor, _numero_empenho: payload.payload.numeroEmpenho, _observacao: payload.payload.observacao,
  }, { moduleId: "credores-fixos" });
  if (result.error) return { text: escHtml(result.error.message), edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  return { text: `Empenho mensal atualizado.\nStatus: ${escHtml(payload.payload.status)}\nValor: ${code(fmtMoney(payload.payload.valor))}`, edit: true, reply_markup: inlineKeyboard([[{ text: "Credores fixos", data: "menu:credores" }]]), skipLog: true };
}
