import { randomUUID } from "node:crypto";

const CONSULTA_URL = "https://pncp.gov.br/api/consulta/v1";
const PNCP_URL = "https://pncp.gov.br/api/pncp/v1";
const MODALIDADES = Array.from({ length: 14 }, (_, indice) => indice + 1);
const sincronizacoesAtivas = new WeakSet();
let filaRequisicoes = Promise.resolve();
let ultimaRequisicaoEm = 0;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function aguardarRitmo() {
  let liberar;
  const anterior = filaRequisicoes;
  filaRequisicoes = new Promise((resolve) => { liberar = resolve; });
  await anterior;
  const espera = Math.max(0, 500 - (Date.now() - ultimaRequisicaoEm));
  if (espera) await esperar(espera);
  ultimaRequisicaoEm = Date.now();
  liberar();
}

function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function primeiro(objeto, chaves, padrao = null) {
  for (const chave of chaves) if (objeto?.[chave] !== undefined && objeto?.[chave] !== null && objeto?.[chave] !== "") return objeto[chave];
  return padrao;
}

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function chaveFallback(tipo, item) {
  return [tipo, primeiro(item, ["cnpjOrgao", "cnpj", "orgaoEntidadeCnpj"], item?.orgaoEntidade?.cnpj), primeiro(item, ["anoCompra", "anoContrato", "anoAta", "anoPca", "ano"]), primeiro(item, ["sequencialCompra", "sequencialContrato", "sequencialAta", "numeroItem", "numero"])]
    .map((parte) => String(parte || "").trim())
    .join(":");
}

export function normalizarRegistroPncp(tipo, item) {
  const orgao = item?.orgaoEntidade || item?.orgao || {};
  const ano = Number(primeiro(item, ["anoCompra", "anoContrato", "anoAta", "anoPca", "ano"], 0)) || null;
  const numeroRegistro = primeiro(item, ["numeroCompra", "numeroContratoEmpenho", "numeroAtaRegistroPreco", "numeroItem", "numero"]);
  const objeto = primeiro(item, ["objetoCompra", "objetoContrato", "descricao", "descricaoItem", "objeto"]);
  const chave = String(primeiro(item, ["_chavePncp", "numeroControlePNCP", "numeroControlePncp", "numeroControlePNCPAta", "numeroControlePncpAta", "idPcaPncp", "id"], chaveFallback(tipo, item)));
  return {
    id: randomUUID(),
    tipo,
    chave_pncp: chave,
    cnpj_orgao: somenteDigitos(primeiro(orgao, ["cnpj"], primeiro(item, ["cnpjOrgao", "cnpj", "orgaoEntidadeCnpj"], ""))),
    titulo: String(primeiro(item, ["nomeUnidade", "orgaoEntidadeRazaoSocial", "nomeOrgao", "titulo", "descricaoCategoriaItemPca", "categoriaItemPcaNome"], objeto || numeroRegistro || chave)),
    objeto: objeto ? String(objeto) : null,
    numero: numeroRegistro ? String(numeroRegistro) : null,
    ano,
    sequencial: Number(primeiro(item, ["sequencialCompra", "sequencialContrato", "sequencialAta"], 0)) || null,
    ano_compra: Number(primeiro(item, ["anoCompra"], tipo === "contratacao" ? ano : 0)) || null,
    sequencial_compra: Number(primeiro(item, ["sequencialCompra"], tipo === "contratacao" ? primeiro(item, ["sequencialCompra"], 0) : 0)) || null,
    processo: primeiro(item, ["processo", "numeroProcesso"]),
    modalidade: primeiro(item, ["modalidadeNome", "nomeModalidade", "modalidadeContratacaoNome"]),
    situacao: primeiro(item, ["situacaoCompraNome", "situacaoNome", "status", "situacao"]),
    valor: numero(primeiro(item, ["valorTotalHomologado", "valorTotalEstimado", "valorGlobal", "valorInicial", "valorTotal", "valorUnitarioEstimado"])),
    fornecedor_nome: primeiro(item, ["nomeRazaoSocialFornecedor", "nomeFornecedor", "razaoSocialFornecedor"]),
    fornecedor_cnpj: somenteDigitos(primeiro(item, ["niFornecedor", "cnpjFornecedor", "numeroDocumentoFornecedor"], "")) || null,
    data_publicacao: primeiro(item, ["dataPublicacaoPncp", "dataPublicacaoPNCP", "dataPublicacao"]),
    data_atualizacao: primeiro(item, ["dataAtualizacao", "dataAtualizacaoPncp", "dataAtualizacaoPNCP", "dataAtualizacaoGlobalPCA"]),
    vigencia_inicio: primeiro(item, ["dataVigenciaInicio", "vigenciaInicio"]),
    vigencia_fim: primeiro(item, ["dataVigenciaFim", "vigenciaFim"]),
    url: primeiro(item, ["linkSistemaOrigem", "url", "linkProcessoEletronico"]),
    raw_json: JSON.stringify(item),
  };
}

