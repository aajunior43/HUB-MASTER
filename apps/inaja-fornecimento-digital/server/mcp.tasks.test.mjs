import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { migrate } from "./db.mjs";
import { criarServidor } from "./mcp.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const usuarioId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(usuarioId, "operador");
  db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)").run(randomUUID(), usuarioId, "tarefas");
  const tarefaId = randomUUID();
  db.prepare("INSERT INTO tarefas (id, titulo, status, prioridade, ordem) VALUES (?, ?, ?, ?, ?)")
    .run(tarefaId, "Tarefa concluída", "done", "media", 1);
  return { db, tarefaId, usuarioId };
}

test("tarefas concluídas podem ser editadas, movidas e removidas", async () => {
  const { db, tarefaId, usuarioId } = freshDb();
  const servidor = criarServidor(db, {
    id: usuarioId,
    username: "operador",
    ativo: 1,
    is_admin: false,
    mcpTokenId: "token-id",
    requestId: "tasks-test-01",
    clientIp: "127.0.0.1",
    modulos: ["tarefas"],
  });
  const [clienteTransport, servidorTransport] = InMemoryTransport.createLinkedPair();
  const cliente = new Client({ name: "mcp-tasks-test", version: "1.0.0" });
  await servidor.connect(servidorTransport);
  await cliente.connect(clienteTransport);

  try {
    const editada = await cliente.callTool({
      name: "editar_tarefa",
      arguments: { id: tarefaId, titulo: "Tarefa concluída editada" },
    });
    assert.notEqual(editada.isError, true);
    assert.equal(db.prepare("SELECT titulo, status FROM tarefas WHERE id = ?").get(tarefaId).titulo, "Tarefa concluída editada");
    assert.equal(db.prepare("SELECT status FROM tarefas WHERE id = ?").get(tarefaId).status, "done");

    const movida = await cliente.callTool({ name: "mover_tarefa", arguments: { id: tarefaId, status: "doing" } });
    assert.notEqual(movida.isError, true);
    assert.equal(db.prepare("SELECT status FROM tarefas WHERE id = ?").get(tarefaId).status, "doing");

    await cliente.callTool({ name: "mover_tarefa", arguments: { id: tarefaId, status: "done" } });
    const removida = await cliente.callTool({
      name: "remover_tarefa",
      arguments: { id: tarefaId, confirmacao: "REMOVER" },
    });
    assert.notEqual(removida.isError, true);
    assert.equal(db.prepare("SELECT id FROM tarefas WHERE id = ?").get(tarefaId), undefined);
  } finally {
    await cliente.close();
    await servidor.close();
    db.close();
  }
});
