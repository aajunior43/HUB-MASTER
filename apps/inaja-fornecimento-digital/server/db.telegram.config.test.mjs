import { describe, it, beforeEach } from "node:test";
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
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "luana");
  return { db, adminId, userId };
}

describe("telegram config and runtime status RPCs", () => {
  let db;

  beforeEach(() => {
    ({ db } = freshDb());
  });

  it("telegram_status_runtime exige admin ativo e retorna estado consolidado", async () => {
    const denied = await runRpc(db, "telegram_status_runtime", { _caller: "luana" });
    assert.equal(denied.error?.code, "FORBIDDEN");

    const initial = await runRpc(db, "telegram_status_runtime", { _caller: "admin" });
    assert.equal(initial.error, null);
    assert.equal(typeof initial.data.running, "boolean");
    assert.equal(typeof initial.data.hasToken, "boolean");
    assert.equal(typeof initial.data.enabled, "boolean");
  });

  it("telegram_salvar_config grava token e enabled com integridade", async () => {
    const denied = await runRpc(db, "telegram_salvar_config", {
      _caller: "luana",
      _token: "123456:TEST",
      _enabled: "1",
    });
    assert.equal(denied.error?.code, "FORBIDDEN");

    const saved = await runRpc(db, "telegram_salvar_config", {
      _caller: "admin",
      _token: "999888:ABC-DEF-GHI",
      _enabled: "1",
    });
    assert.equal(saved.error, null);
    assert.equal(saved.data.ok, true);

    const tokenRow = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_token'").get();
    assert.equal(tokenRow?.valor, "999888:ABC-DEF-GHI");

    const enabledRow = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_enabled'").get();
    assert.equal(enabledRow?.valor, "1");

    const status = await runRpc(db, "telegram_status_runtime", { _caller: "admin" });
    assert.equal(status.data.hasToken, true);
    assert.equal(status.data.tokenSource, "db");
    assert.equal(status.data.enabled, true);
  });

  it("telegram_testar_token valida token vazio com mensagem clara", async () => {
    const r = await runRpc(db, "telegram_testar_token", { _caller: "admin", _token: "   " });
    assert.equal(r.error?.code, "BAD_REQUEST");
  });

  it("telegram_dossie_fornecedor valida formato de CNPJ e exige 14 digitos", async () => {
    const invalido = await runRpc(db, "telegram_dossie_fornecedor", { _caller: "admin", _cnpj: "123" });
    assert.equal(invalido.error?.code, "BAD_REQUEST");
  });
});
