import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { runRpc, migrate } from "./db.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const userId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(userId, "testuser");
  return db;
}

describe("em_conta_criar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("cria conta e retorna id", async () => {
    const r = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta Teste", _banco: "Banco X", _tipo: "corrente" });
    assert.equal(r.error, null);
    assert.ok(r.data.id);
    const row = db.prepare("SELECT * FROM em_contas WHERE id = ?").get(r.data.id);
    assert.equal(row.nome, "Conta Teste");
    assert.equal(row.banco, "Banco X");
    assert.equal(row.tipo, "corrente");
    assert.equal(row.ativo, 1);
  });

  it("usa defaults para banco e tipo", async () => {
    const r = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Só Nome" });
    assert.equal(r.error, null);
    const row = db.prepare("SELECT * FROM em_contas WHERE id = ?").get(r.data.id);
    assert.equal(row.banco, "");
    assert.equal(row.tipo, "corrente");
  });

  it("rejeita nome vazio", async () => {
    const r = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "" });
    assert.equal(r.error.code, "BAD_REQUEST");
  });

  it("rejeita sem nome", async () => {
    const r = await runRpc(db, "em_conta_criar", { _caller: "testuser" });
    assert.equal(r.error.code, "BAD_REQUEST");
  });

  it("rejeita sem caller", async () => {
    const r = await runRpc(db, "em_conta_criar", { _nome: "Teste" });
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("rejeita caller inexistente", async () => {
    const r = await runRpc(db, "em_conta_criar", { _caller: "ghost", _nome: "Teste" });
    assert.equal(r.error.code, "FORBIDDEN");
  });
});

describe("em_contas_listar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("retorna array vazio quando não há contas", async () => {
    const r = await runRpc(db, "em_contas_listar", { _caller: "testuser" });
    assert.equal(r.error, null);
    assert.deepEqual(r.data, []);
  });

  it("lista contas com saldo_calculado", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Depósito", _valor: 1000, _tipo: "receita" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Pagamento", _valor: 300, _tipo: "despesa" });
    const r = await runRpc(db, "em_contas_listar", { _caller: "testuser" });
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].saldo_calculado, 700);
  });

  it("calcula saldo como zero sem transações", async () => {
    await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const r = await runRpc(db, "em_contas_listar", { _caller: "testuser" });
    assert.equal(r.data[0].saldo_calculado, 0);
  });
});

describe("em_conta_atualizar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("atualiza nome, banco e tipo", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Original", _banco: "Banco A", _tipo: "corrente" });
    const r = await runRpc(db, "em_conta_atualizar", { _caller: "testuser", _id: conta.data.id, _nome: "Atualizada", _banco: "Banco B", _tipo: "poupanca" });
    assert.equal(r.error, null);
    const row = db.prepare("SELECT * FROM em_contas WHERE id = ?").get(conta.data.id);
    assert.equal(row.nome, "Atualizada");
    assert.equal(row.banco, "Banco B");
    assert.equal(row.tipo, "poupanca");
  });

  it("atualiza campo parcialmente", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Original", _banco: "Banco A", _tipo: "corrente" });
    await runRpc(db, "em_conta_atualizar", { _caller: "testuser", _id: conta.data.id, _nome: "Só Nome" });
    const row = db.prepare("SELECT * FROM em_contas WHERE id = ?").get(conta.data.id);
    assert.equal(row.nome, "Só Nome");
    assert.equal(row.banco, "Banco A");
  });
});

describe("em_conta_excluir", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("exclui conta", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Será Excluída" });
    await runRpc(db, "em_conta_excluir", { _caller: "testuser", _id: conta.data.id });
    const exists = db.prepare("SELECT id FROM em_contas WHERE id = ?").get(conta.data.id);
    assert.equal(exists, undefined);
  });

  it("exclui transações e alertas associados", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Tx", _valor: 100, _tipo: "despesa" });
    const alertId = randomUUID();
    db.prepare("INSERT INTO em_alertas (id, conta_id, tipo, mensagem, severidade) VALUES (?, ?, ?, ?, ?)")
      .run(alertId, conta.data.id, "teste", "Teste", "baixa");
    await runRpc(db, "em_conta_excluir", { _caller: "testuser", _id: conta.data.id });
    const txs = db.prepare("SELECT COUNT(*) AS c FROM em_transacoes").get().c;
    assert.equal(txs, 0);
    const alerts = db.prepare("SELECT COUNT(*) AS c FROM em_alertas").get().c;
    assert.equal(alerts, 0);
  });

  it("rejeita sem caller", async () => {
    const r = await runRpc(db, "em_conta_excluir", { _id: "fake" });
    assert.equal(r.error.code, "FORBIDDEN");
  });
});

