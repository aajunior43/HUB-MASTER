import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";
import { limparCacheBcb } from "./services/bcb.mjs";

let db;
let server;
let origin;
let fetchOriginal;

async function post(path, body) {
  const response = await fetchOriginal(new URL(path, origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie") };
}

async function get(path, cookie) {
  const response = await fetchOriginal(new URL(path, origin), { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
  fetchOriginal = globalThis.fetch;
  limparCacheBcb();
  db = new DatabaseSync(":memory:");
  migrate(db);
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(randomUUID(), "admin");
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  globalThis.fetch = fetchOriginal;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("serviço auxiliar do Banco Central", () => {
  it("protege a rota e integra o cálculo de atualização", async () => {
    assert.equal((await get("/api/bcb/calcular?valor=1000&serie=ipca&dataInicial=2024-01-01&dataFinal=2024-02-29")).status, 403);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.startsWith(origin)) return fetchOriginal(input, init);
      if (url.includes("bcdata.sgs.433")) return new Response(JSON.stringify({ value: [{ data: "01/01/2024", valor: "1.00" }, { data: "01/02/2024", valor: "2.00" }] }), { status: 200 });
      throw new Error(`URL externa inesperada: ${url}`);
    };

    const config = await get("/api/bcb/config", cookie);
    assert.equal(config.status, 200);
    assert.deepEqual(config.body.data.series.map((serie) => serie.id), ["ipca", "selic"]);

    const calculo = await get("/api/bcb/calcular?valor=1000,00&serie=ipca&dataInicial=2024-01-01&dataFinal=2024-02-29", cookie);
    assert.equal(calculo.status, 200);
    assert.equal(calculo.body.data.valorAtualizado, 1030.2);
  });
});
