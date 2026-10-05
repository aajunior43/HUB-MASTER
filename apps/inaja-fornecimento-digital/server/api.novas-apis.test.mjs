import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";

let db;
let server;
let origin;
const fetchOriginal = globalThis.fetch;

async function post(path, body, cookie) {
  const response = await fetchOriginal(new URL(path, origin), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie") };
}

async function get(path, cookie) {
  const response = await fetchOriginal(new URL(path, origin), { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  migrate(db);
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(randomUUID(), "admin");
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = "http://127.0.0.1:" + server.address().port;
});

afterEach(async () => {
  globalThis.fetch = fetchOriginal;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("API FNDE e Benefícios Sociais", () => {
  it("permite consultar status e repasses do FNDE", async () => {
    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];

    db.prepare(`
      INSERT INTO fnde_repasses (
        id, ano, programa, acao, numero_processo, entidade, cnpj_entidade, escola, valor_pago, data_pagamento, numero_ordem_bancaria
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), 2026, "PNAE", "ALIMENTACAO ESCOLAR", "23034.001/2026", "PREFEITURA MUNICIPAL DE INAJA",
      "76970318000167", "ESCOLA MUNICIPAL", 45000, "2026-03-01", "2026OB800001"
    );

    const status = await get("/api/fnde/status", cookie);
    assert.equal(status.status, 200);
    assert.equal(status.body.data.resumo.total, 1);
    assert.equal(status.body.data.resumo.valor_total, 45000);

    const repasses = await get("/api/fnde/repasses?ano=2026", cookie);
    assert.equal(repasses.status, 200);
    assert.equal(repasses.body.data.total, 1);
    assert.equal(repasses.body.data.rows[0].programa, "PNAE");
  });

  it("permite consultar status e histórico dos Benefícios Sociais", async () => {
    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];

    db.prepare(`
      INSERT INTO beneficios_sociais (
        id, mes_ano, tipo, codigo_ibge, municipio, uf, quantidade_beneficiarios, valor_total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(), "202602", "bolsa-familia", "4110300", "INAJÁ", "PR", 420, 285000
    );

    const status = await get("/api/beneficios-sociais/status", cookie);
    assert.equal(status.status, 200);
    assert.equal(status.body.data.resumo.registros, 1);
    assert.equal(status.body.data.resumo.beneficiarios_total, 420);

    const hist = await get("/api/beneficios-sociais/historico?tipo=bolsa-familia", cookie);
    assert.equal(hist.status, 200);
    assert.equal(hist.body.data.rows.length, 1);
    assert.equal(hist.body.data.rows[0].municipio, "INAJÁ");
  });
});
