import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, createReadStream, createWriteStream, rmSync, mkdtempSync, readdirSync } from "node:fs";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
import archiver from "archiver";
import { createBackup } from "./backup.mjs";
import { openDatabase, runQuery, runRpc, UPLOADS_DIR } from "./db.mjs";
import { logger } from "./logger.mjs";
import { baixarDemonstrativosBb, listarDemonstrativosBb, removerDemonstrativosBb } from "./services/bb-demonstrativos.mjs";
import { autentiqueConfigurado, consultarContasAutentique, consultarDocumentoAutentique, criarDocumentoAutentique, gerenciarPastasAutentique, normalizarTelefoneAutentique, operarDocumentoAutentique, processarWebhookAutentique, statusDocumentoAutentique } from "./services/autentique.mjs";
import { agendarSincronizacaoPncp, atualizarDocumentosPncp, configuracaoPncp, sincronizarPncp } from "./services/pncp.mjs";
import { agendarSincronizacaoTransferegov, configuracaoTransferegov, sincronizarTransferegov } from "./services/transferegov.mjs";
import { agendarSincronizacaoTcePr, configuracaoTcePr, sincronizarTcePr } from "./services/tcepr.mjs";
import { agendarSincronizacaoSiconfi, calcularIndicadoresSiconfi, configuracaoSiconfi, coberturaSiconfi, sincronizarSiconfi } from "./services/siconfi.mjs";
import { chavePortalTransparencia, configuracaoTransparencia, consultarTransparenciaCnpj } from "./services/transparencia.mjs";
import { obterDossieFornecedor } from "./services/dossieFornecedor.mjs";
import { consultarRepassesFnde, sincronizarFnde, FNDE_URLS } from "./services/fnde.mjs";
import { consultarBeneficiosPorMunicipio, sincronizarBeneficiosSociais } from "./services/beneficiosSociais.mjs";
import { configuracaoSaude, consultarCnes, listarTiposCnes } from "./services/saude.mjs";
import { calcularAtualizacaoBcb, configuracaoBcb, consultarSerieBcb, listarSeriesBcb } from "./services/bcb.mjs";
import { buscarCatalogoComprasGov, configuracaoComprasGov, consultarPrecosComprasGov } from "./services/comprasgov.mjs";
import { handleDetectorAtos } from "./services/detector-atos.mjs";
import { handleDetectorAtosIa } from "./services/detector-atos-ia.mjs";

const MAX_BODY_BYTES = 30 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const SENSITIVE_ARG_KEYS = /senha|password|token|secret|api_key|base64|content/i;
const SLOW_REQUEST_MS = (() => {
  const value = Number(process.env.LOG_SLOW_REQUEST_MS || 1_000);
  return Number.isFinite(value) && value > 0 ? value : 1_000;
})();
const SESSION_COOKIE = "inaja_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const MAX_IA_DOCUMENT_TEXT = 60_000;
const MAX_IA_OCR_PAGES = 5;

function resolverExecutavelWindows(comando) {
  let atual = comando;
  for (let tentativa = 0; tentativa < 5 && /\.(cmd|bat)$/i.test(atual); tentativa += 1) {
    if (!existsSync(atual)) break;
    const script = readFileSync(atual, "utf8");
    const referencia = script.match(/"([^"\r\n]*pdftoppm\.(?:cmd|bat|exe))"/i)?.[1];
    if (!referencia) break;
    const base = path.dirname(atual);
    const caminho = referencia
      .replace(/%SCRIPT_DIR%/gi, "")
      .replace(/%~dp0/gi, "");
    atual = path.normalize(path.isAbsolute(caminho) ? caminho : path.resolve(base, caminho));
  }
  return atual;
}

function obterComandoPdfToPpm() {
  if (process.env.PDFTOPPM_PATH) {
    const configurado = process.env.PDFTOPPM_PATH;
    return process.platform === "win32" && path.isAbsolute(configurado) ? resolverExecutavelWindows(configurado) : configurado;
  }
  if (process.platform !== "win32") return "pdftoppm";
  try {
    const encontrado = execFileSync("where.exe", ["pdftoppm"], { encoding: "utf8", windowsHide: true })
      .split(/\r?\n/)
      .map((linha) => linha.trim())
      .find(Boolean);
    if (encontrado) return resolverExecutavelWindows(encontrado);
  } catch {
    // O executável padrão abaixo ainda pode ser encontrado pelo PATH do servidor.
  }
  return "pdftoppm.exe";
}

function textoLimitado(texto) {
  return String(texto || "").replace(/\u0000/g, "").trim().slice(0, MAX_IA_DOCUMENT_TEXT);
}

async function converterDocumentoParaTexto(arquivoPath, extensao, tempDir) {
  const soffice = process.env.LIBREOFFICE_PATH || (process.platform === "win32" ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe" : "soffice");
  const formato = [".xls", ".xlsx", ".ods"].includes(extensao) ? "csv" : "txt:Text";
  try {
    await executarConversao(soffice, ["--headless", "--convert-to", formato, "--outdir", tempDir, arquivoPath]);
    const convertido = readdirSync(tempDir).find((nome) => /\.(txt|csv)$/i.test(nome));
    return convertido ? textoLimitado(readFileSync(path.join(tempDir, convertido), "utf8")) : "";
  } catch {
    return "";
  }
}

async function extrairTextoPorOcrVisual(db, arquivosImagem) {
  const imagens = arquivosImagem.filter((arquivo) => existsSync(arquivo)).slice(0, MAX_IA_OCR_PAGES);
  if (!imagens.length) return "";
  const conteudo = [
    { type: "text", text: "Você é um OCR preciso. Extraia todo o texto legível destas páginas, mantendo números, datas, nomes e valores. Retorne somente o texto extraído, sem comentários nem formatação em Markdown." },
    ...imagens.map((arquivo) => ({ type: "image_url", image_url: { url: `data:image/png;base64,${readFileSync(arquivo).toString("base64")}` } })),
  ];
  const { iaChat } = await import("./services/ia-service.mjs");
  const resultado = await iaChat({ db, messages: [{ role: "user", content: conteudo }], temperatura: 0, maxTokens: 8000, cache: false });
  return textoLimitado(resultado.text);
}

async function extrairTextoDocumentoIa(db, arquivoPath, extensao, mime, tempDir) {
  if ([".txt", ".csv"].includes(extensao)) return { texto: textoLimitado(readFileSync(arquivoPath, "utf8")), origem: "texto" };

  const textoDireto = await converterDocumentoParaTexto(arquivoPath, extensao, tempDir);
  if (textoDireto.length >= 40) return { texto: textoDireto, origem: "texto" };

  let imagens = [];
  if (extensao === ".pdf") {
    const prefixo = path.join(tempDir, "pagina");
    const pdftoppm = obterComandoPdfToPpm();
    await executarConversao(pdftoppm, ["-f", "1", "-l", String(MAX_IA_OCR_PAGES), "-scale-to", "1600", "-png", arquivoPath, prefixo]);
    imagens = readdirSync(tempDir).filter((nome) => /^pagina-\d+\.png$/i.test(nome)).map((nome) => path.join(tempDir, nome));
  } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(extensao) || String(mime).startsWith("image/")) {
    imagens = [arquivoPath];
  }
  const textoOcr = await extrairTextoPorOcrVisual(db, imagens);
  if (!textoOcr) throw new Error("Não foi possível extrair texto deste documento.");
  return { texto: textoOcr, origem: "ocr" };
}

function executarConversao(programa, args, options = {}) {
  return new Promise((resolve, reject) => {
    const scriptWindows = process.platform === "win32" && /\.(cmd|bat)$/i.test(programa);
    execFile(programa, args, { windowsHide: true, timeout: options.timeout ?? 60000, shell: scriptWindows }, (erro) => erro ? reject(erro) : resolve());
  });
}

function lerDimensoesJpeg(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error("Imagem JPEG inválida");
  const marcadoresSof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let cursor = 2;
  while (cursor + 9 < buffer.length) {
    while (cursor < buffer.length && buffer[cursor] === 0xff) cursor += 1;
    const marcador = buffer[cursor++];
    if (!marcador || marcador === 0xd9 || marcador === 0xda) break;
    if (marcador === 0xd8 || (marcador >= 0xd0 && marcador <= 0xd7)) continue;
    if (cursor + 2 > buffer.length) break;
    const tamanho = buffer.readUInt16BE(cursor);
    if (marcadoresSof.has(marcador) && tamanho >= 7 && cursor + tamanho <= buffer.length) {
      return { altura: buffer.readUInt16BE(cursor + 3), largura: buffer.readUInt16BE(cursor + 5) };
    }
    cursor += tamanho;
  }
  throw new Error("Não foi possível identificar o tamanho da página renderizada");
}