async function requisitarJson(url, fetchImpl = fetch, opcoes = {}) {
  let resposta = null;
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    if (fetchImpl === fetch) await aguardarRitmo();
    try {
      resposta = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": "Sistema-Prefeitura-Inaja/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (erro) {
      if (erro?.name === "TimeoutError" || erro?.name === "AbortError") throw new Error("PNCP excedeu 10 segundos sem responder");
      throw erro;
    }
    if (resposta.status !== 429 || tentativa === 3) break;
    const retryAfter = Number(resposta.headers?.get?.("retry-after") || 0);
    await esperar(retryAfter > 0 ? Math.min(retryAfter * 1000, 30_000) : 2000 * (tentativa + 1));
  }
  if (resposta.status === 204 || (opcoes.vazio404 && resposta.status === 404)) return null;
  if (!resposta.ok) {
    let mensagem = "";
    try {
      const corpo = await resposta.json();
      mensagem = String(corpo?.message || corpo?.error || "");
    } catch {
      try {
        const texto = await resposta.text();
        mensagem = texto.slice(0, 100);
      } catch {
        mensagem = "";
      }
    }
    throw new Error(`PNCP respondeu HTTP ${resposta.status}${mensagem ? `: ${mensagem}` : ""}`);
  }
  try {
    return await resposta.json();
  } catch {
    throw new Error("PNCP devolveu formato de resposta inválido.");
  }
}

function linhasResposta(resposta) {
  if (!resposta) return [];
  if (Array.isArray(resposta)) return resposta;
  for (const chave of ["data", "items", "content", "resultado", "resultados"]) if (Array.isArray(resposta[chave])) return resposta[chave];
  return [];
}

async function consultarPaginado(caminho, parametros, fetchImpl) {
  const acumulado = [];
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const busca = new URLSearchParams({ ...parametros, pagina: String(pagina), tamanhoPagina: "50" });
    const resposta = await requisitarJson(`${CONSULTA_URL}${caminho}?${busca}`, fetchImpl);
    const linhas = linhasResposta(resposta);
    acumulado.push(...linhas);
    const totalPaginas = Number(resposta?.totalPaginas || resposta?.totalPages || 1);
    if (!linhas.length || pagina >= totalPaginas || linhas.length < 50) break;
  }
  return acumulado;
}

async function executarLimitado(tarefas, limite = 4) {
  const saidas = [];
  let proxima = 0;
  async function trabalhador() {
    while (proxima < tarefas.length) {
      const indice = proxima;
      proxima += 1;
      saidas[indice] = await tarefas[indice]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, tarefas.length) }, trabalhador));
  return saidas;
}

function intervalosAno(ano) {
  const atual = new Date();
  const limite = ano === atual.getFullYear() ? new Date(Date.UTC(ano, atual.getMonth(), atual.getDate())) : new Date(Date.UTC(ano, 11, 31));
  const intervalos = [];
  let inicio = new Date(Date.UTC(ano, 0, 1));
  while (inicio <= limite) {
    const fim = new Date(Math.min(new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 3, 0)).getTime(), limite.getTime()));
    intervalos.push({ inicio: inicio.toISOString().slice(0, 10).replace(/-/g, ""), fim: fim.toISOString().slice(0, 10).replace(/-/g, "") });
    inicio = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate() + 1));
  }
  return intervalos;
}

async function consultarPcaConsolidado(cnpj, ano, fetchImpl) {
  const resposta = await requisitarJson(`${PNCP_URL}/orgaos/${cnpj}/pca/${ano}/consolidado`, fetchImpl, { vazio404: true });
  if (!resposta) return [];
  const linhas = linhasResposta(resposta);
  return linhas.length ? linhas : [resposta];
}

function normalizarResposta(tipo, itens, cnpjEsperado) {
  const expandidos = tipo === "pca" ? itens.flatMap((plano) => {
    const cnpjPlano = somenteDigitos(primeiro(plano, ["orgaoEntidadeCnpj", "cnpjOrgao"], plano?.orgaoEntidade?.cnpj));
    if (cnpjPlano !== cnpjEsperado) return [];
    if (!Array.isArray(plano.itens) || !plano.itens.length) return [plano];
    const dadosPlano = { ...plano };
    delete dadosPlano.itens;
    return plano.itens.map((item, indice) => ({
      ...dadosPlano,
      ...item,
      _chavePncp: `${plano.idPcaPncp || chaveFallback("pca", plano)}:item:${item.numeroItem || item.codigoItem || indice + 1}`,
    }));
  }) : itens;
  return expandidos.map((item) => normalizarRegistroPncp(tipo, item)).filter((registro) => registro.cnpj_orgao === cnpjEsperado);
}

