import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";

let db;
let server;
let origin;

function request(path, body, cookie) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(path, origin);
    const req = globalThis.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: payload,
    });
    req.then(async (response) => {
      resolve({
        status: response.status,
        body: await response.json(),
        cookie: response.headers.get("set-cookie"),
      });
    }).catch(reject);
  });
}

function requestRaw(path, payload) {
  return globalThis.fetch(new URL(path, origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  const id = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)")
    .run(id, "admin");
  const userId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)")
    .run(userId, "luana");
  db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)")
    .run(randomUUID(), userId, "solicitacoes");
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("API RPC authentication boundary", () => {
  it("keeps a valid authenticated login available", async () => {
    const password = await request("/api/rpc", {
      fn: "usuario_set_senha",
      args: { _username: "admin", _senha: "Senha123" },
    });
    assert.equal(password.body.data, true);
    const result = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "admin", _senha: "Senha123" },
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.data.ok, true);
  });

  it("allows an authenticated user to change only their own password", async () => {
    await request("/api/rpc", {
      fn: "usuario_set_senha",
      args: { _username: "luana", _senha: "Senha123" },
    });
    const login = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "luana", _senha: "Senha123" },
    });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    const changed = await request("/api/rpc", {
      fn: "usuario_alterar_senha",
      args: {
        _username: "admin",
        _senha_atual: "Senha123",
        _nova_senha: "NovaSenha123",
      },
    }, cookie);

    assert.equal(changed.status, 200);
    assert.deepEqual(changed.body.data, { ok: true });

    const oldPassword = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "luana", _senha: "Senha123" },
    });
    assert.equal(oldPassword.body.data.ok, false);

    const newPassword = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "luana", _senha: "NovaSenha123" },
    });
    assert.equal(newPassword.body.data.ok, true);

    const sessionStillValid = await request("/api/rpc", {
      fn: "usuario_validar_sessao",
      args: { _username: "admin" },
    }, cookie);
    assert.equal(sessionStillValid.body.data.valido, true);
    assert.equal(sessionStillValid.body.data.username, "luana");
  });

  it("rejects password changes without the current password or an active session", async () => {
    await request("/api/rpc", {
      fn: "usuario_set_senha",
      args: { _username: "luana", _senha: "Senha123" },
    });
    const login = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "luana", _senha: "Senha123" },
    });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    const wrongCurrent = await request("/api/rpc", {
      fn: "usuario_alterar_senha",
      args: { _senha_atual: "Errada123", _nova_senha: "NovaSenha123" },
    }, cookie);
    assert.equal(wrongCurrent.status, 400);
    assert.equal(wrongCurrent.body.error.code, "INVALID_CURRENT_PASSWORD");

    const weakPassword = await request("/api/rpc", {
      fn: "usuario_alterar_senha",
      args: { _senha_atual: "Senha123", _nova_senha: "Nova1" },
    }, cookie);
    assert.equal(weakPassword.status, 400);
    assert.equal(weakPassword.body.error.code, "WEAK_PASSWORD");

    const unauthenticated = await request("/api/rpc", {
      fn: "usuario_alterar_senha",
      args: { _senha_atual: "Senha123", _nova_senha: "NovaSenha123" },
    });
    assert.equal(unauthenticated.status, 403);
    assert.equal(unauthenticated.body.error.code, "FORBIDDEN");
  });

  it("rejects a privileged RPC when the caller is only spoofed in the payload", async () => {
    const result = await request("/api/rpc", {
      fn: "admin_listar_usuarios",
      args: { _caller: "admin" },
    });

    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, "FORBIDDEN");
  });

  it("keeps permitted RPCs available to the active authenticated session", async () => {
    await request("/api/rpc", {
      fn: "usuario_set_senha",
      args: { _username: "admin", _senha: "Senha123" },
    });
    const login = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "admin", _senha: "Senha123" },
    });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    const result = await request("/api/rpc", {
      fn: "usuario_modulos_disponiveis",
      args: { _username: "forjado" },
    }, cookie);

    assert.equal(result.status, 200);
    assert.equal(result.body.error, null);
    assert.equal(result.body.data[0].is_admin, true);
  });

  it("rejects state-changing RPCs without a session even when _caller is spoofed", async () => {
    const result = await request("/api/rpc", {
      fn: "telegram_desvincular_chat",
      args: { _caller: "admin", _chat_id: "123" },
    });

    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, "FORBIDDEN");
  });

  it("rejects a session when its user is revoked", async () => {
    await request("/api/rpc", {
      fn: "usuario_set_senha",
      args: { _username: "admin", _senha: "Senha123" },
    });
    const login = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "admin", _senha: "Senha123" },
    });
    const cookie = login.cookie?.split(";", 1)[0];
    db.prepare("UPDATE usuarios SET ativo = 0 WHERE username = ?").run("admin");

    const result = await request("/api/rpc", {
      fn: "admin_listar_usuarios",
      args: {},
    }, cookie);

    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, "FORBIDDEN");
  });

  it("returns a client error for malformed JSON", async () => {
    const result = await requestRaw("/api/rpc", "{");

    assert.equal(result.status, 400);
  });

  it("returns a client error for malformed RPC input", async () => {
    const result = await request("/api/rpc", null);

    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "BAD_REQUEST");
  });

  it("forbids a normal user from mutating tasks through the generic query API", async () => {
    await request("/api/rpc", {
      fn: "usuario_set_senha",
      args: { _username: "luana", _senha: "Senha123" },
    });
    const login = await request("/api/rpc", {
      fn: "usuario_login",
      args: { _username: "luana", _senha: "Senha123" },
    });
    const cookie = login.cookie?.split(";", 1)[0];

    const result = await request("/api/query", {
      table: "tarefas",
      action: "insert",
      payload: { titulo: "Mutação proibida" },
    }, cookie);

    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, "FORBIDDEN");
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tarefas").get().total, 0);
  });
});