describe("em_transacao_criar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("cria transação com sucesso", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const r = await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Compra", _valor: 500, _tipo: "despesa" });
    assert.equal(r.error, null);
    assert.ok(r.data.id);
    const row = db.prepare("SELECT * FROM em_transacoes WHERE id = ?").get(r.data.id);
    assert.equal(row.descricao, "Compra");
    assert.equal(row.valor, 500);
    assert.equal(row.tipo, "despesa");
  });

  it("rejeita conta inexistente", async () => {
    const r = await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: "fake-id", _descricao: "Teste", _valor: 100 });
    assert.equal(r.error.code, "BAD_REQUEST");
  });
});

describe("em_transacoes_listar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("lista com paginação", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    for (let i = 0; i < 5; i++) {
      await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: `Tx ${i}`, _valor: 100, _tipo: "despesa" });
    }
    const r = await runRpc(db, "em_transacoes_listar", { _caller: "testuser", _pagina: 1, _por_pagina: 3 });
    assert.equal(r.error, null);
    assert.equal(r.data.total, 5);
    assert.equal(r.data.totalPaginas, 2);
    assert.equal(r.data.rows.length, 3);
  });

  it("filtra por conta_id", async () => {
    const c1 = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta 1" });
    const c2 = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta 2" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: c1.data.id, _descricao: "Tx C1", _valor: 100, _tipo: "despesa" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: c2.data.id, _descricao: "Tx C2", _valor: 200, _tipo: "receita" });
    const r = await runRpc(db, "em_transacoes_listar", { _caller: "testuser", _conta_id: c1.data.id });
    assert.equal(r.data.total, 1);
    assert.equal(r.data.rows[0].descricao, "Tx C1");
  });

  it("retorna totais de receitas e despesas", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "R", _valor: 1000, _tipo: "receita" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "D", _valor: 400, _tipo: "despesa" });
    const r = await runRpc(db, "em_transacoes_listar", { _caller: "testuser" });
    assert.equal(r.data.totais.receitas, 1000);
    assert.equal(r.data.totais.despesas, 400);
  });
});

describe("em_transacao_atualizar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("atualiza descricao e valor", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const tx = await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Original", _valor: 100, _tipo: "despesa" });
    const r = await runRpc(db, "em_transacao_atualizar", { _caller: "testuser", _id: tx.data.id, _descricao: "Atualizada", _valor: 200 });
    assert.equal(r.error, null);
    const row = db.prepare("SELECT * FROM em_transacoes WHERE id = ?").get(tx.data.id);
    assert.equal(row.descricao, "Atualizada");
    assert.equal(row.valor, 200);
  });

  it("atualiza conciliado", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const tx = await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Tx", _valor: 100, _tipo: "despesa" });
    await runRpc(db, "em_transacao_atualizar", { _caller: "testuser", _id: tx.data.id, _conciliado: true });
    const row = db.prepare("SELECT * FROM em_transacoes WHERE id = ?").get(tx.data.id);
    assert.equal(row.conciliado, 1);
  });
});

describe("em_transacao_excluir", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("exclui transação", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const tx = await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Será excluída", _valor: 100, _tipo: "despesa" });
    const r = await runRpc(db, "em_transacao_excluir", { _caller: "testuser", _id: tx.data.id });
    assert.equal(r.error, null);
    const list = await runRpc(db, "em_transacoes_listar", { _caller: "testuser" });
    assert.equal(list.data.total, 0);
  });

  it("não quebra ao excluir id inexistente", async () => {
    const r = await runRpc(db, "em_transacao_excluir", { _caller: "testuser", _id: "inexistente" });
    assert.equal(r.error, null);
  });
});

