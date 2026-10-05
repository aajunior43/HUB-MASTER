import { createHash, randomUUID } from "node:crypto";

const DEFAULT_CNPJ = "76970318000167";
const DEFAULT_IBGE = "4110300";
const MURAL_URL = "https://servicos.tce.pr.gov.br/servicos/arquivos/dadosabertos/muraldelicitacoes";
const OBRAS_URL = "https://servicos.tce.pr.gov.br/servicos/arquivos/dadosabertos/obrasmunicipais";
const sincronizacoesAtivas = new WeakSet();

export const TCEPR_URLS = Object.freeze({
  licitacoes: (ano) => `${MURAL_URL}/${ano}_mural_de_licitacoes_base_de_dados.csv`,
  obras: `${OBRAS_URL}/obras_municipais_base_de_dados.csv`,
  acompanhamentos: `${OBRAS_URL}/acompanhamentos_base_de_dados.csv`,
  fonte: "https://servicos.tce.pr.gov.br/servicos/srv_dados_abertos.aspx",
});

function digitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function limpar(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function primeiro(objeto, chaves, padrao = null) {
  for (const chave of chaves) {
    if (objeto?.[chave] !== undefined && objeto?.[chave] !== null && String(objeto[chave]).trim() !== "") return objeto[chave];
  }
  return padrao;
}

function numero(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor).trim().replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(\.\d{3})+$/.test(texto) ? texto.replace(/\./g, "") : texto;
  const convertido = Number(normalizado);
  return Number.isFinite(convertido) ? convertido : 0;
}

function numeroOpcional(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === "") return null;
  return numero(valor);
}

function inteiro(valor) {
  const convertido = Number.parseInt(String(valor ?? "").trim(), 10);
  return Number.isFinite(convertido) ? convertido : null;
}

function dataTce(valor) {
  const texto = limpar(valor);
  if (!texto) return null;
  const brasileira = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (brasileira) return `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}${brasileira[4] ? ` ${brasileira[4]}` : ""}`;
  return texto;
}

function chave(prefixo, partes) {
  const digest = createHash("sha256").update(partes.map((parte) => String(parte ?? "").trim()).join("|")).digest("hex").slice(0, 32);
  return `${prefixo}:${digest}`;
}

function semAcentos(valor) {
  return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function orgaoCorresponde(row, config) {
  const cnpjEsperado = digitos(config?.cnpj);
  const ibgeEsperado = digitos(config?.ibge);
  const cnpj = digitos(primeiro(row, ["nrDocumento", "cnpj", "CNPJ"]));
  const ibge = digitos(primeiro(row, ["cdIBGE", "codigoIbge", "codigo_ibge"]));
  const cnpjOk = cnpjEsperado.length === 14 && cnpj.length === 14 && cnpj === cnpjEsperado;
  const ibgeEsperadoCurto = ibgeEsperado.length >= 5 ? ibgeEsperado.slice(-5) : ibgeEsperado;
  const ibgeOk = Boolean(ibge && ibgeEsperado && (ibge === ibgeEsperado || ibge === ibgeEsperadoCurto || ibge.slice(-5) === ibgeEsperadoCurto));
  return cnpjOk || ibgeOk;
}

export function parseCsvSemicolon(conteudo) {
  const texto = String(conteudo ?? "").replace(/^\uFEFF/, "");
  const linhas = [];
  let campos = [];
  let campo = "";
  let entreAspas = false;

  const adicionarCampo = () => {
    campos.push(campo);
    campo = "";
  };
  const adicionarLinha = () => {
    adicionarCampo();
    if (campos.some((item) => String(item).trim() !== "")) linhas.push(campos);
    campos = [];
  };

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];
    if (entreAspas) {
      if (caractere === '"') {
        const proximo = texto[indice + 1];
        if (proximo === '"') {
          campo += '"';
          indice += 1;
        } else if (proximo === ";" || proximo === "\r" || proximo === "\n" || proximo === undefined) {
          entreAspas = false;
        } else {
          campo += caractere;
        }
      } else {
        campo += caractere;
      }
    } else if (caractere === '"' && campo.length === 0) {
      entreAspas = true;
    } else if (caractere === ";") {
      adicionarCampo();
    } else if (caractere === "\n") {
      adicionarLinha();
    } else if (caractere !== "\r") {
      campo += caractere;
    }
  }
  if (campo.length || campos.length) adicionarLinha();

  const cabecalho = linhas.shift() || [];
  const colunas = cabecalho.map((item) => String(item).trim().replace(/^\uFEFF/, ""));
  return linhas
    .filter((linha) => !linha.every((item) => /^-+$/.test(String(item).trim())))
    .map((linha) => Object.fromEntries(colunas.map((coluna, indice) => [coluna, String(linha[indice] ?? "").trim()])));
}

