// Integração read-only com o BCData/SGS do Banco Central do Brasil.

export const BCB_URLS = Object.freeze({
  api: "https://api.bcb.gov.br/dados/serie/bcdata.sgs",
  portal: "https://dadosabertos.bcb.gov.br/",
  metadados: "https://www3.bcb.gov.br/sgspub/consultarmetadados/consultarMetadadosSeries.do?method=consultarMetadadosSeriesInternet",
});

export const BCB_SERIES = Object.freeze({
  ipca: Object.freeze({
    id: "ipca",
    codigo: "433",
    nome: "IPCA",
    periodicidade: "mensal",
    unidade: "percentual ao mês",
    descricao: "Índice Nacional de Preços ao Consumidor Amplo",
    fonte: `${BCB_URLS.metadados}&hdOidSerieSelecionada=433`,
  }),
  selic: Object.freeze({
    id: "selic",
    codigo: "11",
    nome: "Selic efetiva",
    periodicidade: "diária",
    unidade: "percentual ao dia útil",
    descricao: "Taxa média ajustada das operações compromissadas de um dia útil",
    fonte: "https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros---selic",
  }),
});

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();
const requisicoesAtivas = new Map();

function erroBcb(message, code = "BCB_ERROR", statusCode = 400) {
  const erro = new Error(message);
  erro.code = code;
  erro.statusCode = statusCode;
  return erro;
}

function inteiro(valor, padrao = null) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.trunc(numero) : padrao;
}

function numero(valor, padrao = null) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  const texto = String(valor ?? "").trim();
  if (!texto) return padrao;
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const convertido = Number(normalizado);
  return Number.isFinite(convertido) ? convertido : padrao;
}

function respostaOk(resposta) {
  return Boolean(resposta && (resposta.ok === true || (resposta.ok === undefined && Number(resposta.status) >= 200 && Number(resposta.status) < 300)));
}

function dataUtc(ano, mes, dia) {
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return data;
}

function isoData(data) {
  return [data.getUTCFullYear(), String(data.getUTCMonth() + 1).padStart(2, "0"), String(data.getUTCDate()).padStart(2, "0")].join("-");
}

function dataBcb(data) {
  return `${String(data.getUTCDate()).padStart(2, "0")}/${String(data.getUTCMonth() + 1).padStart(2, "0")}/${data.getUTCFullYear()}`;
}

function normalizarData(valor, nome, padrao) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return padrao;
  const texto = String(valor).trim();
  let partes;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    partes = texto.split("-").map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dia, mes, ano] = texto.split("/").map(Number);
    partes = [ano, mes, dia];
  }
  if (!partes) throw erroBcb(`A ${nome} deve estar no formato AAAA-MM-DD.`, "BAD_REQUEST");
  const data = dataUtc(...partes);
  if (!data) throw erroBcb(`A ${nome} informada não é uma data válida.`, "BAD_REQUEST");
  return data;
}

function subtrairMeses(data, meses) {
  const resultado = new Date(data.getTime());
  resultado.setUTCMonth(resultado.getUTCMonth() - meses);
  return resultado;
}

function subtrairDias(data, dias) {
  const resultado = new Date(data.getTime());
  resultado.setUTCDate(resultado.getUTCDate() - dias);
  return resultado;
}

function intervaloDatas(dataInicial, dataFinal, serie) {
  const hoje = new Date();
  const hojeUtc = dataUtc(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate());
  const final = normalizarData(dataFinal, "data final", hojeUtc);
  const inicial = normalizarData(dataInicial, "data inicial", serie.id === "selic" ? subtrairDias(final, 30) : subtrairMeses(final, 12));
  if (inicial > final) throw erroBcb("A data inicial deve ser anterior ou igual à data final.", "BAD_REQUEST");
  const limite = subtrairDias(final, 10 * 366);
  if (inicial < limite) throw erroBcb("O período máximo de consulta é de 10 anos.", "BAD_REQUEST");
  return { inicial, final };
}

function resolverSerie(serie) {
  const chave = String(serie || "ipca").trim().toLowerCase();
  const encontrada = BCB_SERIES[chave] || Object.values(BCB_SERIES).find((item) => item.codigo === chave);
  if (!encontrada) throw erroBcb("Série do Banco Central não suportada. Use IPCA ou Selic.", "BAD_REQUEST");
  return encontrada;
}

function itensSerie(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.value)) return payload.value;
  if (Array.isArray(payload?.valores)) return payload.valores;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizarDataObservacao(valor) {
  const texto = String(valor ?? "").trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [dia, mes, ano] = texto.split("/").map(Number);
    return dataUtc(ano, mes, dia);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    return dataUtc(ano, mes, dia);
  }
  return null;
}

function normalizarObservacao(item) {
  const data = normalizarDataObservacao(item?.data || item?.date);
  const valor = numero(item?.valor ?? item?.value);
  if (!data || valor === null) return null;
  return { data: dataBcb(data), dataIso: isoData(data), valor };
}

