const rateMap = new Map();
const RATE_MAX = 30;
const RATE_WINDOW_MS = 60_000;
const RATE_CAPACITY = 1_000;

export function checkRateLimit(chatId, now = Date.now()) {
  const key = String(chatId);
  reapRateLimits(now);
  let e = rateMap.get(key);
  if (!e || now - e.start > RATE_WINDOW_MS) {
    e = { start: now, count: 0 };
    rateMap.set(key, e);
  }
  e.count += 1;
  if (e.count > RATE_MAX) {
    return { ok: false, message: "Muitos comandos. Aguarde um minuto." };
  }
  return { ok: true };
}

export function getTelegramRateLimitSize() {
  return rateMap.size;
}

export function resetTelegramRateLimits() {
  rateMap.clear();
}

function reapRateLimits(now) {
  for (const [key, entry] of rateMap) {
    if (now - entry.start > RATE_WINDOW_MS) rateMap.delete(key);
  }
  while (rateMap.size >= RATE_CAPACITY) rateMap.delete(rateMap.keys().next().value);
}

export function resolveVinculo(db, chatId) {
  const row = db
    .prepare(
      `SELECT v.id AS vinculo_id, v.chat_id, v.username_tg, v.ativo AS vinculo_ativo,
              u.id AS usuario_id, u.username, u.is_admin, u.ativo AS usuario_ativo
       FROM telegram_vinculos v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.chat_id = ?`,
    )
    .get(String(chatId));
  if (!row || !row.vinculo_ativo || !row.usuario_ativo) return null;
  return {
    vinculoId: row.vinculo_id,
    chatId: row.chat_id,
    usernameTg: row.username_tg,
    usuarioId: row.usuario_id,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
  };
}

export function listModulos(db, usuarioId) {
  return db
    .prepare("SELECT modulo_id FROM usuario_modulos WHERE usuario_id = ?")
    .all(usuarioId)
    .map((r) => r.modulo_id);
}

export function temModulo(ctx, moduloId) {
  if (!ctx.user) return false;
  if (ctx.user.isAdmin) return true;
  return (ctx.modulos || []).includes(moduloId);
}

export function touchVinculo(db, chatId) {
  db.prepare("UPDATE telegram_vinculos SET ultimo_acesso = datetime('now') WHERE chat_id = ?").run(
    String(chatId),
  );
}

export function logTelegram(db, { chatId, usuarioId, comando, args, ok, erro }) {
  try {
    const redactedArgs = redactTelegramAuditArgs(args);
    const argsRedacted = redactedArgs ? JSON.stringify(redactedArgs).slice(0, 500) : null;
    db.prepare(
      `INSERT INTO telegram_logs (id, chat_id, usuario_id, comando, args_redacted, ok, erro)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      cryptoRandom(),
      String(chatId),
      usuarioId || null,
      String(comando || "").slice(0, 120),
      argsRedacted,
      ok ? 1 : 0,
      erro ? String(erro).slice(0, 500) : null,
    );
  } catch {
    /* ignore */
  }
}

const SENSITIVE_AUDIT_KEY = /(password|passwd|senha|secret|token|authorization|cookie|content|conteudo|texto|message|mensagem|input|prompt|body|arquivo|file|path)/i;

export function redactTelegramAuditArgs(args) {
  if (!args || typeof args !== "object") return null;
  return redactValue(args);
}

function redactValue(value) {
  if (Array.isArray(value)) return value.map(redactValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, SENSITIVE_AUDIT_KEY.test(key) ? "[REDACTED]" : redactValue(child)]),
  );
}

function cryptoRandom() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
