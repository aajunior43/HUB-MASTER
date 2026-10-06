import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, it } from "node:test";
import { migrate, runRpc } from "./db.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  db.prepare("INSERT INTO usuarios (id, username, ativo) VALUES (?, ?, 1)").run("u1", "ana");
  return db;
}

describe("favoritos de modulos", () => {
  let db;

  beforeEach(() => { db = freshDb(); });

  it("salva e recupera os favoritos na ordem escolhida", async () => {
    const salvar = await runRpc(db, "usuario_modulos_favoritos_salvar", {
      _caller: "ana",
      _favoritos: ["cnpj", "pdf-utils", "cnpj", "manual"],
    });
    assert.equal(salvar.error, null);
    assert.deepEqual(salvar.data, ["cnpj", "pdf-utils", "manual"]);

    const obter = await runRpc(db, "usuario_modulos_favoritos_obter", { _caller: "ana" });
    assert.equal(obter.error, null);
    assert.deepEqual(obter.data, ["cnpj", "pdf-utils", "manual"]);
  });

  it("limita a cinco favoritos", async () => {
    const salvar = await runRpc(db, "usuario_modulos_favoritos_salvar", {
      _caller: "ana",
      _favoritos: ["a", "b", "c", "d", "e", "f"],
    });
    assert.equal(salvar.error, null);
    assert.deepEqual(salvar.data, ["a", "b", "c", "d", "e"]);
  });

  it("nao permite ler ou alterar favoritos de uma sessao inexistente", async () => {
    const obter = await runRpc(db, "usuario_modulos_favoritos_obter", { _caller: "nao-existe" });
    const salvar = await runRpc(db, "usuario_modulos_favoritos_salvar", { _caller: "nao-existe", _favoritos: ["cnpj"] });
    assert.equal(obter.error?.code, "FORBIDDEN");
    assert.equal(salvar.error?.code, "FORBIDDEN");
  });
});
