// Integração read-only com o Portal de Dados Abertos do SUS / CNES.

export const SAUDE_URLS = Object.freeze({
  api: "https://apidadosabertos.saude.gov.br",
  estabelecimentos: "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos",
  tiposUnidade: "https://apidadosabertos.saude.gov.br/cnes/tipounidades",
  hospitaisLeitos: "https://apidadosabertos.saude.gov.br/assistencia-a-saude/hospitais-e-leitos",
  fonteCnes: "https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude",
  consultaCnes: "https://datasus.saude.gov.br/cnes-estabelecimentos/",
});

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();
const requisicoesAtivas = new Map();

function texto(valor) {
  if (valor === undefined || valor === null) return null;
  const resultado = String(valor).trim();
  return resultado || null;
}

function digitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function inteiro(valor, padrao = null) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.trunc(numero) : padrao;
}

function decimal(valor, padrao = null) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return padrao;
  const numero = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
  return Number.isFinite(numero) ? numero : padrao;
}

function respostaOk(resposta) {
  return Boolean(resposta && (resposta.ok === true || (resposta.ok === undefined && Number(resposta.status) >= 200 && Number(resposta.status) < 300)));
}

function erroSaude(message, code = "SAUDE_ERROR", statusCode = 400) {
  const erro = new Error(message);
  erro.code = code;
  erro.statusCode = statusCode;
  return erro;
}

export function normalizarCodigoCnes(valor) {
  const codigo = digitos(valor);
  if (!codigo) return "";
  if (codigo.length > 7) throw erroSaude("O código CNES deve ter até 7 dígitos.", "BAD_REQUEST");
  return codigo.padStart(7, "0");
}

/**
 * A API CNES usa o código municipal de seis dígitos. O código municipal completo
 * usado por outras integrações possui sete dígitos e termina com o dígito verificador.
 */
export function normalizarCodigoMunicipio(valor) {
  const codigo = digitos(valor);
  if (!codigo) return "";
  if (codigo.length === 7) return codigo.slice(0, 6);
  if (codigo.length === 6) return codigo;
  throw erroSaude("O código do município deve ter 6 ou 7 dígitos.", "BAD_REQUEST");
}

export function normalizarCodigoUf(valor) {
  const codigo = digitos(valor);
  if (!codigo) return "";
  if (codigo.length !== 2) throw erroSaude("O código da UF deve ter 2 dígitos.", "BAD_REQUEST");
  return codigo;
}

function normalizarCodigoTipoUnidade(valor) {
  const codigo = digitos(valor);
  if (!codigo) return "";
  if (codigo.length > 3) throw erroSaude("O tipo de unidade informado é inválido.", "BAD_REQUEST");
  return codigo;
}

function normalizarStatus(valor) {
  const status = String(valor ?? "").trim().toLowerCase();
  if (!status || status === "todos" || status === "all") return "";
  if (["1", "ativo", "ativa"].includes(status)) return "1";
  if (["0", "inativo", "inativa"].includes(status)) return "0";
  throw erroSaude("O status deve ser ativo, inativo ou todos.", "BAD_REQUEST");
}

function normalizarPagina(valor) {
  const pagina = inteiro(valor, 1);
  return Math.min(10_000, Math.max(1, pagina));
}

function normalizarLimite(valor) {
  const limite = inteiro(valor, 20);
  return Math.min(20, Math.max(1, limite));
}

function primeiro(objeto, chaves, padrao = null) {
  for (const chave of chaves) {
    const valor = objeto?.[chave];
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") return valor;
  }
  return padrao;
}

function simNao(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return null;
  if (typeof valor === "number") return valor === 1;
  const normalizado = String(valor).trim().toUpperCase();
  if (["1", "SIM", "S", "TRUE"].includes(normalizado)) return true;
  if (["0", "NAO", "NÃO", "N", "FALSE"].includes(normalizado)) return false;
  return null;
}

function normalizarCnpj(valor) {
  const cnpj = digitos(valor);
  return cnpj.length === 14 ? cnpj : null;
}

