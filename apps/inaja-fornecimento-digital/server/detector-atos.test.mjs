import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { DatabaseSync } from "node:sqlite";
import { createDetectorAtosHandler } from "./services/detector-atos.mjs";
import { createDetectorAtosIaHandler } from "./services/detector-atos-ia.mjs";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";

function responseMock() {
  const res = new EventEmitter();
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.end = (body = "") => { res.body = body; res.emit("finish"); };
  return res;
}

function requestMock(url, method = "GET", body = null) {
  const req = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body))]);
  req.method = method;
  req.url = url;
  req.headers = {};
  return req;
}

test("proxy encaminha rota, consulta e autenticação ao detector", async () => {
  let chamada;
  const handler = createDetectorAtosHandler({
    baseUrl: "http://127.0.0.1:8010",
    username: "integracao",
    password: "segredo",
    fetchImpl: async (url, init) => {
      chamada = { url: String(url), init };
      return new Response(JSON.stringify([{ id: 7, tipo: "Decreto" }]), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const res = responseMock();
  await handler(requestMock("/api/detector-atos/buscar?q=saude&limit=10"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(chamada.url, "http://127.0.0.1:8010/api/buscar?q=saude&limit=10");
  assert.equal(chamada.init.headers.Authorization, `Basic ${Buffer.from("integracao:segredo").toString("base64")}`);
  assert.deepEqual(JSON.parse(res.body).data, [{ id: 7, tipo: "Decreto" }]);
});

test("proxy informa indisponibilidade sem expor erro interno", async () => {
  const handler = createDetectorAtosHandler({ fetchImpl: async () => { throw new Error("connect ECONNREFUSED 127.0.0.1"); } });
  const res = responseMock();
  await handler(requestMock("/api/detector-atos/health"), res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 503);
  assert.equal(body.error.code, "DETECTOR_OFFLINE");
  assert.equal(JSON.stringify(body).includes("ECONNREFUSED"), false);
});

test("proxy inicia ciclo somente por solicitação POST", async () => {
  let chamada;
  const handler = createDetectorAtosHandler({
    fetchImpl: async (url, init) => {
      chamada = { url: String(url), init };
      return new Response(JSON.stringify({ status: "started" }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  });
  const res = responseMock();
  await handler(requestMock("/api/detector-atos/executar", "POST"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(chamada.url, "http://127.0.0.1:8010/api/detectar-edicoes");
  assert.equal(chamada.init.method, "POST");
  assert.equal(JSON.parse(res.body).data.status, "started");
});

test("proxy processa somente a edição selecionada", async () => {
  let chamada;
  const handler = createDetectorAtosHandler({
    fetchImpl: async (url, init) => {
      chamada = { url: String(url), init };
      return new Response(JSON.stringify({ status: "started", edicao_id: 42 }), { status: 200 });
    },
  });
  const res = responseMock();
  await handler(requestMock("/api/detector-atos/edicoes/42/processar", "POST"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(chamada.url, "http://127.0.0.1:8010/api/edicoes/42/processar");
  assert.equal(chamada.init.method, "POST");
  assert.equal(JSON.parse(res.body).data.edicao_id, 42);
});

test("proxy consulta o progresso vivo da edição selecionada", async () => {
  let chamada;
  const handler = createDetectorAtosHandler({
    fetchImpl: async (url, init) => {
      chamada = { url: String(url), init };
      return new Response(JSON.stringify({ has_running: true, current: { etapa: "rodando OCR", mensagem: "Página 3/10" } }), { status: 200 });
    },
  });
  const res = responseMock();
  await handler(requestMock("/api/detector-atos/edicoes/42/live-status"), res);
  assert.equal(res.statusCode, 200);
  assert.equal(chamada.url, "http://127.0.0.1:8010/api/edicoes/42/live-status");
  assert.equal(chamada.init.method, "GET");
  assert.equal(JSON.parse(res.body).data.current.etapa, "rodando OCR");
});

test("ponte de IA usa a configuração da Prefeitura e ignora o modelo enviado pelo detector", async () => {
  const token = "a".repeat(64);
  let chamada;
  const handler = createDetectorAtosIaHandler({
    token,
    iaChatImpl: async (args) => {
      chamada = args;
      return { text: '{"ok":true}', model: "modelo-da-prefeitura", provider: "openrouter", usage: { total_tokens: 10 } };
    },
  });
  const req = requestMock("/api/internal/detector-atos/ia/chat/completions", "POST", {
    model: "modelo-do-detector",
    messages: [{ role: "user", content: "Analise" }],
    max_tokens: 900,
  });
  req.headers.authorization = `Bearer ${token}`;
  const res = responseMock();
  await handler(req, res, {});
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(chamada.model, undefined);
  assert.equal(chamada.maxTokens, 900);
  assert.equal(body.model, "modelo-da-prefeitura");
  assert.equal(body.choices[0].message.content, '{"ok":true}');
});

test("ponte de IA recusa chamadas sem o segredo interno", async () => {
  const handler = createDetectorAtosIaHandler({ token: "b".repeat(64), iaChatImpl: async () => assert.fail("IA não deveria ser chamada") });
  const res = responseMock();
  await handler(requestMock("/api/internal/detector-atos/ia/chat/completions", "POST", { messages: [{ role: "user", content: "x" }] }), res, {});
  assert.equal(res.statusCode, 401);
});

test("API bloqueia o módulo sem sessão autorizada", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const res = responseMock();
  await handleApi(requestMock("/api/detector-atos/health"), res, db);
  assert.equal(res.statusCode, 403);
  assert.equal(JSON.parse(res.body).error.code, "FORBIDDEN");
  db.close();
});