export function normalizarLicitacaoTcePr(row) {
  const cnpj = digitos(primeiro(row, ["nrDocumento", "cnpj", "CNPJ"]));
  const codigoIbge = limpar(primeiro(row, ["cdIBGE", "codigoIbge", "codigo_ibge"]));
  const ano = inteiro(row.nrAno);
  const processo = limpar(row.nrProcessoEdital);
  const edital = limpar(row.nrEditalOrigem);
  const objeto = limpar(row.dsObjeto);
  const dataAbertura = dataTce(row.dtAberturaLicitacao);
  const dataPublicacao = dataTce(row.dtLancamentoPublicacao);
  const dataCancelamento = dataTce(row.dtCancelamento);
  const chaveExterna = chave("licitacao", [cnpj, codigoIbge, ano, processo, edital, dataAbertura, objeto, row.dsModalidadeLicitacao]);
  const flags = Object.fromEntries(["flRecursoInternacional", "flPrioridadeContratacaoME", "flExclusivoEPPME", "flCotaParticipacaoEPPME", "nrPercentualParticipacaoEPPME", "flExigeSubcontratacaoEPPME", "flvlSigiloso"].map((campo) => [campo, limpar(row[campo])]));
  return {
    id: randomUUID(),
    chave_externa: chaveExterna,
    cnpj_orgao: cnpj,
    orgao_nome: limpar(row.nmRazaoSocial),
    codigo_ibge: codigoIbge,
    municipio: limpar(row.nmMunicipio),
    ano,
    processo,
    edital,
    modalidade: limpar(row.dsModalidadeLicitacao),
    tipo_avaliacao: limpar(row.dsTipoAvaliacao),
    objeto,
    dotacao: limpar(row.nrDotacaoOrcamentaria),
    data_abertura: dataAbertura,
    data_publicacao: dataPublicacao,
    valor_referencia: numero(row.vlReferencia),
    data_cancelamento: dataCancelamento,
    situacao: dataCancelamento ? "Cancelada" : "Publicada",
    flags_json: JSON.stringify(flags),
    raw_json: JSON.stringify(row),
  };
}

