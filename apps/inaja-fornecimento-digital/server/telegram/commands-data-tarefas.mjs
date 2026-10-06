import { bold, code, escHtml, inlineKeyboard, truncate } from "./format.mjs";
import {
  TASK_STATUS,
  back,
  confirmMutation,
  fmtStatus,
  pageButtons,
  parseTask,
  promptInput,
  semModulo,
  slicePage,
  temModulo,
  trustedQuery,
} from "./commands-data-common.mjs";

async function listTarefas(ctx) {
  return trustedQuery(ctx, "tarefas", {
    table: "tarefas",
    action: "select",
    select: "*",
    order: [{ column: "ordem", ascending: true }, { column: "created_at", ascending: true }],
    limit: 100,
  });
}

async function getTarefa(ctx, id) {
  const r = await trustedQuery(ctx, "tarefas", {
    table: "tarefas",
    action: "select",
    select: "*",
    filters: [{ column: "id", value: id }],
    limit: 1,
  });
  return r.error ? r : { data: r.data?.[0] || null, error: null };
}

async function updateTarefa(ctx, id, payload) {
  return trustedQuery(ctx, "tarefas", {
    table: "tarefas",
    action: "update",
    filters: [{ column: "id", value: id }],
    payload,
  });
}

async function insertTarefa(ctx, payload) {
  const list = await listTarefas(ctx);
  if (list.error) return list;
  const status = payload.status || "todo";
  const maxOrdem = Math.max(0, ...list.data.filter((t) => t.status === status).map((t) => Number(t.ordem) || 0));
  return trustedQuery(ctx, "tarefas", {
    table: "tarefas",
    action: "insert",
    payload: { ...payload, status, prioridade: payload.prioridade || "media", ordem: maxOrdem + 1 },
  });
}

function taskLine(t) {
  return `• ${bold(t.titulo)} — ${escHtml(fmtStatus(t.status))} — ${escHtml(t.prioridade || "media")}${t.prazo ? ` — ${code(t.prazo)}` : ""}`;
}

export async function cmdTarefas(ctx, page = 1) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "tarefas")) return semModulo("tarefas");
  const r = await listTarefas(ctx);
  if (r.error) return { text: escHtml(r.error.message) };
  const rows = r.data || [];
  const paged = slicePage(rows, page);
  const text = rows.length ? `${bold("Tarefas")} ${code(`${paged.page}/${paged.totalPages}`)}\n\n${paged.rows.map(taskLine).join("\n")}` : `${bold("Tarefas")}\n\nNenhuma tarefa cadastrada.`;
  const keyboard = [[{ text: "Nova tarefa", data: "tg4:tarefa:create" }]];
  for (const t of paged.rows) keyboard.push([{ text: truncate(t.titulo, 32), data: `tg4:tarefa:detail:${t.id}` }]);
  const pages = pageButtons(ctx, "tarefas", paged.page, paged.totalPages);
  if (pages.length) keyboard.push(pages);
  keyboard.push([back()]);
  return { text, reply_markup: inlineKeyboard(keyboard), edit: Boolean(ctx.callbackId) };
}

async function cmdTarefaDetalhe(ctx, id) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, "tarefas")) return semModulo("tarefas");
  const r = await getTarefa(ctx, id);
  if (r.error) return { text: escHtml(r.error.message) };
  if (!r.data) return { text: "Tarefa não encontrada.", edit: Boolean(ctx.callbackId) };
  const t = r.data;
  return {
    text: truncate(`${bold("Tarefa")}\n\nTítulo: ${escHtml(t.titulo)}\nStatus: ${escHtml(fmtStatus(t.status))}\nPrioridade: ${escHtml(t.prioridade || "media")}\nResponsável: ${escHtml(t.responsavel || "—")}\nPrazo: ${code(t.prazo || "—")}\nDescrição: ${escHtml(t.descricao || "—")}`),
    reply_markup: inlineKeyboard([
      [{ text: "Atualizar", data: `tg4:tarefa:update:${id}` }],
      [{ text: "A fazer", data: `tg4:tarefa:status:${id}:todo` }, { text: "Andamento", data: `tg4:tarefa:status:${id}:doing` }, { text: "Concluir", data: `tg4:tarefa:status:${id}:done` }],
      [back("menu:tarefas")],
    ]),
    edit: Boolean(ctx.callbackId),
  };
}

export function handleTarefaInput(ctx, input) {
  const kind = String(input.kind);
  const raw = input.value;
  if (kind === "tg4_task_create") {
    if (!temModulo(ctx, "tarefas")) return semModulo("tarefas");
    const payload = parseTask(raw);
    if (!payload) return { text: "Entrada inválida. Use: título | descrição | responsável | prioridade | status | prazo YYYY-MM-DD" };
    return confirmMutation(ctx, { op: "task_create", moduleId: "tarefas", payload }, `Confirmar criação da tarefa ${bold(payload.titulo)}?`);
  }
  if (!kind.startsWith("tg4_task_update:")) return null;
  if (!temModulo(ctx, "tarefas")) return semModulo("tarefas");
  const payload = parseTask(raw, false);
  if (!payload) return { text: "Entrada inválida. Use: título | descrição | responsável | prioridade | status | prazo YYYY-MM-DD" };
  return confirmMutation(ctx, { op: "task_update", moduleId: "tarefas", id: kind.slice("tg4_task_update:".length), payload }, "Confirmar atualização da tarefa?");
}

export async function handleTarefaCallback(ctx, data) {
  if (data === "tg4:tarefa:create") return promptInput(ctx, "tg4_task_create", "Envie: título | descrição | responsável | prioridade baixa/media/alta | status todo/doing/done | prazo YYYY-MM-DD", "tarefas");
  if (data.startsWith("tg4:tarefa:detail:")) return cmdTarefaDetalhe(ctx, data.slice("tg4:tarefa:detail:".length));
  if (data.startsWith("tg4:tarefa:update:")) return promptInput(ctx, `tg4_task_update:${data.slice("tg4:tarefa:update:".length)}`, "Envie: título | descrição | responsável | prioridade baixa/media/alta | status todo/doing/done | prazo YYYY-MM-DD", "tarefas");
  if (!data.startsWith("tg4:tarefa:status:")) return null;
  const [, , , id, status] = data.split(":");
  if (!TASK_STATUS.has(status)) return { text: "Status inválido." };
  if (!temModulo(ctx, "tarefas")) return semModulo("tarefas");
  return confirmMutation(ctx, { op: "task_status", moduleId: "tarefas", id, payload: { status } }, `Confirmar status da tarefa como ${bold(fmtStatus(status))}?`);
}

export async function executeTarefaMutation(ctx, payload) {
  let r;
  if (payload.op === "task_create") r = await insertTarefa(ctx, payload.payload);
  if (payload.op === "task_update" || payload.op === "task_status") r = await updateTarefa(ctx, payload.id, payload.payload);
  if (!r) return null;
  if (r.error) return { text: escHtml(r.error.message), edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  const labels = { task_create: "Tarefa criada.", task_update: "Tarefa atualizada.", task_status: "Status da tarefa atualizado." };
  return { text: labels[payload.op], edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}
