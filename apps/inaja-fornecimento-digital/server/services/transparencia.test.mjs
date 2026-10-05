import assert from "node:assert/strict";
import { test } from "node:test";
import { consultarTransparenciaCnpj, limparCacheTransparencia } from "./transparencia.mjs";

const CNPJ = "51241038000197";

function resposta(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data, text: async () => "" };
}

test("consulta TCU, CEIS, CNEP e contratos e consolida o risco do fornecedor", async () => {
  limparCacheTransparencia();
  const chamadas = [];
  const fetchImpl = async (url, options = {}) => {
    chamadas.push({ url: String(url), options });
    if (String(url).includes("certidoes-apf")) return resposta({ razaoSocial: "Empresa Teste", certidoes: [{ emissor: "TCU", tipo: "Inidôneos", situacao: "NADA_CONSTA" }] });
    if (String(url).includes("responsaveis-inidoneos")) return resposta([{ nome: "Empresa Teste", numeroRegistro: CNPJ, numeroProcessoFormatado: "001/2026", dataFinalSancao: "31/12/2026" }]);
    if (String(url).includes("/ceis?")) return resposta([{ id: 1, codigoSancionado: CNPJ, nomeSancionado: "Empresa Teste", tipoSancao: { descricaoResumida: "Suspensão" }, dataInicioSancao: "01/01/2026" }]);
    if (String(url).includes("/cnep?")) return resposta([]);
    if (String(url).includes("contratos/cpf-cnpj")) return resposta([{ idContrato: 7, numeroContrato: "7/2026", objeto: "Serviço", valorGlobal: 1234.5 }]);
    throw new Error(`URL inesperada: ${url}`);
  };

  const result = await consultarTransparenciaCnpj(CNPJ, { apiKey: "token-teste", fetchImpl });
  assert.equal(result.tcu.disponivel, true);
  assert.equal(result.tcu.inidoneos.length, 1);
  assert.equal(result.portal.configurado, true);
  assert.equal(result.portal.ceis.length, 1);
  assert.equal(result.portal.contratos[0].valor, 1234.5);
  assert.equal(result.resumo.status, "alerta");
  assert.equal(chamadas.length, 5);
  assert.equal(chamadas.filter((item) => item.options.headers?.["chave-api-dados"]).length, 3);
});

test("funciona somente com TCU sem chave do Portal e reutiliza cache curto", async () => {
  limparCacheTransparencia();
  let chamadas = 0;
  const fetchImpl = async (url) => {
    chamadas += 1;
    if (String(url).includes("certidoes-apf")) return resposta({ certidoes: [{ emissor: "TCU", situacao: "NADA_CONSTA" }] });
    return resposta([]);
  };
  const primeiro = await consultarTransparenciaCnpj(CNPJ, { fetchImpl });
  const segundo = await consultarTransparenciaCnpj(CNPJ, { fetchImpl });
  assert.equal(primeiro.portal.configurado, false);
  assert.equal(primeiro.resumo.status, "parcial");
  assert.equal(segundo.cache, true);
  assert.equal(chamadas, 2);
});

test("recusa CNPJ inválido antes de acessar fonte externa", async () => {
  await assert.rejects(() => consultarTransparenciaCnpj("12345678000100", { fetchImpl: async () => resposta([]) }), /CNPJ inválido/);
});
