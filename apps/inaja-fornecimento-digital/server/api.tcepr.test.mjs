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
  db.prepare("INSERT INTO tcepr_sincronizacoes (id, cnpj, ibge, anos, status, finalizado_em) VALUES (?, ?, ?, ?, ?, datetime('now'))").run(randomUUID(), "76970318000167", "4110300", "[2026]", "concluido");
  const licitacaoId = randomUUID();
  db.prepare("INSERT INTO tcepr_licitacoes (id, chave_externa, cnpj_orgao, orgao_nome, codigo_ibge, municipio, ano, processo, edital, modalidade, objeto, data_publicacao, valor_referencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(licitacaoId, "lic-1", "76970318000167", "Prefeitura de Inajá", "10300", "Inajá", 2026, "12/2026", "12", "Pregão", "Aquisição de material", "2026-01-10", 1000);
  db.prepare("INSERT INTO pncp_registros (id, tipo, chave_pncp, cnpj_orgao, objeto, processo, valor) VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), "contratacao", "pncp-1", "76970318000167", "Aquisição de material", "12/2026", 1000);
  const obraId = randomUUID();
  db.prepare("INSERT INTO tcepr_obras (id, chave_externa, id_intervencao, cnpj_orgao, orgao_nome, codigo_ibge, municipio, ano, nome_intervencao, objeto, valor, situacao, percentual_fisico, ultimo_acompanhamento) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(obraId, "obra-1", "OBRA-1", "76970318000167", "Prefeitura de Inajá", "10300", "Inajá", 2025, "Pavimentação", "Pavimentação de vias", 5000, "Paralisada", 42.5, "2026-03-10");
  db.prepare("INSERT INTO tcepr_obras_acompanhamentos (id, chave_externa, obra_id, id_intervencao, data, tipo, observacao, percentual_fisico) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), "acomp-1", obraId, "OBRA-1", "2026-03-10", "Acompanhamento", "Paralisado", 42.5);
  server = createServer((req, res) => handleApi(req, res, db));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  db.close();
});

describe("API do TCE-PR", () => {
  it("protege as consultas e entrega listagem, detalhe e conferência", async () => {
    const bloqueado = await get("/api/tce-pr/status");
    assert.equal(bloqueado.status, 403);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "admin", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "admin", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    const status = await get("/api/tce-pr/status", cookie);
    assert.equal(status.status, 200);
    assert.equal(status.body.data.resumo.licitacoes, 1);
    assert.equal(status.body.data.resumo.obras, 1);
    assert.deepEqual(status.body.data.anosObras, [2025]);

    const licitacoes = await get("/api/tce-pr/licitacoes?busca=material", cookie);
    assert.equal(licitacoes.status, 200);
    assert.equal(licitacoes.body.data.total, 1);
    assert.equal(licitacoes.body.data.rows[0].pncp_encontrado, 1);

    const obras = await get("/api/tce-pr/obras?busca=pavimenta", cookie);
    assert.equal(obras.status, 200);
    assert.equal(obras.body.data.total, 1);
    assert.equal(obras.body.data.rows[0].situacao, "Paralisada");

    const detalhe = await get(`/api/tce-pr/detalhe?tipo=obra&id=${obras.body.data.rows[0].id}`, cookie);
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.body.data.acompanhamentos.length, 1);

    const pendencias = await get("/api/tce-pr/pendencias", cookie);
    assert.equal(pendencias.status, 200);
    assert.ok(Array.isArray(pendencias.body.data.semPncp));
    assert.equal(pendencias.body.data.obrasParalisadas.length, 1);
  });

  it("permite acesso a usuário comum com módulo obras", async () => {
    const userId = randomUUID();
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(userId, "fiscal");
    db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, 'obras')").run(randomUUID(), userId);

    await post("/api/rpc", { fn: "usuario_set_senha", args: { _username: "fiscal", _senha: "Senha123" } });
    const login = await post("/api/rpc", { fn: "usuario_login", args: { _username: "fiscal", _senha: "Senha123" } });
    const cookie = login.cookie?.split(";", 1)[0];
    assert.ok(cookie);

    const status = await get("/api/tce-pr/status", cookie);
    assert.equal(status.status, 200);
    assert.equal(status.body.data.isAdmin, false);

    const obras = await get("/api/tce-pr/obras", cookie);
    assert.equal(obras.status, 200);
    assert.equal(obras.body.data.total, 1);

    const detalhe = await get(`/api/tce-pr/detalhe?tipo=obra&id=${obras.body.data.rows[0].id}`, cookie);
    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.body.data.acompanhamentos.length, 1);
  });
});
