import { bold, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import { trustedTelegramRpc } from "./interactions.mjs";
import {
  MURAL_STATUS,
  back,
  confirmMutation,
  fmtStatus,
  pageButtons,
  parseMural,
  promptInput,
  semModulo,
  slicePage,
  temModulo,
} from "./commands-data-common.mjs";

export async function cmdMural(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "mural")) return semModulo("mural");
  const r = await trustedTelegramRpc(ctx, "mural_listar", {}, { moduleId: "mural" });
  if (r.error) return { text: escHtml(r.error.message) };
  const rows = r.data || [];
  const paged = slicePage(rows, page);
  const keyboard = [[{ text: "Novo recado", data: "tg4:mural:create" }]];
  for (const m of paged.rows) keyboard.push([{ text: truncate(m.titulo, 32), data: `tg4:mural:detail:${m.id}` }]);
  const pages = pageButtons(ctx, "mural", paged.page, paged.totalPages);
  if (pages.length) keyboard.push(pages);
  keyboard.push([back()]);
  if (!rows.length) return { text: "Mural vazio.", reply_markup: inlineKeyboard(keyboard), edit: Boolean(ctx.callbackId) };
  return {
    text: `${bold("Mural")} ${paged.page}/${paged.totalPages}\n\n${paged.rows.map((m) => `• ${bold(m.titulo)} — ${escHtml(fmtStatus(m.status))}\n  ${escHtml(String(m.conteudo || "").slice(0, 120))}`).join("\n\n")}`,
    reply_markup: inlineKeyboard(keyboard),
    edit: Boolean(ctx.callbackId),
  };
}

async function getMural(ctx, id) {
  const r = await trustedTelegramRpc(ctx, "mural_listar", {}, { moduleId: "mural" });
  if (r.error) return r;
  return { data: (r.data || []).find((m) => m.id === id) || null, error: null };
}

async function cmdMuralDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "mural")) return semModulo("mural");
  const [recado, comentarios] = await Promise.all([
    getMural(ctx, id),
    trustedTelegramRpc(ctx, "mural_comentarios_listar", { _recado_id: id }, { moduleId: "mural" }),
  ]);
  if (recado.error) return { text: escHtml(recado.error.message) };
  if (!recado.data) return { text: "Recado não encontrado.", edit: Boolean(ctx.callbackId) };
  const comments = comentarios.data || [];
  const commentsText = comments.length ? comments.slice(-3).map((c) => `• ${escHtml(c.autor || "—")}: ${escHtml(c.texto)}`).join("\n") : "Nenhum comentário.";
  return {
    text: truncate(`${bold("Recado")}\n\n${bold(recado.data.titulo)}\nStatus: ${escHtml(fmtStatus(recado.data.status))}\nPrioridade: ${escHtml(recado.data.prioridade || "media")}\nAutor: ${escHtml(recado.data.autor || "—")}\n\n${escHtml(recado.data.conteudo || "")}\n\n${bold("Comentários")}\n${commentsText}`),
    reply_markup: inlineKeyboard([
      [{ text: "Comentar", data: `tg4:mural:comment:${id}` }],
      [{ text: "A fazer", data: `tg4:mural:status:${id}:a_fazer` }, { text: "Andamento", data: `tg4:mural:status:${id}:andamento` }, { text: "Concluir", data: `tg4:mural:status:${id}:concluido` }],
      [back("menu:mural")],
    ]),
    edit: Boolean(ctx.callbackId),
  };
}

export function handleMuralInput(ctx, input) {
  const kind = String(input.kind);
  const raw = input.value;
  if (kind === "tg4_mural_create") {
    if (!temModulo(ctx, "mural")) return semModulo("mural");
    const payload = parseMural(raw);
    if (!payload) return { text: "Entrada inválida. Use: título | conteúdo | prioridade | categoria" };
    return confirmMutation(ctx, { op: "mural_create", moduleId: "mural", payload }, `Confirmar publicação no mural ${bold(payload.titulo)}?`);
  }
  if (!kind.startsWith("tg4_mural_comment:")) return null;
  if (!temModulo(ctx, "mural")) return semModulo("mural");
  const texto = String(raw || "").trim();
  if (!texto) return { text: "Entrada inválida. Envie o comentário em uma mensagem." };
  return confirmMutation(ctx, { op: "mural_comment", moduleId: "mural", id: kind.slice("tg4_mural_comment:".length), payload: { texto } }, "Confirmar comentário no mural?");
}

export async function handleMuralCallback(ctx, data) {
  if (data === "tg4:mural:create") return promptInput(ctx, "tg4_mural_create", "Envie: título | conteúdo | prioridade baixa/media/alta | categoria", "mural");
  if (data.startsWith("tg4:mural:detail:")) return cmdMuralDetalhe(ctx, data.slice("tg4:mural:detail:".length));
  if (data.startsWith("tg4:mural:comment:")) return promptInput(ctx, `tg4_mural_comment:${data.slice("tg4:mural:comment:".length)}`, "Envie o comentário do mural em uma mensagem.", "mural");
  if (!data.startsWith("tg4:mural:status:")) return null;
  const [, , , id, status] = data.split(":");
  if (!MURAL_STATUS.has(status)) return { text: "Status inválido." };
  if (!temModulo(ctx, "mural")) return semModulo("mural");
  return confirmMutation(ctx, { op: "mural_status", moduleId: "mural", id, payload: { status } }, `Confirmar status do recado como ${bold(fmtStatus(status))}?`);
}

export async function executeMuralMutation(ctx, payload) {
  let r;
  if (payload.op === "mural_create") r = await trustedTelegramRpc(ctx, "mural_criar", { _titulo: payload.payload.titulo, _conteudo: payload.payload.conteudo, _prioridade: payload.payload.prioridade, _categoria: payload.payload.categoria, _status: "a_fazer", _autor: ctx.user.username }, { moduleId: "mural" });
  if (payload.op === "mural_comment") r = await trustedTelegramRpc(ctx, "mural_comentario_criar", { _recado_id: payload.id, _texto: payload.payload.texto, _autor: ctx.user.username }, { moduleId: "mural" });
  if (payload.op === "mural_status") r = await trustedTelegramRpc(ctx, "mural_atualizar", { _id: payload.id, _status: payload.payload.status }, { moduleId: "mural" });
  if (!r) return null;
  if (r.error) return { text: escHtml(r.error.message), edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  const labels = { mural_create: "Recado publicado.", mural_comment: "Comentário publicado.", mural_status: "Status do recado atualizado." };
  return { text: labels[payload.op], edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}
