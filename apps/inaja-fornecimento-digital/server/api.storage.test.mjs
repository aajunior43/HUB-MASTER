import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate, UPLOADS_DIR } from "./db.mjs";

let db;
let server;
let origin;
let caminho;

async function post(rota, body, cookie = "") {
  const response = await fetch(new URL(rota, origin), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";", 1)[0] || "" };
}

async function entrar(username) {
  await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: username, _senha: "Senha123" } });
  return (await post("/api/rpc", { fn: "usuario_login", args: { _username: username, _senha: "Senha123" } })).cookie;
}

beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  migrate(db);
  for (const [id, username] of [["storage-u1", "storage1"], ["storage-u2", "storage2"]]) {
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(id, username);
    db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, 'solicitacoes')").run(randomUUID(), id);
  }
  caminho = `anexos/solicitacoes/teste-${randomUUID()}.txt`;
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  const arquivo = path.resolve(UPLOADS_DIR, caminho);
  if (existsSync(arquivo)) unlinkSync(arquivo);
  db.close();
});

describe("armazenamento privado", () => {
  it("exige módulo, limita o dono e libera arquivos já vinculados ao módulo", async () => {
    const cookie1 = await entrar("storage1");
    const cookie2 = await entrar("storage2");
    const conteudo = Buffer.from("arquivo privado").toString("base64");

    assert.equal((await post("/api/storage/upload", { path: caminho, contentBase64: conteudo, module: "solicitacoes" })).status, 403);
    assert.equal((await post("/api/storage/upload", { path: caminho, contentBase64: conteudo, module: "tarefas" }, cookie1)).status, 400);
    assert.equal((await post("/api/storage/upload", { path: caminho, contentBase64: conteudo, module: "solicitacoes" }, cookie1)).status, 200);

    assert.equal((await fetch(new URL(`/api/files/${caminho}`, origin), { headers: { Cookie: cookie2 } })).status, 403);
    assert.equal((await post("/api/storage/remove", { paths: [caminho] }, cookie2)).status, 403);

    db.prepare("INSERT INTO solicitacoes (id, solicitante, empresa, data_solicitacao, items, valor_total, anexos) VALUES (?, ?, ?, ?, '[]', 0, ?)")
      .run(randomUUID(), "A", "B", "12/08/2026", JSON.stringify([{ path: caminho }]));
    const leitura = await fetch(new URL(`/api/files/${caminho}`, origin), { headers: { Cookie: cookie2 } });
    assert.equal(leitura.status, 200);
    assert.equal(await leitura.text(), "arquivo privado");
  });
});
