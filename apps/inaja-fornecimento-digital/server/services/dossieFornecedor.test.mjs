import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { migrate } from "../db.mjs";
import { limparCacheTransparencia } from "./transparencia.mjs";
import { obterDossieFornecedor } from "./dossieFornecedor.mjs";

const CNPJ = "51241038000197";

function resposta(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data, text: async () => "" };
}

test("obterDossieFornecedor consolida dados de Transparência, PNCP e Empenhos municipais", async () => {
  limparCacheTransparencia();
  const db = new DatabaseSync(":memory:");
  migrate(db);

  db.prepare(`
    INSERT INTO pncp_registros (id, tipo, chave_pncp, cnpj_orgao, titulo, objeto, numero, ano, fornecedor_nome, fornecedor_cnpj, valor, data_publicacao)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), "contratacao", "chave-1", "76970318000167", "Pregão 10", "Aquisição de computadores", "10", 2025, "Fornecedor Teste Ltda", CNPJ, 50000, "2025-01-15");

  db.prepare(`
    INSERT INTO credores_fixos (id, nome, documento, departamento, valor_mensal, tipo_valor, descricao)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("cred-1", "Fornecedor Teste Ltda", "51.241.038/0001-97", "Educação", 2500, "FIXO", "Manutenção preventiva");

  db.prepare(`
    INSERT INTO empenhos_orcamentarios (
      id, numero_empenho, ano_empenho, id_credor, nome_credor,
      valor_empenhado_bruto, valor_empenhado_anulado,
      valor_liquidado_bruto, valor_liquidado_anulado,
      saldo_pagar, data, especificacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "emp-1", "100", 2025, CNPJ, "Fornecedor Teste Ltda",
    10000, 0, 8000, 0, 2000, "2025-02-01", "Serviços prestados"
  );

  const fetchImpl = async (url) => {
    if (String(url).includes("certidoes-apf")) {
      return resposta({ razaoSocial: "Fornecedor Teste Ltda", certidoes: [{ emissor: "TCU", tipo: "Inidôneos", situacao: "NADA_CONSTA" }] });
    }
    if (String(url).includes("responsaveis-inidoneos")) {
      return resposta([]);
    }
    return resposta([]);
  };

  const dossie = await obterDossieFornecedor(db, CNPJ, { apiKey: "", fetchImpl, semCache: true });

  assert.equal(dossie.cnpj, CNPJ);
  assert.equal(dossie.diagnostico.apto, true);
  assert.equal(dossie.pncp.total, 1);
  assert.equal(dossie.pncp.valorTotal, 50000);
  assert.equal(dossie.municipio.totalEmpenhos, 1);
  assert.equal(dossie.municipio.totalEmpenhado, 10000);
  assert.equal(dossie.municipio.totalLiquidado, 8000);
  assert.equal(dossie.municipio.credorFixo?.departamento, "Educação");
  assert.ok(dossie.linksUteisCertidoes?.cndt);
  assert.ok(dossie.linksUteisCertidoes?.fgts);

  db.close();
});

test("obterDossieFornecedor identifica inidôneo e eleva o nível de risco para ALTO", async () => {
  limparCacheTransparencia();
  const db = new DatabaseSync(":memory:");
  migrate(db);

  const fetchImpl = async (url) => {
    if (String(url).includes("certidoes-apf")) {
      return resposta({ certidoes: [] });
    }
    if (String(url).includes("responsaveis-inidoneos")) {
      return resposta([{ nome: "Empresa Sancionada", numeroRegistro: CNPJ, processo: "002/2026", dataFinalSancao: "2027-01-01" }]);
    }
    return resposta([]);
  };

  const dossie = await obterDossieFornecedor(db, CNPJ, { apiKey: "", fetchImpl, semCache: true });

  assert.equal(dossie.diagnostico.nivelRisco, "ALTO");
  assert.equal(dossie.diagnostico.apto, false);
  assert.ok(dossie.diagnostico.pontosAtencao.some(p => p.includes("Inidôneo no TCU")));

  db.close();
});
