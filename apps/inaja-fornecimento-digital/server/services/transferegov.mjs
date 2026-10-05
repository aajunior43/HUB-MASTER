import { randomUUID } from "node:crypto";

const BASE_URL = "https://api-publica.transferegov.gestao.gov.br";
const sincronizacoesAtivas = new WeakSet();
const sincronizacoesAgendadas = new WeakSet();

function digitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function valor(valorOriginal) {
  const convertido = Number(valorOriginal);
  return Number.isFinite(convertido) ? convertido : 0;
}

async function requisitar(url, fetchImpl = fetch) {
  let resposta;
  try {
    resposta = await fetchImpl(url, { headers: { Accept: "application/json", "User-Agent": "Sistema-Prefeitura-Inaja/1.0" }, signal: AbortSignal.timeout(25_000) });
  } catch (erro) {
    if (erro?.name === "AbortError" || erro?.name === "TimeoutError") throw new Error("Transferegov excedeu 25 segundos sem responder");
    throw erro;
  }
  if (!resposta.ok) {
    let mensagem = "";
    try { mensagem = String((await resposta.json())?.detail || ""); } catch { mensagem = ""; }
    throw new Error(`Transferegov respondeu HTTP ${resposta.status}${mensagem ? `: ${mensagem}` : ""}`);
  }
  return resposta.json();
}

async function listar(modulo, caminho, filtros = {}, fetchImpl = fetch) {
  const itens = [];
  for (let pagina = 1; pagina <= 100; pagina += 1) {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filtros).filter(([, item]) => item !== null && item !== undefined && item !== "").map(([chave, item]) => [chave, String(item)])), pagina: String(pagina), tamanho_da_pagina: "100" });
    const resposta = await requisitar(`${BASE_URL}/${modulo}${caminho}?${params}`, fetchImpl);
    itens.push(...(Array.isArray(resposta?.data) ? resposta.data : []));
    if (pagina >= Number(resposta?.total_pages || 0)) break;
  }
  return itens;
}

