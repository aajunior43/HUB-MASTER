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

describe("API TCU/Portal da Transparência", () => {
  it("protege a rota, consulta TCU e mantém a chave do Portal fora da listagem", async () => {
    const bloqueado = await get("/api/transparencia/cnpj?cnpj=51241038000197");
    assert.equal(bloqueado.status, 403);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    let fonteCalls = 0;
    globalThis.fetch = async (input, options) => {
      const url = String(input);
      if (url.startsWith(origin)) return fetchOriginal(input, options);
      fonteCalls += 1;
      if (url.includes("certidoes-apf")) return { ok: true, status: 200, json: async () => ({ certidoes: [{ emissor: "TCU", tipo: "Inidôneos", situacao: "NADA_CONSTA" }] }) };
      if (url.includes("responsaveis-inidoneos")) return { ok: true, status: 200, json: async () => [] };
      if (url.includes("/ceis?") || url.includes("/cnep?") || url.includes("contratos/cpf-cnpj")) return { ok: true, status: 200, json: async () => [] };
      throw new Error(`URL inesperada: ${url}`);
    };

    const consulta = await get("/api/transparencia/cnpj?cnpj=51.241.038/0001-97", cookie);
    assert.equal(consulta.status, 200);
    assert.equal(consulta.body.data.cnpj, "51241038000197");
    assert.equal(consulta.body.data.tcu.certidoes[0].situacao, "NADA_CONSTA");
    assert.equal(consulta.body.data.portal.configurado, false);
    assert.equal(fonteCalls, 2);

    const definir = await post("/api/rpc", { fn: "portal_transparencia_api_key_definir", args: { _caller: "admin", _chave: "token-teste" } }, cookie);
    assert.equal(definir.status, 200);
    const configuracoes = await post("/api/rpc", { fn: "config_listar", args: { _caller: "admin" } }, cookie);
    assert.equal(configuracoes.status, 200);
    assert.equal(configuracoes.body.data.some((item) => item.chave === "portal_transparencia_api_key"), false);

    const consultaCompleta = await get("/api/transparencia/cnpj?cnpj=51241038000197", cookie);
    assert.equal(consultaCompleta.status, 200);
    assert.equal(consultaCompleta.body.data.portal.configurado, true);
    assert.equal(fonteCalls, 7);
  });
});
