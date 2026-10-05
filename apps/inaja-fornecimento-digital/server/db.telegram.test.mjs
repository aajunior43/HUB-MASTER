import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { getDefaultResultOrder } from "node:dns";
import { createServer } from "node:http";
import { mkdtemp, rm, stat as fileStat, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate, runRpc } from "./db.mjs";
import { createTelegramClient } from "./telegram/client.mjs";
import { resolveVinculo, checkRateLimit, listModulos, logTelegram, redactTelegramAuditArgs } from "./telegram/session.mjs";
import {
  createConfirmation,
  createInputRequest,
  createPageCallback,
  createTelegramInteractions,
  consumeConfirmation,
  consumeInputRequest,
  consumePageCallback,
  requireTelegramModule,
  trustedTelegramRpc,
} from "./telegram/interactions.mjs";
import { processTelegramUpdate } from "./telegram/index.mjs";
import { escHtml, formatBytes } from "./telegram/format.mjs";
import { handleCommand } from "./telegram/commands.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const adminId = randomUUID();
  const userId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(adminId, "admin");
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "luana");
  db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)").run(
    randomUUID(),
    userId,
    "prazos",
  );
  return { db, adminId, userId };
}

describe("telegram format/session", () => {
  it("prioriza IPv4 para evitar falhas de polling em redes com IPv6 indisponível", () => {
    assert.equal(getDefaultResultOrder(), "ipv4first");
  });

  it("escHtml e formatBytes", () => {
    assert.equal(escHtml("<b>"), "&lt;b&gt;");
    assert.ok(formatBytes(2048).includes("KB"));
  });

  it("rate limit bloqueia após excesso", () => {
    const id = "chat-rate-" + Math.random();
    let last = { ok: true };
    for (let i = 0; i < 35; i++) last = checkRateLimit(id);
    assert.equal(last.ok, false);
  });

  it("auditoria do Telegram nunca persiste texto livre recebido", () => {
    const { db, adminId } = freshDb();
    const freeText = "conteudo privado que nao pode ser auditado";
    logTelegram(db, {
      chatId: "chat-audit",
      usuarioId: adminId,
      comando: "mensagem",
      args: freeText,
      ok: true,
    });
    const saved = db.prepare("SELECT args_redacted FROM telegram_logs WHERE chat_id = ?").get("chat-audit");
    assert.equal(saved.args_redacted, null);
  });

  it("redige chaves sensÃ­veis recursivamente na auditoria", () => {
    const source = {
      token: "token-privado",
      nested: { password: "senha-privada", content: "conteudo-privado", ok: "metadado" },
      rows: [{ secret: "segredo-privado" }],
    };
    const redacted = redactTelegramAuditArgs(source);
    assert.deepEqual(redacted, {
      token: "[REDACTED]",
      nested: { password: "[REDACTED]", content: "[REDACTED]", ok: "metadado" },
      rows: [{ secret: "[REDACTED]" }],
    });
    assert.equal(JSON.stringify(redacted).includes("privado"), false);
  });

  it("processamento de update classifica texto e callback sem persistir a entrada", async () => {
    const { db } = freshDb();
    const freeText = `texto-privado-${randomUUID()}`;
    const client = {
      sendMessage: async () => {},
      answerCallbackQuery: async () => {},
      editMessageText: async () => {},
    };
    await processTelegramUpdate(db, client, {
      message: {
        chat: { id: "chat-update", type: "private" },
        from: { id: "sender-update" },
        text: freeText,
      },
    });
    await processTelegramUpdate(db, client, {
      callback_query: {
        id: "callback-update",
        from: { id: "sender-update" },
        data: "menu",
        message: { message_id: 1, chat: { id: "chat-update", type: "private" } },
      },
    });
    const logs = db.prepare("SELECT comando, args_redacted FROM telegram_logs WHERE chat_id = ? ORDER BY rowid").all("chat-update");
    assert.deepEqual(logs.map((log) => ({ comando: log.comando, args_redacted: log.args_redacted })), [
      { comando: "mensagem", args_redacted: null },
      { comando: "callback", args_redacted: null },
    ]);
    assert.equal(logs.some((log) => String(log.comando).includes(freeText) || String(log.args_redacted).includes(freeText)), false);
  });
});

