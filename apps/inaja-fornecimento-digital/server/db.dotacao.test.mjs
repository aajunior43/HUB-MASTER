import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { migrate, runQuery } from "./db.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  for (const [username, isContador, isAdmin] of [["solicitante", 0, 0], ["outro", 0, 0], ["contador", 1, 0], ["admin", 0, 1]]) {
    const id = randomUUID();
    db.prepare("INSERT INTO usuarios (id, username, is_admin, is_contador, ativo) VALUES (?, ?, ?, ?, 1)").run(id, username, isAdmin, isContador);
    if (!isAdmin) db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, 'pedido-dotacao')").run(randomUUID(), id);
  }
  return db;
}

function criar(db, caller = "solicitante", id = randomUUID()) {
  const result = runQuery(db, { table: "pedidos_dotacao", action: "insert", payload: {
    id, solicitante: "forjado", secretaria: "Saúde", descricao: "Compra de insumos", valor_solicitado: 100, status: "aprovado", anexos: [],
  } }, caller);
  return { result, id };
}

describe("pedidos_dotacao — segurança e fluxo", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("define o solicitante pela sessão e registra o histórico", () => {
    const { result, id } = criar(db);
    assert.equal(result.error, null);
    const pedido = db.prepare("SELECT solicitante, status, protocolo FROM pedidos_dotacao WHERE id = ?").get(id);
    assert.equal(pedido.solicitante, "solicitante");
    assert.equal(pedido.status, "enviado");
    assert.match(pedido.protocolo, /^DOT-\d{4}-\d{4}$/);
    assert.equal(db.prepare("SELECT acao FROM pedidos_dotacao_historico WHERE pedido_id = ?").get(id).acao, "criado");
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE ref_id = ? AND tipo = 'pedido_dotacao'").get(id).c, 2);
  });

  it("restringe a listagem do usuário aos seus próprios pedidos", () => {
    criar(db, "solicitante");
    criar(db, "outro");
    const result = runQuery(db, { table: "pedidos_dotacao", action: "select" }, "solicitante");
    assert.equal(result.error, null);
    assert.equal(result.data.length, 2);
    assert.deepEqual(new Set(result.data.map((pedido) => pedido.solicitante)), new Set(["solicitante", "outro"]));
  });

  it("permite consultar o histórico de pedidos visíveis", () => {
    const { id } = criar(db, "solicitante");
    const result = runQuery(db, { table: "pedidos_dotacao_historico", action: "select", filters: [{ column: "pedido_id", value: id }] }, "outro");
    assert.equal(result.error, null);
    assert.equal(result.data.length, 1);
  });

  it("impede usuário comum de aprovar pedido", () => {
    const { id } = criar(db);
    const result = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "aprovado", dotacao: "123", resposta_contador: "Aprovado" } }, "outro");
    assert.equal(result.error?.code, "FORBIDDEN");
  });

  it("contador aprova, registra responsável e histórico", () => {
    const { id } = criar(db);
    const result = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "aprovado", dotacao: "123", resposta_contador: "Saldo disponível", saldo_disponivel: 250, valor_aprovado: 100 } }, "contador");
    assert.equal(result.error, null);
    const pedido = db.prepare("SELECT status, respondido_por FROM pedidos_dotacao WHERE id = ?").get(id);
    assert.equal(pedido.status, "aprovado");
    assert.equal(pedido.respondido_por, "contador");
    assert.equal(db.prepare("SELECT acao FROM pedidos_dotacao_historico WHERE pedido_id = ? ORDER BY created_at DESC LIMIT 1").get(id).acao, "aprovado");
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE ref_id = ? AND tipo = 'pedido_dotacao_atualizado'").get(id).c, 3);
  });

  it("percorre a procura da dotação e os resultados da análise", () => {
    const { id } = criar(db);
    const procurar = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "procurando_dotacao", resposta_contador: "A contabilidade iniciou a procura." } }, "contador");
    assert.equal(procurar.error, null);
    assert.equal(db.prepare("SELECT status FROM pedidos_dotacao WHERE id = ?").get(id).status, "procurando_dotacao");

    const semSaldo = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "sem_saldo", resposta_contador: "Não há saldo disponível." } }, "contador");
    assert.equal(semSaldo.error, null);

    const suplementacao = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "aguardando_suplementacao", resposta_contador: "Aguardando suplementação orçamentária." } }, "contador");
    assert.equal(suplementacao.error, null);

    const aprovado = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "aprovado", dotacao: "12.345.678", resposta_contador: "Saldo suplementado e dotação aprovada." } }, "contador");
    assert.equal(aprovado.error, null);
    assert.equal(db.prepare("SELECT status, dotacao FROM pedidos_dotacao WHERE id = ?").get(id).status, "aprovado");
    assert.deepEqual(
      db.prepare("SELECT status_novo FROM pedidos_dotacao_historico WHERE pedido_id = ? ORDER BY rowid ASC").all(id).map((item) => item.status_novo),
      ["enviado", "procurando_dotacao", "sem_saldo", "aguardando_suplementacao", "aprovado"],
    );
  });

  it("permite ao solicitante dar conclusão após o resultado", () => {
    const { id } = criar(db);
    const aprovado = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "aprovado", dotacao: "123", resposta_contador: "Aprovado" } }, "contador");
    assert.equal(aprovado.error, null);

    const conclusao = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "concluido" } }, "solicitante");
    assert.equal(conclusao.error, null);
    assert.equal(db.prepare("SELECT status FROM pedidos_dotacao WHERE id = ?").get(id).status, "concluido");
    assert.equal(db.prepare("SELECT acao FROM pedidos_dotacao_historico WHERE pedido_id = ? ORDER BY created_at DESC LIMIT 1").get(id).acao, "concluido");
  });

  it("permite apagar somente pedido inicial do solicitante", () => {
    const { id } = criar(db);
    assert.equal(runQuery(db, { table: "pedidos_dotacao", action: "delete", filters: [{ column: "id", value: id }] }, "solicitante").error, null);
    const aprovado = criar(db).id;
    runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: aprovado }], payload: { status: "aprovado", dotacao: "123", resposta_contador: "Ok" } }, "contador");
    assert.equal(runQuery(db, { table: "pedidos_dotacao", action: "delete", filters: [{ column: "id", value: aprovado }] }, "solicitante").error?.code, "FORBIDDEN");
  });

  it("rejeita saldo ou valor aprovado negativos", () => {
    const { id } = criar(db);
    const saldo = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "sem_saldo", resposta_contador: "Sem saldo", saldo_disponivel: -1 } }, "contador");
    assert.equal(saldo.error?.code, "BAD_REQUEST");
    const aprovado = runQuery(db, { table: "pedidos_dotacao", action: "update", filters: [{ column: "id", value: id }], payload: { status: "aprovado", dotacao: "123", resposta_contador: "Ok", valor_aprovado: -0.01 } }, "contador");
    assert.equal(aprovado.error?.code, "BAD_REQUEST");
  });
});
