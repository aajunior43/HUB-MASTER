import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrate, runRpc } from "./db.mjs";
import { sincronizarTransferegov } from "./services/transferegov.mjs";
import { consultarRepassesFnde, sincronizarFnde } from "./services/fnde.mjs";
import { sincronizarBeneficiosSociais } from "./services/beneficiosSociais.mjs";
import { sincronizarPncp } from "./services/pncp.mjs";

test("Transferegov: sincronização utiliza rotas com hífen e processa dados especiais com sucesso", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);

  const urlsChamadas = [];
  const fetchMock = async (url) => {
    const endereco = String(url);
    urlsChamadas.push(endereco);

    if (endereco.includes("/especiais/beneficiarios-especiais")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: [{ id_beneficiario: "BENEF-1", cnpj_beneficiario: "76970318000167" }] };
        },
      };
    }
    if (endereco.includes("/especiais/planos-acao-especiais")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [
              {
                id_plano_acao: "PLANO-1",
                codigo_plano_acao: "PA-101",
                ano_plano_acao: 2026,
                situacao_plano_acao: "Aprovado",
                valor_custeio_plano_acao: 50000,
                valor_investimento_plano_acao: 100000,
              },
            ],
          };
        },
      };
    }
    if (endereco.includes("/especiais/empenhos-especiais")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [
              {
                id_empenho: "EMP-1",
                numero_empenho: "2026NE0001",
                data_emissao_empenho: "2026-02-15",
                valor_empenho: 50000,
              },
            ],
          };
        },
      };
    }
    if (endereco.includes("/especiais/gestao-financeira-lancamentos-especiais")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return { data: [] };
        },
      };
    }
    // Parcerias e Fundo a Fundo
    return {
      ok: true,
      status: 200,
      async json() {
        return { data: [] };
      },
    };
  };

  const resultado = await sincronizarTransferegov(db, { cnpj: "76970318000167", fetchImpl: fetchMock });
  assert.equal(resultado.status, "concluido");
  assert.ok(urlsChamadas.some((u) => u.includes("/beneficiarios-especiais")));
  assert.ok(urlsChamadas.some((u) => u.includes("/planos-acao-especiais")));
  assert.ok(urlsChamadas.some((u) => u.includes("/empenhos-especiais")));
  assert.ok(urlsChamadas.some((u) => u.includes("/gestao-financeira-lancamentos-especiais")));
  assert.ok(!urlsChamadas.some((u) => u.includes("/beneficiarios_especiais")));

  const inst = db.prepare("SELECT COUNT(*) AS total FROM tgov_instrumentos WHERE fonte = 'especial'").get().total;
  assert.equal(inst, 1);
  const mov = db.prepare("SELECT COUNT(*) AS total FROM tgov_movimentacoes WHERE fonte = 'especial'").get().total;
  assert.equal(mov, 1);
});

test("FNDE: trata resposta HTML ou 404 sem syntax error e com idempotência", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);

  // 1. Simula resposta 404
  const fetch404 = async () => ({
    ok: false,
    status: 404,
    headers: new Headers({ "content-type": "application/json" }),
  });
  await assert.rejects(
    () => consultarRepassesFnde(2026, { fetchImpl: fetch404 }),
    /temporariamente indisponível ou em manutenção \(HTTP 404\)/
  );

  // 2. Simula resposta HTML (tela de login do Olinda)
  const fetchHtml = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    async text() {
      return "<html><title>Login Page</title></html>";
    },
    async json() {
      throw new SyntaxError("Unexpected token <");
    },
  });
  await assert.rejects(
    () => consultarRepassesFnde(2026, { fetchImpl: fetchHtml }),
    /exigiu autenticação interna ou retornou página não compatível/
  );

  // 3. Sincronização idempotente: não duplica registros do mesmo ano
  let vezes = 0;
  const fetchSucesso = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    async json() {
      return {
        value: [
          {
            Nu_Ano: 2026,
            Ds_Programa: "PNAE",
            Ds_Acao: "Alimentação Escolar",
            Vl_Pago: 25000,
            Dt_Pagamento: "2026-03-01",
          },
        ],
      };
    },
  });

  const r1 = await sincronizarFnde(db, { anos: [2026], fetchImpl: fetchSucesso });
  assert.equal(r1.recebidos, 1);
  assert.equal(db.prepare("SELECT COUNT(*) as c FROM fnde_repasses").get().c, 1);

  // Segunda sincronização do mesmo ano: deve substituir e manter 1 registro (idempotência)
  const r2 = await sincronizarFnde(db, { anos: [2026], fetchImpl: fetchSucesso });
  assert.equal(r2.recebidos, 1);
  assert.equal(db.prepare("SELECT COUNT(*) as c FROM fnde_repasses").get().c, 1);
});