export function normalizarObraTcePr(row) {
  const cnpj = digitos(primeiro(row, ["nrDocumento", "cnpj", "CNPJ"]));
  const codigoIbge = limpar(primeiro(row, ["cdIBGE", "codigoIbge", "codigo_ibge"]));
  const idIntervencao = limpar(row.idIntervencao) || chave("intervencao", [cnpj, codigoIbge, row.nmIntervencao, row.dsObjeto]);
  return {
    id: randomUUID(),
    chave_externa: chave("obra", [cnpj, codigoIbge, idIntervencao]),
    id_intervencao: idIntervencao,
    cnpj_orgao: cnpj,
    orgao_nome: limpar(row.nmPessoa),
    codigo_ibge: codigoIbge,
    municipio: limpar(row.nmMunicipio),
    ano: inteiro(row.nrAnoIntervencao),
    tipo_intervencao: limpar(row.dsTipoIntervencao),
    classificacao_intervencao: limpar(row.dsClassificacaoIntervencao),
    nome_intervencao: limpar(row.nmIntervencao),
    tipo_obra: limpar(row.dsTipoObra),
    classificacao_obra: limpar(row.dsClassificacaoObra),
    objeto: limpar(row.dsObjeto),
    medida: numeroOpcional(row.nrMedida),
    unidade_medida: limpar(row.dsUnidadeMedidaIntervencao),
    valor: numero(row.vlIntervencao),
    data_base_valor: dataTce(row.dtBaseValorIntervencao),
    prazo_execucao: inteiro(row.nrPrazoExecucao),
    data_inicio: dataTce(row.dtInicio),
    regime: limpar(row.dsTipoRegimeIntervencao),
    situacao: "Sem acompanhamento",
    percentual_fisico: null,
    ultimo_acompanhamento: null,
    observacao_ultimo_acompanhamento: null,
    raw_json: JSON.stringify(row),
  };
}

export function normalizarAcompanhamentoTcePr(row) {
  const idIntervencao = limpar(row.idIntervencao);
  const data = dataTce(row.dtAcompanhamento);
  return {
    id: randomUUID(),
    chave_externa: chave("acompanhamento", [idIntervencao, row.nrAcompanhamento, data, row.dsTipoAcompanhamento, row.dsObservacao]),
    id_intervencao: idIntervencao,
    origem: limpar(row.dsOrigemAcompanhamento),
    numero: limpar(row.nrAcompanhamento),
    data,
    tipo: limpar(row.dsTipoAcompanhamento),
    responsavel: limpar(row.nmResponsavel),
    tipo_documento_responsavel: limpar(row.sgTipoDocumentoResponsavel),
    documento_responsavel: limpar(row.nrDocumentoResponsavel),
    observacao: limpar(row.dsObservacao),
    tipo_medicao: limpar(row.dsTipoMedicao),
    percentual_fisico: numeroOpcional(row.nrPercentualFisico),
    motivo_paralisacao: limpar(row.dsMotivoParalisacao),
    raw_json: JSON.stringify(row),
  };
}

async function requisitarTexto(url, fetchImpl = fetch) {
  let resposta = null;
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    try {
      resposta = await fetchImpl(url, { headers: { Accept: "*/*", "User-Agent": "Sistema-Prefeitura-Inaja/1.0" }, signal: AbortSignal.timeout(180_000) });
    } catch (erro) {
      if (erro?.name === "AbortError" || erro?.name === "TimeoutError") throw new Error("TCE-PR excedeu 180 segundos sem responder");
      throw erro;
    }
    if (resposta.ok || (resposta.status >= 200 && resposta.status < 300)) break;
    if (![429, 500, 502, 503, 504].includes(Number(resposta.status)) || tentativa === 2) break;
    const retryAfter = Number(resposta.headers?.get?.("retry-after") || 0);
    await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? Math.min(retryAfter * 1000, 30_000) : 1_500 * (tentativa + 1)));
  }
  if (!resposta || !(resposta.ok || (resposta.status >= 200 && resposta.status < 300))) throw new Error(`TCE-PR respondeu HTTP ${resposta?.status || "sem resposta"}`);
  return resposta.text();
}

