import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { criarServidor, RPC_CONFIRMATIONS, RPCS_MCP, validarConfirmacaoRpc } from "./mcp.mjs";

function fakeDb() {
  return {
    prepare() {
      return {
        get: () => ({}),
        all: () => [],
        run: () => ({ changes: 0 }),
      };
    },
  };
}

async function listarFerramentas(usuario) {
  const servidor = criarServidor(fakeDb(), usuario);
  const [transporteCliente, transporteServidor] = InMemoryTransport.createLinkedPair();
  const cliente = new Client({ name: "mcp-security-test", version: "1.0.0" });
  await servidor.connect(transporteServidor);
  await cliente.connect(transporteCliente);
  try {
    return (await cliente.listTools()).tools;
  } finally {
    await cliente.close();
    await servidor.close();
  }
}

test("RPCs destrutivas possuem confirmação centralizada", () => {
  assert.equal(RPCS_MCP.some(([, rpc]) => rpc === "pdf_mesclar"), false);
  assert.equal(RPCS_MCP.some(([, rpc]) => rpc === "pdf_dividir"), false);
  assert.equal(RPCS_MCP.some(([, rpc]) => rpc === "pdf_proteger"), false);
  assert.equal(RPC_CONFIRMATIONS.backup_enviar_github, "ENVIAR_BACKUP");
  assert.equal(RPC_CONFIRMATIONS.backup_excluir, "REMOVER");
  assert.throws(() => validarConfirmacaoRpc("backup_enviar_github", {}), /ENVIAR_BACKUP/);
  assert.doesNotThrow(() => validarConfirmacaoRpc("backup_enviar_github", { _confirmacao: "ENVIAR_BACKUP" }));
});

test("schema e metadados sinalizam operações destrutivas e leituras", async () => {
  const tools = await listarFerramentas({
    id: "admin-id",
    username: "admin",
    ativo: 1,
    is_admin: true,
    mcpTokenId: "token-id",
    requestId: "request-id",
    clientIp: "127.0.0.1",
    modulos: [],
  });
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  for (const [name, confirmation] of [["enviar_backup_completo_github", "ENVIAR_BACKUP"], ["remover_backup", "REMOVER"]]) {
    const tool = byName.get(name);
    assert.equal(tool.annotations.destructiveHint, true, name);
    assert.deepEqual(tool.inputSchema.required, ["argumentos"], name);
    assert.equal(tool.inputSchema.properties.argumentos.properties._confirmacao.const, confirmation, name);
    assert.deepEqual(tool.inputSchema.properties.argumentos.required, ["_confirmacao"], name);
  }

  assert.equal(byName.get("consultar_status_backup").annotations.readOnlyHint, true);
  assert.equal(byName.get("calcular_rpa").annotations.readOnlyHint, true);
  assert.equal(byName.get("enviar_backup_completo_github").annotations.destructiveHint, true);
});

test("usuário comum só recebe ferramentas dos módulos atribuídos", async () => {
  const tools = await listarFerramentas({
    id: "user-id",
    username: "user",
    ativo: 1,
    is_admin: false,
    mcpTokenId: "token-id",
    requestId: "request-id",
    clientIp: "127.0.0.1",
    modulos: ["tarefas"],
  });
  const names = new Set(tools.map((tool) => tool.name));
  assert.equal(names.has("listar_tarefas"), true);
  assert.equal(names.has("criar_tarefa"), true);
  assert.equal(names.has("listar_documentos"), false);
  assert.equal(names.has("remover_backup"), false);
});
