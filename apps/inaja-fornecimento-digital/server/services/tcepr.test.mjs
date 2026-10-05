import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../db.mjs";
import { TCEPR_URLS, normalizarLicitacaoTcePr, normalizarObraTcePr, parseCsvSemicolon, sincronizarTcePr } from "./tcepr.mjs";

test("interpreta CSV semicolon com aspas internas e linha separadora", () => {
  const rows = parseCsvSemicolon('a;b\n"1";"KITS LANCHES "ADMINISTRATIVO"""\n---;---\n"2";"Texto ""com aspas"""\n');
  assert.deepEqual(rows, [
    { a: "1", b: 'KITS LANCHES "ADMINISTRATIVO"' },
    { a: "2", b: 'Texto "com aspas"' },
  ]);
});

test("normaliza campos do Mural de Licitações e Obras do TCE-PR", () => {
  const licitacao = normalizarLicitacaoTcePr({
    dsModalidadeLicitacao: "Pregão eletrônico",
    nmRazaoSocial: "Prefeitura Municipal de Inajá",
    nrDocumento: "76.970.318/0001-67",
    cdIBGE: "10300",
    nmMunicipio: "Inajá",
    nrAno: "2026",
    nrProcessoEdital: "12/2026",
    dsObjeto: "Aquisição de materiais",
    dtAberturaLicitacao: "15/01/2026 10:30:00",
    dtLancamentoPublicacao: "10/01/2026 08:00:00",
    vlReferencia: "10582131.37",
  });
  assert.equal(licitacao.cnpj_orgao, "76970318000167");
  assert.equal(licitacao.codigo_ibge, "10300");
  assert.equal(licitacao.data_abertura, "2026-01-15 10:30:00");
  assert.equal(licitacao.valor_referencia, 10582131.37);

  const obra = normalizarObraTcePr({
    idIntervencao: "OBRA-1",
    nmPessoa: "Prefeitura Municipal de Inajá",
    nrDocumento: "76970318000167",
    cdIBGE: "10300",
    nmMunicipio: "Inajá",
    nrAnoIntervencao: "2025",
    nmIntervencao: "Pavimentação de vias",
    dsObjeto: "Execução de pavimentação",
    vlIntervencao: "1.234,56",
    dtInicio: "01/02/2025",
  });
  assert.equal(obra.id_intervencao, "OBRA-1");
  assert.equal(obra.valor, 1234.56);
  assert.equal(obra.data_inicio, "2025-02-01");
});

test("sincroniza fontes do TCE-PR, filtra o município e calcula situação da obra", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const licitacoes = [
    "dsModalidadeLicitacao;nmRazaoSocial;nrDocumento;cdIBGE;nmMunicipio;nrAno;nrProcessoEdital;dsTipoAvaliacao;dsObjeto;dtAberturaLicitacao;dtLancamentoPublicacao;vlReferencia",
    '"Pregão";"Prefeitura de Inajá";"76.970.318/0001-67";"10300";"Inajá";"2026";"12/2026";"Menor preço";"Aquisição de material";"15/01/2026 10:30:00";"10/01/2026 08:00:00";"10582131.37"',
    '"Concorrência";"Outro Município";"00.000.000/0001-00";"99999";"Outro";"2026";"99/2026";"Menor preço";"Ignorar";"15/01/2026 10:30:00";"10/01/2026 08:00:00";"10"',
  ].join("\n");
  const obras = [
    "idIntervencao;nmPessoa;nrDocumento;cdIBGE;nmMunicipio;nrAnoIntervencao;dsTipoIntervencao;nmIntervencao;dsTipoObra;dsObjeto;vlIntervencao;dtInicio",
    '"OBRA-1";"Prefeitura de Inajá";"76.970.318/0001-67";"10300";"Inajá";"2025";"Execução";"Pavimentação";"Viária";"Pavimentação de vias";"1234,56";"01/02/2025"',
    '"OBRA-2";"Outro Município";"00.000.000/0001-00";"99999";"Outro";"2025";"Execução";"Outra";"Viária";"Ignorar";"20";"01/02/2025"',
  ].join("\n");
  const acompanhamentos = [
    "idIntervencao;dsOrigemAcompanhamento;nrAcompanhamento;dtAcompanhamento;dsTipoAcompanhamento;nmResponsavel;dsObservacao;dsTipoMedicao;nrPercentualFisico;dsMotivoParalisacao",
    '"OBRA-1";"TCE-PR";"1";"10/03/2026";"Acompanhamento";"Fiscal";"Serviço paralisado";"Física";"42,5";"Paralisação contratual"',
    '"OBRA-EXTERNA";"TCE-PR";"1";"10/03/2026";"Acompanhamento";"Fiscal";"Ignorar";"Física";"10";""',
  ].join("\n");
  const fetchImpl = async (url) => {
    const endereco = String(url);
    const corpo = endereco.includes("muraldelicitacoes") ? licitacoes : endereco.endsWith("obras_municipais_base_de_dados.csv") ? obras : acompanhamentos;
    return { ok: true, status: 200, async text() { return corpo; } };
  };

  const resultado = await sincronizarTcePr(db, { cnpj: "76970318000167", ibge: "4110300", anos: [2026], fetchImpl });
  assert.equal(resultado.status, "concluido");
  assert.deepEqual(resultado.totais, { licitacoes: 1, obras: 1, acompanhamentos: 1 });
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_licitacoes").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_obras").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_obras_acompanhamentos").get().total, 1);
  const obra = db.prepare("SELECT situacao, percentual_fisico, ultimo_acompanhamento FROM tcepr_obras WHERE id_intervencao = 'OBRA-1'").get();
  assert.equal(obra.situacao, "Paralisada");
  assert.equal(obra.percentual_fisico, 42.5);
  assert.equal(obra.ultimo_acompanhamento, "2026-03-10");

  const falha = await sincronizarTcePr(db, { cnpj: "76970318000167", ibge: "4110300", anos: [2026], fetchImpl: async () => ({ ok: false, status: 503, async text() { return ""; } }) });
  assert.equal(falha.status, "erro");
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_licitacoes").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_obras").get().total, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM tcepr_sincronizacoes WHERE status = 'erro'").get().total, 1);
  assert.equal(TCEPR_URLS.licitacoes(2026), "https://servicos.tce.pr.gov.br/servicos/arquivos/dadosabertos/muraldelicitacoes/2026_mural_de_licitacoes_base_de_dados.csv");
});

