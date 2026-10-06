import { setDefaultResultOrder } from "node:dns";
import { openAsBlob } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";

setDefaultResultOrder("ipv4first");

const API = "https://api.telegram.org";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;

function documentError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function classifyDocumentFailure(error) {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return documentError("TELEGRAM_TIMEOUT", "Telegram não respondeu dentro do prazo para envio do documento.");
  }
  return documentError("TELEGRAM_TRANSPORT", "Não foi possível conectar ao Telegram para enviar o documento.");
}

export function createTelegramClient(token, options = {}) {
  const base = `${options.apiBaseUrl || API}/bot${token}`;
  const documentTimeoutMs = Math.min(Math.max(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000), 120_000);
  const fileAccess = options.fileAccess || { stat, openAsBlob };

  async function call(method, body = {}, signal) {
    const res = await fetch(`${base}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(body.timeout ? (body.timeout + 5) * 1000 : 35000)]) : AbortSignal.timeout(body.timeout ? (body.timeout + 5) * 1000 : 35000),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) {
      const msg = json.description || `Telegram API ${method} falhou`;
      const err = new Error(msg);
      err.code = json.error_code || "TELEGRAM";
      err.payload = json;
      throw err;
    }
    return json.result;
  }

  async function sendDocument(chatId, archivePath, extra = {}) {
    let fileStats;
    try {
      fileStats = await fileAccess.stat(archivePath);
    } catch {
      throw documentError("TELEGRAM_DOCUMENT_UNAVAILABLE", "O arquivo de backup não está disponível para envio.");
    }
    if (!fileStats.isFile()) {
      throw documentError("TELEGRAM_DOCUMENT_UNAVAILABLE", "O arquivo de backup não está disponível para envio.");
    }
    if (fileStats.size > (extra.maxDocumentBytes ?? MAX_DOCUMENT_BYTES)) {
      throw documentError("TELEGRAM_DOCUMENT_TOO_LARGE", "O arquivo de backup excede o tamanho permitido para envio.");
    }

    const form = new FormData();
    form.append("chat_id", String(chatId));
    let document;
    try {
      document = await fileAccess.openAsBlob(archivePath);
    } catch {
      throw documentError("TELEGRAM_DOCUMENT_UNAVAILABLE", "O arquivo de backup não está disponível para envio.");
    }
    form.append("document", document, basename(archivePath));
    if (extra.caption) form.append("caption", String(extra.caption).slice(0, 1_024));

    let response;
    try {
      response = await fetch(`${base}/sendDocument`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(documentTimeoutMs),
      });
    } catch (error) {
      throw classifyDocumentFailure(error);
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      if (response.status === 429 || payload?.error_code === 429) {
        throw documentError("TELEGRAM_RATE_LIMIT", "O Telegram limitou temporariamente o envio do documento.");
      }
      if (response.status === 401 || payload?.error_code === 401) {
        throw documentError("TELEGRAM_AUTH", "O Telegram recusou as credenciais do bot para envio do documento.");
      }
      throw documentError("TELEGRAM_API", "O Telegram recusou o envio do documento.");
    }

    const result = payload.result;
    if (
      !Number.isInteger(result?.message_id) ||
      (typeof result?.chat?.id !== "number" && typeof result?.chat?.id !== "string") ||
      typeof result?.document?.file_id !== "string"
    ) {
      throw documentError("TELEGRAM_INVALID_RESPONSE", "O Telegram confirmou o envio sem metadados válidos do documento.");
    }

    return {
      messageId: result.message_id,
      chatId: String(result.chat.id),
      document: {
        fileId: result.document.file_id,
        fileName: typeof result.document.file_name === "string" ? result.document.file_name : null,
        fileSize: Number.isSafeInteger(result.document.file_size) ? result.document.file_size : null,
      },
    };
  }

  return {
    getMe: () => call("getMe"),
    getUpdates: (opts = {}) =>
      call("getUpdates", {
        offset: opts.offset,
        timeout: opts.timeout ?? 25,
        allowed_updates: opts.allowed_updates ?? ["message", "callback_query"],
      }, opts.signal),
    sendMessage: (chatId, text, extra = {}) =>
      call("sendMessage", {
        chat_id: chatId,
        text: String(text).slice(0, 4090),
        parse_mode: extra.parse_mode || "HTML",
        reply_markup: extra.reply_markup,
        disable_web_page_preview: extra.disable_web_page_preview ?? true,
      }),
    answerCallbackQuery: (id, text) =>
      call("answerCallbackQuery", {
        callback_query_id: id,
        text: text ? String(text).slice(0, 200) : undefined,
      }),
    editMessageText: (chatId, messageId, text, extra = {}) =>
      call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: String(text).slice(0, 4090),
        parse_mode: extra.parse_mode || "HTML",
        reply_markup: extra.reply_markup,
      }),
    sendDocument,
  };
}