describe("telegram interaction primitives", () => {
  function ctx(overrides = {}) {
    return {
      chatId: "chat-a",
      fromId: "actor-a",
      user: { usuarioId: "user-a", username: "luana", isAdmin: false },
      modulos: ["prazos"],
      ...overrides,
    };
  }

  it("autoriza mÃ³dulos e deriva o caller do vÃ­nculo do Telegram", async () => {
    assert.equal(requireTelegramModule(ctx(), "prazos").ok, true);
    assert.equal(requireTelegramModule(ctx(), "mural").ok, false);
    let received;
    const result = await trustedTelegramRpc(ctx(), "teste", { _caller: "admin", value: 4 }, {
      runRpc: async (_db, fn, args, trustedCaller) => {
        received = { fn, args, trustedCaller };
        return { data: "ok", error: null };
      },
    });
    assert.equal(result.error, null);
    assert.deepEqual(received, { fn: "teste", args: { value: 4 }, trustedCaller: "luana" });

    await trustedTelegramRpc(ctx({ user: null }), "telegram_consumir_codigo", { _caller: "admin", value: 4 }, {
      allowUnlinked: true,
      runRpc: async (_db, fn, args, trustedCaller) => {
        received = { fn, args, trustedCaller };
        return { data: "ok", error: null };
      },
    });
    assert.deepEqual(received, { fn: "telegram_consumir_codigo", args: { value: 4 }, trustedCaller: null });
  });

  it("mantÃ©m paginaÃ§Ã£o, entrada tipada e confirmaÃ§Ã£o vinculadas e efÃªmeras", () => {
    const state = createTelegramInteractions({ now: () => 1_000, capacity: 3 });
    const page = createPageCallback(state, ctx(), { action: "prazos", page: 2, ttlMs: 100 });
    assert.deepEqual(consumePageCallback(state, ctx(), page), { ok: true, action: "prazos", page: 2 });
    assert.equal(consumePageCallback(state, ctx(), page).ok, false);

    createInputRequest(state, ctx(), { kind: "cnpj", fields: ["cnpj"], ttlMs: 100 });
    const input = consumeInputRequest(state, ctx(), "12.345.678/0001-95", (raw) => ({ cnpj: raw.replace(/\D/g, "") }));
    assert.deepEqual(input, { ok: true, kind: "cnpj", value: { cnpj: "12345678000195" } });
    assert.equal(state.size().inputs, 0);

    const confirm = createConfirmation(state, ctx(), { action: "backup", prefix: "backup", ttlMs: 100 });
    assert.equal(consumeConfirmation(state, ctx({ chatId: "chat-b" }), confirm.confirm).ok, false);
    assert.equal(consumeConfirmation(state, ctx(), confirm.confirm).ok, true);
    assert.equal(consumeConfirmation(state, ctx(), confirm.confirm).ok, false);
  });

  it("rejeita callback malformado e expira estado sem persistir texto livre", () => {
    let now = 1_000;
    const state = createTelegramInteractions({ now: () => now, capacity: 2 });
    createInputRequest(state, ctx(), { kind: "empenho", fields: ["id"], ttlMs: 10 });
    now += 11;
    assert.equal(consumeInputRequest(state, ctx(), "segredo livre", (raw) => ({ id: raw })).ok, false);
    assert.deepEqual(state.size(), { confirmations: 0, inputs: 0, pages: 0 });
    assert.equal(consumeConfirmation(state, ctx(), "backup:confirm:%%%").ok, false);

    createPageCallback(state, ctx(), { action: "prazos", page: 1 });
    createPageCallback(state, ctx(), { action: "prazos", page: 2 });
    createPageCallback(state, ctx(), { action: "prazos", page: 3 });
    assert.equal(state.size().pages, 2);
  });
});