function salvarLicitacoes(db, registros) {
  const inserir = db.prepare(`
    INSERT INTO tcepr_licitacoes (id, chave_externa, cnpj_orgao, orgao_nome, codigo_ibge, municipio, ano, processo, edital, modalidade, tipo_avaliacao, objeto, dotacao, data_abertura, data_publicacao, valor_referencia, data_cancelamento, situacao, flags_json, raw_json, sincronizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(chave_externa) DO UPDATE SET cnpj_orgao=excluded.cnpj_orgao, orgao_nome=excluded.orgao_nome, codigo_ibge=excluded.codigo_ibge, municipio=excluded.municipio, ano=excluded.ano, processo=excluded.processo, edital=excluded.edital, modalidade=excluded.modalidade, tipo_avaliacao=excluded.tipo_avaliacao, objeto=excluded.objeto, dotacao=excluded.dotacao, data_abertura=excluded.data_abertura, data_publicacao=excluded.data_publicacao, valor_referencia=excluded.valor_referencia, data_cancelamento=excluded.data_cancelamento, situacao=excluded.situacao, flags_json=excluded.flags_json, raw_json=excluded.raw_json, sincronizado_em=datetime('now')
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of registros) inserir.run(item.id, item.chave_externa, item.cnpj_orgao, item.orgao_nome, item.codigo_ibge, item.municipio, item.ano, item.processo, item.edital, item.modalidade, item.tipo_avaliacao, item.objeto, item.dotacao, item.data_abertura, item.data_publicacao, item.valor_referencia, item.data_cancelamento, item.situacao, item.flags_json, item.raw_json);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function salvarObras(db, registros) {
  const inserir = db.prepare(`
    INSERT INTO tcepr_obras (id, chave_externa, id_intervencao, cnpj_orgao, orgao_nome, codigo_ibge, municipio, ano, tipo_intervencao, classificacao_intervencao, nome_intervencao, tipo_obra, classificacao_obra, objeto, medida, unidade_medida, valor, data_base_valor, prazo_execucao, data_inicio, regime, situacao, percentual_fisico, ultimo_acompanhamento, observacao_ultimo_acompanhamento, raw_json, sincronizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(chave_externa) DO UPDATE SET id_intervencao=excluded.id_intervencao, cnpj_orgao=excluded.cnpj_orgao, orgao_nome=excluded.orgao_nome, codigo_ibge=excluded.codigo_ibge, municipio=excluded.municipio, ano=excluded.ano, tipo_intervencao=excluded.tipo_intervencao, classificacao_intervencao=excluded.classificacao_intervencao, nome_intervencao=excluded.nome_intervencao, tipo_obra=excluded.tipo_obra, classificacao_obra=excluded.classificacao_obra, objeto=excluded.objeto, medida=excluded.medida, unidade_medida=excluded.unidade_medida, valor=excluded.valor, data_base_valor=excluded.data_base_valor, prazo_execucao=excluded.prazo_execucao, data_inicio=excluded.data_inicio, regime=excluded.regime, raw_json=excluded.raw_json, sincronizado_em=datetime('now')
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of registros) inserir.run(item.id, item.chave_externa, item.id_intervencao, item.cnpj_orgao, item.orgao_nome, item.codigo_ibge, item.municipio, item.ano, item.tipo_intervencao, item.classificacao_intervencao, item.nome_intervencao, item.tipo_obra, item.classificacao_obra, item.objeto, item.medida, item.unidade_medida, item.valor, item.data_base_valor, item.prazo_execucao, item.data_inicio, item.regime, item.situacao, item.percentual_fisico, item.ultimo_acompanhamento, item.observacao_ultimo_acompanhamento, item.raw_json);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function salvarAcompanhamentos(db, registros) {
  const obras = new Map(db.prepare("SELECT id, id_intervencao FROM tcepr_obras").all().map((item) => [String(item.id_intervencao), item.id]));
  const inserir = db.prepare(`
    INSERT INTO tcepr_obras_acompanhamentos (id, chave_externa, obra_id, id_intervencao, origem, numero, data, tipo, responsavel, tipo_documento_responsavel, documento_responsavel, observacao, tipo_medicao, percentual_fisico, motivo_paralisacao, raw_json, sincronizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(chave_externa) DO UPDATE SET obra_id=excluded.obra_id, id_intervencao=excluded.id_intervencao, origem=excluded.origem, numero=excluded.numero, data=excluded.data, tipo=excluded.tipo, responsavel=excluded.responsavel, tipo_documento_responsavel=excluded.tipo_documento_responsavel, documento_responsavel=excluded.documento_responsavel, observacao=excluded.observacao, tipo_medicao=excluded.tipo_medicao, percentual_fisico=excluded.percentual_fisico, motivo_paralisacao=excluded.motivo_paralisacao, raw_json=excluded.raw_json, sincronizado_em=datetime('now')
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    let salvos = 0;
    for (const item of registros) {
      const obraId = obras.get(String(item.id_intervencao || ""));
      if (!obraId) continue;
      inserir.run(item.id, item.chave_externa, obraId, item.id_intervencao, item.origem, item.numero, item.data, item.tipo, item.responsavel, item.tipo_documento_responsavel, item.documento_responsavel, item.observacao, item.tipo_medicao, item.percentual_fisico, item.motivo_paralisacao, item.raw_json);
      salvos += 1;
    }
    db.exec("COMMIT");
    return salvos;
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

function atualizarResumoObras(db) {
  const obras = db.prepare("SELECT id FROM tcepr_obras").all();
  const ultimo = db.prepare("SELECT data, percentual_fisico, tipo, observacao, motivo_paralisacao FROM tcepr_obras_acompanhamentos WHERE obra_id = ? ORDER BY date(data) DESC, rowid DESC LIMIT 1");
  const ultimoMedido = db.prepare("SELECT percentual_fisico FROM tcepr_obras_acompanhamentos WHERE obra_id = ? AND percentual_fisico IS NOT NULL ORDER BY date(data) DESC, rowid DESC LIMIT 1");
  const atualizar = db.prepare("UPDATE tcepr_obras SET situacao = ?, percentual_fisico = ?, ultimo_acompanhamento = ?, observacao_ultimo_acompanhamento = ? WHERE id = ?");
  for (const obra of obras) {
    const item = ultimo.get(obra.id);
    if (!item) {
      atualizar.run("Sem acompanhamento", null, null, null, obra.id);
      continue;
    }
    const texto = semAcentos(`${item.tipo || ""} ${item.motivo_paralisacao || ""} ${item.observacao || ""}`);
    const percentualUltimo = item.percentual_fisico === null || item.percentual_fisico === undefined ? null : Number(item.percentual_fisico);
    const anterior = percentualUltimo === null ? ultimoMedido.get(obra.id)?.percentual_fisico : null;
    const percentual = percentualUltimo !== null ? percentualUltimo : anterior === null || anterior === undefined ? null : Number(anterior);
    const situacao = percentualUltimo !== null && percentualUltimo >= 100 || /conclu|finaliz/.test(texto)
      ? "Concluída"
      : /paralis|suspens/.test(texto)
        ? "Paralisada"
        : "Em acompanhamento";
    atualizar.run(situacao, percentual, item.data, item.observacao || item.motivo_paralisacao || null, obra.id);
  }
}

export async function sincronizarTcePr(db, opcoes = {}) {
  const cnpj = digitos(opcoes.cnpj || DEFAULT_CNPJ);
  const ibge = digitos(opcoes.ibge || DEFAULT_IBGE);
  const anoAtual = new Date().getFullYear();
  const anos = [...new Set((opcoes.anos || [anoAtual]).map(Number).filter((ano) => ano >= 2013 && ano <= anoAtual))];
  if (cnpj.length !== 14 && ibge.length < 5) throw new Error("Configure um CNPJ ou código IBGE válido para consultar o TCE-PR.");
  if (!anos.length) throw new Error("Informe ao menos um ano entre 2013 e o ano atual.");

  const id = randomUUID();
  db.prepare("INSERT INTO tcepr_sincronizacoes (id, cnpj, ibge, anos, status) VALUES (?, ?, ?, ?, 'executando')").run(id, cnpj, ibge, JSON.stringify(anos));
  const config = { cnpj, ibge };
  const erros = [];
  const totais = { licitacoes: 0, obras: 0, acompanhamentos: 0 };
  let fontesOk = 0;

  for (const ano of anos) {
    try {
      const linhas = parseCsvSemicolon(await requisitarTexto(TCEPR_URLS.licitacoes(ano), opcoes.fetchImpl));
      const registros = linhas.filter((linha) => orgaoCorresponde(linha, config)).map(normalizarLicitacaoTcePr);
      salvarLicitacoes(db, registros);
      totais.licitacoes += registros.length;
      fontesOk += 1;
    } catch (erro) {
      erros.push(`licitações ${ano}: ${String(erro?.message || erro)}`);
    }
  }

  let obrasCarregadas = false;
  try {
    const linhas = parseCsvSemicolon(await requisitarTexto(TCEPR_URLS.obras, opcoes.fetchImpl));
    const registros = linhas.filter((linha) => orgaoCorresponde(linha, config)).map(normalizarObraTcePr);
    salvarObras(db, registros);
    totais.obras = registros.length;
    fontesOk += 1;
    obrasCarregadas = true;
  } catch (erro) {
    erros.push(`obras: ${String(erro?.message || erro)}`);
  }

  if (obrasCarregadas) {
    try {
      const linhas = parseCsvSemicolon(await requisitarTexto(TCEPR_URLS.acompanhamentos, opcoes.fetchImpl));
      const intervencoes = new Set(db.prepare("SELECT id_intervencao FROM tcepr_obras").all().map((item) => String(item.id_intervencao)));
      const registros = linhas.filter((linha) => {
        const idIntervencao = limpar(linha.idIntervencao);
        return Boolean(idIntervencao && intervencoes.has(idIntervencao));
      }).map(normalizarAcompanhamentoTcePr);
      totais.acompanhamentos = salvarAcompanhamentos(db, registros);
      fontesOk += 1;
      atualizarResumoObras(db);
    } catch (erro) {
      erros.push(`acompanhamentos: ${String(erro?.message || erro)}`);
    }
  }

  const status = fontesOk === 0 ? "erro" : erros.length ? "parcial" : "concluido";
  db.prepare("UPDATE tcepr_sincronizacoes SET status = ?, totais = ?, erros = ?, finalizado_em = datetime('now') WHERE id = ?").run(status, JSON.stringify(totais), JSON.stringify(erros.slice(0, 30)), id);
  return { id, status, totais, erros: erros.slice(0, 10), recebidos: Object.values(totais).reduce((total, valor) => total + valor, 0) };
}

export function configuracaoTcePr(db) {
  const obter = (chave) => db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave)?.valor;
  const anoAtual = new Date().getFullYear();
  const anos = String(obter("tcepr_anos") || anoAtual).split(/[,;\s]+/).map(Number).filter((ano) => ano >= 2013 && ano <= anoAtual);
  return {
    cnpj: digitos(obter("tcepr_cnpj") || obter("pncp_cnpj") || DEFAULT_CNPJ),
    ibge: digitos(obter("tcepr_ibge") || DEFAULT_IBGE),
    anos: anos.length ? anos : [anoAtual],
    intervaloHoras: Math.max(1, Number(obter("tcepr_sincronizacao_horas") || 24)),
  };
}

export function agendarSincronizacaoTcePr(db) {
  if (sincronizacoesAtivas.has(db)) return false;
  const config = configuracaoTcePr(db);
  const ultima = db.prepare("SELECT finalizado_em, iniciado_em FROM tcepr_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get();
  const referencia = ultima?.finalizado_em || ultima?.iniciado_em;
  const vencida = !referencia || Date.now() - new Date(`${referencia.replace(" ", "T")}Z`).getTime() >= config.intervaloHoras * 60 * 60 * 1000;
  if (!vencida) return false;
  sincronizacoesAtivas.add(db);
  setImmediate(async () => {
    try { await sincronizarTcePr(db, config); } catch { return undefined; } finally { sincronizacoesAtivas.delete(db); }
  });
  return true;
}
