import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularAtualizacaoBcb, consultarSerieBcb, limparCacheBcb, listarSeriesBcb } from "./bcb.mjs";

function respostaJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

describe("serviço de séries do Banco Central", () => {
  it("consulta IPCA, normaliza datas e aplica composição no cálculo", async () => {
    limparCacheBcb();
    const chamadas = [];
    const fetchMock = async (url) => {
      chamadas.push(String(url));
      return respostaJson({ value: [{ data: "01/01/2024", valor: "1,00" }, { data: "01/02/2024", valor: "2.00" }] });
    };
    const consulta = await consultarSerieBcb({ serie: "433", dataInicial: "2024-01-01", dataFinal: "2024-02-29" }, { fetchImpl: fetchMock, useCache: false });
    assert.equal(consulta.serie.id, "ipca");
    assert.equal(consulta.total, 2);
    assert.deepEqual(consulta.observacoes.map((item) => item.dataIso), ["2024-01-01", "2024-02-01"]);
    assert.match(chamadas[0], /bcdata\.sgs\.433\/dados/);
    assert.match(chamadas[0], /dataInicial=01%2F01%2F2024/);

    const calculo = await calcularAtualizacaoBcb({ valor: "1.000,00", serie: "ipca", dataInicial: "2024-01-01", dataFinal: "2024-02-29" }, { fetchImpl: fetchMock, useCache: false });
    assert.equal(calculo.observacoesAplicadas, 2);
    assert.equal(calculo.valorAtualizado, 1030.2);
    assert.equal(calculo.acrescimo, 30.2);
  });

  it("deduplica cache, lista séries e valida entradas", async () => {
    limparCacheBcb();
    let chamadas = 0;
    const fetchMock = async () => {
      chamadas += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return respostaJson({ value: [{ data: "02/01/2024", valor: "0.043739" }] });
    };
    const [primeiro, segundo] = await Promise.all([
      consultarSerieBcb({ serie: "selic", dataInicial: "2024-01-02", dataFinal: "2024-01-02" }, { fetchImpl: fetchMock }),
      consultarSerieBcb({ serie: "selic", dataInicial: "2024-01-02", dataFinal: "2024-01-02" }, { fetchImpl: fetchMock }),
    ]);
    assert.equal(chamadas, 1);
    assert.equal(primeiro.total, 1);
    assert.equal(segundo.emCache, false);
    assert.equal((await consultarSerieBcb({ serie: "selic", dataInicial: "2024-01-02", dataFinal: "2024-01-02" }, { fetchImpl: fetchMock })).emCache, true);
    assert.deepEqual(listarSeriesBcb().map((serie) => serie.id), ["ipca", "selic"]);
    await assert.rejects(() => consultarSerieBcb({ serie: "cdi", dataInicial: "2024-01-01", dataFinal: "2024-01-02" }, { fetchImpl: fetchMock }), { code: "BAD_REQUEST" });
    await assert.rejects(() => consultarSerieBcb({ serie: "ipca", dataInicial: "2024-02-01", dataFinal: "2024-01-01" }, { fetchImpl: fetchMock }), { code: "BAD_REQUEST" });
  });

  it("informa ausência de observações para cálculo", async () => {
    await assert.rejects(
      () => calcularAtualizacaoBcb({ valor: 100, serie: "ipca", dataInicial: "2024-01-01", dataFinal: "2024-01-31" }, { fetchImpl: async () => respostaJson({ value: [] }), useCache: false }),
      { code: "BCB_NO_DATA", statusCode: 422 },
    );
  });
});
