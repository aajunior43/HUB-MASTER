import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { runRpc, migrate, seedDatabase } from "./db.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run(randomUUID(), "comum");
  const adminId = randomUUID();
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run(adminId, "admin");
  db.prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?)").run("api_openrouter_key", "sk-test");
  return db;
}

const UMA_LINHA = [
  { idEntidade:"1", nomeEntidade:"PM Inajá", idEmpenho:"EMP001", numeroEmpenho:"20260001", anoEmpenho:2026,
    tipoEmpenho:"Ordinário", numProcesso:"2026.0001", anoProcesso:"2026", modalidade:"Dispensa", licitacao:"DL001",
    especificacao:"Serviço de limpeza", data:"2026-01-15", valorEmpenhadoBruto:"10.000,00", valorEmpenhadoAnulado:"0",
    valorLiquidadoBruto:"8.000,00", valorLiquidadoAnulado:"0", valorBaixadoBruto:"7.000,00", valorBaixadoAnulado:"0",
    valorRetidoBruto:"500,00", valorRetidoAnulado:"0", valorPagoRestosPagarProcessados:"0", valorPagoRestosPagarNaoProcessados:"0",
    valorPagoAnuladoRestosPagarProcessados:"0", valorPagoAnuladoRestosPagarNaoProcessados:"0",
    idCredor:"C001", nomeCredor:"Empresa Limpeza Ltda", numContaCredor:"", digContaCredor:"",
    numDespesa:"3.3.90.39", numPrograma:"0001", numAcao:"2.001", numFuncao:"04", numSubfuncao:"122",
    numNaturezaEmp:"", numRecurso:"1500", numNaturezaDesp:"3.3.90.39.99", saldoBaixado:"1.000,00",
    saldoAnulado:"0", saldoLiquidar:"2.000,00", saldoPagar:"3.000,00" }
];

