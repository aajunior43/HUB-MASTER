import { randomUUID, timingSafeEqual } from "node:crypto";
import { iaChat } from "./ia-service.mjs";

const ROTA = "/api/internal/detector-atos/ia/chat/completions";
const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function tokenValido(recebido, esperado) {
  const a = Buffer.from(String(recebido || "").replace(/^Bearer\s+/i, ""));
  const b = Buffer.from(String(esperado || ""));
  return b.length >= 32 && a.length === b.length && timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Corpo excede 1 MB"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); }
      catch { reject(Object.assign(new Error("JSON inválido"), { statusCode: 400 })); }
    });
    req.on("error", reject);
  });
}

export function createDetectorAtosIaHandler({
  token = process.env.DETECTOR_ATOS_INTERNAL_TOKEN || "",
  iaChatImpl = iaChat,
} = {}) {
  return async function handleDetectorAtosIa(req, res, db) {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;
    if (pathname !== ROTA) return false;
    if (req.method !== "POST") {
      sendJson(res, 405, { error: { message: "Método não permitido", code: "METHOD_NOT_ALLOWED" } });
      return true;
    }
    if (!tokenValido(req.headers?.authorization, token)) {
      sendJson(res, 401, { error: { message: "Integração interna não autorizada", code: "UNAUTHORIZED" } });
      return true;
    }

    try {
      const body = await readBody(req);
      const messages = Array.isArray(body.messages)
        ? body.messages.slice(0, 20).map((item) => ({ role: String(item?.role || "user"), content: String(item?.content || "").slice(0, 100_000) }))
        : [];
      if (!messages.length) {
        sendJson(res, 400, { error: { message: "Mensagens obrigatórias", code: "BAD_REQUEST" } });
        return true;
      }
      const resultado = await iaChatImpl({
        db,
        messages,
        temperatura: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.1,
        maxTokens: Math.min(8_000, Math.max(1, Number(body.max_tokens) || 2_048)),
        cache: false,
      });
      sendJson(res, 200, {
        id: `detector-${randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: resultado.model,
        choices: [{ index: 0, message: { role: "assistant", content: resultado.text }, finish_reason: "stop" }],
        usage: resultado.usage || {},
      });
    } catch (error) {
      const status = Number(error?.statusCode) || 503;
      sendJson(res, status, { error: { message: status < 500 ? error.message : "A IA da Prefeitura não está configurada ou disponível", code: status < 500 ? "BAD_REQUEST" : "PREFEITURA_IA_UNAVAILABLE" } });
    }
    return true;
  };
}

export const handleDetectorAtosIa = createDetectorAtosIaHandler();
