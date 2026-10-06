import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, "..");
const detectorRoot = path.resolve(root, process.env.DETECTOR_ATOS_ROOT || path.join("IMPLEMENTAR", "DETECTOR DE ATOS JORNAL", "Bot-buscador-de-atos-publicados-backup-2026-07-22-main", "Bot-buscador-de-atos-publicados-backup-2026-07-22-main"));
const detectorData = path.resolve(detectorRoot, "..", "..");
const venvPythonCandidates = process.platform === "win32"
  ? [path.join(detectorRoot, ".venv", "Scripts", "python.exe"), path.join(detectorRoot, ".venv", "Scripts", "python")]
  : [path.join(detectorRoot, ".venv", "bin", "python"), path.join(detectorRoot, ".venv", "bin", "python3"), path.join(detectorRoot, ".venv", "Scripts", "python")];
const python = process.env.DETECTOR_ATOS_PYTHON || venvPythonCandidates.find((candidato) => existsSync(candidato));
const port = process.env.DETECTOR_ATOS_PORT || "8010";
const production = process.argv.includes("--production");
const prefeituraPort = production ? (process.env.PORT || "8001") : "8001";
const internalToken = process.env.DETECTOR_ATOS_INTERNAL_TOKEN || randomBytes(32).toString("hex");

if (!existsSync(path.join(detectorRoot, "run_interface.py"))) throw new Error(`Detector não encontrado em ${detectorRoot}`);
if (!python || !existsSync(python)) throw new Error(`Python do detector não encontrado. Crie o ambiente virtual em ${path.join(detectorRoot, ".venv")} ou defina DETECTOR_ATOS_PYTHON.`);

const detectorEnv = {
  ...process.env,
  WEB_HOST: "127.0.0.1",
  WEB_PORT: port,
  WEB_PUBLIC_URL: "",
  ABRIR_NAVEGADOR: "0",
  DEV_RELOAD: "0",
  DB_PATH: path.join(detectorData, "jornal_monitor.db"),
  DOWNLOAD_DIR: path.join(detectorData, "edicoes"),
  ALERT_DIR: path.join(detectorData, "alertas"),
  LOG_DIR: path.join(detectorData, "logs"),
  ATOS_DIR: path.join(detectorData, "atos"),
  AUTO_PROCESS: "false",
  AUTO_PROCESS_CONTINUO: "false",
  WEB_AUTO_SCAN: "false",
  AGENTE_ATIVO: "false",
  IA_CONFIG_SOURCE: "prefeitura",
  DETECTOR_ATOS_INTERNAL_TOKEN: internalToken,
  OPENCODE_API_KEY: internalToken,
  OPENCODE_API_URL: `http://127.0.0.1:${prefeituraPort}/api/internal/detector-atos/ia/chat/completions`,
  OPENCODE_JEV_API_URL: `http://127.0.0.1:${prefeituraPort}/api/internal/detector-atos/ia/jev`,
  OPENCODE_MODEL: "configurado-na-prefeitura",
  AI_JEV_ONLY: "true",
  // O Jev faz a triagem abrangente dos segmentos OCR antes da extração
  // textual, recuperando atos cujo cabeçalho sofreu perda no OCR.
  AI_JEV_ABRANGENTE: process.env.AI_JEV_ABRANGENTE || "true",
  AI_JEV_MAX_CANDIDATOS: process.env.AI_JEV_MAX_CANDIDATOS || "500",
  PYTHONPATH: [detectorRoot, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
  WEBAPP_USER: process.env.DETECTOR_ATOS_USER || "",
  WEBAPP_PASSWORD: process.env.DETECTOR_ATOS_PASSWORD || "",
};

const detectorWeb = spawn(python, [path.join(detectorRoot, "run_interface.py")], {
  cwd: detectorData,
  env: detectorEnv,
  stdio: "inherit",
  windowsHide: true,
});

const appEntry = production ? path.join(root, "server", "standalone.mjs") : path.join(root, "node_modules", "vite", "bin", "vite.js");
const app = spawn(process.execPath, [appEntry], {
  cwd: root,
  env: {
    ...process.env,
    DETECTOR_ATOS_URL: process.env.DETECTOR_ATOS_URL || `http://127.0.0.1:${port}`,
    DETECTOR_ATOS_INTERNAL_TOKEN: internalToken,
  },
  stdio: "inherit",
  windowsHide: false,
});

let encerrando = false;
function encerrar(code = 0) {
  if (encerrando) return;
  encerrando = true;
  if (!detectorWeb.killed) detectorWeb.kill();
  if (!app.killed) app.kill();
  setTimeout(() => process.exit(code), 200).unref();
}

detectorWeb.on("exit", (code) => {
  if (!encerrando && code && code !== 0) console.error(`Interface do detector encerrada com código ${code}.`);
});
app.on("exit", (code) => encerrar(code || 0));
process.on("SIGINT", () => encerrar(0));
process.on("SIGTERM", () => encerrar(0));
