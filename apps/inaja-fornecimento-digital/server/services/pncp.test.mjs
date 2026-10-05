import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../db.mjs";
import { normalizarRegistroPncp, sincronizarPncp } from "./pncp.mjs";

test("normaliza uma contratação do PNCP", () => {
  const registro = normalizarRegistroPncp("contratacao", {
    numeroControlePNCP: "76970318000167-1-000001/2026",
    numeroCompra: "1",
    anoCompra: 2026,
    sequencialCompra: 1,
    objetoCompra: "Aquisição de material",
    valorTotalEstimado: 1234.56,
    orgaoEntidade: { cnpj: "76.970.318/0001-67" },
  });
  assert.equal(registro.chave_pncp, "76970318000167-1-000001/2026");
  assert.equal(registro.cnpj_orgao, "76970318000167");
  assert.equal(registro.objeto, "Aquisição de material");
  assert.equal(registro.valor, 1234.56);
});

test("sincroniza categorias e preserva resultados quando uma consulta falha", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const urls = [];
  const fetchImpl = async (url) => {
    const endereco = String(url);
    urls.push(endereco);
    if (endereco.includes("codigoModalidadeContratacao=14")) throw new Error("timeout");
    const item = endereco.includes("/contratos?")
      ? { numeroControlePNCP: "CONTRATO-1", numeroContratoEmpenho: "10", anoContrato: 2026, sequencialContrato: 1, objetoContrato: "Contrato", orgaoEntidade: { cnpj: "76970318000167" } }
      : endereco.includes("/atas?")
        ? { numeroControlePNCPAta: "ATA-1", numeroAtaRegistroPreco: "2", anoAta: 2026, orgaoEntidade: { cnpj: "76970318000167" } }
        : endereco.includes("/pca/")
          ? { idPcaPncp: "PCA-1", anoPca: 2026, orgaoEntidadeCnpj: "76970318000167", itens: [{ numeroItem: 1, descricaoItem: "Material", valorTotal: 100 }, { numeroItem: 2, descricaoItem: "Serviço", valorTotal: 200 }] }
          : { numeroControlePNCP: `COMPRA-${new URL(endereco).searchParams.get("codigoModalidadeContratacao")}`, numeroCompra: "3", anoCompra: 2026, sequencialCompra: 3, objetoCompra: "Compra", orgaoEntidade: { cnpj: "76970318000167" } };
    const data = endereco.includes("/pca/") ? [item, { idPcaPncp: "PCA-EXTERNO", anoPca: 2026, orgaoEntidadeCnpj: "00000000000000", itens: [{ numeroItem: 1, descricaoItem: "Ignorar" }] }] : [item];
    return { status: 200, ok: true, async json() { return { data }; } };
  };
  const resultado = await sincronizarPncp(db, { cnpj: "76970318000167", anos: [2026], fetchImpl });
  assert.equal(resultado.status, "parcial");
  assert.equal(resultado.recebidos, 17);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM pncp_registros").get().total, 17);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM pncp_registros WHERE tipo = 'pca'").get().total, 2);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM pncp_registros WHERE cnpj_orgao != '76970318000167'").get().total, 0);
  assert.ok(urls.filter((url) => url.includes("/api/consulta/")).every((url) => url.includes("tamanhoPagina=50")));
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM pncp_sincronizacoes WHERE status = 'parcial'").get().total, 1);
});