test("Benefícios Sociais: sincronização idempotente não duplica registros no mesmo mês/tipo", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);

  const fetchMock = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    async json() {
      return [
        {
          quantidadeBeneficiados: 850,
          valorTotal: 510000,
          municipio: { nomeIBGE: "INAJÁ", uf: { sigla: "PR" } },
        },
      ];
    },
  });

  const res1 = await sincronizarBeneficiosSociais(db, { apiKey: "teste-api-key", meses: ["202602"], fetchImpl: fetchMock });
  assert.equal(res1.status, "sucesso");
  assert.equal(db.prepare("SELECT COUNT(*) as c FROM beneficios_sociais WHERE mes_ano = '202602'").get().c, 3);

  // Segunda sincronização: deve atualizar sem duplicar
  const res2 = await sincronizarBeneficiosSociais(db, { apiKey: "teste-api-key", meses: ["202602"], fetchImpl: fetchMock });
  assert.equal(res2.status, "sucesso");
  assert.equal(db.prepare("SELECT COUNT(*) as c FROM beneficios_sociais WHERE mes_ano = '202602'").get().c, 3);
});

test("PNCP: interrompe rapidamente caso ocorram múltiplas falhas de rede consecutivas", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);

  let chamadas = 0;
  const fetchTimeout = async () => {
    chamadas += 1;
    const erro = new Error("PNCP excedeu 10 segundos sem responder");
    erro.name = "TimeoutError";
    throw erro;
  };

  const resultado = await sincronizarPncp(db, { cnpj: "76970318000167", anos: [2026], fetchImpl: fetchTimeout });
  assert.equal(resultado.status, "erro");
  assert.ok(chamadas <= 10, `Executou ${chamadas} chamadas, deveria ter interrompido logo`);
  assert.ok(resultado.erros.some((e) => e.includes("servidores do PNCP")));
});

test("CNPJ: realiza fallback automático para MinhaReceita quando BrasilAPI falha", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);

  const fetchOrig = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const end = String(url);
    if (end.includes("brasilapi.com.br")) {
      throw new Error("BrasilAPI offline");
    }
    if (end.includes("minhareceita.org")) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            razao_social: "EMPRESA DE TESTE REDUNDANCIA LTDA",
            nome_fantasia: "TESTE REDUNDANCIA",
            descricao_situacao_cadastral: "ATIVA",
            data_inicio_atividade: "2020-01-01",
            logradouro: "RUA PRINCIPAL",
            numero: "100",
            bairro: "CENTRO",
            municipio: "INAJA",
            uf: "PR",
            cep: "87670000",
            cnae_fiscal_descricao: "Comércio varejista",
            cnaes_secundarios: [],
            qsa: [],
          };
        },
      };
    }
    return fetchOrig(url, opts);
  };

  try {
    const res = await runRpc(db, "cnpj_buscar", { _cnpj: "76970318000167" });
    assert.equal(res.data?.fonte, "MinhaReceita");
    assert.equal(res.data?.razao_social, "EMPRESA DE TESTE REDUNDANCIA LTDA");
    assert.equal(res.error, null);
  } finally {
    globalThis.fetch = fetchOrig;
  }
});
