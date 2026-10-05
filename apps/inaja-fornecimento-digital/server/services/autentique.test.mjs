import test from "node:test";
import assert from "node:assert/strict";
import { criarDocumentoAutentique, gerenciarPastasAutentique, normalizarTelefoneAutentique, operarDocumentoAutentique, statusDocumentoAutentique } from "./autentique.mjs";

test("normaliza telefones para E.164", () => {
  assert.equal(normalizarTelefoneAutentique("(44) 99999-9999"), "+5544999999999");
  assert.equal(normalizarTelefoneAutentique("+1 (202) 555-0123"), "+12025550123");
  assert.equal(normalizarTelefoneAutentique("0044 20 7946 0958"), "+442079460958");
  assert.equal(normalizarTelefoneAutentique("123"), null);
  assert.equal(normalizarTelefoneAutentique("+1234567890123456"), null);
});

test("cria documento usando multipart GraphQL", async () => {
  const original = process.env.AUTENTIQUE_API_TOKEN;
  process.env.AUTENTIQUE_API_TOKEN = "token-teste";
  let request;
  const fetchMock = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: { createDocument: { id: "doc-1", name: "Ofício", signatures: [] } } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const { resultado, tokenId } = await criarDocumentoAutentique({
      nome: "Ofício",
      mensagem: "Assine",
      signatarios: [{ canal: "email", email: "pessoa@example.com" }],
      arquivo: Buffer.from("pdf"),
      mime: "application/pdf",
      sandbox: true,
      opcoes: { sortable: true, scrolling_required: true, notification_signed: false },
    }, fetchMock);
    assert.equal(resultado.id, "doc-1");
    assert.equal(tokenId, "env");
    assert.equal(request.url, "https://api.autentique.com.br/v2/graphql");
    assert.equal(request.options.headers.Authorization, "Bearer token-teste");
    const operations = JSON.parse(request.options.body.get("operations"));
    assert.equal(operations.variables.sandbox, true);
    assert.equal(operations.variables.document.whatsapp_template, "STANDARD");
    assert.equal(operations.variables.document.message, "Assine");
    assert.equal(operations.variables.document.sortable, true);
    assert.equal(operations.variables.document.scrolling_required, true);
    assert.equal(operations.variables.document.configs.notification_signed, false);
    assert.equal(operations.variables.signers[0].action, "SIGN");
  } finally {
    if (original === undefined) delete process.env.AUTENTIQUE_API_TOKEN;
    else process.env.AUTENTIQUE_API_TOKEN = original;
  }
});

