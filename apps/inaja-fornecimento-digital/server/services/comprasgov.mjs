// Integração read-only com os dados abertos do Compras.gov.br/SIASG.

export const COMPRAS_GOV_URLS = Object.freeze({
  api: "https://dadosabertos.compras.gov.br",
  portal: "https://www.gov.br/compras/pt-br/cidadao/portal-de-dados-abertos/portal-de-dados-abertos",
  swagger: "https://dadosabertos.compras.gov.br/swagger-ui/index.html",
  catalogoMaterial: "https://dadosabertos.compras.gov.br/modulo-material/4_consultarItemMaterial",
  catalogoServico: "https://dadosabertos.compras.gov.br/modulo-servico/6_consultarItemServico",
  precosMaterial: "https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial",
  precosServico: "https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/3_consultarServico",
});

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map();
const requisicoesAtivas = new Map();

function erroComprasGov(message, code = "COMPRAS_GOV_ERROR", statusCode = 400) {
  const erro = new Error(message);
  erro.code = code;
  erro.statusCode = statusCode;
  return erro;
}

function texto(valor) {
  if (valor === undefined || valor === null) return null;
  const resultado = String(valor).trim();
  return resultado || null;
}

function numero(valor, padrao = null) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : padrao;
  const bruto = String(valor ?? "").trim();
  if (!bruto) return padrao;
  const normalizado = bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto;
  const resultado = Number(normalizado);
  return Number.isFinite(resultado) ? resultado : padrao;
}

function inteiro(valor, padrao = null) {
  const resultado = numero(valor, padrao);
  return resultado === null ? padrao : Math.trunc(resultado);
}

function arredondar(valor) {
  return valor === null || valor === undefined ? null : Math.round((valor + Number.EPSILON) * 100) / 100;
}

function respostaOk(resposta) {
  return Boolean(resposta && (resposta.ok === true || (resposta.ok === undefined && Number(resposta.status) >= 200 && Number(resposta.status) < 300)));
}

