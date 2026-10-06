// Integração com a API pública do Tesouro Nacional / SICONFI.
import { randomUUID } from "node:crypto";

export const SICONFI_URLS = Object.freeze({
  api: "https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt",
  consultas: "https://www.tesourotransparente.gov.br/consultas/consultas-siconfi",
  documentacao: "https://apidatalake.tesouro.gov.br/docs/siconfi/",
  portal: "https://siconfi.tesouro.gov.br/",
});

const DEFAULT_IBGE = "4110300";
const DEFAULT_ANO_INICIAL = 2025;
const MIN_INTERVALO_MS = 1_050;
const sincronizacoesAtivas = new WeakSet();
let filaRequisicoes = Promise.resolve();
let ultimaRequisicaoEm = 0;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aguardarRitmo(fetchImpl) {
  if (fetchImpl !== fetch) return;
  let liberar;
  const anterior = filaRequisicoes;
  filaRequisicoes = new Promise((resolve) => { liberar = resolve; });
  await anterior;
  const espera = Math.max(0, MIN_INTERVALO_MS - (Date.now() - ultimaRequisicaoEm));
  if (espera) await esperar(espera);
  ultimaRequisicaoEm = Date.now();
  liberar();
}

function primeiro(objeto, chaves, padrao = null) {
  for (const chave of chaves) {
    if (objeto?.[chave] !== undefined && objeto?.[chave] !== null && objeto?.[chave] !== "") return objeto[chave];
  }
  return padrao;
}

function limpar(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto || null;
}

function inteiro(valor, padrao = null) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.trunc(numero) : padrao;
}

function numero(valor, padrao = 0) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  const texto = String(valor ?? "").trim();
  if (!texto) return padrao;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const convertido = Number(normalizado);
  return Number.isFinite(convertido) ? convertido : padrao;
}

function digitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function semAcentos(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function chaveExterna(partes) {
  return partes.map((parte) => String(parte ?? "").trim()).join("\u001f");
}

function listaAnos(valor, anoAtual = new Date().getFullYear()) {
  const anos = (Array.isArray(valor) ? valor : String(valor || "").split(/[,;\s]+/))
    .map(Number)
    .filter((ano) => Number.isInteger(ano) && ano >= 2013 && ano <= anoAtual);
  return [...new Set(anos)].sort((a, b) => a - b);
}

function respostaOk(resposta) {
  return resposta && (resposta.ok === true || (resposta.ok === undefined && Number(resposta.status) >= 200 && Number(resposta.status) < 300));
}

async function requisitarJson(url, fetchImpl = fetch) {
  let resposta = null;
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    await aguardarRitmo(fetchImpl);
    try {
      const opcoes = {
        headers: {
          Accept: "application/json",
          "User-Agent": "Sistema-Prefeitura-Inaja/1.0",
        },
      };
      if (typeof AbortSignal?.timeout === "function") opcoes.signal = AbortSignal.timeout(45_000);
      resposta = await fetchImpl(url, opcoes);
    } catch (erro) {
      if (erro?.name === "AbortError" || erro?.name === "TimeoutError") {
        throw new Error("SICONFI excedeu 45 segundos sem responder.");
      }
      throw erro;
    }
    if (resposta.status !== 429 || tentativa === 3) break;
    const retryAfter = Number(resposta.headers?.get?.("retry-after") || 0);
    await esperar(retryAfter > 0 ? Math.min(retryAfter * 1_000, 30_000) : 2_000 * (tentativa + 1));
  }
  if (!respostaOk(resposta)) {
    let mensagem = "";
    try {
      const corpo = await resposta.json();
      mensagem = String(corpo?.message || corpo?.error || corpo?.detail || "");
    } catch {
      mensagem = "";
    }
    throw new Error("SICONFI respondeu HTTP " + String(resposta?.status || "sem resposta") + (mensagem ? ": " + mensagem : ""));
  }
  return resposta.json();
}

function itensResposta(resposta) {
  if (Array.isArray(resposta)) return resposta;
  if (Array.isArray(resposta?.items)) return resposta.items;
  if (Array.isArray(resposta?.data)) return resposta.data;
  return [];
}

