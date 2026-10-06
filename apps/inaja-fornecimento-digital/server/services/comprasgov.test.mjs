import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buscarCatalogoComprasGov, consultarPrecosComprasGov, limparCacheComprasGov } from "./comprasgov.mjs";

function respostaJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

describe("serviço Compras.gov.br/SIASG", () => {
  it("consulta o catálogo CATMAT e normaliza a classificação", async () => {
    limparCacheComprasGov();
    const chamadas = [];
    const dados = await buscarCatalogoComprasGov({ tipo: "material", busca: "papel" }, {
      useCache: false,
      fetchImpl: async (url) => {
        chamadas.push(String(url));
        return respostaJson({ resultado: { itens: [{ codigoItem: 244072, descricaoItem: "Papel sulfite A4", nomeGrupo: "Papelaria", nomeClasse: "Papel", statusItem: "ATIVO", codigo_ncm: "48025610" }], totalRegistros: 1, totalPaginas: 1 } });
      },
    });
    assert.match(chamadas[0], /descricaoItem=papel/);
    assert.equal(dados.itens[0].codigo, "244072");
    assert.equal(dados.itens[0].grupo, "Papelaria");
    assert.equal(dados.itens[0].ncm, "48025610");
  });

  it("consulta preços, aplica filtros federais e calcula a estatística da amostra", async () => {
    limparCacheComprasGov();
    let chamada = "";
    const dados = await consultarPrecosComprasGov({ tipo: "material", codigo: "244072", estado: "pr", codigoUasg: "160001", codigoMunicipio: "4110300" }, {
      useCache: false,
      fetchImpl: async (url) => {
        chamada = String(url);
        return respostaJson({ resultado: {
          itens: [
            { idCompra: "1", precoUnitario: "10,00", nomeFornecedor: "Fornecedor A", nomeUasg: "UASG A", estado: "PR", dataResultado: "2026-01-10" },
            { idCompra: "2", precoUnitario: "20,00", nomeFornecedor: "Fornecedor B", nomeUasg: "UASG B", estado: "PR", dataResultado: "2026-02-10" },
            { idCompra: "3", precoUnitario: "30,00", nomeFornecedor: "Fornecedor C", nomeUasg: "UASG C", estado: "PR", dataResultado: "2026-03-10" },
          ],
          totalRegistros: 3,
          totalPaginas: 1,
        } });
      },
    });
    assert.match(chamada, /tipo=codigoItemCatalogo/);
    assert.match(chamada, /codigo=244072/);
    assert.match(chamada, /codigoUasg=160001/);
    assert.match(chamada, /estado=PR/);
    assert.match(chamada, /codigoMunicipio=4110300/);
    assert.equal(dados.resumo.minimo, 10);
    assert.equal(dados.resumo.mediana, 20);
    assert.equal(dados.resumo.media, 20);
    assert.equal(dados.resumo.maximo, 30);
    assert.equal(dados.rows[1].precoUnitario, 20);
  });

  it("exige código para a consulta CATSER", async () => {
    await assert.rejects(() => buscarCatalogoComprasGov({ tipo: "servico", busca: "limpeza" }), { code: "BAD_REQUEST" });
    await assert.rejects(() => consultarPrecosComprasGov({ tipo: "material", codigo: "abc" }), { code: "BAD_REQUEST" });
  });
});
