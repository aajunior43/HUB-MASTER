import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { migrate, runRpc } from "./db.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const adminId = randomUUID();
  const userId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(adminId, "admin");
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "operador");
  db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)").run(randomUUID(), userId, "tarefas");
  return db;
}

test("criação de chave MCP grava validade e rejeita prazos fora da política", async () => {
  const db = freshDb();
  const criado = await runRpc(db, "mcp_token_criar", {
    _caller: "admin",
    _nome: "Agente de testes",
    _usuario: "operador",
    _expira_dias: 30,
  });

  assert.equal(criado.error, null);
  assert.match(criado.data.expira_em, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
  const row = db.prepare("SELECT expira_em FROM mcp_tokens WHERE id = ?").get(criado.data.id);
  assert.equal(row.expira_em, criado.data.expira_em);

  const inválido = await runRpc(db, "mcp_token_criar", {
    _caller: "admin",
    _nome: "Prazo inválido",
    _usuario: "operador",
    _expira_dias: 10,
  });
  assert.equal(inválido.error.code, "BAD_REQUEST");
});
