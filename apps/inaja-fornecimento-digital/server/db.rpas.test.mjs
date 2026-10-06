import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrate, runRpc } from "./db.mjs";

describe("RPAs — cálculo e validação", () => {
  let db;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    migrate(db);
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES ('rpa-user', 'rpauser', 1, 1)").run();
  });

  it("calcula os argumentos usados pela tela e aplica a tabela de 2026", async () => {
    const isento = await runRpc(db, "rpas_calcular", {
      _caller: "rpauser", _valor_bruto: 5000, _num_dependentes: 0,
      _pensao_alimenticia: 0, _inss: 0, _iss: 0, _data_emissao: "2026-08-12",
    });
    assert.equal(isento.error, null);
    assert.equal(isento.data.irrf, 0);
    assert.equal(isento.data.valor_liquido, 5000);

    const parcial = await runRpc(db, "rpas_calcular", {
      _caller: "rpauser", _valor_bruto: 6000, _num_dependentes: 0,
      _pensao_alimenticia: 0, _inss: 0, _iss: 0, _data_emissao: "2026-08-12",
    });
    assert.equal(parcial.error, null);
    assert.ok(Math.abs(parcial.data.irrf - 394.54) < 0.01);
  });

  it("salva e atualiza os campos sem prefixo enviados pelo formulário", async () => {
    const criado = await runRpc(db, "rpas_criar", {
      _caller: "rpauser", nome_prestador: "Prestador", valor_bruto: 3000,
      num_dependentes: 0, pensao_alimenticia: 0, inss: 100, iss: 50,
      data_emissao: "2026-08-12", numero_rpa: "001/2026",
    });
    assert.equal(criado.error, null);
    let row = db.prepare("SELECT * FROM rpas WHERE id = ?").get(criado.data.id);
    assert.equal(row.nome_prestador, "Prestador");
    assert.equal(row.valor_bruto, 3000);

    const atualizado = await runRpc(db, "rpas_atualizar", {
      _caller: "rpauser", _id: criado.data.id, nome_prestador: "Prestador Atualizado",
      valor_bruto: 4000, num_dependentes: 0, pensao_alimenticia: 0, inss: 0, iss: 0,
    });
    assert.equal(atualizado.error, null);
    row = db.prepare("SELECT * FROM rpas WHERE id = ?").get(criado.data.id);
    assert.equal(row.nome_prestador, "Prestador Atualizado");
    assert.equal(row.valor_bruto, 4000);
  });

  it("rejeita valores negativos e dependentes fracionários", async () => {
    assert.equal((await runRpc(db, "rpas_calcular", {
      _caller: "rpauser", _valor_bruto: -1, _num_dependentes: 0,
      _pensao_alimenticia: 0, _inss: 0, _iss: 0,
    })).error?.code, "BAD_REQUEST");
    assert.equal((await runRpc(db, "rpas_calcular", {
      _caller: "rpauser", _valor_bruto: 1000, _num_dependentes: 1.5,
      _pensao_alimenticia: 0, _inss: 0, _iss: 0,
    })).error?.code, "BAD_REQUEST");
  });
});