async function mapearLimitado(itens, executar, limite = 4) {
  const resultados = [];
  let indice = 0;
  async function trabalhador() {
    while (indice < itens.length) {
      const atual = indice;
      indice += 1;
      resultados[atual] = await executar(itens[atual]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return resultados;
}

function instrumentoEspecial(item, cnpj) {
  return {
    fonte: "especial", chave: `especial:${item.id_plano_acao}`, tipo: "Transferência especial",
    codigo: String(item.codigo_plano_acao || item.id_plano_acao), ano: Number(item.ano_plano_acao) || null,
    situacao: item.situacao_plano_acao || null, objeto: item.detalhamento_objeto || item.nome_objeto || item.codigo_descricao_areas_politicas_publicas_plano_acao || null,
    orgao: "Secretaria do Tesouro Nacional", parlamentar: item.nome_parlamentar_emenda_plano_acao || null,
    emenda: item.numero_emenda_parlamentar_plano_acao ? String(item.numero_emenda_parlamentar_plano_acao) : null,
    cnpj, inicio: item.data_aceite_plano_acao || null, fim: null,
    total: valor(item.valor_custeio_plano_acao) + valor(item.valor_investimento_plano_acao), custeio: valor(item.valor_custeio_plano_acao), investimento: valor(item.valor_investimento_plano_acao), saldo: 0, raw: item,
  };
}

function instrumentoParceria(proposta, parceria, cnpj) {
  return {
    fonte: "parceria", chave: `parceria:${parceria?.id_parceria || `proposta:${proposta.id_proposta}`}`, tipo: parceria ? "Parceria" : "Proposta",
    codigo: String(parceria?.cd_parceria || proposta.id_proposta), ano: Number(proposta.ano_proposta) || null,
    situacao: parceria?.in_situacao_parceria || proposta.situacao_proposta || null, objeto: proposta.ds_objeto || null,
    orgao: proposta.nm_unidade_gestora || null, parlamentar: null, emenda: null, cnpj,
    inicio: parceria?.dh_assinatura || proposta.dt_proposta || null, fim: proposta.dt_limite_captacao || null,
    total: valor(proposta.nr_vlr_total), custeio: 0, investimento: 0, saldo: 0, raw: { proposta, parceria },
  };
}

function instrumentoFundo(item, cnpj) {
  return {
    fonte: "fundo_a_fundo", chave: `fundo:${item.id_plano_acao}`, tipo: "Fundo a fundo",
    codigo: String(item.codigo_plano_acao || item.id_plano_acao), ano: Number(String(item.data_inicio_vigencia_plano_acao || "").slice(0, 4)) || null,
    situacao: item.situacao_plano_acao || null, objeto: item.objetivos_plano_acao || item.diagnostico_plano_acao || null,
    orgao: item.nome_orgao_repassador_plano_acao || item.nome_ente_repassador_plano_acao || null,
    parlamentar: null, emenda: null, cnpj, inicio: item.data_inicio_vigencia_plano_acao || null, fim: item.data_fim_vigencia_plano_acao || null,
    total: valor(item.valor_total_plano_acao), custeio: valor(item.valor_total_custeio_plano_acao), investimento: valor(item.valor_total_investimento_plano_acao), saldo: valor(item.valor_saldo_disponivel_plano_acao), raw: item,
  };
}

function movimento(fonte, tipo, chave, instrumentoChave, item, campos) {
  return { fonte, tipo, chave: `${fonte}:${tipo}:${chave}`, instrumentoChave, numero: campos.numero || null, data: campos.data || null, valor: valor(campos.valor), situacao: campos.situacao || null, favorecido: campos.favorecido || null, descricao: campos.descricao || null, raw: item };
}

async function consultarEspeciais(cnpj, fetchImpl) {
  const beneficiarios = await listar("especiais", "/beneficiarios-especiais", { cnpj_beneficiario: cnpj }, fetchImpl);
  const instrumentos = [];
  const movimentos = [];
  const instrumentosPorConta = new Map();
  for (const beneficiario of beneficiarios.filter((item) => digitos(item.cnpj_beneficiario) === cnpj)) {
    const planos = await listar("especiais", "/planos-acao-especiais", { id_beneficiario: beneficiario.id_beneficiario }, fetchImpl);
    instrumentos.push(...planos.map((item) => instrumentoEspecial(item, cnpj)));
    for (const item of planos) if (item.id_agencia_conta) instrumentosPorConta.set(String(item.id_agencia_conta), `especial:${item.id_plano_acao}`);
    const empenhos = (await mapearLimitado(planos, (item) => listar("especiais", "/empenhos-especiais", { id_plano_acao: item.id_plano_acao }, fetchImpl))).flat();
    for (const item of empenhos) movimentos.push(movimento("especial", "empenho", item.id_empenho, `especial:${item.id_plano_acao}`, item, { numero: item.numero_empenho || item.id_minuta_empenho, data: item.data_emissao_empenho, valor: item.valor_empenho, situacao: item.descricao_situacao_empenho || item.status_processamento_empenho, descricao: item.descricao_ug_emitente_empenho }));
  }
  const lancamentos = await listar("especiais", "/gestao-financeira-lancamentos-especiais", { cnpj_ente_solicitante_gestao_financeira: cnpj }, fetchImpl);
  for (const item of lancamentos.filter((registro) => digitos(registro.cnpj_ente_solicitante_gestao_financeira) === cnpj)) movimentos.push(movimento("especial", "movimentacao", item.id_lancamento_gestao_financeira, instrumentosPorConta.get(String(item.id_agencia_conta)) || null, item, { numero: item.numero_ordem_gestao_financeira || item.numero_referencia_unica_gestao_financeira, data: item.data_lancamento_gestao_financeira, valor: item.valor_gestao_financeira, situacao: item.tipo_operacao_gestao_financeira, favorecido: item.nome_favorecido_gestao_financeira, descricao: item.descricao_gestao_financeira }));
  return { instrumentos, movimentos };
}

async function consultarParcerias(cnpj, fetchImpl) {
  const propostas = (await listar("parcerias", "/proposta", { cnpj_ente_recebedor: cnpj }, fetchImpl)).filter((item) => digitos(item.cnpj_ente_recebedor) === cnpj);
  const instrumentos = [];
  const movimentos = [];
  for (const proposta of propostas) {
    const parcerias = await listar("parcerias", "/parceria", { id_proposta: proposta.id_proposta }, fetchImpl);
    if (!parcerias.length) instrumentos.push(instrumentoParceria(proposta, null, cnpj));
    for (const parceria of parcerias) {
      instrumentos.push(instrumentoParceria(proposta, parceria, cnpj));
      const empenhos = await listar("parcerias", "/empenho-parceria", { id_parceria: parceria.id_parceria }, fetchImpl);
      for (const item of empenhos) movimentos.push(movimento("parceria", "empenho", item.id_empenho_parceria, `parceria:${parceria.id_parceria}`, item, { numero: item.nr_empenho || item.numero_empenho, data: item.data_emissao, valor: item.valor_empenho, situacao: item.nome_situacao_minuta || item.in_situacao_siafi, favorecido: item.nome_favorecido, descricao: item.descricao_empenho }));
    }
  }
  return { instrumentos, movimentos };
}

async function consultarFundo(cnpj, fetchImpl) {
  const planos = (await listar("fundoafundo", "/planos-acao", { cnpj_ente_recebedor_plano_acao: cnpj }, fetchImpl)).filter((item) => digitos(item.cnpj_ente_recebedor_plano_acao) === cnpj);
  const instrumentos = planos.map((item) => instrumentoFundo(item, cnpj));
  const movimentos = [];
  const empenhos = (await mapearLimitado(planos, (item) => listar("fundoafundo", "/empenhos", { id_plano_acao: item.id_plano_acao }, fetchImpl))).flat();
  for (const item of empenhos) movimentos.push(movimento("fundo_a_fundo", "empenho", item.id_empenho, `fundo:${item.id_plano_acao}`, item, { numero: item.numero_empenho, data: item.data_emissao_empenho, valor: item.valor_empenho, situacao: item.descricao_situacao_empenho || item.situacao_empenho, favorecido: item.cnpj_favorecido_empenho, descricao: item.objeto_empenho || item.observacao_empenho }));
  const lancamentos = await listar("fundoafundo", "/gestao-financeira-lancamentos", { cnpj_ente_solicitante_gestao_financeira: cnpj }, fetchImpl);
  for (const item of lancamentos.filter((registro) => digitos(registro.cnpj_ente_solicitante_gestao_financeira) === cnpj)) movimentos.push(movimento("fundo_a_fundo", "movimentacao", item.id_lancamento_gestao_financeira, null, item, { numero: item.numero_ordem_gestao_financeira || item.numero_referencia_unica_gestao_financeira, data: item.data_lancamento_gestao_financeira, valor: item.valor_lancamento_gestao_financeira, situacao: item.descricao_tipo_operacao_gestao_financeira, favorecido: item.nome_favorecido_gestao_financeira, descricao: item.descricao_gestao_financeira }));
  return { instrumentos, movimentos };
}

function salvar(db, instrumentos, movimentos) {
  const inserirInstrumento = db.prepare(`INSERT INTO tgov_instrumentos (id, fonte, chave_externa, tipo, codigo, ano, situacao, objeto, orgao_repassador, parlamentar, numero_emenda, cnpj_beneficiario, inicio_vigencia, fim_vigencia, valor_total, valor_custeio, valor_investimento, saldo, raw_json, sincronizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(chave_externa) DO UPDATE SET fonte=excluded.fonte,tipo=excluded.tipo,codigo=excluded.codigo,ano=excluded.ano,situacao=excluded.situacao,objeto=excluded.objeto,orgao_repassador=excluded.orgao_repassador,parlamentar=excluded.parlamentar,numero_emenda=excluded.numero_emenda,cnpj_beneficiario=excluded.cnpj_beneficiario,inicio_vigencia=excluded.inicio_vigencia,fim_vigencia=excluded.fim_vigencia,valor_total=excluded.valor_total,valor_custeio=excluded.valor_custeio,valor_investimento=excluded.valor_investimento,saldo=excluded.saldo,raw_json=excluded.raw_json,sincronizado_em=datetime('now')`);
  const inserirMovimento = db.prepare(`INSERT INTO tgov_movimentacoes (id, instrumento_id, fonte, chave_externa, tipo, numero, data, valor, situacao, favorecido, descricao, raw_json, sincronizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(chave_externa) DO UPDATE SET instrumento_id=excluded.instrumento_id,fonte=excluded.fonte,tipo=excluded.tipo,numero=excluded.numero,data=excluded.data,valor=excluded.valor,situacao=excluded.situacao,favorecido=excluded.favorecido,descricao=excluded.descricao,raw_json=excluded.raw_json,sincronizado_em=datetime('now')`);
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const item of instrumentos) inserirInstrumento.run(randomUUID(), item.fonte, item.chave, item.tipo, item.codigo, item.ano, item.situacao, item.objeto, item.orgao, item.parlamentar, item.emenda, item.cnpj, item.inicio, item.fim, item.total, item.custeio, item.investimento, item.saldo, JSON.stringify(item.raw));
    const ids = new Map(db.prepare("SELECT chave_externa, id FROM tgov_instrumentos").all().map((item) => [item.chave_externa, item.id]));
    for (const item of movimentos) inserirMovimento.run(randomUUID(), ids.get(item.instrumentoChave) || null, item.fonte, item.chave, item.tipo, item.numero, item.data, item.valor, item.situacao, item.favorecido, item.descricao, JSON.stringify(item.raw));
    db.exec("COMMIT");
  } catch (erro) { db.exec("ROLLBACK"); throw erro; }
}

export async function sincronizarTransferegov(db, opcoes = {}) {
  if (sincronizacoesAtivas.has(db)) throw new Error("Já existe uma sincronização do Transferegov em andamento.");
  sincronizacoesAtivas.add(db);
  try {
    return await sincronizarTransferegovInterno(db, opcoes);
  } finally {
    sincronizacoesAtivas.delete(db);
  }
}

async function sincronizarTransferegovInterno(db, opcoes = {}) {
  const cnpj = digitos(opcoes.cnpj || "76970318000167");
  if (cnpj.length !== 14) throw new Error("Configure um CNPJ válido para consultar o Transferegov.");
  const id = randomUUID();
  db.prepare("INSERT INTO tgov_sincronizacoes (id, cnpj, status) VALUES (?, ?, 'executando')").run(id, cnpj);
  const fontes = [["especiais", consultarEspeciais], ["parcerias", consultarParcerias], ["fundo a fundo", consultarFundo]];
  const erros = [];
  const resultados = await Promise.all(fontes.map(async ([nome, consultar]) => {
    try { return await consultar(cnpj, opcoes.fetchImpl); } catch (erro) { erros.push(`${nome}: ${erro?.message || erro}`); return { instrumentos: [], movimentos: [] }; }
  }));
  const instrumentos = [...new Map(resultados.flatMap((item) => item.instrumentos).map((item) => [item.chave, item])).values()];
  const movimentos = [...new Map(resultados.flatMap((item) => item.movimentos).map((item) => [item.chave, item])).values()];
  salvar(db, instrumentos, movimentos);
  const totais = { instrumentos: instrumentos.length, movimentacoes: movimentos.length };
  const status = erros.length === fontes.length ? "erro" : erros.length ? "parcial" : "concluido";
  db.prepare("UPDATE tgov_sincronizacoes SET status=?, totais=?, erros=?, finalizado_em=datetime('now') WHERE id=?").run(status, JSON.stringify(totais), JSON.stringify(erros), id);
  return { id, status, totais, erros };
}

export function configuracaoTransferegov(db) {
  const obter = (chave) => db.prepare("SELECT valor FROM configuracoes WHERE chave=?").get(chave)?.valor;
  return { cnpj: digitos(obter("transferegov_cnpj") || obter("pncp_cnpj") || "76970318000167"), intervaloHoras: Math.max(1, Number(obter("transferegov_sincronizacao_horas") || 24)) };
}

export function agendarSincronizacaoTransferegov(db) {
  if (sincronizacoesAtivas.has(db) || sincronizacoesAgendadas.has(db)) return false;
  const config = configuracaoTransferegov(db);
  const ultima = db.prepare("SELECT finalizado_em,iniciado_em FROM tgov_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1").get();
  const referencia = ultima?.finalizado_em || ultima?.iniciado_em;
  if (referencia && Date.now() - new Date(`${referencia.replace(" ", "T")}Z`).getTime() < config.intervaloHoras * 3600000) return false;
  sincronizacoesAgendadas.add(db);
  setImmediate(async () => {
    sincronizacoesAgendadas.delete(db);
    try { await sincronizarTransferegov(db, config); } catch { return undefined; }
  });
  return true;
}
