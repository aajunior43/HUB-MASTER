import { runQuery } from "../db.mjs";
import { inlineKeyboard } from "./format.mjs";
import {
  createConfirmation,
  createInputRequest,
  createPageCallback,
  requireTelegramModule,
  telegramInteractions,
} from "./interactions.mjs";

export const INPUT_TTL_MS = 120_000;
export const CONFIRM_TTL_MS = 120_000;
export const PAGE_SIZE = 5;
export const TASK_STATUS = new Set(["todo", "doing", "done"]);
export const MURAL_STATUS = new Set(["a_fazer", "andamento", "concluido"]);
export const PRIORIDADES = new Set(["baixa", "media", "alta"]);
export const CAL_TIPOS = new Set(["PAYMENT", "COMMITMENT", "HOLIDAY", "NOTE"]);

export function temModulo(ctx, moduloId) {
  return requireTelegramModule(ctx, moduloId).ok;
}

export function semModulo(modulo) {
  return { text: `Sem permissão no módulo ${modulo}.` };
}

export function back(data = "menu") {
  return { text: "Voltar", data };
}

export function pageButtons(ctx, action, page, totalPages) {
  const row = [];
  if (page > 1) row.push({ text: "Anterior", data: createPageCallback(telegramInteractions, ctx, { action, page: page - 1, prefix: "tg4p" }) });
  if (page < totalPages) row.push({ text: "Próxima", data: createPageCallback(telegramInteractions, ctx, { action, page: page + 1, prefix: "tg4p" }) });
  return row.filter((button) => button.data);
}

export function slicePage(rows, page) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return { rows: rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), page: safePage, totalPages };
}

export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export function splitPipe(raw) {
  return String(raw || "").split("|").map((part) => part.trim());
}

export function parseTask(raw, requireTitle = true) {
  const parts = splitPipe(raw);
  if (parts.length < 2) return null;
  const [titulo = "", descricao = "", responsavel = "", prioridade = "", status = "", prazo = ""] = parts;
  if (requireTitle && !titulo) return null;
  if (prioridade && !PRIORIDADES.has(prioridade)) return null;
  if (status && !TASK_STATUS.has(status)) return null;
  if (prazo && !validDate(prazo)) return null;
  const payload = {};
  if (titulo) payload.titulo = titulo;
  if (descricao) payload.descricao = descricao;
  if (responsavel) payload.responsavel = responsavel;
  if (prioridade) payload.prioridade = prioridade;
  if (status) payload.status = status;
  if (prazo) payload.prazo = prazo;
  return Object.keys(payload).length ? payload : null;
}

export function parseMural(raw) {
  const [titulo = "", conteudo = "", prioridade = "media", categoria = "tarefa"] = splitPipe(raw);
  if (!titulo || !conteudo || !PRIORIDADES.has(prioridade)) return null;
  return { titulo, conteudo, prioridade, categoria };
}

export function parsePrazo(raw) {
  const [titulo = "", descricao = "", dataLimite = "", categoria = "geral"] = splitPipe(raw);
  if (!titulo || !validDate(dataLimite)) return null;
  return { titulo, descricao, dataLimite, categoria: categoria || "geral" };
}

export function parseCalendario(raw) {
  const [data = "", tipo = "", texto = "", descricao = ""] = splitPipe(raw);
  if (!validDate(data) || !CAL_TIPOS.has(tipo) || !texto) return null;
  return { data, tipo, texto, descricao };
}

export function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtStatus(status) {
  return {
    todo: "a fazer",
    doing: "em andamento",
    done: "concluída",
    a_fazer: "a fazer",
    andamento: "em andamento",
    concluido: "concluído",
  }[status] || status || "—";
}

export function confirmMutation(ctx, payload, text) {
  const confirmation = createConfirmation(telegramInteractions, ctx, { action: "tg4", prefix: "tg4c", ttlMs: CONFIRM_TTL_MS });
  if (!confirmation) return { text: "Não foi possível criar a confirmação." };
  const entry = telegramInteractions.maps.confirmations.get(confirmation.nonce);
  if (entry) entry.payload = payload;
  return {
    text,
    reply_markup: inlineKeyboard([[{ text: "Confirmar", data: confirmation.confirm }, { text: "Cancelar", data: confirmation.cancel }]]),
  };
}

export function confirmationPayload(callback) {
  const match = /^tg4c:(?:confirm|cancel):([a-f0-9]{32})$/i.exec(String(callback));
  if (!match) return null;
  return telegramInteractions.maps.confirmations.get(match[1])?.payload || null;
}

export function expiredConfirmation() {
  return { text: "Confirmação expirada. Abra o menu novamente.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}

export async function trustedQuery(ctx, moduleId, body) {
  const access = requireTelegramModule(ctx, moduleId);
  if (!access.ok) return { data: null, error: { message: "Sem permissão no módulo solicitado.", code: access.code } };
  return runQuery(ctx.db, body, ctx.user.username);
}

export function promptInput(ctx, kind, text, moduleId, label = moduleId) {
  if (!ctx.user) return { text: "Vincule a conta." };
  if (!temModulo(ctx, moduleId)) return semModulo(label);
  createInputRequest(telegramInteractions, ctx, { kind, fields: ["texto"], ttlMs: INPUT_TTL_MS });
  return { text, edit: Boolean(ctx.callbackId), reply_markup: inlineKeyboard([[{ text: "Cancelar", data: "menu" }]]) };
}
