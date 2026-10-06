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

async function post(path, body, cookie) {
  const response = await fetch(new URL(path, origin), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie") };
}

async function get(path, cookie) {
  const response = await fetch(new URL(path, origin), { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(randomUUID(), "admin");
  db.prepare("INSERT INTO siconfi_sincronizacoes (id, ibge, anos, status, finalizado_em) VALUES (?, ?, ?, ?, datetime('now'))").run(randomUUID(), "4110300", "[2025]", "concluido");
  db.prepare("INSERT INTO siconfi_registros (id, chave_externa, tipo, exercicio, periodo, periodicidade, demonstrativo, esfera, cod_ibge, anexo, coluna, cod_conta, conta, valor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), "rreo-1", "rreo", 2025, 6, "B", "RREO", "M", 4110300, "RREO-Anexo 01", "Até o Bimestre (c)", "TotalReceitas", "TOTAL DAS RECEITAS", 1234.5);
  db.prepare("INSERT INTO siconfi_registros (id, chave_externa, tipo, exercicio, periodo, periodicidade, demonstrativo, esfera, poder, cod_ibge, anexo, coluna, cod_conta, conta, valor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), "rgf-1", "rgf", 2025, 3, "Q", "RGF", "M", "E", 4110300, "RGF-Anexo 06", "% SOBRE A RCL AJUSTADA", "DespesaTotalComPessoalDemonstrativoSimplificado", "Despesa Total com Pessoal", 48);
  db.prepare("INSERT INTO siconfi_entregas (id, chave_externa, exercicio, cod_ibge, entregavel, periodo, periodicidade, status_relatorio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), "entrega-1", 2025, 4110300, "RREO", 6, "B", "HO");
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = "http://127.0.0.1:" + server.address().port;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("API do SICONFI", () => {
  it("protege as rotas e entrega status, indicadores, demonstrativos e entregas", async () => {
    const bloqueado = await get("/api/siconfi/status");
    assert.equal(bloqueado.status, 403);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    const status = await get("/api/siconfi/status", cookie);
    assert.equal(status.status, 200);
    assert.equal(status.body.data.totais.rreo, 1);
    assert.equal(status.body.data.totais.entregas, 1);

    const indicadores = await get("/api/siconfi/indicadores?ano=2025", cookie);
    assert.equal(indicadores.status, 200);
    assert.equal(indicadores.body.data.rreo.receitaTotal.valor, 1234.5);
    assert.equal(indicadores.body.data.rgf.pessoalPercentual.valor, 48);

    const registros = await get("/api/siconfi/registros?tipo=rreo&busca=receitas&ano=2025", cookie);
    assert.equal(registros.status, 200);
    assert.equal(registros.body.data.total, 1);
    assert.equal(registros.body.data.rows[0].cod_conta, "TotalReceitas");

    const entregas = await get("/api/siconfi/entregas?ano=2025", cookie);
    assert.equal(entregas.status, 200);
    assert.equal(entregas.body.data.total, 1);
  });
});
