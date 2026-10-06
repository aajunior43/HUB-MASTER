import { bold, code, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import { trustedTelegramRpc } from "./interactions.mjs";
import { back, confirmMutation, parseCalendario, pageButtons, promptInput, semModulo, slicePage, temModulo } from "./commands-data-common.mjs";

export async function cmdCalendario(ctx, args = [], page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "calendario")) return semModulo("calendário");
  const mes = args[0] || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) return { text: "Mês inválido." };
  const r = await trustedTelegramRpc(ctx, "calendario_listar", { _mes: mes }, { moduleId: "calendario" });
  if (r.error) return { text: escHtml(r.error.message) };
  const eventos = r.data?.eventos || [];
  const paged = slicePage(eventos, page);
  const keyboard = [[{ text: "Novo evento", data: "tg4:cal:create" }]];
  for (const e of paged.rows) keyboard.push([{ text: truncate(e.texto || e.titulo || "Evento", 32), data: `tg4:cal:detail:${e.id}` }]);
  const pages = pageButtons(ctx, "calendario", paged.page, paged.totalPages);
  if (pages.length) keyboard.push(pages);
  keyboard.push([back()]);
  if (!eventos.length) return { text: `Nenhum evento em ${mes}.`, reply_markup: inlineKeyboard(keyboard), edit: Boolean(ctx.callbackId) };
  return {
    text: `${bold("Calendário")} ${code(mes)} ${code(`${paged.page}/${paged.totalPages}`)}\n\n${paged.rows.map((e) => `• ${code(String(e.data || "").slice(0, 10))} — ${escHtml(e.texto || e.titulo || "—")}`).join("\n")}`,
    reply_markup: inlineKeyboard(keyboard),
    edit: Boolean(ctx.callbackId),
  };
}

async function getEvento(ctx, id) {
  const r = await trustedTelegramRpc(ctx, "calendario_listar", {}, { moduleId: "calendario" });
  if (r.error) return r;
  return { data: (r.data?.eventos || []).find((e) => e.id === id) || null, error: null };
}

async function cmdCalendarioDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "calendario")) return semModulo("calendário");
  const r = await getEvento(ctx, id);
  if (r.error) return { text: escHtml(r.error.message) };
  if (!r.data) return { text: "Evento não encontrado.", edit: Boolean(ctx.callbackId) };
  const e = r.data;
  return {
    text: truncate(`${bold("Evento")}\n\nData: ${code(e.data)}\nTipo: ${code(e.tipo)}\nTexto: ${escHtml(e.texto || "—")}\nDescrição: ${escHtml(e.descricao || "—")}`),
    reply_markup: inlineKeyboard([[{ text: "Atualizar", data: `tg4:cal:update:${id}` }], [back("menu:calendario")]]),
    edit: Boolean(ctx.callbackId),
  };
}

export function handleCalendarioInput(ctx, input) {
  const kind = String(input.kind);
  const raw = input.value;
  if (kind === "tg4_cal_create") {
    if (!temModulo(ctx, "calendario")) return semModulo("calendário");
    const payload = parseCalendario(raw);
    if (!payload) return { text: "Entrada inválida. Use: data YYYY-MM-DD | tipo | texto | descrição" };
    return confirmMutation(ctx, { op: "cal_create", moduleId: "calendario", payload }, `Confirmar criação do evento ${bold(payload.texto)}?`);
  }
  if (!kind.startsWith("tg4_cal_update:")) return null;
  if (!temModulo(ctx, "calendario")) return semModulo("calendário");
  const payload = parseCalendario(raw);
  if (!payload) return { text: "Entrada inválida. Use: data YYYY-MM-DD | tipo | texto | descrição" };
  return confirmMutation(ctx, { op: "cal_update", moduleId: "calendario", id: kind.slice("tg4_cal_update:".length), payload }, "Confirmar atualização do evento?");
}

export async function handleCalendarioCallback(ctx, data) {
  if (data === "tg4:cal:create") return promptInput(ctx, "tg4_cal_create", "Envie: data YYYY-MM-DD | tipo PAYMENT/COMMITMENT/HOLIDAY/NOTE | texto | descrição", "calendario", "calendário");
  if (data.startsWith("tg4:cal:detail:")) return cmdCalendarioDetalhe(ctx, data.slice("tg4:cal:detail:".length));
  if (data.startsWith("tg4:cal:update:")) return promptInput(ctx, `tg4_cal_update:${data.slice("tg4:cal:update:".length)}`, "Envie: data YYYY-MM-DD | tipo PAYMENT/COMMITMENT/HOLIDAY/NOTE | texto | descrição", "calendario", "calendário");
  return null;
}

export async function executeCalendarioMutation(ctx, payload) {
  let r;
  if (payload.op === "cal_create") r = await trustedTelegramRpc(ctx, "calendario_evento_criar", { _data: payload.payload.data, _tipo: payload.payload.tipo, _texto: payload.payload.texto, _descricao: payload.payload.descricao }, { moduleId: "calendario" });
  if (payload.op === "cal_update") r = await trustedTelegramRpc(ctx, "calendario_evento_atualizar", { _id: payload.id, _data: payload.payload.data, _tipo: payload.payload.tipo, _texto: payload.payload.texto, _descricao: payload.payload.descricao }, { moduleId: "calendario" });
  if (!r) return null;
  if (r.error) return { text: escHtml(r.error.message), edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  const labels = { cal_create: "Evento criado.", cal_update: "Evento atualizado." };
  return { text: labels[payload.op], edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}
