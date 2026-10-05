import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../db.mjs";
import { calcularIndicadoresSiconfi, normalizarEntregaSiconfi, normalizarRegistroSiconfi, sincronizarSiconfi, SICONFI_URLS } from "./siconfi.mjs";

function resposta(itens) {
  return { ok: true, status: 200, async json() { return { items: itens, hasMore: false }; } };
}

test("normaliza registros e entregas do SICONFI", () => {
  const registro = normalizarRegistroSiconfi("RREO", {
    exercicio: 2025,
    periodo: 6,
    periodicidade: "B",
    demonstrativo: "RREO",
    esfera: "M",
    cod_ibge: 4110300,
    instituicao: "Prefeitura Municipal de Inajá - PR",
    anexo: "RREO-Anexo 01",
    coluna: "Até o Bimestre",
    cod_conta: "TotalReceitas",
    conta: "TOTAL DAS RECEITAS",
    valor: "1234,56",
  });
  assert.equal(registro.tipo, "rreo");
  assert.equal(registro.cod_ibge, 4110300);
  assert.equal(registro.valor, 1234.56);
  assert.match(registro.chave_externa, /rreo/);

  const entrega = normalizarEntregaSiconfi({
    exercicio: 2025,
    cod_ibge: 4110300,
    entregavel: "RREO",
    periodo: 6,
    periodicidade: "B",
    status_relatorio: "HO",
    data_status: "2026-02-15T12:00:00Z",
  });
  assert.equal(entrega.entregavel, "RREO");
  assert.equal(entrega.status_relatorio, "HO");
  assert.equal(entrega.cod_ibge, 4110300);
});

test("sincroniza RREO, RGF, DCA e extrato, preserva histórico e calcula indicadores", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const fetchImpl = async (url) => {
    const endereco = new URL(String(url));
    if (endereco.pathname.endsWith("/rreo")) {
      const periodo = Number(endereco.searchParams.get("nr_periodo"));
      return resposta([
        { exercicio: 2025, periodo, periodicidade: "B", demonstrativo: "RREO", esfera: "M", cod_ibge: 4110300, anexo: "RREO-Anexo 01", cod_conta: "TotalReceitas", conta: "TOTAL DAS RECEITAS", coluna: "Até o Bimestre (c)", valor: 100 + periodo },
        { exercicio: 2025, periodo, periodicidade: "B", demonstrativo: "RREO", esfera: "M", cod_ibge: 4110300, anexo: "RREO-Anexo 01", cod_conta: "TotalDespesas", conta: "TOTAL DAS DESPESAS", coluna: "DESPESAS EMPENHADAS ATÉ O BIMESTRE (f)", valor: 200 + periodo },
        { exercicio: 2025, periodo, periodicidade: "B", demonstrativo: "RREO", esfera: "M", cod_ibge: 4110300, anexo: "RREO-Anexo 03", cod_conta: "RREO3ReceitaCorrenteLiquida", conta: "RECEITA CORRENTE LÍQUIDA", coluna: "TOTAL (ÚLTIMOS 12 MESES)", valor: 300 + periodo },
      ]);
    }
    if (endereco.pathname.endsWith("/rgf")) {
      const periodo = Number(endereco.searchParams.get("nr_periodo"));
      return resposta([
        { exercicio: 2025, periodo, periodicidade: "Q", demonstrativo: "RGF", esfera: "M", co_poder: "E", cod_ibge: 4110300, anexo: "RGF-Anexo 06", cod_conta: "DespesaTotalComPessoalDemonstrativoSimplificado", conta: "Despesa Total com Pessoal - DTP", coluna: "% SOBRE A RCL AJUSTADA", valor: 48 },
        { exercicio: 2025, periodo, periodicidade: "Q", demonstrativo: "RGF", esfera: "M", co_poder: "E", cod_ibge: 4110300, anexo: "RGF-Anexo 06", cod_conta: "LimitePrudencialDespesaComPessoalDemonstrativoSimplificado", conta: "Limite Prudencial", coluna: "% SOBRE A RCL AJUSTADA", valor: 51.3 },
        { exercicio: 2025, periodo, periodicidade: "Q", demonstrativo: "RGF", esfera: "M", co_poder: "E", cod_ibge: 4110300, anexo: "RGF-Anexo 05", cod_conta: "DisponibilidadeDeCaixaLiquidaAposRP", conta: "TOTAL (IV) = (I + II + III)", coluna: "DISPONIBILIDADE DE CAIXA LÍQUIDA", valor: 100 },
      ]);
    }
    if (endereco.pathname.endsWith("/dca")) {
      return resposta([{ exercicio: 2025, cod_ibge: 4110300, instituicao: "Prefeitura de Inajá - PR", anexo: "DCA-Anexo I-AB", cod_conta: "P1", conta: "Ativo", coluna: "31/12/2025", valor: 500 }]);
    }
    if (endereco.pathname.endsWith("/extrato_entregas")) {
      return resposta([
        ...Array.from({ length: 6 }, (_, indice) => ({ exercicio: 2025, cod_ibge: 4110300, entregavel: "RREO", periodo: indice + 1, periodicidade: "B", status_relatorio: "HO" })),
        ...Array.from({ length: 3 }, (_, indice) => ({ exercicio: 2025, cod_ibge: 4110300, entregavel: "RGF", periodo: indice + 1, periodicidade: "Q", status_relatorio: "HO" })),
        { exercicio: 2025, cod_ibge: 4110300, entregavel: "DCA", periodo: null, periodicidade: "A", status_relatorio: "HO" },
      ]);
    }
    throw new Error("URL não prevista: " + endereco.pathname);
  };

  const resultado = await sincronizarSiconfi(db, { ibge: "4110300", anos: [2025], fetchImpl });
  assert.equal(resultado.status, "concluido");
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM siconfi_registros WHERE tipo = 'rreo'").get().total, 18);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM siconfi_registros WHERE tipo = 'rgf'").get().total, 9);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM siconfi_registros WHERE tipo = 'dca'").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM siconfi_entregas").get().total, 10);

  const indicadores = calcularIndicadoresSiconfi(db, 2025, "4110300");
  assert.equal(indicadores.ano, 2025);
  assert.equal(indicadores.periodoRreo, 6);
  assert.equal(indicadores.rreo.receitaTotal.valor, 106);
  assert.equal(indicadores.rreo.rcl.valor, 306);
  assert.equal(indicadores.rgf.pessoalPercentual.valor, 48);
  assert.equal(indicadores.rgf.caixaLiquida.valor, 100);
  assert.equal(indicadores.alertas.length, 0);
  assert.equal(indicadores.cobertura[0].status, "completo");
  assert.equal(SICONFI_URLS.api.endsWith("/siconfi/tt"), true);
  db.close();
});

test("registra falha sem apagar dados anteriores", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  db.prepare("INSERT INTO siconfi_registros (id, chave_externa, tipo, exercicio, cod_ibge, valor) VALUES (?, ?, ?, ?, ?, ?)").run("r1", "r1", "rreo", 2025, 4110300, 10);
  const falha = await sincronizarSiconfi(db, { ibge: "4110300", anos: [2025], fetchImpl: async () => ({ ok: false, status: 503, async json() { return {}; } }) });
  assert.equal(falha.status, "erro");
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM siconfi_registros").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM siconfi_sincronizacoes WHERE status = 'erro'").get().total, 1);
  db.close();
});
