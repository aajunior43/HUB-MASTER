import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { migrate } from "./db.mjs";
import { resolveVinculo } from "./telegram/session.mjs";
import { clearTelegramInteractions } from "./telegram/interactions.mjs";
import { processTelegramUpdate } from "./telegram/index.mjs";
import { handleCommand } from "./telegram/commands.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const adminId = randomUUID();
  const userId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(adminId, "admin");
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "luana");
  return { db, userId };
}

describe("telegram operational workflows task 4", () => {
  let db;
  let userId;
  let regular;
  let other;

  beforeEach(() => {
    clearTelegramInteractions();
    ({ db, userId } = freshDb());
    for (const modulo of ["tarefas", "mural", "prazos", "calendario"]) {
      db.prepare("INSERT OR IGNORE INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)").run(randomUUID(), userId, modulo);
    }
    for (const chatId of ["regular-chat", "other-chat"]) {
      db.prepare("INSERT INTO telegram_vinculos (id, usuario_id, chat_id, ativo) VALUES (?, ?, ?, 1)").run(randomUUID(), userId, chatId);
    }
    regular = resolveVinculo(db, "regular-chat");
    other = resolveVinculo(db, "other-chat");
  });

  function context(overrides = {}) {
    return {
      db,
      chatId: "regular-chat",
      fromId: "regular-actor",
      user: regular,
      modulos: ["prazos", "tarefas", "mural", "calendario"],
      text: "",
      callbackData: null,
      callbackId: null,
      client: {
        sendMessage: async () => {},
        answerCallbackQuery: async () => {},
        editMessageText: async () => {},
      },
      ...overrides,
    };
  }

  function firstButton(result, matcher) {
    const buttons = result.reply_markup?.inline_keyboard?.flat() || [];
    const button = buttons.find((b) => typeof matcher === "string" ? b.text === matcher : matcher.test(b.text));
    assert.ok(button, `botao ${matcher} ausente em ${JSON.stringify(buttons)}`);
    return button.callback_data;
  }

  function confirmation(result) {
    return firstButton(result, /Confirmar/);
  }

  it("lista, pagina e abre detalhes dos fluxos permitidos", async () => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    for (let i = 1; i <= 6; i++) {
      db.prepare("INSERT INTO tarefas (id, titulo, descricao, responsavel, prioridade, status, prazo, ordem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(`task-${i}`, `Tarefa ${i}`, "Descricao", "Luana", "media", "todo", "2026-08-01", i);
      db.prepare("INSERT INTO mural_recados (id, titulo, conteudo, autor, prioridade, categoria, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(`mural-${i}`, `Recado ${i}`, "Conteudo", "luana", "media", "comunicado", "a_fazer");
      db.prepare("INSERT INTO prazos (id, titulo, descricao, data_limite, categoria) VALUES (?, ?, ?, ?, ?)").run(`prazo-${i}`, `Prazo ${i}`, "Descricao", `2026-08-2${i}`, "geral");
      db.prepare("INSERT INTO calendario_eventos (id, data, tipo, texto, descricao) VALUES (?, ?, ?, ?, ?)").run(`cal-${i}`, `${mesAtual}-2${i}`, "NOTE", `Evento ${i}`, "Descricao");
    }

    const tarefas = await handleCommand(context({ callbackData: "menu:tarefas", callbackId: "tarefas" }));
    assert.match(tarefas.text, /Tarefas/);
    assert.match((await handleCommand(context({ callbackData: firstButton(tarefas, /xima/), callbackId: "tarefas-page" }))).text, /2\/2/);
    assert.match((await handleCommand(context({ callbackData: firstButton(tarefas, /Tarefa 1/), callbackId: "tarefas-detail" }))).text, /Status:/);

    const mural = await handleCommand(context({ callbackData: "menu:mural", callbackId: "mural" }));
    assert.match(mural.text, /Mural/);
    assert.match((await handleCommand(context({ callbackData: firstButton(mural, /xima/), callbackId: "mural-page" }))).text, /2\/2/);
    assert.match((await handleCommand(context({ callbackData: firstButton(mural, /Recado/), callbackId: "mural-detail" }))).text, /Comentarios|Coment/);

    const prazos = await handleCommand(context({ callbackData: "menu:prazos", callbackId: "prazos" }));
    assert.match(prazos.text, /Prazos/);
    assert.match((await handleCommand(context({ callbackData: firstButton(prazos, /xima/), callbackId: "prazos-page" }))).text, /2\/2/);
    assert.match((await handleCommand(context({ callbackData: firstButton(prazos, /Prazo 1/), callbackId: "prazos-detail" }))).text, /Data:/);

    const calendario = await handleCommand(context({ callbackData: "menu:calendario", callbackId: "calendario" }));
    assert.match(calendario.text, /Calend/);
    assert.match((await handleCommand(context({ callbackData: firstButton(calendario, /xima/), callbackId: "cal-page" }))).text, /2\/2/);
    assert.match((await handleCommand(context({ callbackData: firstButton(calendario, /Evento 1/), callbackId: "cal-detail" }))).text, /Tipo:/);
  });

  it("nega callbacks diretos sem permissao sem chamar backend", async () => {
    const deniedContext = { db: { prepare: () => { throw new Error("backend called"); } }, modulos: [] };
    for (const [callbackData, label] of [["menu:tarefas", /tarefas/], ["menu:mural", /mural/], ["menu:prazos", /prazos/], ["menu:calendario", /calend/]]) {
      const denied = await handleCommand(context({ ...deniedContext, callbackData, callbackId: `denied-${callbackData}` }));
      assert.match(denied.text, /Sem permiss/i);
      assert.match(denied.text, label);
    }
  });

  it("cria, atualiza e muda status de tarefas com confirmacao, expiracao e replay", async () => {
    await handleCommand(context({ callbackData: "tg4:tarefa:create", callbackId: "new-task" }));
    assert.match((await handleCommand(context({ text: "Sem separadores suficientes" }))).text, /inv/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tarefas").get().total, 0);

    await handleCommand(context({ callbackData: "tg4:tarefa:create", callbackId: "new-task-2" }));
    const asked = await handleCommand(context({ text: "Comprar papel | Descricao inicial | LUANA | alta | todo | 2026-08-01" }));
    const confirm = confirmation(asked);
    const created = await handleCommand(context({ callbackData: confirm, callbackId: "confirm-task" }));
    assert.match(created.text, /Tarefa criada/i);
    const task = db.prepare("SELECT * FROM tarefas WHERE titulo = ?").get("Comprar papel");
    assert.ok(task);
    assert.match((await handleCommand(context({ callbackData: confirm, callbackId: "replay-task" }))).text, /expirada/i);

    await handleCommand(context({ callbackData: `tg4:tarefa:update:${task.id}`, callbackId: "edit-task" }));
    const updateAsked = await handleCommand(context({ text: "Comprar papel A4 | Descricao atualizada | MAICON | media | doing | 2026-08-02" }));
    await handleCommand(context({ callbackData: confirmation(updateAsked), callbackId: "confirm-update-task" }));
    assert.deepEqual({ ...db.prepare("SELECT titulo, status, prioridade, prazo FROM tarefas WHERE id = ?").get(task.id) }, { titulo: "Comprar papel A4", status: "doing", prioridade: "media", prazo: "2026-08-02" });

    const statusAsked = await handleCommand(context({ callbackData: `tg4:tarefa:status:${task.id}:done`, callbackId: "status-task" }));
    const statusConfirm = confirmation(statusAsked);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 120_001;
    try {
      assert.match((await handleCommand(context({ callbackData: statusConfirm, callbackId: "expired-status" }))).text, /expirada/i);
    } finally {
      Date.now = originalNow;
    }
    assert.equal(db.prepare("SELECT status FROM tarefas WHERE id = ?").get(task.id).status, "doing");
    const statusAskedAgain = await handleCommand(context({ callbackData: `tg4:tarefa:status:${task.id}:done`, callbackId: "status-task-2" }));
    await handleCommand(context({ callbackData: confirmation(statusAskedAgain), callbackId: "confirm-status" }));
    assert.equal(db.prepare("SELECT status FROM tarefas WHERE id = ?").get(task.id).status, "done");
  });

  it("publica no mural, comenta e impede replay", async () => {
    await handleCommand(context({ callbackData: "tg4:mural:create", callbackId: "new-mural" }));
    assert.match((await handleCommand(context({ text: "Titulo sem conteudo" }))).text, /inv/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM mural_recados").get().total, 0);

    await handleCommand(context({ callbackData: "tg4:mural:create", callbackId: "new-mural-2" }));
    const asked = await handleCommand(context({ text: "Aviso geral | Conteudo visivel | alta | comunicado" }));
    const confirm = confirmation(asked);
    await handleCommand(context({ callbackData: confirm, callbackId: "confirm-mural" }));
    assert.match((await handleCommand(context({ callbackData: confirm, callbackId: "replay-mural" }))).text, /expirada/i);
    const recado = db.prepare("SELECT * FROM mural_recados WHERE titulo = ?").get("Aviso geral");
    assert.ok(recado);
    await handleCommand(context({ callbackData: `tg4:mural:comment:${recado.id}`, callbackId: "comment-mural" }));
    const commentAsked = await handleCommand(context({ text: "Recebido pela equipe" }));
    await handleCommand(context({ callbackData: confirmation(commentAsked), callbackId: "confirm-comment" }));
    assert.equal(db.prepare("SELECT texto FROM mural_comentarios WHERE recado_id = ?").get(recado.id).texto, "Recebido pela equipe");
  });

  it("cria, atualiza e resolve prazos com confirmacao e replay", async () => {
    await handleCommand(context({ callbackData: "tg4:prazo:create", callbackId: "new-prazo" }));
    assert.match((await handleCommand(context({ text: "Prazo sem data | descricao | data-errada | geral" }))).text, /inv/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM prazos").get().total, 0);

    await handleCommand(context({ callbackData: "tg4:prazo:create", callbackId: "new-prazo-2" }));
    const asked = await handleCommand(context({ text: "Renovar contrato | Conferir documentos | 2026-08-20 | contrato" }));
    const confirm = confirmation(asked);
    await handleCommand(context({ callbackData: confirm, callbackId: "confirm-prazo" }));
    assert.match((await handleCommand(context({ callbackData: confirm, callbackId: "replay-prazo" }))).text, /expirada/i);
    const prazo = db.prepare("SELECT * FROM prazos WHERE titulo = ?").get("Renovar contrato");
    assert.ok(prazo);

    await handleCommand(context({ callbackData: `tg4:prazo:update:${prazo.id}`, callbackId: "edit-prazo" }));
    const updateAsked = await handleCommand(context({ text: "Renovar contrato 2 | Nova descricao | 2026-08-25 | fiscal" }));
    await handleCommand(context({ callbackData: confirmation(updateAsked), callbackId: "confirm-update-prazo" }));
    assert.deepEqual({ ...db.prepare("SELECT titulo, data_limite, categoria FROM prazos WHERE id = ?").get(prazo.id) }, { titulo: "Renovar contrato 2", data_limite: "2026-08-25", categoria: "fiscal" });
    const resolveAsked = await handleCommand(context({ callbackData: `tg4:prazo:resolve:${prazo.id}`, callbackId: "resolve-prazo" }));
    await handleCommand(context({ callbackData: confirmation(resolveAsked), callbackId: "confirm-resolve-prazo" }));
    assert.equal(db.prepare("SELECT resolvido FROM prazos WHERE id = ?").get(prazo.id).resolvido, 1);
  });

  it("cria e atualiza calendario sem campos complexos", async () => {
    await handleCommand(context({ callbackData: "tg4:cal:create", callbackId: "new-cal" }));
    assert.match((await handleCommand(context({ text: "2026-08-01 | TIPO | Texto | descricao" }))).text, /inv/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM calendario_eventos").get().total, 0);

    await handleCommand(context({ callbackData: "tg4:cal:create", callbackId: "new-cal-2" }));
    const asked = await handleCommand(context({ text: "2026-08-01 | NOTE | Reuniao de alinhamento | Sala principal" }));
    await handleCommand(context({ callbackData: confirmation(asked), callbackId: "confirm-cal" }));
    const evento = db.prepare("SELECT * FROM calendario_eventos WHERE texto = ?").get("Reuniao de alinhamento");
    assert.ok(evento);
    await handleCommand(context({ callbackData: `tg4:cal:update:${evento.id}`, callbackId: "edit-cal" }));
    const updateAsked = await handleCommand(context({ text: "2026-08-02 | COMMITMENT | Reuniao atualizada | Gabinete" }));
    const confirm = confirmation(updateAsked);
    await handleCommand(context({ callbackData: confirm, callbackId: "confirm-update-cal" }));
    assert.deepEqual({ ...db.prepare("SELECT data, tipo, texto, descricao FROM calendario_eventos WHERE id = ?").get(evento.id) }, { data: "2026-08-02", tipo: "COMMITMENT", texto: "Reuniao atualizada", descricao: "Gabinete" });
    assert.match((await handleCommand(context({ callbackData: confirm, callbackId: "replay-cal" }))).text, /expirada/i);
  });

  it("vincula confirmacoes ao chat, modulo vigente e estado em memoria", async () => {
    await handleCommand(context({ callbackData: "tg4:prazo:create", callbackId: "create-cross" }));
    const crossAsked = await handleCommand(context({ text: "Prazo cruzado | Descricao | 2026-08-30 | geral" }));
    const crossConfirm = confirmation(crossAsked);
    assert.match((await handleCommand(context({ chatId: "other-chat", fromId: "other-actor", user: other, callbackData: crossConfirm, callbackId: "other-confirm" }))).text, /expirada/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM prazos WHERE titulo = 'Prazo cruzado'").get().total, 0);
    await handleCommand(context({ callbackData: crossConfirm, callbackId: "valid-cross" }));
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM prazos WHERE titulo = 'Prazo cruzado'").get().total, 1);

    await handleCommand(context({ callbackData: "tg4:prazo:create", callbackId: "create-revoked" }));
    const revokedAsked = await handleCommand(context({ text: "Prazo revogado | Descricao | 2026-08-31 | geral" }));
    assert.match((await handleCommand(context({ modulos: ["tarefas", "mural", "calendario"], callbackData: confirmation(revokedAsked), callbackId: "revoked-confirm" }))).text, /Sem permiss/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM prazos WHERE titulo = 'Prazo revogado'").get().total, 0);

    await handleCommand(context({ callbackData: "tg4:prazo:create", callbackId: "create-restart" }));
    const restartAsked = await handleCommand(context({ text: "Prazo restart | Descricao | 2026-09-01 | geral" }));
    const restartConfirm = confirmation(restartAsked);
    clearTelegramInteractions();
    assert.match((await handleCommand(context({ callbackData: restartConfirm, callbackId: "restart-confirm" }))).text, /expirada/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM prazos WHERE titulo = 'Prazo restart'").get().total, 0);
  });

  it("executa sequencia manual por update fake e nao audita texto livre", async () => {
    const sent = [];
    const edited = [];
    const client = {
      sendMessage: async (chatId, text, options) => sent.push({ chatId: String(chatId), text, options }),
      editMessageText: async (chatId, messageId, text, options) => edited.push({ chatId: String(chatId), messageId, text, options }),
      answerCallbackQuery: async () => {},
    };
    await processTelegramUpdate(db, client, { message: { chat: { id: "regular-chat", type: "private" }, from: { id: "regular-actor" }, text: "/start" } });
    await processTelegramUpdate(db, client, { callback_query: { id: "cb-menu", from: { id: "regular-actor" }, data: "menu:prazos", message: { message_id: 1, chat: { id: "regular-chat", type: "private" } } } });
    await processTelegramUpdate(db, client, { callback_query: { id: "cb-new", from: { id: "regular-actor" }, data: "tg4:prazo:create", message: { message_id: 1, chat: { id: "regular-chat", type: "private" } } } });
    const privateText = `Prazo QA ${randomUUID()} | texto que nao deve entrar no log | 2026-08-30 | geral`;
    await processTelegramUpdate(db, client, { message: { chat: { id: "regular-chat", type: "private" }, from: { id: "regular-actor" }, text: privateText } });
    await processTelegramUpdate(db, client, { callback_query: { id: "cb-confirm", from: { id: "regular-actor" }, data: sent.at(-1).options.reply_markup.inline_keyboard[0][0].callback_data, message: { message_id: 2, chat: { id: "regular-chat", type: "private" } } } });

    assert.ok(sent.some((m) => /Escolha uma op/i.test(m.text)));
    assert.ok(edited.some((m) => /Prazos/i.test(m.text)));
    assert.ok(sent.some((m) => /Confirmar cria/i.test(m.text)));
    assert.ok(edited.some((m) => /Prazo criado/i.test(m.text)));
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM prazos WHERE titulo LIKE 'Prazo QA %'").get().total, 1);
    assert.equal(db.prepare("SELECT args_redacted FROM telegram_logs WHERE chat_id = ?").all("regular-chat").some((log) => String(log.args_redacted).includes(privateText)), false);
  });
});