export function normalizarEstabelecimentoCnes(item = {}) {
  const codigoCnes = normalizarCodigoCnes(primeiro(item, ["codigo_cnes", "cnes"]));
  const motivoDesabilitacao = texto(primeiro(item, ["codigo_motivo_desabilitacao_estabelecimento", "motivo_desabilitacao"]));
  const ambulatorialSus = simNao(item.estabelecimento_faz_atendimento_ambulatorial_sus);
  const capacidades = {
    centroCirurgico: simNao(item.estabelecimento_possui_centro_cirurgico),
    centroObstetrico: simNao(item.estabelecimento_possui_centro_obstetrico),
    centroNeonatal: simNao(item.estabelecimento_possui_centro_neonatal),
    atendimentoHospitalar: simNao(item.estabelecimento_possui_atendimento_hospitalar),
    servicoApoio: simNao(item.estabelecimento_possui_servico_apoio),
    atendimentoAmbulatorial: simNao(item.estabelecimento_possui_atendimento_ambulatorial),
  };
  return {
    codigoCnes: codigoCnes || null,
    codigoEstabelecimentoSaude: texto(item.codigo_estabelecimento_saude),
    cnpjEntidade: normalizarCnpj(primeiro(item, ["numero_cnpj_entidade", "numero_cnpj"])),
    razaoSocial: texto(primeiro(item, ["nome_razao_social", "razao_social"])),
    nomeFantasia: texto(primeiro(item, ["nome_fantasia", "nome_razao_social", "razao_social"])),
    naturezaOrganizacaoEntidade: texto(item.natureza_organizacao_entidade),
    naturezaJuridica: texto(item.descricao_natureza_juridica_estabelecimento),
    tipoGestao: texto(item.tipo_gestao),
    nivelHierarquia: texto(item.descricao_nivel_hierarquia),
    esferaAdministrativa: texto(item.descricao_esfera_administrativa),
    codigoTipoUnidade: inteiro(item.codigo_tipo_unidade),
    cep: texto(item.codigo_cep_estabelecimento),
    logradouro: texto(item.endereco_estabelecimento),
    numero: texto(item.numero_estabelecimento),
    complemento: texto(item.complemento_estabelecimento),
    bairro: texto(item.bairro_estabelecimento),
    telefone: texto(item.numero_telefone_estabelecimento),
    email: texto(item.endereco_email_estabelecimento),
    latitude: decimal(item.latitude_estabelecimento_decimo_grau),
    longitude: decimal(item.longitude_estabelecimento_decimo_grau),
    codigoUf: inteiro(item.codigo_uf),
    codigoMunicipio: texto(item.codigo_municipio),
    codigoAtividadeEnsino: texto(item.codigo_atividade_ensino_unidade),
    codigoTurnoAtendimento: texto(item.codigo_identificador_turno_atendimento),
    descricaoTurnoAtendimento: texto(item.descricao_turno_atendimento),
    atendeAmbulatorialSus: ambulatorialSus,
    atendeAmbulatorialSusTexto: texto(item.estabelecimento_faz_atendimento_ambulatorial_sus),
    capacidades,
    motivoDesabilitacao,
    ativo: motivoDesabilitacao === null,
    dataAtualizacao: texto(item.data_atualizacao),
  };
}

export function normalizarTipoUnidadeCnes(item = {}) {
  return {
    codigo: inteiro(primeiro(item, ["codigo_tipo_unidade", "codigo"])),
    descricao: texto(primeiro(item, ["descricao_tipo_unidade", "descricao"])),
  };
}

