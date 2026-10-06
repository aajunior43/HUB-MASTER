const TCU_CERTIDOES_URL = "https://certidoes-apf.apps.tcu.gov.br/api/rest/publico";
const TCU_INIDONEOS_URL = "https://certidoes.apps.tcu.gov.br/api/publico/responsaveis-inidoneos";
export const PORTAL_URL = "https://api.portaldatransparencia.gov.br/api-de-dados";
const CACHE_TTL_MS = 10 * 60 * 1000;
const PORTAL_PAGE_SIZE_HINT = 15;
const cache = new Map();
const consultasAtivas = new Map();

export const TRANSPARENCIA_URLS = Object.freeze({
  tcuCertidoes: TCU_CERTIDOES_URL,
  tcuInidoneos: TCU_INIDONEOS_URL,
  portalApi: PORTAL_URL,
  portalConsultaSancoes: "https://portaldatransparencia.gov.br/sancoes/consulta",
  portalConsultaContratos: "https://portaldatransparencia.gov.br/contratos/consulta",
});

function digitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function cnpjValido(cnpj) {
  const valor = digitos(cnpj);
  if (valor.length !== 14 || valor === valor[0].repeat(14)) return false;
  const numeros = [...valor].map(Number);
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const resto1 = numeros.slice(0, 12).reduce((total, numero, indice) => total + numero * pesos1[indice], 0) % 11;
  if (numeros[12] !== (resto1 < 2 ? 0 : 11 - resto1)) return false;
  const resto2 = numeros.slice(0, 13).reduce((total, numero, indice) => total + numero * pesos2[indice], 0) % 11;
  return numeros[13] === (resto2 < 2 ? 0 : 11 - resto2);
}

function formatarCnpj(cnpj) {
  const valor = digitos(cnpj);
  return valor.length === 14 ? `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}/${valor.slice(8, 12)}-${valor.slice(12)}` : valor;
}

function texto(valor) {
  return valor == null ? "" : String(valor).trim();
}

function primeiro(objeto, chaves) {
  for (const chave of chaves) {
    const valor = objeto?.[chave];
    if (valor !== null && valor !== undefined && valor !== "") return valor;
  }
  return null;
}

function arrayResposta(resposta) {
  if (Array.isArray(resposta)) return resposta;
  for (const chave of ["data", "content", "items", "resultado", "results"]) {
    if (Array.isArray(resposta?.[chave])) return resposta[chave];
  }
  return [];
}

function semAcentos(valor) {
  return texto(valor).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").toUpperCase();
}

function erroTexto(erro) {
  return texto(erro?.message || erro) || "Fonte externa indisponível";
}

async function requisitarJson(url, opcoes = {}) {
  const fetchImpl = opcoes.fetchImpl || fetch;
  const headers = {
    Accept: "application/json",
    "User-Agent": "Sistema-Prefeitura-Inaja/1.0",
    ...(opcoes.apiKey ? { "chave-api-dados": opcoes.apiKey } : {}),
    ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
    ...(opcoes.headers || {}),
  };
  let resposta;
  try {
    resposta = await fetchImpl(url, {
      method: opcoes.method || "GET",
      headers,
      ...(opcoes.body ? { body: JSON.stringify(opcoes.body) } : {}),
      signal: AbortSignal.timeout(opcoes.timeoutMs || 20_000),
    });
  } catch (erro) {
    if (erro?.name === "AbortError" || erro?.name === "TimeoutError") throw new Error("Fonte de transparência excedeu 20 segundos sem responder");
    throw erro;
  }
  if (!resposta.ok) {
    let detalhe = "";
    try {
      const corpo = await resposta.json();
      detalhe = texto(corpo?.message || corpo?.mensagem || corpo?.detail);
    } catch {
      try { detalhe = texto(await resposta.text()); } catch { detalhe = ""; }
    }
    throw new Error(`${opcoes.nome || "Fonte de transparência"} respondeu HTTP ${resposta.status}${detalhe ? `: ${detalhe.slice(0, 180)}` : ""}`);
  }
  return resposta.json();
}