test("envia signatário por WhatsApp", async () => {
  const original = process.env.AUTENTIQUE_API_TOKEN;
  process.env.AUTENTIQUE_API_TOKEN = "token-teste";
  let operations;
  try {
    await criarDocumentoAutentique({
      nome: "Contrato",
      signatarios: [{ canal: "whatsapp", phone: "+5544999999999" }],
      arquivo: Buffer.from("pdf"),
      mime: "application/pdf",
    }, async (_url, options) => {
      operations = JSON.parse(options.body.get("operations"));
      return new Response(JSON.stringify({ data: { createDocument: { id: "doc-2", signatures: [] } } }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    assert.deepEqual(operations.variables.signers[0], { phone: "+5544999999999", delivery_method: "DELIVERY_METHOD_WHATSAPP", action: "SIGN" });
  } finally {
    if (original === undefined) delete process.env.AUTENTIQUE_API_TOKEN;
    else process.env.AUTENTIQUE_API_TOKEN = original;
  }
});

test("rotaciona para o próximo token quando o primeiro atinge limite", async () => {
  const original = process.env.AUTENTIQUE_API_TOKEN;
  delete process.env.AUTENTIQUE_API_TOKEN;
  const chamadas = [];
  const db = {
    prepare(sql) {
      return {
        all() {
          assert.match(sql, /FROM autentique_tokens/);
          return [
            { id: "token-1", nome: "Primeiro", token: "limite" },
            { id: "token-2", nome: "Segundo", token: "disponivel" },
          ];
        },
        run() {},
      };
    },
  };
  try {
    const { resultado, tokenId } = await criarDocumentoAutentique({
      db,
      nome: "Contrato",
      signatarios: [{ canal: "email", email: "pessoa@example.com" }],
      arquivo: Buffer.from("pdf"),
      mime: "application/pdf",
    }, async (_url, options) => {
      chamadas.push(options.headers.Authorization);
      if (options.headers.Authorization === "Bearer limite") {
        return new Response(JSON.stringify({ errors: [{ message: "Rate limit reached" }] }), { status: 429, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: { createDocument: { id: "doc-ok", signatures: [] } } }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    assert.equal(resultado.id, "doc-ok");
    assert.equal(tokenId, "token-2");
    assert.deepEqual(chamadas, ["Bearer limite", "Bearer disponivel"]);
  } finally {
    if (original === undefined) delete process.env.AUTENTIQUE_API_TOKEN;
    else process.env.AUTENTIQUE_API_TOKEN = original;
  }
});

test("calcula o status consolidado das assinaturas", () => {
  assert.equal(statusDocumentoAutentique({ signatures: [{ signed: { created_at: "2026-01-01" } }] }), "assinado");
  assert.equal(statusDocumentoAutentique({ signatures: [{ viewed: { created_at: "2026-01-01" } }] }), "visualizado");
  assert.equal(statusDocumentoAutentique({ signatures: [{ rejected: { created_at: "2026-01-01" } }] }), "recusado");
});

test("executa operações gratuitas de documento", async () => {
  const original = process.env.AUTENTIQUE_API_TOKEN;
  process.env.AUTENTIQUE_API_TOKEN = "token-teste";
  const requisicoes = [];
  try {
    const fetchMock = async (_url, options) => {
      const body = JSON.parse(options.body);
      requisicoes.push(body);
      return new Response(JSON.stringify({ data: { createLinkToSignature: { short_link: "https://assina.ae/teste" } } }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const resultado = await operarDocumentoAutentique({ acao: "criar_link", documentoId: "doc-1", dados: { public_id: "assinatura-1" }, fetchImpl: fetchMock });
    assert.equal(resultado.resultado.createLinkToSignature.short_link, "https://assina.ae/teste");
    assert.equal(requisicoes[0].variables.publicId, "assinatura-1");
  } finally {
    if (original === undefined) delete process.env.AUTENTIQUE_API_TOKEN;
    else process.env.AUTENTIQUE_API_TOKEN = original;
  }
});

test("lista pastas da conta", async () => {
  const original = process.env.AUTENTIQUE_API_TOKEN;
  process.env.AUTENTIQUE_API_TOKEN = "token-teste";
  try {
    const resultado = await gerenciarPastasAutentique({ acao: "listar", fetchImpl: async () => new Response(JSON.stringify({ data: { folders: { data: [{ id: "pasta-1", name: "Contratos" }], total: 1 } } }), { status: 200, headers: { "Content-Type": "application/json" } }) });
    assert.equal(resultado.resultado.folders.data[0].name, "Contratos");
  } finally {
    if (original === undefined) delete process.env.AUTENTIQUE_API_TOKEN;
    else process.env.AUTENTIQUE_API_TOKEN = original;
  }
});

test("envia signatário por SMS", async () => {
  const original = process.env.AUTENTIQUE_API_TOKEN;
  process.env.AUTENTIQUE_API_TOKEN = "token-teste";
  let operations;
  try {
    await criarDocumentoAutentique({ nome: "Aviso", signatarios: [{ canal: "sms", phone: "44 99999-9999" }], arquivo: Buffer.from("pdf"), mime: "application/pdf" }, async (_url, options) => {
      operations = JSON.parse(options.body.get("operations"));
      return new Response(JSON.stringify({ data: { createDocument: { id: "doc-sms", signatures: [] } } }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    assert.deepEqual(operations.variables.signers[0], { phone: "+5544999999999", delivery_method: "DELIVERY_METHOD_SMS", action: "SIGN" });
  } finally {
    if (original === undefined) delete process.env.AUTENTIQUE_API_TOKEN;
    else process.env.AUTENTIQUE_API_TOKEN = original;
  }
});