async function requisitarJson(url, fetchImpl = fetch) {
  let resposta;
  try {
    const opcoes = { headers: { Accept: "application/json", "User-Agent": "Sistema-Prefeitura-Inaja/1.0" } };
    if (typeof AbortSignal?.timeout === "function") opcoes.signal = AbortSignal.timeout(20_000);
    resposta = await fetchImpl(url, opcoes);
  } catch (erro) {
    if (erro?.name === "AbortError" || erro?.name === "TimeoutError") throw erroBcb("O Banco Central excedeu 20 segundos sem responder.", "BCB_TIMEOUT", 504);
    throw erro;
  }
  if (!respostaOk(resposta)) {
    let detalhe = "";
    try {
      const corpo = await resposta.json();
      detalhe = String(corpo?.message || corpo?.error || "").trim();
    } catch {
      detalhe = "";
    }
    const status = Number(resposta?.status || 0);
    throw erroBcb(`Banco Central respondeu HTTP ${status || "sem resposta"}${detalhe ? `: ${detalhe}` : ""}.`, "BCB_REMOTE_ERROR", 502);
  }
  try {
    return await resposta.json();
  } catch {
    throw erroBcb("O Banco Central devolveu uma resposta inválida.", "BCB_INVALID_RESPONSE", 502);
  }
}

async function comCache(chave, carregador, useCache = true) {
  const agora = Date.now();
  if (useCache) {
    const salvo = cache.get(chave);
    if (salvo && salvo.expiraEm > agora) return { valor: salvo.valor, emCache: true, consultadoEm: salvo.consultadoEm };
    const ativo = requisicoesAtivas.get(chave);
    if (ativo) return ativo;
  }
  const promessa = Promise.resolve().then(async () => {
    const valor = await carregador();
    const consultadoEm = new Date().toISOString();
    if (useCache) cache.set(chave, { valor, consultadoEm, expiraEm: Date.now() + CACHE_TTL_MS });
    return { valor, emCache: false, consultadoEm };
  }).finally(() => requisicoesAtivas.delete(chave));
  if (useCache) requisicoesAtivas.set(chave, promessa);
  return promessa;
}

export function limparCacheBcb() {
  cache.clear();
}

export function listarSeriesBcb() {
  return Object.values(BCB_SERIES).map((serie) => ({ ...serie }));
}

export async function consultarSerieBcb({ serie = "ipca", dataInicial, dataFinal } = {}, { fetchImpl = fetch, useCache = true } = {}) {
  const serieNormalizada = resolverSerie(serie);
  const intervalo = intervaloDatas(dataInicial, dataFinal, serieNormalizada);
  const parametros = new URLSearchParams({
    formato: "json",
    dataInicial: dataBcb(intervalo.inicial),
    dataFinal: dataBcb(intervalo.final),
  });
  const url = `${BCB_URLS.api}.${serieNormalizada.codigo}/dados?${parametros.toString()}`;
  const resultado = await comCache(url, () => requisitarJson(url, fetchImpl), useCache);
  const observacoes = itensSerie(resultado.valor)
    .map(normalizarObservacao)
    .filter(Boolean)
    .filter((item) => item.dataIso >= isoData(intervalo.inicial) && item.dataIso <= isoData(intervalo.final))
    .sort((a, b) => a.dataIso.localeCompare(b.dataIso));
  return {
    serie: { ...serieNormalizada },
    dataInicial: isoData(intervalo.inicial),
    dataFinal: isoData(intervalo.final),
    observacoes,
    total: observacoes.length,
    fonte: url,
    consultadoEm: resultado.consultadoEm,
    emCache: resultado.emCache,
  };
}

function arredondarCentavos(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export async function calcularAtualizacaoBcb({ valor, serie = "ipca", dataInicial, dataFinal } = {}, { fetchImpl = fetch, useCache = true } = {}) {
  const principal = numero(valor);
  if (principal === null || principal < 0) throw erroBcb("Informe um valor inicial válido e não negativo.", "BAD_REQUEST");
  const dados = await consultarSerieBcb({ serie, dataInicial, dataFinal }, { fetchImpl, useCache });
  if (!dados.observacoes.length) throw erroBcb("Não há observações do Banco Central no período informado.", "BCB_NO_DATA", 422);
  let fator = 1;
  for (const observacao of dados.observacoes) {
    if (observacao.valor <= -100) throw erroBcb("A série do Banco Central contém uma taxa inválida.", "BCB_INVALID_VALUE", 502);
    fator *= 1 + observacao.valor / 100;
  }
  const percentualAcumulado = (fator - 1) * 100;
  const valorAtualizado = arredondarCentavos(principal * fator);
  return {
    serie: dados.serie,
    dataInicial: dados.dataInicial,
    dataFinal: dados.dataFinal,
    principal: arredondarCentavos(principal),
    fator,
    percentualAcumulado,
    valorAtualizado,
    acrescimo: arredondarCentavos(valorAtualizado - principal),
    observacoesAplicadas: dados.observacoes.length,
    fonte: dados.fonte,
    consultadoEm: dados.consultadoEm,
    emCache: dados.emCache,
  };
}

export function configuracaoBcb() {
  return {
    cacheMinutos: CACHE_TTL_MS / 60_000,
    fonte: BCB_URLS.api,
    series: listarSeriesBcb(),
  };
}
