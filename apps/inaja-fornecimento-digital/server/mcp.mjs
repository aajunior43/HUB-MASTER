import { createHash, randomBytes, randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { runQuery, runRpc } from "./db.mjs";
import { createBackup, publishBackupToGitHub } from "./backup.mjs";
import { logger, sanitize } from "./logger.mjs";

const STATUS = ["todo", "doing", "done"];
const STATUS_ATIVOS = ["todo", "doing"];
const PRIORIDADES = ["baixa", "media", "alta"];
const STATUS_EMPENHO = ["pendente", "empenhado"];
const CATEGORIAS_PRAZO = ["geral", "prestacao_contas", "tribunal_contas", "licitacao", "contrato", "convenio", "folha_pagamento", "fiscal", "obra", "rh", "saude", "educacao", "outro"];
const MODULO_POR_FERRAMENTA = {
  listar_tarefas: "tarefas", criar_tarefa: "tarefas", editar_tarefa: "tarefas", mover_tarefa: "tarefas", remover_tarefa: "tarefas", resumo_tarefas: "tarefas",
  listar_credores: "credores-fixos", criar_credor: "credores-fixos", editar_credor: "credores-fixos", remover_credor: "credores-fixos", listar_empenhos_mensais: "credores-fixos", atualizar_empenho_mensal: "credores-fixos", remover_empenho_mensal: "credores-fixos", resumo_empenhos: "credores-fixos", credores_pendentes: "credores-fixos",
  listar_solicitacoes: "solicitacoes", criar_solicitacao: "solicitacoes", editar_solicitacao: "solicitacoes", adicionar_observacao_solicitacao: "solicitacoes", remover_solicitacao: "solicitacoes", resumo_solicitacoes: "solicitacoes",
  listar_obrigacoes: "prazos", criar_obrigacao: "prazos", atualizar_obrigacao: "prazos", concluir_obrigacao: "prazos", remover_obrigacao: "prazos", resumo_obrigacoes: "prazos",
};

// RPCs já existentes no sistema que passam a ficar disponíveis no MCP.
// Os argumentos são agrupados em `argumentos` para manter um contrato estável
// e permitir a evolução das RPCs sem quebrar clientes MCP.
export const RPCS_MCP = [
  ["consultar_estatisticas_empenhos", "empenhos_stats", "empenhos", "Consulta estatísticas consolidadas dos empenhos orçamentários."],
  ["listar_empenhos_orcamentarios", "empenhos_listar", "empenhos", "Lista empenhos orçamentários com filtros e paginação."],
  ["obter_empenho_orcamentario", "empenhos_get", "empenhos", "Consulta um empenho orçamentário pelo identificador."],
  ["listar_filtros_empenhos", "empenhos_filtros_disponiveis", "empenhos", "Lista os valores disponíveis para filtros de empenhos."],
  ["importar_empenhos", "empenhos_importar", "empenhos", "Importa dados de empenhos conforme o formato aceito pelo sistema."],

  ["listar_arquivos_documentos", "gd_arquivos_listar", "gestao-documentos", "Lista arquivos da gestão de documentos."],
  ["criar_pasta_documentos", "gd_pasta_criar", "gestao-documentos", "Cria uma pasta na gestão de documentos."],
  ["remover_pasta_documentos", "gd_pasta_excluir", "gestao-documentos", "Remove uma pasta de documentos após confirmação."],
  ["registrar_arquivo_documento", "gd_arquivo_registrar", "gestao-documentos", "Registra um arquivo já armazenado na gestão de documentos."],
  ["renomear_arquivo_documento", "gd_arquivo_renomear", "gestao-documentos", "Renomeia um arquivo da gestão de documentos."],
  ["remover_arquivo_documento", "gd_arquivo_excluir", "gestao-documentos", "Remove um arquivo da gestão de documentos após confirmação."],
  ["listar_setores_documentos", "gd_setores_listar", "gestao-documentos", "Lista setores disponíveis para tramitação."],
  ["listar_tipos_documentos", "gd_tipos_listar", "gestao-documentos", "Lista tipos de documento disponíveis."],
  ["criar_documento", "gd_documento_criar", "gestao-documentos", "Cria um documento administrativo."],
  ["atualizar_documento", "gd_documento_atualizar", "gestao-documentos", "Atualiza um documento administrativo."],
  ["enviar_documento", "gd_documento_enviar", "gestao-documentos", "Envia um documento para tramitação."],
  ["responder_documento", "gd_documento_responder", "gestao-documentos", "Responde a um documento recebido."],
  ["encaminhar_documento", "gd_documento_encaminhar", "gestao-documentos", "Encaminha um documento para outro setor."],
  ["arquivar_documento", "gd_documento_arquivar", "gestao-documentos", "Arquiva um documento."],
  ["cancelar_documento", "gd_documento_cancelar", "gestao-documentos", "Cancela um documento após confirmação."],
  ["obter_documento", "gd_documento_get", "gestao-documentos", "Consulta um documento e seu histórico."],
  ["listar_documentos", "gd_documento_listar", "gestao-documentos", "Lista documentos com busca, filtros e paginação."],
  ["anexar_arquivo_documento", "gd_documento_anexar", "gestao-documentos", "Anexa um arquivo a um documento."],
  ["listar_notificacoes_documentos", "gd_notificacoes_listar", "gestao-documentos", "Lista notificações do usuário na gestão de documentos."],
  ["marcar_notificacao_documento_lida", "gd_notificacao_marcar_lida", "gestao-documentos", "Marca uma notificação como lida."],
  ["listar_filtros_documentos", "gd_filtros_listar", "gestao-documentos", "Lista filtros salvos de documentos."],
  ["salvar_filtro_documentos", "gd_filtro_salvar", "gestao-documentos", "Salva um filtro de documentos."],
  ["remover_filtro_documentos", "gd_filtro_excluir", "gestao-documentos", "Remove um filtro salvo de documentos."],
  ["listar_superlog_documentos", "gd_superlog_listar", "gestao-documentos", "Consulta o histórico de auditoria da gestão de documentos."],

  ["listar_eventos_calendario", "calendario_listar", "calendario", "Lista eventos e regras do calendário municipal."],
  ["criar_evento_calendario", "calendario_evento_criar", "calendario", "Cria evento no calendário municipal."],
  ["atualizar_evento_calendario", "calendario_evento_atualizar", "calendario", "Atualiza evento do calendário municipal."],
  ["remover_evento_calendario", "calendario_evento_excluir", "calendario", "Remove evento do calendário após confirmação."],
  ["marcar_excecao_calendario", "calendario_override_marcar", "calendario", "Marca uma data como exceção no calendário."],
  ["remover_excecao_calendario", "calendario_override_remover", "calendario", "Remove uma exceção do calendário."],
  ["salvar_regras_calendario", "calendario_regras_salvar", "calendario", "Salva regras recorrentes do calendário."],

  ["listar_rpas", "rpas_listar", "rpas", "Lista recibos de pagamento autônomo com filtros."],
  ["calcular_rpa", "rpas_calcular", "rpas", "Calcula tributos e valores líquidos de um RPA."],
  ["criar_rpa", "rpas_criar", "rpas", "Cria um recibo de pagamento autônomo."],
  ["atualizar_rpa", "rpas_atualizar", "rpas", "Atualiza um RPA existente."],
  ["remover_rpa", "rpas_excluir", "rpas", "Remove um RPA após confirmação."],

  ["listar_modelos_ia", "ia_modelos_listar", "assistente-empenho", "Lista modelos de IA disponíveis para o sistema."],
  ["consultar_ia", "ia_chat", "assistente-empenho", "Executa uma consulta conversacional na IA configurada."],
  ["executar_assistente_empenho", "empenho_assistente_executar", "assistente-empenho", "Executa uma ação do assistente de empenhos."],
  ["classificar_despesa", "classificador_despesa_classificar", "classificador-despesa", "Classifica uma despesa usando a IA configurada."],
  ["sugerir_tarefa_com_ia", "kanban_ia_sugerir", "tarefas", "Gera sugestões para tarefas do Kanban usando IA."],

  ["listar_envios_autentique", "autentique_envios_listar", "autentique", "Lista documentos enviados para assinatura."],
  ["listar_contatos_autentique", "autentique_contatos_listar", "autentique", "Lista contatos da integração de assinaturas."],
  ["salvar_contato_autentique", "autentique_contato_salvar", "autentique", "Salva contato para uso em assinaturas."],
  ["remover_contato_autentique", "autentique_contato_excluir", "autentique", "Remove contato da integração de assinaturas."],

  ["listar_contas_financeiras", "em_contas_listar", "extratos", "Lista contas financeiras."],
  ["criar_conta_financeira", "em_conta_criar", "extratos", "Cria conta financeira."],
  ["atualizar_conta_financeira", "em_conta_atualizar", "extratos", "Atualiza conta financeira."],
  ["remover_conta_financeira", "em_conta_excluir", "extratos", "Remove conta financeira após confirmação."],
  ["listar_transacoes_financeiras", "em_transacoes_listar", "extratos", "Lista transações financeiras."],
  ["criar_transacao_financeira", "em_transacao_criar", "extratos", "Cria transação financeira."],
  ["atualizar_transacao_financeira", "em_transacao_atualizar", "extratos", "Atualiza transação financeira."],
  ["remover_transacao_financeira", "em_transacao_excluir", "extratos", "Remove transação financeira após confirmação."],
  ["listar_alertas_financeiros", "em_alertas_listar", "extratos", "Lista alertas financeiros."],
  ["resolver_alerta_financeiro", "em_alerta_resolver", "extratos", "Resolve um alerta financeiro."],
  ["consultar_dashboard_financeiro", "em_dashboard", "extratos", "Consulta o dashboard financeiro."],

  ["listar_recados_mural", "mural_listar", "mural", "Lista recados do mural."],
  ["criar_recado_mural", "mural_criar", "mural", "Publica recado no mural."],
  ["atualizar_recado_mural", "mural_atualizar", "mural", "Atualiza recado do mural."],
  ["remover_recado_mural", "mural_excluir", "mural", "Remove recado do mural após confirmação."],
  ["listar_comentarios_mural", "mural_comentarios_listar", "mural", "Lista comentários de um recado."],
  ["criar_comentario_mural", "mural_comentario_criar", "mural", "Adiciona comentário a um recado."],
  ["remover_comentario_mural", "mural_comentario_excluir", "mural", "Remove comentário do mural após confirmação."],

  ["buscar_cnpj", "cnpj_buscar", "cnpj", "Consulta dados cadastrais de um CNPJ."],
  ["listar_cnpjs_salvos", "cnpj_salvos_listar", "cnpj", "Lista CNPJs salvos pelo usuário."],
  ["salvar_cnpj", "cnpj_salvo_salvar", "cnpj", "Salva um CNPJ para consulta posterior."],
  ["remover_cnpj_salvo", "cnpj_salvo_remover", "cnpj", "Remove CNPJ salvo após confirmação."],

  ["consultar_status_backup", "backup_status", "admin-config", "Consulta o status dos backups do sistema."],
  ["listar_backups", "backup_listar", "admin-config", "Lista backups disponíveis."],
  ["verificar_integridade_backup", "backup_integridade", "admin-config", "Verifica a integridade de um backup."],
  ["criar_backup_completo", "backup_criar", "admin-config", "Cria backup completo do sistema."],
  ["enviar_backup_completo_github", "backup_enviar_github", "admin-config", "Envia backup completo ao GitHub após confirmação."],
  ["remover_backup", "backup_excluir", "admin-config", "Remove backup após confirmação explícita."],
];

/**
 * Confirmações obrigatórias para RPCs que removem, revogam, cancelam ou
 * publicam dados. A validação acontece antes do runRpc e também é refletida
 * no schema MCP, portanto não depende apenas do comportamento do agente.
 */
export const RPC_CONFIRMATIONS = Object.freeze({
  empenhos_importar: "IMPORTAR_EMPENHOS",
  gd_pasta_excluir: "REMOVER",
  gd_arquivo_excluir: "REMOVER",
  gd_documento_cancelar: "CANCELAR",
  gd_filtro_excluir: "REMOVER",
  calendario_evento_excluir: "REMOVER",
  calendario_override_remover: "REMOVER",
  rpas_excluir: "REMOVER",
  autentique_contato_excluir: "REMOVER",
  em_conta_excluir: "REMOVER",
  em_transacao_excluir: "REMOVER",
  mural_excluir: "REMOVER",
  mural_comentario_excluir: "REMOVER",
  cnpj_salvo_remover: "REMOVER",
  backup_enviar_github: "ENVIAR_BACKUP",
  backup_excluir: "REMOVER",
});

// Names explicitly classified as read-only. Leaving a new RPC out of this
// set is intentionally conservative: clients will treat it as a mutation.
const RPC_READ_ONLY_TOOLS = new Set([
  "consultar_estatisticas_empenhos", "listar_empenhos_orcamentarios", "obter_empenho_orcamentario", "listar_filtros_empenhos",
  "listar_arquivos_documentos", "listar_setores_documentos", "listar_tipos_documentos", "obter_documento", "listar_documentos",
  "listar_notificacoes_documentos", "listar_filtros_documentos", "listar_superlog_documentos",
  "listar_eventos_calendario", "listar_rpas", "calcular_rpa", "listar_modelos_ia", "consultar_ia", "classificar_despesa",
  "sugerir_tarefa_com_ia", "listar_envios_autentique", "listar_contatos_autentique",
  "listar_contas_financeiras", "listar_transacoes_financeiras", "listar_alertas_financeiros",
  "consultar_dashboard_financeiro", "listar_recados_mural", "listar_comentarios_mural", "buscar_cnpj", "listar_cnpjs_salvos",
  "consultar_status_backup", "listar_backups", "verificar_integridade_backup",
]);

const MCP_RESERVED_RPC_KEYS = new Set(["_caller", "_username", "_ip", "_request_id", "_user_agent"]);

for (const [nome, , modulo] of RPCS_MCP) MODULO_POR_FERRAMENTA[nome] = modulo;
const ITEM_SOLICITACAO = z.object({
  codigoItem: z.string().trim().max(120).optional(), item: z.string().trim().min(1).max(240),
  descricao: z.string().trim().max(4000).optional(), quantidade: z.number().positive(), valorUnitario: z.number().nonnegative(),
});

function texto(dados) {
  return { content: [{ type: "text", text: JSON.stringify(dados, null, 2) }] };
}

function erro(mensagem) {
  return { content: [{ type: "text", text: mensagem }], isError: true };
}

function auditar(db, usuario, acao, entidadeId, detalhes, entidade = "tarefa") {
  const payload = { origem: "mcp", chave_id: usuario.mcpTokenId, ...detalhes };
  if (usuario.requestId) payload.request_id = usuario.requestId;
  db.prepare("INSERT INTO gd_logs_auditoria (id, usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?, ?)")
    .run(randomUUID(), usuario.id, acao, entidade, entidadeId || null, JSON.stringify(sanitize(payload)));
}

function validarPrazo(prazo) {
  if (prazo != null && prazo !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) throw new Error("O prazo deve estar no formato YYYY-MM-DD.");
  return prazo || null;
}

function validarData(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("A data deve estar no formato YYYY-MM-DD.");
  return data;
}

export function validarConfirmacaoRpc(funcao, argumentos = {}) {
  const esperada = RPC_CONFIRMATIONS[funcao];
  if (!esperada) return;
  if (!argumentos || argumentos._confirmacao !== esperada) {
    throw new Error(`Esta operação exige argumentos._confirmacao = "${esperada}".`);
  }
}

export function criarServidor(db, usuario) {
  const servidor = new McpServer({ name: "prefeitura-inaja", version: "1.2.0" });
  const registrarFerramenta = servidor.registerTool.bind(servidor);
  servidor.registerTool = (nome, configuracao, manipulador) => {
    const modulo = MODULO_POR_FERRAMENTA[nome];
    if (modulo && !usuario.is_admin && !usuario.modulos.includes(modulo)) return undefined;
    return registrarFerramenta(nome, configuracao, async (argumentos) => {
    const inicio = performance.now();
    try {
      const resposta = await manipulador(argumentos);
      auditar(db, usuario, "mcp_ferramenta_executada", null, {
        ferramenta: nome,
        resultado: resposta.isError ? "erro" : "sucesso",
        duracao_ms: Math.round(performance.now() - inicio),
      }, "mcp_ferramenta");
      return resposta;
    } catch (e) {
      auditar(db, usuario, "mcp_ferramenta_executada", null, {
        ferramenta: nome,
        resultado: "erro",
        duracao_ms: Math.round(performance.now() - inicio),
        erro: e instanceof Error ? e.message : "Erro desconhecido",
      }, "mcp_ferramenta");
      return erro(e instanceof Error ? e.message : "Erro desconhecido");
    }
    });
  };
  const executarRpcMcp = async (funcao, argumentos = {}) => {
    validarConfirmacaoRpc(funcao, argumentos);
    const argumentosDoCliente = argumentos && typeof argumentos === "object" ? argumentos : {};
    const argumentosSeguros = Object.fromEntries(
      Object.entries(argumentosDoCliente).filter(([chave]) => !MCP_RESERVED_RPC_KEYS.has(chave)),
    );
    const resposta = await runRpc(db, funcao, {
      ...argumentosSeguros,
      _ip: usuario.clientIp || null,
      _request_id: usuario.requestId || null,
      _user_agent: "mcp",
    }, usuario.username);
    if (resposta?.error) return erro(`${resposta.error.message || "Erro na operação"} [${resposta.error.code || "RPC_ERROR"}]`);
    return texto({ dados: resposta?.data ?? null });
  };
  for (const [nome, funcao, modulo, descricao] of RPCS_MCP) {
    const confirmacao = RPC_CONFIRMATIONS[funcao];
    const argumentosSchema = confirmacao
      ? z.object({ _confirmacao: z.literal(confirmacao) }).passthrough()
      : z.record(z.unknown()).optional();
    servidor.registerTool(nome, {
      title: nome.replace(/_/g, " "),
      description: `${descricao} Os parâmetros da RPC devem ser enviados dentro de argumentos, usando os nomes documentados no sistema (por exemplo, _id, _pagina e _busca).${confirmacao ? ` A operação exige argumentos._confirmacao = "${confirmacao}".` : ""}`,
      inputSchema: { argumentos: argumentosSchema },
      annotations: { readOnlyHint: RPC_READ_ONLY_TOOLS.has(nome), destructiveHint: Boolean(confirmacao) },
    }, async ({ argumentos }) => executarRpcMcp(funcao, argumentos));
  }
  const paginar = async (consultarDados, filtros, ordenacao, { limite = 50, cursor } = {}) => {
    const tamanho = Math.min(Math.max(limite, 1), 100);
    const inicio = cursor ? Number.parseInt(cursor, 10) : 0;
    if (!Number.isSafeInteger(inicio) || inicio < 0) throw new Error("Cursor invÃ¡lido.");
    const r = runQuery(db, { table: consultarDados, action: "select", select: "*", filters, order: ordenacao, limit: tamanho + 1, offset: inicio }, usuario.username);
    if (r.error) throw new Error(r.error.message);
    const registros = r.data || [];
    const temProxima = registros.length > tamanho;
    return { itens: registros.slice(0, tamanho), proximo_cursor: temProxima ? String(inicio + tamanho) : null, limite: tamanho };
  };
  const consultar = async (filtros = [], incluirConcluidas = false) => {
    const r = runQuery(db, {
      table: "tarefas", action: "select", select: "*", filters: filtros,
      order: [{ column: "ordem", ascending: true }, { column: "created_at", ascending: true }], limit: 200,
    }, usuario.username);
    if (r.error) throw new Error(r.error.message);
    const tarefas = r.data || [];
    return incluirConcluidas ? tarefas : tarefas.filter((t) => t.status !== "done");
  };
  const atualizar = async (id, payload) => {
    const r = runQuery(db, { table: "tarefas", action: "update", filters: [{ column: "id", value: id }], payload }, usuario.username);
    if (r.error) throw new Error(r.error.message);
  };
  const consultarCredores = async (filtros = []) => {
    const r = runQuery(db, {
      table: "credores_fixos", action: "select", select: "*", filters: filtros,
      order: [{ column: "nome", ascending: true }], limit: 200,
    }, usuario.username);
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  };
  const consultarEmpenhos = async (filtros = []) => {
    const r = runQuery(db, {
      table: "empenhos_mensais", action: "select", select: "*", filters: filtros,
      order: [{ column: "ano", ascending: false }, { column: "mes", ascending: true }], limit: 500,
    }, usuario.username);
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  };
  const consultarSolicitacoes = async (filtros = []) => {
    const r = runQuery(db, {
      table: "solicitacoes", action: "select", select: "*", filters: filtros,
      order: [{ column: "created_at", ascending: false }], limit: 200,
    }, usuario.username);
    if (r.error) throw new Error(r.error.message);
    return r.data || [];
  };
  const consultarObrigacoes = (filtros = [], limite = 500, offset = 0) => {
    const clausulas = [];
    const valores = [];
    for (const [coluna, valor] of filtros) {
      if (!['id', 'categoria', 'resolvido', 'data_limite'].includes(coluna)) throw new Error("Filtro de obrigação inválido.");
      clausulas.push(`${coluna} = ?`);
      valores.push(valor);
    }
    const where = clausulas.length ? `WHERE ${clausulas.join(" AND ")}` : "";
    return db.prepare(`SELECT * FROM prazos ${where} ORDER BY data_limite ASC, criado_em DESC LIMIT ? OFFSET ?`).all(...valores, limite, offset);
  };

  servidor.registerTool("listar_tarefas", {
    title: "Listar tarefas", description: "Lista as tarefas do Mural/Kanban às quais o usuário configurado tem acesso.",
    inputSchema: { status: z.enum(STATUS).optional(), responsavel: z.string().trim().max(120).optional(), limite: z.number().int().min(1).max(100).default(50), cursor: z.string().regex(/^\d+$/).optional() },
    annotations: { readOnlyHint: true },
  }, async ({ status, responsavel, limite, cursor }) => {
    try {
      const filtros = [];
      if (status) filtros.push({ column: "status", value: status });
      if (responsavel) filtros.push({ column: "responsavel", value: responsavel });
      const pagina = await paginar("tarefas", filtros, [{ column: "ordem", ascending: true }, { column: "created_at", ascending: true }], { limite, cursor });
      auditar(db, usuario, "mcp_tarefas_listadas", null, { filtros: { status, responsavel }, retornadas: pagina.itens.length, cursor });
      return texto({ tarefas: pagina.itens, proximo_cursor: pagina.proximo_cursor, limite: pagina.limite });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("criar_tarefa", {
    title: "Criar tarefa", description: "Cria uma nova tarefa no Mural de Tarefas.",
    inputSchema: {
      titulo: z.string().trim().min(1).max(240), descricao: z.string().trim().max(8000).optional(),
      responsavel: z.string().trim().max(120).optional(), prioridade: z.enum(PRIORIDADES).default("media"),
      status: z.enum(STATUS_ATIVOS).default("todo"), prazo: z.string().optional(),
    }, annotations: { readOnlyHint: false },
  }, async (args) => {
    try {
      const tarefas = await consultar([{ column: "status", value: args.status }]);
      const ordem = Math.max(0, ...tarefas.map((t) => Number(t.ordem) || 0)) + 1;
      const payload = { id: randomUUID(), titulo: args.titulo, descricao: args.descricao || null, anexos: [], responsavel: args.responsavel || null, prioridade: args.prioridade, status: args.status, prazo: validarPrazo(args.prazo), ordem };
      const r = runQuery(db, { table: "tarefas", action: "insert", payload }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_tarefa_criada", payload.id, { titulo: payload.titulo, status: payload.status });
      return texto({ mensagem: "Tarefa criada.", tarefa: r.data });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("editar_tarefa", {
    title: "Editar tarefa", description: "Altera os dados informados de uma tarefa existente.",
    inputSchema: {
      id: z.string().uuid(), titulo: z.string().trim().min(1).max(240).optional(), descricao: z.string().trim().max(8000).nullable().optional(),
      responsavel: z.string().trim().max(120).nullable().optional(), prioridade: z.enum(PRIORIDADES).optional(), prazo: z.string().nullable().optional(),
    }, annotations: { readOnlyHint: false },
  }, async ({ id, ...camposRecebidos }) => {
    try {
      const atual = (await consultar([{ column: "id", value: id }], true))[0];
      if (!atual) throw new Error("Tarefa não encontrada.");
      const campos = Object.fromEntries(Object.entries(camposRecebidos).filter(([, valor]) => valor !== undefined));
      if ("prazo" in campos) campos.prazo = validarPrazo(campos.prazo);
      if (!Object.keys(campos).length) throw new Error("Informe ao menos um campo para atualizar.");
      await atualizar(id, campos);
      auditar(db, usuario, "mcp_tarefa_editada", id, { campos: Object.keys(campos) });
      return texto({ mensagem: "Tarefa atualizada.", tarefa: (await consultar([{ column: "id", value: id }], true))[0] });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("mover_tarefa", {
    title: "Mover tarefa", description: "Move uma tarefa entre A Fazer (todo), Em Andamento (doing) e Concluído (done).",
    inputSchema: { id: z.string().uuid(), status: z.enum(STATUS) }, annotations: { readOnlyHint: false },
  }, async ({ id, status }) => {
    try {
      const atual = (await consultar([{ column: "id", value: id }], true))[0];
      if (!atual) throw new Error("Tarefa não encontrada.");
      const destino = await consultar([{ column: "status", value: status }], true);
      const ordem = Math.max(0, ...destino.filter((t) => t.id !== id).map((t) => Number(t.ordem) || 0)) + 1;
      await atualizar(id, { status, ordem });
      auditar(db, usuario, "mcp_tarefa_movida", id, { status_anterior: atual.status, status_novo: status });
      return texto({ mensagem: "Tarefa movida.", tarefa: status === "done" ? null : (await consultar([{ column: "id", value: id }]))[0] });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("remover_tarefa", {
    title: "Remover tarefa", description: "Remove permanentemente uma tarefa. Use somente quando a exclusão tiver sido confirmada.",
    inputSchema: { id: z.string().uuid(), confirmacao: z.literal("REMOVER") },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    try {
      const atual = (await consultar([{ column: "id", value: id }], true))[0];
      if (!atual) throw new Error("Tarefa não encontrada.");
      const r = runQuery(db, { table: "tarefas", action: "delete", filters: [{ column: "id", value: id }] }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_tarefa_removida", id, { titulo: atual.titulo });
      return texto({ mensagem: "Tarefa removida permanentemente.", id });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("listar_credores", {
    title: "Listar credores fixos", description: "Lista os credores fixos cadastrados, com filtro opcional por departamento.",
    inputSchema: { departamento: z.string().trim().max(120).optional(), limite: z.number().int().min(1).max(100).default(50), cursor: z.string().regex(/^\d+$/).optional() }, annotations: { readOnlyHint: true },
  }, async ({ departamento, limite, cursor }) => {
    try {
      const filtros = departamento ? [{ column: "departamento", value: departamento }] : [];
      const pagina = await paginar("credores_fixos", filtros, [{ column: "nome", ascending: true }], { limite, cursor });
      auditar(db, usuario, "mcp_credores_listados", null, { departamento, retornados: pagina.itens.length, cursor }, "credor_fixo");
      return texto({ credores: pagina.itens, proximo_cursor: pagina.proximo_cursor, limite: pagina.limite });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("criar_credor", {
    title: "Criar credor fixo", description: "Cadastra um credor fixo para controle mensal de empenhos.",
    inputSchema: {
      nome: z.string().trim().min(1).max(240), departamento: z.string().trim().min(1).max(120).default("Administração"),
      valor_mensal: z.number().nonnegative(), documento: z.string().trim().max(40).nullable().optional(), descricao: z.string().trim().max(2000).nullable().optional(),
      email: z.string().trim().email().max(254).nullable().optional(), tipo_valor: z.string().trim().max(80).nullable().optional(),
      solicitacao: z.string().trim().max(80).nullable().optional(), pagamento: z.string().trim().max(80).nullable().optional(), obs: z.string().trim().max(1000).nullable().optional(),
    }, annotations: { readOnlyHint: false },
  }, async (args) => {
    try {
      const payload = { id: randomUUID(), ...args };
      const r = runQuery(db, { table: "credores_fixos", action: "insert", payload }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_credor_criado", payload.id, { nome: payload.nome }, "credor_fixo");
      return texto({ mensagem: "Credor criado.", credor: r.data });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("editar_credor", {
    title: "Editar credor fixo", description: "Altera os campos informados de um credor fixo existente.",
    inputSchema: {
      id: z.string().uuid(), nome: z.string().trim().min(1).max(240).optional(), departamento: z.string().trim().min(1).max(120).optional(),
      valor_mensal: z.number().nonnegative().optional(), documento: z.string().trim().max(40).nullable().optional(), descricao: z.string().trim().max(2000).nullable().optional(),
      email: z.string().trim().email().max(254).nullable().optional(), tipo_valor: z.string().trim().max(80).nullable().optional(),
      solicitacao: z.string().trim().max(80).nullable().optional(), pagamento: z.string().trim().max(80).nullable().optional(), obs: z.string().trim().max(1000).nullable().optional(),
    }, annotations: { readOnlyHint: false },
  }, async ({ id, ...camposRecebidos }) => {
    try {
      if (!(await consultarCredores([{ column: "id", value: id }]))[0]) throw new Error("Credor não encontrado.");
      const payload = Object.fromEntries(Object.entries(camposRecebidos).filter(([, valor]) => valor !== undefined));
      if (!Object.keys(payload).length) throw new Error("Informe ao menos um campo para atualizar.");
      const r = runQuery(db, { table: "credores_fixos", action: "update", filters: [{ column: "id", value: id }], payload }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_credor_editado", id, { campos: Object.keys(payload) }, "credor_fixo");
      return texto({ mensagem: "Credor atualizado.", credor: (await consultarCredores([{ column: "id", value: id }]))[0] });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("remover_credor", {
    title: "Remover credor fixo", description: "Remove permanentemente um credor e os seus empenhos mensais. Use somente após confirmação.",
    inputSchema: { id: z.string().uuid(), confirmacao: z.literal("REMOVER") }, annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    try {
      const atual = (await consultarCredores([{ column: "id", value: id }]))[0];
      if (!atual) throw new Error("Credor não encontrado.");
      const r = runQuery(db, { table: "credores_fixos", action: "delete", filters: [{ column: "id", value: id }] }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_credor_removido", id, { nome: atual.nome }, "credor_fixo");
      return texto({ mensagem: "Credor removido permanentemente.", id });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("listar_empenhos_mensais", {
    title: "Listar empenhos mensais", description: "Lista os registros mensais de empenho dos credores fixos.",
    inputSchema: { credor_id: z.string().uuid().optional(), ano: z.number().int().min(2000).max(2100).optional(), mes: z.number().int().min(1).max(12).optional(), status: z.enum(STATUS_EMPENHO).optional(), limite: z.number().int().min(1).max(100).default(50), cursor: z.string().regex(/^\d+$/).optional() }, annotations: { readOnlyHint: true },
  }, async ({ credor_id, ano, mes, status, limite, cursor }) => {
    try {
      const filtros = [["credor_id", credor_id], ["ano", ano], ["mes", mes], ["status", status]].filter(([, valor]) => valor !== undefined).map(([column, value]) => ({ column, value }));
      const pagina = await paginar("empenhos_mensais", filtros, [{ column: "ano", ascending: false }, { column: "mes", ascending: true }], { limite, cursor });
      auditar(db, usuario, "mcp_empenhos_listados", null, { credor_id, ano, mes, status, retornados: pagina.itens.length, cursor }, "empenho_mensal");
      return texto({ empenhos: pagina.itens, proximo_cursor: pagina.proximo_cursor, limite: pagina.limite });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("atualizar_empenho_mensal", {
    title: "Criar ou atualizar empenho mensal", description: "Registra o status e os dados do empenho mensal de um credor.",
    inputSchema: {
      credor_id: z.string().uuid(), ano: z.number().int().min(2000).max(2100), mes: z.number().int().min(1).max(12), status: z.enum(STATUS_EMPENHO),
      valor: z.number().nonnegative(), numero_empenho: z.string().trim().max(80).nullable().optional(), observacao: z.string().trim().max(500).nullable().optional(),
    }, annotations: { readOnlyHint: false },
  }, async ({ credor_id, ano, mes, status, valor, numero_empenho, observacao }) => {
    try {
      if (!(await consultarCredores([{ column: "id", value: credor_id }]))[0]) throw new Error("Credor não encontrado.");
      const filtros = [{ column: "credor_id", value: credor_id }, { column: "ano", value: ano }, { column: "mes", value: mes }];
      const atual = (await consultarEmpenhos(filtros))[0];
      const payload = { credor_id, ano, mes, status, valor, numero_empenho: numero_empenho || null, observacao: observacao || null, empenhado_em: status === "empenhado" ? new Date().toISOString() : null };
      const r = atual
        ? runQuery(db, { table: "empenhos_mensais", action: "update", filters: [{ column: "id", value: atual.id }], payload }, usuario.username)
        : runQuery(db, { table: "empenhos_mensais", action: "insert", payload: { id: randomUUID(), ...payload } }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      const empenho = (await consultarEmpenhos(filtros))[0];
      auditar(db, usuario, "mcp_empenho_atualizado", empenho.id, { credor_id, ano, mes, status, valor }, "empenho_mensal");
      return texto({ mensagem: atual ? "Empenho atualizado." : "Empenho criado.", empenho });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("remover_empenho_mensal", {
    title: "Remover empenho mensal", description: "Remove permanentemente o registro mensal de empenho. Use somente após confirmação.",
    inputSchema: { id: z.string().uuid(), confirmacao: z.literal("REMOVER") }, annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    try {
      const atual = (await consultarEmpenhos([{ column: "id", value: id }]))[0];
      if (!atual) throw new Error("Empenho não encontrado.");
      const r = runQuery(db, { table: "empenhos_mensais", action: "delete", filters: [{ column: "id", value: id }] }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_empenho_removido", id, { credor_id: atual.credor_id, ano: atual.ano, mes: atual.mes }, "empenho_mensal");
      return texto({ mensagem: "Empenho removido permanentemente.", id });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("listar_solicitacoes", {
    title: "Listar solicitações", description: "Lista as solicitações de aquisição, com filtros opcionais por solicitante e empresa.",
    inputSchema: { solicitante: z.string().trim().max(240).optional(), empresa: z.string().trim().max(240).optional(), limite: z.number().int().min(1).max(100).default(50), cursor: z.string().regex(/^\d+$/).optional() }, annotations: { readOnlyHint: true },
  }, async ({ solicitante, empresa, limite, cursor }) => {
    try {
      const filtros = [["solicitante", solicitante], ["empresa", empresa]].filter(([, valor]) => valor !== undefined).map(([column, value]) => ({ column, value }));
      const pagina = await paginar("solicitacoes", filtros, [{ column: "created_at", ascending: false }], { limite, cursor });
      auditar(db, usuario, "mcp_solicitacoes_listadas", null, { solicitante, empresa, retornadas: pagina.itens.length, cursor }, "solicitacao");
      return texto({ solicitacoes: pagina.itens, proximo_cursor: pagina.proximo_cursor, limite: pagina.limite });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("criar_solicitacao", {
    title: "Criar solicitação", description: "Cria uma solicitação de aquisição com seus itens e valor total calculado automaticamente.",
    inputSchema: {
      solicitante: z.string().trim().min(1).max(240), empresa: z.string().trim().min(1).max(240), data_solicitacao: z.string().trim().min(1).max(20),
      observacoes: z.string().trim().max(4000).nullable().optional(), items: z.array(ITEM_SOLICITACAO).max(200).default([]),
    }, annotations: { readOnlyHint: false },
  }, async ({ items, ...campos }) => {
    try {
      const itens = items.map((item) => ({ id: randomUUID(), codigoItem: item.codigoItem || "", item: item.item, descricao: item.descricao || "", quantidade: item.quantidade, valorUnitario: item.valorUnitario, valorTotal: item.quantidade * item.valorUnitario }));
      const payload = { id: randomUUID(), ...campos, items: itens, valor_total: itens.reduce((total, item) => total + item.valorTotal, 0), anexos: [] };
      const r = runQuery(db, { table: "solicitacoes", action: "insert", payload }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_solicitacao_criada", payload.id, { solicitante: payload.solicitante, empresa: payload.empresa, valor_total: payload.valor_total }, "solicitacao");
      return texto({ mensagem: "Solicitação criada.", solicitacao: r.data });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("editar_solicitacao", {
    title: "Editar solicitação", description: "Atualiza os campos ou itens informados de uma solicitação existente.",
    inputSchema: {
      id: z.string().uuid(), solicitante: z.string().trim().min(1).max(240).optional(), empresa: z.string().trim().min(1).max(240).optional(),
      data_solicitacao: z.string().trim().min(1).max(20).optional(), observacoes: z.string().trim().max(4000).nullable().optional(), items: z.array(ITEM_SOLICITACAO).max(200).optional(),
    }, annotations: { readOnlyHint: false },
  }, async ({ id, items, ...camposRecebidos }) => {
    try {
      if (!(await consultarSolicitacoes([{ column: "id", value: id }]))[0]) throw new Error("Solicitação não encontrada.");
      const payload = Object.fromEntries(Object.entries(camposRecebidos).filter(([, valor]) => valor !== undefined));
      if (items !== undefined) {
        const itens = items.map((item) => ({ id: randomUUID(), codigoItem: item.codigoItem || "", item: item.item, descricao: item.descricao || "", quantidade: item.quantidade, valorUnitario: item.valorUnitario, valorTotal: item.quantidade * item.valorUnitario }));
        payload.items = itens;
        payload.valor_total = itens.reduce((total, item) => total + item.valorTotal, 0);
      }
      if (!Object.keys(payload).length) throw new Error("Informe ao menos um campo para atualizar.");
      const r = runQuery(db, { table: "solicitacoes", action: "update", filters: [{ column: "id", value: id }], payload }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_solicitacao_editada", id, { campos: Object.keys(payload) }, "solicitacao");
      return texto({ mensagem: "Solicitação atualizada.", solicitacao: (await consultarSolicitacoes([{ column: "id", value: id }]))[0] });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("adicionar_observacao_solicitacao", {
    title: "Adicionar observação à solicitação", description: "Acrescenta uma observação ao texto já registrado na solicitação.",
    inputSchema: { id: z.string().uuid(), observacao: z.string().trim().min(1).max(2000) }, annotations: { readOnlyHint: false },
  }, async ({ id, observacao }) => {
    try {
      const atual = (await consultarSolicitacoes([{ column: "id", value: id }]))[0];
      if (!atual) throw new Error("Solicitação não encontrada.");
      const observacoes = [atual.observacoes, observacao].filter(Boolean).join("\n");
      const r = runQuery(db, { table: "solicitacoes", action: "update", filters: [{ column: "id", value: id }], payload: { observacoes } }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_solicitacao_observada", id, {}, "solicitacao");
      return texto({ mensagem: "Observação adicionada.", solicitacao: (await consultarSolicitacoes([{ column: "id", value: id }]))[0] });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("remover_solicitacao", {
    title: "Remover solicitação", description: "Remove permanentemente uma solicitação. Use somente após confirmação.",
    inputSchema: { id: z.string().uuid(), confirmacao: z.literal("REMOVER") }, annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    try {
      const atual = (await consultarSolicitacoes([{ column: "id", value: id }]))[0];
      if (!atual) throw new Error("Solicitação não encontrada.");
      const r = runQuery(db, { table: "solicitacoes", action: "delete", filters: [{ column: "id", value: id }] }, usuario.username);
      if (r.error) throw new Error(r.error.message);
      auditar(db, usuario, "mcp_solicitacao_removida", id, { solicitante: atual.solicitante, empresa: atual.empresa }, "solicitacao");
      return texto({ mensagem: "Solicitação removida permanentemente.", id });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("resumo_tarefas", {
    title: "Resumo de tarefas", description: "Consolida tarefas por status, prioridade e vencimento.",
    inputSchema: {}, annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const tarefas = await consultar([], true);
      const hoje = new Date().toISOString().slice(0, 10);
      const porStatus = Object.fromEntries(STATUS.map((status) => [status, tarefas.filter((t) => t.status === status).length]));
      const porPrioridade = Object.fromEntries(PRIORIDADES.map((prioridade) => [prioridade, tarefas.filter((t) => t.prioridade === prioridade).length]));
      const vencidas = tarefas.filter((t) => t.status !== "done" && t.prazo && t.prazo < hoje);
      return texto({ total: tarefas.length, por_status: porStatus, por_prioridade: porPrioridade, vencidas: vencidas.length, tarefas_vencidas: vencidas.slice(0, 20) });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("resumo_empenhos", {
    title: "Resumo de empenhos", description: "Consolida quantidades e valores de empenhos por status.",
    inputSchema: { ano: z.number().int().min(2000).max(2100).optional(), mes: z.number().int().min(1).max(12).optional() }, annotations: { readOnlyHint: true },
  }, async ({ ano, mes }) => {
    try {
      const filtros = [["ano", ano], ["mes", mes]].filter(([, valor]) => valor !== undefined).map(([column, value]) => ({ column, value }));
      const empenhos = await consultarEmpenhos(filtros);
      const porStatus = Object.fromEntries(STATUS_EMPENHO.map((status) => {
        const itens = empenhos.filter((item) => item.status === status);
        return [status, { quantidade: itens.length, valor: itens.reduce((total, item) => total + Number(item.valor || 0), 0) }];
      }));
      return texto({ filtros: { ano, mes }, total_registros: empenhos.length, valor_total: empenhos.reduce((total, item) => total + Number(item.valor || 0), 0), por_status: porStatus });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("credores_pendentes", {
    title: "Credores com empenhos pendentes", description: "Lista os empenhos mensais pendentes, por ano e mês opcional.",
    inputSchema: { ano: z.number().int().min(2000).max(2100).optional(), mes: z.number().int().min(1).max(12).optional(), limite: z.number().int().min(1).max(100).default(50), cursor: z.string().regex(/^\d+$/).optional() }, annotations: { readOnlyHint: true },
  }, async ({ ano, mes, limite, cursor }) => {
    try {
      const filtros = [["ano", ano], ["mes", mes], ["status", "pendente"]].filter(([, valor]) => valor !== undefined).map(([column, value]) => ({ column, value }));
      const pagina = await paginar("empenhos_mensais", filtros, [{ column: "ano", ascending: false }, { column: "mes", ascending: true }], { limite, cursor });
      const credores = new Map((await consultarCredores()).map((credor) => [credor.id, credor.nome]));
      return texto({ pendentes: pagina.itens.map((empenho) => ({ ...empenho, credor: credores.get(empenho.credor_id) || null })), proximo_cursor: pagina.proximo_cursor, limite: pagina.limite });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("resumo_solicitacoes", {
    title: "Resumo de solicitações", description: "Consolida quantidade e valor total por empresa.",
    inputSchema: { solicitante: z.string().trim().max(240).optional(), empresa: z.string().trim().max(240).optional() }, annotations: { readOnlyHint: true },
  }, async ({ solicitante, empresa }) => {
    try {
      const filtros = [["solicitante", solicitante], ["empresa", empresa]].filter(([, valor]) => valor !== undefined).map(([column, value]) => ({ column, value }));
      const solicitacoes = await consultarSolicitacoes(filtros);
      const porEmpresa = solicitacoes.reduce((grupos, solicitacao) => {
        const chave = solicitacao.empresa || "Sem empresa";
        grupos[chave] ||= { quantidade: 0, valor_total: 0 };
        grupos[chave].quantidade += 1;
        grupos[chave].valor_total += Number(solicitacao.valor_total || 0);
        return grupos;
      }, {});
      return texto({ filtros: { solicitante, empresa }, total_solicitacoes: solicitacoes.length, valor_total: solicitacoes.reduce((total, solicitacao) => total + Number(solicitacao.valor_total || 0), 0), por_empresa: porEmpresa });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("listar_obrigacoes", {
    title: "Listar obrigações", description: "Lista entregas, vencimentos e compromissos, com filtros por categoria, situação e data limite.",
    inputSchema: { categoria: z.enum(CATEGORIAS_PRAZO).optional(), resolvido: z.boolean().optional(), data_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), limite: z.number().int().min(1).max(100).default(50), cursor: z.string().regex(/^\d+$/).optional() }, annotations: { readOnlyHint: true },
  }, async ({ categoria, resolvido, data_limite, limite, cursor }) => {
    try {
      const inicio = cursor ? Number.parseInt(cursor, 10) : 0;
      if (!Number.isSafeInteger(inicio) || inicio < 0) throw new Error("Cursor inválido.");
      const filtros = [["categoria", categoria], ["resolvido", resolvido === undefined ? undefined : Number(resolvido)], ["data_limite", data_limite]].filter(([, valor]) => valor !== undefined);
      const itens = consultarObrigacoes(filtros, limite + 1, inicio);
      const temProxima = itens.length > limite;
      const obrigacoes = itens.slice(0, limite);
      auditar(db, usuario, "mcp_obrigacoes_listadas", null, { categoria, resolvido, data_limite, retornadas: obrigacoes.length, cursor }, "prazo");
      return texto({ obrigacoes, proximo_cursor: temProxima ? String(inicio + limite) : null, limite });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("criar_obrigacao", {
    title: "Criar obrigação", description: "Cria uma obrigação com título, data limite, categoria e descrição opcional.",
    inputSchema: { titulo: z.string().trim().min(1).max(240), data_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), categoria: z.enum(CATEGORIAS_PRAZO).default("geral"), descricao: z.string().trim().max(4000).optional() }, annotations: { readOnlyHint: false },
  }, async ({ titulo, data_limite, categoria, descricao }) => {
    try {
      const id = randomUUID();
      db.prepare("INSERT INTO prazos (id, titulo, descricao, data_limite, categoria) VALUES (?, ?, ?, ?, ?)").run(id, titulo, descricao || "", validarData(data_limite), categoria);
      const obrigacao = consultarObrigacoes([["id", id]], 1)[0];
      auditar(db, usuario, "mcp_obrigacao_criada", id, { titulo, data_limite, categoria }, "prazo");
      return texto({ mensagem: "Obrigação criada.", obrigacao });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("atualizar_obrigacao", {
    title: "Atualizar obrigação", description: "Atualiza os campos informados de uma obrigação existente, preservando os demais dados.",
    inputSchema: { id: z.string().uuid(), titulo: z.string().trim().min(1).max(240).optional(), descricao: z.string().trim().max(4000).nullable().optional(), data_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), categoria: z.enum(CATEGORIAS_PRAZO).optional() }, annotations: { readOnlyHint: false },
  }, async ({ id, ...camposRecebidos }) => {
    try {
      if (!consultarObrigacoes([["id", id]], 1)[0]) throw new Error("Obrigação não encontrada.");
      const campos = Object.fromEntries(Object.entries(camposRecebidos).filter(([, valor]) => valor !== undefined));
      if (!Object.keys(campos).length) throw new Error("Informe ao menos um campo para atualizar.");
      if (campos.data_limite) campos.data_limite = validarData(campos.data_limite);
      if (campos.descricao === null) campos.descricao = "";
      const colunas = Object.keys(campos);
      db.prepare(`UPDATE prazos SET ${colunas.map((coluna) => `${coluna} = ?`).join(", ")}, atualizado_em = datetime('now') WHERE id = ?`).run(...colunas.map((coluna) => campos[coluna]), id);
      const obrigacao = consultarObrigacoes([["id", id]], 1)[0];
      auditar(db, usuario, "mcp_obrigacao_atualizada", id, { campos: colunas }, "prazo");
      return texto({ mensagem: "Obrigação atualizada.", obrigacao });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("concluir_obrigacao", {
    title: "Concluir ou reabrir obrigação", description: "Marca uma obrigação como concluída ou a reabre quando necessário.",
    inputSchema: { id: z.string().uuid(), concluida: z.boolean().default(true) }, annotations: { readOnlyHint: false },
  }, async ({ id, concluida }) => {
    try {
      if (!consultarObrigacoes([["id", id]], 1)[0]) throw new Error("Obrigação não encontrada.");
      db.prepare("UPDATE prazos SET resolvido = ?, atualizado_em = datetime('now') WHERE id = ?").run(Number(concluida), id);
      const obrigacao = consultarObrigacoes([["id", id]], 1)[0];
      auditar(db, usuario, concluida ? "mcp_obrigacao_concluida" : "mcp_obrigacao_reaberta", id, {}, "prazo");
      return texto({ mensagem: concluida ? "Obrigação concluída." : "Obrigação reaberta.", obrigacao });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("remover_obrigacao", {
    title: "Remover obrigação", description: "Remove permanentemente uma obrigação. Use somente após confirmação explícita.",
    inputSchema: { id: z.string().uuid(), confirmacao: z.literal("REMOVER") }, annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    try {
      const atual = consultarObrigacoes([["id", id]], 1)[0];
      if (!atual) throw new Error("Obrigação não encontrada.");
      db.prepare("DELETE FROM prazos WHERE id = ?").run(id);
      auditar(db, usuario, "mcp_obrigacao_removida", id, { titulo: atual.titulo }, "prazo");
      return texto({ mensagem: "Obrigação removida permanentemente.", id });
    } catch (e) { return erro(e.message); }
  });

  servidor.registerTool("resumo_obrigacoes", {
    title: "Resumo de obrigações", description: "Consolida obrigações vencidas, urgentes, próximas e concluídas.",
    inputSchema: {}, annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const emSeteDias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const emTrintaDias = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const vencidas = db.prepare("SELECT COUNT(*) AS quantidade FROM prazos WHERE resolvido = 0 AND data_limite < ?").get(hoje).quantidade;
      const urgentes = db.prepare("SELECT COUNT(*) AS quantidade FROM prazos WHERE resolvido = 0 AND data_limite >= ? AND data_limite <= ?").get(hoje, emSeteDias).quantidade;
      const proximas = db.prepare("SELECT COUNT(*) AS quantidade FROM prazos WHERE resolvido = 0 AND data_limite > ? AND data_limite <= ?").get(emSeteDias, emTrintaDias).quantidade;
      const concluidas = db.prepare("SELECT COUNT(*) AS quantidade FROM prazos WHERE resolvido = 1").get().quantidade;
      return texto({ vencidas, urgentes, proximas, concluidas, total_pendentes: vencidas + urgentes + proximas });
    } catch (e) { return erro(e.message); }
  });

  if (usuario.is_admin) {
    servidor.registerTool("criar_backup", {
      title: "Criar backup", description: "Cria uma cópia local do banco SQLite e dos uploads do sistema.",
      inputSchema: {}, annotations: { readOnlyHint: false },
    }, async () => {
      try {
        try { db.exec("PRAGMA wal_checkpoint(PASSIVE);"); } catch { /* opcional */ }
        const backup = createBackup();
        auditar(db, usuario, "mcp_backup_criado", backup.id, { bytes: backup.bytes, arquivos: backup.files }, "backup");
        return texto({ mensagem: "Backup criado localmente.", backup: { id: backup.id, bytes: backup.bytes, arquivos: backup.files, uploads: backup.uploads } });
      } catch (e) { return erro(e.message); }
    });

    servidor.registerTool("enviar_backup_github", {
      title: "Enviar backup ao GitHub", description: "Cria um backup local e envia a cópia para a branch backups do repositório GitHub configurado no servidor.",
      inputSchema: { confirmacao: z.literal("ENVIAR_BACKUP") }, annotations: { readOnlyHint: false, destructiveHint: true },
    }, async () => {
      try {
        try { db.exec("PRAGMA wal_checkpoint(PASSIVE);"); } catch { /* opcional */ }
        const backup = createBackup();
        const envio = await publishBackupToGitHub(backup);
        auditar(db, usuario, "mcp_backup_enviado_github", backup.id, { bytes: backup.bytes, branch: envio.branch }, "backup");
        return texto({ mensagem: "Backup enviado ao GitHub.", backup: envio });
      } catch (e) { return erro(e.message); }
    });
  }

  return servidor;
}

async function lerCorpoJson(req) {
  const partes = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += parte.length;
    if (tamanho > 1024 * 1024) throw new Error("Corpo MCP excede 1 MB.");
    partes.push(parte);
  }
  const texto = Buffer.concat(partes).toString("utf8");
  if (!texto) throw new Error("Corpo MCP vazio.");
  return JSON.parse(texto);
}

export async function handleMcp(req, res, db) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname !== "/mcp") return false;
  const incomingRequestId = String(req.headers["x-request-id"] || "").trim();
  const requestId = /^[A-Za-z0-9._-]{8,64}$/.test(incomingRequestId) ? incomingRequestId : randomBytes(8).toString("hex");
  const requestLog = logger.child({ component: "mcp", requestId, method: req.method, path: pathname });
  const startedAt = performance.now();
  let requestContext = {};
  res.setHeader("X-Request-Id", requestId);
  res.once("finish", () => {
    const statusCode = Number(res.statusCode || 0);
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    requestLog[level]("mcp.request.completed", {
      statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      ...requestContext,
    });
  });
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
  const allowedOrigin = String(process.env.MCP_ALLOWED_ORIGIN || "").trim();
  const requestOrigin = String(req.headers.origin || "").trim();
  if (allowedOrigin && requestOrigin && allowedOrigin !== "*" && requestOrigin !== allowedOrigin) {
    res.statusCode = 403;
    res.end("Origem MCP não permitida.");
    return true;
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID, X-Request-Id");
  if (allowedOrigin && (!requestOrigin || allowedOrigin === "*" || requestOrigin === allowedOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin === "*" ? "*" : allowedOrigin);
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, X-Request-Id");
  }
  if (requestOrigin) res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return true; }
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) { res.statusCode = 401; res.setHeader("WWW-Authenticate", "Bearer"); res.end("Não autorizado."); return true; }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const chave = db.prepare(`SELECT t.id, t.nome, u.id AS usuario_id, u.username, u.ativo, u.is_admin
    FROM mcp_tokens t JOIN usuarios u ON u.id = t.usuario_id
    WHERE t.token_hash = ? AND t.ativo = 1 AND (t.expira_em IS NULL OR t.expira_em > datetime('now'))`).get(tokenHash);
  if (!chave) { res.statusCode = 401; res.setHeader("WWW-Authenticate", "Bearer"); res.end("Não autorizado."); return true; }
  const modulos = db.prepare("SELECT modulo_id FROM usuario_modulos WHERE usuario_id = ?").all(chave.usuario_id).map((item) => item.modulo_id);
  const clientIp = String(req.socket?.remoteAddress || "desconhecido").slice(0, 80) || "desconhecido";
  const usuario = { id: chave.usuario_id, username: chave.username, ativo: chave.ativo, is_admin: chave.is_admin, mcpTokenId: chave.id, requestId, clientIp, modulos };
  requestContext = { user: usuario.username };
  if (!usuario.ativo || (!usuario.is_admin && !modulos.length)) { res.statusCode = 403; res.end("Usuário MCP sem acesso a um módulo integrado."); return true; }
  db.prepare("UPDATE mcp_tokens SET ultimo_uso_em = datetime('now') WHERE id = ?").run(chave.id);
  if (!["POST", "GET", "DELETE"].includes(req.method || "")) { res.statusCode = 405; res.end("Método não permitido."); return true; }

  let corpo;
  if (req.method === "POST") {
    try { corpo = await lerCorpoJson(req); }
    catch (e) { res.statusCode = 400; res.end(`Requisição MCP inválida: ${e.message}`); return true; }
    if (typeof corpo?.method === "string") requestContext = { ...requestContext, mcpMethod: corpo.method.slice(0, 120) };
    if (typeof corpo?.params?.name === "string") requestContext = { ...requestContext, tool: corpo.params.name.slice(0, 120) };
  }
  const servidor = criarServidor(db, usuario);
  const transporte = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await servidor.connect(transporte);
    res.once("close", () => {
      transporte.close().catch(() => {});
      servidor.close().catch(() => {});
    });
    await transporte.handleRequest(req, res, corpo);
  } catch (e) {
    requestContext = { ...requestContext, errorCode: e?.code || "MCP_ERROR" };
    if (!res.headersSent) { res.statusCode = 500; res.end(`Erro MCP: ${e.message}`); }
  }
  return true;
}