describe("em_dashboard", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("retorna zeros em banco vazio", async () => {
    const r = await runRpc(db, "em_dashboard", { _caller: "testuser" });
    assert.equal(r.data.totalContas, 0);
    assert.equal(r.data.totalTransacoes, 0);
    assert.equal(r.data.totalReceitas, 0);
    assert.equal(r.data.totalDespesas, 0);
    assert.equal(r.data.alertasPendentes, 0);
    assert.deepEqual(r.data.porCategoria, []);
  });

  it("retorna totais corretos após movimentações", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Receita 1", _valor: 2000, _tipo: "receita" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Despesa 1", _valor: 800, _tipo: "despesa", _categoria: "custos" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Despesa 2", _valor: 200, _tipo: "despesa", _categoria: "custos" });
    const r = await runRpc(db, "em_dashboard", { _caller: "testuser" });
    assert.equal(r.data.totalContas, 1);
    assert.equal(r.data.totalTransacoes, 3);
    assert.equal(r.data.totalReceitas, 2000);
    assert.equal(r.data.totalDespesas, 1000);
    assert.equal(r.data.alertasPendentes, 0);
    assert.equal(r.data.porCategoria.length, 1);
    assert.equal(r.data.porCategoria[0].total, 1000);
  });
});

describe("em_alertas_listar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("lista alertas", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const alertId = randomUUID();
    db.prepare("INSERT INTO em_alertas (id, conta_id, tipo, mensagem, severidade) VALUES (?, ?, ?, ?, ?)")
      .run(alertId, conta.data.id, "saldo_baixo", "Saldo abaixo do mínimo", "alta");
    const r = await runRpc(db, "em_alertas_listar", { _caller: "testuser" });
    assert.equal(r.error, null);
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].tipo, "saldo_baixo");
    assert.equal(r.data[0].resolvido, 0);
  });

  it("filtra alertas por conta_id", async () => {
    const c1 = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "C1" });
    const c2 = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "C2" });
    db.prepare("INSERT INTO em_alertas (id, conta_id, tipo, mensagem, severidade) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), c1.data.id, "tipo1", "Msg 1", "baixa");
    db.prepare("INSERT INTO em_alertas (id, conta_id, tipo, mensagem, severidade) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), c2.data.id, "tipo2", "Msg 2", "media");
    const r = await runRpc(db, "em_alertas_listar", { _caller: "testuser", _conta_id: c1.data.id });
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].tipo, "tipo1");
  });
});

describe("em_alerta_resolver", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("marca alerta como resolvido", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta" });
    const alertId = randomUUID();
    db.prepare("INSERT INTO em_alertas (id, conta_id, tipo, mensagem, severidade) VALUES (?, ?, ?, ?, ?)")
      .run(alertId, conta.data.id, "teste", "Teste", "media");
    const r = await runRpc(db, "em_alerta_resolver", { _caller: "testuser", _id: alertId });
    assert.equal(r.error, null);
    const row = db.prepare("SELECT * FROM em_alertas WHERE id = ?").get(alertId);
    assert.equal(row.resolvido, 1);
  });

  it("não quebra com id inexistente", async () => {
    const r = await runRpc(db, "em_alerta_resolver", { _caller: "testuser", _id: "inexistente" });
    assert.equal(r.error, null);
  });
});

describe("fluxo completo", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("conta → transações → listagem → dashboard reflete tudo", async () => {
    const conta = await runRpc(db, "em_conta_criar", { _caller: "testuser", _nome: "Conta Fluxo", _banco: "Banco Central", _tipo: "corrente" });
    assert.ok(conta.data.id);

    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Venda", _valor: 5000, _tipo: "receita", _categoria: "vendas" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Aluguel", _valor: 1500, _tipo: "despesa", _categoria: "custos" });
    await runRpc(db, "em_transacao_criar", { _caller: "testuser", _conta_id: conta.data.id, _descricao: "Salário", _valor: 3000, _tipo: "despesa", _categoria: "pessoal" });

    const list = await runRpc(db, "em_transacoes_listar", { _caller: "testuser", _conta_id: conta.data.id });
    assert.equal(list.data.total, 3);

    const contas = await runRpc(db, "em_contas_listar", { _caller: "testuser" });
    assert.equal(contas.data.length, 1);
    assert.equal(contas.data[0].saldo_calculado, 500);

    const dash = await runRpc(db, "em_dashboard", { _caller: "testuser" });
    assert.equal(dash.data.totalContas, 1);
    assert.equal(dash.data.totalTransacoes, 3);
    assert.equal(dash.data.totalReceitas, 5000);
    assert.equal(dash.data.totalDespesas, 4500);
    assert.equal(dash.data.alertasPendentes, 0);
  });
});
