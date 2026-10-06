import { Buffer } from "node:buffer";
import { Readable } from "node:stream";

const PREFIX = "/api/detector-atos";
const ROTAS = new Map([
  ["/health", "/api/health"],
  ["/publicacoes", "/api/publicacoes"],
  ["/buscar", "/api/buscar"],
  ["/atividade", "/api/atividade"],
  ["/automacao", "/api/automacao"],
  ["/resumo-diario", "/api/resumo-diario"],
  ["/graficos/por-mes", "/api/graficos/por-mes"],
  ["/graficos/por-tipo", "/api/graficos/por-tipo"],
]);

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function destinoPermitido(pathname) {
  const sufixo = pathname.slice(PREFIX.length) || "/health";
  if (sufixo === "/executar") return { rota: "/api/detectar-edicoes", binario: false, metodos: ["POST"] };
  if (sufixo === "/edicoes") return { rota: "/api/edicoes", binario: false, metodos: ["GET"] };
  const processar = sufixo.match(/^\/edicoes\/(\d+)\/processar$/);
  if (processar) return { rota: `/api/edicoes/${processar[1]}/processar`, binario: false, metodos: ["POST"] };
  const statusEdicao = sufixo.match(/^\/edicoes\/(\d+)\/live-status$/);
  if (statusEdicao) return { rota: `/api/edicoes/${statusEdicao[1]}/live-status`, binario: false, metodos: ["GET"] };
  const rota = ROTAS.get(sufixo);
  if (rota) return { rota, binario: false, metodos: ["GET"] };
  const arquivo = sufixo.match(/^\/edicoes\/(\d+)\/(pdf|texto)$/);
  if (!arquivo) return null;
  return { rota: `/edicoes/${arquivo[1]}/${arquivo[2]}`, binario: arquivo[2] === "pdf", metodos: ["GET"] };
}

function urlBaseSegura(valor) {
  try {
    const url = new URL(valor || "http://127.0.0.1:8010");
    if (!new Set(["http:", "https:"]).has(url.protocol)) return null;
    url.pathname = url.pathname.replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function createDetectorAtosHandler({
  fetchImpl = globalThis.fetch,
  baseUrl = process.env.DETECTOR_ATOS_URL || "http://127.0.0.1:8010",
  username = process.env.DETECTOR_ATOS_USER || "",
  password = process.env.DETECTOR_ATOS_PASSWORD || "",
  timeoutMs = 15_000,
} = {}) {
  return async function handleDetectorAtos(req, res) {
    const requisicao = new URL(req.url || PREFIX, "http://localhost");
    const destino = destinoPermitido(requisicao.pathname);
    const base = urlBaseSegura(baseUrl);
    if (!destino || !base) {
      sendJson(res, 404, { data: null, error: { message: "Recurso do detector não encontrado", code: "NOT_FOUND" } });
      return true;
    }
    if (!destino.metodos.includes(req.method || "GET")) {
      sendJson(res, 405, { data: null, error: { message: "Método não permitido", code: "METHOD_NOT_ALLOWED" } });
      return true;
    }

    const url = new URL(`${base.href.replace(/\/$/, "")}${destino.rota}`);
    url.search = requisicao.search;
    const headers = { Accept: destino.binario ? "application/pdf" : "application/json" };
    if (username || password) headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

    try {
      const resposta = await fetchImpl(url, { method: req.method, headers, signal: AbortSignal.timeout(timeoutMs) });
      if (destino.binario && resposta.ok && resposta.body) {
        res.statusCode = resposta.status;
        res.setHeader("Content-Type", resposta.headers.get("content-type") || "application/pdf");
        const tamanho = resposta.headers.get("content-length");
        if (tamanho) res.setHeader("Content-Length", tamanho);
        res.setHeader("Content-Disposition", resposta.headers.get("content-disposition") || "inline");
        Readable.fromWeb(resposta.body).pipe(res);
        return true;
      }

      const texto = await resposta.text();
      let data;
      try { data = texto ? JSON.parse(texto) : null; }
      catch { data = texto; }
      if (!resposta.ok) {
        sendJson(res, resposta.status, { data: null, error: { message: resposta.status === 401 ? "Credenciais do detector não configuradas" : "O detector recusou a consulta", code: resposta.status === 401 ? "DETECTOR_AUTH" : "DETECTOR_HTTP", detail: typeof data === "string" ? data.slice(0, 200) : undefined } });
        return true;
      }
      sendJson(res, 200, { data, error: null });
    } catch (error) {
      const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
      sendJson(res, 503, { data: null, error: { message: timeout ? "O detector demorou para responder" : "O serviço Detector de Atos está indisponível", code: timeout ? "DETECTOR_TIMEOUT" : "DETECTOR_OFFLINE" } });
    }
    return true;
  };
}

export const handleDetectorAtos = createDetectorAtosHandler();