async function consultarPaginado(caminho, parametros, fetchImpl) {
  const acumulado = [];
  let offset = 0;
  for (let pagina = 0; pagina < 20; pagina += 1) {
    const query = new URLSearchParams();
    for (const [chave, valor] of Object.entries(parametros)) {
      if (valor !== undefined && valor !== null && valor !== "") query.set(chave, String(valor));
    }
    if (offset > 0) query.set("offset", String(offset));
    const resposta = await requisitarJson(SICONFI_URLS.api + caminho + "?" + query.toString(), fetchImpl);
    const itens = itensResposta(resposta);
    acumulado.push(...itens);
    const temMais = resposta?.hasMore === true || resposta?.hasMore === "true";
    if (!temMais || !itens.length) break;
    offset += itens.length;
  }
  return acumulado;
}

export function normalizarRegistroSiconfi(tipo, item, metadados = {}) {
  const registroTipo = String(tipo || "").toLowerCase();
  const exercicio = inteiro(primeiro(item, ["exercicio", "an_exercicio"], metadados.exercicio));
  const periodo = inteiro(primeiro(item, ["periodo", "nr_periodo"], metadados.periodo));
  const periodicidade = limpar(primeiro(item, ["periodicidade", "in_periodicidade"], metadados.periodicidade));
  const demonstrativo = limpar(primeiro(item, ["demonstrativo", "co_tipo_demonstrativo"], metadados.demonstrativo));
  const esfera = limpar(primeiro(item, ["esfera", "co_esfera"], metadados.esfera));
  const poder = limpar(primeiro(item, ["co_poder", "poder"], metadados.poder));
  const codIbge = inteiro(primeiro(item, ["cod_ibge", "id_ente"], metadados.codIbge));
  const anexo = limpar(primeiro(item, ["anexo", "no_anexo"]));
  const rotulo = limpar(item.rotulo);
  const coluna = limpar(item.coluna);
  const codConta = limpar(item.cod_conta);
  const conta = limpar(item.conta);
  return {
    id: randomUUID(),
    chave_externa: chaveExterna([registroTipo, exercicio, periodo, periodicidade, demonstrativo, esfera, poder, anexo, rotulo, coluna, codConta, conta]),
    tipo: registroTipo,
    exercicio,
    periodo,
    periodicidade,
    demonstrativo,
    esfera,
    poder,
    cod_ibge: codIbge,
    uf: limpar(item.uf),
    instituicao: limpar(item.instituicao),
    populacao: inteiro(item.populacao),
    anexo,
    rotulo,
    coluna,
    cod_conta: codConta,
    conta,
    valor: numero(item.valor),
    raw_json: JSON.stringify(item),
  };
}

export function normalizarEntregaSiconfi(item, metadados = {}) {
  const exercicio = inteiro(primeiro(item, ["exercicio", "an_exercicio"], metadados.exercicio));
  const codIbge = inteiro(primeiro(item, ["cod_ibge", "id_ente"], metadados.codIbge));
  const entregavel = limpar(item.entregavel);
  const periodo = inteiro(item.periodo);
  const periodicidade = limpar(item.periodicidade);
  const statusRelatorio = limpar(item.status_relatorio);
  const dataStatus = limpar(item.data_status);
  const instituicao = limpar(item.instituicao);
  return {
    id: randomUUID(),
    chave_externa: chaveExterna([exercicio, codIbge, instituicao, entregavel, periodo, periodicidade, statusRelatorio, dataStatus, item.forma_envio, item.tipo_relatorio]),
    exercicio,
    cod_ibge: codIbge,
    populacao: inteiro(item.populacao),
    instituicao,
    entregavel,
    periodo,
    periodicidade,
    status_relatorio: statusRelatorio,
    data_status: dataStatus,
    forma_envio: limpar(item.forma_envio),
    tipo_relatorio: limpar(item.tipo_relatorio),
    raw_json: JSON.stringify(item),
  };
}