async function requisitarJson(url, fetchImpl = fetch) {
  let resposta;
  try {
    const opcoes = {
      headers: {
        Accept: "application/json",
        "User-Agent": "Sistema-Prefeitura-Inaja/1.0",
      },
    };
    if (typeof AbortSignal?.timeout === "function") opcoes.signal = AbortSignal.timeout(20_000);
    resposta = await fetchImpl(url, opcoes);
  } catch (erro) {
    if (erro?.name === "AbortError" || erro?.name === "TimeoutError") throw erroComprasGov("O Compras.gov.br excedeu 20 segundos sem responder.", "COMPRAS_GOV_TIMEOUT", 504);
    throw erroComprasGov(`Não foi possível consultar o Compras.gov.br: ${erro?.message || erro}`, "COMPRAS_GOV_NETWORK_ERROR", 502);
  }
  if (!respostaOk(resposta)) {
    let detalhe = "";
    try {
      const corpo = await resposta.json();
      detalhe = texto(corpo?.message || corpo?.mensagem || corpo?.error || corpo?.erro) || "";
    } catch {
      detalhe = "";
    }
    const status = Number(resposta?.status || 0);
    throw erroComprasGov(`Compras.gov.br respondeu HTTP ${status || "sem resposta"}${detalhe ? `: ${detalhe}` : ""}.`, status === 400 ? "COMPRAS_GOV_BAD_REQUEST" : "COMPRAS_GOV_REMOTE_ERROR", status === 400 ? 400 : 502);
  }
  try {
    return await resposta.json();
  } catch {
    throw erroComprasGov("O Compras.gov.br devolveu uma resposta inválida.", "COMPRAS_GOV_INVALID_RESPONSE", 502);
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

function resolverTipo(tipo) {
  const chave = String(tipo || "material").trim().toLocaleLowerCase("pt-BR");
  if (chave === "material" || chave === "catmat") return "material";
  if (chave === "servico" || chave === "serviço" || chave === "catser") return "servico";
  throw erroComprasGov("O tipo deve ser material (CATMAT) ou serviço (CATSER).", "BAD_REQUEST");
}

function normalizarPagina(valor, padrao, maximo) {
  const pagina = inteiro(valor, padrao);
  if (!Number.isFinite(pagina) || pagina < 1) throw erroComprasGov("A página informada é inválida.", "BAD_REQUEST");
  return pagina;
}

function normalizarTamanhoPagina(valor, padrao = 30) {
  const tamanho = inteiro(valor, padrao);
  if (!Number.isFinite(tamanho) || tamanho < 1) throw erroComprasGov("O tamanho da página informado é inválido.", "BAD_REQUEST");
  return Math.min(500, Math.max(10, tamanho));
}

function normalizarCodigo(valor, nome = "código do item") {
  const codigo = String(valor ?? "").trim();
  if (!codigo) return "";
  if (!/^\d+$/.test(codigo)) throw erroComprasGov(`O ${nome} deve conter apenas números.`, "BAD_REQUEST");
  return codigo;
}

function normalizarFiltroDigitos(valor, nome) {
  const filtro = String(valor ?? "").trim();
  if (!filtro) return "";
  if (!/^\d+$/.test(filtro)) throw erroComprasGov(`O filtro ${nome} deve conter apenas números.`, "BAD_REQUEST");
  return filtro;
}

function normalizarUf(valor) {
  const uf = String(valor ?? "").trim().toUpperCase();
  if (!uf) return "";
  if (!/^[A-Z]{2}$/.test(uf)) throw erroComprasGov("Informe a UF com duas letras.", "BAD_REQUEST");
  return uf;
}

function raizResposta(payload) {
  if (payload?.resultado && !Array.isArray(payload.resultado)) return payload.resultado;
  if (payload?.data && !Array.isArray(payload.data)) return payload.data;
  return payload;
}

function itensResposta(payload) {
  if (Array.isArray(payload)) return payload;
  const raiz = raizResposta(payload);
  return [
    raiz?.itens,
    raiz?.items,
    raiz?.content,
    raiz?.dados,
    raiz?.registros,
    raiz?.resultado,
    payload?.items,
    payload?.content,
    payload?.data,
    payload?.rows,
  ].find(Array.isArray) || [];
}

function primeiroNumero(...valores) {
  for (const valor of valores) {
    const resultado = numero(valor);
    if (resultado !== null) return resultado;
  }
  return null;
}

function metadadosResposta(payload, pagina, tamanhoPagina, quantidadeItens) {
  const raiz = raizResposta(payload);
  const total = primeiroNumero(raiz?.totalRegistros, raiz?.total, raiz?.quantidadeTotal, payload?.totalRegistros, payload?.total, quantidadeItens) ?? quantidadeItens;
  const totalPaginasInformado = primeiroNumero(raiz?.totalPaginas, raiz?.totalPages, raiz?.quantidadePaginas, payload?.totalPaginas, payload?.totalPages);
  const totalPaginas = Math.max(1, Math.trunc(totalPaginasInformado ?? Math.ceil(total / tamanhoPagina)));
  const paginasRestantesInformado = primeiroNumero(raiz?.paginasRestantes, raiz?.remainingPages, payload?.paginasRestantes);
  return {
    total: Math.max(0, Math.trunc(total)),
    totalPaginas,
    paginasRestantes: Math.max(0, Math.trunc(paginasRestantesInformado ?? Math.max(0, totalPaginas - pagina))),
  };
}

function nomeCampo(item, ...campos) {
  for (const campo of campos) {
    const valor = texto(item?.[campo]);
    if (valor) return valor;
  }
  return null;
}

function normalizarCatalogoItem(item, tipo) {
  if (tipo === "material") {
    const codigo = nomeCampo(item, "codigoItem", "codigo_item", "codigo");
    const descricao = nomeCampo(item, "descricaoItem", "descricao_item", "descricao", "nomeItem");
    if (!codigo || !descricao) return null;
    const codigoNcm = nomeCampo(item, "codigoNcm", "codigo_ncm", "ncm");
    const descricaoNcm = nomeCampo(item, "descricaoNcm", "descricao_ncm");
    return {
      tipo,
      codigo,
      descricao,
      grupo: nomeCampo(item, "nomeGrupo", "descricaoGrupo", "grupo"),
      classe: nomeCampo(item, "nomeClasse", "descricaoClasse", "classe"),
      pdm: nomeCampo(item, "nomePdm", "descricaoPdm", "pdm"),
      status: item?.statusItem ?? item?.status ?? null,
      sustentavel: item?.itemSustentavel ?? item?.sustentavel ?? null,
      ncm: codigoNcm ? `${codigoNcm}${descricaoNcm ? ` · ${descricaoNcm}` : ""}` : descricaoNcm,
    };
  }
  const codigo = nomeCampo(item, "codigoServico", "codigo_servico", "codigo");
  const descricao = nomeCampo(item, "nomeServico", "descricaoServico", "descricao_servico", "descricao");
  if (!codigo || !descricao) return null;
  return {
    tipo,
    codigo,
    descricao,
    grupo: nomeCampo(item, "nomeGrupo", "descricaoGrupo", "grupo"),
    classe: nomeCampo(item, "nomeClasse", "descricaoClasse", "classe"),
    pdm: null,
    status: item?.statusServico ?? item?.status ?? null,
    sustentavel: null,
    ncm: null,
  };
}

function normalizarPreco(item, tipo) {
  const precoUnitario = primeiroNumero(item?.precoUnitario, item?.preco_unitario, item?.valorUnitario, item?.valor_unitario);
  return {
    tipo,
    idCompra: nomeCampo(item, "idCompra", "id_compra", "numeroCompra"),
    idItemCompra: nomeCampo(item, "idItemCompra", "id_item_compra"),
    forma: nomeCampo(item, "forma", "formaContratacao"),
    modalidade: nomeCampo(item, "modalidade", "modalidadeCompra"),
    criterioJulgamento: nomeCampo(item, "criterioJulgamento", "criterio_julgamento"),
    numeroItemCompra: nomeCampo(item, "numeroItemCompra", "numero_item_compra"),
    descricaoItem: nomeCampo(item, "descricaoItem", "descricao_item", "descricao", "nomeServico"),
    codigoItemCatalogo: nomeCampo(item, "codigoItemCatalogo", "codigo_item_catalogo", "codigoItem", "codigoServico"),
    unidade: nomeCampo(item, "unidadeFornecimento", "descricaoUnidadeFornecimento", "unidadeMedida", "unidade"),
    quantidade: primeiroNumero(item?.quantidade),
    precoUnitario: precoUnitario === null ? null : arredondar(precoUnitario),
    percentualMaiorDesconto: primeiroNumero(item?.percentualMaiorDesconto, item?.percentual_maior_desconto),
    fornecedor: nomeCampo(item, "nomeFornecedor", "fornecedor", "razaoSocialFornecedor"),
    fornecedorCnpj: nomeCampo(item, "cnpjFornecedor", "cpfCnpjFornecedor", "fornecedorCnpj"),
    codigoUasg: nomeCampo(item, "codigoUasg", "codigo_uasg", "uasg"),
    nomeUasg: nomeCampo(item, "nomeUasg", "nome_uasg", "uasgNome"),
    codigoMunicipio: nomeCampo(item, "codigoMunicipio", "codigo_municipio"),
    municipio: nomeCampo(item, "municipio", "nomeMunicipio", "nome_municipio"),
    estado: nomeCampo(item, "estado", "uf", "siglaUf"),
    codigoOrgao: nomeCampo(item, "codigoOrgao", "codigo_orgao"),
    nomeOrgao: nomeCampo(item, "nomeOrgao", "nome_orgao", "orgao"),
    poder: nomeCampo(item, "poder"),
    esfera: nomeCampo(item, "esfera"),
    dataCompra: nomeCampo(item, "dataCompra", "data_compra"),
    dataResultado: nomeCampo(item, "dataResultado", "data_resultado"),
  };
}

function calcularResumo(rows, total) {
  const valores = rows.map((item) => item.precoUnitario).filter((valor) => Number.isFinite(valor) && valor >= 0).sort((a, b) => a - b);
  const meio = Math.floor(valores.length / 2);
  const mediana = valores.length ? (valores.length % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2) : null;
  const media = valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : null;
  return {
    totalRegistros: total,
    comPreco: valores.length,
    minimo: valores.length ? arredondar(valores[0]) : null,
    mediana: arredondar(mediana),
    media: arredondar(media),
    maximo: valores.length ? arredondar(valores[valores.length - 1]) : null,
  };
}

export function limparCacheComprasGov() {
  cache.clear();
}

export async function buscarCatalogoComprasGov({ tipo = "material", busca = "", codigo = "", pagina = 1, tamanhoPagina = 30 } = {}, { fetchImpl = fetch, useCache = true } = {}) {
  const tipoNormalizado = resolverTipo(tipo);
  const termo = String(busca ?? "").trim().slice(0, 120);
  const codigoInformado = String(codigo ?? "").trim() || (/^\d+$/.test(termo) ? termo : "");
  const codigoNormalizado = normalizarCodigo(codigoInformado);
  if (tipoNormalizado === "servico" && !codigoNormalizado) throw erroComprasGov("Para pesquisar serviços, informe o código CATSER.", "BAD_REQUEST");
  if (tipoNormalizado === "material" && !codigoNormalizado && !termo) throw erroComprasGov("Informe o código CATMAT ou uma descrição de material.", "BAD_REQUEST");
  const paginaNormalizada = normalizarPagina(pagina, 1, 500);
  const tamanhoNormalizado = normalizarTamanhoPagina(tamanhoPagina, 30);
  const endpoint = tipoNormalizado === "material" ? COMPRAS_GOV_URLS.catalogoMaterial : COMPRAS_GOV_URLS.catalogoServico;
  const parametros = new URLSearchParams({ pagina: String(paginaNormalizada), tamanhoPagina: String(tamanhoNormalizado) });
  if (tipoNormalizado === "material") {
    if (codigoNormalizado) parametros.set("codigoItem", codigoNormalizado);
    else parametros.set("descricaoItem", termo);
  } else {
    parametros.set("codigoServico", codigoNormalizado);
  }
  const url = `${endpoint}?${parametros.toString()}`;
  const resultado = await comCache(url, () => requisitarJson(url, fetchImpl), useCache);
  const itens = itensResposta(resultado.valor).map((item) => normalizarCatalogoItem(item, tipoNormalizado)).filter(Boolean);
  const meta = metadadosResposta(resultado.valor, paginaNormalizada, tamanhoNormalizado, itens.length);
  return {
    tipo: tipoNormalizado,
    itens,
    pagina: paginaNormalizada,
    ...meta,
    filtros: { busca: termo, codigo: codigoNormalizado },
    fonte: url,
    consultadoEm: resultado.consultadoEm,
    emCache: resultado.emCache,
    configuracao: configuracaoComprasGov(),
  };
}

export async function consultarPrecosComprasGov({ tipo = "material", codigo, codigoUasg = "", estado = "", codigoMunicipio = "", pagina = 1, tamanhoPagina = 100 } = {}, { fetchImpl = fetch, useCache = true } = {}) {
  const tipoNormalizado = resolverTipo(tipo);
  const codigoNormalizado = normalizarCodigo(codigo);
  if (!codigoNormalizado) throw erroComprasGov("Selecione um item CATMAT/CATSER antes de consultar os preços.", "BAD_REQUEST");
  const uasg = normalizarFiltroDigitos(codigoUasg, "UASG");
  const uf = normalizarUf(estado);
  const municipio = normalizarFiltroDigitos(codigoMunicipio, "código do município");
  const paginaNormalizada = normalizarPagina(pagina, 1, 500);
  const tamanhoNormalizado = normalizarTamanhoPagina(tamanhoPagina, 100);
  const endpoint = tipoNormalizado === "material" ? COMPRAS_GOV_URLS.precosMaterial : COMPRAS_GOV_URLS.precosServico;
  const parametros = new URLSearchParams({ pagina: String(paginaNormalizada), tamanhoPagina: String(tamanhoNormalizado) });
  if (tipoNormalizado === "material") {
    parametros.set("tipo", "codigoItemCatalogo");
    parametros.set("codigo", codigoNormalizado);
  } else {
    parametros.set("codigoItemCatalogo", codigoNormalizado);
  }
  if (uasg) parametros.set("codigoUasg", uasg);
  if (uf) parametros.set("estado", uf);
  if (municipio) parametros.set("codigoMunicipio", municipio);
  const url = `${endpoint}?${parametros.toString()}`;
  const resultado = await comCache(url, () => requisitarJson(url, fetchImpl), useCache);
  const rows = itensResposta(resultado.valor).map((item) => normalizarPreco(item, tipoNormalizado));
  const meta = metadadosResposta(resultado.valor, paginaNormalizada, tamanhoNormalizado, rows.length);
  return {
    tipo: tipoNormalizado,
    codigo: codigoNormalizado,
    rows,
    pagina: paginaNormalizada,
    ...meta,
    resumo: calcularResumo(rows, meta.total),
    filtros: { codigoUasg: uasg, estado: uf, codigoMunicipio: municipio },
    fonte: url,
    consultadoEm: resultado.consultadoEm,
    emCache: resultado.emCache,
    configuracao: configuracaoComprasGov(),
  };
}

export function configuracaoComprasGov() {
  return {
    cacheMinutos: CACHE_TTL_MS / 60_000,
    fonte: COMPRAS_GOV_URLS.portal,
    api: COMPRAS_GOV_URLS.api,
    swagger: COMPRAS_GOV_URLS.swagger,
  };
}
