import { randomUUID } from "node:crypto";
import { runRpc as defaultRunRpc } from "../db.mjs";

const DEFAULT_CAPACITY = 256;
const DEFAULT_TTL_MS = 120_000;

function actorKey(ctx) {
  return String(ctx.fromId || ctx.fromUsername || "");
}

function binding(ctx) {
  return {
    chatId: String(ctx.chatId),
    userId: String(ctx.user?.usuarioId || ""),
    actorId: actorKey(ctx),
  };
}

function matches(entry, ctx) {
  const current = binding(ctx);
  return entry.chatId === current.chatId && entry.userId === current.userId && entry.actorId === current.actorId;
}

function nonce() {
  return randomUUID().replace(/-/g, "");
}

function invalid(code = "EXPIRED") {
  return { ok: false, code };
}

export function createTelegramInteractions({ now = () => Date.now(), capacity = DEFAULT_CAPACITY } = {}) {
  const maps = {
    confirmations: new Map(),
    inputs: new Map(),
    pages: new Map(),
  };
  const max = Math.max(1, Math.floor(capacity));

  function reap() {
    const current = now();
    for (const map of Object.values(maps)) {
      for (const [key, entry] of map) {
        if (entry.expiresAt < current) map.delete(key);
      }
    }
  }

  function put(map, key, entry) {
    reap();
    while (map.size >= max) map.delete(map.keys().next().value);
    map.set(key, entry);
  }

  return {
    now,
    maps,
    put,
    reap,
    size: () => {
      reap();
      return Object.fromEntries(Object.entries(maps).map(([key, map]) => [key, map.size]));
    },
  };
}

export const telegramInteractions = createTelegramInteractions();

export function clearTelegramInteractions() {
  for (const map of Object.values(telegramInteractions.maps)) map.clear();
}

export function requireTelegramModule(ctx, moduleId) {
  if (!ctx.user) return { ok: false, code: "UNLINKED" };
  if (ctx.user.isAdmin || (ctx.modulos || []).includes(moduleId)) return { ok: true };
  return { ok: false, code: "FORBIDDEN" };
}

export async function trustedTelegramRpc(ctx, fn, args = {}, { runRpc = defaultRunRpc, moduleId, allowUnlinked = false } = {}) {
  if (!ctx.user?.username && !allowUnlinked) return { data: null, error: { code: "UNLINKED", message: "Vincule esta conversa." } };
  if (moduleId) {
    const access = requireTelegramModule(ctx, moduleId);
    if (!access.ok) return { data: null, error: { code: access.code, message: "Sem permissÃ£o no mÃ³dulo solicitado." } };
  }
  const { _caller: ignoredCaller, ...safeArgs } = args;
  const caller = ctx.user?.username;
  return runRpc(ctx.db, fn, safeArgs, caller || null);
}

export function createInputRequest(state, ctx, { kind, fields = [], ttlMs = DEFAULT_TTL_MS }) {
  if (!kind || !Array.isArray(fields) || fields.some((field) => typeof field !== "string")) return null;
  const key = String(ctx.chatId);
  state.put(state.maps.inputs, key, {
    ...binding(ctx),
    kind,
    fields: [...fields],
    expiresAt: state.now() + ttlMs,
  });
  return { kind, fields: [...fields] };
}

export function consumeInputRequest(state, ctx, raw, parse) {
  const key = String(ctx.chatId);
  const entry = state.maps.inputs.get(key);
  if (!entry || entry.expiresAt < state.now() || !matches(entry, ctx)) {
    if (entry?.expiresAt < state.now()) state.maps.inputs.delete(key);
    return invalid();
  }
  state.maps.inputs.delete(key);
  try {
    const value = parse(String(raw));
    if (value == null) return invalid("INVALID_INPUT");
    return { ok: true, kind: entry.kind, value };
  } catch {
    return invalid("INVALID_INPUT");
  }
}

export function createConfirmation(state, ctx, { action, prefix = "confirm", ttlMs = DEFAULT_TTL_MS }) {
  if (!ctx.user || !/^[a-z0-9_-]{1,24}$/i.test(action) || !/^[a-z0-9_-]{1,24}$/i.test(prefix)) return null;
  const id = nonce();
  state.put(state.maps.confirmations, id, { ...binding(ctx), action, prefix, expiresAt: state.now() + ttlMs });
  return { nonce: id, confirm: `${prefix}:confirm:${id}`, cancel: `${prefix}:cancel:${id}` };
}

export function consumeConfirmation(state, ctx, callback) {
  const match = /^([a-z0-9_-]{1,24}):(confirm|cancel):([a-f0-9]{32})$/i.exec(String(callback));
  if (!match) return invalid("MALFORMED_CALLBACK");
  const [, prefix, decision, id] = match;
  const entry = state.maps.confirmations.get(id);
  if (!entry || entry.expiresAt < state.now() || entry.prefix !== prefix || !matches(entry, ctx)) {
    if (entry?.expiresAt < state.now()) state.maps.confirmations.delete(id);
    return invalid();
  }
  state.maps.confirmations.delete(id);
  return { ok: true, action: entry.action, decision };
}

export function createPageCallback(state, ctx, { action, page, prefix = "page", ttlMs = DEFAULT_TTL_MS }) {
  if (!ctx.user || !/^[a-z0-9_-]{1,24}$/i.test(action) || !Number.isInteger(page) || page < 1) return null;
  const id = nonce();
  state.put(state.maps.pages, id, { ...binding(ctx), action, page, prefix, expiresAt: state.now() + ttlMs });
  return `${prefix}:${id}`;
}

export function consumePageCallback(state, ctx, callback) {
  const match = /^([a-z0-9_-]{1,24}):([a-f0-9]{32})$/i.exec(String(callback));
  if (!match) return invalid("MALFORMED_CALLBACK");
  const [, prefix, id] = match;
  const entry = state.maps.pages.get(id);
  if (!entry || entry.expiresAt < state.now() || entry.prefix !== prefix || !matches(entry, ctx)) {
    if (entry?.expiresAt < state.now()) state.maps.pages.delete(id);
    return invalid();
  }
  state.maps.pages.delete(id);
  return { ok: true, action: entry.action, page: entry.page };
}