export async function comprimirPdfRasterizado(arquivoPath, original, nivel, tempDir) {
  const configuracao = nivel === "maxima" ? { dpi: 110, qualidade: 55 } : { dpi: 144, qualidade: 72 };
  const prefixo = path.join(tempDir, "pagina");
  const pdftoppm = obterComandoPdfToPpm();
  await executarConversao(pdftoppm, [
    "-jpeg",
    "-jpegopt",
    `quality=${configuracao.qualidade}`,
    "-r",
    String(configuracao.dpi),
    arquivoPath,
    prefixo,
  ], { timeout: 180000 });

  const paginas = readdirSync(tempDir)
    .filter((nome) => /^pagina-\d+\.jpe?g$/i.test(nome))
    .sort((a, b) => Number(a.match(/(\d+)/)?.[1] || 0) - Number(b.match(/(\d+)/)?.[1] || 0));
  if (!paginas.length) throw new Error("Não foi possível renderizar nenhuma página do PDF");

  const { PDFDocument } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  for (const nome of paginas) {
    const jpeg = readFileSync(path.join(tempDir, nome));
    const dimensoes = lerDimensoesJpeg(jpeg);
    const page = doc.addPage([
      dimensoes.largura * 72 / configuracao.dpi,
      dimensoes.altura * 72 / configuracao.dpi,
    ]);
    const image = await doc.embedJpg(jpeg);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  const resultado = Buffer.from(await doc.save({ useObjectStreams: true, updateMetadata: false }));
  return { bytes: resultado.length < original.length ? resultado : original, paginas: paginas.length, rasterizado: resultado.length < original.length };
}

async function gerarPreviewArquivo(arquivoPath, caminhoRelativo) {
  const extensao = path.extname(arquivoPath).toLowerCase();
  if (![".pdf", ".doc", ".docx", ".odt"].includes(extensao)) return null;
  const prefixo = `${arquivoPath}.preview`;
  const previewPath = `${prefixo}-1.png`;
  const pdftoppm = obterComandoPdfToPpm();
  const soffice = process.env.LIBREOFFICE_PATH || (process.platform === "win32" ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe" : "soffice");
  let pdfPath = arquivoPath;
  let tempDir = null;
  try {
    if (extensao !== ".pdf") {
      tempDir = path.join(tmpdir(), `inaja-preview-${randomBytes(8).toString("hex")}`);
      mkdirSync(tempDir, { recursive: true });
      await executarConversao(soffice, ["--headless", "--convert-to", "pdf", "--outdir", tempDir, arquivoPath]);
      pdfPath = path.join(tempDir, `${path.basename(arquivoPath, extensao)}.pdf`);
      if (!existsSync(pdfPath)) return null;
    }
    await executarConversao(pdftoppm, ["-f", "1", "-l", "1", "-scale-to", "480", "-png", pdfPath, prefixo]);
    return existsSync(previewPath) ? `${caminhoRelativo}.preview-1.png` : null;
  } catch {
    return null;
  } finally {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  }
}
const PUBLIC_RPCS = new Set([
  "usuario_status",
  "usuario_login",
  "usuario_set_senha",
  "usuario_solicitar_recuperacao",
  "usuario_validar_codigo_recuperacao",
  "usuario_resetar_senha",
]);
const sessions = new Map();

let db;

function requestIdFrom(req) {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  return /^[A-Za-z0-9._-]{8,64}$/.test(incoming) ? incoming : randomBytes(8).toString("hex");
}

function requestClientIp(req) {
  return String(req.socket?.remoteAddress || "desconhecido").slice(0, 80) || "desconhecido";
}

function durationBucket(durationMs) {
  if (durationMs < 100) return "<100ms";
  if (durationMs < 500) return "100-499ms";
  if (durationMs < 1_000) return "500-999ms";
  if (durationMs < 5_000) return "1-4s";
  return ">=5s";
}

function requestLogLevel(statusCode, durationMs) {
  if (statusCode >= 500) return "error";
  if (statusCode >= 400 || durationMs >= SLOW_REQUEST_MS) return "warn";
  return "info";
}

function getDb() {
  if (!db) db = openDatabase();
  return db;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function readCookie(req, name) {
  const value = req.headers.cookie;
  if (!value) return null;
  for (const part of value.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

function wantsSecureCookie(req) {
  const forced = String(process.env.INAJA_COOKIE_SECURE || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(forced)) return true;
  if (["0", "false", "no", "off"].includes(forced)) return false;
  if (!req) return false;
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  return proto === "https" || Boolean(req.socket?.encrypted);
}

function sessionCookieFlags(req) {
  const secure = wantsSecureCookie(req) ? "; Secure" : "";
  return `HttpOnly; SameSite=Strict; Path=/${secure}`;
}

function applySecurityHeaders(req, res) {
  if (res.getHeader("X-Content-Type-Options")) return;
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https:; object-src 'none'",
  );
  if (wantsSecureCookie(req)) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function setSessionCookie(res, token, req) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; ${sessionCookieFlags(req)}; Max-Age=${SESSION_DURATION_MS / 1000}`);
}

function clearSessionCookie(res, req) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${sessionCookieFlags(req)}; Max-Age=0`);
}

function createSession(res, username, req) {
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { username, createdAt: Date.now(), lastSeenAt: Date.now(), expiresAt: Date.now() + SESSION_DURATION_MS });
  setSessionCookie(res, token, req);
}

function resolveSession(req, database) {
  const token = readCookie(req, SESSION_COOKIE);
  const session = token ? sessions.get(token) : null;
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }
  const user = database.prepare("SELECT username, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
  if (!user?.ativo) {
    sessions.delete(token);
    return null;
  }
  session.lastSeenAt = Date.now();
  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  return { token, username: user.username };
}

function redactArgs(args, seen = new WeakSet()) {
  if (args == null || typeof args !== "object") return args;
  if (seen.has(args)) return "[circular]";
  seen.add(args);
  if (Array.isArray(args)) return args.slice(0, 25).map((value) => redactArgs(value, seen));
  return Object.fromEntries(Object.entries(args).slice(0, 50).map(([key, value]) => [
    key,
    SENSITIVE_ARG_KEYS.test(key) ? (typeof value === "string" ? `[redacted ${value.length} chars]` : "[redacted]") : redactArgs(value, seen),
  ]));
}

function sessaoAssinaturas(req, database) {
  const session = resolveSession(req, database);
  const usuario = session && database.prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
  const permitido = usuario?.ativo && (usuario.is_admin || database.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = 'autentique'").get(usuario.id));
  return permitido ? session : null;
}

function sessaoModulo(req, database, modulo) {
  const session = resolveSession(req, database);
  const usuario = session && database.prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
  const permitido = usuario?.ativo && (usuario.is_admin || database.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = ?").get(usuario.id, modulo));
  return permitido ? { ...session, isAdmin: Boolean(usuario.is_admin) } : null;
}

function sessaoQualquerModulo(req, database, modulos) {
  for (const modulo of modulos) {
    const session = sessaoModulo(req, database, modulo);
    if (session) return session;
  }
  return null;
}

function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (c) => {
      total += c.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error(`Corpo da requisição excede ${Math.floor(maxBytes / (1024 * 1024))} MB`), { code: "PAYLOAD_TOO_LARGE", statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function readRawBody(req, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error("Webhook excede o tamanho permitido"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function webhookSignatureValida(raw, assinatura, segredo) {
  const recebido = String(assinatura || "").replace(/^sha256=/i, "").trim().toLowerCase();
  const calculado = createHmac("sha256", segredo).update(raw).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(recebido)) return false;
  return timingSafeEqual(Buffer.from(recebido, "hex"), Buffer.from(calculado, "hex"));
}

function safePath(name) {
  const clean = String(name || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.split("/").some((segmento) => segmento === ".." || segmento === ".")) return null;
  const destino = path.resolve(UPLOADS_DIR, clean);
  return destino.startsWith(`${path.resolve(UPLOADS_DIR)}${path.sep}`) ? destino : null;
}

const MODULOS_UPLOAD = new Set(["solicitacoes", "tarefas", "pedido-dotacao", "gestao-documentos"]);

function usuarioDaSessao(database, session) {
  if (!session) return null;
  return database.prepare("SELECT id, username, is_admin, is_contador, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username) || null;
}

function usuarioTemModuloApi(database, usuario, modulo) {
  return Boolean(usuario?.ativo && (usuario.is_admin || database.prepare(
    "SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = ?",
  ).get(usuario.id, modulo)));
}

function moduloUploadValido(body, rel) {
  const modulo = String(body.module || "").trim();
  if (!MODULOS_UPLOAD.has(modulo)) return null;
  if (modulo === "gestao-documentos") {
    return rel.startsWith("documentos/") || rel.startsWith("arquivos/") ? modulo : null;
  }
  return rel.startsWith(`anexos/${modulo}/`) ? modulo : null;
}

function podeLerUpload(database, usuario, rel) {
  if (!usuario?.ativo) return false;
  if (usuario.is_admin) return true;

  const anexoDocumento = database.prepare(`SELECT d.autor_id
    FROM gd_anexos a JOIN gd_documentos d ON d.id = a.documento_id
    WHERE a.caminho = ?`).get(rel);
  if (anexoDocumento) {
    if (anexoDocumento.autor_id === usuario.id) return true;
    return Boolean(database.prepare(`SELECT 1 FROM gd_anexos a
      JOIN gd_documento_destinatarios dd ON dd.documento_id = a.documento_id
      JOIN gd_usuario_setor us ON us.setor_id = dd.setor_id
      WHERE a.caminho = ? AND us.usuario_id = ?`).get(rel, usuario.id));
  }

  const arquivoCompartilhado = database.prepare(
    "SELECT 1 FROM gd_arquivos WHERE caminho = ? OR preview_caminho = ?",
  ).get(rel, rel);
  if (arquivoCompartilhado) return usuarioTemModuloApi(database, usuario, "gestao-documentos");

  const referencias = [
    ["solicitacoes", "solicitacoes"],
    ["tarefas", "tarefas"],
    ["pedidos_dotacao", "pedido-dotacao"],
  ];
  for (const [tabela, modulo] of referencias) {
    if (database.prepare(`SELECT 1 FROM ${tabela}, json_each(CASE WHEN json_valid(anexos) THEN anexos ELSE '[]' END)
      WHERE json_extract(json_each.value, '$.path') = ? LIMIT 1`).get(rel)) {
      return usuarioTemModuloApi(database, usuario, modulo);
    }
  }

  const controle = database.prepare("SELECT usuario_id, modulo FROM uploads_controle WHERE caminho = ?").get(rel);
  return Boolean(controle && controle.usuario_id === usuario.id && usuarioTemModuloApi(database, usuario, controle.modulo));
}

/**
 * Connect middleware compatible handler for /api/*
 */
export async function handleApi(req, res, database) {
  const startedAt = performance.now();
  const requestId = requestIdFrom(req);
  const clientIp = requestClientIp(req);
  const requestLog = logger.child({ component: "api", requestId, method: req.method, path: (req.url || "/").split("?")[0], clientIp });
  let requestContext = {};
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    const durationMs = Math.round(performance.now() - startedAt);
    const statusCode = Number(res.statusCode || 0);
    const outcome = statusCode >= 500 ? "server_error" : statusCode >= 400 ? "client_error" : "success";
    const level = requestLogLevel(statusCode, durationMs);
    requestLog[level]("api.request.completed", {
      statusCode,
      outcome,
      durationMs,
      durationBucket: durationBucket(durationMs),
      slow: durationMs >= SLOW_REQUEST_MS,
      ...requestContext,
    });
  });
  try {
    const activeDb = database || getDb();
    const url = new URL(req.url || "/", "http://localhost");
    const pathname = url.pathname;

    if (await handleDetectorAtosIa(req, res, activeDb)) return true;

    if (pathname === "/api/backup/download" && req.method === "GET") {
      const session = resolveSession(req, activeDb);
      const admin = session && activeDb.prepare("SELECT is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
      if (!admin?.is_admin || !admin.ativo) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado — apenas administradores", code: "FORBIDDEN" } });
        return true;
      }
      let archivePath;
      try {
        try { activeDb.exec("PRAGMA wal_checkpoint(PASSIVE);"); } catch { /* opcional */ }
        const backup = createBackup();
        archivePath = path.join(tmpdir(), `inaja-backup-${backup.id}.zip`);
        await new Promise((resolve, reject) => {
          const output = createWriteStream(archivePath);
          const archive = archiver("zip", { zlib: { level: 9 } });
          output.on("close", resolve);
          output.on("error", reject);
          archive.on("error", reject);
          archive.pipe(output);
          archive.directory(backup.path, false);
          archive.finalize();
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="inaja-backup-${backup.id}.zip"`);
        createReadStream(archivePath).on("close", () => rmSync(archivePath, { force: true })).pipe(res);
      } catch (error) {
        if (archivePath) rmSync(archivePath, { force: true });
        sendJson(res, 500, { data: null, error: { message: String(error?.message || error), code: error?.code || "BACKUP_DOWNLOAD" } });
      }
      return true;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (pathname.startsWith("/api/detector-atos")) {
      const session = sessaoModulo(req, activeDb, "detector-atos");
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao módulo Detector de Atos", code: "FORBIDDEN" } });
        return true;
      }
      return handleDetectorAtos(req, res);
    }

    if (pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, { ok: true, mode: "local-sqlite", db: "data/inaja.sqlite" });
      return true;
    }

    if (pathname === "/api/autentique/webhook" && req.method === "POST") {
      const segredo = activeDb.prepare("SELECT valor FROM configuracoes WHERE chave = 'autentique_webhook_secret'").get()?.valor || process.env.AUTENTIQUE_WEBHOOK_SECRET || "";
      if (!segredo) {
        sendJson(res, 503, { received: false, error: { message: "Webhook não configurado", code: "WEBHOOK_NOT_CONFIGURED" } });
        return true;
      }
      const raw = await readRawBody(req);
      if (!webhookSignatureValida(raw, req.headers["x-autentique-signature"], segredo)) {
        sendJson(res, 401, { received: false, error: { message: "Assinatura do webhook inválida", code: "INVALID_SIGNATURE" } });
        return true;
      }
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch {
        sendJson(res, 400, { received: false, error: { message: "JSON inválido", code: "BAD_REQUEST" } });
        return true;
      }
      const evento = payload?.event || payload;
      const eventId = String(evento?.id || payload?.id || "").trim();
      const tipo = String(evento?.type || "unknown");
      const objeto = evento?.data?.object || evento?.data || {};
      const documento = typeof objeto?.document === "string" ? objeto.document : objeto?.document?.id || (tipo.startsWith("document.") ? objeto?.id : null);
      if (!eventId) {
        sendJson(res, 400, { received: false, error: { message: "Evento sem identificador", code: "BAD_REQUEST" } });
        return true;
      }
      const insert = activeDb.prepare("INSERT OR IGNORE INTO autentique_webhook_eventos (id, tipo, documento_id, payload) VALUES (?, ?, ?, ?)").run(eventId, tipo, documento || null, raw.toString("utf8").slice(0, 250_000));
      sendJson(res, 202, { received: true, duplicate: insert.changes === 0 });
      if (insert.changes > 0) {
        setImmediate(async () => {
          try {
            await processarWebhookAutentique(activeDb, payload);
            activeDb.prepare("UPDATE autentique_webhook_eventos SET processado_em = datetime('now'), erro = NULL WHERE id = ?").run(eventId);
          } catch (error) {
            activeDb.prepare("UPDATE autentique_webhook_eventos SET processado_em = datetime('now'), erro = ? WHERE id = ?").run(String(error?.message || error).slice(0, 500), eventId);
            requestLog.error("autentique.webhook.processing_failed", { eventId, tipo, error });
          }
        });
      }
      return true;
    }

    if (pathname === "/api/demonstrativos-bb/arquivos" && req.method === "GET") {
      if (!resolveSession(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      sendJson(res, 200, { data: listarDemonstrativosBb(), error: null });
      return true;
    }

    if (pathname === "/api/demonstrativos-bb/baixar" && req.method === "POST") {
      if (!resolveSession(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const data = await baixarDemonstrativosBb(body);
      sendJson(res, 200, { data, error: null });
      return true;
    }

    if (pathname === "/api/demonstrativos-bb/remover" && req.method === "POST") {
      if (!resolveSession(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      sendJson(res, 200, { data: removerDemonstrativosBb(body.paths), error: null });
      return true;
    }

    if (pathname === "/api/autentique/config" && req.method === "GET") {
      const session = resolveSession(req, activeDb);
      const usuario = session && activeDb.prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
      const permitido = usuario?.ativo && (usuario.is_admin || activeDb.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = 'autentique'").get(usuario.id));
      if (!permitido) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const tokensAtivos = Number(activeDb.prepare("SELECT COUNT(*) AS total FROM autentique_tokens WHERE ativo = 1").get().total) + (process.env.AUTENTIQUE_API_TOKEN ? 1 : 0);
      sendJson(res, 200, { data: { configurado: autentiqueConfigurado(activeDb), limiteMb: 20, tokensAtivos }, error: null });
      return true;
    }

    if (pathname === "/api/autentique/contas" && req.method === "GET") {
      const session = resolveSession(req, activeDb);
      const usuario = session && activeDb.prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
      const permitido = usuario?.ativo && (usuario.is_admin || activeDb.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = 'autentique'").get(usuario.id));
      if (!permitido) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      sendJson(res, 200, { data: await consultarContasAutentique(activeDb), error: null });
      return true;
    }

    if (pathname === "/api/autentique/enviar" && req.method === "POST") {
      const session = resolveSession(req, activeDb);
      const usuario = session && activeDb.prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
      const permitido = usuario?.ativo && (usuario.is_admin || activeDb.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = 'autentique'").get(usuario.id));
      if (!permitido) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const nome = String(body.nome || "").trim().slice(0, 180);
      const mensagem = String(body.mensagem || "").trim().slice(0, 1000);
      const signatarios = Array.isArray(body.signatarios)
        ? body.signatarios.map((item) => ({
          nome: String(item?.nome || "").trim().slice(0, 120),
          canal: item?.canal === "whatsapp" || item?.canal === "sms" ? item.canal : item?.canal === "link" ? "link" : "email",
          email: String(item?.email || "").trim().toLowerCase(),
          phone: normalizarTelefoneAutentique(item?.phone) || "",
        }))
        : [];
      const conteudo = Buffer.from(String(body.contentBase64 || ""), "base64");
      const signatariosInvalidos = signatarios.some((item) => item.canal === "whatsapp" || item.canal === "sms"
        ? !normalizarTelefoneAutentique(item.phone)
        : item.canal === "link" ? !item.nome : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email));
      if (!nome || !signatarios.length || signatarios.length > 20 || signatariosInvalidos) {
        sendJson(res, 400, { data: null, error: { message: "Informe até 20 signatários com e-mail válido ou telefone internacional (ex.: +55 44 99999-9999).", code: "BAD_REQUEST" } });
        return true;
      }
      const arquivoPdf = body.mime === "application/pdf" || String(body.arquivoNome || "").toLowerCase().endsWith(".pdf");
      if (!conteudo.length || conteudo.length > MAX_UPLOAD_BYTES || !arquivoPdf || conteudo.subarray(0, 5).toString("ascii") !== "%PDF-") {
        sendJson(res, 400, { data: null, error: { message: "Envie um arquivo PDF de até 20 MB.", code: "INVALID_FILE" } });
        return true;
      }
      const opcoes = {
        refusable: body.opcoes?.refusable !== false,
        sortable: body.opcoes?.sortable === true,
        stop_on_rejected: body.opcoes?.stop_on_rejected === true,
        scrolling_required: body.opcoes?.scrolling_required === true,
        ignore_cpf: body.opcoes?.ignore_cpf === true,
        notification_finished: body.opcoes?.notification_finished !== false,
        notification_signed: body.opcoes?.notification_signed !== false,
      };
      const { resultado: documento, tokenId } = await criarDocumentoAutentique({ db: activeDb, nome, mensagem, signatarios, arquivo: conteudo, mime: "application/pdf", sandbox: body.sandbox === true, opcoes });
      const id = randomBytes(16).toString("hex");
      const link = documento.signatures?.find((item) => item?.link?.short_link)?.link?.short_link || null;
      activeDb.prepare(
        "INSERT INTO autentique_envios (id, autentique_id, documento_nome, signatario_nome, signatario_phone, signatarios_json, status, assinatura_link, sandbox, criado_por, token_id, arquivo_original_url, arquivo_assinado_url, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).run(id, documento.id, nome, signatarios[0].nome || signatarios[0].email || signatarios[0].phone, signatarios[0].email || signatarios[0].phone, JSON.stringify(signatarios), "aguardando_assinaturas", link, body.sandbox === true ? 1 : 0, session.username, tokenId, documento.files?.original || null, documento.files?.signed || null, documento.created_at || new Date().toISOString(), new Date().toISOString());
      sendJson(res, 201, { data: { id, ...documento, status: "aguardando_assinaturas" }, error: null });
      return true;
    }

    if (pathname === "/api/autentique/sincronizar" && req.method === "POST") {
      const session = resolveSession(req, activeDb);
      const usuario = session && activeDb.prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
      const permitido = usuario?.ativo && (usuario.is_admin || activeDb.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = 'autentique'").get(usuario.id));
      if (!permitido) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const envio = activeDb.prepare("SELECT * FROM autentique_envios WHERE id = ?").get(String(body.id || ""));
      if (!envio?.autentique_id) {
        sendJson(res, 404, { data: null, error: { message: "Envio não encontrado.", code: "NOT_FOUND" } });
        return true;
      }
      const { documento, tokenId } = await consultarDocumentoAutentique(envio.autentique_id, { db: activeDb, tokenId: envio.token_id });
      const status = statusDocumentoAutentique(documento);
      const link = documento.signatures?.find((item) => item?.link?.short_link)?.link?.short_link || envio.assinatura_link;
      activeDb.prepare("UPDATE autentique_envios SET status = ?, assinatura_link = ?, token_id = ?, arquivo_original_url = ?, arquivo_assinado_url = ?, atualizado_em = ? WHERE id = ?").run(status, link, tokenId, documento.files?.original || null, documento.files?.signed || null, new Date().toISOString(), envio.id);
      sendJson(res, 200, { data: { ...documento, status, assinatura_link: link }, error: null });
      return true;
    }

    if (pathname === "/api/autentique/documento" && req.method === "POST") {
      if (!sessaoAssinaturas(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const envio = activeDb.prepare("SELECT * FROM autentique_envios WHERE id = ?").get(String(body.id || ""));
      if (!envio?.autentique_id) {
        sendJson(res, 404, { data: null, error: { message: "Envio não encontrado.", code: "NOT_FOUND" } });
        return true;
      }
      const { documento } = await consultarDocumentoAutentique(envio.autentique_id, { db: activeDb, tokenId: envio.token_id });
      sendJson(res, 200, { data: documento, error: null });
      return true;
    }

    if (pathname === "/api/autentique/operar" && req.method === "POST") {
      if (!sessaoAssinaturas(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const envio = activeDb.prepare("SELECT * FROM autentique_envios WHERE id = ?").get(String(body.id || ""));
      if (!envio?.autentique_id) {
        sendJson(res, 404, { data: null, error: { message: "Envio não encontrado.", code: "NOT_FOUND" } });
        return true;
      }
      const acao = String(body.acao || "");
      const permitidas = new Set(["editar", "excluir", "assinar", "adicionar_signatario", "remover_signatario", "reenviar", "criar_link", "mover_pasta"]);
      if (!permitidas.has(acao)) {
        sendJson(res, 400, { data: null, error: { message: "Operação inválida.", code: "BAD_REQUEST" } });
        return true;
      }
      let dados = body.dados && typeof body.dados === "object" ? body.dados : {};
      if (acao === "editar") {
        dados = {
          name: String(dados.name || envio.documento_nome).trim().slice(0, 180),
          message: String(dados.message || "").trim().slice(0, 1000),
          refusable: dados.refusable !== false,
          sortable: dados.sortable === true,
          stop_on_rejected: dados.stop_on_rejected === true,
          scrolling_required: dados.scrolling_required === true,
          ignore_cpf: dados.ignore_cpf === true,
          deadline_at: dados.deadline_at ? new Date(dados.deadline_at).toISOString() : null,
        };
      }
      if (acao === "adicionar_signatario") {
        const canal = dados.canal === "whatsapp" || dados.canal === "sms" ? dados.canal : dados.canal === "link" ? "link" : "email";
        const email = String(dados.email || "").trim().toLowerCase();
        const phone = normalizarTelefoneAutentique(dados.phone) || "";
        const name = String(dados.name || "").trim().slice(0, 120);
        if ((canal === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || ((canal === "whatsapp" || canal === "sms") && !phone) || (canal === "link" && !name)) {
          sendJson(res, 400, { data: null, error: { message: "Informe os dados válidos do signatário.", code: "BAD_REQUEST" } });
          return true;
        }
        dados = canal === "email" ? { email, action: "SIGN" } : canal === "whatsapp" || canal === "sms"
          ? { phone, delivery_method: canal === "sms" ? "DELIVERY_METHOD_SMS" : "DELIVERY_METHOD_WHATSAPP", action: "SIGN" }
          : { name, delivery_method: "DELIVERY_METHOD_LINK", action: "SIGN" };
      }
      if (["remover_signatario", "criar_link"].includes(acao)) dados = { public_id: String(dados.public_id || "") };
      if (acao === "reenviar") dados = { public_ids: Array.isArray(dados.public_ids) ? dados.public_ids.map(String).filter(Boolean).slice(0, 20) : [] };
      if (acao === "mover_pasta") dados = { folder_id: dados.folder_id ? String(dados.folder_id) : null, current_folder_id: envio.pasta_id || null };
      const operacao = await operarDocumentoAutentique({ db: activeDb, tokenId: envio.token_id, acao, documentoId: envio.autentique_id, dados });
      if (acao === "excluir") {
        activeDb.prepare("UPDATE autentique_envios SET status = 'excluido', atualizado_em = ? WHERE id = ?").run(new Date().toISOString(), envio.id);
      } else {
        const { documento, tokenId } = await consultarDocumentoAutentique(envio.autentique_id, { db: activeDb, tokenId: operacao.tokenId || envio.token_id });
        const status = statusDocumentoAutentique(documento);
        const link = documento.signatures?.find((item) => item?.link?.short_link)?.link?.short_link || envio.assinatura_link;
        const signatariosJson = JSON.stringify((documento.signatures || []).map((item) => ({
          nome: item.name || item.user?.name || "",
          canal: item.delivery_method === "DELIVERY_METHOD_WHATSAPP" ? "whatsapp" : item.delivery_method === "DELIVERY_METHOD_SMS" ? "sms" : item.delivery_method === "DELIVERY_METHOD_LINK" ? "link" : "email",
          email: item.email || item.user?.email || "",
          phone: item.user?.phone || "",
        })));
        activeDb.prepare("UPDATE autentique_envios SET documento_nome = ?, signatarios_json = ?, status = ?, assinatura_link = ?, token_id = ?, arquivo_original_url = ?, arquivo_assinado_url = ?, atualizado_em = ? WHERE id = ?")
          .run(documento.name || envio.documento_nome, signatariosJson, status, link, tokenId, documento.files?.original || envio.arquivo_original_url, documento.files?.signed || envio.arquivo_assinado_url, new Date().toISOString(), envio.id);
        if (acao === "mover_pasta") activeDb.prepare("UPDATE autentique_envios SET pasta_id = ? WHERE id = ?").run(dados.folder_id || null, envio.id);
      }
      sendJson(res, 200, { data: operacao.resultado, error: null });
      return true;
    }

    if (pathname === "/api/autentique/pastas" && req.method === "POST") {
      if (!sessaoAssinaturas(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const acao = String(body.acao || "listar");
      const nome = String(body.nome || "").trim().slice(0, 120);
      if (acao === "criar" && !nome) {
        sendJson(res, 400, { data: null, error: { message: "Informe o nome da pasta.", code: "BAD_REQUEST" } });
        return true;
      }
      const envio = body.envioId ? activeDb.prepare("SELECT token_id FROM autentique_envios WHERE id = ?").get(String(body.envioId)) : null;
      const resultado = await gerenciarPastasAutentique({ db: activeDb, tokenId: envio?.token_id || (body.tokenId ? String(body.tokenId) : null), acao, id: String(body.id || ""), nome });
      sendJson(res, 200, { data: resultado.resultado, error: null });
      return true;
    }

    if (pathname === "/api/pncp/status" && req.method === "GET") {
      const session = sessaoModulo(req, activeDb, "pncp");
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const config = configuracaoPncp(activeDb);
      const sincronizacaoAgendada = agendarSincronizacaoPncp(activeDb);
      const totais = Object.fromEntries(activeDb.prepare("SELECT tipo, COUNT(*) AS total FROM pncp_registros GROUP BY tipo").all().map((item) => [item.tipo, Number(item.total)]));
      const ultima = activeDb.prepare("SELECT * FROM pncp_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get() || null;
      sendJson(res, 200, { data: { config, totais, ultima, isAdmin: session.isAdmin, sincronizacaoAutomatica: sincronizacaoAgendada || ultima?.status === "executando" }, error: null });
      return true;
    }

    if (pathname === "/api/pncp/sincronizar" && req.method === "POST") {
      const session = sessaoModulo(req, activeDb, "pncp");
      if (!session?.isAdmin) {
        sendJson(res, 403, { data: null, error: { message: "Apenas administradores podem sincronizar o PNCP.", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const body = (await readBody(req)) || {};
        const config = configuracaoPncp(activeDb);
        const resultado = await sincronizarPncp(activeDb, { cnpj: config.cnpj, anos: Array.isArray(body.anos) ? body.anos : config.anos });
        sendJson(res, 200, { data: resultado, error: null });
      } catch (erro) {
        sendJson(res, 502, { data: null, error: { message: erro?.message || "Não foi possível sincronizar o PNCP.", code: "PNCP_SYNC_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/pncp/registros" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "pncp")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const tipo = String(url.searchParams.get("tipo") || "contratacao");
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 100);
      const ano = Number(url.searchParams.get("ano") || 0);
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const porPagina = 30;
      const where = ["tipo = ?"];
      const params = [tipo];
      if (busca) {
        where.push("(objeto LIKE ? OR titulo LIKE ? OR numero LIKE ? OR processo LIKE ? OR fornecedor_nome LIKE ? OR chave_pncp LIKE ?)");
        params.push(...Array(6).fill(`%${busca}%`));
      }
      if (ano) { where.push("ano = ?"); params.push(ano); }
      const filtro = where.join(" AND ");
      const total = Number(activeDb.prepare(`SELECT COUNT(*) AS total FROM pncp_registros WHERE ${filtro}`).get(...params).total);
      const rows = activeDb.prepare(`SELECT id, tipo, chave_pncp, titulo, objeto, numero, ano, processo, modalidade, situacao, valor, fornecedor_nome, fornecedor_cnpj, data_publicacao, data_atualizacao, vigencia_inicio, vigencia_fim, url FROM pncp_registros WHERE ${filtro} ORDER BY COALESCE(data_publicacao, data_atualizacao, sincronizado_em) DESC LIMIT ? OFFSET ?`).all(...params, porPagina, (pagina - 1) * porPagina);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina }, error: null });
      return true;
    }

    if (pathname === "/api/pncp/detalhe" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "pncp")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const id = String(url.searchParams.get("id") || "");
      const registro = activeDb.prepare("SELECT * FROM pncp_registros WHERE id = ?").get(id);
      if (!registro) {
        sendJson(res, 404, { data: null, error: { message: "Registro não encontrado.", code: "NOT_FOUND" } });
        return true;
      }
      let aviso = null;
      if (url.searchParams.get("atualizar") === "1") {
        try { await atualizarDocumentosPncp(activeDb, id); } catch (erro) { aviso = String(erro?.message || erro); }
      }
      const documentos = activeDb.prepare("SELECT * FROM pncp_documentos WHERE registro_id = ? ORDER BY data_publicacao DESC, titulo").all(id);
      const vinculos = activeDb.prepare("SELECT * FROM pncp_vinculos WHERE registro_id = ? ORDER BY criado_em DESC").all(id);
      sendJson(res, 200, { data: { ...registro, raw: JSON.parse(registro.raw_json || "{}"), documentos, vinculos, aviso }, error: null });
      return true;
    }

    if (pathname === "/api/pncp/pendencias" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "pncp")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const empenhos = activeDb.prepare(`SELECT e.id, e.numero_empenho, e.ano_empenho, e.licitacao, e.num_processo, e.nome_credor, e.valor_empenhado_bruto FROM empenhos_orcamentarios e WHERE COALESCE(e.licitacao, '') != '' AND NOT EXISTS (SELECT 1 FROM pncp_vinculos v WHERE v.entidade_tipo = 'empenho' AND v.entidade_id = e.id) ORDER BY e.ano_empenho DESC, e.data DESC LIMIT 100`).all();
      const semVinculo = activeDb.prepare(`SELECT id, tipo, chave_pncp, objeto, numero, ano, processo, valor, fornecedor_nome FROM pncp_registros r WHERE NOT EXISTS (SELECT 1 FROM pncp_vinculos v WHERE v.registro_id = r.id) ORDER BY COALESCE(data_publicacao, data_atualizacao) DESC LIMIT 100`).all();
      const vencendo = activeDb.prepare(`SELECT id, chave_pncp, objeto, numero, fornecedor_nome, vigencia_fim, valor FROM pncp_registros WHERE tipo = 'contrato' AND date(vigencia_fim) BETWEEN date('now') AND date('now', '+60 days') ORDER BY date(vigencia_fim)`).all();
      sendJson(res, 200, { data: { empenhos, semVinculo, vencendo }, error: null });
      return true;
    }

    if (pathname === "/api/compras-gov/config" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "compras-gov")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      sendJson(res, 200, { data: configuracaoComprasGov(), error: null });
      return true;
    }

    if (pathname === "/api/compras-gov/catalogo" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "compras-gov")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const dados = await buscarCatalogoComprasGov({
          tipo: url.searchParams.get("tipo") || "material",
          busca: url.searchParams.get("busca") || "",
          codigo: url.searchParams.get("codigo") || "",
          pagina: url.searchParams.get("pagina") || 1,
          tamanhoPagina: url.searchParams.get("tamanhoPagina") || 30,
        });
        sendJson(res, 200, { data: dados, error: null });
      } catch (erro) {
        sendJson(res, Number(erro?.statusCode) || 502, { data: null, error: { message: erro?.message || "Não foi possível consultar o catálogo do Compras.gov.br.", code: erro?.code || "COMPRAS_GOV_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/compras-gov/precos" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "compras-gov")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const dados = await consultarPrecosComprasGov({
          tipo: url.searchParams.get("tipo") || "material",
          codigo: url.searchParams.get("codigo") || url.searchParams.get("codigoItemCatalogo") || "",
          codigoUasg: url.searchParams.get("codigoUasg") || "",
          estado: url.searchParams.get("estado") || "",
          codigoMunicipio: url.searchParams.get("codigoMunicipio") || "",
          pagina: url.searchParams.get("pagina") || 1,
          tamanhoPagina: url.searchParams.get("tamanhoPagina") || 100,
        });
        sendJson(res, 200, { data: dados, error: null });
      } catch (erro) {
        sendJson(res, Number(erro?.statusCode) || 502, { data: null, error: { message: erro?.message || "Não foi possível consultar os preços do Compras.gov.br.", code: erro?.code || "COMPRAS_GOV_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/pncp/vincular" && req.method === "POST") {
      const session = sessaoModulo(req, activeDb, "pncp");
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const tipo = String(body.entidadeTipo || "");
      const tabelas = { empenho: "empenhos_orcamentarios", solicitacao: "solicitacoes", pedido_dotacao: "pedidos_dotacao" };
      const tabela = tabelas[tipo];
      const registroId = String(body.registroId || "");
      const entidadeId = String(body.entidadeId || "");
      if (!tabela || !activeDb.prepare("SELECT 1 FROM pncp_registros WHERE id = ?").get(registroId) || !activeDb.prepare(`SELECT 1 FROM ${tabela} WHERE id = ?`).get(entidadeId)) {
        sendJson(res, 400, { data: null, error: { message: "Registro ou vínculo inválido.", code: "BAD_REQUEST" } });
        return true;
      }
      activeDb.prepare("INSERT OR IGNORE INTO pncp_vinculos (id, registro_id, entidade_tipo, entidade_id, criado_por) VALUES (?, ?, ?, ?, ?)").run(randomBytes(16).toString("hex"), registroId, tipo, entidadeId, session.username);
      sendJson(res, 200, { data: { ok: true }, error: null });
      return true;
    }

    if (pathname === "/api/pncp/desvincular" && req.method === "POST") {
      const session = sessaoModulo(req, activeDb, "pncp");
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      activeDb.prepare("DELETE FROM pncp_vinculos WHERE id = ?").run(String(body.id || ""));
      sendJson(res, 200, { data: { ok: true }, error: null });
      return true;
    }

    if (pathname === "/api/tce-pr/status" && req.method === "GET") {
      const session = sessaoQualquerModulo(req, activeDb, ["pncp", "obras"]);
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const config = configuracaoTcePr(activeDb);
      const sincronizacaoAgendada = agendarSincronizacaoTcePr(activeDb);
      const resumo = activeDb.prepare("SELECT COUNT(*) AS licitacoes, COALESCE(SUM(valor_referencia), 0) AS valor_licitacoes FROM tcepr_licitacoes").get();
      const obras = activeDb.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor, SUM(CASE WHEN situacao = 'Paralisada' THEN 1 ELSE 0 END) AS paralisadas, SUM(CASE WHEN situacao = 'Sem acompanhamento' THEN 1 ELSE 0 END) AS sem_acompanhamento FROM tcepr_obras").get();
      const anosObras = activeDb.prepare("SELECT DISTINCT ano FROM tcepr_obras WHERE ano IS NOT NULL ORDER BY ano DESC").all().map((item) => Number(item.ano));
      const ultima = activeDb.prepare("SELECT * FROM tcepr_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get() || null;
      sendJson(res, 200, { data: { config, anosObras, resumo: { ...resumo, obras: Number(obras.total || 0), valor_obras: Number(obras.valor || 0), obras_paralisadas: Number(obras.paralisadas || 0), obras_sem_acompanhamento: Number(obras.sem_acompanhamento || 0) }, ultima, isAdmin: session.isAdmin, sincronizacaoAutomatica: sincronizacaoAgendada || ultima?.status === "executando" }, error: null });
      return true;
    }

    if (pathname === "/api/tce-pr/sincronizar" && req.method === "POST") {
      const session = sessaoQualquerModulo(req, activeDb, ["pncp", "obras"]);
      if (!session?.isAdmin) {
        sendJson(res, 403, { data: null, error: { message: "Apenas administradores podem sincronizar o TCE-PR.", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const body = (await readBody(req)) || {};
        const config = configuracaoTcePr(activeDb);
        const resultado = await sincronizarTcePr(activeDb, { cnpj: config.cnpj, ibge: config.ibge, anos: Array.isArray(body.anos) ? body.anos : config.anos });
        sendJson(res, 200, { data: resultado, error: null });
      } catch (erro) {
        sendJson(res, 502, { data: null, error: { message: erro?.message || "Não foi possível sincronizar o TCE-PR.", code: "TCEPR_SYNC_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/tce-pr/licitacoes" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "pncp")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 120);
      const ano = Number(url.searchParams.get("ano") || 0);
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const porPagina = 30;
      const where = ["1 = 1"];
      const params = [];
      if (busca) {
        where.push("(objeto LIKE ? OR orgao_nome LIKE ? OR municipio LIKE ? OR processo LIKE ? OR edital LIKE ? OR modalidade LIKE ?)");
        params.push(...Array(6).fill(`%${busca}%`));
      }
      if (ano) { where.push("ano = ?"); params.push(ano); }
      const filtro = where.join(" AND ");
      const total = Number(activeDb.prepare(`SELECT COUNT(*) AS total FROM tcepr_licitacoes WHERE ${filtro}`).get(...params).total);
      const rows = activeDb.prepare(`
        SELECT l.id, l.chave_externa, l.orgao_nome, l.codigo_ibge, l.municipio, l.ano, l.processo, l.edital, l.modalidade, l.tipo_avaliacao, l.objeto, l.data_abertura, l.data_publicacao, l.valor_referencia, l.data_cancelamento, l.situacao,
          CASE WHEN EXISTS (
            SELECT 1 FROM pncp_registros p
            WHERE p.tipo = 'contratacao' AND p.cnpj_orgao = l.cnpj_orgao
              AND ((COALESCE(l.processo, '') <> '' AND lower(COALESCE(p.processo, '')) = lower(l.processo))
                OR (length(trim(COALESCE(l.objeto, ''))) >= 12 AND lower(COALESCE(p.objeto, '')) LIKE '%' || lower(l.objeto) || '%'))
          ) THEN 1 ELSE 0 END AS pncp_encontrado
        FROM tcepr_licitacoes l WHERE ${filtro}
        ORDER BY COALESCE(l.data_publicacao, l.data_abertura) DESC, l.ano DESC, l.id LIMIT ? OFFSET ?
      `).all(...params, porPagina, (pagina - 1) * porPagina);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina }, error: null });
      return true;
    }

    if (pathname === "/api/tce-pr/obras" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["pncp", "obras"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 120);
      const ano = Number(url.searchParams.get("ano") || 0);
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const porPagina = 30;
      const where = ["1 = 1"];
      const params = [];
      if (busca) {
        where.push("(objeto LIKE ? OR nome_intervencao LIKE ? OR municipio LIKE ? OR tipo_obra LIKE ? OR situacao LIKE ?)");
        params.push(...Array(5).fill(`%${busca}%`));
      }
      if (ano) { where.push("ano = ?"); params.push(ano); }
      const filtro = where.join(" AND ");
      const total = Number(activeDb.prepare(`SELECT COUNT(*) AS total FROM tcepr_obras WHERE ${filtro}`).get(...params).total);
      const rows = activeDb.prepare(`SELECT id, chave_externa, id_intervencao, orgao_nome, codigo_ibge, municipio, ano, tipo_intervencao, nome_intervencao, tipo_obra, objeto, valor, data_inicio, prazo_execucao, regime, situacao, percentual_fisico, ultimo_acompanhamento, observacao_ultimo_acompanhamento FROM tcepr_obras WHERE ${filtro} ORDER BY COALESCE(data_inicio, '9999-12-31') DESC, ano DESC, id LIMIT ? OFFSET ?`).all(...params, porPagina, (pagina - 1) * porPagina);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina }, error: null });
      return true;
    }

    if (pathname === "/api/tce-pr/detalhe" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["pncp", "obras"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const tipo = String(url.searchParams.get("tipo") || "");
      const id = String(url.searchParams.get("id") || "");
      const tabela = tipo === "licitacao" ? "tcepr_licitacoes" : tipo === "obra" ? "tcepr_obras" : null;
      if (!tabela || !id) {
        sendJson(res, 400, { data: null, error: { message: "Tipo ou identificador inválido.", code: "BAD_REQUEST" } });
        return true;
      }
      const registro = activeDb.prepare(`SELECT * FROM ${tabela} WHERE id = ?`).get(id);
      if (!registro) {
        sendJson(res, 404, { data: null, error: { message: "Registro do TCE-PR não encontrado.", code: "NOT_FOUND" } });
        return true;
      }
      const raw = (() => { try { return JSON.parse(registro.raw_json || "{}"); } catch { return {}; } })();
      if (tipo === "obra") {
        const acompanhamentos = activeDb.prepare("SELECT id, origem, numero, data, tipo, responsavel, tipo_documento_responsavel, documento_responsavel, observacao, tipo_medicao, percentual_fisico, motivo_paralisacao FROM tcepr_obras_acompanhamentos WHERE obra_id = ? ORDER BY date(data) DESC, rowid DESC").all(id);
        sendJson(res, 200, { data: { ...registro, raw, acompanhamentos }, error: null });
      } else {
        sendJson(res, 200, { data: { ...registro, raw, fonte: "https://servicos.tce.pr.gov.br/servicos/srv_dados_abertos.aspx" }, error: null });
      }
      return true;
    }

    if (pathname === "/api/tce-pr/pendencias" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "pncp")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const semPncp = activeDb.prepare(`
        SELECT l.id, l.municipio, l.ano, l.processo, l.edital, l.modalidade, l.objeto, l.valor_referencia, l.data_publicacao, l.situacao
        FROM tcepr_licitacoes l
        WHERE NOT EXISTS (
          SELECT 1 FROM pncp_registros p
          WHERE p.tipo = 'contratacao' AND p.cnpj_orgao = l.cnpj_orgao
            AND ((COALESCE(l.processo, '') <> '' AND lower(COALESCE(p.processo, '')) = lower(l.processo))
              OR (length(trim(COALESCE(l.objeto, ''))) >= 12 AND lower(COALESCE(p.objeto, '')) LIKE '%' || lower(l.objeto) || '%'))
        )
        ORDER BY COALESCE(l.data_publicacao, l.data_abertura) DESC LIMIT 100
      `).all();
      const pncpSemTce = activeDb.prepare(`
        SELECT p.id, p.numero, p.ano, p.processo, p.objeto, p.valor, p.data_publicacao, p.situacao, p.fornecedor_nome
        FROM pncp_registros p
        WHERE p.tipo = 'contratacao' AND NOT EXISTS (
          SELECT 1 FROM tcepr_licitacoes l
          WHERE l.cnpj_orgao = p.cnpj_orgao
            AND ((COALESCE(p.processo, '') <> '' AND lower(COALESCE(l.processo, '')) = lower(p.processo))
              OR (length(trim(COALESCE(p.objeto, ''))) >= 12 AND lower(COALESCE(l.objeto, '')) LIKE '%' || lower(p.objeto) || '%'))
        )
        ORDER BY COALESCE(p.data_publicacao, p.data_atualizacao) DESC LIMIT 100
      `).all();
      const obrasParalisadas = activeDb.prepare("SELECT id, municipio, ano, nome_intervencao, objeto, valor, percentual_fisico, ultimo_acompanhamento, observacao_ultimo_acompanhamento FROM tcepr_obras WHERE situacao = 'Paralisada' ORDER BY ultimo_acompanhamento DESC LIMIT 100").all();
      const obrasSemAcompanhamento = activeDb.prepare("SELECT id, municipio, ano, nome_intervencao, objeto, valor, data_inicio FROM tcepr_obras WHERE situacao = 'Sem acompanhamento' ORDER BY COALESCE(data_inicio, '9999-12-31') DESC LIMIT 100").all();
      sendJson(res, 200, { data: { semPncp, pncpSemTce, obrasParalisadas, obrasSemAcompanhamento, totais: { semPncp: semPncp.length, pncpSemTce: pncpSemTce.length, obrasParalisadas: obrasParalisadas.length, obrasSemAcompanhamento: obrasSemAcompanhamento.length } }, error: null });
      return true;
    }

    if (pathname === "/api/siconfi/status" && req.method === "GET") {
      const session = sessaoModulo(req, activeDb, "prestacao-contas");
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const config = configuracaoSiconfi(activeDb);
      const agendada = agendarSincronizacaoSiconfi(activeDb);
      const totais = Object.fromEntries(activeDb.prepare("SELECT tipo, COUNT(*) AS total FROM siconfi_registros GROUP BY tipo").all().map((item) => [item.tipo, Number(item.total)]));
      totais.entregas = Number(activeDb.prepare("SELECT COUNT(*) AS total FROM siconfi_entregas").get().total || 0);
      const ultima = activeDb.prepare("SELECT * FROM siconfi_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get() || null;
      sendJson(res, 200, { data: { config, totais, cobertura: coberturaSiconfi(activeDb, config.anos, config.ibge), ultima, isAdmin: session.isAdmin, sincronizacaoAutomatica: agendada || ultima?.status === "executando" }, error: null });
      return true;
    }

    if (pathname === "/api/siconfi/sincronizar" && req.method === "POST") {
      const session = sessaoModulo(req, activeDb, "prestacao-contas");
      if (!session?.isAdmin) {
        sendJson(res, 403, { data: null, error: { message: "Apenas administradores podem sincronizar o SICONFI.", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const body = (await readBody(req)) || {};
        const config = configuracaoSiconfi(activeDb);
        const resultado = await sincronizarSiconfi(activeDb, {
          ibge: body.ibge || config.ibge,
          anos: Array.isArray(body.anos) ? body.anos : config.anos,
        });
        sendJson(res, 200, { data: resultado, error: null });
      } catch (erro) {
        sendJson(res, 502, { data: null, error: { message: erro?.message || "Não foi possível sincronizar o SICONFI.", code: "SICONFI_SYNC_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/siconfi/indicadores" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "prestacao-contas")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const config = configuracaoSiconfi(activeDb);
      const ano = Number(url.searchParams.get("ano") || 0);
      sendJson(res, 200, { data: calcularIndicadoresSiconfi(activeDb, ano, config.ibge), error: null });
      return true;
    }

    if (pathname === "/api/siconfi/registros" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "prestacao-contas")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const tipos = new Set(["rreo", "rgf", "dca"]);
      const tipo = String(url.searchParams.get("tipo") || "rreo").toLowerCase();
      if (!tipos.has(tipo)) {
        sendJson(res, 400, { data: null, error: { message: "Tipo de demonstrativo inválido.", code: "BAD_REQUEST" } });
        return true;
      }
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 120);
      const ano = Number(url.searchParams.get("ano") || 0);
      const periodo = Number(url.searchParams.get("periodo") || 0);
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const porPagina = 30;
      const where = ["tipo = ?"];
      const params = [tipo];
      if (busca) {
        where.push("(cod_conta LIKE ? OR conta LIKE ? OR anexo LIKE ? OR coluna LIKE ? OR instituicao LIKE ?)");
        params.push(...Array(5).fill("%" + busca + "%"));
      }
      if (ano) { where.push("exercicio = ?"); params.push(ano); }
      if (periodo) { where.push("periodo = ?"); params.push(periodo); }
      const filtro = where.join(" AND ");
      const total = Number(activeDb.prepare("SELECT COUNT(*) AS total FROM siconfi_registros WHERE " + filtro).get(...params).total || 0);
      const rows = activeDb.prepare("SELECT id, tipo, exercicio, periodo, periodicidade, demonstrativo, esfera, poder, cod_ibge, uf, instituicao, populacao, anexo, rotulo, coluna, cod_conta, conta, valor, sincronizado_em FROM siconfi_registros WHERE " + filtro + " ORDER BY exercicio DESC, periodo DESC, anexo, cod_conta, id LIMIT ? OFFSET ?").all(...params, porPagina, (pagina - 1) * porPagina);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina }, error: null });
      return true;
    }

    if (pathname === "/api/siconfi/entregas" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "prestacao-contas")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 120);
      const ano = Number(url.searchParams.get("ano") || 0);
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const porPagina = 30;
      const where = ["1 = 1"];
      const params = [];
      if (busca) {
        where.push("(entregavel LIKE ? OR instituicao LIKE ? OR status_relatorio LIKE ? OR tipo_relatorio LIKE ?)");
        params.push(...Array(4).fill("%" + busca + "%"));
      }
      if (ano) { where.push("exercicio = ?"); params.push(ano); }
      const filtro = where.join(" AND ");
      const total = Number(activeDb.prepare("SELECT COUNT(*) AS total FROM siconfi_entregas WHERE " + filtro).get(...params).total || 0);
      const rows = activeDb.prepare("SELECT id, exercicio, cod_ibge, populacao, instituicao, entregavel, periodo, periodicidade, status_relatorio, data_status, forma_envio, tipo_relatorio, sincronizado_em FROM siconfi_entregas WHERE " + filtro + " ORDER BY exercicio DESC, date(data_status) DESC, entregavel, periodo, id LIMIT ? OFFSET ?").all(...params, porPagina, (pagina - 1) * porPagina);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina }, error: null });
      return true;
    }

    if (pathname === "/api/transparencia/cnpj" && req.method === "GET") {
      const session = sessaoModulo(req, activeDb, "cnpj") || sessaoModulo(req, activeDb, "credores-fixos");
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const cnpj = String(url.searchParams.get("cnpj") || "").replace(/\D/g, "");
      if (cnpj.length !== 14) {
        sendJson(res, 400, { data: null, error: { message: "Informe um CNPJ válido.", code: "BAD_REQUEST" } });
        return true;
      }
      try {
        const dados = await consultarTransparenciaCnpj(cnpj, { apiKey: chavePortalTransparencia(activeDb) });
        sendJson(res, 200, { data: { ...dados, configuracao: configuracaoTransparencia(activeDb) }, error: null });
      } catch (erro) {
        sendJson(res, 400, { data: null, error: { message: erro?.message || "Não foi possível consultar as fontes de transparência.", code: "TRANSPARENCIA_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/fornecedor/dossie" && req.method === "GET") {
      const session = sessaoQualquerModulo(req, activeDb, ["cnpj", "credores-fixos", "empenhos", "pncp", "tce-pr", "solicitacoes"]);
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const cnpj = String(url.searchParams.get("cnpj") || "").replace(/\D/g, "");
      if (cnpj.length !== 14) {
        sendJson(res, 400, { data: null, error: { message: "Informe um CNPJ válido.", code: "BAD_REQUEST" } });
        return true;
      }
      try {
        const razaoSocial = url.searchParams.get("razaoSocial") || "";
        const nomeFantasia = url.searchParams.get("nomeFantasia") || "";
        const semCache = url.searchParams.get("semCache") === "1" || url.searchParams.get("semCache") === "true";
        const dossie = await obterDossieFornecedor(activeDb, cnpj, {
          razaoSocial,
          nomeFantasia,
          semCache,
        });
        sendJson(res, 200, { data: dossie, error: null });
      } catch (erro) {
        sendJson(res, 400, { data: null, error: { message: erro?.message || "Não foi possível obter o dossiê do fornecedor.", code: "DOSSIE_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/fnde/status" && req.method === "GET") {
      const session = sessaoQualquerModulo(req, activeDb, ["fnde", "transferencias", "empenhos", "prestacao-contas"]);
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const resumo = activeDb.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(valor_pago), 0) AS valor_total FROM fnde_repasses").get();
      const porPrograma = activeDb.prepare("SELECT programa, COUNT(*) AS total, COALESCE(SUM(valor_pago), 0) AS valor FROM fnde_repasses GROUP BY programa ORDER BY valor DESC").all();
      const anos = activeDb.prepare("SELECT DISTINCT ano FROM fnde_repasses ORDER BY ano DESC").all().map((r) => Number(r.ano));
      sendJson(res, 200, { data: { resumo, porPrograma, anos, urls: FNDE_URLS, isAdmin: session.isAdmin }, error: null });
      return true;
    }

    if (pathname === "/api/fnde/repasses" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["fnde", "transferencias", "empenhos", "prestacao-contas"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 100);
      const programa = String(url.searchParams.get("programa") || "").trim();
      const ano = Number(url.searchParams.get("ano") || 0);
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const params = [];
      const filtros = ["1=1"];
      if (busca) {
        filtros.push("(programa LIKE ? OR acao LIKE ? OR entidade LIKE ? OR escola LIKE ? OR numero_processo LIKE ? OR numero_ordem_bancaria LIKE ?)");
        params.push(...Array(6).fill(`%${busca}%`));
      }
      if (programa) {
        filtros.push("programa = ?");
        params.push(programa);
      }
      if (ano) {
        filtros.push("ano = ?");
        params.push(ano);
      }
      const where = filtros.join(" AND ");
      const total = Number(activeDb.prepare(`SELECT COUNT(*) AS total FROM fnde_repasses WHERE ${where}`).get(...params).total);
      const rows = activeDb.prepare(`SELECT id, ano, programa, acao, numero_processo, entidade, cnpj_entidade, escola, valor_pago, data_pagamento, numero_ordem_bancaria, sincronizado_em FROM fnde_repasses WHERE ${where} ORDER BY ano DESC, date(data_pagamento) DESC, id DESC LIMIT 30 OFFSET ?`).all(...params, (pagina - 1) * 30);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina: 30 }, error: null });
      return true;
    }

    if (pathname === "/api/fnde/sincronizar" && req.method === "POST") {
      const session = sessaoQualquerModulo(req, activeDb, ["fnde", "transferencias"]);
      if (!session?.isAdmin) {
        sendJson(res, 403, { data: null, error: { message: "Apenas administradores podem sincronizar o FNDE.", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const body = (await readBody(req)) || {};
        const anos = Array.isArray(body?.anos) ? body.anos : [new Date().getFullYear(), new Date().getFullYear() - 1];
        const resultado = await sincronizarFnde(activeDb, { anos });
        sendJson(res, 200, { data: resultado, error: null });
      } catch (erro) {
        sendJson(res, 502, { data: null, error: { message: erro?.message || "Não foi possível sincronizar o FNDE.", code: "FNDE_SYNC_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/beneficios-sociais/status" && req.method === "GET") {
      const session = sessaoQualquerModulo(req, activeDb, ["beneficios-sociais", "transferencias", "prestacao-contas"]);
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const configApiKey = Boolean(chavePortalTransparencia(activeDb));
      const resumo = activeDb.prepare("SELECT COUNT(*) AS registros, COALESCE(SUM(valor_total), 0) AS valor_total, COALESCE(SUM(quantidade_beneficiarios), 0) AS beneficiarios_total FROM beneficios_sociais").get();
      const porTipo = activeDb.prepare("SELECT tipo, COUNT(*) AS registros, COALESCE(SUM(valor_total), 0) AS valor_total, COALESCE(MAX(quantidade_beneficiarios), 0) AS max_beneficiarios FROM beneficios_sociais GROUP BY tipo ORDER BY valor_total DESC").all();
      const meses = activeDb.prepare("SELECT DISTINCT mes_ano FROM beneficios_sociais ORDER BY mes_ano DESC").all().map((r) => r.mes_ano);
      sendJson(res, 200, { data: { configurado: configApiKey, resumo, porTipo, meses, isAdmin: session.isAdmin }, error: null });
      return true;
    }

    if (pathname === "/api/beneficios-sociais/historico" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["beneficios-sociais", "transferencias", "prestacao-contas"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const tipo = String(url.searchParams.get("tipo") || "").trim();
      const params = [];
      let where = "1=1";
      if (tipo) {
        where = "tipo = ?";
        params.push(tipo);
      }
      const rows = activeDb.prepare(`SELECT id, mes_ano, tipo, codigo_ibge, municipio, uf, quantidade_beneficiarios, valor_total, sincronizado_em FROM beneficios_sociais WHERE ${where} ORDER BY mes_ano DESC, tipo ASC LIMIT 50`).all(...params);
      sendJson(res, 200, { data: { rows }, error: null });
      return true;
    }

    if (pathname === "/api/beneficios-sociais/sincronizar" && req.method === "POST") {
      const session = sessaoQualquerModulo(req, activeDb, ["beneficios-sociais", "transferencias"]);
      if (!session?.isAdmin) {
        sendJson(res, 403, { data: null, error: { message: "Apenas administradores podem sincronizar os Benefícios Sociais.", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const body = (await readBody(req)) || {};
        const resultado = await sincronizarBeneficiosSociais(activeDb, { meses: Array.isArray(body?.meses) ? body.meses : undefined });
        sendJson(res, 200, { data: resultado, error: null });
      } catch (erro) {
        sendJson(res, 502, { data: null, error: { message: erro?.message || "Não foi possível sincronizar os Benefícios Sociais.", code: "BENEFICIOS_SYNC_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/saude/cnes/tipos" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "saude-publica")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao módulo Saúde Pública", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const dados = await listarTiposCnes();
        sendJson(res, 200, { data: { ...dados, configuracao: configuracaoSaude() }, error: null });
      } catch (erro) {
        sendJson(res, Number(erro?.statusCode) || 502, { data: null, error: { message: erro?.message || "Não foi possível consultar os tipos de unidade do CNES.", code: erro?.code || "SAUDE_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/saude/cnes" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "saude-publica")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao módulo Saúde Pública", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const dados = await consultarCnes({
          cnes: url.searchParams.get("cnes") || "",
          codigoMunicipio: url.searchParams.get("municipio") || url.searchParams.get("codigo_municipio") || "",
          codigoUf: url.searchParams.get("uf") || url.searchParams.get("codigo_uf") || "",
          codigoTipoUnidade: url.searchParams.get("tipo") || url.searchParams.get("codigo_tipo_unidade") || "",
          status: url.searchParams.get("status") || "",
          busca: url.searchParams.get("busca") || "",
          pagina: url.searchParams.get("pagina") || 1,
          limite: url.searchParams.get("limite") || 20,
        });
        sendJson(res, 200, { data: { ...dados, configuracao: configuracaoSaude() }, error: null });
      } catch (erro) {
        sendJson(res, Number(erro?.statusCode) || 400, { data: null, error: { message: erro?.message || "Não foi possível consultar o CNES.", code: erro?.code || "SAUDE_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/bcb/config" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["calculadoras", "prestacao-contas"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao serviço auxiliar do Banco Central", code: "FORBIDDEN" } });
        return true;
      }
      sendJson(res, 200, { data: { ...configuracaoBcb(), series: listarSeriesBcb() }, error: null });
      return true;
    }

    if (pathname === "/api/bcb/serie" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["calculadoras", "prestacao-contas"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao serviço auxiliar do Banco Central", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const dados = await consultarSerieBcb({
          serie: url.searchParams.get("serie") || "ipca",
          dataInicial: url.searchParams.get("dataInicial") || url.searchParams.get("data_inicial") || "",
          dataFinal: url.searchParams.get("dataFinal") || url.searchParams.get("data_final") || "",
        });
        sendJson(res, 200, { data: { ...dados, configuracao: configuracaoBcb() }, error: null });
      } catch (erro) {
        sendJson(res, Number(erro?.statusCode) || 400, { data: null, error: { message: erro?.message || "Não foi possível consultar a série do Banco Central.", code: erro?.code || "BCB_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/bcb/calcular" && req.method === "GET") {
      if (!sessaoQualquerModulo(req, activeDb, ["calculadoras", "prestacao-contas"])) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao serviço auxiliar do Banco Central", code: "FORBIDDEN" } });
        return true;
      }
      try {
        const dados = await calcularAtualizacaoBcb({
          valor: url.searchParams.get("valor") || "",
          serie: url.searchParams.get("serie") || "ipca",
          dataInicial: url.searchParams.get("dataInicial") || url.searchParams.get("data_inicial") || "",
          dataFinal: url.searchParams.get("dataFinal") || url.searchParams.get("data_final") || "",
        });
        sendJson(res, 200, { data: { ...dados, configuracao: configuracaoBcb() }, error: null });
      } catch (erro) {
        sendJson(res, Number(erro?.statusCode) || 400, { data: null, error: { message: erro?.message || "Não foi possível calcular a atualização com o Banco Central.", code: erro?.code || "BCB_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/transferencias/status" && req.method === "GET") {
      const session = sessaoModulo(req, activeDb, "transferencias");
      if (!session) { sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } }); return true; }
      const agendada = agendarSincronizacaoTransferegov(activeDb);
      const resumo = activeDb.prepare("SELECT COUNT(*) AS instrumentos, COALESCE(SUM(valor_total),0) AS valor_total, COALESCE(SUM(valor_custeio),0) AS custeio, COALESCE(SUM(valor_investimento),0) AS investimento, COALESCE(SUM(saldo),0) AS saldo FROM tgov_instrumentos").get();
      const movimentos = activeDb.prepare("SELECT COALESCE(SUM(CASE WHEN tipo='empenho' THEN valor ELSE 0 END),0) AS empenhado, COALESCE(SUM(CASE WHEN tipo='movimentacao' AND lower(COALESCE(situacao,'')) IN ('c','crédito','credito') THEN valor ELSE 0 END),0) AS recebido, COALESCE(SUM(CASE WHEN tipo='movimentacao' AND lower(COALESCE(situacao,'')) IN ('d','débito','debito') THEN valor ELSE 0 END),0) AS executado FROM tgov_movimentacoes").get();
      const porFonte = activeDb.prepare("SELECT fonte, COUNT(*) AS total, COALESCE(SUM(valor_total),0) AS valor FROM tgov_instrumentos GROUP BY fonte ORDER BY fonte").all();
      const ultima = activeDb.prepare("SELECT * FROM tgov_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get() || null;
      sendJson(res, 200, { data: { config: configuracaoTransferegov(activeDb), resumo: { ...resumo, ...movimentos }, porFonte, ultima, isAdmin: session.isAdmin, sincronizacaoAutomatica: agendada || ultima?.status === "executando" }, error: null });
      return true;
    }

    if (pathname === "/api/transferencias/sincronizar" && req.method === "POST") {
      const session = sessaoModulo(req, activeDb, "transferencias");
      if (!session?.isAdmin) { sendJson(res, 403, { data: null, error: { message: "Apenas administradores podem sincronizar.", code: "FORBIDDEN" } }); return true; }
      try {
        const resultado = await sincronizarTransferegov(activeDb, configuracaoTransferegov(activeDb));
        sendJson(res, 200, { data: resultado, error: null });
      } catch (erro) {
        sendJson(res, 502, { data: null, error: { message: erro?.message || "Não foi possível sincronizar o Transferegov.", code: "TRANSFEREGOV_SYNC_ERROR" } });
      }
      return true;
    }

    if (pathname === "/api/transferencias/instrumentos" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "transferencias")) { sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } }); return true; }
      const busca = String(url.searchParams.get("busca") || "").trim().slice(0, 100);
      const fonte = String(url.searchParams.get("fonte") || "");
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const params = [];
      const filtros = ["1=1"];
      if (busca) { filtros.push("(codigo LIKE ? OR objeto LIKE ? OR parlamentar LIKE ? OR numero_emenda LIKE ? OR orgao_repassador LIKE ?)"); params.push(...Array(5).fill(`%${busca}%`)); }
      if (fonte) { filtros.push("fonte=?"); params.push(fonte); }
      const where = filtros.join(" AND ");
      const total = Number(activeDb.prepare(`SELECT COUNT(*) AS total FROM tgov_instrumentos WHERE ${where}`).get(...params).total);
      const rows = activeDb.prepare(`SELECT * FROM tgov_instrumentos WHERE ${where} ORDER BY COALESCE(ano,0) DESC, COALESCE(inicio_vigencia,sincronizado_em) DESC LIMIT 30 OFFSET ?`).all(...params, (pagina - 1) * 30).map(({ raw_json, ...item }) => item);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina: 30 }, error: null });
      return true;
    }

    if (pathname === "/api/transferencias/movimentacoes" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "transferencias")) { sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } }); return true; }
      const tipo = String(url.searchParams.get("tipo") || "");
      const pagina = Math.max(1, Number(url.searchParams.get("pagina") || 1));
      const where = tipo ? "WHERE m.tipo=?" : "";
      const params = tipo ? [tipo] : [];
      const total = Number(activeDb.prepare(`SELECT COUNT(*) AS total FROM tgov_movimentacoes m ${where}`).get(...params).total);
      const rows = activeDb.prepare(`SELECT m.id,m.fonte,m.tipo,m.numero,m.data,m.valor,m.situacao,m.favorecido,m.descricao,i.codigo AS instrumento_codigo,i.objeto AS instrumento_objeto FROM tgov_movimentacoes m LEFT JOIN tgov_instrumentos i ON i.id=m.instrumento_id ${where} ORDER BY COALESCE(m.data,m.sincronizado_em) DESC LIMIT 40 OFFSET ?`).all(...params, (pagina - 1) * 40);
      sendJson(res, 200, { data: { rows, total, pagina, porPagina: 40 }, error: null });
      return true;
    }

    if (pathname === "/api/transferencias/detalhe" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "transferencias")) { sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } }); return true; }
      const registro = activeDb.prepare("SELECT * FROM tgov_instrumentos WHERE id=?").get(String(url.searchParams.get("id") || ""));
      if (!registro) { sendJson(res, 404, { data: null, error: { message: "Transferência não encontrada.", code: "NOT_FOUND" } }); return true; }
      const movimentacoes = activeDb.prepare("SELECT id,tipo,numero,data,valor,situacao,favorecido,descricao FROM tgov_movimentacoes WHERE instrumento_id=? ORDER BY data DESC").all(registro.id);
      sendJson(res, 200, { data: { ...registro, raw: JSON.parse(registro.raw_json || "{}"), movimentacoes }, error: null });
      return true;
    }

    if (pathname === "/api/transferencias/alertas" && req.method === "GET") {
      if (!sessaoModulo(req, activeDb, "transferencias")) { sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } }); return true; }
      const vencendo = activeDb.prepare("SELECT id,codigo,tipo,objeto,situacao,fim_vigencia,valor_total FROM tgov_instrumentos WHERE date(fim_vigencia) BETWEEN date('now') AND date('now','+90 days') ORDER BY date(fim_vigencia)").all();
      const vencidos = activeDb.prepare("SELECT id,codigo,tipo,objeto,situacao,fim_vigencia,valor_total FROM tgov_instrumentos WHERE date(fim_vigencia)<date('now') AND lower(COALESCE(situacao,'')) NOT LIKE '%conclu%' AND lower(COALESCE(situacao,'')) NOT LIKE '%encerr%' ORDER BY date(fim_vigencia) DESC LIMIT 100").all();
      const impedimentos = activeDb.prepare("SELECT id,codigo,tipo,objeto,situacao,fim_vigencia,valor_total FROM tgov_instrumentos WHERE lower(COALESCE(situacao,'')) LIKE '%imped%' OR lower(COALESCE(raw_json,'')) LIKE '%impedimento%' ORDER BY ano DESC LIMIT 100").all();
      sendJson(res, 200, { data: { vencendo, vencidos, impedimentos }, error: null });
      return true;
    }

    if (pathname === "/api/query" && req.method === "POST") {
      const session = resolveSession(req, activeDb);
      if (!session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const result = runQuery(activeDb, body, session.username);
      sendJson(res, result.error?.code === "FORBIDDEN" ? 403 : result.error ? 400 : 200, result);
      return true;
    }

    if (pathname === "/api/rpc" && req.method === "POST") {
      const body = await readBody(req);
      if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.fn !== "string") {
        sendJson(res, 400, { data: null, error: { message: "Requisição RPC inválida", code: "BAD_REQUEST" } });
        return true;
      }
      const fn = body.fn;
      const session = resolveSession(req, activeDb);
      requestContext = { rpc: fn, user: session?.username || null };
      if (fn === "usuario_logout") {
        if (!session) {
          sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
          return true;
        }
        sessions.delete(session.token);
        clearSessionCookie(res, req);
        sendJson(res, 200, { data: true, error: null });
        return true;
      }
      if (!PUBLIC_RPCS.has(fn) && !session) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      if (fn === "admin_usuarios_online") {
        const admin = activeDb.prepare("SELECT is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(session.username);
        if (!admin?.is_admin || !admin.ativo) {
          sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
          return true;
        }
        const agora = Date.now();
        const online = [...sessions.values()]
          .filter(s => s.expiresAt > agora && agora - s.lastSeenAt < 2 * 60 * 1000)
          .map(s => { const u = activeDb.prepare("SELECT is_admin, is_contador FROM usuarios WHERE lower(username) = lower(?)").get(s.username); return { username: s.username, perfil: u?.is_admin ? "Administrador" : u?.is_contador ? "Contador" : "Usuário", entrou_em: new Date(s.createdAt).toISOString(), ultimo_acesso: new Date(s.lastSeenAt).toISOString() }; })
          .filter((s, i, arr) => arr.findIndex(x => x.username.toLowerCase() === s.username.toLowerCase()) === i);
        sendJson(res, 200, { data: online, error: null });
        return true;
      }
      const rpcLog = requestLog.child({ rpc: fn, user: session?.username || null });
      const rpcArgKeys = body.args && typeof body.args === "object" && !Array.isArray(body.args) ? Object.keys(body.args).slice(0, 50) : [];
      rpcLog.info("rpc.request", { argCount: rpcArgKeys.length, argKeys: rpcArgKeys });
      rpcLog.debug("rpc.request.args", { args: redactArgs(body.args || {}) });
      const rpcStartedAt = performance.now();
      const rpcArgs = { ...(body.args || {}), _ip: clientIp, _request_id: requestId };
      const result = await runRpc(activeDb, fn, rpcArgs, session?.username || null);
      if ((fn === "usuario_login" && result.data?.ok) || (fn === "usuario_set_senha" && result.data === true)) {
        const username = String(body.args?._username || "").trim();
        if (username) createSession(res, username, req);
      }
      const status = result.error?.code === "FORBIDDEN" ? 403 : result.error ? 400 : 200;
      const rpcDurationMs = Math.round(performance.now() - rpcStartedAt);
      requestContext = {
        ...requestContext,
        rpcStatusCode: status,
        rpcDurationMs,
        ...(result.error ? { rpcErrorCode: result.error.code } : {}),
      };
      const rpcLevel = result.error ? "warn" : requestLogLevel(status, rpcDurationMs);
      rpcLog[rpcLevel](result.error ? "rpc.completed_with_error" : "rpc.completed", {
        statusCode: status,
        durationMs: rpcDurationMs,
        durationBucket: durationBucket(rpcDurationMs),
        slow: rpcDurationMs >= SLOW_REQUEST_MS,
        ...(result.error ? { code: result.error.code, message: result.error.message } : {}),
      });
      sendJson(res, status, result);
      return true;
    }

    if (pathname === "/api/pdf/comprimir" && req.method === "POST") {
      if (!sessaoModulo(req, activeDb, "pdf-utils")) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao módulo Ferramentas PDF", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const nivel = body.nivel === "maxima" ? "maxima" : "equilibrada";
      const conteudo = Buffer.from(String(body.contentBase64 || ""), "base64");
      if (!conteudo.length || conteudo.length > MAX_UPLOAD_BYTES || conteudo.subarray(0, 5).toString("ascii") !== "%PDF-") {
        sendJson(res, 400, { data: null, error: { message: "Envie um PDF válido de até 20 MB.", code: "INVALID_PDF" } });
        return true;
      }
      const tempDir = mkdtempSync(path.join(tmpdir(), "inaja-pdf-compress-"));
      const arquivoPath = path.join(tempDir, "entrada.pdf");
      try {
        writeFileSync(arquivoPath, conteudo);
        const comprimido = await comprimirPdfRasterizado(arquivoPath, conteudo, nivel, tempDir);
        sendJson(res, 200, {
          data: {
            contentBase64: comprimido.bytes.toString("base64"),
            paginas: comprimido.paginas,
            tamanhoOriginal: conteudo.length,
            tamanhoNovo: comprimido.bytes.length,
            rasterizado: comprimido.rasterizado,
          },
          error: null,
        });
      } catch (erro) {
        sendJson(res, 400, { data: null, error: { message: erro?.message || "Não foi possível comprimir o PDF.", code: "COMPRESSION_FAILED" } });
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
      return true;
    }

    if (pathname === "/api/ia/extrair-documento" && req.method === "POST") {
      if (!resolveSession(req, activeDb)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const nome = String(body.nome || "documento");
      const extensao = path.extname(nome).toLowerCase();
      const permitidos = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".doc", ".docx", ".odt", ".xls", ".xlsx", ".ods", ".csv", ".txt"]);
      if (!permitidos.has(extensao)) {
        sendJson(res, 400, { data: null, error: { message: "Formato não suportado. Envie PDF, imagem, Word, planilha ou texto.", code: "UNSUPPORTED_FILE" } });
        return true;
      }
      const conteudo = Buffer.from(String(body.contentBase64 || ""), "base64");
      if (!conteudo.length || conteudo.length > MAX_UPLOAD_BYTES) {
        sendJson(res, 413, { data: null, error: { message: "O documento deve ter até 20 MB.", code: "PAYLOAD_TOO_LARGE" } });
        return true;
      }
      const tempDir = mkdtempSync(path.join(tmpdir(), "inaja-ia-"));
      const arquivoPath = path.join(tempDir, `documento${extensao}`);
      try {
        writeFileSync(arquivoPath, conteudo);
        const extraido = await extrairTextoDocumentoIa(activeDb, arquivoPath, extensao, body.mime, tempDir);
        sendJson(res, 200, { data: { ...extraido, nome }, error: null });
      } catch (erro) {
        sendJson(res, 400, { data: null, error: { message: erro?.message || "Não foi possível ler o documento.", code: "EXTRACTION_FAILED" } });
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
      return true;
    }

    if (pathname === "/api/storage/upload" && req.method === "POST") {
      const session = resolveSession(req, activeDb);
      const usuario = usuarioDaSessao(activeDb, session);
      if (!usuario) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const rel = String(body.path || "").replace(/\\/g, "/").replace(/^\/+/, "");
      const modulo = moduloUploadValido(body, rel);
      const dest = safePath(rel);
      if (!dest || !modulo) {
        sendJson(res, 400, { error: { message: "Caminho inválido" } });
        return true;
      }
      if (!usuarioTemModuloApi(activeDb, usuario, modulo)) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado ao módulo", code: "FORBIDDEN" } });
        return true;
      }
      mkdirSync(path.dirname(dest), { recursive: true });
      if (existsSync(dest) && body.upsert) {
        const controleAtual = activeDb.prepare("SELECT usuario_id FROM uploads_controle WHERE caminho = ?").get(rel);
        if (!usuario.is_admin && controleAtual?.usuario_id !== usuario.id) {
          sendJson(res, 403, { data: null, error: { message: "Você não pode sobrescrever este arquivo", code: "FORBIDDEN" } });
          return true;
        }
      } else if (existsSync(dest)) {
        sendJson(res, 400, { error: { message: "Arquivo já existe", code: "EXISTS" } });
        return true;
      }
      const buf = Buffer.from(body.contentBase64 || "", "base64");
      if (!buf.length || buf.length > MAX_UPLOAD_BYTES) {
        sendJson(res, 413, { error: { message: "O arquivo deve ter conteúdo e no máximo 20 MB", code: "PAYLOAD_TOO_LARGE" } });
        return true;
      }
      writeFileSync(dest, buf);
      const previewPath = rel.startsWith("arquivos/") ? await gerarPreviewArquivo(dest, rel) : null;
      const registrarUpload = activeDb.prepare(`INSERT INTO uploads_controle (caminho, usuario_id, modulo)
        VALUES (?, ?, ?) ON CONFLICT(caminho) DO UPDATE SET usuario_id = excluded.usuario_id, modulo = excluded.modulo, criado_em = datetime('now')`);
      registrarUpload.run(rel, usuario.id, modulo);
      if (previewPath) registrarUpload.run(previewPath, usuario.id, modulo);
      sendJson(res, 200, { data: { path: rel, previewPath }, error: null });
      return true;
    }

    if (pathname.startsWith("/api/files/") && req.method === "GET") {
      const session = resolveSession(req, activeDb);
      const usuario = usuarioDaSessao(activeDb, session);
      if (!usuario) {
        res.statusCode = 403;
        res.end("Forbidden");
        return true;
      }
      const rel = decodeURIComponent(pathname.slice("/api/files/".length));
      const dest = safePath(rel);
      if (!dest || !existsSync(dest)) {
        res.statusCode = 404;
        res.end("Not found");
        return true;
      }
      if (!podeLerUpload(activeDb, usuario, rel)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return true;
      }
      const data = readFileSync(dest);
      const ext = path.extname(dest).toLowerCase();
      const types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", types[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "private, no-store");
      res.end(data);
      return true;
    }

    if (pathname === "/api/storage/remove" && req.method === "POST") {
      const session = resolveSession(req, activeDb);
      const usuario = usuarioDaSessao(activeDb, session);
      if (!usuario) {
        sendJson(res, 403, { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
        return true;
      }
      const body = await readBody(req);
      const paths = Array.isArray(body.paths) ? body.paths : [];
      for (const p of paths) {
        const rel = String(p || "").replace(/\\/g, "/").replace(/^\/+/, "");
        const controle = activeDb.prepare("SELECT usuario_id FROM uploads_controle WHERE caminho = ?").get(rel);
        if (!usuario.is_admin && controle?.usuario_id !== usuario.id) {
          sendJson(res, 403, { data: null, error: { message: "Você não pode excluir este arquivo", code: "FORBIDDEN" } });
          return true;
        }
        const dest = safePath(rel);
        if (dest && existsSync(dest)) unlinkSync(dest);
        activeDb.prepare("DELETE FROM uploads_controle WHERE caminho = ?").run(rel);
      }
      sendJson(res, 200, { data: null, error: null });
      return true;
    }

    return false;
  } catch (err) {
    const status = err?.statusCode || (err?.code === "PAYLOAD_TOO_LARGE" ? 413 : err instanceof SyntaxError ? 400 : 500);
    requestContext = { ...requestContext, errorCode: err?.code || "INTERNAL" };
    requestLog.error("api.request.failed", { statusCode: status, error: err });
    sendJson(res, status, { error: { message: String(err?.message || err), code: err?.code || "INTERNAL" } });
    return true;
  }
}

export function createLocalDbMiddleware() {
  return async (req, res, next) => {
    const url = req.url || "";
    if (!url.startsWith("/api")) return next();
    const handled = await handleApi(req, res);
    if (!handled) next();
  };
}
