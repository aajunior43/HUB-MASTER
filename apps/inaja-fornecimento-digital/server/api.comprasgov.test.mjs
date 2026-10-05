import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";
import { limparCacheComprasGov } from "./services/comprasgov.mjs";

let db;
let server;
let origin;
let fetchOriginal;

async function post(path, body) {
  const response = await fetchOriginal(new URL(path, origin), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie") };
}

async function get(path, cookie) {
  const response = await fetchOriginal(new URL(path, origin), { headers: cookie ? { Cookie: cookie } : {} });
  return { status: response.status, body: await response.json() };
}

beforeEach(async () => {
  fetchOriginal = globalThis.fetch;
  limparCacheComprasGov();
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

describe("API do Compras.gov.br", () => {
  it("protege as rotas e consulta catálogo e preços com sessão", async () => {
    assert.equal((await get("/api/compras-gov/config")).status, 403);
    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.startsWith(origin)) return fetchOriginal(input, init);
      if (url.includes("4_consultarItemMaterial")) return new Response(JSON.stringify({ resultado: { itens: [{ codigoItem: 244072, descricaoItem: "Papel sulfite A4" }], totalRegistros: 1 } }), { status: 200 });
      if (url.includes("1_consultarMaterial")) return new Response(JSON.stringify({ resultado: { itens: [{ idCompra: "1", precoUnitario: "12,50", nomeFornecedor: "Fornecedor A" }], totalRegistros: 1 } }), { status: 200 });
      throw new Error(`URL externa inesperada: ${url}`);
    };

    const catalogo = await get("/api/compras-gov/catalogo?tipo=material&busca=papel", cookie);
    assert.equal(catalogo.status, 200);
    assert.equal(catalogo.body.data.itens[0].codigo, "244072");
    const precos = await get("/api/compras-gov/precos?tipo=material&codigo=244072", cookie);
    assert.equal(precos.status, 200);
    assert.equal(precos.body.data.resumo.mediana, 12.5);
  });
});