function normalizarCertidao(certidao) {
  return {
    emissor: texto(certidao?.emissor),
    tipo: texto(certidao?.tipo),
    descricao: texto(certidao?.descricao),
    situacao: texto(certidao?.situacao),
    dataEmissao: texto(certidao?.dataHoraEmissao),
    observacao: texto(certidao?.observacao),
    link: texto(certidao?.linkConsultaManual),
  };
}

function normalizarInidoneo(registro) {
  return {
    nome: texto(registro?.nome),
    registro: texto(registro?.numeroRegistro),
    processo: texto(registro?.numeroProcessoFormatado),
    acordo: texto(registro?.numeroAcordaoFormatado),
    dataAcordao: texto(registro?.dataAcordao),
    transitoEmJulgado: texto(registro?.dataTransitoEmJulgado),
    fimSancao: texto(registro?.dataFinalSancao),
    municipio: texto(registro?.municipio),
    uf: texto(registro?.uf),
    linkProcesso: texto(registro?.linkAcompanhamentoProcesso),
    linkDeliberacao: texto(registro?.linkDeliberacoesProcesso),
  };
}

function normalizarSancao(registro, cadastro) {
  const tipo = registro?.tipoSancao;
  const fonte = registro?.fonteSancao;
  const legislacao = registro?.legislacao;
  return {
    cadastro,
    id: texto(primeiro(registro, ["id", "idPunicao", "idSancao"])),
    nome: texto(primeiro(registro, ["nomeSancionado", "nome", "razaoSocial"])),
    cnpj: digitos(primeiro(registro, ["codigoSancionado", "cnpjSancionado", "cpfCnpj"])) || null,
    processo: texto(primeiro(registro, ["numeroProcesso", "numeroProcessoFormatado"])),
    tipo: texto(typeof tipo === "object" ? primeiro(tipo, ["descricaoResumida", "descricao", "nome"]) : tipo),
    fonte: texto(typeof fonte === "object" ? primeiro(fonte, ["nomeExibicao", "nome", "descricao"]) : fonte),
    fundamentacao: texto(typeof legislacao === "object" ? primeiro(legislacao, ["fundamentacaoLegal", "descricao"]) : legislacao),
    orgaoSancionador: texto(primeiro(registro, ["orgaoSancionador", "nomeOrgaoSancionador"])),
    situacao: texto(primeiro(registro, ["situacao", "situacaoSancao"])),
    dataInicio: texto(primeiro(registro, ["dataInicioSancao", "dataInicio"])),
    dataFim: texto(primeiro(registro, ["dataFimSancao", "dataFinalSancao", "dataFim"])),
    valor: Number(primeiro(registro, ["valor", "valorMulta", "valorTotal"])) || 0,
  };
}

function normalizarContrato(contrato) {
  return {
    id: texto(primeiro(contrato, ["id", "idContrato"])),
    numero: texto(primeiro(contrato, ["numeroContrato", "numero"])),
    objeto: texto(primeiro(contrato, ["objeto", "objetoContrato"])),
    fornecedor: texto(primeiro(contrato, ["nomeFornecedor", "fornecedor", "nomeRazaoSocialFornecedor"])),
    cnpjFornecedor: digitos(primeiro(contrato, ["cpfCnpjFornecedor", "cnpjFornecedor", "cpfCnpj"])) || null,
    orgao: texto(primeiro(contrato, ["orgao", "nomeOrgao", "unidadeGestora"])),
    situacao: texto(primeiro(contrato, ["situacao", "situacaoContrato"])),
    valor: Number(primeiro(contrato, ["valorGlobal", "valorInicial", "valorContrato"])) || 0,
    dataAssinatura: texto(primeiro(contrato, ["dataAssinatura", "dataAssinaturaContrato"])),
    inicioVigencia: texto(primeiro(contrato, ["dataInicioVigencia", "inicioVigencia"])),
    fimVigencia: texto(primeiro(contrato, ["dataFimVigencia", "fimVigencia"])),
  };
}