describe("config_* — autorização admin", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("config_listar recusa sem caller", async () => {
    const r = await runRpc(db, "config_listar", {});
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("config_listar recusa não-admin", async () => {
    const r = await runRpc(db, "config_listar", { _caller: "comum" });
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("config_listar aceita admin", async () => {
    const r = await runRpc(db, "config_listar", { _caller: "admin" });
    assert.equal(r.error, null);
    assert.ok(Array.isArray(r.data));
  });

  it("config_set e config_get exigem admin", async () => {
    const denied = await runRpc(db, "config_set", { _chave: "x", _valor: "1" });
    assert.equal(denied.error.code, "FORBIDDEN");
    const setOk = await runRpc(db, "config_set", { _caller: "admin", _chave: "api_openrouter_key", _valor: "sk-new" });
    assert.equal(setOk.error, null);
    const getDenied = await runRpc(db, "config_get", { _chave: "api_openrouter_key" });
    assert.equal(getDenied.error.code, "FORBIDDEN");
    const getOk = await runRpc(db, "config_get", { _caller: "admin", _chave: "api_openrouter_key" });
    assert.equal(getOk.error, null);
    assert.equal(getOk.data, "sk-new");
  });
});

describe("backup_senha_* — segredo somente de escrita", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("admin configura a senha sem que as RPCs genéricas a revelem", async () => {
    const senha = randomUUID();
    const set = await runRpc(db, "backup_senha_definir", { _caller: "admin", _senha: senha });
    assert.equal(set.error, null);
    assert.deepEqual(set.data, { ok: true });

    const status = await runRpc(db, "backup_senha_status", { _caller: "admin" });
    assert.deepEqual(status, { data: { configurada: true }, error: null });

    const get = await runRpc(db, "config_get", { _caller: "admin", _chave: "backup_telegram_senha" });
    assert.equal(get.error.code, "SECRET_UNAVAILABLE");

    const genericSet = await runRpc(db, "config_set", { _caller: "admin", _chave: "backup_telegram_senha", _valor: randomUUID() });
    assert.equal(genericSet.error.code, "SECRET_UNAVAILABLE");

    const listar = await runRpc(db, "config_listar", { _caller: "admin" });
    assert.equal(listar.error, null);
    assert.ok(!listar.data.some((config) => config.chave === "backup_telegram_senha"));
  });

  it("recusa acesso não administrativo e entrada de senha inválida", async () => {
    const unauthorizedStatus = await runRpc(db, "backup_senha_status", { _caller: "comum" });
    assert.equal(unauthorizedStatus.error.code, "FORBIDDEN");

    const unauthorizedSet = await runRpc(db, "backup_senha_definir", { _caller: "comum", _senha: randomUUID() });
    assert.equal(unauthorizedSet.error.code, "FORBIDDEN");

    const malformed = await runRpc(db, "backup_senha_definir", { _caller: "admin", _senha: "" });
    assert.equal(malformed.error.code, "BAD_REQUEST");
  });
});

describe("contas sem senha inicial", () => {
  it("seed preserva usuários, administração e módulos sem criar senhas", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    migrate(db);
    seedDatabase(db);

    const users = db.prepare("SELECT username, is_admin, senha_hash FROM usuarios ORDER BY username").all()
      .map((user) => ({ username: user.username, is_admin: user.is_admin, senha_hash: user.senha_hash }));
    assert.deepEqual(users, [
      { username: "aleksandro", is_admin: 1, senha_hash: null },
      { username: "cleison", is_admin: 0, senha_hash: null },
      { username: "luana", is_admin: 0, senha_hash: null },
      { username: "maicon", is_admin: 0, senha_hash: null },
    ]);
    const moduleCounts = db.prepare(`SELECT u.username, COUNT(um.id) AS total
      FROM usuarios u LEFT JOIN usuario_modulos um ON um.usuario_id = u.id
      GROUP BY u.id ORDER BY u.username`).all()
      .map((row) => ({ username: row.username, total: row.total }));
    assert.deepEqual(moduleCounts, [
      { username: "aleksandro", total: 21 },
      { username: "cleison", total: 0 },
      { username: "luana", total: 0 },
      { username: "maicon", total: 0 },
    ]);

    const aleksandro = db.prepare("SELECT id FROM usuarios WHERE username = 'aleksandro'").get();
    db.prepare("DELETE FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = 'tarefas'").run(aleksandro.id);
    seedDatabase(db);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS total FROM usuario_modulos WHERE usuario_id = ?").get(aleksandro.id).total,
      20,
    );
    db.prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?)").run("modulos_manutencao", JSON.stringify(["tarefas"]));
    return runRpc(db, "usuario_modulos_disponiveis", { _username: "maicon" }).then((result) => {
      assert.deepEqual(result.data[0].modulos_manutencao, ["tarefas"]);
    }).then(() => runRpc(db, "usuario_login", { _username: "aleksandro", _senha: "qualquer" }))
      .then((result) => assert.deepEqual(result, {
        data: { ok: false, bloqueado: false, bloqueadoPor: 0, tentativasRestantes: 5, precisa_criar: true },
        error: null,
      }));
  });
});

describe("empenhos_importar — autorização", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("recusa chamada sem caller", async () => {
    const r = await runRpc(db, "empenhos_importar", { _dados: [], _modo: "substituir", _finalizar: true });
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("recusa chamada de usuário não-admin", async () => {
    const r = await runRpc(db, "empenhos_importar", { _caller: "comum", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("recusa chamada de usuário inexistente", async () => {
    const r = await runRpc(db, "empenhos_importar", { _caller: "ghost", _dados: UMA_LINHA });
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("aceita chamada de admin ativo (modo substituir, 1 chunk)", async () => {
    const r = await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    assert.equal(r.error, null);
    assert.equal(r.data.inseridos, 1);
    assert.equal(r.data.finalizado, true);
  });
});

describe("empenhos_importar — atomicidade (modo substituir)", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("preserva tabela original se staging não existir (continuar sem criar)", async () => {
    const r = await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: [], _modo: "substituir", _finalizar: true });
    assert.equal(r.error, null);
    assert.equal(r.data.inseridos, 0);
    assert.equal(r.data.finalizado, true);
  });

  it("não deixa staging órfã após erro no finalizar", async () => {
    const r = await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    assert.equal(r.error, null);
    assert.equal(r.data.inseridos, 1);
  });
});

describe("empenhos_importar — modo append", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("insere via INSERT OR REPLACE por id composto", async () => {
    const r = await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "append" });
    assert.equal(r.error, null);
    assert.equal(r.data.inseridos, 1);
  });
});

describe("empenhos_importar — parseBR robustez", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("rejeita notação científica tratando como 0", async () => {
    const linha = { ...UMA_LINHA[0], valorEmpenhadoBruto: "1e5" };
    const r = await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: [linha], _modo: "substituir", _finalizar: true });
    assert.equal(r.error, null);
    const stats = await runRpc(db, "empenhos_stats", { _caller: "admin" });
    assert.equal(stats.data.totais.total_empenhado, 0);
  });

  it("rejeita valores negativos tratando como 0", async () => {
    const linha = { ...UMA_LINHA[0], valorEmpenhadoBruto: "-500" };
    const r = await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: [linha], _modo: "substituir", _finalizar: true });
    assert.equal(r.error, null);
    const stats = await runRpc(db, "empenhos_stats", { _caller: "admin" });
    assert.equal(stats.data.totais.total_empenhado, 0);
  });
});