function salvarRegistros(db, registros) {
  const upsert = db.prepare(`
    INSERT INTO pncp_registros (id, tipo, chave_pncp, cnpj_orgao, titulo, objeto, numero, ano, sequencial, ano_compra, sequencial_compra, processo, modalidade, situacao, valor, fornecedor_nome, fornecedor_cnpj, data_publicacao, data_atualizacao, vigencia_inicio, vigencia_fim, url, raw_json, sincronizado_em)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(chave_pncp) DO UPDATE SET tipo=excluded.tipo, cnpj_orgao=excluded.cnpj_orgao, titulo=excluded.titulo, objeto=excluded.objeto, numero=excluded.numero, ano=excluded.ano, sequencial=excluded.sequencial, ano_compra=excluded.ano_compra, sequencial_compra=excluded.sequencial_compra, processo=excluded.processo, modalidade=excluded.modalidade, situacao=excluded.situacao, valor=excluded.valor, fornecedor_nome=excluded.fornecedor_nome, fornecedor_cnpj=excluded.fornecedor_cnpj, data_publicacao=excluded.data_publicacao, data_atualizacao=excluded.data_atualizacao, vigencia_inicio=excluded.vigencia_inicio, vigencia_fim=excluded.vigencia_fim, url=excluded.url, raw_json=excluded.raw_json, sincronizado_em=datetime('now')
  `);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const registro of registros) upsert.run(registro.id, registro.tipo, registro.chave_pncp, registro.cnpj_orgao, registro.titulo, registro.objeto, registro.numero, registro.ano, registro.sequencial, registro.ano_compra, registro.sequencial_compra, registro.processo, registro.modalidade, registro.situacao, registro.valor, registro.fornecedor_nome, registro.fornecedor_cnpj, registro.data_publicacao, registro.data_atualizacao, registro.vigencia_inicio, registro.vigencia_fim, registro.url, registro.raw_json);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}

export async function sincronizarPncp(db, opcoes = {}) {
  const cnpj = somenteDigitos(opcoes.cnpj || "76970318000167");
  const anoAtual = new Date().getFullYear();
  const anos = [...new Set((opcoes.anos || [anoAtual]).map(Number).filter((ano) => ano >= 2021 && ano <= anoAtual))];
  if (cnpj.length !== 14) throw new Error("Configure um CNPJ válido para consultar o PNCP.");
  if (!anos.length) throw new Error("Informe ao menos um ano entre 2021 e o ano atual.");
  const id = randomUUID();
  db.prepare("INSERT INTO pncp_sincronizacoes (id, cnpj, anos, status) VALUES (?, ?, ?, 'executando')").run(id, cnpj, JSON.stringify(anos));
  const tarefas = [];
  for (const ano of anos) {
    for (const { inicio, fim } of intervalosAno(ano)) {
      for (const modalidade of MODALIDADES) tarefas.push({ descricao: `contratações modalidade ${modalidade}, ${inicio}-${fim}`, executar: async () => ({ tipo: "contratacao", itens: await consultarPaginado("/contratacoes/publicacao", { dataInicial: inicio, dataFinal: fim, codigoModalidadeContratacao: String(modalidade), cnpj }, opcoes.fetchImpl) }) });
      tarefas.push({ descricao: `contratos, ${inicio}-${fim}`, executar: async () => ({ tipo: "contrato", itens: await consultarPaginado("/contratos", { dataInicial: inicio, dataFinal: fim, cnpjOrgao: cnpj }, opcoes.fetchImpl) }) });
      tarefas.push({ descricao: `atas, ${inicio}-${fim}`, executar: async () => ({ tipo: "ata", itens: await consultarPaginado("/atas", { dataInicial: inicio, dataFinal: fim, cnpjOrgao: cnpj }, opcoes.fetchImpl) }) });
    }
    tarefas.push({ descricao: `PCA consolidado de ${ano}`, executar: async () => ({ tipo: "pca", itens: await consultarPcaConsolidado(cnpj, ano, opcoes.fetchImpl) }) });
  }
  const erros = [];
  let falhasConsecutivas = 0;
  let interromperPorIndisponibilidade = false;
  const seguras = tarefas.map((tarefa) => async () => {
    if (interromperPorIndisponibilidade) return null;
    try {
      const resultado = await tarefa.executar();
      falhasConsecutivas = 0;
      return resultado;
    } catch (erro) {
      falhasConsecutivas += 1;
      const msg = String(erro?.message || erro);
      erros.push(`${tarefa.descricao}: ${msg}`);
      if (falhasConsecutivas >= 6 && (msg.includes("sem responder") || msg.includes("fetch failed") || msg.includes("timeout") || msg.includes("SocketError") || msg.includes("ECONNRESET"))) {
        interromperPorIndisponibilidade = true;
        erros.push("Sincronização interrompida: servidores do PNCP (governo federal) estão inacessíveis ou instáveis no momento.");
      }
      return null;
    }
  });
  const respostas = await executarLimitado(seguras, 3);
  const recebidos = respostas.filter(Boolean).flatMap(({ tipo, itens }) => normalizarResposta(tipo, itens, cnpj));
  const registros = [...new Map(recebidos.map((registro) => [registro.chave_pncp, registro])).values()];
  salvarRegistros(db, registros);
  const totais = registros.reduce((acc, registro) => ({ ...acc, [registro.tipo]: (acc[registro.tipo] || 0) + 1 }), {});
  const status = registros.length === 0 && erros.length > 0 ? "erro" : erros.length ? "parcial" : "concluido";
  db.prepare("UPDATE pncp_sincronizacoes SET status = ?, totais = ?, erros = ?, finalizado_em = datetime('now') WHERE id = ?").run(status, JSON.stringify(totais), JSON.stringify(erros.slice(0, 30)), id);
  return { id, status, totais, erros: erros.slice(0, 10), recebidos: registros.length };
}

