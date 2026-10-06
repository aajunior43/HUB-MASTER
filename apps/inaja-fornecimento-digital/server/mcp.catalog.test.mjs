import test from "node:test";
import assert from "node:assert/strict";
import { RPCS_MCP } from "./mcp.mjs";

const MODULOS_VALIDOS = new Set([
  "tarefas", "credores-fixos", "solicitacoes", "prazos", "empenhos",
  "gestao-documentos", "calendario", "rpas", "assistente-empenho",
  "classificador-despesa", "autentique", "extratos", "mural", "cnpj",
  "pdf-utils", "admin-config",
]);

test("catalogo MCP não possui nomes duplicados", () => {
  const nomes = RPCS_MCP.map(([nome]) => nome);
  assert.equal(new Set(nomes).size, nomes.length);
});

test("cada ferramenta do catalogo possui RPC, módulo e descrição", () => {
  for (const [nome, rpc, modulo, descricao] of RPCS_MCP) {
    assert.match(nome, /^[a-z][a-z0-9_]+$/);
    assert.match(rpc, /^[a-z][a-z0-9_]+$/);
    assert.ok(MODULOS_VALIDOS.has(modulo), `${nome}: módulo desconhecido ${modulo}`);
    assert.ok(descricao.length > 15, `${nome}: descrição muito curta`);
  }
});

test("catalogo cobre os grupos complementares prioritários", () => {
  const nomes = new Set(RPCS_MCP.map(([nome]) => nome));
  for (const nome of [
    "listar_empenhos_orcamentarios", "criar_documento", "listar_documentos",
    "listar_eventos_calendario", "listar_rpas",
    "consultar_dashboard_financeiro", "listar_recados_mural", "buscar_cnpj",
  ]) assert.ok(nomes.has(nome), `ferramenta ausente: ${nome}`);
});
