import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consultarCnes, listarTiposCnes, limparCacheSaude, normalizarCodigoMunicipio } from "./saude.mjs";

function respostaJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

const estabelecimento = {
  codigo_cnes: 2754304,
  numero_cnpj_entidade: "76970318000167",
  nome_razao_social: "PM DE INAJA",
  nome_fantasia: "UNIDADE DE ATENCAO PRIMARIA E SAUDE FAMILIA GILBERTO DUTRA",
  descricao_esfera_administrativa: "MUNICIPAL",
  codigo_tipo_unidade: 2,
  codigo_cep_estabelecimento: "87670215",
  endereco_estabelecimento: "RUA SAO TOME",
  numero_estabelecimento: "181",
  bairro_estabelecimento: "CENTRO",
  codigo_municipio: 411030,
  codigo_uf: 41,
  estabelecimento_faz_atendimento_ambulatorial_sus: "SIM",
  estabelecimento_possui_atendimento_ambulatorial: 1,
  estabelecimento_possui_atendimento_hospitalar: 0,
  codigo_motivo_desabilitacao_estabelecimento: null,
  data_atualizacao: "2026-06-09",
};

describe("serviço CNES/DATASUS", () => {
  it("normaliza código municipal de sete dígitos, filtros e capacidades", async () => {
    limparCacheSaude();
    const chamadas = [];
    const fetchMock = async (url) => {
      chamadas.push(String(url));
      if (String(url).includes("tipounidades")) return respostaJson({ tipos_unidade: [{ codigo_tipo_unidade: 2, descricao_tipo_unidade: "CENTRO DE SAUDE/UNIDADE BASICA" }] });
      return respostaJson({ estabelecimentos: [estabelecimento] });
    };

    assert.equal(normalizarCodigoMunicipio("4110300"), "411030");
    const resultado = await consultarCnes({ codigoMunicipio: "4110300", codigoTipoUnidade: "2", status: "ativo", limite: 20 }, { fetchImpl: fetchMock, useCache: false });
    assert.equal(resultado.filtros.codigoMunicipio, "411030");
    assert.equal(resultado.registros[0].codigoCnes, "2754304");
    assert.equal(resultado.registros[0].cnpjEntidade, "76970318000167");
    assert.equal(resultado.registros[0].ativo, true);
    assert.equal(resultado.registros[0].capacidades.atendimentoAmbulatorial, true);
    assert.match(chamadas[0], /codigo_municipio=411030/);
    assert.match(chamadas[0], /codigo_tipo_unidade=2/);
    assert.match(chamadas[0], /status=1/);

    const tipos = await listarTiposCnes({ fetchImpl: fetchMock, useCache: false });
    assert.deepEqual(tipos.tipos, [{ codigo: 2, descricao: "CENTRO DE SAUDE/UNIDADE BASICA" }]);
  });

  it("consulta detalhe por CNES e deduplica requisições em cache", async () => {
    limparCacheSaude();
    let chamadas = 0;
    const fetchMock = async () => {
      chamadas += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return respostaJson(estabelecimento);
    };
    const [primeiro, segundo] = await Promise.all([
      consultarCnes({ cnes: "2754304" }, { fetchImpl: fetchMock }),
      consultarCnes({ cnes: "2754304" }, { fetchImpl: fetchMock }),
    ]);
    assert.equal(chamadas, 1);
    assert.equal(primeiro.modo, "detalhe");
    assert.equal(segundo.registro?.nomeFantasia, estabelecimento.nome_fantasia);
    const doCache = await consultarCnes({ cnes: "2754304" }, { fetchImpl: fetchMock });
    assert.equal(doCache.emCache, true);
  });

  it("rejeita consulta sem abrangência e propaga CNES inexistente", async () => {
    await assert.rejects(() => consultarCnes({}, { fetchImpl: async () => respostaJson({}) }), { code: "BAD_REQUEST" });
    await assert.rejects(() => consultarCnes({ codigoMunicipio: "411" }, { fetchImpl: async () => respostaJson({}) }), { code: "BAD_REQUEST" });
    await assert.rejects(() => consultarCnes({ cnes: "9999999" }, { fetchImpl: async () => respostaJson({ message: "not found" }, 404), useCache: false }), { code: "NOT_FOUND", statusCode: 404 });
  });
});
