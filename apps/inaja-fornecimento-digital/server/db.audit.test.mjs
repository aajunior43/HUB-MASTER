import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { migrate, runRpc } from "./db.mjs";

describe("auditoria funcional", () => {
  it("registra origem, IP e correlação nas ações web", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    migrate(db);
    const userId = randomUUID();
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "ana");
    db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)").run(randomUUID(), userId, "gestao-documentos");

    const result = await runRpc(db, "gd_pasta_criar", {
      _caller: "ana",
      _nome: "Auditoria",
      _ip: "127.0.0.1",
      _request_id: "audit-request-1234",
    });

    assert.equal(result.error, null);
    const row = db.prepare("SELECT ip, detalhes FROM gd_logs_auditoria WHERE acao = 'pasta_criar'").get();
    assert.equal(row.ip, "127.0.0.1");
    assert.deepEqual(JSON.parse(row.detalhes), {
      nome: "Auditoria",
      parent_id: null,
      origem: "web",
      request_id: "audit-request-1234",
    });

    const adminId = randomUUID();
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(adminId, "admin");
    const filtered = await runRpc(db, "gd_superlog_listar", {
      _caller: "admin",
      _busca: "audit-request-1234",
      _de: "2026-01-01",
      _ate: "2099-12-31",
      _pagina: 1,
      _por_pagina: 10,
    });
    assert.equal(filtered.error, null);
    assert.equal(filtered.data.total, 1);
    assert.equal(filtered.data.rows[0].ip, "127.0.0.1");
    db.close();
  });
});
