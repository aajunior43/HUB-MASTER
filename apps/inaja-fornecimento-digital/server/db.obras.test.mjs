import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { migrate } from "./db.mjs";

describe("TCE-PR Obras — tabelas e consultas", () => {
  let db;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    migrate(db);
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES ('u-admin', 'admin', 1, 1)").run();
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES ('u-comum', 'servidor', 0, 1)").run();
    db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, 'u-comum', 'obras')").run(randomUUID());
  });

  it("insere e consulta obras municipais com acompanhamentos", () => {
    const obraId = randomUUID();
    db.prepare(`
      INSERT INTO tcepr_obras (
        id, chave_externa, id_intervencao, orgao_nome, codigo_ibge, municipio, ano,
        tipo_intervencao, nome_intervencao, tipo_obra, objeto, valor, data_inicio,
        prazo_execucao, regime, situacao, percentual_fisico, ultimo_acompanhamento, observacao_ultimo_acompanhamento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      obraId, "chave-tce-01", "INT-2026-01", "Prefeitura Municipal de Inajá", "4110300", "Inajá", 2026,
      "Construção", "Construção de Creche Municipal", "Edificação Educacional", "Construção de nova unidade escolar",
      1500000.50, "2026-01-15", 360, "Empreitada por Preço Global", "Em andamento", 45.2, "2026-02-28", "Fundações finalizadas"
    );

    const obra = db.prepare("SELECT * FROM tcepr_obras WHERE id = ?").get(obraId);
    assert.ok(obra);
    assert.equal(obra.nome_intervencao, "Construção de Creche Municipal");
    assert.equal(obra.valor, 1500000.50);
    assert.equal(obra.percentual_fisico, 45.2);

    const acompId = randomUUID();
    db.prepare(`
      INSERT INTO tcepr_obras_acompanhamentos (
        id, obra_id, chave_externa, id_intervencao, origem, numero, data, tipo,
        responsavel, tipo_documento_responsavel, documento_responsavel, observacao,
        tipo_medicao, percentual_fisico, motivo_paralisacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      acompId, obraId, "chave-acomp-01", "INT-2026-01", "Fiscalização", "01/2026", "2026-02-28", "Medição",
      "Engenheiro Responsável", "CREA", "98765", "Medição mensal de fundações", "Física", 45.2, null
    );

    const acomp = db.prepare("SELECT * FROM tcepr_obras_acompanhamentos WHERE obra_id = ?").get(obraId);
    assert.ok(acomp);
    assert.equal(acomp.tipo, "Medição");
    assert.equal(acomp.percentual_fisico, 45.2);

    const resumo = db.prepare(`
      SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor,
             SUM(CASE WHEN situacao = 'Paralisada' THEN 1 ELSE 0 END) AS paralisadas,
             SUM(CASE WHEN situacao = 'Sem acompanhamento' THEN 1 ELSE 0 END) AS sem_acompanhamento
      FROM tcepr_obras
    `).get();

    assert.equal(resumo.total, 1);
    assert.equal(resumo.valor, 1500000.50);
    assert.equal(resumo.paralisadas, 0);
    assert.equal(resumo.sem_acompanhamento, 0);
  });
});