describe("telegram document transport", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "inaja-telegram-"));
    await writeFile(join(tempDir, "backup.zip"), "archive-content");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function withTelegramServer(handler, run) {
    const server = createServer(handler);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    try {
      await run(`http://127.0.0.1:${port}`);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }

  it("envia um único documento multipart e retorna somente metadados seguros", async () => {
    let requests = 0;
    await withTelegramServer(async (req, res) => {
      requests += 1;
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString("utf8");
      assert.equal(req.method, "POST");
      assert.match(req.url, /\/botredacted-token\/sendDocument$/);
      assert.match(req.headers["content-type"], /^multipart\/form-data; boundary=/);
      assert.match(body, /name="chat_id"\r\n\r\n9988/);
      assert.match(body, /name="document"; filename="backup\.zip"/);
      assert.match(body, /archive-content/);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({
        ok: true,
        result: {
          message_id: 22,
          chat: { id: 9988 },
          document: { file_id: "file-1", file_name: "backup.zip", file_size: 15 },
          text: "must-not-be-returned",
        },
      }));
    }, async (apiBaseUrl) => {
      const client = createTelegramClient("redacted-token", { apiBaseUrl });
      const metadata = await client.sendDocument(9988, join(tempDir, "backup.zip"));
      assert.deepEqual(metadata, {
        messageId: 22,
        chatId: "9988",
        document: { fileId: "file-1", fileName: "backup.zip", fileSize: 15 },
      });
    });
    assert.equal(requests, 1);
  });

  it("classifica limite, API e transporte sem vazar segredo ou conteúdo", async () => {
    const archive = join(tempDir, "backup.zip");
    await withTelegramServer((req, res) => {
      res.writeHead(429, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error_code: 429, description: "token redacted-token archive-content" }));
    }, async (apiBaseUrl) => {
      const client = createTelegramClient("redacted-token", { apiBaseUrl });
      await assert.rejects(client.sendDocument("1", archive), (error) => {
        assert.equal(error.code, "TELEGRAM_RATE_LIMIT");
        assert.doesNotMatch(error.message, /redacted-token|archive-content/);
        return true;
      });
    });

    await withTelegramServer((req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: false, error_code: 400, description: "token redacted-token archive-content" }));
    }, async (apiBaseUrl) => {
      const client = createTelegramClient("redacted-token", { apiBaseUrl });
      await assert.rejects(client.sendDocument("1", archive), (error) => {
        assert.equal(error.code, "TELEGRAM_API");
        assert.doesNotMatch(error.message, /redacted-token|archive-content/);
        return true;
      });
    });

    const client = createTelegramClient("redacted-token", { apiBaseUrl: "http://127.0.0.1:1", timeoutMs: 1000 });
    await assert.rejects(client.sendDocument("1", archive), (error) => {
      assert.equal(error.code, "TELEGRAM_TRANSPORT");
      assert.doesNotMatch(error.message, /redacted-token|archive-content/);
      return true;
    });
  });

  it("rejeita resposta de sucesso sem metadados de mensagem", async () => {
    await withTelegramServer((req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true, result: { document: { file_id: "file-1" } } }));
    }, async (apiBaseUrl) => {
      const client = createTelegramClient("redacted-token", { apiBaseUrl });
      await assert.rejects(client.sendDocument("1", join(tempDir, "backup.zip")), (error) => {
        assert.equal(error.code, "TELEGRAM_INVALID_RESPONSE");
        return true;
      });
    });
  });

  it("recusa arquivo acima do limite antes de iniciar qualquer envio", async () => {
    const largeArchive = join(tempDir, "backup-grande.zip");
    await writeFile(largeArchive, "");
    await truncate(largeArchive, 50 * 1024 * 1024 + 1);
    const client = createTelegramClient("redacted-token", { apiBaseUrl: "http://127.0.0.1:1" });
    await assert.rejects(client.sendDocument("1", largeArchive), (error) => {
      assert.equal(error.code, "TELEGRAM_DOCUMENT_TOO_LARGE");
      assert.doesNotMatch(error.message, /redacted-token|backup-grande/);
      return true;
    });
  });

  it("trata arquivo removido após a validação como indisponível sem vazar caminho", async () => {
    const archive = join(tempDir, "backup.zip");
    const client = createTelegramClient("redacted-token", {
      apiBaseUrl: "http://127.0.0.1:1",
      fileAccess: {
        stat: fileStat,
        openAsBlob: async () => {
          throw new Error(`ENOENT ${archive} redacted-token archive-content`);
        },
      },
    });
    await assert.rejects(client.sendDocument("1", archive), (error) => {
      assert.equal(error.code, "TELEGRAM_DOCUMENT_UNAVAILABLE");
      assert.doesNotMatch(error.message, /redacted-token|archive-content|backup\.zip/);
      return true;
    });
  });

  it("classifica timeout de servidor lento e não tenta novo envio", async () => {
    let requests = 0;
    await withTelegramServer(async (req, res) => {
      requests += 1;
      for await (const chunk of req) void chunk;
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      if (!res.destroyed) res.end();
    }, async (apiBaseUrl) => {
      const client = createTelegramClient("redacted-token", { apiBaseUrl, timeoutMs: 1_000 });
      await assert.rejects(client.sendDocument("1", join(tempDir, "backup.zip")), (error) => {
        assert.equal(error.code, "TELEGRAM_TIMEOUT");
        return true;
      });
    });
    assert.equal(requests, 1);
  });
});