function certidaoIndicaOcorrencia(certidao) {
  const situacao = semAcentos(`${certidao?.situacao} ${certidao?.observacao}`);
  if (!situacao) return false;
  if (situacao.includes("NADA CONSTA") || situacao.includes("NAO CONSTA") || situacao.includes("NEGATIV") || situacao.includes("REGULAR")) return false;
  return situacao.includes("CONSTA") || situacao.includes("IRREGULAR") || situacao.includes("POSITIV") || situacao.includes("INIDONE") || situacao.includes("SUSPENS");
}

async function consultarTcu(cnpj, fetchImpl) {
  const tcu = { disponivel: false, consolidada: null, certidoes: [], inidoneos: [], erros: [] };
  const [consolidada, inidoneos] = await Promise.allSettled([
    requisitarJson(`${TCU_CERTIDOES_URL}/certidoes/${cnpj}?seEmitirPDF=false`, { fetchImpl, nome: "TCU" }),
    requisitarJson(TCU_INIDONEOS_URL, { fetchImpl, method: "POST", body: { cnpj: formatarCnpj(cnpj) }, nome: "TCU" }),
  ]);
  if (consolidada.status === "fulfilled") {
    tcu.disponivel = true;
    tcu.consolidada = {
      razaoSocial: texto(consolidada.value?.razaoSocial),
      nomeFantasia: texto(consolidada.value?.nomeFantasia),
      cnpj: digitos(consolidada.value?.cnpj) || cnpj,
      uf: texto(consolidada.value?.uf),
    };
    tcu.certidoes = arrayResposta(consolidada.value?.certidoes).map(normalizarCertidao);
  } else {
    tcu.erros.push(`TCU — consulta consolidada: ${erroTexto(consolidada.reason)}`);
  }
  if (inidoneos.status === "fulfilled") {
    tcu.disponivel = true;
    tcu.inidoneos = arrayResposta(inidoneos.value).map(normalizarInidoneo);
  } else {
    tcu.erros.push(`TCU — licitantes inidôneos: ${erroTexto(inidoneos.reason)}`);
  }
  return tcu;
}

async function consultarPortalLista(caminho, cnpj, apiKey, fetchImpl, nome) {
  const params = new URLSearchParams({ codigoSancionado: cnpj, pagina: "1" });
  if (caminho === "contratos/cpf-cnpj") params.set("cpfCnpj", cnpj), params.delete("codigoSancionado");
  const resposta = await requisitarJson(`${PORTAL_URL}/${caminho}?${params}`, { fetchImpl, apiKey, nome: `Portal da Transparência — ${nome}` });
  return arrayResposta(resposta);
}

async function consultarPortal(cnpj, apiKey, fetchImpl) {
  if (!apiKey) return { configurado: false, ceis: [], cnep: [], contratos: [], erros: [] };
  const portal = { configurado: true, ceis: [], cnep: [], contratos: [], erros: [] };
  const consultas = [
    ["ceis", "CEIS", "ceis"],
    ["cnep", "CNEP", "cnep"],
    ["contratos/cpf-cnpj", "contratos", "contratos"],
  ];
  const resultados = await Promise.allSettled(consultas.map(([caminho, nome]) => consultarPortalLista(caminho, cnpj, apiKey, fetchImpl, nome)));
  for (let indice = 0; indice < resultados.length; indice += 1) {
    const resultado = resultados[indice];
    const chave = consultas[indice][2];
    if (resultado.status === "fulfilled") {
      portal[chave] = resultado.value;
      continue;
    }
    portal.erros.push(`Portal — ${consultas[indice][1]}: ${erroTexto(resultado.reason)}`);
  }
  portal.ceis = portal.ceis.map((item) => normalizarSancao(item, "CEIS"));
  portal.cnep = portal.cnep.map((item) => normalizarSancao(item, "CNEP"));
  portal.contratos = portal.contratos.map(normalizarContrato);
  return portal;
}

