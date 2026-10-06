import { bold, code, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import { trustedTelegramRpc } from "./interactions.mjs";
import { PAGE_SIZE, back, confirmMutation, parsePrazo, pageButtons, promptInput, semModulo, temModulo } from "./commands-data-common.mjs";

export async function cmdPrazos(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "prazos")) return semModulo("prazos");
  const r = await trustedTelegramRpc(ctx, "prazos_listar", { _pagina: page, _por_pagina: PAGE_SIZE, _resolvido: 0 }, { moduleId: "prazos" });
  if (r.error) return { text: escHtml(r.error.message) };
  const rows = r.data?.rows || [];
  const totalPages = Math.max(1, r.data?.totalPaginas || 1);
  const keyboard = [[{ text: "Novo prazo", data: "tg4:prazo:create" }]];
  for (const p of rows) keyboard.push([{ text: truncate(p.titulo, 32), data: `tg4:prazo:detail:${p.id}` }]);
  const pages = pageButtons(ctx, "prazos", page, totalPages);
  if (pages.length) keyboard.push(pages);
  keyboard.push([back()]);
  if (!rows.length) return { text: `${bold("Prazos pendentes")}\n\nNenhum prazo pendente.`, reply_markup: inlineKeyboard(keyboard), edit: Boolean(ctx.callbackId) };
  return {
    text: `${bold("Prazos pendentes")} ${code(`${page}/${totalPages}`)}\n\n${rows.map((p) => `• ${escHtml(p.titulo)} — ${code(p.data_limite?.slice?.(0, 10) || p.data_limite)}`).join("\n")}`,
    reply_markup: inlineKeyboard(keyboard),
    edit: Boolean(ctx.callbackId),
  };
}

async function getPrazo(ctx, id) {
  const r = await trustedTelegramRpc(ctx, "prazos_listar", { _pagina: 1, _por_pagina: 500 }, { moduleId: "prazos" });
  if (r.error) return r;
  return { data: (r.data?.rows || []).find((p) => p.id === id) || null, error: null };
}

async function cmdPrazoDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "prazos")) return semModulo("prazos");
  const r = await getPrazo(ctx, id);
  if (r.error) return { text: escHtml(r.error.message) };
  if (!r.data) return { text: "Prazo não encontrado.", edit: Boolean(ctx.callbackId) };
  const p = r.data;
  return {
    text: truncate(`${bold("Prazo")}\n\nTítulo: ${escHtml(p.titulo)}\nData: ${code(p.data_limite)}\nCategoria: ${escHtml(p.categoria || "geral")}\nResolvido: ${p.resolvido ? "sim" : "não"}\nDescrição: ${escHtml(p.descricao || "—")}`),
    reply_markup: inlineKeyboard([
      [{ text: "Atualizar", data: `tg4:prazo:update:${id}` }, { text: p.resolvido ? "Reabrir" : "Resolver", data: `tg4:prazo:resolve:${id}` }],
      [back("menu:prazos")],
    ]),
    edit: Boolean(ctx.callbackId),
  };
}

export async function cmdPrazosResumo(ctx) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "prazos")) return semModulo("prazos");
  const r = await trustedTelegramRpc(ctx, "prazos_resumo", {}, { moduleId: "prazos" });
  if (r.error) return { text: escHtml(r.error.message) };
  const s = r.data || {};
  return { text: `${bold("Resumo de prazos")}\n\nVencidos: ${code(s.vencidos ?? "0")}\nUrgentes (7d): ${code(s.urgentes ?? "0")}\nAtenção (30d): ${code(s.atencao ?? "0")}\nOK (fora): ${code(s.ok ?? "0")}` };
}

export function handlePrazoInput(ctx, input) {
  const kind = String(input.kind);
  const raw = input.value;
  if (kind === "tg4_prazo_create") {
    if (!temModulo(ctx, "prazos")) return semModulo("prazos");
    const payload = parsePrazo(raw);
    if (!payload) return { text: "Entrada inválida. Use: título | descrição | data YYYY-MM-DD | categoria" };
    return confirmMutation(ctx, { op: "prazo_create", moduleId: "prazos", payload }, `Confirmar criação do prazo ${bold(payload.titulo)}?`);
  }
  if (!kind.startsWith("tg4_prazo_update:")) return null;
  if (!temModulo(ctx, "prazos")) return semModulo("prazos");
  const payload = parsePrazo(raw);
  if (!payload) return { text: "Entrada inválida. Use: título | descrição | data YYYY-MM-DD | categoria" };
  return confirmMutation(ctx, { op: "prazo_update", moduleId: "prazos", id: kind.slice("tg4_prazo_update:".length), payload }, "Confirmar atualização do prazo?");
}

export async function handlePrazoCallback(ctx, data) {
  if (data === "tg4:prazo:create") return promptInput(ctx, "tg4_prazo_create", "Envie: título | descrição | data YYYY-MM-DD | categoria", "prazos");
  if (data.startsWith("tg4:prazo:detail:")) return cmdPrazoDetalhe(ctx, data.slice("tg4:prazo:detail:".length));
  if (data.startsWith("tg4:prazo:update:")) return promptInput(ctx, `tg4_prazo_update:${data.slice("tg4:prazo:update:".length)}`, "Envie: título | descrição | data YYYY-MM-DD | categoria", "prazos");
  if (!data.startsWith("tg4:prazo:resolve:")) return null;
  const id = data.slice("tg4:prazo:resolve:".length);
  if (!temModulo(ctx, "prazos")) return semModulo("prazos");
  const current = await getPrazo(ctx, id);
  const resolvido = current.data?.resolvido ? 0 : 1;
  return confirmMutation(ctx, { op: "prazo_resolve", moduleId: "prazos", id, payload: { resolvido } }, resolvido ? "Confirmar resolução do prazo?" : "Confirmar reabertura do prazo?");
}

export async function executePrazoMutation(ctx, payload) {
  let r;
  if (payload.op === "prazo_create") r = await trustedTelegramRpc(ctx, "prazos_criar", { _titulo: payload.payload.titulo, _descricao: payload.payload.descricao, _data_limite: payload.payload.dataLimite, _categoria: payload.payload.categoria }, { moduleId: "prazos" });
  if (payload.op === "prazo_update") r = await trustedTelegramRpc(ctx, "prazos_atualizar", { _id: payload.id, _titulo: payload.payload.titulo, _descricao: payload.payload.descricao, _data_limite: payload.payload.dataLimite, _categoria: payload.payload.categoria }, { moduleId: "prazos" });
  if (payload.op === "prazo_resolve") r = await trustedTelegramRpc(ctx, "prazos_atualizar", { _id: payload.id, _resolvido: payload.payload.resolvido }, { moduleId: "prazos" });
  if (!r) return null;
  if (r.error) return { text: escHtml(r.error.message), edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  const labels = { prazo_create: "Prazo criado.", prazo_update: "Prazo atualizado.", prazo_resolve: "Prazo atualizado." };
  return { text: labels[payload.op], edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}