function salvarRegistros(db, registros) {
  if (!registros.length) return;
  const inserir = db.prepare(
    "INSERT INTO siconfi_registros (id, chave_externa, tipo, exercicio, periodo, periodicidade, demonstrativo, esfera, poder, cod_ibge, uf, instituicao, populacao, anexo, rotulo, coluna, cod_conta, conta, valor, raw_json) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT(chave_externa) DO UPDATE SET tipo=excluded.tipo, exercicio=excluded.exercicio, periodo=excluded.periodo, periodicidade=excluded.periodicidade, demonstrativo=excluded.demonstrativo, esfera=excluded.esfera, poder=excluded.poder, cod_ibge=excluded.cod_ibge, uf=excluded.uf, instituicao=excluded.instituicao, populacao=excluded.populacao, anexo=excluded.anexo, rotulo=excluded.rotulo, coluna=excluded.coluna, cod_conta=excluded.cod_conta, conta=excluded.conta, valor=excluded.valor, raw_json=excluded.raw_json, sincronizado_em=datetime('now')",
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of registros) {
      inserir.run(item.id, item.chave_externa, item.tipo, item.exercicio, item.periodo, item.periodicidade, item.demonstrativo, item.esfera, item.poder, item.cod_ibge, item.uf, item.instituicao, item.populacao, item.anexo, item.rotulo, item.coluna, item.cod_conta, item.conta, item.valor, item.raw_json);
    }
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function salvarEntregas(db, entregas) {
  if (!entregas.length) return;
  const inserir = db.prepare(
    "INSERT INTO siconfi_entregas (id, chave_externa, exercicio, cod_ibge, populacao, instituicao, entregavel, periodo, periodicidade, status_relatorio, data_status, forma_envio, tipo_relatorio, raw_json) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT(chave_externa) DO UPDATE SET exercicio=excluded.exercicio, cod_ibge=excluded.cod_ibge, populacao=excluded.populacao, instituicao=excluded.instituicao, entregavel=excluded.entregavel, periodo=excluded.periodo, periodicidade=excluded.periodicidade, status_relatorio=excluded.status_relatorio, data_status=excluded.data_status, forma_envio=excluded.forma_envio, tipo_relatorio=excluded.tipo_relatorio, raw_json=excluded.raw_json, sincronizado_em=datetime('now')",
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of entregas) {
      inserir.run(item.id, item.chave_externa, item.exercicio, item.cod_ibge, item.populacao, item.instituicao, item.entregavel, item.periodo, item.periodicidade, item.status_relatorio, item.data_status, item.forma_envio, item.tipo_relatorio, item.raw_json);
    }
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function deduplicar(registros) {
  return [...new Map(registros.map((registro) => [registro.chave_externa, registro])).values()];
}

async function consultarRreo(ano, ibge, fetchImpl) {
  const registros = [];
  const erros = [];
  for (let periodo = 1; periodo <= 6; periodo += 1) {
    try {
      const itens = await consultarPaginado("/rreo", {
        an_exercicio: ano,
        nr_periodo: periodo,
        co_tipo_demonstrativo: "RREO",
        co_esfera: "M",
        id_ente: ibge,
      }, fetchImpl);
      registros.push(...itens.map((item) => normalizarRegistroSiconfi("rreo", item, { exercicio: ano, periodo, codIbge: ibge, demonstrativo: "RREO", esfera: "M", periodicidade: "B" })));
    } catch (erro) {
      erros.push("RREO " + ano + "/" + periodo + ": " + String(erro?.message || erro));
    }
  }
  return { registros: deduplicar(registros), erros };
}

async function consultarRgfPeriodo(ano, ibge, periodicidade, demonstrativo, periodos, fetchImpl) {
  const registros = [];
  const erros = [];
  for (const periodo of periodos) {
    try {
      const itens = await consultarPaginado("/rgf", {
        an_exercicio: ano,
        in_periodicidade: periodicidade,
        nr_periodo: periodo,
        co_tipo_demonstrativo: demonstrativo,
        co_esfera: "M",
        co_poder: "E",
        id_ente: ibge,
      }, fetchImpl);
      registros.push(...itens.map((item) => normalizarRegistroSiconfi("rgf", item, { exercicio: ano, periodo, codIbge: ibge, demonstrativo, esfera: "M", poder: "E", periodicidade })));
    } catch (erro) {
      erros.push("RGF " + ano + "/" + periodicidade + "/" + periodo + ": " + String(erro?.message || erro));
    }
  }
  return { registros: deduplicar(registros), erros };
}

async function consultarDca(ano, ibge, fetchImpl) {
  try {
    const itens = await consultarPaginado("/dca", { an_exercicio: ano, id_ente: ibge }, fetchImpl);
    return { registros: deduplicar(itens.map((item) => normalizarRegistroSiconfi("dca", item, { exercicio: ano, codIbge: ibge }))), erros: [] };
  } catch (erro) {
    return { registros: [], erros: ["DCA " + ano + ": " + String(erro?.message || erro)] };
  }
}

async function consultarEntregas(ano, ibge, fetchImpl) {
  try {
    const itens = await consultarPaginado("/extrato_entregas", { id_ente: ibge, an_referencia: ano }, fetchImpl);
    return { entregas: deduplicar(itens.map((item) => normalizarEntregaSiconfi(item, { exercicio: ano, codIbge: ibge }))), erros: [] };
  } catch (erro) {
    return { entregas: [], erros: ["entregas " + ano + ": " + String(erro?.message || erro)] };
  }
}

export async function sincronizarSiconfi(db, opcoes = {}) {
  if (sincronizacoesAtivas.has(db)) throw new Error("Já existe uma sincronização do SICONFI em andamento.");
  const anoAtual = new Date().getFullYear();
  const ibge = digitos(opcoes.ibge || DEFAULT_IBGE);
  const anos = listaAnos(opcoes.anos || [anoAtual - 1, anoAtual], anoAtual);
  if (ibge.length !== 7) throw new Error("Configure um código IBGE municipal válido com 7 dígitos.");
  if (!anos.length) throw new Error("Informe ao menos um ano entre 2013 e o ano atual.");

  sincronizacoesAtivas.add(db);
  const id = randomUUID();
  db.prepare("INSERT INTO siconfi_sincronizacoes (id, ibge, anos, status) VALUES (?, ?, ?, 'executando')").run(id, ibge, JSON.stringify(anos));
  const erros = [];
  const totais = { rreo: 0, rgf: 0, dca: 0, entregas: 0, consultas: 0 };
  try {
    const todosRegistros = [];
    const todasEntregas = [];
    for (const ano of anos) {
      const rreo = await consultarRreo(ano, ibge, opcoes.fetchImpl);
      todosRegistros.push(...rreo.registros);
      erros.push(...rreo.erros);
      totais.consultas += 6;

      let rgf = await consultarRgfPeriodo(ano, ibge, "Q", "RGF", [1, 2, 3], opcoes.fetchImpl);
      totais.consultas += 3;
      if (!rgf.registros.length && rgf.erros.length === 0) {
        const simplificado = await consultarRgfPeriodo(ano, ibge, "S", "RGF Simplificado", [1, 2], opcoes.fetchImpl);
        rgf = simplificado;
        totais.consultas += 2;
      }
      todosRegistros.push(...rgf.registros);
      erros.push(...rgf.erros);

      const dca = await consultarDca(ano, ibge, opcoes.fetchImpl);
      todosRegistros.push(...dca.registros);
      erros.push(...dca.erros);
      totais.consultas += 1;

      const entregas = await consultarEntregas(ano, ibge, opcoes.fetchImpl);
      todasEntregas.push(...entregas.entregas);
      erros.push(...entregas.erros);
      totais.consultas += 1;
    }
    const registros = deduplicar(todosRegistros);
    const entregas = deduplicar(todasEntregas);
    salvarRegistros(db, registros);
    salvarEntregas(db, entregas);
    totais.rreo = registros.filter((item) => item.tipo === "rreo").length;
    totais.rgf = registros.filter((item) => item.tipo === "rgf").length;
    totais.dca = registros.filter((item) => item.tipo === "dca").length;
    totais.entregas = entregas.length;
    const status = registros.length || entregas.length ? (erros.length ? "parcial" : "concluido") : "erro";
    db.prepare("UPDATE siconfi_sincronizacoes SET status = ?, totais = ?, erros = ?, finalizado_em = datetime('now') WHERE id = ?").run(status, JSON.stringify(totais), JSON.stringify(erros.slice(0, 50)), id);
    return { id, status, totais, erros: erros.slice(0, 20), recebidos: totais.rreo + totais.rgf + totais.dca + totais.entregas };
  } catch (erro) {
    db.prepare("UPDATE siconfi_sincronizacoes SET status = 'erro', erros = ?, finalizado_em = datetime('now') WHERE id = ?").run(JSON.stringify([String(erro?.message || erro)]), id);
    throw erro;
  } finally {
    sincronizacoesAtivas.delete(db);
  }
}

export function configuracaoSiconfi(db) {
  const obter = (chave) => db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave)?.valor;
  const anoAtual = new Date().getFullYear();
  const anosConfigurados = listaAnos(obter("siconfi_anos"), anoAtual);
  return {
    ibge: digitos(obter("siconfi_ibge") || DEFAULT_IBGE),
    anos: anosConfigurados.length ? anosConfigurados : [Math.max(DEFAULT_ANO_INICIAL, anoAtual - 1), anoAtual],
    intervaloHoras: Math.max(1, Number(obter("siconfi_sincronizacao_horas") || 24)),
  };
}

export function agendarSincronizacaoSiconfi(db) {
  if (sincronizacoesAtivas.has(db)) return false;
  const config = configuracaoSiconfi(db);
  const ultima = db.prepare("SELECT finalizado_em, iniciado_em FROM siconfi_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get();
  const referencia = ultima?.finalizado_em || ultima?.iniciado_em;
  const vencida = !referencia || Date.now() - new Date(String(referencia).replace(" ", "T") + "Z").getTime() >= config.intervaloHoras * 60 * 60 * 1_000;
  if (!vencida) return false;
  setImmediate(async () => {
    try { await sincronizarSiconfi(db, config); } catch { return undefined; }
  });
  return true;
}

function valorLinha(linha) {
  if (!linha) return null;
  return {
    valor: numero(linha.valor, 0),
    coluna: linha.coluna,
    conta: linha.conta,
    cod_conta: linha.cod_conta,
    anexo: linha.anexo,
    periodo: linha.periodo,
    exercicio: linha.exercicio,
  };
}

function escolherLinha(linhas, opcoes = {}) {
  const codigoExato = new Set((opcoes.codigos || []).map(semAcentos));
  const codigoContem = (opcoes.codigoContem || []).map(semAcentos);
  const colunaContem = (opcoes.colunaContem || []).map(semAcentos);
  const contaContem = (opcoes.contaContem || []).map(semAcentos);
  const candidatos = linhas.filter((linha) => {
    const codigo = semAcentos(linha.cod_conta);
    const coluna = semAcentos(linha.coluna);
    const conta = semAcentos(linha.conta);
    if (codigoExato.size && !codigoExato.has(codigo)) return false;
    if (codigoContem.length && !codigoContem.some((parte) => codigo.includes(parte))) return false;
    if (colunaContem.length && !colunaContem.some((parte) => coluna.includes(parte))) return false;
    if (contaContem.length && !contaContem.some((parte) => conta.includes(parte))) return false;
    return true;
  });
  if (!candidatos.length) return null;
  const pontuacao = (linha) => {
    const coluna = semAcentos(linha.coluna);
    const conta = semAcentos(linha.conta);
    let pontos = 0;
    for (const parte of colunaContem) if (coluna === parte) pontos += 80; else if (coluna.includes(parte)) pontos += 30;
    for (const parte of contaContem) if (conta.startsWith(parte)) pontos += 50; else if (conta.includes(parte)) pontos += 20;
    if (Number.isFinite(Number(linha.valor))) pontos += 1;
    return pontos;
  };
  return [...candidatos].sort((a, b) => pontuacao(b) - pontuacao(a))[0] || null;
}

function metricas(linhas, definicao) {
  return valorLinha(escolherLinha(linhas, definicao));
}

export function coberturaSiconfi(db, anos = [], ibge = "") {
  const selecionados = listaAnos(anos);
  const where = ["1 = 1"];
  const params = [];
  if (selecionados.length) {
    where.push("exercicio IN (" + selecionados.map(() => "?").join(",") + ")");
    params.push(...selecionados);
  }
  if (ibge) {
    where.push("cod_ibge = ?");
    params.push(inteiro(ibge));
  }
  const entregas = db.prepare("SELECT exercicio, entregavel, periodo, periodicidade, status_relatorio FROM siconfi_entregas WHERE " + where.join(" AND ") + " ORDER BY exercicio, data_status").all(...params);
  const porAno = new Map();
  for (const entrega of entregas) {
    const ano = Number(entrega.exercicio);
    if (!porAno.has(ano)) porAno.set(ano, { rreo: new Set(), rgf: new Set(), dca: new Set(), homologadas: 0, retificadas: 0 });
    const grupo = porAno.get(ano);
    const chave = String(entrega.periodo || 0) + ":" + String(entrega.periodicidade || "");
    const tipo = semAcentos(String(entrega.entregavel || "") + " " + String(entrega.tipo_relatorio || ""));
    if (tipo.includes("RREO") || tipo.includes("RELATORIO RESUMIDO DE EXECUCAO ORCAMENTARIA")) grupo.rreo.add(chave);
    if (tipo.includes("RGF") || tipo.includes("RELATORIO DE GESTAO FISCAL")) grupo.rgf.add(chave);
    if (tipo.includes("DCA") || tipo.includes("BALANCO ANUAL")) grupo.dca.add("anual");
    if (entrega.status_relatorio === "HO") grupo.homologadas += 1;
    if (entrega.status_relatorio === "RE") grupo.retificadas += 1;
  }
  const anosSaida = selecionados.length ? selecionados : [...porAno.keys()].sort((a, b) => b - a);
  return anosSaida.map((ano) => {
    const grupo = porAno.get(ano) || { rreo: new Set(), rgf: new Set(), dca: new Set(), homologadas: 0, retificadas: 0 };
    const rgfSimplificado = [...grupo.rgf].some((chave) => chave.endsWith(":S"));
    const esperados = { rreo: 6, rgf: rgfSimplificado ? 2 : 3, dca: 1 };
    const recebidos = { rreo: grupo.rreo.size, rgf: grupo.rgf.size, dca: grupo.dca.size };
    return {
      ano,
      esperados,
      recebidos,
      total: recebidos.rreo + recebidos.rgf + recebidos.dca,
      homologadas: grupo.homologadas,
      retificadas: grupo.retificadas,
      status: recebidos.rreo + recebidos.rgf + recebidos.dca >= esperados.rreo + esperados.rgf + esperados.dca ? "completo" : recebidos.rreo + recebidos.rgf + recebidos.dca ? "parcial" : "sem dados",
    };
  });
}

export function calcularIndicadoresSiconfi(db, anoSolicitado = 0, ibge = "") {
  const where = ["1 = 1"];
  const params = [];
  if (ibge) {
    where.push("cod_ibge = ?");
    params.push(inteiro(ibge));
  }
  const anos = db.prepare("SELECT DISTINCT exercicio FROM siconfi_registros WHERE " + where.join(" AND ") + " ORDER BY exercicio DESC").all(...params).map((item) => Number(item.exercicio)).filter(Number.isFinite);
  const ano = Number(anoSolicitado) || anos[0] || null;
  if (ano) {
    where.push("exercicio = ?");
    params.push(ano);
  }
  const linhas = ano ? db.prepare("SELECT * FROM siconfi_registros WHERE " + where.join(" AND ")).all(...params) : [];
  const rreoLinhas = linhas.filter((linha) => linha.tipo === "rreo");
  const rgfLinhas = linhas.filter((linha) => linha.tipo === "rgf");
  const maiorPeriodo = (lista) => lista.reduce((maior, linha) => Math.max(maior, Number(linha.periodo) || 0), 0);
  const periodoRreo = maiorPeriodo(rreoLinhas);
  const periodoRgf = maiorPeriodo(rgfLinhas);
  const rreoAtivo = rreoLinhas.filter((linha) => Number(linha.periodo) === periodoRreo);
  const rgfAtivo = rgfLinhas.filter((linha) => Number(linha.periodo) === periodoRgf);
  const receitaTotal = metricas(rreoAtivo, { codigos: ["TotalReceitas"], colunaContem: ["ATE O BIMESTRE"] });
  const despesaEmpenhada = metricas(rreoAtivo, { codigos: ["TotalDespesas"], colunaContem: ["EMPENHADAS ATE O BIMESTRE"] });
  const despesaPaga = metricas(rreoAtivo, { codigos: ["TotalDespesas"], colunaContem: ["PAGAS ATE O BIMESTRE"] });
  const rcl = metricas(rreoAtivo, { codigos: ["RREO3ReceitaCorrenteLiquida"], colunaContem: ["TOTAL (ULTIMOS 12 MESES)"] });
  const saude = metricas(rreoAtivo, { codigos: ["AplicacaoTotalDasDespesasComAcoesEServicosPublicosDeSaude"], colunaContem: ["APLICADO"] });
  const educacao = metricas(rreoAtivo, { codigoContem: ["EDUCACAO"], colunaContem: ["APLICADO", "%"] });
  const pessoalPercentual = metricas(rgfAtivo, { codigos: ["DespesaTotalComPessoalDemonstrativoSimplificado"], colunaContem: ["% SOBRE A RCL AJUSTADA"] });
  const pessoalValor = metricas(rgfAtivo, { codigos: ["DespesaTotalComPessoalDemonstrativoSimplificado"], colunaContem: ["VALOR"] });
  const limitePessoal = metricas(rgfAtivo, { codigos: ["LimitePrudencialDespesaComPessoalDemonstrativoSimplificado"], colunaContem: ["% SOBRE A RCL AJUSTADA"] });
  const limiteAlerta = metricas(rgfAtivo, { codigos: ["LimiteDeAlertaDespesaComPessoalDemonstrativoSimplificado"], colunaContem: ["% SOBRE A RCL AJUSTADA"] });
  const dividaPercentual = metricas(rgfAtivo, { codigos: ["DividaConsolidadaLiquidaDemonstrativoSimplificado"], colunaContem: ["% SOBRE A RCL AJUSTADA"] });
  const caixaLiquida = metricas(rgfAtivo, { codigos: ["DisponibilidadeDeCaixaLiquidaAposRP"], contaContem: ["TOTAL (IV)"] });
  const restosPagar = metricas(rgfAtivo, { codigos: ["ValorTotalRestosAPagarDemonstrativoSimplificado"], colunaContem: ["RESTOS A PAGAR"] });
  const alertas = [];
  if (pessoalPercentual && limitePessoal && pessoalPercentual.valor >= limitePessoal.valor) alertas.push({ nivel: "critico", titulo: "Despesa com pessoal acima do limite prudencial", detalhe: String(pessoalPercentual.valor) + "% da RCL ajustada." });
  else if (pessoalPercentual && limiteAlerta && pessoalPercentual.valor >= limiteAlerta.valor) alertas.push({ nivel: "atencao", titulo: "Despesa com pessoal na faixa de alerta", detalhe: String(pessoalPercentual.valor) + "% da RCL ajustada." });
  if (caixaLiquida && caixaLiquida.valor < 0) alertas.push({ nivel: "critico", titulo: "Disponibilidade de caixa líquida negativa", detalhe: "Valor após a inscrição de restos a pagar não processados." });
  if (!rreoLinhas.length) alertas.push({ nivel: "info", titulo: "RREO ainda não disponível", detalhe: "Sincronize ou selecione outro exercício." });
  if (!rgfLinhas.length) alertas.push({ nivel: "info", titulo: "RGF ainda não disponível", detalhe: "Sincronize ou selecione outro exercício." });
  return {
    ano,
    anosDisponiveis: anos,
    periodoRreo: periodoRreo || null,
    periodoRgf: periodoRgf || null,
    rreo: { receitaTotal, despesaEmpenhada, despesaPaga, rcl, saude, educacao },
    rgf: { pessoalPercentual, pessoalValor, limitePessoal, limiteAlerta, dividaPercentual, caixaLiquida, restosPagar },
    alertas,
    cobertura: coberturaSiconfi(db, ano ? [ano] : [], ibge),
    fonte: SICONFI_URLS.consultas,
  };
}
