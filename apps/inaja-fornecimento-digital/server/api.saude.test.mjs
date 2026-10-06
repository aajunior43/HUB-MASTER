import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";
import { limparCacheSaude } from "./services/saude.mjs";

let db;
let server;
let origin;
let fetchOriginal;

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
  fetchOriginal = globalThis.fetch;
  limparCacheSaude();
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
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

describe("API do CNES/DATASUS", () => {
  it("protege rotas, consulta rede municipal, tipos e detalhe", async () => {
    const bloqueado = await get("/api/saude/cnes?municipio=4110300");
    assert.equal(bloqueado.status, 403);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/cnes/tipounidades")) return new Response(JSON.stringify({ tipos_unidade: [{ codigo_tipo_unidade: 2, descricao_tipo_unidade: "CENTRO DE SAUDE/UNIDADE BASICA" }] }), { status: 200 });
      if (url.endsWith("/cnes/estabelecimentos/2754304")) return new Response(JSON.stringify({ codigo_cnes: 2754304, nome_fantasia: "UBS TESTE", codigo_tipo_unidade: 2, codigo_municipio: 411030, codigo_uf: 41, codigo_motivo_desabilitacao_estabelecimento: null }), { status: 200 });
      if (url.includes("/cnes/estabelecimentos?")) return new Response(JSON.stringify({ estabelecimentos: [{ codigo_cnes: 2754304, nome_fantasia: "UBS TESTE", codigo_tipo_unidade: 2, codigo_municipio: 411030, codigo_uf: 41, codigo_motivo_desabilitacao_estabelecimento: null }] }), { status: 200 });
      return fetchOriginal(input, init);
    };

    const rede = await get("/api/saude/cnes?municipio=4110300&tipo=2&status=ativo", cookie);
    assert.equal(rede.status, 200);
    assert.equal(rede.body.data.filtros.codigoMunicipio, "411030");
    assert.equal(rede.body.data.registros[0].codigoCnes, "2754304");

    const tipos = await get("/api/saude/cnes/tipos", cookie);
    assert.equal(tipos.status, 200);
    assert.equal(tipos.body.data.tipos[0].descricao, "CENTRO DE SAUDE/UNIDADE BASICA");

    const detalhe = await get("/api/saude/cnes?cnes=2754304", cookie);
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.body.data.modo, "detalhe");
    assert.equal(detalhe.body.data.registro.nomeFantasia, "UBS TESTE");
  });
});