describe("telegram RPCs", () => {
  let db;
  beforeEach(() => {
    ({ db } = freshDb());
  });

  it("gerar código exige admin", async () => {
    const denied = await runRpc(db, "telegram_gerar_codigo", { _caller: "luana" });
    assert.equal(denied.error?.code, "FORBIDDEN");
    const ok = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin", _username: "luana" });
    assert.equal(ok.error, null);
    assert.match(ok.data.codigo, /^\d{6}$/);
  });

  it("consumir código vincula chat", async () => {
    const gen = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin", _username: "luana" });
    const cons = await runRpc(db, "telegram_consumir_codigo", {
      _codigo: gen.data.codigo,
      _chat_id: "999001",
      _username_tg: "luana_tg",
    });
    assert.equal(cons.error, null);
    assert.equal(cons.data.username, "luana");
    const v = resolveVinculo(db, "999001");
    assert.ok(v);
    assert.equal(v.username, "luana");
    assert.equal(v.isAdmin, false);
    const mods = listModulos(db, v.usuarioId);
    assert.deepEqual(mods, ["prazos"]);
  });

  it("código inválido falha", async () => {
    const r = await runRpc(db, "telegram_consumir_codigo", {
      _codigo: "000000",
      _chat_id: "1",
    });
    assert.equal(r.error?.code, "INVALID_CODE");
  });

  it("desvincular chat", async () => {
    const gen = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin" });
    await runRpc(db, "telegram_consumir_codigo", {
      _codigo: gen.data.codigo,
      _chat_id: "42",
    });
    const d = await runRpc(db, "telegram_desvincular_chat", { _chat_id: "42" });
    assert.equal(d.error, null);
    assert.equal(resolveVinculo(db, "42"), null);
  });

  it("listar vínculos admin", async () => {
    const gen = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin" });
    await runRpc(db, "telegram_consumir_codigo", {
      _codigo: gen.data.codigo,
      _chat_id: "77",
    });
    const list = await runRpc(db, "telegram_listar_vinculos", { _caller: "admin" });
    assert.equal(list.error, null);
    assert.ok(list.data.some((v) => v.chat_id === "77"));
  });
});

