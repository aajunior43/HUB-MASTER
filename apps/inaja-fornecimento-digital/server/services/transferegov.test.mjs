import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../db.mjs";
import { sincronizarTransferegov } from "./transferegov.mjs";

test("sincroniza transferências e impede registros de outro CNPJ", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const cnpj = "76970318000167";
  const fetchImpl = async (url) => {
    const endereco = String(url);
    let data = [];
    if (endereco.includes("/beneficiarios_especiais?")) data = [{ id_beneficiario: 1, cnpj_beneficiario: cnpj }];
    else if (endereco.includes("/planos_acao_especiais?")) data = [{ id_plano_acao: 10, codigo_plano_acao: "ESP-10", ano_plano_acao: 2026, valor_investimento_plano_acao: 100, id_agencia_conta: "1-2" }];
    else if (endereco.includes("/empenhos_especiais?")) data = [{ id_empenho: 11, id_plano_acao: 10, valor_empenho: 100 }];
    else if (endereco.includes("/gestao_financeira_lancamentos_especiais?")) data = [{ id_lancamento_gestao_financeira: 12, cnpj_ente_solicitante_gestao_financeira: cnpj, id_agencia_conta: "1-2", valor_gestao_financeira: 100, tipo_operacao_gestao_financeira: "C" }, { id_lancamento_gestao_financeira: 13, cnpj_ente_solicitante_gestao_financeira: "00000000000000", valor_gestao_financeira: 999 }];
    else if (endereco.includes("/parcerias/proposta?")) data = [{ id_proposta: 20, cnpj_ente_recebedor: cnpj, ano_proposta: 2026, nr_vlr_total: 200 }];
    else if (endereco.includes("/parcerias/parceria?")) data = [{ id_parceria: 21, id_proposta: 20, cd_parceria: "PAR-21" }];
    else if (endereco.includes("/empenho-parceria?")) data = [{ id_empenho_parceria: 22, id_parceria: 21, valor_empenho: 200 }];
    else if (endereco.includes("/fundoafundo/planos-acao?")) data = [{ id_plano_acao: 30, codigo_plano_acao: "FAF-30", cnpj_ente_recebedor_plano_acao: cnpj, valor_total_plano_acao: 300 }];
    else if (endereco.includes("/fundoafundo/empenhos?")) data = [{ id_empenho: 31, id_plano_acao: 30, valor_empenho: 300 }];
    else if (endereco.includes("/fundoafundo/gestao-financeira-lancamentos?")) data = [{ id_lancamento_gestao_financeira: 32, cnpj_ente_solicitante_gestao_financeira: cnpj, valor_lancamento_gestao_financeira: 300, descricao_tipo_operacao_gestao_financeira: "Crédito" }];
    return { ok: true, status: 200, async json() { return { data, total_pages: data.length ? 1 : 0 }; } };
  };
  const resultado = await sincronizarTransferegov(db, { cnpj, fetchImpl });
  assert.equal(resultado.status, "concluido");
  assert.deepEqual(resultado.totais, { instrumentos: 3, movimentacoes: 5 });
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tgov_instrumentos WHERE cnpj_beneficiario=?").get(cnpj).total, 3);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tgov_movimentacoes").get().total, 5);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tgov_movimentacoes WHERE instrumento_id IS NOT NULL").get().total, 4);
});

test("impede duas sincronizações simultâneas", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const cnpj = "76970318000167";
  let liberar;
  let avisarInicio;
  const bloqueio = new Promise((resolve) => { liberar = resolve; });
  const iniciouRequisicao = new Promise((resolve) => { avisarInicio = resolve; });
  let primeiraRequisicao = true;
  const fetchImpl = async () => {
    if (primeiraRequisicao) {
      primeiraRequisicao = false;
      avisarInicio();
    }
    await bloqueio;
    return { ok: true, status: 200, async json() { return { data: [], total_pages: 0 }; } };
  };

  const primeira = sincronizarTransferegov(db, { cnpj, fetchImpl });
  await iniciouRequisicao;
  await assert.rejects(() => sincronizarTransferegov(db, { cnpj, fetchImpl }), /Transferegov/);
  liberar();
  const resultado = await primeira;

  assert.equal(resultado.status, "concluido");
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tgov_sincronizacoes").get().total, 1);
  db.close();
});
