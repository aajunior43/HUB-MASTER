import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { handleMcp } from "./mcp.mjs";

function fakeDb() {
  return {
    prepare(sql) {
      return {
        get: () => sql.includes("FROM mcp_tokens")
          ? { id: "token-id", usuario_id: "user-id", username: "usuario", ativo: 1, is_admin: 0 }
          : {},
        all: () => sql.includes("FROM usuario_modulos") ? [{ modulo_id: "tarefas" }] : [],
        run: () => ({ changes: 1 }),
      };
    },
  };
}

function requisicao(porta, options, body = "") {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, "utf8");
    const req = http.request({
      host: "127.0.0.1",
      port: porta,
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(payload.length ? { "Content-Length": payload.length } : {}),
      },
    }, (res) => {
      const partes = [];
      res.on("data", (parte) => partes.push(parte));
      res.on("end", () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(partes).toString("utf8"),
      }));
    });
    req.on("error", reject);
    if (payload.length) req.write(payload);
    req.end();
  });
}

test("endpoint MCP aplica CORS, autenticação e catálogo por módulo", { concurrency: false }, async () => {
  const origemAnterior = process.env.MCP_ALLOWED_ORIGIN;
  process.env.MCP_ALLOWED_ORIGIN = "https://cliente.exemplo";
  const server = http.createServer((req, res) => {
    void handleMcp(req, res, fakeDb());
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const porta = server.address().port;

  try {
    const preflight = await requisicao(porta, {
      method: "OPTIONS",
      path: "/mcp",
      headers: {
        Origin: "https://cliente.exemplo",
        "Access-Control-Request-Headers": "authorization, content-type, accept, mcp-protocol-version",
      },
    });
    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers["access-control-allow-origin"], "https://cliente.exemplo");
    assert.match(preflight.headers["access-control-allow-headers"], /Mcp-Protocol-Version/i);

    const origemNegada = await requisicao(porta, {
      method: "OPTIONS",
      path: "/mcp",
      headers: { Origin: "https://outro.exemplo" },
    });
    assert.equal(origemNegada.statusCode, 403);

    const inicializacao = await requisicao(porta, {
      method: "POST",
      path: "/mcp",
      headers: {
        Authorization: "Bearer token-de-teste",
        Origin: "https://cliente.exemplo",
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "X-Request-Id": "http-test-01",
      },
    }, JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "mcp-http-test", version: "1.0.0" },
      },
    }));
    assert.equal(inicializacao.statusCode, 200);
    assert.equal(inicializacao.headers["access-control-allow-origin"], "https://cliente.exemplo");
    assert.equal(inicializacao.headers["x-request-id"], "http-test-01");
    assert.equal(JSON.parse(inicializacao.body).result.serverInfo.name, "prefeitura-inaja");

    const lista = await requisicao(porta, {
      method: "POST",
      path: "/mcp",
      headers: {
        Authorization: "Bearer token-de-teste",
        Origin: "https://cliente.exemplo",
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "Mcp-Protocol-Version": "2025-03-26",
      },
    }, JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));
    assert.equal(lista.statusCode, 200);
    const nomes = new Set(JSON.parse(lista.body).result.tools.map((tool) => tool.name));
    assert.equal(nomes.has("listar_tarefas"), true);
    assert.equal(nomes.has("listar_documentos"), false);
    assert.equal(nomes.has("remover_backup"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (origemAnterior === undefined) delete process.env.MCP_ALLOWED_ORIGIN;
    else process.env.MCP_ALLOWED_ORIGIN = origemAnterior;
  }
});
