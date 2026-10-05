import { createTelegramClient } from "./client.mjs";
import { randomUUID } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  checkRateLimit,
  listModulos,
  logTelegram,
  resolveVinculo,
  touchVinculo,
} from "./session.mjs";
import { handleCommand } from "./commands.mjs";
import { clearTelegramInteractions } from "./interactions.mjs";
import { openDatabase } from "../db.mjs";
import { logger } from "../logger.mjs";

let lastError = null;
let runtime = null;
let stopping = null;

function configVal(db, chave) {
  const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave);
  return row ? String(row.valor || "") : "";
}

export function getTelegramRuntimeStatus() {
  return {
    running: Boolean(runtime?.active),
    botUsername: runtime?.botInfo?.username || null,
    lastError,
  };
}

export async function startTelegramBot(options = {}) {
  if (runtime?.active) return { ok: true, already: true };
  if (stopping) await stopping;
  clearTelegramInteractions();
  const db = options.db || openDatabase();
  const lock = adquirirLock(options.lockDir);
  if (!lock) return { ok: false, reason: "already_running" };
  const dbEnabled = configVal(db, "telegram_bot_enabled");
  const envEnabled = String(process.env.TELEGRAM_BOT_ENABLED || "").trim();
  const enabled = dbEnabled === "1" || (dbEnabled !== "0" && envEnabled === "1");
  const token =
    configVal(db, "telegram_bot_token").trim() ||
    String(process.env.TELEGRAM_BOT_TOKEN || "").trim();

  if (!enabled) {
    logger.info("telegram.disabled", { component: "telegram", reason: "configuration" });
    liberarLock(lock);
    return { ok: false, reason: "disabled" };
  }
  if (!token) {
    logger.warn("telegram.not_started", { component: "telegram", reason: "missing_token" });
    liberarLock(lock);
    return { ok: false, reason: "no_token" };
  }

  const client = options.client || createTelegramClient(token);
  let botInfo;
  try {
    botInfo = await client.getMe();
    logger.info("telegram.started", { component: "telegram", botUsername: botInfo.username, mode: "long_polling" });
  } catch (e) {
    let msg = e.message || String(e);
    if (msg.includes("401") || msg.includes("Unauthorized")) {
      msg = "Token inválido ou não autorizado (verifique o token fornecido pelo @BotFather).";
    }
    lastError = msg;
    logger.error("telegram.authentication.failed", { component: "telegram", error: e });
    liberarLock(lock);
    return { ok: false, reason: "auth", error: msg };
  }

  const instance = {
    active: true,
    botInfo,
    controller: new AbortController(),
    lock,
    loopPromise: null,
  };
  runtime = instance;
  lastError = null;
  let offset = 0;

  const loop = async () => {
    while (instance.active && !instance.controller.signal.aborted) {
      try {
        const updates = await client.getUpdates({ offset, timeout: 25, signal: instance.controller.signal });
        for (const u of updates) {
          offset = u.update_id + 1;
          await processTelegramUpdate(db, client, u).catch((err) => {
            logger.error("telegram.update.failed", { component: "telegram", error: err });
          });
        }
      } catch (e) {
        if (instance.controller.signal.aborted) break;
        lastError = e.message;
        logger.error("telegram.poll.failed", { component: "telegram", error: e });
        if (e.code === 409 || e.message.includes("terminated by other getUpdates request")) {
          instance.active = false;
          break;
        }
        await sleep(3000);
      }
    }
    instance.active = false;
    liberarLock(instance.lock);
    if (runtime === instance) runtime = null;
    logger.info("telegram.stopped", { component: "telegram" });
  };

  instance.loopPromise = loop();
  return { ok: true, username: botInfo.username };
}

export async function stopTelegramBot() {
  if (!runtime) return stopping || undefined;
  const instance = runtime;
  runtime = null;
  instance.active = false;
  instance.controller.abort();
  clearTelegramInteractions();
  const completion = instance.loopPromise || Promise.resolve();
  stopping = completion.finally(() => {
    if (stopping === waitForStop) stopping = null;
  });
  const waitForStop = stopping;
  return waitForStop;
}

