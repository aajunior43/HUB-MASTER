import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { migrate } from "./db.mjs";
import { handleCommand } from "./telegram/commands.mjs";
import { clearTelegramInteractions } from "./telegram/interactions.mjs";
import { processTelegramUpdate } from "./telegram/index.mjs";
import { resolveVinculo } from "./telegram/session.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const userId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "luana");
  for (const modulo of ["credores-fixos", "empenhos", "rpas", "extratos", "cnpj", "solicitacoes"]) {
    db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)").run(randomUUID(), userId, modulo);
  }
  for (const chatId of ["regular-chat", "other-chat"]) {
    db.prepare("INSERT INTO telegram_vinculos (id, usuario_id, chat_id, ativo) VALUES (?, ?, ?, 1)").run(randomUUID(), userId, chatId);
  }
  db.prepare("INSERT INTO credores_fixos (id, nome, documento, departamento, valor_mensal, descricao) VALUES (?, ?, ?, ?, ?, ?)").run("cred-1", "Energia LTDA", "123", "Financas", 1200, "Conta mensal");
  db.prepare("INSERT INTO empenhos_orcamentarios (id, numero_empenho, ano_empenho, data, nome_credor, modalidade, especificacao, valor_empenhado_bruto, valor_liquidado_bruto, valor_baixado_bruto, saldo_pagar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("emp-1", "15", 2026, "2026-07-01", "Energia LTDA", "Global", "Energia eletrica", 5000, 3000, 2000, 1000);
  db.prepare("INSERT INTO rpas (id, numero_rpa, nome_prestador, cpf_prestador, descricao_servico, valor_bruto, valor_liquido, periodo_referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run("rpa-1", "7", "Joao Silva", "000", "Servico eventual", 900, 760, "07/2026");
  db.prepare("INSERT INTO em_contas (id, nome, banco, saldo_inicial) VALUES (?, ?, ?, ?)").run("conta-1", "Conta Corrente", "001", 100);
  db.prepare("INSERT INTO em_transacoes (id, conta_id, data, descricao, valor, tipo, categoria) VALUES (?, ?, ?, ?, ?, ?, ?)").run("tx-1", "conta-1", "2026-07-01", "Repasse", 3000, "receita", "repasse");
  db.prepare("INSERT INTO solicitacoes (id, solicitante, empresa, data_solicitacao, observacoes, items, valor_total) VALUES (?, ?, ?, ?, ?, ?, ?)").run("sol-1", "Luana", "Fornecedor A", "2026-07-02", "Observacao", "[]", 250);
  return { db, userId };
}

describe("telegram financial workflows task 5", () => {
  let db;
  let regular;

  beforeEach(() => {
    clearTelegramInteractions();
    ({ db } = freshDb());
    regular = resolveVinculo(db, "regular-chat");
  });

  function context(overrides = {}) {
    return {
      db,
      chatId: "regular-chat",
      fromId: "regular-actor",
      user: regular,
      modulos: ["credores-fixos", "empenhos", "rpas", "extratos", "cnpj", "solicitacoes"],
      text: "",
      callbackData: null,
      callbackId: null,
      client: { sendMessage: async () => {}, editMessageText: async () => {}, answerCallbackQuery: async () => {} },
      ...overrides,
    };
  }

  function button(result, matcher) {
    const buttons = result.reply_markup?.inline_keyboard?.flat() || [];
    const found = buttons.find((b) => typeof matcher === "string" ? b.callback_data === matcher : matcher.test(b.text));
    assert.ok(found, `botao ausente ${matcher}: ${JSON.stringify(buttons)}`);
    return found.callback_data;
  }

  function confirm(result) {
    return button(result, /Confirmar/);
  }

  it("mostra menu, listas e detalhes financeiros permitidos com saida limitada", async () => {
    const menu = await handleCommand(context({ text: "/start" }));
    for (const callback of ["menu:credores", "menu:empenhos", "menu:rpas", "menu:extrato", "menu:cnpj", "menu:solicitacoes"]) {
      assert.ok(menu.reply_markup.inline_keyboard.flat().some((b) => b.callback_data === callback));
    }
    const credores = await handleCommand(context({ callbackData: "menu:credores", callbackId: "cred" }));
    assert.match(credores.text, /Credores fixos/);
    assert.match((await handleCommand(context({ callbackData: button(credores, /Energia/), callbackId: "cred-detail" }))).text, /Valor mensal/);
    assert.match((await handleCommand(context({ callbackData: "menu:empenhos", callbackId: "emps" }))).text, /Empenhos/);
    assert.match((await handleCommand(context({ callbackData: "tg4:fin:empenho:detail:emp-1", callbackId: "emp-detail" }))).text, /Saldo a pagar/);
    assert.match((await handleCommand(context({ callbackData: "menu:rpas", callbackId: "rpas" }))).text, /RPAs/);
    assert.match((await handleCommand(context({ callbackData: "tg4:fin:rpa:detail:rpa-1", callbackId: "rpa-detail" }))).text, /Valor liquido/);
    assert.match((await handleCommand(context({ callbackData: "menu:extrato", callbackId: "ext" }))).text, /Extratos/);
    assert.match((await handleCommand(context({ callbackData: "menu:solicitacoes", callbackId: "sol" }))).text, /Solicitacoes/);
  });

  it("nega modulo financeiro sem chamar backend e expõe ações excluidas como web-only", async () => {
    const denied = await handleCommand(context({ db: { prepare: () => { throw new Error("backend called"); } }, modulos: [], callbackData: "menu:credores", callbackId: "denied" }));
    assert.match(denied.text, /Sem permiss/i);
    for (const callbackData of ["tg4:fin:empenhos:import", "tg4:fin:empenhos:export", "tg4:fin:solicitacao:create"]) {
      const webOnly = await handleCommand(context({ callbackData, callbackId: callbackData }));
      assert.match(webOnly.text, /sistema web/i);
    }
  });

  it("revalida modulos financeiros no banco quando o contexto esta desatualizado", async () => {
    db.prepare("DELETE FROM usuario_modulos WHERE modulo_id IN ('empenhos', 'rpas')").run();
    const staleModules = ["credores-fixos", "empenhos", "rpas", "extratos", "cnpj", "solicitacoes"];
    assert.match((await handleCommand(context({ modulos: staleModules, callbackData: "menu:empenhos", callbackId: "emp-revoked" }))).text, /Acesso negado/i);
    assert.match((await handleCommand(context({ modulos: staleModules, callbackData: "tg4:fin:rpa:detail:rpa-1", callbackId: "rpa-revoked" }))).text, /Acesso negado/i);
  });

  it("atualiza empenho mensal com confirmacao, invalidacao, replay, expiracao e revogacao", async () => {
    await handleCommand(context({ callbackData: "tg4:fin:cred:update:cred-1:2026:7", callbackId: "ask-invalid" }));
    assert.match((await handleCommand(context({ text: "pago | -5 | 15 | obs" }))).text, /inv/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM empenhos_mensais").get().total, 0);
    await handleCommand(context({ callbackData: "tg4:fin:cred:update:cred-1:2026:7", callbackId: "ask" }));
    const asked = await handleCommand(context({ text: "empenhado | 1300,50 | EMP-77 | Julho" }));
    const firstConfirm = confirm(asked);
    assert.match((await handleCommand(context({ chatId: "other-chat", fromId: "other-actor", user: resolveVinculo(db, "other-chat"), callbackData: firstConfirm, callbackId: "other" }))).text, /expirada/i);
    await handleCommand(context({ callbackData: firstConfirm, callbackId: "confirm" }));
    assert.match((await handleCommand(context({ callbackData: firstConfirm, callbackId: "replay" }))).text, /expirada/i);
    assert.deepEqual({ ...db.prepare("SELECT status, valor, numero_empenho FROM empenhos_mensais WHERE credor_id = ? AND ano = 2026 AND mes = 7").get("cred-1") }, { status: "empenhado", valor: 1300.5, numero_empenho: "EMP-77" });
    await handleCommand(context({ callbackData: "tg4:fin:cred:update:cred-1:2026:8", callbackId: "ask-expire" }));
    const expireAsked = await handleCommand(context({ text: "pendente | 100 |  | teste" }));
    const originalNow = Date.now;
    Date.now = () => originalNow() + 120_001;
    try {
      assert.match((await handleCommand(context({ callbackData: confirm(expireAsked), callbackId: "expired" }))).text, /expirada/i);
    } finally {
      Date.now = originalNow;
    }
    await handleCommand(context({ callbackData: "tg4:fin:cred:update:cred-1:2026:9", callbackId: "ask-revoke" }));
    const revokeAsked = await handleCommand(context({ text: "empenhado | 1 | EMP-9 | teste" }));
    assert.match((await handleCommand(context({ modulos: ["empenhos"], callbackData: confirm(revokeAsked), callbackId: "revoked" }))).text, /Sem permiss/i);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM empenhos_mensais WHERE mes IN (8,9)").get().total, 0);
  });

  it("executa sequencia por update fake sem auditar texto livre financeiro", async () => {
    const sent = [];
    const edited = [];
    const client = {
      sendMessage: async (chatId, text, options) => sent.push({ chatId: String(chatId), text, options }),
      editMessageText: async (chatId, messageId, text, options) => edited.push({ chatId: String(chatId), messageId, text, options }),
      answerCallbackQuery: async () => {},
    };
    await processTelegramUpdate(db, client, { callback_query: { id: "cb-menu", from: { id: "regular-actor" }, data: "menu:credores", message: { message_id: 1, chat: { id: "regular-chat", type: "private" } } } });
    await processTelegramUpdate(db, client, { callback_query: { id: "cb-ask", from: { id: "regular-actor" }, data: "tg4:fin:cred:update:cred-1:2026:7", message: { message_id: 1, chat: { id: "regular-chat", type: "private" } } } });
    const privateText = `empenhado | 1200 | EMP-QA | ${randomUUID()}`;
    await processTelegramUpdate(db, client, { message: { chat: { id: "regular-chat", type: "private" }, from: { id: "regular-actor" }, text: privateText } });
    await processTelegramUpdate(db, client, { callback_query: { id: "cb-confirm", from: { id: "regular-actor" }, data: sent.at(-1).options.reply_markup.inline_keyboard[0][0].callback_data, message: { message_id: 2, chat: { id: "regular-chat", type: "private" } } } });
    assert.ok(edited.some((m) => /Credores fixos/i.test(m.text)));
    assert.ok(sent.some((m) => /Confirmar/i.test(m.text)));
    assert.ok(edited.some((m) => /Empenho mensal atualizado/i.test(m.text)));
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM empenhos_mensais WHERE numero_empenho = 'EMP-QA'").get().total, 1);
    assert.equal(db.prepare("SELECT args_redacted FROM telegram_logs WHERE chat_id = ?").all("regular-chat").some((log) => String(log.args_redacted).includes(privateText)), false);
  });

  it("consulta CNPJ e retorna Dossiê com risco, empenhos e links de certidões", async () => {
    const prompt = await handleCommand(context({ callbackData: "menu:cnpj", callbackId: "cnpj-cb" }));
    assert.match(prompt.text, /CNPJ/i);

    const res = await handleCommand(context({ text: "00.000.000/0001-91" }));
    assert.match(res.text, /Dossiê Fornecedor/i);
    assert.match(res.text, /Diagnóstico de Risco/i);
    assert.match(res.text, /Histórico na Prefeitura de Inajá/i);
  });
});