function itensEstabelecimentos(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.estabelecimentos)) return payload.estabelecimentos;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function itensTipos(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.tipos_unidade)) return payload.tipos_unidade;
  if (Array.isArray(payload?.tiposUnidade)) return payload.tiposUnidade;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function semAcentos(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function resumoEstabelecimentos(registros) {
  const conta = (predicado) => registros.filter(predicado).length;
  return {
    unidades: registros.length,
    ativas: conta((item) => item.ativo),
    inativas: conta((item) => !item.ativo),
    municipais: conta((item) => semAcentos(item.esferaAdministrativa).includes("municipal") || item.tipoGestao === "M"),
    atendimentoAmbulatorial: conta((item) => item.capacidades.atendimentoAmbulatorial === true),
    atendimentoHospitalar: conta((item) => item.capacidades.atendimentoHospitalar === true),
    centroCirurgico: conta((item) => item.capacidades.centroCirurgico === true),
    centroObstetrico: conta((item) => item.capacidades.centroObstetrico === true),
    centroNeonatal: conta((item) => item.capacidades.centroNeonatal === true),
  };
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
    if (typeof AbortSignal?.timeout === "function") opcoes.signal = AbortSignal.timeout(30_000);
    resposta = await fetchImpl(url, opcoes);
  } catch (erro) {
    if (erro?.name === "AbortError" || erro?.name === "TimeoutError") throw erroSaude("O DATASUS excedeu 30 segundos sem responder.", "SAUDE_TIMEOUT", 504);
    throw erro;
  }
  if (!respostaOk(resposta)) {
    let detalhe = "";
    try {
      const corpo = await resposta.json();
      detalhe = texto(corpo?.message || corpo?.error || corpo?.detail) || "";
    } catch {
      detalhe = "";
    }
    const status = Number(resposta?.status || 0);
    throw erroSaude(
      status === 404 ? "Estabelecimento CNES não encontrado." : `DATASUS respondeu HTTP ${status || "sem resposta"}${detalhe ? `: ${detalhe}` : ""}`,
      status === 404 ? "NOT_FOUND" : "SAUDE_REMOTE_ERROR",
      status === 404 ? 404 : 502,
    );
  }
  try {
    return await resposta.json();
  } catch {
    throw erroSaude("O DATASUS devolveu uma resposta inválida.", "SAUDE_INVALID_RESPONSE", 502);
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

export function limparCacheSaude() {
  cache.clear();
}

export async function listarTiposCnes({ fetchImpl = fetch, useCache = true } = {}) {
  const resultado = await comCache(
    "tipos-unidade",
    () => requisitarJson(SAUDE_URLS.tiposUnidade, fetchImpl),
    useCache,
  );
  const tipos = itensTipos(resultado.valor)
    .map(normalizarTipoUnidadeCnes)
    .filter((item) => Number.isInteger(item.codigo) && item.codigo > 0 && item.descricao)
    .sort((a, b) => a.codigo - b.codigo);
  return {
    tipos,
    fonte: SAUDE_URLS.tiposUnidade,
    consultadoEm: resultado.consultadoEm,
    emCache: resultado.emCache,
  };
}

export async function consultarCnes({
  cnes = "",
  codigoMunicipio = "",
  codigoUf = "",
  codigoTipoUnidade = "",
  status = "",
  busca = "",
  pagina = 1,
  limite = 20,
} = {}, { fetchImpl = fetch, useCache = true } = {}) {
  const codigoCnes = normalizarCodigoCnes(cnes);
  const municipio = normalizarCodigoMunicipio(codigoMunicipio);
  const uf = normalizarCodigoUf(codigoUf);
  const tipo = normalizarCodigoTipoUnidade(codigoTipoUnidade);
  const statusNormalizado = normalizarStatus(status);
  const paginaNormalizada = normalizarPagina(pagina);
  const limiteNormalizado = normalizarLimite(limite);
  const buscaNormalizada = String(busca || "").trim().slice(0, 100);

  if (!codigoCnes && !municipio && !uf) {
    throw erroSaude("Informe um CNES, código do município ou código de UF para consultar a rede.", "BAD_REQUEST");
  }

  if (codigoCnes) {
    const chave = `cnes:${codigoCnes}`;
    const resultado = await comCache(chave, () => requisitarJson(`${SAUDE_URLS.estabelecimentos}/${codigoCnes}`, fetchImpl), useCache);
    const registro = normalizarEstabelecimentoCnes(resultado.valor);
    return {
      modo: "detalhe",
      registro,
      registros: [registro],
      pagina: 1,
      limite: 1,
      temMais: false,
      resumo: resumoEstabelecimentos([registro]),
      filtros: { cnes: codigoCnes, codigoMunicipio: null, codigoUf: null, codigoTipoUnidade: null, status: null, busca: "" },
      fonte: SAUDE_URLS.estabelecimentos,
      consultadoEm: resultado.consultadoEm,
      emCache: resultado.emCache,
    };
  }

  const parametros = new URLSearchParams({ limit: String(limiteNormalizado), offset: String(paginaNormalizada - 1) });
  if (municipio) parametros.set("codigo_municipio", municipio);
  if (uf) parametros.set("codigo_uf", uf);
  if (tipo) parametros.set("codigo_tipo_unidade", tipo);
  if (statusNormalizado) parametros.set("status", statusNormalizado);
  const url = `${SAUDE_URLS.estabelecimentos}?${parametros.toString()}`;
  const chave = `lista:${url}`;
  const resultado = await comCache(chave, () => requisitarJson(url, fetchImpl), useCache);
  const registrosBrutos = itensEstabelecimentos(resultado.valor).map(normalizarEstabelecimentoCnes);
  const termo = semAcentos(buscaNormalizada);
  const registros = termo
    ? registrosBrutos.filter((item) => semAcentos(`${item.nomeFantasia} ${item.razaoSocial} ${item.codigoCnes} ${item.bairro}`).includes(termo))
    : registrosBrutos;
  return {
    modo: "lista",
    registro: null,
    registros,
    pagina: paginaNormalizada,
    limite: limiteNormalizado,
    temMais: registrosBrutos.length >= limiteNormalizado,
    resumo: resumoEstabelecimentos(registros),
    filtros: { cnes: null, codigoMunicipio: municipio || null, codigoUf: uf || null, codigoTipoUnidade: tipo || null, status: statusNormalizado || null, busca: buscaNormalizada },
    fonte: SAUDE_URLS.estabelecimentos,
    consultadoEm: resultado.consultadoEm,
    emCache: resultado.emCache,
  };
}

export function configuracaoSaude() {
  return {
    cacheMinutos: CACHE_TTL_MS / 60_000,
    fonte: SAUDE_URLS.fonteCnes,
    consulta: SAUDE_URLS.consultaCnes,
  };
}