describe("telegram menu and encrypted backup callbacks", () => {
  let db;
  let admin;
  let regular;

  beforeEach(() => {
    ({ db } = freshDb());
    admin = resolveVinculo(db, "admin-chat");
    regular = resolveVinculo(db, "regular-chat");
    db.prepare("INSERT INTO telegram_vinculos (id, usuario_id, chat_id, ativo) VALUES (?, ?, ?, 1)").run(
      randomUUID(),
      db.prepare("SELECT id FROM usuarios WHERE username = 'admin'").get().id,
      "admin-chat",
    );
    db.prepare("INSERT INTO telegram_vinculos (id, usuario_id, chat_id, ativo) VALUES (?, ?, ?, 1)").run(
      randomUUID(),
      db.prepare("SELECT id FROM usuarios WHERE username = 'luana'").get().id,
      "regular-chat",
    );
    admin = resolveVinculo(db, "admin-chat");
    regular = resolveVinculo(db, "regular-chat");
  });

  function context(overrides = {}) {
    return {
      db,
      chatId: "admin-chat",
      fromId: "admin-actor",
      user: admin,
      modulos: [],
      text: "",
      callbackData: null,
      callbackId: null,
      client: {
        sendDocument: async () => ({
          messageId: 81,
          chatId: "admin-chat",
          document: { fileId: "document-81", fileName: "backup.zip", fileSize: 50 },
        }),
      },
      backupOps: {
        createBackup: () => ({ id: "2026-07-19_200000", bytes: 10, files: ["inaja.sqlite"] }),
        createEncryptedBackupArchive: async () => ({
          path: "C:/temp/backup.zip",
          name: "backup.zip",
          bytes: 50,
          cleanupToken: "cleanup",
        }),
        removeEncryptedBackupArchive: () => {},
      },
      ...overrides,
    };
  }

  it("abre o menu por texto comum e por start sem instruir comandos", async () => {
    const plain = await handleCommand(context({ user: null, text: "olá" }));
    const started = await handleCommand(context({ text: "/start" }));
    const legacyCommand = await handleCommand(context({ text: "/backup" }));
    const help = await handleCommand(context({ callbackData: "menu:ajuda", callbackId: "help" }));
    assert.ok(plain.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:vinculo"));
    assert.ok(started.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:backup"));
    assert.ok(legacyCommand.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:backup"));
    assert.doesNotMatch(started.text, /\/(start|ajuda|vincular|backup)/i);
    assert.doesNotMatch(legacyCommand.text, /\/(start|ajuda|vincular|backup)/i);
    assert.doesNotMatch(help.text, /\/(start|ajuda|vincular|backup)/i);
  });

  it("mostra o menu de botões depois de vincular sem instruir comando", async () => {
    const generated = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin" });
    const prompt = await handleCommand(context({ chatId: "novo-chat", fromId: "novo-actor", user: null, callbackData: "menu:vinculo", callbackId: "pair" }));
    const linked = await handleCommand(context({ chatId: "novo-chat", fromId: "novo-actor", user: null, text: generated.data.codigo }));

    assert.match(prompt.text, /seis dígitos/i);
    assert.ok(linked.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:backup"));
    assert.doesNotMatch(linked.text, /\/(start|ajuda|vincular|backup)/i);
  });

  it("aceita código de vínculo apenas após o botão, no chat e origem que o solicitaram", async () => {
    const generated = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin" });
    const outside = await handleCommand(context({ chatId: "fora-chat", fromId: "fora-actor", user: null, text: generated.data.codigo }));
    assert.ok(outside.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:vinculo"));
    assert.equal(resolveVinculo(db, "fora-chat"), null);

    await handleCommand(context({ chatId: "parear-chat", fromId: "actor-a", user: null, callbackData: "menu:vinculo", callbackId: "pair" }));
    const wrongActor = await handleCommand(context({ chatId: "parear-chat", fromId: "actor-b", user: null, text: generated.data.codigo }));
    assert.ok(wrongActor.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:vinculo"));
    assert.equal(resolveVinculo(db, "parear-chat"), null);

    const originalActor = await handleCommand(context({ chatId: "parear-chat", fromId: "actor-a", user: null, text: generated.data.codigo }));
    assert.ok(originalActor.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:backup"));

    const expiring = await runRpc(db, "telegram_gerar_codigo", { _caller: "admin" });
    await handleCommand(context({ chatId: "expirado-chat", fromId: "actor-expirado", user: null, callbackData: "menu:vinculo", callbackId: "pair-expired" }));
    const originalNow = Date.now;
    Date.now = () => originalNow() + 120_001;
    try {
      const expired = await handleCommand(context({ chatId: "expirado-chat", fromId: "actor-expirado", user: null, text: expiring.data.codigo }));
      assert.ok(expired.reply_markup.inline_keyboard.flat().some((button) => button.callback_data === "menu:vinculo"));
      assert.equal(resolveVinculo(db, "expirado-chat"), null);
    } finally {
      Date.now = originalNow;
    }
  });

  it("envia uma vez após confirmação vinculada e registra somente metadados", async () => {
    db.prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?)").run("backup_telegram_senha", "test-only-password");
    let sent = 0;
    let cleaned = 0;
    let sentChatId = null;
    const asked = await handleCommand(context({ callbackData: "menu:backup", callbackId: "ask" }));
    const confirm = asked.reply_markup.inline_keyboard[0][0].callback_data;
    const done = await handleCommand(context({
      callbackData: confirm,
      callbackId: "confirm",
      client: {
        sendDocument: async (chatId) => {
          sent += 1;
          sentChatId = chatId;
          return { messageId: 81, chatId: String(chatId), document: { fileId: "document-81", fileName: "backup.zip", fileSize: 50 } };
        },
      },
      backupOps: {
        createBackup: () => ({ id: "2026-07-19_200000", bytes: 10, files: ["inaja.sqlite"] }),
        createEncryptedBackupArchive: async () => ({ path: "C:/temp/backup.zip", name: "backup.zip", bytes: 50, cleanupToken: "cleanup" }),
        removeEncryptedBackupArchive: () => { cleaned += 1; },
      },
    }));
    assert.equal(sent, 1);
    assert.equal(sentChatId, "admin-chat");
    assert.equal(cleaned, 1);
    assert.match(done.text, /Backup enviado/);
    assert.equal(done.skipLog, true);
    const replay = await handleCommand(context({ callbackData: confirm, callbackId: "replay" }));
    assert.match(replay.text, /expirada/i);
    assert.equal(sent, 1);
    const log = db.prepare("SELECT comando, args_redacted FROM telegram_logs WHERE comando = 'backup_telegram_enviado'").get();
    assert.equal(log.comando, "backup_telegram_enviado");
    assert.doesNotMatch(log.args_redacted, /test-only-password|C:\\temp/);
  });

  it("rejeita nonce de confirmação para outro usuário vinculado sem consumi-lo", async () => {
    db.prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?)").run("backup_telegram_senha", "test-only-password");
    let archiveCalls = 0;
    let sendCalls = 0;
    const asked = await handleCommand(context({ callbackData: "menu:backup", callbackId: "ask" }));
    const confirm = asked.reply_markup.inline_keyboard[0][0].callback_data;
    const ops = {
      createBackup: () => ({ id: "2026-07-19_200000" }),
      createEncryptedBackupArchive: async () => { archiveCalls += 1; return { path: "C:/temp/backup.zip", name: "backup.zip", bytes: 50 }; },
      removeEncryptedBackupArchive: () => {},
    };
    const deniedOtherUser = await handleCommand(context({ chatId: "regular-chat", fromId: "regular-actor", user: regular, callbackData: confirm, callbackId: "other", backupOps: ops, client: { sendDocument: async () => { sendCalls += 1; } } }));
    assert.match(deniedOtherUser.text, /expirada/i);
    assert.equal(archiveCalls, 0);
    assert.equal(sendCalls, 0);
    const deniedUser = await handleCommand(context({ chatId: "regular-chat", user: regular, callbackData: "menu:backup", callbackId: "regular", backupOps: ops }));
    const delivered = await handleCommand(context({ callbackData: confirm, callbackId: "valid", backupOps: ops, client: { sendDocument: async () => { sendCalls += 1; return { messageId: 1, document: {} }; } } }));
    const replay = await handleCommand(context({ callbackData: confirm, callbackId: "replay", backupOps: ops, client: { sendDocument: async () => { sendCalls += 1; } } }));
    assert.match(deniedUser.text, /administradores/i);
    assert.match(delivered.text, /Backup enviado/);
    assert.match(replay.text, /expirada/i);
    assert.equal(archiveCalls, 1);
    assert.equal(sendCalls, 1);
  });

  it("expira a confirmação antes de criar o backup ou enviar arquivo", async () => {
    const asked = await handleCommand(context({ callbackData: "menu:backup", callbackId: "ask" }));
    const confirm = asked.reply_markup.inline_keyboard[0][0].callback_data;
    const originalNow = Date.now;
    Date.now = () => originalNow() + 120_001;
    try {
      const expired = await handleCommand(context({ callbackData: confirm, callbackId: "expired" }));
      assert.match(expired.text, /expirada/i);
    } finally {
      Date.now = originalNow;
    }
  });

  it("limpa o arquivo temporário e preserva o backup local quando Telegram falha", async () => {
    db.prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?)").run("backup_telegram_senha", "test-only-password");
    let cleaned = 0;
    const asked = await handleCommand(context({ callbackData: "menu:backup", callbackId: "ask" }));
    const confirm = asked.reply_markup.inline_keyboard[0][0].callback_data;
    const failed = await handleCommand(context({
      callbackData: confirm,
      callbackId: "confirm",
      client: { sendDocument: async () => { throw Object.assign(new Error("offline"), { code: "TELEGRAM_TRANSPORT" }); } },
      backupOps: {
        createBackup: () => ({ id: "2026-07-19_200000" }),
        createEncryptedBackupArchive: async () => ({ path: "C:/temp/backup.zip", name: "backup.zip", bytes: 50, cleanupToken: "cleanup" }),
        removeEncryptedBackupArchive: () => { cleaned += 1; },
      },
    }));
    assert.equal(cleaned, 1);
    assert.match(failed.text, /backup local foi preservado/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM telegram_logs WHERE comando = 'backup_telegram_enviado'").get().total, 0);
  });

  it("abre guia de ramais e permite paginação e busca por callback", async () => {
    const ramais = await handleCommand(context({ callbackData: "menu:ramais", callbackId: "ramais-btn" }));
    assert.match(ramais.text, /Guia de Ramais/i);
    assert.match(ramais.text, /Recepção/i);
    assert.match(ramais.text, /1200/);

    const filtrado = await handleCommand(context({ callbackData: "menu:ramais:p:1:hospital", callbackId: "ramais-filt" }));
    assert.match(filtrado.text, /Hospital/i);
    assert.match(filtrado.text, /2101/);
  });
});
