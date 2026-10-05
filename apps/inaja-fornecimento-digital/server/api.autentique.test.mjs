import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { DatabaseSync } from "node:sqlite";
import { handleApi } from "./api.mjs";
import { migrate } from "./db.mjs";

function responseMock() {
  const res = new EventEmitter();
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name] = value; };
  res.end = (body = "") => { res.body = body; res.emit("finish"); };
  return res;
}

function requestWebhook(payload, secret) {
  const raw = Buffer.from(JSON.stringify(payload));
  const req = Readable.from([raw]);
  req.method = "POST";
  req.url = "/api/autentique/webhook";
  req.headers = { "x-autentique-signature": createHmac("sha256", secret).update(raw).digest("hex") };
  return req;
}

test("webhook autenticado atualiza documento e ignora duplicata", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const secret = "segredo-webhook-com-tamanho-seguro";
  const documentoId = "documento-remoto-1";
  db.prepare("INSERT INTO configuracoes (chave, valor) VALUES ('autentique_webhook_secret', ?)").run(secret);
  db.prepare("INSERT INTO autentique_envios (id, autentique_id, documento_nome, signatario_nome, signatario_phone) VALUES (?, ?, 'Teste', 'Pessoa', '+5544999999999')").run(randomUUID(), documentoId);
  const payload = { event: { id: "evento-1", type: "document.deleted", data: { object: { id: documentoId } } } };

  const primeiraResposta = responseMock();
  await handleApi(requestWebhook(payload, secret), primeiraResposta, db);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(primeiraResposta.statusCode, 202);
  assert.equal(db.prepare("SELECT status FROM autentique_envios WHERE autentique_id = ?").get(documentoId).status, "excluido");
  assert.ok(db.prepare("SELECT processado_em FROM autentique_webhook_eventos WHERE id = 'evento-1'").get().processado_em);

  const segundaResposta = responseMock();
  await handleApi(requestWebhook(payload, secret), segundaResposta, db);
  assert.equal(JSON.parse(segundaResposta.body).duplicate, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM autentique_webhook_eventos").get().total, 1);
});

test("webhook rejeita assinatura HMAC inválida", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  db.prepare("INSERT INTO configuracoes (chave, valor) VALUES ('autentique_webhook_secret', 'segredo-webhook-com-tamanho-seguro')").run();
  const payload = { event: { id: "evento-invalido", type: "document.finished", data: {} } };
  const res = responseMock();
  await handleApi(requestWebhook(payload, "outro-segredo"), res, db);
  assert.equal(res.statusCode, 401);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM autentique_webhook_eventos").get().total, 0);
});