test("recupera percentual físico do histórico quando o último acompanhamento não traz medição", async () => {
  const db = new DatabaseSync(":memory:");
  migrate(db);
  const obras = [
    "idIntervencao;nmPessoa;nrDocumento;cdIBGE;nmMunicipio;nrAnoIntervencao;dsTipoIntervencao;nmIntervencao;dsTipoObra;dsObjeto;vlIntervencao;dtInicio",
    '"OBRA-P";"Prefeitura de Inajá";"76.970.318/0001-67";"10300";"Inajá";"2025";"Execução";"Creche municipal";"Edificação";"Construção de creche";"500000";"01/02/2025"',
    '"OBRA-N";"Prefeitura de Inajá";"76.970.318/0001-67";"10300";"Inajá";"2025";"Execução";"Praça municipal";"Urbanização";"Urbanização de praça";"80000";"01/03/2025"',
  ].join("\n");
  const acompanhamentos = [
    "idIntervencao;dsOrigemAcompanhamento;nrAcompanhamento;dtAcompanhamento;dsTipoAcompanhamento;nmResponsavel;dsObservacao;dsTipoMedicao;nrPercentualFisico;dsMotivoParalisacao",
    '"OBRA-P";"TCE-PR";"1";"10/03/2026";"Medição";"Fiscal";"Medição mensal da obra";"Física";"42,5";""',
    '"OBRA-P";"TCE-PR";"2";"11/03/2026";"Vistoria";"Fiscal";"Obra paralisada por falta de repasse";"Física";"";"Paralisação contratual"',
    '"OBRA-N";"TCE-PR";"1";"05/04/2026";"Vistoria";"Fiscal";"Serviço concluído e finalizado";"Física";"";""',
  ].join("\n");
  const fetchImpl = async (url) => {
    const endereco = String(url);
    const corpo = endereco.endsWith("obras_municipais_base_de_dados.csv") ? obras : endereco.endsWith("acompanhamentos_base_de_dados.csv") ? acompanhamentos : "coluna\n";
    return { ok: true, status: 200, async text() { return corpo; } };
  };

  const resultado = await sincronizarTcePr(db, { cnpj: "76970318000167", ibge: "4110300", anos: [2026], fetchImpl });
  assert.equal(resultado.status, "concluido");

  const paralisada = db.prepare("SELECT situacao, percentual_fisico, ultimo_acompanhamento FROM tcepr_obras WHERE id_intervencao = 'OBRA-P'").get();
  assert.equal(paralisada.situacao, "Paralisada");
  assert.equal(paralisada.percentual_fisico, 42.5);
  assert.equal(paralisada.ultimo_acompanhamento, "2026-03-11");

  const semMedicao = db.prepare("SELECT situacao, percentual_fisico FROM tcepr_obras WHERE id_intervencao = 'OBRA-N'").get();
  assert.equal(semMedicao.situacao, "Concluída");
  assert.equal(semMedicao.percentual_fisico, null);
});
