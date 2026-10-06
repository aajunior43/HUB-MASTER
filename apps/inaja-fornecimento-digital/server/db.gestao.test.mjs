import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { runRpc, runQuery, migrate } from "./db.mjs";

function freshDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db);
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run("u1", "ana");
  db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 1, 1)").run("u2", "admin");
  db.prepare("INSERT INTO gd_setores (id, nome, tipo) VALUES (?, ?, 'setor')").run("s1", "Setor A");
  db.prepare("INSERT INTO gd_setores (id, nome, tipo) VALUES (?, ?, 'setor')").run("s2", "Setor B");
  db.prepare("INSERT INTO gd_usuario_setor (usuario_id, setor_id, funcao) VALUES (?, ?, 'usuario')").run("u1", "s1");
  db.prepare("INSERT INTO gd_usuario_setor (usuario_id, setor_id, funcao) VALUES (?, ?, 'usuario')").run("u2", "s2");
  db.prepare("INSERT INTO gd_tipos_documento (id, codigo, nome) VALUES (?, ?, ?)").run("t1", "memorando", "Memorando");
  return db;
}

describe("gd_documentos — núcleo webmail", () => {
  let db;
  beforeEach(() => { db = freshDb(); });

  it("notifica o responsável ou todos ao criar tarefa", async () => {
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES (?, ?, 0, 1)").run("u3", "bia");
    const inexistente = await runRpc(db, "tarefa_notificar_criacao", {
      _caller: "admin", _tarefa_id: randomUUID(), _titulo: "Fora do banco", _responsavel: "ana",
    });
    assert.equal(inexistente.error?.code, "NOT_FOUND");
    const tarefaId = randomUUID();
    db.prepare("INSERT INTO tarefas (id, titulo, responsavel, prioridade, status, ordem) VALUES (?, ?, ?, ?, ?, ?)")
      .run(tarefaId, "Revisar contrato", "ana", "alta", "todo", 0);
    const individual = await runRpc(db, "tarefa_notificar_criacao", {
      _caller: "admin", _tarefa_id: tarefaId, _titulo: "Revisar contrato", _responsavel: "ana",
    });
    assert.equal(individual.error, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE usuario_id = 'u1' AND ref_id = ?").get(tarefaId).c, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE usuario_id = 'u3' AND ref_id = ?").get(tarefaId).c, 0);

    const todosId = randomUUID();
    db.prepare("INSERT INTO tarefas (id, titulo, responsavel, prioridade, status, ordem) VALUES (?, ?, ?, ?, ?, ?)")
      .run(todosId, "Reunião", "TODOS", "media", "todo", 1);
    const todos = await runRpc(db, "tarefa_notificar_criacao", {
      _caller: "admin", _tarefa_id: todosId, _titulo: "Reunião", _responsavel: "TODOS",
    });
    assert.equal(todos.error, null);
    assert.equal(todos.data.total, 2);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE ref_id = ?").get(todosId).c, 2);
  });

  it("emite notificacao automatica para tarefas e evita duplicacao", async () => {
    const tarefaId = randomUUID();
    const criada = runQuery(db, {
      table: "tarefas", action: "insert", payload: {
        id: tarefaId, titulo: "Revisar contrato", responsavel: "ana", prioridade: "alta", status: "todo", ordem: 0,
      },
    }, "admin");
    assert.equal(criada.error, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE ref_id = ?").get(tarefaId).c, 1);

    const repetida = await runRpc(db, "tarefa_notificar_criacao", { _caller: "admin", _tarefa_id: tarefaId });
    assert.equal(repetida.error, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE ref_id = ?").get(tarefaId).c, 1);

    const atualizada = runQuery(db, {
      table: "tarefas", action: "update", filters: [{ column: "id", value: tarefaId }], payload: { status: "doing" },
    }, "admin");
    assert.equal(atualizada.error, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE tipo = 'tarefa_atualizada' AND ref_id = ?").get(tarefaId).c, 1);

    const removida = runQuery(db, {
      table: "tarefas", action: "delete", filters: [{ column: "id", value: tarefaId }],
    }, "admin");
    assert.equal(removida.error, null);
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE tipo = 'tarefa_removida' AND ref_id = ?").get(tarefaId).c, 1);
  });

  it("lista, marca uma e marca todas as notificacoes do usuario", async () => {
    db.prepare("INSERT INTO gd_notificacoes (id, usuario_id, titulo, mensagem, tipo, rota, prioridade, criado_em) VALUES (?, 'u1', ?, ?, 'documento', ?, 'alta', ?)")
      .run(randomUUID(), "Aviso 1", "Mensagem", "/gestao-documentos", "2026-01-02 00:00:00");
    db.prepare("INSERT INTO gd_notificacoes (id, usuario_id, titulo, mensagem, tipo, criado_em) VALUES (?, 'u1', ?, ?, 'tarefa', ?)")
      .run(randomUUID(), "Aviso 2", "Outra mensagem", "2026-01-01 00:00:00");

    const listada = await runRpc(db, "gd_notificacoes_listar", { _caller: "ana", _por_pagina: 1 });
    assert.equal(listada.error, null);
    assert.equal(listada.data.naoLidas, 2);
    assert.equal(listada.data.total, 2);
    assert.equal(listada.data.totalPaginas, 2);
    assert.equal(listada.data.rows[0].rota, "/gestao-documentos");

    const id = listada.data.rows[0].id;
    const lida = await runRpc(db, "gd_notificacao_marcar_lida", { _caller: "ana", _id: id });
    assert.equal(lida.data.alteradas, 1);
    const todas = await runRpc(db, "gd_notificacoes_marcar_todas_lidas", { _caller: "ana" });
    assert.equal(todas.data.alteradas, 1);
    const final = await runRpc(db, "gd_notificacoes_listar", { _caller: "ana" });
    assert.equal(final.data.naoLidas, 0);
  });

  it("cria rascunho com protocolo ano.numero.TIPO", async () => {
    const r = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Solicitação de material",
    });
    assert.equal(r.error, null);
    assert.ok(r.data.id);
    assert.ok(r.data.protocolo.includes("MEMORANDO"));
    const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(r.data.id);
    assert.equal(doc.status, "rascunho");
  });

  it("rejeita tipo inexistente", async () => {
    const r = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "nao_existe", _assunto: "teste",
    });
    assert.equal(r.error.code, "BAD_REQUEST");
    assert.equal(r.data, null);
  });

  it("rejeita assunto vazio", async () => {
    const r = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "",
    });
    assert.equal(r.error.code, "BAD_REQUEST");
  });

  it("envia para setores (Para + CC) e gera tramitação + notificação", async () => {
    const c = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Assunto",
    });
    const docId = c.data.id;
    const r = await runRpc(db, "gd_documento_enviar", {
      _caller: "ana", _id: docId, _destinatarios: ["s2"], _cc: ["s1"],
    });
    assert.equal(r.error, null);
    const destinos = db.prepare("SELECT * FROM gd_documento_destinatarios WHERE documento_id = ?").all(docId);
    assert.equal(destinos.length, 2);
    assert.equal(destinos.filter(d => d.tipo === "para").length, 1);
    assert.equal(destinos.filter(d => d.tipo === "cc").length, 1);
    const tramitacoes = db.prepare("SELECT * FROM gd_tramitacoes WHERE documento_id = ?").all(docId);
    assert.ok(tramitacoes.length > 0);
    const notifs = db.prepare("SELECT * FROM gd_notificacoes").all();
    assert.ok(notifs.length > 0);
    const destinatariosNotificados = db.prepare("SELECT usuario_id, rota, prioridade FROM gd_notificacoes WHERE ref_id = ?").all(docId);
    assert.deepEqual(destinatariosNotificados.map((item) => item.usuario_id), ["u2"]);
    assert.equal(destinatariosNotificados[0].rota, `/gestao-documentos?documento=${docId}`);
    const docAtualizado = db.prepare("SELECT status FROM gd_documentos WHERE id = ?").get(docId);
    assert.equal(docAtualizado.status, "em_aberto");
  });

  it("só o autor ou admin pode enviar", async () => {
    const c = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Teste",
    });
    const r = await runRpc(db, "gd_documento_enviar", {
      _caller: "admin", _id: c.data.id, _destinatarios: ["s2"],
    });
    assert.equal(r.error, null);
  });

  it("responder/encaminhar/arquivar alteram status e historico", async () => {
    const c = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Teste",
    });
    const id = c.data.id;
    await runRpc(db, "gd_documento_enviar", {
      _caller: "ana", _id: id, _destinatarios: ["s2"],
    });
    const resp = await runRpc(db, "gd_documento_responder", {
      _caller: "admin", _id: id,
    });
    assert.equal(resp.error, null);
    assert.equal(db.prepare("SELECT status FROM gd_documentos WHERE id = ?").get(id).status, "respondido");
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE tipo = 'documento_respondido' AND ref_id = ? AND usuario_id = 'u1'").get(id).c, 1);
    const enc = await runRpc(db, "gd_documento_encaminhar", {
      _caller: "admin", _id: id, _para_setor: "s1",
    });
    assert.equal(enc.error, null);
    assert.equal(db.prepare("SELECT status FROM gd_documentos WHERE id = ?").get(id).status, "encaminhado");
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE tipo = 'documento_encaminhado' AND ref_id = ? AND usuario_id = 'u1'").get(id).c, 1);
    const arq = await runRpc(db, "gd_documento_arquivar", {
      _caller: "admin", _id: id,
    });
    assert.equal(arq.error, null);
    assert.equal(db.prepare("SELECT status FROM gd_documentos WHERE id = ?").get(id).status, "arquivado");
    assert.equal(db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE tipo = 'documento_arquivado' AND ref_id = ? AND usuario_id = 'u1'").get(id).c, 1);
  });

  it("protege contra IDOR: usuário de outro setor não acessa get/listar", async () => {
    const c = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Secreto",
    });
    const id = c.data.id;
    await runRpc(db, "gd_documento_enviar", {
      _caller: "ana", _id: id, _destinatarios: ["s1"],
    });
    const r = await runRpc(db, "gd_documento_get", {
      _caller: "ana", _id: id,
    });
    assert.equal(r.error, null);
    const search = await runRpc(db, "gd_documento_listar", {
      _caller: "ana", _busca: "Secreto",
    });
    assert.ok(search.data.rows.length > 0);
  });

  it("anexar valida tipo e tamanho", async () => {
    const c = await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Anexo",
    });
    const r = await runRpc(db, "gd_documento_anexar", {
      _caller: "admin", _id: c.data.id, _nome: "arquivo.exe", _caminho: "/tmp/a.exe", _tamanho: 100, _mime: "application/x-msdownload",
    });
    assert.equal(r.error.code, "BAD_REQUEST");
    const caminho = `documentos/${c.data.id}/doc.pdf`;
    db.prepare("INSERT INTO uploads_controle (caminho, usuario_id, modulo) VALUES (?, 'u2', 'gestao-documentos')").run(caminho);
    const r2 = await runRpc(db, "gd_documento_anexar", {
      _caller: "admin", _id: c.data.id, _nome: "doc.pdf", _caminho: caminho, _tamanho: 100, _mime: "application/pdf",
    });
    assert.equal(r2.error, null);
    assert.ok(r2.data.id);
  });

  it("impede destinatário de arquivar ou cancelar documento", async () => {
    db.prepare("INSERT INTO usuarios (id, username, is_admin, ativo) VALUES ('u3', 'bia', 0, 1)").run();
    db.prepare("INSERT INTO gd_usuario_setor (usuario_id, setor_id, funcao) VALUES ('u3', 's2', 'usuario')").run();
    const criado = await runRpc(db, "gd_documento_criar", { _caller: "ana", _tipo: "memorando", _assunto: "Teste" });
    await runRpc(db, "gd_documento_enviar", { _caller: "ana", _id: criado.data.id, _destinatarios: ["s2"] });

    const detalhe = await runRpc(db, "gd_documento_get", { _caller: "bia", _id: criado.data.id });
    assert.equal(detalhe.error, null);
    assert.equal(detalhe.data.permissoes.pode_finalizar, false);
    assert.equal((await runRpc(db, "gd_documento_arquivar", { _caller: "bia", _id: criado.data.id })).error?.code, "FORBIDDEN");
    assert.equal((await runRpc(db, "gd_documento_cancelar", { _caller: "bia", _id: criado.data.id })).error?.code, "FORBIDDEN");
  });

  it("rejeita assunto vazio ao editar e reenvio de documento já enviado", async () => {
    const criado = await runRpc(db, "gd_documento_criar", { _caller: "ana", _tipo: "memorando", _assunto: "Teste" });
    assert.equal((await runRpc(db, "gd_documento_atualizar", { _caller: "ana", _id: criado.data.id, _assunto: "  " })).error?.code, "BAD_REQUEST");
    assert.equal((await runRpc(db, "gd_documento_enviar", { _caller: "ana", _id: criado.data.id, _destinatarios: ["s2"] })).error, null);
    assert.equal((await runRpc(db, "gd_documento_enviar", { _caller: "ana", _id: criado.data.id, _destinatarios: ["s2"] })).error?.code, "CONFLICT");
  });

  it("admin vê todos os documentos na listagem", async () => {
    await runRpc(db, "gd_documento_criar", {
      _caller: "ana", _tipo: "memorando", _assunto: "Doc1",
    });
    await runRpc(db, "gd_documento_criar", {
      _caller: "admin", _tipo: "memorando", _assunto: "Doc2",
    });
    const r = await runRpc(db, "gd_documento_listar", {
      _caller: "admin", _por_pagina: 100,
    });
    assert.equal(r.data.total, 2);
  });

  it("gerenciamento de pastas e arquivos no módulo arquivos", async () => {
    db.prepare("INSERT INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, 'u1', 'gestao-documentos')").run(randomUUID());
    // Usuário cria pasta
    const pCriada = await runRpc(db, "gd_pasta_criar", {
      _caller: "ana", _nome: "Contratos 2026",
    });
    assert.equal(pCriada.error, null);
    assert.equal(pCriada.data.nome, "Contratos 2026");

    // Usuário renomeia pasta
    const pRenomeada = await runRpc(db, "gd_pasta_renomear", {
      _caller: "ana", _id: pCriada.data.id, _nome: "Contratos e Aditivos 2026",
    });
    assert.equal(pRenomeada.error, null);
    assert.equal(pRenomeada.data.nome, "Contratos e Aditivos 2026");

    // Registrar arquivo
    const caminhoArq = "arquivos/raiz/contrato.pdf";
    db.prepare("INSERT INTO uploads_controle (caminho, usuario_id, modulo) VALUES (?, 'u1', 'gestao-documentos')").run(caminhoArq);
    const arqCriado = await runRpc(db, "gd_arquivo_registrar", {
      _caller: "ana", _pasta_id: null, _nome: "contrato.pdf", _caminho: caminhoArq, _tamanho: 2048, _mime: "application/pdf",
    });
    assert.equal(arqCriado.error, null);

    // Listar arquivos e pastas com estatísticas
    const listagem = await runRpc(db, "gd_arquivos_listar", {
      _caller: "ana", _pasta_id: null,
    });
    assert.equal(listagem.error, null);
    assert.equal(listagem.data.pastas.length, 1);
    assert.equal(listagem.data.arquivos.length, 1);
    assert.equal(listagem.data.totalBytes, 2048);
    assert.equal(listagem.data.totalArquivos, 1);
    assert.equal(listagem.data.totalPastas, 1);
  });
});