function adquirirLock(lockDir) {
  const dir = lockDir || path.resolve(process.cwd(), "data");
  const filePath = path.join(dir, "telegram-bot.lock");
  mkdirSync(dir, { recursive: true });
  try {
    const fd = openSync(filePath, "wx");
    const content = JSON.stringify({ pid: process.pid, token: randomUUID() });
    writeFileSync(fd, content);
    return { fd, path: filePath, content };
  } catch (error) {
    if (error.code !== "EEXIST") return false;
    try {
      const pid = lockPid(readFileSync(filePath, "utf8"));
      if (!Number.isSafeInteger(pid) || pid <= 0) throw Object.assign(new Error("invalid pid"), { code: "ESRCH" });
      process.kill(pid, 0);
      return false;
    } catch (lockError) {
      if (lockError.code !== "ESRCH") return false;
      try { unlinkSync(filePath); } catch { return false; }
      return adquirirLock(dir);
    }
  }
}

function liberarLock(lock) {
  if (!lock) return;
  try { closeSync(lock.fd); } catch { }
  try {
    if (readFileSync(lock.path, "utf8") === lock.content) unlinkSync(lock.path);
  } catch { }
}

function lockPid(content) {
  try {
    const metadata = JSON.parse(content);
    if (metadata && typeof metadata === "object") return Number(metadata.pid);
  } catch { }
  return Number(content);
}

export async function processTelegramUpdate(db, client, update) {
  const msg = update.message;
  const cb = update.callback_query;

  const chat = msg?.chat || cb?.message?.chat;
  const from = msg?.from || cb?.from;
  if (!chat || !from) return;

  // só privado no v1
  if (chat.type !== "private") {
    if (msg?.text?.startsWith("/")) {
      await client.sendMessage(chat.id, "Use este bot em conversa privada.");
    }
    return;
  }

  const rate = checkRateLimit(chat.id);
  if (!rate.ok) {
    await client.sendMessage(chat.id, rate.message);
    return;
  }

  const user = resolveVinculo(db, chat.id);
  if (user) {
    touchVinculo(db, chat.id);
  }
  const modulos = user ? listModulos(db, user.usuarioId) : [];

  const ctx = {
    db,
    client,
    chatId: chat.id,
    fromId: String(from.id || ""),
    fromUsername: from.username || "",
    user,
    modulos,
    text: msg?.text || "",
    callbackData: cb?.data || null,
    callbackId: cb?.id || null,
  };

  let result;
  try {
    result = await handleCommand(ctx);
    if (!result?.skipLog) {
      logTelegram(db, {
        chatId: chat.id,
        usuarioId: user?.usuarioId,
        comando: ctx.callbackData ? "callback" : "mensagem",
        ok: true,
      });
    }
  } catch (e) {
    logTelegram(db, {
      chatId: chat.id,
      usuarioId: user?.usuarioId,
      comando: ctx.callbackData ? "callback_error" : "mensagem_error",
      ok: false,
      erro: "PROCESSING_ERROR",
    });
    result = { text: `Erro: ${e.message}` };
  }

  if (cb?.id) {
    try {
      await client.answerCallbackQuery(cb.id);
    } catch {
      /* ignore */
    }
  }

  if (result?.text != null && result.text !== "") {
    if (cb?.message && result.edit) {
      await client.editMessageText(chat.id, cb.message.message_id, result.text, {
        reply_markup: result.reply_markup,
      });
    } else {
      await client.sendMessage(chat.id, result.text, {
        reply_markup: result.reply_markup,
      });
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Testa token sem iniciar o loop. */
export async function testTelegramToken(token) {
  const client = createTelegramClient(token);
  const me = await client.getMe();
  return { username: me.username, id: me.id, first_name: me.first_name };
}