describe("empenhos_limpar — autorização", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("recusa não-admin", async () => {
    const r = await runRpc(db, "empenhos_limpar", { _caller: "comum" });
    assert.equal(r.error.code, "FORBIDDEN");
  });

  it("limpa tabela quando chamado por admin", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_limpar", { _caller: "admin" });
    assert.equal(r.error, null);
    const stats = await runRpc(db, "empenhos_stats", { _caller: "admin" });
    assert.equal(stats.data.totais.total_registros, 0);
  });
});

describe("empenhos_stats", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("retorna totais zero em banco vazio", async () => {
    const r = await runRpc(db, "empenhos_stats", { _caller: "admin" });
    assert.equal(r.data.totais.total_registros, 0);
  });

  it("agrega corretamente após importação", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_stats", { _caller: "admin" });
    assert.equal(r.data.totais.total_registros, 1);
    assert.equal(r.data.totais.total_empenhado, 10000);
  });
});

describe("empenhos_listar", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("pagina corretamente e respeita por_pagina", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_listar", { _caller: "admin", _pagina: 1, _por_pagina: 10 });
    assert.equal(r.data.total, 1);
    assert.equal(r.data.rows.length, 1);
  });

  it("filtra por modalidade usando índice", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_listar", { _caller: "admin", _modalidade: "Dispensa" });
    assert.equal(r.data.total, 1);
    const r2 = await runRpc(db, "empenhos_listar", { _caller: "admin", _modalidade: "Inexistente" });
    assert.equal(r2.data.total, 0);
  });

  it("filtra por status de pagamento", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_listar", { _caller: "admin", _status: "pendente" });
    assert.equal(r.data.total, 1);
  });
});

describe("empenhos_get", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("retorna 404 para id inexistente", async () => {
    const r = await runRpc(db, "empenhos_get", { _caller: "admin", _id: "nao_existe" });
    assert.equal(r.error.code, "NOT_FOUND");
  });

  it("retorna linha por id composto", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const list = await runRpc(db, "empenhos_listar", { _caller: "admin", _por_pagina: 1 });
    const r = await runRpc(db, "empenhos_get", { _caller: "admin", _id: list.data.rows[0].id });
    assert.equal(r.error, null);
    assert.equal(r.data.numero_empenho, "20260001");
  });
});

describe("empenhos_filtros_disponiveis", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("retorna todas as 8 chaves esperadas", async () => {
    const r = await runRpc(db, "empenhos_filtros_disponiveis", { _caller: "admin" });
    const keys = ["modalidades", "naturezas", "anos", "tipos", "recursos", "programas", "acoes", "despesas"];
    for (const k of keys) assert.ok(k in r.data, `${k} ausente`);
  });

  it("lista modalidades distintas após importação", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_filtros_disponiveis", { _caller: "admin" });
    assert.equal(r.data.modalidades.length, 1);
    assert.equal(r.data.modalidades[0], "Dispensa");
  });

  it("entrega ordem desc para anos", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const r = await runRpc(db, "empenhos_filtros_disponiveis", { _caller: "admin" });
    assert.equal(r.data.anos.length, 1);
    assert.equal(r.data.anos[0], 2026);
  });
});

describe("índices — plano de query", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("EXPLAIN QUERY PLAN em filtro por modalidade usa idx_emp_mod", async () => {
    await runRpc(db, "empenhos_importar", { _caller: "admin", _dados: UMA_LINHA, _modo: "substituir", _finalizar: true });
    const plan = db.prepare("EXPLAIN QUERY PLAN SELECT COUNT(*) AS c FROM empenhos_orcamentarios WHERE modalidade = 'Dispensa'").all();
    const text = JSON.stringify(plan);
    assert.ok(text.includes("idx_emp_mod"), `Índice idx_emp_mod não usado. Plan: ${text}`);
  });
});
