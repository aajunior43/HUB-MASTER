import { watch } from "node:fs";
import path from "node:path";

let backend;

async function carregarBackend() {
  if (!backend) {
    const [{ createLocalDbMiddleware }, { openDatabase }, { handleMcp }] = await Promise.all([
      import("./server/api.mjs"),
      import("./server/db.mjs"),
      import("./server/mcp.mjs"),
    ]);
    backend = { createLocalDbMiddleware, openDatabase, handleMcp };
  }
  return backend;
}

/**
 * Integra a API SQLite local no servidor do Vite (dev e preview).
 * Observa mudancas em server/ e recarrega os modulos do backend + browser.
 */
export function localDbPlugin() {
  let ready = false;
  let db;
  return {
    name: "local-db",
    async configureServer(server) {
      const { openDatabase } = await carregarBackend();
      if (!ready) {
        db = openDatabase();
        ready = true;
        console.log("[local-db] SQLite em data/inaja.sqlite");
        import("./server/telegram/index.mjs")
          .then(({ startTelegramBot }) => startTelegramBot({ db }))
          .catch((e) => console.warn("[telegram]", e?.message || e));
      }
      registrarMiddlewares(server, db, await carregarBackend());
      observarBackend(server);
    },
    async configurePreviewServer(server) {
      const { openDatabase } = await carregarBackend();
      if (!ready) {
        db = openDatabase();
        ready = true;
        import("./server/telegram/index.mjs")
          .then(({ startTelegramBot }) => startTelegramBot({ db }))
          .catch((e) => console.warn("[telegram]", e?.message || e));
      }
      registrarMiddlewares(server, db, await carregarBackend());
      observarBackend(server);
    },
  };
}

function registrarMiddlewares(server, db, { createLocalDbMiddleware, handleMcp }) {
  const apiMiddleware = createLocalDbMiddleware();
  server.middlewares.use(async (req, res, next) => {
    if (await handleMcp(req, res, db)) return;
    apiMiddleware(req, res, next);
  });
}

function observarBackend(server) {
  const serverDir = path.resolve(process.cwd(), "server");
  let timer;
  const reiniciar = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const key of Object.keys(require.cache || {})) {
        if (key.startsWith(serverDir)) delete require.cache[key];
      }
      server.ws.send({ type: "full-reload", path: "*" });
      console.log("[local-db] backend (server/) alterado — modulos recarregados e pagina atualizada");
    }, 150);
  };
  try {
    const watcher = watch(serverDir, { recursive: true }, (event, file) => {
      if (file && file.endsWith(".mjs")) reiniciar();
    });
    server.httpServer?.on("close", () => watcher.close());
  } catch (e) {
    console.warn("[local-db] nao foi possivel observar server/:", e.message);
  }
}
