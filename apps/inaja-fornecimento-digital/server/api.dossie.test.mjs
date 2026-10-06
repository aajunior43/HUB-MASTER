import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";
import { limparCacheTransparencia } from "./services/transparencia.mjs";

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
  limparCacheTransparencia();
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

describe("API Dossiê 360 do Fornecedor", () => {
  it("exige autenticação e retorna dossiê completo quando autenticado", async () => {
    const bloqueado = await get("/api/fornecedor/dossie?cnpj=51241038000197");
    assert.equal(bloqueado.status, 403);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    globalThis.fetch = async (input, options) => {
      const url = String(input);
      if (url.startsWith(origin)) return fetchOriginal(input, options);
      if (url.includes("certidoes-apf")) return { ok: true, status: 200, json: async () => ({ certidoes: [{ emissor: "TCU", tipo: "Inidôneos", situacao: "NADA_CONSTA" }] }) };
      if (url.includes("responsaveis-inidoneos")) return { ok: true, status: 200, json: async () => [] };
      return { ok: true, status: 200, json: async () => [] };
    };

    const resposta = await get("/api/fornecedor/dossie?cnpj=51241038000197", cookie);
    assert.equal(resposta.status, 200);
    assert.equal(resposta.body.data.cnpj, "51241038000197");
    assert.ok(resposta.body.data.diagnostico);
    assert.ok(resposta.body.data.transparencia);
    assert.ok(resposta.body.data.pncp);
    assert.ok(resposta.body.data.municipio);
  });

  it("recusa CNPJ com tamanho inválido", async () => {
    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];

    const resposta = await get("/api/fornecedor/dossie?cnpj=123", cookie);
    assert.equal(resposta.status, 400);
  });
});
