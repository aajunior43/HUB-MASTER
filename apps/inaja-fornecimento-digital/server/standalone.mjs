/**
 * Serve dist/ + API local (produção / preview sem Vite).
 * Uso: node server/standalone.mjs
 */
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (existsSync(".env")) {
  try {
    process.loadEnvFile?.(".env");
  } catch {}
}
import { handleApi } from "./api.mjs";
import { handleMcp } from "./mcp.mjs";
import { openDatabase } from "./db.mjs";
import { createManagedBackup } from "./backup.mjs";
import { logger } from "./logger.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8001);
const BIND_HOST = String(process.env.INAJA_BIND_HOST || "127.0.0.1").trim() || "127.0.0.1";

const db = openDatabase();
const runtimeLog = logger.child({ component: "runtime" });
const backupHours = Math.max(0, Number(process.env.BACKUP_AUTO_HOURS || 0));
const backupKeep = Math.max(1, Number(process.env.BACKUP_RETAIN_COUNT || 30));

function runAutomaticBackup() {
  try {
    const result = createManagedBackup({ keep: backupKeep });
    runtimeLog.info("backup.automatic.created", { backupId: result.id, bytes: result.bytes, files: result.files });
  } catch (error) {
    runtimeLog.error("backup.automatic.failed", { error });
  }
}
if (backupHours > 0) {
  const interval = Math.max(1, backupHours) * 60 * 60 * 1000;
  setTimeout(runAutomaticBackup, 30_000).unref();
  setInterval(runAutomaticBackup, interval).unref();
  runtimeLog.info("backup.automatic.scheduled", { intervalHours: backupHours, retentionCount: backupKeep });
}

try {
  const { startTelegramBot } = await import("./telegram/index.mjs");
  startTelegramBot({ db }).catch((error) => runtimeLog.error("telegram.start.failed", { error }));
} catch (e) {
  runtimeLog.warn("telegram.module.unavailable", { error: e });
}


function applyBaselineSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https:; object-src 'none'",
  );
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (req, res) => {
  applyBaselineSecurityHeaders(res);
  if (await handleMcp(req, res, db)) return;
  if (await handleApi(req, res)) return;

  if (!existsSync(DIST)) {
    runtimeLog.error("server.dist_missing", { directory: DIST });
    res.statusCode = 500;
    res.end("Pasta dist/ não encontrada. Rode: npm run build");
    return;
  }

  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  let filePath = path.join(DIST, urlPath);

  if (!filePath.startsWith(DIST) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, "index.html");
  }

  try {
    const data = readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(data);
  } catch {
    runtimeLog.warn("server.static_file_missing", { path: urlPath });
    res.statusCode = 404;
    res.end("Not found");
  }
});

server.listen(PORT, BIND_HOST, () => {
  runtimeLog.info("server.started", {
    mode: "standalone",
    url: `http://${BIND_HOST === "0.0.0.0" ? "localhost" : BIND_HOST}:${PORT}`,
    bindHost: BIND_HOST,
    port: PORT,
    database: "data/inaja.sqlite",
  });
});
server.on("error", (error) => runtimeLog.error("server.failed", { error, port: PORT }));