export async function atualizarDocumentosPncp(db, registroId, fetchImpl = fetch) {
  const registro = db.prepare("SELECT * FROM pncp_registros WHERE id = ?").get(registroId);
  if (!registro) throw Object.assign(new Error("Registro do PNCP não encontrado."), { statusCode: 404 });
  let caminho = null;
  if (registro.tipo === "contratacao" && registro.ano_compra && registro.sequencial_compra) caminho = `/orgaos/${registro.cnpj_orgao}/compras/${registro.ano_compra}/${registro.sequencial_compra}/arquivos`;
  if (registro.tipo === "contrato" && registro.ano && registro.sequencial) caminho = `/orgaos/${registro.cnpj_orgao}/contratos/${registro.ano}/${registro.sequencial}/arquivos`;
  if (!caminho) return [];
  const resposta = await requisitarJson(`${PNCP_URL}${caminho}`, fetchImpl);
  const documentos = linhasResposta(resposta);
  const inserir = db.prepare("INSERT OR IGNORE INTO pncp_documentos (id, registro_id, titulo, tipo, url, data_publicacao) VALUES (?, ?, ?, ?, ?, ?)");
  for (const item of documentos) {
    const url = primeiro(item, ["url", "uri", "link", "urlArquivo"]);
    if (url) inserir.run(randomUUID(), registroId, String(primeiro(item, ["titulo", "nome", "nomeArquivo"], "Documento")), primeiro(item, ["tipoDocumentoNome", "tipo", "tipoDocumento"]), String(url), primeiro(item, ["dataPublicacaoPncp", "dataPublicacao"]));
  }
  return db.prepare("SELECT * FROM pncp_documentos WHERE registro_id = ? ORDER BY data_publicacao DESC, titulo").all(registroId);
}

export function configuracaoPncp(db) {
  const obter = (chave) => db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave)?.valor;
  const anoAtual = new Date().getFullYear();
  const anos = String(obter("pncp_anos") || anoAtual).split(/[,;\s]+/).map(Number).filter(Boolean);
  return { cnpj: somenteDigitos(obter("pncp_cnpj") || "76970318000167"), anos, intervaloHoras: Math.max(1, Number(obter("pncp_sincronizacao_horas") || 24)) };
}

export function agendarSincronizacaoPncp(db) {
  if (sincronizacoesAtivas.has(db)) return false;
  const config = configuracaoPncp(db);
  const ultima = db.prepare("SELECT finalizado_em, iniciado_em FROM pncp_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get();
  const referencia = ultima?.finalizado_em || ultima?.iniciado_em;
  const vencida = !referencia || Date.now() - new Date(`${referencia.replace(" ", "T")}Z`).getTime() >= config.intervaloHoras * 60 * 60 * 1000;
  if (!vencida) return false;
  sincronizacoesAtivas.add(db);
  setImmediate(async () => {
    try { await sincronizarPncp(db, config); }
    catch { return undefined; }
    finally { sincronizacoesAtivas.delete(db); }
  });
  return true;
}