function montarResumo(tcu, portal) {
  const tcuCertidoesComOcorrencia = tcu.certidoes.filter(certidaoIndicaOcorrencia).length;
  const tcuOcorrencias = tcu.inidoneos.length + tcuCertidoesComOcorrencia;
  const portalOcorrencias = portal.ceis.length + portal.cnep.length;
  const totalOcorrencias = tcuOcorrencias + portalOcorrencias;
  const erros = tcu.erros.length + portal.erros.length;
  let status = "regular";
  if (totalOcorrencias > 0) status = "alerta";
  else if (!tcu.disponivel) status = "indisponivel";
  else if (!portal.configurado || erros > 0) status = "parcial";
  return {
    status,
    tcuOcorrencias,
    portalOcorrencias,
    totalOcorrencias,
    certidoesComOcorrencia: tcuCertidoesComOcorrencia,
    portalConfigurado: portal.configurado,
    fontesComErro: erros,
    mensagem: status === "alerta"
      ? "Há registros que exigem conferência antes de contratar ou pagar."
      : status === "regular"
        ? "Nenhuma ocorrência foi encontrada nas fontes consultadas."
        : status === "parcial"
          ? "TCU consultado. Configure a chave do Portal para completar a conferência federal."
          : "As fontes oficiais não responderam. Tente novamente mais tarde.",
  };
}

function chaveCache(cnpj, apiKey) {
  return `${cnpj}:${apiKey ? "portal-configurado" : "portal-nao-configurado"}`;
}

export async function consultarTransparenciaCnpj(cnpj, opcoes = {}) {
  const cnpjLimpo = digitos(cnpj);
  if (!cnpjValido(cnpjLimpo)) throw new Error("CNPJ inválido");
  const apiKey = texto(opcoes.apiKey);
  const cacheKey = chaveCache(cnpjLimpo, apiKey);
  const agora = Date.now();
  const armazenado = cache.get(cacheKey);
  if (!opcoes.semCache && armazenado && armazenado.expiraEm > agora) return { ...armazenado.dados, cache: true };
  if (consultasAtivas.has(cacheKey)) return consultasAtivas.get(cacheKey);
  const consulta = (async () => {
    const [tcu, portal] = await Promise.all([
      consultarTcu(cnpjLimpo, opcoes.fetchImpl),
      consultarPortal(cnpjLimpo, apiKey, opcoes.fetchImpl),
    ]);
    const dados = {
      cnpj: cnpjLimpo,
      consultadoEm: new Date().toISOString(),
      tcu,
      portal,
      resumo: montarResumo(tcu, portal),
      fontes: {
        tcuCertidoes: `${TCU_CERTIDOES_URL}/certidoes/${cnpjLimpo}?seEmitirPDF=false`,
        tcuInidoneos: TCU_INIDONEOS_URL,
        portalSancoes: TRANSPARENCIA_URLS.portalConsultaSancoes,
        portalContratos: TRANSPARENCIA_URLS.portalConsultaContratos,
      },
      cache: false,
    };
    cache.set(cacheKey, { dados, expiraEm: Date.now() + CACHE_TTL_MS });
    return dados;
  })();
  consultasAtivas.set(cacheKey, consulta);
  try {
    return await consulta;
  } finally {
    consultasAtivas.delete(cacheKey);
  }
}

export function limparCacheTransparencia() {
  cache.clear();
}

export function chavePortalTransparencia(db) {
  const configurada = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'portal_transparencia_api_key'").get()?.valor;
  return texto(configurada) || texto(process.env.PORTAL_TRANSPARENCIA_API_KEY);
}

export function configuracaoTransparencia(db) {
  return { portalConfigurado: Boolean(chavePortalTransparencia(db)), cacheMinutos: CACHE_TTL_MS / 60000 };
}
