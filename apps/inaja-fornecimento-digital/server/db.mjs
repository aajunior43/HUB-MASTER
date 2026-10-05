import { DatabaseSync } from "node:sqlite";
import { randomUUID, scryptSync, timingSafeEqual, randomBytes, createHash } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitize } from "./logger.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, "..", "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "inaja.sqlite");

function ensureDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Rate limiting (em memória) ───────────────────────────────────────────────
const loginAttempts = new Map(); // chave: "username|ip" → { count, first, blockedUntil }
const BLOQUEIO_APOS = 5;       // tentativas
const JANELA_MS = 15 * 60 * 1000; // 15 min
const BLOQUEIO_DURACAO_MS = 15 * 60 * 1000;

function chaveRateLimit(username, ip) {
  const userKey = String(username || "").trim().toLowerCase() || "<vazio>";
  const ipKey = String(ip || "desconhecido").trim().slice(0, 80) || "desconhecido";
  return `${userKey}|${ipKey}`;
}

function verificarRateLimit(username, ip) {
  const agora = Date.now();
  const key = chaveRateLimit(username, ip);
  const entry = loginAttempts.get(key);
  if (!entry) return { bloqueado: false, tentativasRestantes: BLOQUEIO_APOS };
  if (entry.blockedUntil && agora < entry.blockedUntil) {
    const restante = Math.ceil((entry.blockedUntil - agora) / 1000);
    return { bloqueado: true, bloqueadoPor: restante, tentativasRestantes: 0 };
  }
  if (entry.blockedUntil && agora >= entry.blockedUntil) {
    loginAttempts.delete(key);
    return { bloqueado: false, tentativasRestantes: BLOQUEIO_APOS };
  }
  if (agora - entry.first > JANELA_MS) {
    loginAttempts.delete(key);
    return { bloqueado: false, tentativasRestantes: BLOQUEIO_APOS };
  }
  return { bloqueado: false, tentativasRestantes: Math.max(0, BLOQUEIO_APOS - entry.count) };
}

function registrarTentativaFalha(username, ip) {
  const agora = Date.now();
  const key = chaveRateLimit(username, ip);
  const entry = loginAttempts.get(key);
  if (!entry) {
    loginAttempts.set(key, { count: 1, first: agora });
    return;
  }
  if (agora - entry.first > JANELA_MS) {
    loginAttempts.set(key, { count: 1, first: agora });
    return;
  }
  entry.count++;
  if (entry.count >= BLOQUEIO_APOS) {
    entry.blockedUntil = agora + BLOQUEIO_DURACAO_MS;
  }
}

function limparRateLimit(username, ip) {
  loginAttempts.delete(chaveRateLimit(username, ip));
}

function hashPassword(senha) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(senha, stored) {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const [, salt, hash] = stored.split("$");
  const next = scryptSync(senha, salt, 64);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

function validarSenha(senha) {
  const erros = [];
  if (senha.length < 6) erros.push("mínimo 6 caracteres");
  if (!/[A-Z]/.test(senha)) erros.push("uma letra maiúscula");
  if (!/[a-z]/.test(senha)) erros.push("uma letra minúscula");
  if (!/[0-9]/.test(senha)) erros.push("um número");
  if (senha.length > 128) erros.push("máximo 128 caracteres");
  return erros;
}

const BACKUP_TELEGRAM_PASSWORD_KEY = "backup_telegram_senha";
const AUTENTIQUE_WEBHOOK_SECRET_KEY = "autentique_webhook_secret";
const PORTAL_TRANSPARENCIA_API_KEY = "portal_transparencia_api_key";
const CONFIG_SECRETS = new Set([BACKUP_TELEGRAM_PASSWORD_KEY, AUTENTIQUE_WEBHOOK_SECRET_KEY, PORTAL_TRANSPARENCIA_API_KEY]);

export function migrate(db) {
  return _migrate(db);
}

export function openDatabase() {
  ensureDirs();
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  _migrate(db);
  seedDatabase(db);
  return db;
}

function _migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS solicitantes (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS observacoes (
      id TEXT PRIMARY KEY,
      texto TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS modelos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      form_data TEXT NOT NULL,
      items TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS solicitacoes (
      id TEXT PRIMARY KEY,
      solicitante TEXT NOT NULL,
      empresa TEXT NOT NULL,
      data_solicitacao TEXT NOT NULL,
      observacoes TEXT,
      items TEXT NOT NULL,
      valor_total REAL NOT NULL DEFAULT 0,
      anexos TEXT NOT NULL DEFAULT '[]',
      assinatura TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tarefas (
      id TEXT PRIMARY KEY,
      titulo TEXT NOT NULL,
      descricao TEXT,
      anexos TEXT NOT NULL DEFAULT '[]',
      responsavel TEXT,
      prioridade TEXT NOT NULL DEFAULT 'media',
      status TEXT NOT NULL DEFAULT 'todo',
      ordem INTEGER NOT NULL DEFAULT 0,
      prazo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pedidos_dotacao (
      id TEXT PRIMARY KEY, protocolo TEXT UNIQUE, solicitante TEXT NOT NULL, secretaria TEXT NOT NULL,
      descricao TEXT NOT NULL, valor_solicitado REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'enviado', dotacao TEXT, ficha TEXT,
      saldo_disponivel REAL, valor_aprovado REAL, resposta_contador TEXT,
      respondido_por TEXT, respondido_em TEXT, anexos TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pedidos_dotacao_historico (
      id TEXT PRIMARY KEY,
      pedido_id TEXT NOT NULL,
      acao TEXT NOT NULL,
      status_anterior TEXT,
      status_novo TEXT,
      mensagem TEXT,
      usuario TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pedidos_dotacao_historico_pedido
      ON pedidos_dotacao_historico(pedido_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS sites_uteis (
      id TEXT PRIMARY KEY, titulo TEXT NOT NULL, url TEXT NOT NULL,
      descricao TEXT, categoria TEXT NOT NULL DEFAULT 'Geral',
      criado_por TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cnpj_salvos (
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK(tipo IN ('historico', 'favorito')),
      cnpj TEXT NOT NULL,
      dados TEXT NOT NULL,
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (usuario_id, tipo, cnpj)
    );
    CREATE INDEX IF NOT EXISTS idx_cnpj_salvos_usuario_tipo
      ON cnpj_salvos(usuario_id, tipo, atualizado_em DESC);

    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      senha_hash TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      is_contador INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      mostrar_bloqueados INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mcp_tokens (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      token_prefix TEXT NOT NULL,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      ultimo_uso_em TEXT,
      expira_em TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mcp_tokens_usuario ON mcp_tokens(usuario_id, ativo);

    CREATE TABLE IF NOT EXISTS recuperacao_senha (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo TEXT NOT NULL,
      expira_em TEXT NOT NULL,
      usado INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuario_modulos (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      modulo_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, modulo_id)
    );

    CREATE TABLE IF NOT EXISTS usuario_modulos_ordem (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      modulo_id TEXT NOT NULL,
      ordem INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, modulo_id)
    );
    CREATE INDEX IF NOT EXISTS idx_usuario_modulos_ordem_usuario
      ON usuario_modulos_ordem(usuario_id, ordem);

    CREATE TABLE IF NOT EXISTS usuario_modulos_favoritos (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      modulo_id TEXT NOT NULL,
      ordem INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (usuario_id, modulo_id)
    );
    CREATE INDEX IF NOT EXISTS idx_usuario_modulos_favoritos_usuario
      ON usuario_modulos_favoritos(usuario_id, ordem);

    CREATE TABLE IF NOT EXISTS credores_fixos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      documento TEXT,
      departamento TEXT NOT NULL DEFAULT 'Administração',
      valor_mensal REAL NOT NULL DEFAULT 0,
      descricao TEXT,
      email TEXT,
      tipo_valor TEXT DEFAULT 'FIXO',
      solicitacao TEXT,
      pagamento TEXT,
      obs TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS empenhos_mensais (
      id TEXT PRIMARY KEY,
      credor_id TEXT NOT NULL REFERENCES credores_fixos(id) ON DELETE CASCADE,
      ano INTEGER NOT NULL,
      mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
      status TEXT NOT NULL DEFAULT 'pendente',
      valor REAL,
      numero_empenho TEXT,
      observacao TEXT,
      empenhado_em TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (credor_id, ano, mes)
    );

    CREATE TABLE IF NOT EXISTS empenhos_orcamentarios (
      id TEXT PRIMARY KEY,
      id_entidade TEXT,
      nome_entidade TEXT,
      id_empenho TEXT,
      numero_empenho TEXT,
      ano_empenho INTEGER,
      tipo_empenho TEXT,
      num_processo TEXT,
      ano_processo TEXT,
      contrato TEXT,
      sf TEXT,
      modalidade TEXT,
      licitacao TEXT,
      especificacao TEXT,
      data TEXT,
      valor_empenhado_bruto REAL DEFAULT 0,
      valor_empenhado_anulado REAL DEFAULT 0,
      valor_liquidado_bruto REAL DEFAULT 0,
      valor_liquidado_anulado REAL DEFAULT 0,
      valor_baixado_bruto REAL DEFAULT 0,
      valor_baixado_anulado REAL DEFAULT 0,
      valor_retido_bruto REAL DEFAULT 0,
      valor_retido_anulado REAL DEFAULT 0,
      valor_pago_restos_proc REAL DEFAULT 0,
      valor_pago_restos_nao_proc REAL DEFAULT 0,
      valor_pago_anulado_proc REAL DEFAULT 0,
      valor_pago_anulado_nao_proc REAL DEFAULT 0,
      id_credor TEXT,
      nome_credor TEXT,
      num_conta_credor TEXT,
      dig_conta_credor TEXT,
      num_despesa TEXT,
      num_programa TEXT,
      num_acao TEXT,
      num_funcao TEXT,
      num_subfuncao TEXT,
      num_natureza_emp TEXT,
      num_recurso TEXT,
      num_natureza_desp TEXT,
      saldo_baixado REAL DEFAULT 0,
      saldo_anulado REAL DEFAULT 0,
      saldo_liquidar REAL DEFAULT 0,
      saldo_pagar REAL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_emp_ano     ON empenhos_orcamentarios(ano_empenho);
    CREATE INDEX IF NOT EXISTS idx_emp_mod     ON empenhos_orcamentarios(modalidade);
    CREATE INDEX IF NOT EXISTS idx_emp_tipo    ON empenhos_orcamentarios(tipo_empenho);
    CREATE INDEX IF NOT EXISTS idx_emp_recurso  ON empenhos_orcamentarios(num_recurso);
    CREATE INDEX IF NOT EXISTS idx_emp_programa ON empenhos_orcamentarios(num_programa);
    CREATE INDEX IF NOT EXISTS idx_emp_acao     ON empenhos_orcamentarios(num_acao);
    CREATE INDEX IF NOT EXISTS idx_emp_despesa  ON empenhos_orcamentarios(num_despesa);
    CREATE INDEX IF NOT EXISTS idx_emp_natdesp  ON empenhos_orcamentarios(num_natureza_desp);
    CREATE INDEX IF NOT EXISTS idx_emp_credor   ON empenhos_orcamentarios(id_credor);
    CREATE INDEX IF NOT EXISTS idx_emp_nome     ON empenhos_orcamentarios(nome_credor COLLATE NOCASE);

    CREATE TRIGGER IF NOT EXISTS emp_upd_at AFTER UPDATE ON empenhos_orcamentarios
    BEGIN
      UPDATE empenhos_orcamentarios SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

    -- EXPERTMONEY (extratos bancários)
    CREATE TABLE IF NOT EXISTS em_contas (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      banco TEXT DEFAULT '',
      tipo TEXT DEFAULT 'corrente',
      saldo_inicial REAL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS em_transacoes (
      id TEXT PRIMARY KEY,
      conta_id TEXT NOT NULL REFERENCES em_contas(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('receita','despesa')),
      categoria TEXT DEFAULT 'outros',
      documento TEXT DEFAULT '',
      observacoes TEXT DEFAULT '',
      conciliado INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_em_trans_conta ON em_transacoes(conta_id);
    CREATE INDEX IF NOT EXISTS idx_em_trans_data ON em_transacoes(data);
    CREATE INDEX IF NOT EXISTS idx_em_trans_cat ON em_transacoes(categoria);

    CREATE TABLE IF NOT EXISTS em_alertas (
      id TEXT PRIMARY KEY,
      conta_id TEXT NOT NULL REFERENCES em_contas(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      mensagem TEXT NOT NULL,
      severidade TEXT NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa','media','alta','critica')),
      resolvido INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_em_alertas_conta ON em_alertas(conta_id);

    -- ── GESTÃO DE DOCUMENTOS E PROCESSOS (estilo 1Doc) ──────────────────────────
    CREATE TABLE IF NOT EXISTS gd_setores (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, sigla TEXT, parent_id TEXT REFERENCES gd_setores(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'setor', ordem INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gd_usuario_setor (
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      setor_id TEXT NOT NULL REFERENCES gd_setores(id) ON DELETE CASCADE,
      funcao TEXT NOT NULL DEFAULT 'usuario', created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (usuario_id, setor_id)
    );
    CREATE TABLE IF NOT EXISTS gd_tipos_documento (
      id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, nome TEXT NOT NULL, descricao TEXT,
      ativo INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gd_documentos (
      id TEXT PRIMARY KEY, protocolo TEXT NOT NULL, ano INTEGER NOT NULL, numero INTEGER NOT NULL,
      tipo_codigo TEXT NOT NULL, assunto TEXT NOT NULL, conteudo TEXT,
      autor_id TEXT NOT NULL REFERENCES usuarios(id), setor_origem_id TEXT REFERENCES gd_setores(id),
      status TEXT NOT NULL DEFAULT 'rascunho', prioridade TEXT NOT NULL DEFAULT 'normal', tags TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
      arquivado_em TEXT, cancelado_em TEXT, UNIQUE (ano, numero, tipo_codigo)
    );
    CREATE INDEX IF NOT EXISTS idx_gd_doc_status ON gd_documentos(status);
    CREATE INDEX IF NOT EXISTS idx_gd_doc_autor  ON gd_documentos(autor_id);
    CREATE INDEX IF NOT EXISTS idx_gd_doc_proto  ON gd_documentos(protocolo);
    CREATE INDEX IF NOT EXISTS idx_gd_doc_tipo   ON gd_documentos(tipo_codigo);
    CREATE INDEX IF NOT EXISTS idx_gd_doc_criado ON gd_documentos(criado_em);
    CREATE TABLE IF NOT EXISTS gd_contadores (chave TEXT PRIMARY KEY, valor INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS gd_documento_destinatarios (
      id TEXT PRIMARY KEY, documento_id TEXT NOT NULL REFERENCES gd_documentos(id) ON DELETE CASCADE,
      setor_id TEXT NOT NULL REFERENCES gd_setores(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'para', criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_dest_doc   ON gd_documento_destinatarios(documento_id);
    CREATE INDEX IF NOT EXISTS idx_gd_dest_setor ON gd_documento_destinatarios(setor_id);
    CREATE TABLE IF NOT EXISTS gd_tramitacoes (
      id TEXT PRIMARY KEY, documento_id TEXT NOT NULL REFERENCES gd_documentos(id) ON DELETE CASCADE,
      de_setor_id TEXT REFERENCES gd_setores(id), para_setor_id TEXT REFERENCES gd_setores(id),
      de_usuario_id TEXT REFERENCES usuarios(id), para_usuario_id TEXT REFERENCES usuarios(id),
      acao TEXT NOT NULL, observacao TEXT, ip TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_tram_doc ON gd_tramitacoes(documento_id);
    CREATE TABLE IF NOT EXISTS gd_anexos (
      id TEXT PRIMARY KEY, documento_id TEXT NOT NULL REFERENCES gd_documentos(id) ON DELETE CASCADE,
      nome_original TEXT NOT NULL, caminho TEXT NOT NULL, mime TEXT, tamanho INTEGER,
      hash_sha256 TEXT, usuario_id TEXT REFERENCES usuarios(id),
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_anexo_doc ON gd_anexos(documento_id);
    CREATE TABLE IF NOT EXISTS gd_pastas (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, parent_id TEXT REFERENCES gd_pastas(id) ON DELETE CASCADE,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(parent_id, nome)
    );
    CREATE INDEX IF NOT EXISTS idx_gd_pasta_parent ON gd_pastas(parent_id);
    CREATE TABLE IF NOT EXISTS gd_arquivos (
      id TEXT PRIMARY KEY, pasta_id TEXT REFERENCES gd_pastas(id) ON DELETE CASCADE,
      nome_original TEXT NOT NULL, caminho TEXT NOT NULL UNIQUE, preview_caminho TEXT, mime TEXT, tamanho INTEGER,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id), criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_arquivo_pasta ON gd_arquivos(pasta_id);
    CREATE TABLE IF NOT EXISTS uploads_controle (
      caminho TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      modulo TEXT NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_uploads_controle_usuario ON uploads_controle(usuario_id);
    CREATE TABLE IF NOT EXISTS gd_mencoes (
      id TEXT PRIMARY KEY, documento_id TEXT NOT NULL REFERENCES gd_documentos(id) ON DELETE CASCADE,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE (documento_id, usuario_id)
    );
    CREATE TABLE IF NOT EXISTS gd_modelos_documento (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, tipo_codigo TEXT, conteudo TEXT,
      usuario_id TEXT REFERENCES usuarios(id), criado_em TEXT NOT NULL DEFAULT (datetime('now')),
      atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gd_logs_auditoria (
      id TEXT PRIMARY KEY, usuario_id TEXT REFERENCES usuarios(id), acao TEXT NOT NULL,
      entidade TEXT NOT NULL, entidade_id TEXT, detalhes TEXT, ip TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_audit_ent  ON gd_logs_auditoria(entidade, entidade_id);
    CREATE INDEX IF NOT EXISTS idx_gd_audit_user ON gd_logs_auditoria(usuario_id);
    CREATE TABLE IF NOT EXISTS gd_notificacoes (
      id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL, mensagem TEXT, lida INTEGER NOT NULL DEFAULT 0,
      tipo TEXT NOT NULL DEFAULT 'documento', ref_tipo TEXT, ref_id TEXT,
      ator_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
      rota TEXT, prioridade TEXT NOT NULL DEFAULT 'normal',
      chave_evento TEXT, lida_em TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_notif_user ON gd_notificacoes(usuario_id, lida);
    CREATE INDEX IF NOT EXISTS idx_gd_notif_order ON gd_notificacoes(usuario_id, criado_em DESC, id DESC);
    CREATE TABLE IF NOT EXISTS gd_tipos_processo (
      id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE, nome TEXT NOT NULL,
      formulario_def TEXT, sla_padrao_dias INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gd_processos (
      id TEXT PRIMARY KEY, numero_protocolo TEXT NOT NULL UNIQUE,
      tipo_processo_id TEXT REFERENCES gd_tipos_processo(id), assunto TEXT NOT NULL,
      solicitante_nome TEXT, solicitante_cpf TEXT, autor_id TEXT REFERENCES usuarios(id),
      setor_atual_id TEXT REFERENCES gd_setores(id), etapa_atual_id TEXT,
      status TEXT NOT NULL DEFAULT 'aberto', prioridade TEXT NOT NULL DEFAULT 'normal', campos TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_proc_status ON gd_processos(status);
    CREATE TABLE IF NOT EXISTS gd_etapas_processo (
      id TEXT PRIMARY KEY, processo_id TEXT NOT NULL REFERENCES gd_processos(id) ON DELETE CASCADE,
      nome TEXT NOT NULL, ordem INTEGER NOT NULL DEFAULT 0,
      responsavel_setor_id TEXT REFERENCES gd_setores(id),
      responsavel_usuario_id TEXT REFERENCES usuarios(id),
      prazo TEXT, status TEXT NOT NULL DEFAULT 'pendente', observacao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), concluida_em TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_gd_etapa_proc ON gd_etapas_processo(processo_id);
    CREATE TABLE IF NOT EXISTS gd_assinaturas (
      id TEXT PRIMARY KEY, documento_id TEXT NOT NULL REFERENCES gd_documentos(id) ON DELETE CASCADE,
      assinante_tipo TEXT NOT NULL DEFAULT 'interno', assinante_usuario_id TEXT REFERENCES usuarios(id),
      assinante_nome TEXT, assinante_cpf TEXT, nivel TEXT NOT NULL DEFAULT 'simples',
      ip TEXT, hash_documento TEXT, token_externo TEXT, cpf_verificacao TEXT,
      certificado_info TEXT, assinado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gd_ass_doc ON gd_assinaturas(documento_id);
    CREATE TABLE IF NOT EXISTS gd_webhooks (
      id TEXT PRIMARY KEY, evento TEXT NOT NULL, url TEXT NOT NULL, ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS gd_filtros_salvos (
      id TEXT PRIMARY KEY, usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL, filtros TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── CONFIGURAÇÕES DO SISTEMA ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY, valor TEXT NOT NULL DEFAULT '', atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ── LOGS DE AÇÃO ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS logs_acao (
      id INTEGER PRIMARY KEY AUTOINCREMENT, modulo TEXT NOT NULL, acao TEXT NOT NULL,
      usuario TEXT, detalhes TEXT, ip TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_logs_modulo ON logs_acao(modulo);
    CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs_acao(criado_em);

    -- ── RPAs ────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS rpas (
      id TEXT PRIMARY KEY, numero_rpa TEXT, nome_prestador TEXT NOT NULL,
      cpf_prestador TEXT NOT NULL DEFAULT '', endereco_prestador TEXT,
      descricao_servico TEXT, periodo_referencia TEXT, carga_horaria TEXT, local_execucao TEXT,
      valor_bruto REAL NOT NULL DEFAULT 0 CHECK (valor_bruto >= 0),
      num_dependentes INTEGER NOT NULL DEFAULT 0, pensao_alimenticia REAL NOT NULL DEFAULT 0,
      inss REAL NOT NULL DEFAULT 0, iss REAL NOT NULL DEFAULT 0,
      deducao_dependentes REAL NOT NULL DEFAULT 0, base_calculo_irrf REAL NOT NULL DEFAULT 0,
      aliquota_irrf REAL NOT NULL DEFAULT 0, parcela_deduzir_irrf REAL NOT NULL DEFAULT 0,
      irrf REAL NOT NULL DEFAULT 0, valor_liquido REAL NOT NULL DEFAULT 0 CHECK (valor_liquido >= 0),
      observacoes TEXT, data_emissao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rpas_cpf ON rpas(cpf_prestador);
    CREATE INDEX IF NOT EXISTS idx_rpas_periodo ON rpas(periodo_referencia);
    CREATE INDEX IF NOT EXISTS idx_rpas_criado ON rpas(criado_em);

    -- ── CALENDÁRIO MUNICIPAL ───────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS calendario_eventos (
      id TEXT PRIMARY KEY, data TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('PAYMENT','COMMITMENT','HOLIDAY','NOTE')),
      texto TEXT NOT NULL, descricao TEXT DEFAULT '', criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cal_data ON calendario_eventos(data);
    CREATE INDEX IF NOT EXISTS idx_cal_tipo ON calendario_eventos(tipo);
    CREATE TABLE IF NOT EXISTS calendario_overrides (data TEXT PRIMARY KEY, criado_em TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS calendario_regras (chave TEXT PRIMARY KEY, valor TEXT NOT NULL DEFAULT '');

    -- ── PRAZOS E ALERTAS ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS prazos (
      id TEXT PRIMARY KEY, titulo TEXT NOT NULL, descricao TEXT DEFAULT '',
      data_limite TEXT NOT NULL, categoria TEXT NOT NULL DEFAULT 'geral',
      resolvido INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_prazos_data ON prazos(data_limite);
    CREATE INDEX IF NOT EXISTS idx_prazos_categoria ON prazos(categoria);
    CREATE INDEX IF NOT EXISTS idx_prazos_resolvido ON prazos(resolvido);

    -- ── AUTENTIQUE ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS autentique_envios (
      id TEXT PRIMARY KEY, documento_nome TEXT NOT NULL, signatario_nome TEXT NOT NULL,
      signatario_phone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente',
      documento_base64 TEXT, assinatura_link TEXT, webhook_payload TEXT,
      autentique_id TEXT, signatarios_json TEXT NOT NULL DEFAULT '[]', sandbox INTEGER NOT NULL DEFAULT 0, criado_por TEXT,
      token_id TEXT, pasta_id TEXT, arquivo_original_url TEXT, arquivo_assinado_url TEXT,
      observacoes TEXT DEFAULT '', criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_aut_status ON autentique_envios(status);
    CREATE TABLE IF NOT EXISTS autentique_contatos (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS autentique_tokens (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, token TEXT NOT NULL UNIQUE, ativo INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0, ultimo_uso_em TEXT, ultimo_erro TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS autentique_webhook_eventos (
      id TEXT PRIMARY KEY, tipo TEXT NOT NULL, documento_id TEXT, payload TEXT NOT NULL,
      recebido_em TEXT NOT NULL DEFAULT (datetime('now')), processado_em TEXT, erro TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_aut_webhook_documento ON autentique_webhook_eventos(documento_id, recebido_em DESC);

    CREATE TABLE IF NOT EXISTS pncp_registros (
      id TEXT PRIMARY KEY, tipo TEXT NOT NULL, chave_pncp TEXT NOT NULL UNIQUE,
      cnpj_orgao TEXT NOT NULL, titulo TEXT, objeto TEXT, numero TEXT, ano INTEGER,
      sequencial INTEGER, ano_compra INTEGER, sequencial_compra INTEGER,
      processo TEXT, modalidade TEXT, situacao TEXT, valor REAL DEFAULT 0,
      fornecedor_nome TEXT, fornecedor_cnpj TEXT, data_publicacao TEXT,
      data_atualizacao TEXT, vigencia_inicio TEXT, vigencia_fim TEXT, url TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}', sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pncp_tipo_ano ON pncp_registros(tipo, ano DESC);
    CREATE INDEX IF NOT EXISTS idx_pncp_publicacao ON pncp_registros(data_publicacao DESC);
    CREATE INDEX IF NOT EXISTS idx_pncp_fornecedor ON pncp_registros(fornecedor_cnpj);
    CREATE TABLE IF NOT EXISTS pncp_documentos (
      id TEXT PRIMARY KEY, registro_id TEXT NOT NULL REFERENCES pncp_registros(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL, tipo TEXT, url TEXT NOT NULL, data_publicacao TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(registro_id, url)
    );
    CREATE TABLE IF NOT EXISTS pncp_vinculos (
      id TEXT PRIMARY KEY, registro_id TEXT NOT NULL REFERENCES pncp_registros(id) ON DELETE CASCADE,
      entidade_tipo TEXT NOT NULL, entidade_id TEXT NOT NULL, criado_por TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(registro_id, entidade_tipo, entidade_id)
    );
    CREATE INDEX IF NOT EXISTS idx_pncp_vinculo_entidade ON pncp_vinculos(entidade_tipo, entidade_id);
    CREATE TABLE IF NOT EXISTS pncp_sincronizacoes (
      id TEXT PRIMARY KEY, cnpj TEXT NOT NULL, anos TEXT NOT NULL, status TEXT NOT NULL,
      totais TEXT NOT NULL DEFAULT '{}', erros TEXT NOT NULL DEFAULT '[]',
      iniciado_em TEXT NOT NULL DEFAULT (datetime('now')), finalizado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS tcepr_licitacoes (
      id TEXT PRIMARY KEY, chave_externa TEXT NOT NULL UNIQUE,
      cnpj_orgao TEXT, orgao_nome TEXT, codigo_ibge TEXT, municipio TEXT,
      ano INTEGER, processo TEXT, edital TEXT, modalidade TEXT, tipo_avaliacao TEXT,
      objeto TEXT, dotacao TEXT, data_abertura TEXT, data_publicacao TEXT,
      valor_referencia REAL NOT NULL DEFAULT 0, data_cancelamento TEXT,
      situacao TEXT NOT NULL DEFAULT 'Publicada', flags_json TEXT NOT NULL DEFAULT '{}',
      raw_json TEXT NOT NULL DEFAULT '{}', sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tcepr_licitacoes_ano ON tcepr_licitacoes(ano DESC, data_publicacao DESC);
    CREATE INDEX IF NOT EXISTS idx_tcepr_licitacoes_orgao ON tcepr_licitacoes(cnpj_orgao, codigo_ibge);
    CREATE INDEX IF NOT EXISTS idx_tcepr_licitacoes_processo ON tcepr_licitacoes(processo);

    CREATE TABLE IF NOT EXISTS tcepr_obras (
      id TEXT PRIMARY KEY, chave_externa TEXT NOT NULL UNIQUE, id_intervencao TEXT NOT NULL,
      cnpj_orgao TEXT, orgao_nome TEXT, codigo_ibge TEXT, municipio TEXT,
      ano INTEGER, tipo_intervencao TEXT, classificacao_intervencao TEXT,
      nome_intervencao TEXT, tipo_obra TEXT, classificacao_obra TEXT, objeto TEXT,
      medida REAL, unidade_medida TEXT, valor REAL NOT NULL DEFAULT 0,
      data_base_valor TEXT, prazo_execucao INTEGER, data_inicio TEXT, regime TEXT,
      situacao TEXT NOT NULL DEFAULT 'Sem acompanhamento', percentual_fisico REAL,
      ultimo_acompanhamento TEXT, observacao_ultimo_acompanhamento TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}', sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tcepr_obras_ano ON tcepr_obras(ano DESC, data_inicio DESC);
    CREATE INDEX IF NOT EXISTS idx_tcepr_obras_orgao ON tcepr_obras(cnpj_orgao, codigo_ibge);
    CREATE INDEX IF NOT EXISTS idx_tcepr_obras_intervencao ON tcepr_obras(id_intervencao);

    CREATE TABLE IF NOT EXISTS tcepr_obras_acompanhamentos (
      id TEXT PRIMARY KEY, chave_externa TEXT NOT NULL UNIQUE,
      obra_id TEXT REFERENCES tcepr_obras(id) ON DELETE CASCADE,
      id_intervencao TEXT NOT NULL, origem TEXT, numero TEXT, data TEXT,
      tipo TEXT, responsavel TEXT, tipo_documento_responsavel TEXT,
      documento_responsavel TEXT, observacao TEXT, tipo_medicao TEXT,
      percentual_fisico REAL, motivo_paralisacao TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}', sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tcepr_acomp_obra ON tcepr_obras_acompanhamentos(obra_id, data DESC);
    CREATE INDEX IF NOT EXISTS idx_tcepr_acomp_intervencao ON tcepr_obras_acompanhamentos(id_intervencao, data DESC);

    CREATE TABLE IF NOT EXISTS tcepr_sincronizacoes (
      id TEXT PRIMARY KEY, cnpj TEXT NOT NULL, ibge TEXT NOT NULL, anos TEXT NOT NULL,
      status TEXT NOT NULL, totais TEXT NOT NULL DEFAULT '{}', erros TEXT NOT NULL DEFAULT '[]',
      iniciado_em TEXT NOT NULL DEFAULT (datetime('now')), finalizado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS siconfi_registros (
      id TEXT PRIMARY KEY, chave_externa TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL,
      exercicio INTEGER NOT NULL, periodo INTEGER, periodicidade TEXT, demonstrativo TEXT,
      esfera TEXT, poder TEXT, cod_ibge INTEGER, uf TEXT, instituicao TEXT,
      populacao INTEGER, anexo TEXT, rotulo TEXT, coluna TEXT, cod_conta TEXT,
      conta TEXT, valor REAL NOT NULL DEFAULT 0, raw_json TEXT NOT NULL DEFAULT '{}',
      sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_siconfi_tipo_ano ON siconfi_registros(tipo, exercicio DESC, periodo DESC);
    CREATE INDEX IF NOT EXISTS idx_siconfi_conta ON siconfi_registros(cod_conta, tipo);
    CREATE INDEX IF NOT EXISTS idx_siconfi_ibge ON siconfi_registros(cod_ibge, exercicio DESC);
    CREATE TABLE IF NOT EXISTS siconfi_entregas (
      id TEXT PRIMARY KEY, chave_externa TEXT NOT NULL UNIQUE,
      exercicio INTEGER NOT NULL, cod_ibge INTEGER, populacao INTEGER,
      instituicao TEXT, entregavel TEXT, periodo INTEGER, periodicidade TEXT,
      status_relatorio TEXT, data_status TEXT, forma_envio TEXT, tipo_relatorio TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_siconfi_entregas_ano ON siconfi_entregas(exercicio DESC, entregavel, periodo);
    CREATE INDEX IF NOT EXISTS idx_siconfi_entregas_ibge ON siconfi_entregas(cod_ibge, exercicio DESC);
    CREATE TABLE IF NOT EXISTS siconfi_sincronizacoes (
      id TEXT PRIMARY KEY, ibge TEXT NOT NULL, anos TEXT NOT NULL, status TEXT NOT NULL,
      totais TEXT NOT NULL DEFAULT '{}', erros TEXT NOT NULL DEFAULT '[]',
      iniciado_em TEXT NOT NULL DEFAULT (datetime('now')), finalizado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS tgov_instrumentos (
      id TEXT PRIMARY KEY, fonte TEXT NOT NULL, chave_externa TEXT NOT NULL UNIQUE,
      tipo TEXT NOT NULL, codigo TEXT, ano INTEGER, situacao TEXT, objeto TEXT,
      orgao_repassador TEXT, parlamentar TEXT, numero_emenda TEXT,
      cnpj_beneficiario TEXT NOT NULL, inicio_vigencia TEXT, fim_vigencia TEXT,
      valor_total REAL NOT NULL DEFAULT 0, valor_custeio REAL NOT NULL DEFAULT 0,
      valor_investimento REAL NOT NULL DEFAULT 0, saldo REAL NOT NULL DEFAULT 0,
      raw_json TEXT NOT NULL DEFAULT '{}', sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tgov_fonte_ano ON tgov_instrumentos(fonte, ano DESC);
    CREATE INDEX IF NOT EXISTS idx_tgov_situacao ON tgov_instrumentos(situacao);
    CREATE INDEX IF NOT EXISTS idx_tgov_vigencia ON tgov_instrumentos(fim_vigencia);
    CREATE TABLE IF NOT EXISTS tgov_movimentacoes (
      id TEXT PRIMARY KEY, instrumento_id TEXT REFERENCES tgov_instrumentos(id) ON DELETE CASCADE,
      fonte TEXT NOT NULL, chave_externa TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL,
      numero TEXT, data TEXT, valor REAL NOT NULL DEFAULT 0, situacao TEXT,
      favorecido TEXT, descricao TEXT, raw_json TEXT NOT NULL DEFAULT '{}',
      sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tgov_mov_instrumento ON tgov_movimentacoes(instrumento_id, data DESC);
    CREATE INDEX IF NOT EXISTS idx_tgov_mov_tipo ON tgov_movimentacoes(tipo, data DESC);
    CREATE TABLE IF NOT EXISTS tgov_sincronizacoes (
      id TEXT PRIMARY KEY, cnpj TEXT NOT NULL, status TEXT NOT NULL,
      totais TEXT NOT NULL DEFAULT '{}', erros TEXT NOT NULL DEFAULT '[]',
      iniciado_em TEXT NOT NULL DEFAULT (datetime('now')), finalizado_em TEXT
    );

    -- ── MURAL DE RECADOS ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS mural_recados (
      id TEXT PRIMARY KEY, titulo TEXT NOT NULL, conteudo TEXT NOT NULL, autor TEXT NOT NULL,
      destinatario TEXT DEFAULT 'Todos', prioridade TEXT DEFAULT 'media',
      categoria TEXT DEFAULT 'tarefa', status TEXT DEFAULT 'a_fazer', cor TEXT DEFAULT 'yellow',
      criado_em TEXT NOT NULL DEFAULT (datetime('now')), atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mural_status ON mural_recados(status);
    CREATE INDEX IF NOT EXISTS idx_mural_criado ON mural_recados(criado_em);
    CREATE TABLE IF NOT EXISTS mural_comentarios (
      id TEXT PRIMARY KEY, recado_id TEXT NOT NULL REFERENCES mural_recados(id) ON DELETE CASCADE,
      autor TEXT NOT NULL, texto TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mural_com_recado ON mural_comentarios(recado_id);

    -- ── TELEGRAM BOT ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS telegram_vinculos (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL UNIQUE,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      username_tg TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      vinculado_em TEXT NOT NULL DEFAULT (datetime('now')),
      ultimo_acesso TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tg_user ON telegram_vinculos(usuario_id);
    CREATE TABLE IF NOT EXISTS telegram_codigos (
      id TEXT PRIMARY KEY,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      codigo TEXT NOT NULL UNIQUE,
      expira_em TEXT NOT NULL,
      usado INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tg_cod ON telegram_codigos(codigo);
    CREATE TABLE IF NOT EXISTS telegram_logs (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      usuario_id TEXT,
      comando TEXT,
      args_redacted TEXT,
      ok INTEGER NOT NULL DEFAULT 1,
      erro TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tg_logs_criado ON telegram_logs(criado_em);

    -- ── FNDE REPASSES ────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS fnde_repasses (
      id TEXT PRIMARY KEY,
      ano INTEGER NOT NULL,
      programa TEXT NOT NULL,
      acao TEXT,
      numero_processo TEXT,
      entidade TEXT,
      cnpj_entidade TEXT NOT NULL,
      escola TEXT,
      valor_pago REAL NOT NULL DEFAULT 0,
      data_pagamento TEXT,
      numero_ordem_bancaria TEXT,
      raw_json TEXT NOT NULL DEFAULT '{}',
      sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_fnde_ano_prog ON fnde_repasses(ano DESC, programa);
    CREATE INDEX IF NOT EXISTS idx_fnde_data ON fnde_repasses(data_pagamento DESC);

    -- ── BENEFÍCIOS SOCIAIS MUNICIPAIS ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS beneficios_sociais (
      id TEXT PRIMARY KEY,
      mes_ano TEXT NOT NULL,
      tipo TEXT NOT NULL,
      codigo_ibge TEXT NOT NULL,
      municipio TEXT NOT NULL,
      uf TEXT NOT NULL,
      quantidade_beneficiarios INTEGER NOT NULL DEFAULT 0,
      valor_total REAL NOT NULL DEFAULT 0,
      raw_json TEXT NOT NULL DEFAULT '{}',
      sincronizado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_beneficios_mes_tipo ON beneficios_sociais(mes_ano DESC, tipo);
    CREATE INDEX IF NOT EXISTS idx_beneficios_ibge ON beneficios_sociais(codigo_ibge);
  `);

  const notificationColumns = db.prepare("PRAGMA table_info(gd_notificacoes)").all().map((column) => column.name);
  if (!notificationColumns.includes("ator_id")) db.exec("ALTER TABLE gd_notificacoes ADD COLUMN ator_id TEXT REFERENCES usuarios(id) ON DELETE SET NULL");
  if (!notificationColumns.includes("rota")) db.exec("ALTER TABLE gd_notificacoes ADD COLUMN rota TEXT");
  if (!notificationColumns.includes("prioridade")) db.exec("ALTER TABLE gd_notificacoes ADD COLUMN prioridade TEXT NOT NULL DEFAULT 'normal'");
  if (!notificationColumns.includes("chave_evento")) db.exec("ALTER TABLE gd_notificacoes ADD COLUMN chave_evento TEXT");
  if (!notificationColumns.includes("lida_em")) db.exec("ALTER TABLE gd_notificacoes ADD COLUMN lida_em TEXT");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gd_notif_order ON gd_notificacoes(usuario_id, criado_em DESC, id DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_gd_notif_event ON gd_notificacoes(usuario_id, chave_evento) WHERE chave_evento IS NOT NULL;
  `);
}

// Cria índices da tabela empenhos_orcamentarios (idempotente).
// Usado em migrate() e após DROP+RENAME no empenhos_importar modo "substituir",
// pois o RENAME preserva índices da staging mas perde os índices no nome real.
function criarIndicesEmpenhos(db) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_emp_ano     ON empenhos_orcamentarios(ano_empenho);
    CREATE INDEX IF NOT EXISTS idx_emp_mod     ON empenhos_orcamentarios(modalidade);
    CREATE INDEX IF NOT EXISTS idx_emp_tipo    ON empenhos_orcamentarios(tipo_empenho);
    CREATE INDEX IF NOT EXISTS idx_emp_recurso  ON empenhos_orcamentarios(num_recurso);
    CREATE INDEX IF NOT EXISTS idx_emp_programa ON empenhos_orcamentarios(num_programa);
    CREATE INDEX IF NOT EXISTS idx_emp_acao     ON empenhos_orcamentarios(num_acao);
    CREATE INDEX IF NOT EXISTS idx_emp_despesa  ON empenhos_orcamentarios(num_despesa);
    CREATE INDEX IF NOT EXISTS idx_emp_natdesp  ON empenhos_orcamentarios(num_natureza_desp);
    CREATE INDEX IF NOT EXISTS idx_emp_credor   ON empenhos_orcamentarios(id_credor);
    CREATE INDEX IF NOT EXISTS idx_emp_nome     ON empenhos_orcamentarios(nome_credor COLLATE NOCASE);
  `);
}

// Cache em memória para `empenhos_filtros_disponiveis`: os filtros mudam
// apenas quando a tabela é regravada (importação). TTL curto (60s) garante
// consistência sem penalizar páginas de listagem (que chamam a cada montagem).
const _empFiltrosCache = { ts: 0, data: null };

function empenhosFiltrosDisponiveis(db) {
  const TTL_MS = 60_000;
  const agora = Date.now();
  if (_empFiltrosCache.data && (agora - _empFiltrosCache.ts) < TTL_MS) {
    return { data: _empFiltrosCache.data, error: null };
  }
  // Executa uma única passagem com UNION ALL rotulado, usando os índices
  // criados em migrate()/criarIndicesEmpenhos. Cada ramo usa um índice diferente.
  const sql = `
    SELECT 'modalidade' AS k, modalidade AS v FROM empenhos_orcamentarios WHERE modalidade != ''
    UNION ALL
    SELECT 'natureza',    num_natureza_desp FROM empenhos_orcamentarios WHERE num_natureza_desp != ''
    UNION ALL
    SELECT 'ano',         CAST(ano_empenho AS TEXT) FROM empenhos_orcamentarios WHERE ano_empenho > 0
    UNION ALL
    SELECT 'tipo',        tipo_empenho FROM empenhos_orcamentarios WHERE tipo_empenho != ''
    UNION ALL
    SELECT 'recurso',     num_recurso FROM empenhos_orcamentarios WHERE num_recurso != ''
    UNION ALL
    SELECT 'programa',    num_programa FROM empenhos_orcamentarios WHERE num_programa != ''
    UNION ALL
    SELECT 'acao',        num_acao FROM empenhos_orcamentarios WHERE num_acao != ''
    UNION ALL
    SELECT 'despesa',     num_despesa FROM empenhos_orcamentarios WHERE num_despesa != ''
  `;
  const rows = db.prepare(sql).all();
  const out = {
    modalidades: [], naturezas: [], anos: [], tipos: [],
    recursos: [], programas: [], acoes: [], despesas: [],
  };
  const dedup = {
    modalidades: new Set(), naturezas: new Set(), anos: new Set(), tipos: new Set(),
    recursos: new Set(), programas: new Set(), acoes: new Set(), despesas: new Set(),
  };
  const mapKey = {
    modalidade: "modalidades",
    natureza:   "naturezas",
    ano:        "anos",
    tipo:       "tipos",
    recurso:    "recursos",
    programa:   "programas",
    acao:       "acoes",
    despesa:    "despesas",
  };
  for (const r of rows) {
    const arrKey = mapKey[r.k];
    if (!arrKey) continue;
    const s = String(r.v);
    if (!dedup[arrKey].has(s)) {
      dedup[arrKey].add(s);
      out[arrKey].push(r.k === "ano" ? parseInt(s, 10) : s);
    }
  }
  // Ordena: anos desc (numérico), demais asc (string natural).
  out.anos.sort((a, b) => b - a);
  for (const k of ["modalidades","naturezas","tipos","recursos","programas","acoes","despesas"]) {
    out[k].sort((a, b) => String(a).localeCompare(String(b), "pt"));
  }
  _empFiltrosCache.data = out;
  _empFiltrosCache.ts = agora;
  return { data: out, error: null };
}

// Invalida o cache de filtros — chamado após importação/substituição.
function invalidarCacheEmpenhosFiltros() {
  _empFiltrosCache.data = null;
  _empFiltrosCache.ts = 0;
}

export function seedDatabase(db) {
  const colsArquivos = db.prepare("PRAGMA table_info(gd_arquivos)").all().map(c => c.name);
  if (colsArquivos.length && !colsArquivos.includes("preview_caminho")) db.exec("ALTER TABLE gd_arquivos ADD COLUMN preview_caminho TEXT");
  const colsCred = db.prepare("PRAGMA table_info(credores_fixos)").all().map(c => c.name);
  if (!colsCred.includes("email"))       db.exec("ALTER TABLE credores_fixos ADD COLUMN email TEXT");
  if (!colsCred.includes("tipo_valor"))  db.exec("ALTER TABLE credores_fixos ADD COLUMN tipo_valor TEXT DEFAULT 'FIXO'");
  if (!colsCred.includes("solicitacao")) db.exec("ALTER TABLE credores_fixos ADD COLUMN solicitacao TEXT");
  if (!colsCred.includes("pagamento"))   db.exec("ALTER TABLE credores_fixos ADD COLUMN pagamento TEXT");
  if (!colsCred.includes("obs"))         db.exec("ALTER TABLE credores_fixos ADD COLUMN obs TEXT");

  const cols = db.prepare("PRAGMA table_info(usuarios)").all().map(c => c.name);
  if (!cols.includes("is_admin"))        db.exec("ALTER TABLE usuarios ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
  if (!cols.includes("ativo"))           db.exec("ALTER TABLE usuarios ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1");
  if (!cols.includes("mostrar_bloqueados")) db.exec("ALTER TABLE usuarios ADD COLUMN mostrar_bloqueados INTEGER NOT NULL DEFAULT 0");

  const colsTarefas = db.prepare("PRAGMA table_info(tarefas)").all().map(c => c.name);
  if (!colsTarefas.includes("anexos")) db.exec("ALTER TABLE tarefas ADD COLUMN anexos TEXT NOT NULL DEFAULT '[]'");

  const colsPedidosDotacao = db.prepare("PRAGMA table_info(pedidos_dotacao)").all().map(c => c.name);
  if (!colsPedidosDotacao.includes("anexos")) db.exec("ALTER TABLE pedidos_dotacao ADD COLUMN anexos TEXT NOT NULL DEFAULT '[]'");
  if (!colsPedidosDotacao.includes("protocolo")) db.exec("ALTER TABLE pedidos_dotacao ADD COLUMN protocolo TEXT");

  const colsAutentique = db.prepare("PRAGMA table_info(autentique_envios)").all().map(c => c.name);
  if (!colsAutentique.includes("autentique_id")) db.exec("ALTER TABLE autentique_envios ADD COLUMN autentique_id TEXT");
  if (!colsAutentique.includes("signatarios_json")) db.exec("ALTER TABLE autentique_envios ADD COLUMN signatarios_json TEXT NOT NULL DEFAULT '[]'");
  if (!colsAutentique.includes("sandbox")) db.exec("ALTER TABLE autentique_envios ADD COLUMN sandbox INTEGER NOT NULL DEFAULT 0");
  if (!colsAutentique.includes("criado_por")) db.exec("ALTER TABLE autentique_envios ADD COLUMN criado_por TEXT");
  if (!colsAutentique.includes("token_id")) db.exec("ALTER TABLE autentique_envios ADD COLUMN token_id TEXT");
  if (!colsAutentique.includes("pasta_id")) db.exec("ALTER TABLE autentique_envios ADD COLUMN pasta_id TEXT");
  if (!colsAutentique.includes("arquivo_original_url")) db.exec("ALTER TABLE autentique_envios ADD COLUMN arquivo_original_url TEXT");
  if (!colsAutentique.includes("arquivo_assinado_url")) db.exec("ALTER TABLE autentique_envios ADD COLUMN arquivo_assinado_url TEXT");

  const colsSites = db.prepare("PRAGMA table_info(sites_uteis)").all().map(c => c.name);
  if (colsSites.length && !colsSites.includes("ordem")) {
    db.exec("ALTER TABLE sites_uteis ADD COLUMN ordem INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE sites_uteis SET ordem = (SELECT COUNT(*) FROM sites_uteis AS s2 WHERE s2.titulo < sites_uteis.titulo) + 1");
  }
  if (colsSites.length && !colsSites.includes("criado_por")) db.exec("ALTER TABLE sites_uteis ADD COLUMN criado_por TEXT");

  const sitesSeed = [
    {
      url: "https://demonstrativos.apps.bb.com.br/arrecadacao-federal",
      titulo: "BB Repasses",
      categoria: "Bancos",
      descricao: "Demonstrativos e repasses de arrecadação do Banco do Brasil para a prefeitura.",
      ordem: 1,
    },
    {
      url: "https://servicos.tce.pr.gov.br/servicos/srv_exibirRelatorios.aspx?t=33",
      titulo: "Relatório TCE licitação",
      categoria: "TCE",
      descricao: "Relatórios do TCE-PR relacionados a processos de licitação.",
      ordem: 2,
    },
    {
      url: "https://www.oregionaljornal.com.br/edicoes/",
      titulo: "O Regional - Edições",
      categoria: "Imprensa",
      descricao: "Edições do jornal O Regional publicadas online.",
      ordem: 3,
    },
    {
      url: "https://app.powerbi.com/view?r=eyJrIjoiZTU5OGRmOTUtMmUxYi00NGZlLTg2NWQtMzE5YWEzM2MxYjgzIiwidCI6ImY3MGEwYWY2LWRhMGYtNDViZS1iN2VkLTlmOGMxYjI0YmZkZiIsImMiOjR9&pageName=9a1824bb874a4c6d5836&disablecdnExpiration=1785464523",
      titulo: "Mural de Licitação",
      categoria: "Transparência",
      descricao: "Mural de licitações com quadros e publicações em andamento.",
      ordem: 4,
    },
  ];
  for (const s of sitesSeed) {
    db.prepare(`
      UPDATE sites_uteis
      SET titulo = ?, categoria = ?, descricao = ?, ordem = ?
      WHERE url = ? AND (descricao IS NULL OR TRIM(descricao) = '')
    `).run(s.titulo, s.categoria, s.descricao, s.ordem, s.url);
    db.prepare(`
      UPDATE sites_uteis SET ordem = ? WHERE url = ?
    `).run(s.ordem, s.url);
  }

  const users = ["aleksandro", "maicon", "luana", "cleison"];
  const insert = db.prepare(
    "INSERT OR IGNORE INTO usuarios (id, username) VALUES (?, ?)",
  );
  for (const u of users) {
    insert.run(randomUUID(), u);
  }

  db.prepare("UPDATE usuarios SET is_admin = 1 WHERE lower(username) = 'aleksandro'").run();

  db.exec(`
    UPDATE usuario_modulos AS legado
    SET modulo_id = 'calculadoras'
    WHERE legado.modulo_id = 'diarias'
      AND NOT EXISTS (
        SELECT 1 FROM usuario_modulos AS atual
        WHERE atual.usuario_id = legado.usuario_id
          AND atual.modulo_id = 'calculadoras'
      );
    DELETE FROM usuario_modulos WHERE modulo_id = 'diarias';

    UPDATE usuario_modulos_ordem AS legado
    SET modulo_id = 'calculadoras'
    WHERE legado.modulo_id = 'diarias'
      AND NOT EXISTS (
        SELECT 1 FROM usuario_modulos_ordem AS atual
        WHERE atual.usuario_id = legado.usuario_id
          AND atual.modulo_id = 'calculadoras'
      );
    DELETE FROM usuario_modulos_ordem WHERE modulo_id = 'diarias';

    UPDATE usuario_modulos_favoritos AS legado
    SET modulo_id = 'calculadoras'
    WHERE legado.modulo_id = 'diarias'
      AND NOT EXISTS (
        SELECT 1 FROM usuario_modulos_favoritos AS atual
        WHERE atual.usuario_id = legado.usuario_id
          AND atual.modulo_id = 'calculadoras'
      );
    DELETE FROM usuario_modulos_favoritos WHERE modulo_id = 'diarias';

    DELETE FROM usuario_modulos WHERE modulo_id = 'ibge';
    DELETE FROM usuario_modulos_ordem WHERE modulo_id = 'ibge';
    DELETE FROM usuario_modulos_favoritos WHERE modulo_id = 'ibge';
  `);

  const todosModulos = ["solicitacoes", "tarefas", "calculadoras", "credores-fixos", "empenhos", "gestao-documentos", "rpas", "cnpj", "saude-publica", "calendario", "prazos", "assistente-empenho", "classificador-despesa", "autentique", "pncp", "compras-gov", "transferencias", "pdf-utils", "admin-config", "mural", "extratos"];
  const allUsers = db.prepare("SELECT id, username FROM usuarios").all();
  const usuariosSemModulos = new Set(["maicon", "luana", "cleison"]);
  const countUserModules = db.prepare("SELECT COUNT(*) AS total FROM usuario_modulos WHERE usuario_id = ?");
  const insertMod = db.prepare(
    "INSERT OR IGNORE INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)"
  );
  for (const u of allUsers) {
    if (usuariosSemModulos.has(String(u.username).toLowerCase())) continue;
    if (countUserModules.get(u.id).total > 0) continue;
    for (const m of todosModulos) {
      insertMod.run(randomUUID(), u.id, m);
    }
  }

  const adminArquivos = db.prepare("SELECT id FROM usuarios WHERE lower(username) = 'aleksandro'").get();
  if (adminArquivos) {
    const pastaExiste = db.prepare("SELECT 1 FROM gd_pastas WHERE parent_id IS NULL AND nome = ?");
    const inserirPasta = db.prepare("INSERT INTO gd_pastas (id, nome, parent_id, usuario_id) VALUES (?, ?, NULL, ?)");
    for (const nome of ["Temporários", "Ofícios", "Leis", "Decretos", "Modelos", "Parecer"]) {
      if (!pastaExiste.get(nome)) inserirPasta.run(randomUUID(), nome, adminArquivos.id);
    }
  }

  seedCredoresFixos(db);
}

function seedCredoresFixos(db) {
  const count = db.prepare("SELECT count(*) AS c FROM credores_fixos").get().c;
  if (count > 0) return;

  const CREDORES = [
    { nome: "EMPASOFT", valor: 799.99, descricao: "LINHA TELEFÔNICA", documento: "03.404.680/0001-05", email: "G21@G21TELECOM.COM.BR", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Administração", obs: "VENCIDO" },
    { nome: "L. RICARDO DE MAGALHAES", valor: 1489.82, descricao: "SOFTWARE PARA LICITAÇÃO", documento: "17.922.286/0001-65", email: "financeiro@sistematrazvalor.com.br", tipo_valor: "FIXO", solicitacao: "", pagamento: "20", departamento: "Administração", obs: "" },
    { nome: "LF SISTEMAS", valor: 1700.00, descricao: "SOFTWARE PARA LICITAÇÃO", documento: "46.777.506/0001-02", email: "orcamento@sistemaslf.com.br", tipo_valor: "FIXO", solicitacao: "", pagamento: "20", departamento: "Administração", obs: "" },
    { nome: "J SILVA", valor: 2143.50, descricao: "RADIALISTA", documento: "", email: "", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Administração", obs: "" },
    { nome: "ANTELMO", valor: 2300.00, descricao: "AULAS DE CAPOEIRA", documento: "17.591.235/0001-06", email: "gilmadureira@hotmail.com", tipo_valor: "FIXO", solicitacao: "1", pagamento: "5", departamento: "Educação", obs: "" },
    { nome: "D. SORTI & SORTI LTDA - ME", valor: 2650.00, descricao: "LIXO HOSPITALAR", documento: "00.173.763/0001-34", email: "danielsorti@hotmail.com", tipo_valor: "FIXO", solicitacao: "", pagamento: "20", departamento: "Saúde", obs: "" },
    { nome: "VERA LUCIA FERREIRA", valor: 2813.81, descricao: "OFICINA DE ARTESANATO", documento: "60.578.488/0001-60", email: "MEDEIROS_VERALUCIA80@GMAIL.COM", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "KESIA APARECIDA", valor: 3030.00, descricao: "ORIENTADORA SOCIAL", documento: "43.031.315/0001-09", email: "kesiapsicologia@hotmail.com", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "MARCOS ANDRE RIBEIRO", valor: 3770.00, descricao: "FOTOGRAFIA DE EVENTOS E DEMAIS", documento: "28.051.421/0001-60", email: "MARCOS.ANDRE.UNIPAR@GMAIL.COM", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Administração", obs: "" },
    { nome: "G FOUR", valor: 9776.60, descricao: "INTERNET", documento: "10.192.962/0001-43", email: "ap-bruzaroschi@bol.com.br", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "" },
    { nome: "GABRIEL GOUVEIA DE OLIVEIRA", valor: 4467.49, descricao: "ADVOGADO", documento: "", email: "", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "PRODASP", valor: 3321.82, descricao: "REFERENTE A CÂMARA MUNICIPAL", documento: "84.785.070/0001-92", email: "miihrosada@gmail.com", tipo_valor: "FIXO", solicitacao: "", pagamento: "20", departamento: "Administração", obs: "" },
    { nome: "OPPORTUNITY", valor: 4850.00, descricao: "ASSESSORIA", documento: "11.063.183/0001-00", email: "OPPORTUNITYASSESSORIA2014@GMAIL.COM", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Administração", obs: "" },
    { nome: "MUNICIPIO PARANAVAI", valor: 5740.57, descricao: "USO DO ATERRO", documento: "76.977.768/0001-81", email: "", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "" },
    { nome: "DEL GROSSI", valor: 5960.00, descricao: "JORNAL", documento: "79.989.505/0001-80", email: "rauldelgrossi@hotmail.com", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "" },
    { nome: "MARLENE OLIVEIRA", valor: 6060.00, descricao: "LOCAÇÃO DAS IMPRESSORAS", documento: "30.502.537/0001-10", email: "marlenemoretto@outlook.com", tipo_valor: "FIXO", solicitacao: "", pagamento: "20", departamento: "Administração", obs: "" },
    { nome: "ROSIANE OLIVEIRA LIMA GONÇALVES EIRELI", valor: 5690.00, descricao: "ASSESSORIA", documento: "22.762.257/0001-13", email: "DIGITALGRC@GMAIL.COM", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Administração", obs: "" },
    { nome: "PRISMA", valor: 10000.00, descricao: "ASSESSORIA", documento: "", email: "ANISIO@ALVORADAESCRITORIO.COM.BR", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Administração", obs: "" },
    { nome: "AVR", valor: 10000.00, descricao: "ADOLFO", documento: "", email: "ALVORADA@ALVORADAESCRITORIO.COM.BR", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "" },
    { nome: "PRODASP", valor: 18600.39, descricao: "REFERENTE A PREFEITURA MUNICIPAL", documento: "84.785.070/0001-92", email: "miihrosada@gmail.com", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "" },
    { nome: "RENATA DA SILVA", valor: 2232.60, descricao: "OFICINA DE ESPORTE E LAZER", documento: "40.218.309/0001-77", email: "wvjtreinamentoepilates@gmail.com", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "E R BOSSOLANI", valor: 2440.00, descricao: "OFICINA DE MÚSICA", documento: "32.369.679/0001-87", email: "erbsom.eventos@gmail.com", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "EDSON TADAYUKI", valor: 2476.95, descricao: "OFICINA DE DEFESA PESSOAL", documento: "43.133.353/0001-72", email: "escritorio_elite@hotmail.com", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "C. F. BASSO & CIA LTDA", valor: 2167.00, descricao: "OFICINA DE YOGA", documento: "07.910.317/0001-04", email: "pirescontabil@hotmail.com", tipo_valor: "FIXO", solicitacao: "5", pagamento: "10", departamento: "Assistência Social", obs: "" },
    { nome: "LUCIO FERNANDES ENARES", valor: 0, descricao: "ATENDIMENTOS MÉDICOS EM GERAL", documento: "40.064.403/0001-19", email: "dr.lucio.enares@gmail.com", tipo_valor: "VARIÁVEL", solicitacao: "", pagamento: "10", departamento: "Saúde", obs: "" },
    { nome: "SAMUEL CERQUEIRA", valor: 0, descricao: "FANFARRA", documento: "32.757.814/0001-61", email: "SAMUEL.CERQUEIRA.91@OUTLOOK.COM.BR", tipo_valor: "FIXO", solicitacao: "15", pagamento: "20", departamento: "Educação", obs: "" },
    { nome: "INSTAR TECNOLOGIA", valor: 0, descricao: "HOSPEDAGEM DO SITE", documento: "", email: "JURIDICO@INSTAR.COM.BR", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "" },
    { nome: "PRODASP", valor: 4769.74, descricao: "REFERENTE A CÂMARA MUNICIPAL", documento: "84.785.070/0001-92", email: "miihrosada@gmail.com", tipo_valor: "FIXO", solicitacao: "", pagamento: "20", departamento: "Administração", obs: "" },
    { nome: "CLEISON MOREIRA DE SOUZA", valor: 9390.00, descricao: "PROFISSIONAL TECNICO", documento: "", email: "", tipo_valor: "FIXO", solicitacao: "", pagamento: "", departamento: "Administração", obs: "DIVISAO DE CONTABILIDADE" },
  ];

  const stmt = db.prepare(
    "INSERT INTO credores_fixos (id, nome, documento, departamento, valor_mensal, descricao, email, tipo_valor, solicitacao, pagamento, obs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const c of CREDORES) {
    stmt.run(
      randomUUID(), c.nome, c.documento || null, c.departamento,
      c.valor, c.descricao || null, c.email || null, c.tipo_valor || "FIXO",
      c.solicitacao || null, c.pagamento || null, c.obs || null,
    );
  }
}

const JSON_COLS = {
  modelos: new Set(["form_data", "items"]),
  solicitacoes: new Set(["items", "anexos"]),
  tarefas: new Set(["anexos"]),
  pedidos_dotacao: new Set(["anexos"]),
};

function parseRow(table, row) {
  if (!row) return row;
  const cols = JSON_COLS[table];
  if (!cols) return { ...row };
  const out = { ...row };
  for (const c of cols) {
    if (typeof out[c] === "string") {
      try {
        out[c] = JSON.parse(out[c]);
      } catch {
        /* keep string */
      }
    }
  }
  return out;
}

function serializePayload(table, payload) {
  const cols = JSON_COLS[table];
  if (!cols) return { ...payload };
  const out = { ...payload };
  for (const c of cols) {
    if (c in out && out[c] !== null && typeof out[c] !== "string") {
      out[c] = JSON.stringify(out[c]);
    }
  }
  return out;
}

let lastIsoTimestamp = 0;
function nowIso() {
  let now = Date.now();
  if (now <= lastIsoTimestamp) {
    now = lastIsoTimestamp + 1;
  }
  lastIsoTimestamp = now;
  return new Date(now).toISOString();
}

function uniqueError(err) {
  const msg = String(err?.message || err);
  if (msg.includes("UNIQUE constraint failed")) {
    return { message: msg, code: "23505" };
  }
  return { message: msg, code: "DB_ERROR" };
}

const STATUS_PEDIDO_DOTACAO = new Set([
  "enviado",
  "procurando_dotacao",
  "em_analise",
  "aprovado",
  "nao_aprovado",
  "sem_saldo",
  "aguardando_suplementacao",
  "ajustes",
  "recusado",
  "arquivado",
  "concluido",
  "cancelado",
]);
const STATUS_FINAIS_PEDIDO_DOTACAO = new Set(["concluido", "arquivado", "cancelado"]);

function registrarHistoricoDotacao(db, pedidoId, acao, statusAnterior, statusNovo, mensagem, usuario) {
  const id = randomUUID();
  db.prepare(`INSERT INTO pedidos_dotacao_historico
    (id, pedido_id, acao, status_anterior, status_novo, mensagem, usuario, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, pedidoId, acao, statusAnterior || null, statusNovo || null, mensagem || null, usuario, nowIso());
  return id;
}

function anexosDoPedido(row) {
  if (!row?.anexos) return [];
  try {
    const anexos = typeof row.anexos === "string" ? JSON.parse(row.anexos) : row.anexos;
    return Array.isArray(anexos) ? anexos : [];
  } catch {
    return [];
  }
}

function removerCaminhoUpload(db, relativePath) {
  const caminho = String(relativePath || "");
  if (caminho) {
    for (const tabela of ["solicitacoes", "tarefas", "pedidos_dotacao"]) {
      const referenciado = db.prepare(`SELECT 1 FROM ${tabela}, json_each(CASE WHEN json_valid(anexos) THEN anexos ELSE '[]' END)
        WHERE json_extract(json_each.value, '$.path') = ? LIMIT 1`).get(caminho);
      if (referenciado) return;
    }
  }
  const filePath = path.resolve(UPLOADS_DIR, caminho);
  if (caminho && filePath.startsWith(`${UPLOADS_DIR}${path.sep}`) && existsSync(filePath)) unlinkSync(filePath);
  if (caminho) db.prepare("DELETE FROM uploads_controle WHERE caminho = ?").run(caminho);
}

function removerAnexosDoPedido(db, row) {
  for (const anexo of anexosDoPedido(row)) {
    removerCaminhoUpload(db, anexo?.path);
  }
}

function removerAnexosRetirados(db, anterior, atual) {
  const mantidos = new Set(anexosDoPedido(atual).map((anexo) => String(anexo?.path || "")).filter(Boolean));
  for (const anexo of anexosDoPedido(anterior)) {
    if (!mantidos.has(String(anexo?.path || ""))) removerCaminhoUpload(db, anexo?.path);
  }
}

export function runQuery(db, body, trustedCaller = null) {
  const {
    table,
    action,
    select: selectCols = "*",
    filters = [],
    order = [],
    limit,
    offset,
    payload,
    payloads,
    onConflict,
    ignoreDuplicates,
  } = body;

  const allowed = new Set([
    "solicitantes",
    "empresas",
    "observacoes",
    "modelos",
    "solicitacoes",
    "tarefas",
    "credores_fixos",
    "empenhos_mensais",
    "pedidos_dotacao",
    "pedidos_dotacao_historico",
    "sites_uteis",
  ]);
  if (!allowed.has(table)) {
    return { data: null, error: { message: `Tabela inválida: ${table}`, code: "INVALID_TABLE" } };
  }

  const callerU = obterUsuario(db, trustedCaller);
  const tableModules = {
    solicitantes: "solicitacoes",
    empresas: "solicitacoes",
    observacoes: "solicitacoes",
    modelos: "solicitacoes",
    solicitacoes: "solicitacoes",
    tarefas: "tarefas",
    credores_fixos: "credores-fixos",
    empenhos_mensais: "credores-fixos",
    pedidos_dotacao: "pedido-dotacao",
    pedidos_dotacao_historico: "pedido-dotacao",
    sites_uteis: "sites-uteis",
  };
  const moduleId = tableModules[table];
  const hasModule = Boolean(callerU?.is_admin || (callerU && db
    .prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = ?")
    .get(callerU.id, moduleId)));
  if (!callerU?.ativo || !hasModule) {
    return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
  }
  if (table === "sites_uteis" && action !== "select" && !callerU.is_admin) {
    return { data: null, error: { message: "Apenas administradores podem gerenciar sites úteis.", code: "FORBIDDEN" } };
  }
  const isStaffDotacao = Boolean(callerU.is_admin || callerU.is_contador);

  const ident = (name) => {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(name))) {
      throw new Error(`Identificador inválido: ${name}`);
    }
    return String(name);
  };

  try {
    if (action === "select") {
      if (table === "pedidos_dotacao_historico") {
        const pedidoId = filters.find((f) => f.column === "pedido_id")?.value;
        if (!pedidoId) {
          return { data: null, error: { message: "Informe o pedido para consultar o histórico", code: "BAD_REQUEST" } };
        }
        const pedido = db.prepare("SELECT solicitante FROM pedidos_dotacao WHERE id = ?").get(pedidoId);
        if (!pedido) {
          return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
        }
      }
      let colsSql = "*";
      if (selectCols && selectCols !== "*") {
        colsSql = String(selectCols)
          .split(",")
          .map((c) => ident(c.trim()))
          .join(", ");
      }
      let sql = `SELECT ${colsSql} FROM ${table}`;
      const params = [];
      if (filters.length) {
        sql +=
          " WHERE " +
          filters
            .map((f) => {
              params.push(f.value);
              return `${ident(f.column)} = ?`;
            })
            .join(" AND ");
      }
      if (order.length) {
        sql +=
          " ORDER BY " +
          order
            .map((o) => `${ident(o.column)} ${o.ascending === false ? "DESC" : "ASC"}`)
            .join(", ");
      }
      if (limit != null) {
        sql += " LIMIT ?";
        params.push(limit);
        if (offset != null) {
          sql += " OFFSET ?";
          params.push(offset);
        }
      }
      const rows = db.prepare(sql).all(...params).map((r) => parseRow(table, r));
      return { data: rows, error: null };
    }

    if (action === "insert") {
      let rows = Array.isArray(payloads) ? payloads : [payload];
      if (table === "pedidos_dotacao") {
        if (rows.length !== 1) {
          return { data: null, error: { message: "Envie um pedido por vez", code: "BAD_REQUEST" } };
        }
        const original = rows[0] || {};
        const secretaria = String(original.secretaria || "").trim();
        const descricao = String(original.descricao || "").trim();
        const valor = Number(original.valor_solicitado);
        const ano = new Date().getFullYear();
        const sequencia = Number(db.prepare("SELECT COUNT(*) AS total FROM pedidos_dotacao WHERE substr(created_at, 1, 4) = ?").get(String(ano)).total || 0) + 1;
        if (!secretaria || !descricao || !Number.isFinite(valor) || valor <= 0) {
          return { data: null, error: { message: "Secretaria, descrição e valor solicitado são obrigatórios", code: "BAD_REQUEST" } };
        }
        rows = [{
          id: original.id,
          protocolo: `DOT-${ano}-${String(sequencia).padStart(4, "0")}`,
          solicitante: callerU.username,
          secretaria,
          descricao,
          valor_solicitado: valor,
          status: "enviado",
          anexos: Array.isArray(original.anexos) ? original.anexos : [],
        }];
      }
      const inserted = [];
      for (const raw of rows) {
        const row = serializePayload(table, { ...raw });
        if (!row.id) row.id = randomUUID();
        if (!row.created_at) row.created_at = nowIso();
        if ("updated_at" in (raw || {}) || table === "modelos" || table === "tarefas" || table === "credores_fixos" || table === "empenhos_mensais") {
          if (!row.updated_at) row.updated_at = nowIso();
        }
        const keys = Object.keys(row).map(ident);
        const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
        db.prepare(sql).run(...keys.map((k) => row[k]));
        inserted.push(parseRow(table, row));
      }
      if (table === "tarefas") {
        for (const tarefa of inserted) emitirNotificacaoTarefa(db, callerU, tarefa);
      }
      if (table === "pedidos_dotacao") {
        const destinatarios = db.prepare("SELECT id FROM usuarios WHERE ativo = 1 AND id <> ? AND (is_admin = 1 OR is_contador = 1)").all(callerU.id).map((u) => u.id);
        for (const pedido of inserted) {
          const historicoId = registrarHistoricoDotacao(db, pedido.id, "criado", null, "enviado", "Pedido enviado para análise.", callerU.username);
          notificar(
            db, destinatarios, "Novo pedido de dotação", `Pedido de ${pedido.solicitante} — ${pedido.secretaria}`,
            "pedido_dotacao", "pedidos_dotacao", pedido.id,
            {
              atorId: callerU.id,
              rota: `/pedidos-dotacao?pedido=${encodeURIComponent(pedido.id)}`,
              chaveEvento: `pedido-dotacao:${pedido.id}:${historicoId}`,
              prioridade: "normal",
            },
          );
        }
      }
      return { data: inserted.length === 1 ? inserted[0] : inserted, error: null };
    }

    if (action === "update") {
      if (table === "pedidos_dotacao") {
        const pedidoId = filters.find((f) => f.column === "id")?.value;
        if (!pedidoId) return { data: null, error: { message: "Informe o pedido a atualizar", code: "BAD_REQUEST" } };
        const atual = db.prepare("SELECT * FROM pedidos_dotacao WHERE id = ?").get(pedidoId);
        if (!atual) return { data: null, error: { message: "Pedido não encontrado", code: "NOT_FOUND" } };
        const row = serializePayload(table, { ...payload });
        const ehSolicitante = String(atual.solicitante).toLowerCase() === String(callerU.username).toLowerCase();
        const statusNovo = row.status == null ? null : String(row.status);
        const camposResposta = new Set(["status", "dotacao", "ficha", "saldo_disponivel", "valor_aprovado", "resposta_contador"]);
        const camposAjuste = new Set(["status", "secretaria", "descricao", "valor_solicitado", "anexos"]);
        const campos = Object.keys(row).filter((key) => key !== "id");

        if (isStaffDotacao) {
          if (!campos.every((campo) => camposResposta.has(campo))) return { data: null, error: { message: "Campos não permitidos na resposta", code: "FORBIDDEN" } };
          if (!statusNovo || !STATUS_PEDIDO_DOTACAO.has(statusNovo) || ["arquivado", "cancelado", "concluido", "enviado"].includes(statusNovo)) return { data: null, error: { message: "Status inválido para a contabilidade", code: "BAD_REQUEST" } };
          if (["aprovado", "nao_aprovado", "sem_saldo", "aguardando_suplementacao", "recusado", "ajustes"].includes(statusNovo) && !String(row.resposta_contador || "").trim()) return { data: null, error: { message: "Informe uma resposta ou justificativa", code: "BAD_REQUEST" } };
          if (statusNovo === "aprovado" && !String(row.dotacao || "").trim()) return { data: null, error: { message: "Informe a dotação orçamentária", code: "BAD_REQUEST" } };
          const saldo = Number(row.saldo_disponivel ?? 0);
          const aprovado = Number(row.valor_aprovado ?? 0);
          if (!Number.isFinite(saldo) || saldo < 0 || !Number.isFinite(aprovado) || aprovado < 0) return { data: null, error: { message: "Saldo e valor aprovado não podem ser negativos", code: "BAD_REQUEST" } };
          row.respondido_por = callerU.username;
          row.respondido_em = nowIso();
        } else if (ehSolicitante && statusNovo === "concluido" && ["aprovado", "nao_aprovado", "sem_saldo", "aguardando_suplementacao", "recusado"].includes(atual.status) && campos.length === 1) {
        } else if (ehSolicitante && statusNovo === "arquivado" && atual.status === "aprovado" && campos.length === 1) {
        } else if (ehSolicitante && statusNovo === "enviado" && atual.status === "ajustes" && campos.every((campo) => camposAjuste.has(campo))) {
          const valor = Number(row.valor_solicitado);
          if (!String(row.secretaria || "").trim() || !String(row.descricao || "").trim() || !Number.isFinite(valor) || valor <= 0) return { data: null, error: { message: "Secretaria, descrição e valor solicitado são obrigatórios", code: "BAD_REQUEST" } };
        } else {
          return { data: null, error: { message: "Você não tem permissão para atualizar este pedido", code: "FORBIDDEN" } };
        }
        row.updated_at = nowIso();
        const keys = Object.keys(row).filter((key) => key !== "id").map(ident);
        const params = keys.map((key) => row[key]);
        const where = filters.map((f) => { params.push(f.value); return `${ident(f.column)} = ?`; }).join(" AND ");
        db.prepare(`UPDATE pedidos_dotacao SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE ${where}`).run(...params);
        const acao = statusNovo === "aprovado" ? "aprovado" : statusNovo === "nao_aprovado" ? "nao_aprovado" : statusNovo === "sem_saldo" ? "sem_saldo" : statusNovo === "aguardando_suplementacao" ? "aguardando_suplementacao" : statusNovo === "recusado" ? "recusado" : statusNovo === "ajustes" ? "ajustes_solicitados" : statusNovo === "em_analise" || statusNovo === "procurando_dotacao" ? "procurando_dotacao" : statusNovo === "concluido" ? "concluido" : statusNovo === "arquivado" ? "dotacao_utilizada" : "reenviado";
        const mensagem = String(row.resposta_contador || (statusNovo === "concluido" ? "Conclusão registrada pelo solicitante." : statusNovo === "arquivado" ? "Dotação marcada como utilizada." : "Pedido atualizado.")).trim();
        const historicoId = registrarHistoricoDotacao(db, String(pedidoId), acao, atual.status, statusNovo, mensagem, callerU.username);
        const destinatarios = db.prepare(`SELECT DISTINCT u.id
          FROM usuarios u
          LEFT JOIN usuario_modulos um ON um.usuario_id = u.id AND um.modulo_id = 'pedido-dotacao'
          WHERE u.ativo = 1 AND u.id <> ? AND (u.is_admin = 1 OR u.is_contador = 1 OR um.usuario_id IS NOT NULL)`)
          .all(callerU.id)
          .map((u) => u.id);
        if (destinatarios.length) {
          const prioridade = ["nao_aprovado", "recusado", "sem_saldo", "ajustes", "cancelado"].includes(statusNovo) ? "alta" : "normal";
          notificar(
            db, destinatarios, "Atualização do pedido de dotação", `${atual.secretaria}: ${mensagem}`,
            "pedido_dotacao_atualizado", "pedidos_dotacao", String(pedidoId),
            {
              atorId: callerU.id,
              rota: `/pedidos-dotacao?pedido=${encodeURIComponent(String(pedidoId))}`,
              chaveEvento: `pedido-dotacao:${pedidoId}:${historicoId}`,
              prioridade,
            },
          );
        }
        return { data: null, error: null };
      }
      const tarefaAnterior = table === "tarefas"
        ? db.prepare("SELECT * FROM tarefas WHERE id = ?").get(filters.find((f) => f.column === "id")?.value)
        : null;
      const row = serializePayload(table, { ...payload });
      if ("updated_at" in row || table === "modelos" || table === "tarefas" || table === "credores_fixos" || table === "empenhos_mensais" || table === "usuarios") {
        row.updated_at = nowIso();
      }
      delete row.id;
      const keys = Object.keys(row).map(ident);
      if (!keys.length || !filters.length) {
        return { data: null, error: { message: "Update sem dados ou filtro", code: "BAD_REQUEST" } };
      }
      const params = keys.map((k) => row[k]);
      const where = filters
        .map((f) => {
          params.push(f.value);
          return `${ident(f.column)} = ?`;
        })
        .join(" AND ");
      const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE ${where}`;
      db.prepare(sql).run(...params);
      if (table === "tarefas" && tarefaAnterior) {
        const tarefaAtual = db.prepare("SELECT * FROM tarefas WHERE id = ?").get(tarefaAnterior.id);
        removerAnexosRetirados(db, tarefaAnterior, tarefaAtual);
        emitirNotificacaoAtualizacaoTarefa(db, callerU, tarefaAnterior, tarefaAtual);
      }
      return { data: null, error: null };
    }

    if (action === "delete") {
      if (!filters.length) {
        return { data: null, error: { message: "Delete sem filtro", code: "BAD_REQUEST" } };
      }
      const registroComAnexos = ["tarefas", "solicitacoes"].includes(table)
        ? db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(filters.find((f) => f.column === "id")?.value)
        : null;
      const tarefaParaExcluir = table === "tarefas" ? registroComAnexos : null;
      let pedidoParaExcluir = null;
      if (table === "pedidos_dotacao") {
        const idFilter = filters.find((f) => f.column === "id");
        const pedido = idFilter
          ? db.prepare("SELECT * FROM pedidos_dotacao WHERE id = ?").get(idFilter.value)
          : null;
        const podeApagar = callerU?.is_admin || (pedido && String(pedido.solicitante).toLowerCase() === String(callerU?.username || "").toLowerCase());
        if (!podeApagar) {
          return { data: null, error: { message: "Apenas o solicitante ou um administrador pode apagar este pedido", code: "FORBIDDEN" } };
        }
        if (!pedido) {
          return { data: null, error: { message: "Pedido não encontrado", code: "NOT_FOUND" } };
        }
        pedidoParaExcluir = pedido;
        if (!callerU.is_admin && !["enviado", "ajustes"].includes(String(pedido.status))) {
          return { data: null, error: { message: "Pedidos em análise ou concluídos não podem ser apagados", code: "FORBIDDEN" } };
        }
        db.prepare("DELETE FROM pedidos_dotacao_historico WHERE pedido_id = ?").run(idFilter.value);
      }
      const params = [];
      const where = filters
        .map((f) => {
          params.push(f.value);
          return `${ident(f.column)} = ?`;
        })
        .join(" AND ");
      db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...params);
      if (registroComAnexos) removerAnexosDoPedido(db, registroComAnexos);
      if (pedidoParaExcluir) removerAnexosDoPedido(db, pedidoParaExcluir);
      if (tarefaParaExcluir) emitirNotificacaoExclusaoTarefa(db, callerU, tarefaParaExcluir);
      return { data: null, error: null };
    }

    if (action === "upsert") {
      const rows = Array.isArray(payloads) ? payloads : [payload];
      for (const raw of rows) {
        const row = serializePayload(table, { ...raw });
        if (!row.id) row.id = randomUUID();
        if (!row.created_at) row.created_at = nowIso();
        if (!row.updated_at) row.updated_at = nowIso();
        const keys = Object.keys(row).map(ident);
        if (ignoreDuplicates && onConflict) {
          const sql = `INSERT OR IGNORE INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
          db.prepare(sql).run(...keys.map((k) => row[k]));
        } else if (onConflict) {
          const conflictCols = String(onConflict).split(",").map((s) => ident(s.trim()));
          const updateKeys = keys.filter((k) => !conflictCols.includes(k) && k !== "id" && k !== "created_at");
          const sql =
            `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})` +
            (updateKeys.length
              ? ` ON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET ${updateKeys.map((k) => `${k} = excluded.${k}`).join(", ")}`
              : ` ON CONFLICT(${conflictCols.join(", ")}) DO NOTHING`);
          db.prepare(sql).run(...keys.map((k) => row[k]));
        } else {
          const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
          db.prepare(sql).run(...keys.map((k) => row[k]));
        }
      }
      return { data: null, error: null };
    }

    return { data: null, error: { message: `Ação inválida: ${action}`, code: "INVALID_ACTION" } };
  } catch (err) {
    return { data: null, error: uniqueError(err) };
  }
}

// ── Helpers da Gestão de Documentos ────────────────────────────────────────────────
function obterUsuario(db, username) {
  if (!username) return null;
  return db.prepare("SELECT id, username, is_admin, is_contador, ativo FROM usuarios WHERE lower(username) = lower(?)").get(String(username).trim());
}
const TRUSTED_RPC_MODULES = {
  empenhos_stats: "empenhos",
  empenhos_listar: "empenhos",
  empenhos_get: "empenhos",
  rpas_listar: "rpas",
  telegram_rpa_get: "rpas",
  em_dashboard: "extratos",
  em_transacoes_listar: "extratos",
  telegram_credor_mensal_atualizar: "credores-fixos",
  telegram_dossie_fornecedor: "cnpj",
};
function usuarioTemModulo(db, callerU, moduleId) {
  return Boolean(callerU?.is_admin || (callerU && db
    .prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = ?")
    .get(callerU.id, moduleId)));
}
function trustedRpcAccessError(db, fn, args) {
  const moduleId = TRUSTED_RPC_MODULES[fn];
  if (!moduleId) return null;
  const callerU = obterUsuario(db, args._caller);
  if (callerU?.ativo && usuarioTemModulo(db, callerU, moduleId)) return null;
  return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
}
function setoresDoUsuario(db, usuarioId) {
  if (!usuarioId) return new Set();
  return new Set(db.prepare("SELECT setor_id FROM gd_usuario_setor WHERE usuario_id = ?").all(usuarioId).map(r => r.setor_id));
}
function podeAcessar(db, callerU, doc) {
  if (!callerU) return false;
  if (callerU.is_admin) return true;
  if (doc.autor_id === callerU.id) return true;
  const meusSetores = setoresDoUsuario(db, callerU.id);
  const destinos = db.prepare("SELECT setor_id FROM gd_documento_destinatarios WHERE documento_id = ?").all(doc.id).map(r => r.setor_id);
  return destinos.some(s => meusSetores.has(s));
}
function usuariosDosSetores(db, setorIds) {
  const ids = [...new Set((setorIds || []).map(String).filter(Boolean))];
  if (!ids.length) return [];
  return db.prepare(`SELECT DISTINCT us.usuario_id
    FROM gd_usuario_setor us
    JOIN usuarios u ON u.id = us.usuario_id
    WHERE u.ativo = 1 AND us.setor_id IN (${ids.map(() => "?").join(",")})`).all(...ids).map((row) => row.usuario_id);
}
function usuariosRelacionadosDocumento(db, documentoId) {
  const autorId = db.prepare("SELECT autor_id FROM gd_documentos WHERE id = ?").get(documentoId)?.autor_id;
  const autor = db.prepare("SELECT id FROM usuarios WHERE id = ? AND ativo = 1").get(autorId)?.id;
  const setores = db.prepare("SELECT setor_id FROM gd_documento_destinatarios WHERE documento_id = ?").all(documentoId).map((row) => row.setor_id);
  return [...new Set([autor, ...usuariosDosSetores(db, setores)].filter(Boolean))];
}
function auditar(db, usuarioId, acao, entidade, entidadeId, detalhes, ip, requestId) {
  const payload = detalhes && typeof detalhes === "object" && !Array.isArray(detalhes) ? { ...detalhes } : detalhes == null ? {} : { valor: detalhes };
  if (!payload.origem) payload.origem = "web";
  if (requestId) payload.request_id = String(requestId).slice(0, 80);
  const serialized = JSON.stringify(sanitize(payload));
  db.prepare("INSERT INTO gd_logs_auditoria (id, usuario_id, acao, entidade, entidade_id, detalhes, ip) VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), usuarioId || null, acao, entidade, entidadeId || null, serialized, String(ip || "").slice(0, 80) || null);
}
function notificar(db, usuarioIds, titulo, mensagem, tipo, refTipo, refId, options = {}) {
  const ids = [...new Set((usuarioIds || []).filter(Boolean))];
  const prioridade = ["baixa", "normal", "alta", "urgente"].includes(options.prioridade) ? options.prioridade : "normal";
  const ins = db.prepare(`INSERT OR IGNORE INTO gd_notificacoes
    (id, usuario_id, titulo, mensagem, tipo, ref_tipo, ref_id, ator_id, rota, prioridade, chave_evento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const uid of ids) {
    ins.run(
      randomUUID(), uid, titulo, mensagem || null, tipo || "documento", refTipo || null, refId || null,
      options.atorId || null, options.rota || null, prioridade,
      options.chaveEvento ? `${String(options.chaveEvento)}:${uid}` : null,
    );
  }
  return ids.length;
}
function destinatariosDaTarefa(db, responsavel, atorId) {
  const nome = String(responsavel || "").trim();
  const rows = nome.toUpperCase() === "TODOS"
    ? db.prepare("SELECT id FROM usuarios WHERE ativo = 1").all()
    : db.prepare("SELECT id FROM usuarios WHERE ativo = 1 AND lower(username) = lower(?)").all(nome);
  return rows.map((row) => row.id).filter((id) => id !== atorId);
}
function emitirNotificacaoTarefa(db, callerU, tarefa) {
  const responsavel = String(tarefa?.responsavel || "").trim();
  if (!responsavel) return 0;
  const destinatarios = destinatariosDaTarefa(db, responsavel, callerU?.id);
  if (!destinatarios.length) return 0;
  const mensagem = responsavel.toUpperCase() === "TODOS"
    ? `Nova tarefa criada para todos: ${tarefa.titulo}`
    : `Nova tarefa atribuída a você: ${tarefa.titulo}`;
  return notificar(
    db, destinatarios, "Nova tarefa", mensagem, "tarefa", "tarefas", tarefa.id,
    {
      atorId: callerU?.id,
      rota: `/tarefas?tarefa=${encodeURIComponent(tarefa.id)}`,
      chaveEvento: `tarefa:${tarefa.id}:criada`,
      prioridade: tarefa.prioridade === "alta" ? "alta" : "normal",
    },
  );
}

function destinatariosDaAtualizacaoTarefa(db, callerU, anterior, atual) {
  const nomes = [anterior?.responsavel, atual?.responsavel]
    .map((valor) => String(valor || "").trim())
    .filter(Boolean);
  return [...new Set(nomes.flatMap((nome) => destinatariosDaTarefa(db, nome, callerU?.id)))];
}

function emitirNotificacaoAtualizacaoTarefa(db, callerU, anterior, atual) {
  if (!atual) return 0;
  const destinatarios = destinatariosDaAtualizacaoTarefa(db, callerU, anterior, atual);
  if (!destinatarios.length) return 0;
  const mudouStatus = anterior.status !== atual.status;
  const mensagem = mudouStatus
    ? `A tarefa "${atual.titulo}" mudou para ${atual.status}.`
    : `A tarefa "${atual.titulo}" foi atualizada.`;
  return notificar(
    db, destinatarios, "Tarefa atualizada", mensagem, "tarefa_atualizada", "tarefas", atual.id,
    {
      atorId: callerU?.id,
      rota: `/tarefas?tarefa=${encodeURIComponent(atual.id)}`,
      chaveEvento: `tarefa:${atual.id}:atualizada:${atual.updated_at || nowIso()}`,
      prioridade: atual.prioridade === "alta" || mudouStatus ? "alta" : "normal",
    },
  );
}

function emitirNotificacaoExclusaoTarefa(db, callerU, tarefa) {
  const destinatarios = destinatariosDaTarefa(db, tarefa.responsavel, callerU?.id);
  if (!destinatarios.length) return 0;
  return notificar(
    db, destinatarios, "Tarefa removida", `A tarefa "${tarefa.titulo}" foi removida.`, "tarefa_removida", "tarefas", tarefa.id,
    {
      atorId: callerU?.id,
      rota: "/tarefas",
      chaveEvento: `tarefa:${tarefa.id}:removida`,
      prioridade: "alta",
    },
  );
}

export async function runRpc(db, fn, args = {}, trustedCaller = null) {
  try {
    if (trustedCaller !== null) {
      args = { ...args, _caller: trustedCaller, _username: trustedCaller };
    }
    const trustedAccess = trustedCaller !== null ? trustedRpcAccessError(db, fn, args) : null;
    if (trustedAccess) return trustedAccess;
    if (fn === "usuario_status") {
      // Não revela se o usuário existe — resposta genérica sempre
      const username = String(args._username || "").trim();
      const row = db
        .prepare("SELECT username, senha_hash, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(username);
      const existe = Boolean(row && row.ativo);
      const tem_senha = Boolean(row?.senha_hash);
      return { data: [{ existe: true, tem_senha: tem_senha || !existe }], error: null };
    }

    if (fn === "usuario_login") {
      const username = String(args._username || "").trim();
      const senha = String(args._senha || "");
      const clientIp = String(args._ip || "desconhecido");

      const rateCheck = verificarRateLimit(username, clientIp);
      if (rateCheck.bloqueado) {
        return { data: { ok: false, bloqueado: true, bloqueadoPor: rateCheck.bloqueadoPor, tentativasRestantes: 0, precisa_criar: false }, error: null };
      }

      const row = db
        .prepare("SELECT id, senha_hash, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(username);

      if (!row || !row.ativo) {
        // Não revela se o user existe — registra tentativa para evitar enumeração via timing
        registrarTentativaFalha(username, clientIp);
        const rc = verificarRateLimit(username, clientIp);
        return { data: { ok: false, bloqueado: rc.bloqueado, bloqueadoPor: rc.bloqueadoPor || 0, tentativasRestantes: rc.tentativasRestantes, precisa_criar: false }, error: null };
      }

      // Primeiro acesso — sem senha cadastrada
      if (row && row.ativo && !row.senha_hash) {
        limparRateLimit(username, clientIp);
        return { data: { ok: false, bloqueado: false, bloqueadoPor: 0, tentativasRestantes: BLOQUEIO_APOS, precisa_criar: true }, error: null };
      }

      const ok = Boolean(row?.senha_hash && verifyPassword(senha, row.senha_hash));
      if (!ok) {
        registrarTentativaFalha(username, clientIp);
        const rc = verificarRateLimit(username, clientIp);
        return { data: { ok: false, bloqueado: rc.bloqueado, bloqueadoPor: rc.bloqueadoPor || 0, tentativasRestantes: rc.tentativasRestantes, precisa_criar: false }, error: null };
      }

      limparRateLimit(username, clientIp);
      // Retorna dados do usuário para o frontend validar sessão
      return { data: { ok: true, usuario_id: row.id, precisa_criar: false, bloqueado: false, bloqueadoPor: 0, tentativasRestantes: BLOQUEIO_APOS }, error: null };
    }

    if (fn === "usuario_set_senha") {
      const username = String(args._username || "").trim();
      const senha = String(args._senha || "");

      const erros = validarSenha(senha);
      if (erros.length) {
        return { data: null, error: { message: "Senha fraca: " + erros.join(", "), code: "WEAK_PASSWORD" } };
      }

      const row = db
        .prepare("SELECT id, senha_hash FROM usuarios WHERE lower(username) = lower(?)")
        .get(username);
      if (!row) return { data: false, error: null };
      if (row.senha_hash) return { data: false, error: null };
      db.prepare(
        "UPDATE usuarios SET senha_hash = ?, updated_at = ? WHERE id = ?",
      ).run(hashPassword(senha), nowIso(), row.id);
      return { data: true, error: null };
    }

    if (fn === "usuario_alterar_senha") {
      const caller = String(args._caller || "").trim();
      const senhaAtual = String(args._senha_atual || "");
      const novaSenha = String(args._nova_senha || "");

      if (!caller) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }

      const erros = validarSenha(novaSenha);
      if (erros.length) {
        return { data: null, error: { message: "Senha fraca: " + erros.join(", "), code: "WEAK_PASSWORD" } };
      }
      if (senhaAtual === novaSenha) {
        return { data: null, error: { message: "A nova senha deve ser diferente da senha atual.", code: "PASSWORD_UNCHANGED" } };
      }

      const row = db
        .prepare("SELECT id, senha_hash, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!row?.ativo || !row.senha_hash || !verifyPassword(senhaAtual, row.senha_hash)) {
        return { data: null, error: { message: "Senha atual inválida.", code: "INVALID_CURRENT_PASSWORD" } };
      }

      db.prepare("UPDATE usuarios SET senha_hash = ?, updated_at = ? WHERE id = ?")
        .run(hashPassword(novaSenha), nowIso(), row.id);
      limparRateLimit(caller, args._ip);
      return { data: { ok: true }, error: null };
    }

    if (fn === "usuario_solicitar_recuperacao") {
      const username = String(args._username || "").trim();
      const row = db
        .prepare("SELECT id FROM usuarios WHERE lower(username) = lower(?) AND ativo = 1")
        .get(username);
      if (!row) {
        return { data: { enviado: true }, error: null };
      }
      db.prepare("UPDATE recuperacao_senha SET usado = 1 WHERE usuario_id = ?").run(row.id);
      const codigo = String(randomBytes(4).readUInt32BE()).slice(0, 6).padStart(6, "0");
      const expira = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      db.prepare("INSERT INTO recuperacao_senha (id, usuario_id, codigo, expira_em) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), row.id, codigo, expira);
      // Retorna o código para exibição (ambiente interno — em produção enviar por e-mail)
      return { data: { enviado: true, codigo }, error: null };
    }

    if (fn === "usuario_validar_codigo_recuperacao") {
      const username = String(args._username || "").trim();
      const codigo = String(args._codigo || "").trim();
      const u = db.prepare("SELECT id FROM usuarios WHERE lower(username) = lower(?) AND ativo = 1").get(username);
      if (!u) return { data: { valido: false }, error: null };
      const token = db.prepare(
        "SELECT id FROM recuperacao_senha WHERE usuario_id = ? AND codigo = ? AND usado = 0 AND expira_em > datetime('now')"
      ).get(u.id, codigo);
      return { data: { valido: Boolean(token) }, error: null };
    }

    if (fn === "usuario_resetar_senha") {
      const username = String(args._username || "").trim();
      const codigo = String(args._codigo || "").trim();
      const senha = String(args._senha || "");

      const erros = validarSenha(senha);
      if (erros.length) {
        return { data: null, error: { message: "Senha fraca: " + erros.join(", "), code: "WEAK_PASSWORD" } };
      }

      const u = db.prepare("SELECT id FROM usuarios WHERE lower(username) = lower(?) AND ativo = 1").get(username);
      if (!u) return { data: null, error: { message: "Código inválido ou expirado", code: "INVALID_CODE" } };
      const token = db.prepare(
        "SELECT id FROM recuperacao_senha WHERE usuario_id = ? AND codigo = ? AND usado = 0 AND expira_em > datetime('now')"
      ).get(u.id, codigo);
      if (!token) return { data: null, error: { message: "Código inválido ou expirado", code: "INVALID_CODE" } };
      db.prepare("UPDATE recuperacao_senha SET usado = 1 WHERE id = ?").run(token.id);
      db.prepare("UPDATE usuarios SET senha_hash = ?, updated_at = ? WHERE id = ?")
        .run(hashPassword(senha), nowIso(), u.id);
      limparRateLimit(username, args._ip);
      return { data: { ok: true }, error: null };
    }

    if (fn === "usuario_validar_sessao") {
      const username = String(args._username || "").trim();
      const row = db
        .prepare("SELECT ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(username);
      // Retorna ok=true se usuário existe e está ativo, ok=false se inativo ou inexistente
      return { data: { valido: Boolean(row?.ativo), username: row?.ativo ? String(args._username || "") : null }, error: null };
    }

    if (fn === "usuario_modulos_disponiveis") {
      const username = String(args._username || "").trim();
      const u = db
        .prepare("SELECT id, is_admin, is_contador, ativo, mostrar_bloqueados FROM usuarios WHERE lower(username) = lower(?)")
        .get(username);
      if (!u || !u.ativo) return { data: [], error: null };
      const mods = db
        .prepare("SELECT modulo_id FROM usuario_modulos WHERE usuario_id = ?")
        .all(u.id);
      const flags = {
        is_admin: Boolean(u.is_admin),
        is_contador: Boolean(u.is_contador),
        mostrar_bloqueados: Boolean(u.mostrar_bloqueados),
        modulos_manutencao: (() => {
          const value = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'modulos_manutencao'").get()?.valor;
          try {
            const parsed = JSON.parse(value || "[]");
            return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
          } catch {
            return [];
          }
        })(),
      };
      if (!mods.length) {
        return { data: [{ modulo_id: null, ...flags }], error: null };
      }
      const rows = mods.map((m) => ({
        modulo_id: m.modulo_id,
        ...flags,
      }));
      return { data: rows, error: null };
    }

    if (fn === "usuario_modulos_ordem_obter" || fn === "usuario_modulos_ordem_salvar") {
      const caller = String(args._caller || "").trim();
      const u = obterUsuario(db, caller);
      if (!u?.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      if (fn === "usuario_modulos_ordem_obter") {
        const ordem = db.prepare("SELECT modulo_id FROM usuario_modulos_ordem WHERE usuario_id = ? ORDER BY ordem, updated_at").all(u.id).map((row) => row.modulo_id);
        return { data: ordem, error: null };
      }
      const ordem = Array.isArray(args._ordem) ? args._ordem.map((id) => String(id || "").trim()).filter(Boolean) : [];
      if (ordem.length > 100 || new Set(ordem).size !== ordem.length) {
        return { data: null, error: { message: "Ordem de módulos inválida", code: "BAD_REQUEST" } };
      }
      db.prepare("DELETE FROM usuario_modulos_ordem WHERE usuario_id = ?").run(u.id);
      const insert = db.prepare("INSERT INTO usuario_modulos_ordem (id, usuario_id, modulo_id, ordem, updated_at) VALUES (?, ?, ?, ?, ?)");
      ordem.forEach((moduloId, index) => insert.run(randomUUID(), u.id, moduloId, index, nowIso()));
      return { data: ordem, error: null };
    }

    if (fn === "usuario_modulos_favoritos_obter" || fn === "usuario_modulos_favoritos_salvar") {
      const caller = String(args._caller || "").trim();
      const u = obterUsuario(db, caller);
      if (!u?.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      if (fn === "usuario_modulos_favoritos_obter") {
        const favoritos = db
          .prepare("SELECT modulo_id FROM usuario_modulos_favoritos WHERE usuario_id = ? ORDER BY ordem, updated_at")
          .all(u.id)
          .map((row) => row.modulo_id);
        return { data: favoritos, error: null };
      }
      const favoritos = Array.isArray(args._favoritos)
        ? args._favoritos.map((id) => String(id || "").trim()).filter(Boolean).filter((id, index, ids) => ids.indexOf(id) === index).slice(0, 5)
        : [];
      db.prepare("DELETE FROM usuario_modulos_favoritos WHERE usuario_id = ?").run(u.id);
      const insert = db.prepare("INSERT INTO usuario_modulos_favoritos (id, usuario_id, modulo_id, ordem, updated_at) VALUES (?, ?, ?, ?, ?)");
      favoritos.forEach((moduloId, index) => insert.run(randomUUID(), u.id, moduloId, index, nowIso()));
      return { data: favoritos, error: null };
    }

    if (fn === "admin_listar_usuarios") {
      const caller = String(args._caller || "").trim();
      const adm = db
        .prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const users = db.prepare("SELECT id, username, is_admin, ativo, mostrar_bloqueados, created_at FROM usuarios ORDER BY created_at").all();
      const result = users.map(u => {
        const mods = db
          .prepare("SELECT modulo_id FROM usuario_modulos WHERE usuario_id = ?")
          .all(u.id)
          .map(m => m.modulo_id);
        return {
          id: u.id,
          username: u.username,
          is_admin: Boolean(u.is_admin),
          ativo: Boolean(u.ativo),
          mostrar_bloqueados: Boolean(u.mostrar_bloqueados),
          modulos: mods,
          created_at: u.created_at,
        };
      });
      return { data: result, error: null };
    }

    if (fn === "admin_criar_usuario") {
      const caller = String(args._caller || "").trim();
      const adm = db
        .prepare("SELECT is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const username = String(args._username || "").trim().toLowerCase();
      if (!username) return { data: null, error: { message: "Username inválido", code: "BAD_REQUEST" } };
      const existing = db.prepare("SELECT id FROM usuarios WHERE lower(username) = lower(?)").get(username);
      if (existing) return { data: null, error: { message: "Usuário já existe", code: "23505" } };
      const newId = randomUUID();
      db.prepare(
        "INSERT INTO usuarios (id, username, is_admin, mostrar_bloqueados) VALUES (?, ?, ?, ?)"
      ).run(newId, username, args._is_admin ? 1 : 0, args._mostrar_bloqueados ? 1 : 0);
      const modulos = Array.isArray(args._modulos) ? args._modulos : [];
      const insertMod = db.prepare(
        "INSERT OR IGNORE INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)"
      );
      for (const m of modulos) insertMod.run(randomUUID(), newId, m);
      return { data: newId, error: null };
    }

    if (fn === "admin_atualizar_usuario") {
      const caller = String(args._caller || "").trim();
      const adm = db
        .prepare("SELECT is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const id = String(args._id || "");
      db.prepare(
        "UPDATE usuarios SET is_admin = ?, ativo = ?, mostrar_bloqueados = ?, updated_at = ? WHERE id = ?"
      ).run(
        args._is_admin ? 1 : 0,
        args._ativo ? 1 : 0,
        args._mostrar_bloqueados ? 1 : 0,
        nowIso(),
        id
      );
      db.prepare("DELETE FROM usuario_modulos WHERE usuario_id = ?").run(id);
      const modulos = Array.isArray(args._modulos) ? args._modulos : [];
      const insertMod = db.prepare(
        "INSERT OR IGNORE INTO usuario_modulos (id, usuario_id, modulo_id) VALUES (?, ?, ?)"
      );
      for (const m of modulos) insertMod.run(randomUUID(), id, m);
      return { data: true, error: null };
    }

    if (fn === "admin_reset_senha") {
      const caller = String(args._caller || "").trim();
      const adm = db
        .prepare("SELECT is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      db.prepare("UPDATE usuarios SET senha_hash = NULL, updated_at = ? WHERE id = ?")
        .run(nowIso(), String(args._id || ""));
      return { data: true, error: null };
    }

    // ── EMPENHOS ORÇAMENTÁRIOS ──────────────────────────────────────────────────

    // Helper: valida que o caller _username é admin ativo. Retorna row do user ou null.
    function verificarAdminEmpenhos() {
      const caller = String(args._caller || args._username || "").trim();
      if (!caller) return null;
      const adm = db
        .prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) return null;
      return adm;
    }

    // Parser de números no formato brasileiro ("1.234,56" → 1234.56).
    // Rejeita negativos e notação científica: valores de empenho são sempre >= 0.
    // Retorna 0 para entradas inválidas/vazias (compat com schema DEFAULT 0).
    function parseBR(v) {
      if (v == null || v === "" || v === "0,00") return 0;
      const raw = String(v).trim();
      // Rejeita negativo e notação científica (e/E): não ocorrem em empenhos
      if (/^-/.test(raw) || /[eE]/.test(raw)) return 0;
      const s = raw.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }

    // Lista ordenada de colunas importáveis — usada tanto no INSERT multi-row (staging)
    // quanto no INSERT OR REPLACE (modo append). Mantém 43 colunas + id.
    const EMP_COLS = [
      "id", "id_entidade", "nome_entidade", "id_empenho", "numero_empenho", "ano_empenho",
      "tipo_empenho", "num_processo", "ano_processo", "contrato", "sf", "modalidade",
      "licitacao", "especificacao", "data",
      "valor_empenhado_bruto", "valor_empenhado_anulado",
      "valor_liquidado_bruto", "valor_liquidado_anulado",
      "valor_baixado_bruto", "valor_baixado_anulado",
      "valor_retido_bruto", "valor_retido_anulado",
      "valor_pago_restos_proc", "valor_pago_restos_nao_proc",
      "valor_pago_anulado_proc", "valor_pago_anulado_nao_proc",
      "id_credor", "nome_credor", "num_conta_credor", "dig_conta_credor",
      "num_despesa", "num_programa", "num_acao", "num_funcao", "num_subfuncao",
      "num_natureza_emp", "num_recurso", "num_natureza_desp",
      "saldo_baixado", "saldo_anulado", "saldo_liquidar", "saldo_pagar",
    ];

    // Monta um array de valores na ordem de EMP_COLS a partir de uma linha CSV parseada.
    function linhaParaValores(r) {
      const id = `${r.idEntidade || ""}_${r.idEmpenho || ""}_${r.numeroEmpenho || ""}`;
      return [
        id, String(r.idEntidade||""), String(r.nomeEntidade||""),
        String(r.idEmpenho||""), String(r.numeroEmpenho||""), parseInt(r.anoEmpenho)||0,
        String(r.tipoEmpenho||""), String(r.numProcesso||""), String(r.anoProcesso||""),
        String(r.contrato||""), String(r.sf||""), String(r.modalidade||""),
        String(r.licitacao||""), String(r.especificacao||""), String(r.data||""),
        parseBR(r.valorEmpenhadoBruto), parseBR(r.valorEmpenhadoAnulado),
        parseBR(r.valorLiquidadoBruto), parseBR(r.valorLiquidadoAnulado),
        parseBR(r.valorBaixadoBruto), parseBR(r.valorBaixadoAnulado),
        parseBR(r.valorRetidoBruto), parseBR(r.valorRetidoAnulado),
        parseBR(r.valorPagoRestosPagarProcessados), parseBR(r.valorPagoRestosPagarNaoProcessados),
        parseBR(r.valorPagoAnuladoRestosPagarProcessados), parseBR(r.valorPagoAnuladoRestosPagarNaoProcessados),
        String(r.idCredor||""), String(r.nomeCredor||""),
        String(r.numContaCredor||""), String(r.digContaCredor||""),
        String(r.numDespesa||""), String(r.numPrograma||""), String(r.numAcao||""),
        String(r.numFuncao||""), String(r.numSubfuncao||""),
        String(r.numNaturezaEmp||""), String(r.numRecurso||""), String(r.numNaturezaDesp||""),
        parseBR(r.saldoBaixado), parseBR(r.saldoAnulado),
        parseBR(r.saldoLiquidar), parseBR(r.saldoPagar),
      ];
    }

    // Importação atômica de empenhos orçamentários.
    //
    // Modos:
    //  - _modo === "substituir" (default): importa todas as linhas para uma tabela
    //    staging `_novo`; só substitui a tabela real ao final (DROP + RENAME).
    //    Falha em qualquer chunk → tabela original permanece intacta. Requer admin.
    //  - _modo === "append": usa INSERT OR REPLACE na tabela real (upsert por id
    //    composto). Requer admin.
    //
    // _dados: array de linhas (chunk de até ~500 linhas por chamada).
    // _continuar: true indica que mais chunks virão (apenas modo "substituir").
    // _finalizar: true indica que é o último chunk e a troca deve ser efetivada.
    //
    // Autorização: exige caller admin ativo (mesmo padrão dos admin_*).
    if (fn === "empenhos_importar") {
      if (!verificarAdminEmpenhos()) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }

      const rows = Array.isArray(args._dados) ? args._dados : [];
      const modo = String(args._modo || "substituir") === "append" ? "append" : "substituir";
      const continuar = Boolean(args._continuar);
      const finalizar = Boolean(args._finalizar);

      if (!rows.length && !finalizar) {
        return { data: { inseridos: 0 }, error: null };
      }

      const placeholders = EMP_COLS.map(() => "?").join(",");
      const colsSql = EMP_COLS.join(",");

      if (modo === "append") {
        // Upsert direto na tabela real, idempotente por id composto.
        const sql = `INSERT OR REPLACE INTO empenhos_orcamentarios (${colsSql}) VALUES (${placeholders})`;
        const stmt = db.prepare(sql);
        db.exec("BEGIN TRANSACTION");
        let inseridos = 0;
        try {
          for (const r of rows) {
            stmt.run(...linhaParaValores(r));
            inseridos++;
          }
          db.exec("COMMIT");
        } catch (err) {
          db.exec("ROLLBACK");
          throw err;
        }
        return { data: { inseridos }, error: null };
      }

      // Modo "substituir": usa staging `empenhos_orcamentarios_novo`.
      // Cria (ou recria) a staging no início de uma sequência de chunks.
      if (!continuar && !finalizar) {
        // Primeiro (e único) chunk: cria staging, insere, e finaliza já.
        db.exec("DROP TABLE IF EXISTS empenhos_orcamentarios_novo");
        db.exec(`CREATE TABLE empenhos_orcamentarios_novo AS SELECT * FROM empenhos_orcamentarios WHERE 0`);
      } else if (!continuar && finalizar) {
        // Cenário: chamada de "finalizar" sem chunks anteriores — apenas troca.
        // Garante staging existe (vazia) para swap seguro.
        if (!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='empenhos_orcamentarios_novo'").get()) {
          db.exec(`CREATE TABLE empenhos_orcamentarios_novo AS SELECT * FROM empenhos_orcamentarios WHERE 0`);
        }
      }

      const stagingInsert = `INSERT INTO empenhos_orcamentarios_novo (${colsSql}) VALUES (${placeholders})`;

      db.exec("BEGIN TRANSACTION");
      let inseridos = 0;
      try {
        if (rows.length) {
          // Multi-row INSERT em sub-batches de 100 linhas para manter o número
          // de parâmetros bind (< 4400) bem abaixo do limite do SQLite (32766).
          const SUB = 100;
          for (let s = 0; s < rows.length; s += SUB) {
            const batch = rows.slice(s, s + SUB);
            const valuesBlock = batch.map(() => `(${placeholders})`).join(",");
            const allParams = [];
            for (const r of batch) allParams.push(...linhaParaValores(r));
            db.prepare(`INSERT INTO empenhos_orcamentarios_novo (${colsSql}) VALUES ${valuesBlock}`).run(...allParams);
            inseridos += batch.length;
          }
        }

        // Se for o último chunk (ou o único), efetiva a troca atômica.
        if (finalizar) {
          // Sanity: staging deve existir (criada acima se necessário).
          // DROP tabela antiga e RENAME da staging p/ nome real.
          // A staging criada via `CREATE TABLE AS SELECT ... WHERE 0` não tem
          // índices; após o RENAME para `empenhos_orcamentarios`, recriamos os
          // índices via criarIndicesEmpenhos (idempotente).
          db.exec("DROP TABLE empenhos_orcamentarios");
          db.exec("ALTER TABLE empenhos_orcamentarios_novo RENAME TO empenhos_orcamentarios");
          // Recria índices definidos no migrate() — idempotente (CREATE INDEX IF NOT EXISTS).
          criarIndicesEmpenhos(db);
          // Recria trigger de updated_at (perdido no DROP).
          db.exec(`
            CREATE TRIGGER IF NOT EXISTS emp_upd_at AFTER UPDATE ON empenhos_orcamentarios
            BEGIN
              UPDATE empenhos_orcamentarios SET updated_at = datetime('now') WHERE id = NEW.id;
            END;
          `);
          invalidarCacheEmpenhosFiltros();
        }

        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        // Em caso de falha no finalizar, descarta staging para próxima tentativa limpa.
        if (finalizar) {
          try { db.exec("DROP TABLE IF EXISTS empenhos_orcamentarios_novo"); } catch { /* ignore */ }
        }
        throw err;
      }

      if (finalizar || modo === "append") invalidarCacheEmpenhosFiltros();
      return { data: { inseridos, finalizado: finalizar }, error: null };
    }

    // Limpa a tabela de empenhos orçamentários. Requer admin.
    // Mantido para compatibilidade/diagnóstico, mas a UI usa empenhos_importar modo "substituir".
    if (fn === "empenhos_limpar") {
      if (!verificarAdminEmpenhos()) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      db.prepare("DELETE FROM empenhos_orcamentarios").run();
      return { data: { ok: true }, error: null };
    }

    // ── GUARDA DE AUTENTICAÇÃO ─────────────────────────────────────────────
    // RPCs com verificação própria são ignoradas por este guarda
    if (
      !fn.startsWith("usuario_") &&
      !fn.startsWith("gd_") &&
      !fn.startsWith("config_") &&
      !fn.startsWith("backup_") &&
      !fn.startsWith("em_") &&
      !fn.startsWith("admin_") &&
      !fn.startsWith("telegram_") &&
      fn !== "empenhos_importar" &&
      fn !== "empenhos_limpar" &&
      fn !== "cnpj_buscar"
    ) {
      const _callerU = obterUsuario(db, args._caller);
      if (!_callerU) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
    }

    if (fn === "empenhos_stats") {
      const totais = db.prepare(`
        SELECT COUNT(*) as total_registros,
          SUM(valor_empenhado_bruto) as total_empenhado,
          SUM(valor_liquidado_bruto) as total_liquidado,
          SUM(valor_baixado_bruto) as total_pago,
          SUM(saldo_pagar) as total_saldo_pagar
        FROM empenhos_orcamentarios
      `).get();
      const porModalidade = db.prepare(`
        SELECT modalidade, COUNT(*) as qtd, SUM(valor_empenhado_bruto) as total
        FROM empenhos_orcamentarios WHERE modalidade != ''
        GROUP BY modalidade ORDER BY total DESC LIMIT 10
      `).all();
      const porNatureza = db.prepare(`
        SELECT num_natureza_desp as natureza, COUNT(*) as qtd, SUM(valor_empenhado_bruto) as total
        FROM empenhos_orcamentarios WHERE num_natureza_desp != ''
        GROUP BY num_natureza_desp ORDER BY total DESC LIMIT 10
      `).all();
      const topCredores = db.prepare(`
        SELECT nome_credor, COUNT(*) as qtd, SUM(valor_empenhado_bruto) as total
        FROM empenhos_orcamentarios WHERE nome_credor != ''
        GROUP BY nome_credor ORDER BY total DESC LIMIT 10
      `).all();
      const porAno = db.prepare(`
        SELECT ano_empenho, COUNT(*) as qtd, SUM(valor_empenhado_bruto) as total
        FROM empenhos_orcamentarios GROUP BY ano_empenho ORDER BY ano_empenho
      `).all();
      return { data: { totais, porModalidade, porNatureza, topCredores, porAno }, error: null };
    }

    if (fn === "empenhos_listar") {
      const pagina = parseInt(args._pagina) || 1;
      const porPagina = Math.min(parseInt(args._por_pagina) || 50, 200);
      const offset = (pagina - 1) * porPagina;
      const busca = String(args._busca || "").trim();
      const modalidade = String(args._modalidade || "").trim();
      const natureza = String(args._natureza || "").trim();
      const ano = args._ano ? parseInt(args._ano) : null;
      const tipoEmpenho = String(args._tipo_empenho || "").trim();
      const recurso = String(args._recurso || "").trim();
      const programa = String(args._programa || "").trim();
      const acao = String(args._acao || "").trim();
      const despesa = String(args._despesa || "").trim();
      const valorMin = args._valor_min != null && args._valor_min !== "" ? parseFloat(args._valor_min) : null;
      const valorMax = args._valor_max != null && args._valor_max !== "" ? parseFloat(args._valor_max) : null;
      const status = String(args._status || "todos").trim();
      const ordenacao = String(args._ordenacao || "recentes").trim();

      const params = [];
      const wheres = [];
      if (busca) {
        wheres.push("(lower(nome_credor) LIKE lower(?) OR lower(especificacao) LIKE lower(?))");
        params.push(`%${busca}%`, `%${busca}%`);
      }
      if (modalidade)  { wheres.push("modalidade = ?"); params.push(modalidade); }
      if (natureza)    { wheres.push("num_natureza_desp = ?"); params.push(natureza); }
      if (ano)         { wheres.push("ano_empenho = ?"); params.push(ano); }
      if (tipoEmpenho) { wheres.push("tipo_empenho = ?"); params.push(tipoEmpenho); }
      if (recurso)     { wheres.push("num_recurso = ?"); params.push(recurso); }
      if (programa)    { wheres.push("num_programa = ?"); params.push(programa); }
      if (acao)        { wheres.push("num_acao = ?"); params.push(acao); }
      if (despesa)     { wheres.push("num_despesa = ?"); params.push(despesa); }

      if (valorMin !== null && !isNaN(valorMin)) {
        wheres.push("valor_empenhado_bruto >= ?");
        params.push(valorMin);
      }
      if (valorMax !== null && !isNaN(valorMax)) {
        wheres.push("valor_empenhado_bruto <= ?");
        params.push(valorMax);
      }

      if (status === "pendente") {
        wheres.push("saldo_pagar > 0");
      } else if (status === "pago") {
        wheres.push("saldo_pagar <= 0");
      }

      const where = wheres.length ? "WHERE " + wheres.join(" AND ") : "";

      let orderBy = "ano_empenho DESC, CAST(numero_empenho AS INTEGER) ASC";
      if (ordenacao === "maior_valor") {
        orderBy = "valor_empenhado_bruto DESC";
      } else if (ordenacao === "menor_valor") {
        orderBy = "valor_empenhado_bruto ASC";
      } else if (ordenacao === "recentes") {
        orderBy = "ano_empenho DESC, data DESC";
      }

      const total = db.prepare(`SELECT COUNT(*) as c FROM empenhos_orcamentarios ${where}`).get(...params).c;
      const rows  = db.prepare(`
        SELECT id, numero_empenho, ano_empenho, data, nome_credor, modalidade,
               especificacao, num_natureza_desp, num_acao, num_recurso,
               valor_empenhado_bruto, valor_liquidado_bruto, valor_baixado_bruto, saldo_pagar
        FROM empenhos_orcamentarios ${where}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `).all(...params, porPagina, offset);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }

    if (fn === "empenhos_get") {
      const id = String(args._id || "");
      const row = db.prepare("SELECT * FROM empenhos_orcamentarios WHERE id = ?").get(id);
      if (!row) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      return { data: row, error: null };
    }

    if (fn === "empenhos_filtros_disponiveis") {
      return empenhosFiltrosDisponiveis(db);
    }

    if (fn === "gd_arquivos_listar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const pastaId = String(args._pasta_id || "").trim() || null;
      if (pastaId && !db.prepare("SELECT id FROM gd_pastas WHERE id = ?").get(pastaId)) return { data: null, error: { message: "Pasta não encontrada", code: "NOT_FOUND" } };
      const pastas = pastaId
        ? db.prepare("SELECT p.*, u.username AS criado_por FROM gd_pastas p JOIN usuarios u ON u.id = p.usuario_id WHERE p.parent_id = ? ORDER BY p.nome").all(pastaId)
        : db.prepare("SELECT p.*, u.username AS criado_por FROM gd_pastas p JOIN usuarios u ON u.id = p.usuario_id WHERE p.parent_id IS NULL ORDER BY p.nome").all();
      const arquivos = pastaId
        ? db.prepare("SELECT a.*, u.username AS criado_por FROM gd_arquivos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.pasta_id = ? ORDER BY a.criado_em DESC").all(pastaId)
        : db.prepare("SELECT a.*, u.username AS criado_por FROM gd_arquivos a JOIN usuarios u ON u.id = a.usuario_id WHERE a.pasta_id IS NULL ORDER BY a.criado_em DESC").all();
      const estatisticasGerais = db.prepare("SELECT COALESCE(SUM(tamanho), 0) AS total_bytes, COUNT(*) AS total_arquivos FROM gd_arquivos").get();
      const estatisticasPastas = db.prepare("SELECT COUNT(*) AS total_pastas FROM gd_pastas").get();
      return {
        data: {
          pastas,
          arquivos,
          totalBytes: Number(estatisticasGerais?.total_bytes || 0),
          totalArquivos: Number(estatisticasGerais?.total_arquivos || 0),
          totalPastas: Number(estatisticasPastas?.total_pastas || 0),
        },
        error: null,
      };
    }
    if (fn === "gd_pasta_criar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const nome = String(args._nome || "").trim();
      const parentId = String(args._parent_id || "").trim() || null;
      if (!nome || nome.length > 120 || nome.includes("/") || nome.includes("\\")) return { data: null, error: { message: "Nome de pasta inválido", code: "BAD_REQUEST" } };
      if (parentId && !db.prepare("SELECT id FROM gd_pastas WHERE id = ?").get(parentId)) return { data: null, error: { message: "Pasta pai não encontrada", code: "NOT_FOUND" } };
      const id = randomUUID();
      try { db.prepare("INSERT INTO gd_pastas (id, nome, parent_id, usuario_id) VALUES (?, ?, ?, ?)").run(id, nome, parentId, callerU.id); }
      catch (e) { return { data: null, error: uniqueError(e) }; }
      auditar(db, callerU.id, "pasta_criar", "gd_pastas", id, { nome, parent_id: parentId }, args._ip, args._request_id);
      return { data: db.prepare("SELECT * FROM gd_pastas WHERE id = ?").get(id), error: null };
    }
    if (fn === "gd_pasta_excluir") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "").trim();
      const pasta = db.prepare("SELECT * FROM gd_pastas WHERE id = ?").get(id);
      if (!callerU.is_admin) return { data: null, error: { message: "Apenas administradores podem excluir pastas", code: "FORBIDDEN" } };
      if (!pasta) return { data: null, error: { message: "Pasta não encontrada", code: "NOT_FOUND" } };
      const possuiItens = db.prepare("SELECT 1 FROM gd_pastas WHERE parent_id = ? UNION SELECT 1 FROM gd_arquivos WHERE pasta_id = ? LIMIT 1").get(id, id);
      if (possuiItens) return { data: null, error: { message: "A pasta precisa estar vazia para ser excluída", code: "CONFLICT" } };
      db.prepare("DELETE FROM gd_pastas WHERE id = ?").run(id);
      auditar(db, callerU.id, "pasta_excluir", "gd_pastas", id, { nome: pasta.nome }, args._ip, args._request_id);
      return { data: true, error: null };
    }
    if (fn === "gd_arquivo_registrar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const nome = String(args._nome || "").trim();
      const caminho = String(args._caminho || "").trim();
      const pastaId = String(args._pasta_id || "").trim() || null;
      const tamanho = Number(args._tamanho);
      const uploadRegistrado = db.prepare("SELECT usuario_id, modulo FROM uploads_controle WHERE caminho = ?").get(caminho);
      if (!uploadRegistrado || uploadRegistrado.usuario_id !== callerU.id || uploadRegistrado.modulo !== "gestao-documentos") return { data: null, error: { message: "Upload não pertence ao usuário", code: "FORBIDDEN" } };
      if (!nome || !caminho.startsWith("arquivos/") || caminho.includes("..") || !Number.isInteger(tamanho) || tamanho < 0) return { data: null, error: { message: "Dados do arquivo inválidos", code: "BAD_REQUEST" } };
      if (pastaId && !db.prepare("SELECT id FROM gd_pastas WHERE id = ?").get(pastaId)) return { data: null, error: { message: "Pasta não encontrada", code: "NOT_FOUND" } };
      const id = randomUUID();
      try { db.prepare("INSERT INTO gd_arquivos (id, pasta_id, nome_original, caminho, preview_caminho, mime, tamanho, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, pastaId, nome, caminho, String(args._preview_caminho || "").slice(0, 500) || null, String(args._mime || "").slice(0, 200) || null, tamanho, callerU.id); }
      catch (e) { return { data: null, error: uniqueError(e) }; }
      auditar(db, callerU.id, "arquivo_enviar", "gd_arquivos", id, { nome, pasta_id: pastaId }, args._ip, args._request_id);
      return { data: db.prepare("SELECT * FROM gd_arquivos WHERE id = ?").get(id), error: null };
    }
    if (fn === "gd_pasta_renomear") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "").trim();
      const nome = String(args._nome || "").trim();
      if (!nome || nome.length > 120 || nome.includes("/") || nome.includes("\\")) return { data: null, error: { message: "Nome de pasta inválido", code: "BAD_REQUEST" } };
      const pasta = db.prepare("SELECT * FROM gd_pastas WHERE id = ?").get(id);
      if (!pasta) return { data: null, error: { message: "Pasta não encontrada", code: "NOT_FOUND" } };
      if (!callerU.is_admin && pasta.usuario_id !== callerU.id) return { data: null, error: { message: "Você só pode renomear pastas que criou", code: "FORBIDDEN" } };
      try { db.prepare("UPDATE gd_pastas SET nome = ? WHERE id = ?").run(nome, id); }
      catch (e) { return { data: null, error: uniqueError(e) }; }
      auditar(db, callerU.id, "pasta_renomear", "gd_pastas", id, { anterior: pasta.nome, novo: nome }, args._ip, args._request_id);
      return { data: { ...pasta, nome }, error: null };
    }
    if (fn === "gd_arquivo_renomear") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "").trim();
      const nome = String(args._nome || "").trim();
      if (!nome || nome.length > 255 || /[\\/]/.test(nome)) return { data: null, error: { message: "Nome de arquivo inválido", code: "BAD_REQUEST" } };
      const arquivo = db.prepare("SELECT * FROM gd_arquivos WHERE id = ?").get(id);
      if (!arquivo) return { data: null, error: { message: "Arquivo não encontrado", code: "NOT_FOUND" } };
      if (!callerU.is_admin && arquivo.usuario_id !== callerU.id) return { data: null, error: { message: "Você só pode renomear arquivos que enviou", code: "FORBIDDEN" } };
      db.prepare("UPDATE gd_arquivos SET nome_original = ? WHERE id = ?").run(nome, id);
      auditar(db, callerU.id, "arquivo_renomear", "gd_arquivos", id, { anterior: arquivo.nome_original, novo: nome }, args._ip, args._request_id);
      return { data: { ...arquivo, nome_original: nome }, error: null };
    }
    if (fn === "gd_arquivo_excluir") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "gestao-documentos")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "").trim();
      const arquivo = db.prepare("SELECT * FROM gd_arquivos WHERE id = ?").get(id);
      if (!callerU.is_admin) return { data: null, error: { message: "Apenas administradores podem excluir arquivos", code: "FORBIDDEN" } };
      if (!arquivo) return { data: null, error: { message: "Arquivo não encontrado", code: "NOT_FOUND" } };
      const destino = path.resolve(UPLOADS_DIR, arquivo.caminho);
      if (destino.startsWith(UPLOADS_DIR + path.sep) && existsSync(destino)) unlinkSync(destino);
      const preview = arquivo.preview_caminho ? path.resolve(UPLOADS_DIR, arquivo.preview_caminho) : null;
      if (preview && preview.startsWith(UPLOADS_DIR + path.sep) && existsSync(preview)) unlinkSync(preview);
      db.prepare("DELETE FROM uploads_controle WHERE caminho IN (?, ?)").run(arquivo.caminho, arquivo.preview_caminho || "");
      db.prepare("DELETE FROM gd_arquivos WHERE id = ?").run(id);
      auditar(db, callerU.id, "arquivo_excluir", "gd_arquivos", id, { nome: arquivo.nome_original }, args._ip, args._request_id);
      return { data: true, error: null };
    }

    // ── GESTÃO DE DOCUMENTOS ──────────────────────────────────────────────────────────
    if (fn === "gd_setores_listar") {
      const rows = db.prepare("SELECT id, nome, sigla, parent_id, tipo FROM gd_setores ORDER BY ordem, nome").all();
      return { data: rows, error: null };
    }
    if (fn === "gd_tipos_listar") {
      const rows = db.prepare("SELECT codigo, nome, descricao FROM gd_tipos_documento WHERE ativo = 1 ORDER BY nome").all();
      return { data: rows, error: null };
    }
    if (fn === "gd_documento_criar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const tipoCodigo = String(args._tipo || "").trim().toLowerCase();
      if (!tipoCodigo) return { data: null, error: { message: "Tipo obrigatório", code: "BAD_REQUEST" } };
      const tipoOk = db.prepare("SELECT codigo FROM gd_tipos_documento WHERE lower(codigo) = lower(?) AND ativo = 1").get(tipoCodigo);
      if (!tipoOk) return { data: null, error: { message: "Tipo inválido", code: "BAD_REQUEST" } };
      const assunto = String(args._assunto || "").trim();
      if (!assunto) return { data: null, error: { message: "Assunto obrigatório", code: "BAD_REQUEST" } };
      const ano = new Date().getFullYear();
      const setorOrigemRow = db.prepare("SELECT setor_id FROM gd_usuario_setor WHERE usuario_id = ? LIMIT 1").get(callerU.id);
      const setorOrigem = setorOrigemRow ? setorOrigemRow.setor_id : null;
      let numero, protocolo, id;
      db.exec("BEGIN");
      try {
        const chave = `${ano}:${tipoCodigo}`;
        const cRow = db.prepare("SELECT valor FROM gd_contadores WHERE chave = ?").get(chave);
        numero = (cRow ? cRow.valor : 0) + 1;
        db.prepare("INSERT INTO gd_contadores (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor").run(chave, numero);
        protocolo = `${ano}.${String(numero).padStart(6, "0")}.${String(tipoCodigo).toUpperCase()}`;
        id = randomUUID();
        db.prepare("INSERT INTO gd_documentos (id, protocolo, ano, numero, tipo_codigo, assunto, conteudo, autor_id, setor_origem_id, status, prioridade, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'rascunho', ?, ?)").run(
          id, protocolo, ano, numero, tipoCodigo, assunto, String(args._conteudo || ""), callerU.id, setorOrigem, args._prioridade || "normal", Array.isArray(args._tags) ? JSON.stringify(args._tags) : null
        );
        db.exec("COMMIT");
      } catch (err) { db.exec("ROLLBACK"); throw err; }
      auditar(db, callerU.id, "documento_criar", "gd_documentos", id, { protocolo }, args._ip, args._request_id);
      return { data: { id, protocolo, numero }, error: null };
    }
    if (fn === "gd_documento_atualizar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (doc.autor_id !== callerU.id && !callerU.is_admin) return { data: null, error: { message: "Apenas o autor ou admin pode editar", code: "FORBIDDEN" } };
      if (doc.status !== "rascunho") return { data: null, error: { message: "Só é possível editar rascunhos", code: "CONFLICT" } };
      const fields = []; const params = [];
      if (args._assunto != null) {
        const assunto = String(args._assunto).trim();
        if (!assunto) return { data: null, error: { message: "Assunto obrigatório", code: "BAD_REQUEST" } };
        fields.push("assunto = ?"); params.push(assunto);
      }
      if (args._conteudo != null) { fields.push("conteudo = ?"); params.push(String(args._conteudo)); }
      if (args._prioridade != null && ["baixa","normal","alta","urgente"].includes(args._prioridade)) { fields.push("prioridade = ?"); params.push(args._prioridade); }
      if (!fields.length) return { data: { ok: true }, error: null };
      fields.push("atualizado_em = datetime('now')");
      db.prepare(`UPDATE gd_documentos SET ${fields.join(", ")} WHERE id = ?`).run(...params, id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_documento_enviar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (doc.autor_id !== callerU.id && !callerU.is_admin) return { data: null, error: { message: "Apenas o autor ou admin pode enviar", code: "FORBIDDEN" } };
      if (doc.status !== "rascunho") return { data: null, error: { message: "Somente rascunhos podem ser enviados", code: "CONFLICT" } };
      const destinos = (Array.isArray(args._destinatarios) ? args._destinatarios : []).map(String);
      const cc = (Array.isArray(args._cc) ? args._cc : []).map(String);
      if (!destinos.length) return { data: null, error: { message: "Informe ao menos um destinatário", code: "BAD_REQUEST" } };
      const setoresValidos = new Set(db.prepare("SELECT id FROM gd_setores").all().map(r => r.id));
      const destinosValidos = [...new Set(destinos.filter((setorId) => setoresValidos.has(setorId)))];
      const ccValidos = [...new Set(cc.filter((setorId) => setoresValidos.has(setorId)))];
      if (!destinosValidos.length) return { data: null, error: { message: "Informe um setor destinatário válido", code: "BAD_REQUEST" } };
      db.exec("BEGIN");
      try {
        const insDest = db.prepare("INSERT OR IGNORE INTO gd_documento_destinatarios (id, documento_id, setor_id, tipo) VALUES (?, ?, ?, ?)");
        for (const s of destinosValidos) insDest.run(randomUUID(), id, s, "para");
        for (const s of ccValidos) insDest.run(randomUUID(), id, s, "cc");
        const insTram = db.prepare("INSERT INTO gd_tramitacoes (id, documento_id, de_setor_id, para_setor_id, de_usuario_id, acao, observacao, ip) VALUES (?, ?, ?, ?, ?, 'enviar', ?, ?)");
        for (const s of destinosValidos) insTram.run(randomUUID(), id, doc.setor_origem_id, s, callerU.id, String(args._observacao || ""), args._ip || null);
        db.prepare("UPDATE gd_documentos SET status = 'em_aberto', atualizado_em = datetime('now') WHERE id = ?").run(id);
        db.exec("COMMIT");
      } catch (err) { db.exec("ROLLBACK"); throw err; }
      const usuariosDest = usuariosDosSetores(db, [...destinosValidos, ...ccValidos]).filter((usuarioId) => usuarioId !== callerU.id);
      notificar(
        db, usuariosDest, "Novo documento recebido", `Protocolo ${doc.protocolo}: ${doc.assunto}`, "documento", "gd_documentos", id,
        {
          atorId: callerU.id,
          rota: `/gestao-documentos?documento=${encodeURIComponent(id)}`,
          chaveEvento: `documento:${id}:enviado`,
          prioridade: ["alta", "urgente"].includes(doc.prioridade) ? "alta" : "normal",
        },
      );
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_documento_responder") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (!podeAcessar(db, callerU, doc)) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const meusSetores = setoresDoUsuario(db, callerU.id);
      const deSetor = meusSetores.size ? [...meusSetores][0] : doc.setor_origem_id;
      const tramitacaoId = randomUUID();
      db.exec("BEGIN");
      try {
        db.prepare("UPDATE gd_documentos SET status = 'respondido', atualizado_em = datetime('now') WHERE id = ?").run(id);
        db.prepare("INSERT INTO gd_tramitacoes (id, documento_id, de_setor_id, para_setor_id, de_usuario_id, acao, observacao, ip) VALUES (?, ?, ?, ?, ?, 'responder', ?, ?)").run(tramitacaoId, id, deSetor, doc.setor_origem_id, callerU.id, String(args._observacao || ""), args._ip || null);
        db.exec("COMMIT");
      } catch (err) { db.exec("ROLLBACK"); throw err; }
      const autor = db.prepare("SELECT id FROM usuarios WHERE id = ? AND ativo = 1 AND id <> ?").get(doc.autor_id, callerU.id);
      if (autor) {
        notificar(
          db, [autor.id], "Documento respondido", `Protocolo ${doc.protocolo}: ${doc.assunto}`, "documento_respondido", "gd_documentos", id,
          {
            atorId: callerU.id,
            rota: `/gestao-documentos?documento=${encodeURIComponent(id)}`,
            chaveEvento: `documento:${id}:resposta:${tramitacaoId}`,
            prioridade: ["alta", "urgente"].includes(doc.prioridade) ? "alta" : "normal",
          },
        );
      }
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_documento_encaminhar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (!podeAcessar(db, callerU, doc)) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const para = String(args._para_setor || "");
      if (!db.prepare("SELECT id FROM gd_setores WHERE id = ?").get(para)) return { data: null, error: { message: "Setor de destino inválido", code: "BAD_REQUEST" } };
      const meusSetores = setoresDoUsuario(db, callerU.id);
      const deSetor = meusSetores.size ? [...meusSetores][0] : doc.setor_origem_id;
      db.exec("BEGIN");
      try {
        db.prepare("INSERT INTO gd_tramitacoes (id, documento_id, de_setor_id, para_setor_id, de_usuario_id, acao, observacao, ip) VALUES (?, ?, ?, ?, ?, 'encaminhar', ?, ?)").run(randomUUID(), id, deSetor, para, callerU.id, String(args._observacao || ""), args._ip || null);
        db.prepare("INSERT OR IGNORE INTO gd_documento_destinatarios (id, documento_id, setor_id, tipo) VALUES (?, ?, ?, 'para')").run(randomUUID(), id, para);
        db.prepare("UPDATE gd_documentos SET status = 'encaminhado', setor_origem_id = ?, atualizado_em = datetime('now') WHERE id = ?").run(para, id);
        db.exec("COMMIT");
      } catch (err) { db.exec("ROLLBACK"); throw err; }
      const ud = usuariosDosSetores(db, [para]).filter((usuarioId) => usuarioId !== callerU.id);
      notificar(
        db, ud, "Documento encaminhado", `Protocolo ${doc.protocolo}: ${doc.assunto}`, "documento_encaminhado", "gd_documentos", id,
        {
          atorId: callerU.id,
          rota: `/gestao-documentos?documento=${encodeURIComponent(id)}`,
          chaveEvento: `documento:${id}:encaminhado:${para}`,
          prioridade: ["alta", "urgente"].includes(doc.prioridade) ? "alta" : "normal",
        },
      );
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_documento_arquivar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (doc.autor_id !== callerU.id && !callerU.is_admin) return { data: null, error: { message: "Apenas o autor ou administrador pode arquivar", code: "FORBIDDEN" } };
      if (["arquivado", "cancelado"].includes(doc.status)) return { data: null, error: { message: "Documento já finalizado", code: "CONFLICT" } };
      db.prepare("UPDATE gd_documentos SET status = 'arquivado', arquivado_em = datetime('now'), atualizado_em = datetime('now') WHERE id = ?").run(id);
      const relacionados = usuariosRelacionadosDocumento(db, id).filter((usuarioId) => usuarioId !== callerU.id);
      notificar(
        db, relacionados, "Documento arquivado", `Protocolo ${doc.protocolo}: ${doc.assunto}`, "documento_arquivado", "gd_documentos", id,
        {
          atorId: callerU.id,
          rota: `/gestao-documentos?documento=${encodeURIComponent(id)}`,
          chaveEvento: `documento:${id}:arquivado`,
          prioridade: "normal",
        },
      );
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_documento_cancelar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (doc.autor_id !== callerU.id && !callerU.is_admin) return { data: null, error: { message: "Apenas o autor ou administrador pode cancelar", code: "FORBIDDEN" } };
      if (["arquivado", "cancelado"].includes(doc.status)) return { data: null, error: { message: "Documento já finalizado", code: "CONFLICT" } };
      db.prepare("UPDATE gd_documentos SET status = 'cancelado', cancelado_em = datetime('now'), atualizado_em = datetime('now') WHERE id = ?").run(id);
      const relacionados = usuariosRelacionadosDocumento(db, id).filter((usuarioId) => usuarioId !== callerU.id);
      notificar(
        db, relacionados, "Documento cancelado", `Protocolo ${doc.protocolo}: ${doc.assunto}`, "documento_cancelado", "gd_documentos", id,
        {
          atorId: callerU.id,
          rota: `/gestao-documentos?documento=${encodeURIComponent(id)}`,
          chaveEvento: `documento:${id}:cancelado`,
          prioridade: "alta",
        },
      );
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_documento_get") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (!podeAcessar(db, callerU, doc)) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const destinatarios = db.prepare("SELECT d.setor_id, s.nome AS setor_nome, d.tipo FROM gd_documento_destinatarios d JOIN gd_setores s ON s.id = d.setor_id WHERE d.documento_id = ?").all(id);
      const tramitacoes = db.prepare("SELECT t.*, s.nome AS para_setor_nome, s2.nome AS de_setor_nome, u.username AS de_usuario, u2.username AS para_usuario FROM gd_tramitacoes t LEFT JOIN gd_setores s ON s.id = t.para_setor_id LEFT JOIN gd_setores s2 ON s2.id = t.de_setor_id LEFT JOIN usuarios u ON u.id = t.de_usuario_id LEFT JOIN usuarios u2 ON u2.id = t.para_usuario_id WHERE t.documento_id = ? ORDER BY t.criado_em").all(id);
      const anexos = db.prepare("SELECT id, nome_original, mime, tamanho, criado_em FROM gd_anexos WHERE documento_id = ?").all(id);
      return { data: {
        doc, destinatarios, tramitacoes, anexos,
        permissoes: {
          pode_finalizar: Boolean(callerU.is_admin || doc.autor_id === callerU.id),
          pode_anexar: !["arquivado", "cancelado"].includes(doc.status),
        },
      }, error: null };
    }
    if (fn === "gd_documento_listar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const pagina = parseInt(args._pagina) || 1;
      const porPagina = Math.min(parseInt(args._por_pagina) || 20, 100);
      const offset = (pagina - 1) * porPagina;
      const busca = String(args._busca || "").trim();
      const status = String(args._status || "").trim();
      const tipo = String(args._tipo || "").trim().toLowerCase();
      const params = [];
      let where;
      if (!callerU.is_admin) {
        const setores = [...setoresDoUsuario(db, callerU.id)];
        where = ` WHERE (d.autor_id = ? OR d.id IN (SELECT documento_id FROM gd_documento_destinatarios WHERE setor_id IN (${setores.map(() => "?").join(",")})))`;
        params.push(callerU.id, ...setores);
      } else { where = " WHERE 1=1"; }
      if (busca) {
        where += " AND (lower(d.assunto) LIKE lower(?) OR lower(d.protocolo) LIKE lower(?) OR lower(d.conteudo) LIKE lower(?))";
        params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
      }
      if (status) { where += " AND d.status = ?"; params.push(status); }
      if (tipo) { where += " AND lower(d.tipo_codigo) = ?"; params.push(tipo); }
      const total = db.prepare(`SELECT COUNT(*) AS c FROM gd_documentos d ${where}`).get(...params).c;
      const rows = db.prepare(`SELECT d.id, d.protocolo, d.tipo_codigo, d.assunto, d.status, d.prioridade, d.criado_em, u.username AS autor FROM gd_documentos d LEFT JOIN usuarios u ON u.id = d.autor_id ${where} ORDER BY d.criado_em DESC LIMIT ? OFFSET ?`).all(...params, porPagina, offset);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }
    if (fn === "gd_documento_anexar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const doc = db.prepare("SELECT * FROM gd_documentos WHERE id = ?").get(id);
      if (!doc) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      if (!podeAcessar(db, callerU, doc)) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      if (["arquivado", "cancelado"].includes(doc.status)) return { data: null, error: { message: "Documento finalizado não aceita anexos", code: "CONFLICT" } };
      const nome = String(args._nome || "").trim();
      const caminho = String(args._caminho || "").trim();
      const tamanho = parseInt(args._tamanho) || 0;
      const mime = String(args._mime || "").trim();
      if (!caminho.startsWith(`documentos/${id}/`) || caminho.includes("..")) return { data: null, error: { message: "Caminho do anexo inválido", code: "BAD_REQUEST" } };
      const uploadRegistrado = db.prepare("SELECT usuario_id, modulo FROM uploads_controle WHERE caminho = ?").get(caminho);
      if (!uploadRegistrado || uploadRegistrado.usuario_id !== callerU.id || uploadRegistrado.modulo !== "gestao-documentos") return { data: null, error: { message: "Upload não pertence ao usuário", code: "FORBIDDEN" } };
      const ext = (nome.split(".").pop() || "").toLowerCase();
      const permitidos = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"];
      if (!permitidos.includes(ext)) return { data: null, error: { message: "Tipo de arquivo não permitido", code: "BAD_REQUEST" } };
      if (tamanho > 25 * 1024 * 1024) return { data: null, error: { message: "Arquivo excede 25 MB", code: "BAD_REQUEST" } };
      const aid = randomUUID();
      db.prepare("INSERT INTO gd_anexos (id, documento_id, nome_original, caminho, mime, tamanho, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(aid, id, nome, caminho, mime || null, tamanho || null, callerU.id);
      return { data: { id: aid }, error: null };
    }
    if (fn === "gd_notificacoes_listar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const pagina = Math.max(1, parseInt(args._pagina) || 1);
      const porPagina = Math.min(100, Math.max(1, parseInt(args._por_pagina) || 50));
      const somenteNaoLidas = args._somente_nao_lidas === true || String(args._somente_nao_lidas || "").toLowerCase() === "true";
      const where = somenteNaoLidas ? "WHERE usuario_id = ? AND lida = 0" : "WHERE usuario_id = ?";
      const offset = (pagina - 1) * porPagina;
      const total = db.prepare(`SELECT COUNT(*) AS c FROM gd_notificacoes ${where}`).get(callerU.id).c;
      const rows = db.prepare(`SELECT id, titulo, mensagem, lida, tipo, ref_tipo, ref_id, ator_id, rota, prioridade, lida_em, criado_em
        FROM gd_notificacoes ${where} ORDER BY criado_em DESC, id DESC LIMIT ? OFFSET ?`).all(callerU.id, porPagina, offset);
      const naoLidas = db.prepare("SELECT COUNT(*) AS c FROM gd_notificacoes WHERE usuario_id = ? AND lida = 0").get(callerU.id).c;
      return { data: { rows, naoLidas, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }
    if (fn === "gd_notificacao_marcar_lida") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const result = db.prepare("UPDATE gd_notificacoes SET lida = 1, lida_em = COALESCE(lida_em, datetime('now')) WHERE id = ? AND usuario_id = ?").run(String(args._id || ""), callerU.id);
      return { data: { ok: true, alteradas: result.changes || 0 }, error: null };
    }
    if (fn === "gd_notificacoes_marcar_todas_lidas") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const result = db.prepare("UPDATE gd_notificacoes SET lida = 1, lida_em = COALESCE(lida_em, datetime('now')) WHERE usuario_id = ? AND lida = 0").run(callerU.id);
      return { data: { ok: true, alteradas: result.changes || 0 }, error: null };
    }
    if (fn === "tarefa_notificar_criacao") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "tarefas")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const tarefaId = String(args._tarefa_id || "").trim();
      if (!tarefaId) return { data: null, error: { message: "Tarefa inválida", code: "BAD_REQUEST" } };
      const tarefa = db.prepare("SELECT id, titulo, responsavel, prioridade FROM tarefas WHERE id = ?").get(tarefaId);
      if (!tarefa) return { data: null, error: { message: "Tarefa não encontrada", code: "NOT_FOUND" } };
      const responsavel = String(tarefa.responsavel || "").trim();
      if (responsavel && responsavel.toUpperCase() !== "TODOS" && !db.prepare("SELECT 1 FROM usuarios WHERE ativo = 1 AND lower(username) = lower(?)").get(responsavel)) {
        return { data: null, error: { message: "Responsável não encontrado", code: "BAD_REQUEST" } };
      }
      return { data: { total: emitirNotificacaoTarefa(db, callerU, tarefa) }, error: null };
    }
    if (fn === "gd_filtros_listar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const rows = db.prepare("SELECT id, nome, filtros, criado_em FROM gd_filtros_salvos WHERE usuario_id = ? ORDER BY nome").all(callerU.id);
      return { data: rows, error: null };
    }
    if (fn === "gd_filtro_salvar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const nome = String(args._nome || "").trim();
      if (!nome) return { data: null, error: { message: "Nome obrigatório", code: "BAD_REQUEST" } };
      const id = randomUUID();
      db.prepare("INSERT INTO gd_filtros_salvos (id, usuario_id, nome, filtros) VALUES (?, ?, ?, ?)").run(id, callerU.id, nome, JSON.stringify(args._filtros || {}));
      return { data: { id }, error: null };
    }
    if (fn === "gd_filtro_excluir") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      db.prepare("DELETE FROM gd_filtros_salvos WHERE id = ? AND usuario_id = ?").run(String(args._id || ""), callerU.id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "gd_superlog_listar") {
      const caller = String(args._caller || "").trim();
      const adm = db.prepare("SELECT is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)").get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const pagina = parseInt(args._pagina) || 1;
      const porPagina = Math.min(parseInt(args._por_pagina) || 50, 200);
      const offset = (pagina - 1) * porPagina;
      const busca = String(args._busca || "").trim();
      const acao = String(args._acao || "").trim();
      const usuario = String(args._usuario || "").trim();
      const de = String(args._de || "").trim();
      const ate = String(args._ate || "").trim();
      const params = [];
      let where = " WHERE 1=1";
      if (busca) { where += " AND (lower(l.acao) LIKE lower(?) OR lower(l.entidade) LIKE lower(?) OR lower(l.detalhes) LIKE lower(?) OR lower(l.entidade_id) LIKE lower(?))"; params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`, `%${busca}%`); }
      if (acao) { where += " AND lower(l.acao) LIKE lower(?)"; params.push(`%${acao}%`); }
      if (usuario) { where += " AND l.usuario_id IN (SELECT id FROM usuarios WHERE lower(username) LIKE lower(?))"; params.push(`%${usuario}%`); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(de)) { where += " AND l.criado_em >= ?"; params.push(`${de} 00:00:00`); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(ate)) { where += " AND l.criado_em <= ?"; params.push(`${ate} 23:59:59`); }
      const total = db.prepare(`SELECT COUNT(*) AS c FROM gd_logs_auditoria l ${where}`).get(...params).c;
      const rows = db.prepare(`SELECT l.id, l.usuario_id, u.username, l.acao, l.entidade, l.entidade_id, l.detalhes, l.ip, l.criado_em FROM gd_logs_auditoria l LEFT JOIN usuarios u ON u.id = l.usuario_id ${where} ORDER BY l.criado_em DESC LIMIT ? OFFSET ?`).all(...params, porPagina, offset);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }

    // ── CONFIGURAÇÕES ───────────────────────────────────────────────────────────────
    function exigeAdminConfig() {
      const caller = String(args._caller || "").trim();
      const adm = db
        .prepare("SELECT id, is_admin, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      return null;
    }
    if (fn === "config_get") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const chave = String(args._chave || "").trim();
      if (!chave) return { data: null, error: { message: "Chave obrigatória", code: "BAD_REQUEST" } };
      if (CONFIG_SECRETS.has(chave)) {
        return { data: null, error: { message: "Segredo indisponível nesta operação", code: "SECRET_UNAVAILABLE" } };
      }
      const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave);
      return { data: row ? row.valor : null, error: null };
    }
    if (fn === "config_set") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const chave = String(args._chave || "").trim();
      if (!chave) return { data: null, error: { message: "Chave obrigatória", code: "BAD_REQUEST" } };
      if (CONFIG_SECRETS.has(chave)) {
        return { data: null, error: { message: "Segredo indisponível nesta operação", code: "SECRET_UNAVAILABLE" } };
      }
      db.prepare("INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, datetime('now')) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em").run(chave, String(args._valor ?? ""));
      return { data: { ok: true }, error: null };
    }
    if (fn === "config_listar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const rows = db.prepare("SELECT chave, valor, atualizado_em FROM configuracoes WHERE chave NOT IN (?, ?, ?) ORDER BY chave").all(BACKUP_TELEGRAM_PASSWORD_KEY, AUTENTIQUE_WEBHOOK_SECRET_KEY, PORTAL_TRANSPARENCIA_API_KEY);
      return { data: rows, error: null };
    }
    if (fn === "backup_senha_status") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const row = db.prepare("SELECT 1 FROM configuracoes WHERE chave = ? AND length(trim(valor)) > 0").get(BACKUP_TELEGRAM_PASSWORD_KEY);
      return { data: { configurada: Boolean(row) }, error: null };
    }
    if (fn === "backup_senha_definir") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      if (typeof args._senha !== "string" || !args._senha.trim() || args._senha.length > 1024) {
        return { data: null, error: { message: "Senha de backup inválida", code: "BAD_REQUEST" } };
      }
      db.prepare("INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, datetime('now')) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em").run(BACKUP_TELEGRAM_PASSWORD_KEY, args._senha);
      return { data: { ok: true }, error: null };
    }
    if (fn === "autentique_webhook_status") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const configurado = Boolean(db.prepare("SELECT 1 FROM configuracoes WHERE chave = ? AND length(trim(valor)) > 0").get(AUTENTIQUE_WEBHOOK_SECRET_KEY));
      const ultimo = db.prepare("SELECT tipo, recebido_em, processado_em, erro FROM autentique_webhook_eventos ORDER BY recebido_em DESC LIMIT 1").get() || null;
      return { data: { configurado, ultimo }, error: null };
    }
    if (fn === "autentique_webhook_definir") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const segredo = String(args._segredo || "").trim();
      if (segredo.length < 16 || segredo.length > 2048) return { data: null, error: { message: "Segredo do webhook inválido.", code: "BAD_REQUEST" } };
      db.prepare("INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, datetime('now')) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em").run(AUTENTIQUE_WEBHOOK_SECRET_KEY, segredo);
      return { data: { ok: true }, error: null };
    }
    if (fn === "portal_transparencia_api_key_status") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const row = db.prepare("SELECT 1 FROM configuracoes WHERE chave = ? AND length(trim(valor)) > 0").get(PORTAL_TRANSPARENCIA_API_KEY);
      return { data: { configurada: Boolean(row) || Boolean(process.env.PORTAL_TRANSPARENCIA_API_KEY) }, error: null };
    }
    if (fn === "portal_transparencia_api_key_definir") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const chave = String(args._chave || "").trim();
      if (chave.length > 512) return { data: null, error: { message: "Chave do Portal inválida", code: "BAD_REQUEST" } };
      db.prepare("INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES (?, ?, datetime('now')) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em").run(PORTAL_TRANSPARENCIA_API_KEY, chave);
      return { data: { ok: true, configurada: Boolean(chave) }, error: null };
    }

    if (fn === "mcp_token_listar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const rows = db.prepare(`SELECT t.id, t.nome, t.token_prefix, t.ativo, t.criado_em, t.ultimo_uso_em, t.expira_em, u.username
        FROM mcp_tokens t JOIN usuarios u ON u.id = t.usuario_id ORDER BY t.criado_em DESC`).all();
      return { data: rows, error: null };
    }
    if (fn === "mcp_token_criar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const nome = String(args._nome || "").trim();
      const username = String(args._usuario || "").trim();
      const diasExpiracao = args._expira_dias == null || args._expira_dias === "" ? 90 : Number(args._expira_dias);
      if (!Number.isInteger(diasExpiracao) || ![30, 90, 180, 365].includes(diasExpiracao)) {
        return { data: null, error: { message: "A validade deve ser de 30, 90, 180 ou 365 dias", code: "BAD_REQUEST" } };
      }
      if (!nome || nome.length > 120 || !username) return { data: null, error: { message: "Informe um nome e o usuário da chave", code: "BAD_REQUEST" } };
      const usuario = db.prepare("SELECT id, username, ativo, is_admin FROM usuarios WHERE lower(username) = lower(?)").get(username);
      const temModulo = usuario?.is_admin || db.prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ?").get(usuario?.id);
      if (!usuario?.ativo || !temModulo) return { data: null, error: { message: "O usuário precisa estar ativo e ter acesso a pelo menos um módulo", code: "FORBIDDEN" } };
      const token = `imcp_${randomBytes(32).toString("base64url")}`;
      const hash = createHash("sha256").update(token).digest("hex");
      const id = randomUUID();
      const expiraEm = new Date(Date.now() + diasExpiracao * 24 * 60 * 60 * 1000).toISOString().replace("T", " ").replace("Z", "");
      db.prepare("INSERT INTO mcp_tokens (id, nome, token_hash, token_prefix, usuario_id, expira_em) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, nome, hash, token.slice(0, 13), usuario.id, expiraEm);
      const actor = obterUsuario(db, args._caller);
      auditar(db, actor?.id || null, "mcp_token_criado", "mcp_token", id, { nome, usuario_id: usuario.id, expira_em: expiraEm, criado_por: args._caller }, args._ip, args._request_id);
      return { data: { id, nome, usuario: usuario.username, token, expira_em: expiraEm }, error: null };
    }
    if (fn === "mcp_token_revogar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const id = String(args._id || "").trim();
      const token = db.prepare("SELECT id, nome, usuario_id, ativo FROM mcp_tokens WHERE id = ?").get(id);
      if (!token) return { data: null, error: { message: "Chave MCP não encontrada", code: "NOT_FOUND" } };
      db.prepare("UPDATE mcp_tokens SET ativo = 0 WHERE id = ?").run(id);
      const actor = obterUsuario(db, args._caller);
      auditar(db, actor?.id || null, "mcp_token_revogado", "mcp_token", id, { nome: token.nome, usuario_id: token.usuario_id, revogado_por: args._caller }, args._ip, args._request_id);
      return { data: { ok: true }, error: null };
    }

    // ── CNPJ ────────────────────────────────────────────────────────────────────────
    function normalizarCNPJ(cnpj) { return String(cnpj || "").replace(/\D/g, ""); }
    function cnpjValido(cnpj) {
      const digits = normalizarCNPJ(cnpj);
      if (digits.length !== 14 || digits === digits[0].repeat(14)) return false;
      const nums = [...digits].map(Number);
      const dv1 = nums.slice(0,12).reduce((s,n,i) => s + n * [5,4,3,2,9,8,7,6,5,4,3,2][i], 0) % 11;
      if (nums[12] !== (dv1 < 2 ? 0 : 11 - dv1)) return false;
      const dv2 = nums.slice(0,13).reduce((s,n,i) => s + n * [6,5,4,3,2,9,8,7,6,5,4,3,2][i], 0) % 11;
      return nums[13] === (dv2 < 2 ? 0 : 11 - dv2);
    }
    if (fn === "cnpj_buscar") {
      const cnpj = String(args._cnpj || "").trim();
      const cnpjLimpo = normalizarCNPJ(cnpj);
      if (cnpjLimpo.length !== 14 || !cnpjValido(cnpjLimpo)) return { data: null, error: { message: "CNPJ inválido", code: "BAD_REQUEST" } };
      // 1. Tenta BrasilAPI
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const d = await res.json();
          let end = `${d.logradouro||""} ${d.numero||""}`.trim(); if (d.complemento) end += `, ${d.complemento}`; end += ` - ${d.bairro||""} - ${d.municipio||""}/${d.uf||""} - CEP ${d.cep||""}`;
          return { data: { fonte:"BrasilAPI", cnpj:cnpjLimpo, razao_social:d.razao_social||"", nome_fantasia:d.nome_fantasia||d.razao_social||"", situacao:d.descricao_situacao_cadastral||"", data_abertura:d.data_inicio_atividade||"", natureza_juridica:String(d.codigo_natureza_juridica||""), porte:d.descricao_porte||"", simples:d.opcao_pelo_simples?"Sim":"Não", mei:d.opcao_pelo_mei?"Sim":"Não", matriz:d.identificador_matriz_filial===1?"Matriz":"Filial", endereco:end, cnae_principal:d.cnae_fiscal_principal_descricao||d.cnae_fiscal_descricao||"", cnaes_secundarios:(d.cnae_fiscal_secundaria||d.cnaes_secundarios||[]).map(c=>c.descricao||String(c)).filter(Boolean), socios:(d.qsa||[]).map(s=>({nome:s.nome_socio||"",qualificacao:String(s.codigo_qualificacao_socio||"")})), telefones:[d.ddd_telefone_1||""].filter(Boolean), emails:[d.email||""].filter(Boolean) }, error: null };
        }
      } catch { /* fallback MinhaReceita */ }
      // 2. Fallback MinhaReceita (Redundância oficial)
      try {
        const res = await fetch(`https://minhareceita.org/${cnpjLimpo}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const d = await res.json();
          let end = `${d.logradouro||""} ${d.numero||""}`.trim(); if (d.complemento) end += `, ${d.complemento}`; end += ` - ${d.bairro||""} - ${d.municipio||""}/${d.uf||""} - CEP ${d.cep||""}`;
          return { data: { fonte:"MinhaReceita", cnpj:cnpjLimpo, razao_social:d.razao_social||"", nome_fantasia:d.nome_fantasia||d.razao_social||"", situacao:d.descricao_situacao_cadastral||"", data_abertura:d.data_inicio_atividade||"", natureza_juridica:String(d.codigo_natureza_juridica||""), porte:d.porte||d.descricao_porte||"", simples:d.opcao_pelo_simples?"Sim":"Não", mei:d.opcao_pelo_mei?"Sim":"Não", matriz:d.identificador_matriz_filial===1?"Matriz":"Filial", endereco:end, cnae_principal:d.cnae_fiscal_descricao||d.cnae_fiscal_principal_descricao||"", cnaes_secundarios:(d.cnaes_secundarios||d.cnae_fiscal_secundaria||[]).map(c=>c.descricao||String(c)).filter(Boolean), socios:(d.qsa||[]).map(s=>({nome:s.nome_socio||"",qualificacao:String(s.codigo_qualificacao_socio||"")})), telefones:[d.ddd_telefone_1||""].filter(Boolean), emails:[d.email||""].filter(Boolean) }, error: null };
        }
      } catch { /* fim dos fallbacks */ }
      return { data: null, error: { message: "CNPJ não encontrado nas bases oficiais", code: "CNPJ_ERROR" } };
    }

    // ── LOGS DE AÇÃO ─────────────────────────────────────────────────────────────
    if (fn === "cnpj_salvos_listar") {
      const usuario = obterUsuario(db, args._caller);
      if (!usuario?.ativo || !usuarioTemModulo(db, usuario, "cnpj")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const rows = db.prepare("SELECT tipo, cnpj, dados FROM cnpj_salvos WHERE usuario_id = ? ORDER BY atualizado_em DESC").all(usuario.id);
      return { data: rows, error: null };
    }
    if (fn === "cnpj_salvo_salvar") {
      const usuario = obterUsuario(db, args._caller);
      if (!usuario?.ativo || !usuarioTemModulo(db, usuario, "cnpj")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const tipo = String(args._tipo || ""); const empresa = args._empresa; const cnpj = normalizarCNPJ(empresa?.cnpj);
      if (!['historico', 'favorito'].includes(tipo) || cnpj.length !== 14 || !empresa || typeof empresa !== "object") return { data: null, error: { message: "Dados de CNPJ invalidos", code: "BAD_REQUEST" } };
      db.prepare("INSERT INTO cnpj_salvos (usuario_id, tipo, cnpj, dados, atualizado_em) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(usuario_id, tipo, cnpj) DO UPDATE SET dados = excluded.dados, atualizado_em = datetime('now')").run(usuario.id, tipo, cnpj, JSON.stringify(empresa));
      if (tipo === "historico") db.prepare("DELETE FROM cnpj_salvos WHERE usuario_id = ? AND tipo = 'historico' AND cnpj NOT IN (SELECT cnpj FROM cnpj_salvos WHERE usuario_id = ? AND tipo = 'historico' ORDER BY atualizado_em DESC LIMIT 8)").run(usuario.id, usuario.id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "cnpj_salvo_remover") {
      const usuario = obterUsuario(db, args._caller);
      if (!usuario?.ativo || !usuarioTemModulo(db, usuario, "cnpj")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const tipo = String(args._tipo || ""); const cnpj = normalizarCNPJ(args._cnpj);
      if (!['historico', 'favorito'].includes(tipo) || cnpj.length !== 14) return { data: null, error: { message: "Dados de CNPJ invalidos", code: "BAD_REQUEST" } };
      db.prepare("DELETE FROM cnpj_salvos WHERE usuario_id = ? AND tipo = ? AND cnpj = ?").run(usuario.id, tipo, cnpj);
      return { data: { ok: true }, error: null };
    }
    if (fn === "logs_acao_listar") {
      const pagina = parseInt(args._pagina) || 1;
      const porPagina = Math.min(parseInt(args._por_pagina) || 50, 200);
      const offset = (pagina - 1) * porPagina;
      const modulo = String(args._modulo || "").trim();
      const params = [];
      let where = "";
      if (modulo) { where = " WHERE modulo = ?"; params.push(modulo); }
      const total = db.prepare(`SELECT COUNT(*) AS c FROM logs_acao${where}`).get(...params).c;
      const rows = db.prepare(`SELECT * FROM logs_acao${where} ORDER BY criado_em DESC LIMIT ? OFFSET ?`).all(...params, porPagina, offset);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }

    // ── CALENDÁRIO ───────────────────────────────────────────────────────────────
    if (fn === "calendario_listar") {
      const mes = String(args._mes || "").trim();
      let eventos; let overrides; let regras;
      if (mes && /^\d{4}-\d{2}$/.test(mes)) { eventos = db.prepare("SELECT * FROM calendario_eventos WHERE data LIKE ? ORDER BY data").all(`${mes}%`); }
      else { eventos = db.prepare("SELECT * FROM calendario_eventos ORDER BY data DESC LIMIT 500").all(); }
      overrides = db.prepare("SELECT data FROM calendario_overrides ORDER BY data").all().map(r => r.data);
      regras = db.prepare("SELECT chave, valor FROM calendario_regras").all();
      return { data: { eventos, overrides, regras }, error: null };
    }
    if (fn === "calendario_evento_criar") {
      const data = String(args._data || "").trim(); const tipo = String(args._tipo || "").trim(); const texto = String(args._texto || "").trim();
      if (!data || !tipo || !texto || !["PAYMENT","COMMITMENT","HOLIDAY","NOTE"].includes(tipo)) return { data: null, error: { message: "Dados inválidos", code: "BAD_REQUEST" } };
      const id = randomUUID(); db.prepare("INSERT INTO calendario_eventos (id, data, tipo, texto, descricao) VALUES (?, ?, ?, ?, ?)").run(id, data, tipo, texto, String(args._descricao || ""));
      return { data: { id }, error: null };
    }
    if (fn === "calendario_evento_atualizar") {
      const id = String(args._id || ""); if (!db.prepare("SELECT id FROM calendario_eventos WHERE id = ?").get(id)) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      const fields = []; const params = [];
      if (args._data != null) { fields.push("data = ?"); params.push(String(args._data)); }
      if (args._tipo != null) { if (!["PAYMENT","COMMITMENT","HOLIDAY","NOTE"].includes(args._tipo)) return { data: null, error: { message: "tipo inválido", code: "BAD_REQUEST" } }; fields.push("tipo = ?"); params.push(args._tipo); }
      if (args._texto != null) { fields.push("texto = ?"); params.push(String(args._texto)); }
      if (args._descricao != null) { fields.push("descricao = ?"); params.push(String(args._descricao)); }
      if (!fields.length) return { data: { ok: true }, error: null };
      db.prepare(`UPDATE calendario_eventos SET ${fields.join(", ")} WHERE id = ?`).run(...params, id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "calendario_evento_excluir") {
      const id = String(args._id || ""); db.prepare("DELETE FROM calendario_eventos WHERE id = ?").run(id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "calendario_override_marcar") {
      const data = String(args._data || "").trim(); if (!data) return { data: null, error: { message: "data obrigatória", code: "BAD_REQUEST" } };
      db.prepare("INSERT OR IGNORE INTO calendario_overrides (data) VALUES (?)").run(data);
      return { data: { ok: true }, error: null };
    }
    if (fn === "calendario_override_remover") { db.prepare("DELETE FROM calendario_overrides WHERE data = ?").run(String(args._data || "")); return { data: { ok: true }, error: null }; }
    if (fn === "calendario_regras_salvar") {
      const regras = args._regras;
      if (!regras || typeof regras !== "object") return { data: null, error: { message: "regras deve ser um objeto", code: "BAD_REQUEST" } };
      const upsert = db.prepare("INSERT INTO calendario_regras (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor");
      for (const [chave, valor] of Object.entries(regras)) upsert.run(chave, String(valor ?? ""));
      return { data: { ok: true }, error: null };
    }

    // ── RPAs ───────────────────────────────────────────────────────────────────────
    function calcularTributosRpa(r) {
      const vb = Number(r._valor_bruto ?? r.valor_bruto) || 0;
      const dep = Number(r._num_dependentes ?? r.num_dependentes) || 0;
      const pensao = Number(r._pensao_alimenticia ?? r.pensao_alimenticia) || 0;
      const inss = Number(r._inss ?? r.inss) || 0;
      const iss = Number(r._iss ?? r.iss) || 0;
      const deducaoDep = dep * 189.59;
      const dataEmissao = String(r._data_emissao ?? r.data_emissao ?? "");
      const tabela2026 = dataEmissao ? dataEmissao >= "2026-01-01" : new Date().getFullYear() >= 2026;
      const deducoesLegais = inss + deducaoDep + pensao;
      const deducaoAplicada = tabela2026 ? Math.max(deducoesLegais, 607.20) : deducoesLegais;
      const baseIR = Math.max(0, vb - deducaoAplicada);
      let aliquota = 0, deduzir = 0, irrf = 0;
      if (baseIR > 4664.68) { aliquota = 27.5; deduzir = tabela2026 ? 908.73 : 896.00; }
      else if (baseIR > 3751.05) { aliquota = 22.5; deduzir = tabela2026 ? 675.49 : 662.77; }
      else if (baseIR > 2826.65) { aliquota = 15; deduzir = tabela2026 ? 394.16 : 381.44; }
      else if (baseIR > (tabela2026 ? 2428.80 : 2259.20)) { aliquota = 7.5; deduzir = tabela2026 ? 182.16 : 169.44; }
      irrf = Math.max(0, (baseIR * aliquota / 100) - deduzir);
      if (tabela2026) {
        const reducao = vb <= 5000
          ? irrf
          : vb <= 7350 ? Math.min(irrf, Math.max(0, 978.62 - (0.133145 * vb))) : 0;
        irrf = Math.max(0, irrf - reducao);
      }
      const liquido = Math.max(0, vb - inss - iss - irrf);
      return { inss, iss, deducao_dependentes: deducaoDep, base_calculo_irrf: baseIR, aliquota_irrf: aliquota, parcela_deduzir_irrf: deduzir, irrf, valor_liquido: liquido };
    }
    function validarRpa(r, exigirNome = true) {
      const nome = String(r._nome_prestador ?? r.nome_prestador ?? "").trim();
      const valores = [r._valor_bruto ?? r.valor_bruto, r._pensao_alimenticia ?? r.pensao_alimenticia, r._inss ?? r.inss, r._iss ?? r.iss].map(Number);
      const dependentes = Number(r._num_dependentes ?? r.num_dependentes);
      if (exigirNome && !nome) return "Nome do prestador obrigatório";
      if (valores.some((valor) => !Number.isFinite(valor) || valor < 0)) return "Valores do RPA não podem ser negativos";
      if (valores[0] <= 0) return "Valor bruto deve ser maior que zero";
      if (!Number.isInteger(dependentes) || dependentes < 0) return "Número de dependentes inválido";
      return null;
    }
    function campoRpa(r, nome) {
      return r[`_${nome}`] ?? r[nome];
    }
    if (fn === "rpas_listar") {
      const pagina = parseInt(args._pagina) || 1; const porPagina = Math.min(parseInt(args._por_pagina) || 50, 200);
      const offset = (pagina - 1) * porPagina;
      const busca = String(args._busca || "").trim();
      const params = []; let where = "";
      if (busca) { where = " WHERE (lower(nome_prestador) LIKE lower(?) OR lower(cpf_prestador) LIKE lower(?) OR lower(periodo_referencia) LIKE lower(?))"; params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`); }
      const total = db.prepare(`SELECT COUNT(*) AS c FROM rpas${where}`).get(...params).c;
      const rows = db.prepare(`SELECT * FROM rpas${where} ORDER BY criado_em DESC LIMIT ? OFFSET ?`).all(...params, porPagina, offset);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }
    if (fn === "rpas_calcular") {
      const erroValidacao = validarRpa(args, false);
      if (erroValidacao) return { data: null, error: { message: erroValidacao, code: "BAD_REQUEST" } };
      const tributos = calcularTributosRpa(args);
      return { data: tributos, error: null };
    }
    if (fn === "rpas_criar") {
      const erroValidacao = validarRpa(args);
      if (erroValidacao) return { data: null, error: { message: erroValidacao, code: "BAD_REQUEST" } };
      const tributos = calcularTributosRpa(args);
      const id = randomUUID(); const now = nowIso();
      db.prepare("INSERT INTO rpas (id,numero_rpa,nome_prestador,cpf_prestador,endereco_prestador,descricao_servico,periodo_referencia,carga_horaria,local_execucao,valor_bruto,num_dependentes,pensao_alimenticia,inss,iss,deducao_dependentes,base_calculo_irrf,aliquota_irrf,parcela_deduzir_irrf,irrf,valor_liquido,observacoes,data_emissao,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
        id, String(campoRpa(args, "numero_rpa")||""), String(campoRpa(args, "nome_prestador")||"").trim(), String(campoRpa(args, "cpf_prestador")||"").trim(), String(campoRpa(args, "endereco_prestador")||""), String(campoRpa(args, "descricao_servico")||""), String(campoRpa(args, "periodo_referencia")||""),
        String(campoRpa(args, "carga_horaria")||""), String(campoRpa(args, "local_execucao")||""), Number(campoRpa(args, "valor_bruto"))||0, Number(campoRpa(args, "num_dependentes"))||0, Number(campoRpa(args, "pensao_alimenticia"))||0,
        tributos.inss, tributos.iss, tributos.deducao_dependentes, tributos.base_calculo_irrf, tributos.aliquota_irrf, tributos.parcela_deduzir_irrf, tributos.irrf, tributos.valor_liquido,
        String(campoRpa(args, "observacoes")||""), String(campoRpa(args, "data_emissao")||""), now, now
      );
      return { data: { id, ...tributos }, error: null };
    }
    if (fn === "rpas_atualizar") {
      const id = String(args._id || ""); const existente = db.prepare("SELECT * FROM rpas WHERE id = ?").get(id);
      if (!existente) return { data: null, error: { message: "RPA não encontrado", code: "NOT_FOUND" } };
      const merged = { ...existente, ...args, id: undefined, _id: undefined, _caller: undefined, _username: undefined, _ip: undefined };
      const erroValidacao = validarRpa(merged);
      if (erroValidacao) return { data: null, error: { message: erroValidacao, code: "BAD_REQUEST" } };
      const tributos = calcularTributosRpa(merged); const now = nowIso();
      db.prepare("UPDATE rpas SET numero_rpa=?,nome_prestador=?,cpf_prestador=?,endereco_prestador=?,descricao_servico=?,periodo_referencia=?,carga_horaria=?,local_execucao=?,valor_bruto=?,num_dependentes=?,pensao_alimenticia=?,inss=?,iss=?,deducao_dependentes=?,base_calculo_irrf=?,aliquota_irrf=?,parcela_deduzir_irrf=?,irrf=?,valor_liquido=?,observacoes=?,data_emissao=?,atualizado_em=? WHERE id=?").run(
        String(campoRpa(args, "numero_rpa")??existente.numero_rpa), String(campoRpa(args, "nome_prestador")??existente.nome_prestador).trim(), String(campoRpa(args, "cpf_prestador")??existente.cpf_prestador).trim(),
        String(campoRpa(args, "endereco_prestador")??existente.endereco_prestador), String(campoRpa(args, "descricao_servico")??existente.descricao_servico), String(campoRpa(args, "periodo_referencia")??existente.periodo_referencia),
        String(campoRpa(args, "carga_horaria")??existente.carga_horaria), String(campoRpa(args, "local_execucao")??existente.local_execucao), Number(campoRpa(args, "valor_bruto")??existente.valor_bruto)||0,
        Number(campoRpa(args, "num_dependentes")??existente.num_dependentes)||0, Number(campoRpa(args, "pensao_alimenticia")??existente.pensao_alimenticia)||0,
        tributos.inss, tributos.iss, tributos.deducao_dependentes, tributos.base_calculo_irrf, tributos.aliquota_irrf, tributos.parcela_deduzir_irrf, tributos.irrf, tributos.valor_liquido,
        String(campoRpa(args, "observacoes")??existente.observacoes), String(campoRpa(args, "data_emissao")??existente.data_emissao), now, id
      );
      return { data: { ok: true, ...tributos }, error: null };
    }
    if (fn === "rpas_excluir") {
      if (!db.prepare("SELECT id FROM rpas WHERE id = ?").get(String(args._id||""))) return { data: null, error: { message: "RPA não encontrado", code: "NOT_FOUND" } };
      db.prepare("DELETE FROM rpas WHERE id = ?").run(String(args._id||""));
      return { data: { ok: true }, error: null };
    }

    // ── PRAZOS ─────────────────────────────────────────────────────────────────────
    if (fn === "prazos_listar") {
      const pagina = parseInt(args._pagina) || 1; const porPagina = Math.min(parseInt(args._por_pagina) || 100, 500);
      const offset = (pagina - 1) * porPagina;
      const resolvido = args._resolvido != null ? (args._resolvido === true || args._resolvido === "1" ? 1 : 0) : null;
      const categoria = String(args._categoria || "").trim(); const params = []; const wheres = [];
      if (resolvido !== null) { wheres.push("resolvido = ?"); params.push(resolvido); }
      if (categoria) { wheres.push("categoria = ?"); params.push(categoria); }
      const where = wheres.length ? "WHERE " + wheres.join(" AND ") : "";
      const total = db.prepare(`SELECT COUNT(*) AS c FROM prazos ${where}`).get(...params).c;
      const rows = db.prepare(`SELECT * FROM prazos ${where} ORDER BY data_limite ASC, criado_em DESC LIMIT ? OFFSET ?`).all(...params, porPagina, offset);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) }, error: null };
    }
    if (fn === "prazos_resumo") {
      const hoje = new Date().toISOString().slice(0,10); const daqSete = new Date(Date.now() + 7*86400000).toISOString().slice(0,10);
      const daqTrinta = new Date(Date.now() + 30*86400000).toISOString().slice(0,10);
      const vencidos = db.prepare("SELECT COUNT(*) AS c FROM prazos WHERE resolvido = 0 AND data_limite < ?").get(hoje).c;
      const urgentes = db.prepare("SELECT COUNT(*) AS c FROM prazos WHERE resolvido = 0 AND data_limite >= ? AND data_limite <= ?").get(hoje, daqSete).c;
      const atencao = db.prepare("SELECT COUNT(*) AS c FROM prazos WHERE resolvido = 0 AND data_limite > ? AND data_limite <= ?").get(daqSete, daqTrinta).c;
      const ok = db.prepare("SELECT COUNT(*) AS c FROM prazos WHERE resolvido = 1").get().c;
      return { data: { vencidos, urgentes, atencao, ok }, error: null };
    }
    if (fn === "prazos_criar") {
      const titulo = String(args._titulo || "").trim(); const dataLimite = String(args._data_limite || "").trim();
      if (!titulo || !dataLimite) return { data: null, error: { message: "titulo e data_limite obrigatórios", code: "BAD_REQUEST" } };
      const id = randomUUID(); db.prepare("INSERT INTO prazos (id, titulo, descricao, data_limite, categoria) VALUES (?, ?, ?, ?, ?)").run(id, titulo, String(args._descricao || ""), dataLimite, String(args._categoria || "geral"));
      return { data: { id }, error: null };
    }
    if (fn === "prazos_atualizar") {
      const id = String(args._id || ""); if (!db.prepare("SELECT id FROM prazos WHERE id = ?").get(id)) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      const fields = []; const params = [];
      if (args._titulo != null) { fields.push("titulo = ?"); params.push(String(args._titulo)); }
      if (args._descricao != null) { fields.push("descricao = ?"); params.push(String(args._descricao)); }
      if (args._data_limite != null) { fields.push("data_limite = ?"); params.push(String(args._data_limite)); }
      if (args._categoria != null) { fields.push("categoria = ?"); params.push(String(args._categoria)); }
      if (args._resolvido != null) { fields.push("resolvido = ?"); params.push(args._resolvido ? 1 : 0); }
      if (!fields.length) return { data: { ok: true }, error: null };
      fields.push("atualizado_em = datetime('now')");
      db.prepare(`UPDATE prazos SET ${fields.join(", ")} WHERE id = ?`).run(...params, id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "prazos_excluir") { db.prepare("DELETE FROM prazos WHERE id = ?").run(String(args._id || "")); return { data: { ok: true }, error: null }; }

    // ── IA ─────────────────────────────────────────────────────────────────────────
    if (fn === "ia_modelos_listar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const provider = String(args._provedor || "").trim().toLowerCase();
      if (!["openrouter", "qwen", "stepfun"].includes(provider)) return { data: null, error: { message: "Provedor inválido", code: "BAD_REQUEST" } };
      try {
        const { listarModelosIA } = await import("./services/ia-service.mjs");
        return { data: await listarModelosIA({ db, provider }), error: null };
      } catch (e) { return { data: null, error: { message: e.message || "Erro ao consultar modelos", code: "IA_MODELS_ERROR" } }; }
    }
    if (fn === "ia_chat") {
      const messages = args._messages;
      if (!messages || !Array.isArray(messages)) return { data: null, error: { message: "messages deve ser um array", code: "BAD_REQUEST" } };
      try {
        const { iaChat: iaChatFn } = await import("./services/ia-service.mjs");
        const result = await iaChatFn({ db, messages, model: args._model, temperatura: args._temperatura, maxTokens: args._max_tokens, cache: args._cache !== false });
        return { data: result, error: null };
      } catch (e) { return { data: null, error: { message: e.message || "Erro na IA", code: "IA_ERROR" } }; }
    }
    if (fn === "empenho_assistente_executar") {
      const acao = String(args._acao || "").trim(); const contexto = String(args._contexto || "");
      const prompts = {
        extrair_campos: { system:"Você é um assistente de empenho. Extraia os campos do documento. Responda JSON com: secretaria, fornecedor, tipo_despesa, finalidade, valor, competencia, processo, pregao, contrato, nota_fiscal, observacoes, pendencias.", user:contexto },
        gerar_descricao: { system:"Você redige descrições para notas de empenho da administração pública brasileira. Transforme exclusivamente as informações fornecidas em UMA descrição final, clara e tecnicamente adequada. A descrição deve: iniciar com 'PELA DESPESA EMPENHADA REFERENTE À'; especificar com objetividade o bem, serviço ou aquisição; incluir quantidade, período, local, finalidade, fornecedor ou referência contratual somente se estiverem nos dados; evitar termos vagos como 'DESPESAS DIVERSAS'; não inventar números, nomes, datas, processos, contratos, valores ou justificativas; usar linguagem impessoal, objetiva e CAIXA ALTA. Se algum dado não foi informado, simplesmente não o mencione. Retorne somente a descrição pronta, sem título, explicação, marcadores ou aspas.", user:`DADOS FORNECIDOS PELO USUÁRIO:\n${contexto}` },
        criar_checklist: { system:"Você é um conferente de empenhos. Responda JSON com resumo, itens, pendencias, prioridade.", user:contexto },
        melhorar_descricao: { system:"Você é um revisor de textos. Melhore a descrição mantendo CAIXA ALTA.", user:contexto },
        revisar_bundle: { system:"Você é um auditor. Analise os dados e gere parecer JSON com parecer, pontos_atencao, recomendacoes, status.", user:contexto },
        sugerir_opcoes: { system:"Sugira valores para campos faltantes. Responda JSON com sugestoes array de {campo, valor_sugerido, justificativa}.", user:contexto },
      };
      const p = prompts[acao];
      if (!p) return { data: null, error: { message: `Ação inválida: ${acao}`, code: "BAD_REQUEST" } };
      try {
        if (acao === "gerar_descricao") {
          const { iaChat } = await import("./services/ia-service.mjs");
          const result = await iaChat({ db, messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }], temperatura: 0.1, maxTokens: 512, cache: false });
          db.prepare("INSERT INTO logs_acao (modulo, acao, usuario, detalhes) VALUES ('empenho_assistente', ?, ?, ?)").run(acao, String(args._caller || ""), JSON.stringify({acao, modelo:result.model}).slice(0,500));
          return { data: { ...result, acao }, error: null };
        }
        const { iaChatJSON } = await import("./services/ia-service.mjs");
        const result = await iaChatJSON({ db, system: p.system, user: p.user, temperatura: 0.2 });
        db.prepare("INSERT INTO logs_acao (modulo, acao, usuario, detalhes) VALUES ('empenho_assistente', ?, ?, ?)").run(acao, String(args._caller || ""), JSON.stringify({acao, modelo:result.model}).slice(0,500));
        return { data: { ...result, acao }, error: null };
      } catch (e) { return { data: null, error: { message: e.message || "Erro", code: "IA_ERROR" } }; }
    }
    if (fn === "classificador_despesa_classificar") {
      const item = String(args._item || "").trim();
      if (!item) return { data: null, error: { message: "item obrigatório", code: "BAD_REQUEST" } };
      try {
        const { iaChatJSON } = await import("./services/ia-service.mjs");
        const result = await iaChatJSON({ db, system:"Você é um classificador de despesas públicas. Classifique o item. Responda JSON com: codigo_completo, grupo, modalidade, elemento, subelemento_codigo, subelemento_nome, justificativa, ponto_atencao, confianca.", user:`Item: ${item}`, temperatura:0.1 });
        db.prepare("INSERT INTO logs_acao (modulo, acao, usuario, detalhes) VALUES ('classificador', 'classificar', ?, ?)").run(String(args._caller||""), JSON.stringify({item, modelo:result.model}).slice(0,500));
        return { data: { ...result, item }, error: null };
      } catch (e) { return { data: null, error: { message: e.message || "Erro", code: "IA_ERROR" } }; }
    }
    if (fn === "kanban_ia_sugerir") {
      const acao = String(args._acao || "").trim(); const contexto = String(args._contexto || "");
      const prompts = {
        criar_tarefa: { system:"Crie uma tarefa Kanban. Responda JSON: {titulo, descricao, prioridade}.", user:contexto },
        melhorar_descricao: { system:"Melhore a descrição. Responda JSON: {descricao_melhorada}.", user:contexto },
        quebrar_tarefa: { system:"Quebre a tarefa. Responda JSON: {subtarefas: [{titulo, descricao}]}. Máx 5.", user:contexto },
        classificar: { system:"Classifique a tarefa. Responda JSON: {prioridade, categoria, sugestao}.", user:contexto },
        plano_acao: { system:"Gere plano de ação. Responda JSON: {plano: [{ordem, acao, prazo_sugerido}]}.", user:contexto },
        reescrever: { system:"Reescreva profissionalmente. Responda JSON: {titulo, descricao, observacoes}.", user:contexto },
      };
      const p = prompts[acao];
      if (!p) return { data: null, error: { message: `Ação inválida: ${acao}`, code: "BAD_REQUEST" } };
      try {
        const { iaChatJSON } = await import("./services/ia-service.mjs");
        const result = await iaChatJSON({ db, system: p.system, user: p.user, temperatura: 0.3 });
        db.prepare("INSERT INTO logs_acao (modulo, acao, usuario, detalhes) VALUES ('kanban_ia', ?, ?, ?)").run(acao, String(args._caller || ""), JSON.stringify({acao, modelo:result.model}).slice(0,500));
        return { data: { ...result, acao }, error: null };
      } catch (e) { return { data: null, error: { message: e.message || "Erro", code: "IA_ERROR" } }; }
    }

    // ── AUTENTIQUE ─────────────────────────────────────────────────────────────────
    if (fn === "autentique_envios_listar") {
      const callerU = obterUsuario(db, args._caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "autentique")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const rows = db.prepare("SELECT * FROM autentique_envios ORDER BY criado_em DESC LIMIT 100").all();
      return { data: rows, error: null };
    }
    if (fn === "autentique_tokens_listar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const rows = db.prepare("SELECT id, nome, ativo, ordem, ultimo_uso_em, ultimo_erro, criado_em, '••••' || substr(token, -4) AS token_mascarado FROM autentique_tokens ORDER BY ordem, criado_em").all();
      return { data: rows, error: null };
    }
    if (fn === "autentique_token_adicionar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const nome = String(args._nome || "").trim().slice(0, 80);
      const token = String(args._token || "").trim();
      if (!nome || token.length < 16 || token.length > 2048) return { data: null, error: { message: "Informe um nome e um token válido.", code: "BAD_REQUEST" } };
      try {
        const id = randomUUID();
        const ordem = Number(db.prepare("SELECT COALESCE(MAX(ordem), -1) + 1 AS proxima FROM autentique_tokens").get().proxima);
        db.prepare("INSERT INTO autentique_tokens (id, nome, token, ordem) VALUES (?, ?, ?, ?)").run(id, nome, token, ordem);
        return { data: { id, nome, ativo: true }, error: null };
      } catch (error) {
        return { data: null, error: { message: String(error?.message || "Token já cadastrado").includes("UNIQUE") ? "Este token já está cadastrado." : "Não foi possível salvar o token.", code: "TOKEN_SAVE_ERROR" } };
      }
    }
    if (fn === "autentique_token_alternar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const id = String(args._id || "");
      const ativo = args._ativo === true || args._ativo === 1 ? 1 : 0;
      const result = db.prepare("UPDATE autentique_tokens SET ativo = ?, atualizado_em = datetime('now') WHERE id = ?").run(ativo, id);
      if (!result.changes) return { data: null, error: { message: "Token não encontrado.", code: "NOT_FOUND" } };
      return { data: { ok: true }, error: null };
    }
    if (fn === "autentique_token_excluir") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const result = db.prepare("DELETE FROM autentique_tokens WHERE id = ?").run(String(args._id || ""));
      if (!result.changes) return { data: null, error: { message: "Token não encontrado.", code: "NOT_FOUND" } };
      return { data: { ok: true }, error: null };
    }
    if (fn === "autentique_token_testar") {
      const denied = exigeAdminConfig();
      if (denied) return denied;
      const row = db.prepare("SELECT token FROM autentique_tokens WHERE id = ?").get(String(args._id || ""));
      if (!row) return { data: null, error: { message: "Token não encontrado.", code: "NOT_FOUND" } };
      try {
        const { consultarContaComToken } = await import("./services/autentique.mjs");
        const conta = await consultarContaComToken(row.token);
        db.prepare("UPDATE autentique_tokens SET ultimo_erro = NULL WHERE id = ?").run(String(args._id || ""));
        return { data: conta, error: null };
      } catch (error) {
        db.prepare("UPDATE autentique_tokens SET ultimo_erro = ? WHERE id = ?").run(String(error?.message || error).slice(0, 500), String(args._id || ""));
        return { data: null, error: { message: error?.message || "Token inválido.", code: "TOKEN_TEST_ERROR" } };
      }
    }
    if (fn === "autentique_enviar") {
      return {
        data: null,
        error: {
          message:
            "Integração Autentique ainda não está ativa. Configure a API real em Administração > Configurações.",
          code: "NOT_IMPLEMENTED",
        },
      };
    }
    if (fn === "autentique_envio_sincronizar") {
      return {
        data: null,
        error: {
          message: "Sincronização Autentique indisponível (integração não implementada).",
          code: "NOT_IMPLEMENTED",
        },
      };
    }
    if (fn === "autentique_envio_excluir") { db.prepare("DELETE FROM autentique_envios WHERE id = ?").run(String(args._id || "")); return { data: { ok: true }, error: null }; }
    if (fn === "autentique_contatos_listar") {
      const rows = db.prepare("SELECT * FROM autentique_contatos ORDER BY nome").all(); return { data: rows, error: null };
    }
    if (fn === "autentique_contato_salvar") {
      const nome = String(args._nome || "").trim(); const phone = String(args._phone || "").trim();
      if (!nome || !phone) return { data: null, error: { message: "nome e phone obrigatórios", code: "BAD_REQUEST" } };
      try { const id = randomUUID(); db.prepare("INSERT INTO autentique_contatos (id, nome, phone) VALUES (?, ?, ?)").run(id, nome, phone); return { data: { id }, error: null }; }
      catch (e) { return { data: null, error: { message: "Contato já existe", code: "23505" } }; }
    }
    if (fn === "autentique_contato_excluir") { db.prepare("DELETE FROM autentique_contatos WHERE id = ?").run(String(args._id || "")); return { data: { ok: true }, error: null }; }

    // ── MURAL DE RECADOS ───────────────────────────────────────────────────────────
    if (fn === "mural_listar") {
      const rows = db.prepare("SELECT * FROM mural_recados ORDER BY criado_em DESC LIMIT 100").all();
      const stmt = db.prepare("SELECT COUNT(*) AS c FROM mural_comentarios WHERE recado_id = ?");
      for (const r of rows) r.comentarios = stmt.get(r.id).c;
      return { data: rows, error: null };
    }
    if (fn === "mural_criar") {
      const titulo = String(args._titulo || "").trim(); const conteudo = String(args._conteudo || "").trim();
      const autor = String(args._autor || args._caller || "Anônimo").trim();
      if (!titulo || !conteudo) return { data: null, error: { message: "titulo e conteudo obrigatórios", code: "BAD_REQUEST" } };
      const id = randomUUID(); db.prepare("INSERT INTO mural_recados (id, titulo, conteudo, autor, destinatario, prioridade, categoria, status, cor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, titulo, conteudo, autor, String(args._destinatario||"Todos"), String(args._prioridade||"media"), String(args._categoria||"tarefa"), String(args._status||"a_fazer"), String(args._cor||"yellow"));
      return { data: { id }, error: null };
    }
    if (fn === "mural_atualizar") {
      const id = String(args._id || ""); if (!db.prepare("SELECT id FROM mural_recados WHERE id = ?").get(id)) return { data: null, error: { message: "Não encontrado", code: "NOT_FOUND" } };
      const fields = []; const params = [];
      if (args._titulo != null) { fields.push("titulo = ?"); params.push(String(args._titulo)); }
      if (args._conteudo != null) { fields.push("conteudo = ?"); params.push(String(args._conteudo)); }
      if (args._status != null) { fields.push("status = ?"); params.push(String(args._status)); }
      if (args._prioridade != null) { fields.push("prioridade = ?"); params.push(String(args._prioridade)); }
      if (!fields.length) return { data: { ok: true }, error: null };
      fields.push("atualizado_em = datetime('now')");
      db.prepare(`UPDATE mural_recados SET ${fields.join(", ")} WHERE id = ?`).run(...params, id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "mural_excluir") { db.prepare("DELETE FROM mural_recados WHERE id = ?").run(String(args._id || "")); return { data: { ok: true }, error: null }; }
    if (fn === "mural_comentarios_listar") {
      const rows = db.prepare("SELECT * FROM mural_comentarios WHERE recado_id = ? ORDER BY criado_em").all(String(args._recado_id || ""));
      return { data: rows, error: null };
    }
    if (fn === "mural_comentario_criar") {
      const recadoId = String(args._recado_id || ""); const texto = String(args._texto || "").trim();
      if (!recadoId || !texto) return { data: null, error: { message: "recado_id e texto obrigatórios", code: "BAD_REQUEST" } };
      const autor = String(args._autor || args._caller || "Anônimo").trim();
      const id = randomUUID(); db.prepare("INSERT INTO mural_comentarios (id, recado_id, autor, texto) VALUES (?, ?, ?, ?)").run(id, recadoId, autor, texto);
      return { data: { id }, error: null };
    }
    if (fn === "mural_comentario_excluir") { db.prepare("DELETE FROM mural_comentarios WHERE id = ?").run(String(args._id || "")); return { data: { ok: true }, error: null }; }

    // ── PDF UTILS (legado) — processamento real é client-side via @cantoo/pdf-lib ──
    if (fn === "pdf_mesclar" || fn === "pdf_dividir" || fn === "pdf_proteger") {
      return {
        data: null,
        error: {
          message: "PDF Utils roda no navegador. Atualize a página se ainda usa a API antiga.",
          code: "GONE",
        },
      };
    }

    // ── EXPERTMONEY (Extratos Bancários) ──────────────────────────────────────────────
    if (fn === "em_contas_listar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const rows = db.prepare("SELECT * FROM em_contas ORDER BY nome").all();
      const saldos = db.prepare("SELECT conta_id, COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE -valor END), 0) AS saldo FROM em_transacoes GROUP BY conta_id").all();
      const saldoMap = Object.fromEntries(saldos.map(s => [s.conta_id, s.saldo]));
      for (const r of rows) r.saldo_calculado = (saldoMap[r.id] || 0) + (r.saldo_inicial || 0);
      return { data: rows, error: null };
    }
    if (fn === "em_conta_criar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const nome = String(args._nome || "").trim();
      if (!nome) return { data: null, error: { message: "nome obrigatório", code: "BAD_REQUEST" } };
      const id = randomUUID();
      db.prepare("INSERT INTO em_contas (id, nome, banco, tipo) VALUES (?, ?, ?, ?)").run(id, nome, String(args._banco || ""), String(args._tipo || "corrente"));
      return { data: { id }, error: null };
    }
    if (fn === "em_conta_atualizar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const fields = []; const params = [];
      if (args._nome != null) { fields.push("nome = ?"); params.push(String(args._nome)); }
      if (args._banco != null) { fields.push("banco = ?"); params.push(String(args._banco)); }
      if (args._tipo != null) { fields.push("tipo = ?"); params.push(String(args._tipo)); }
      if (args._ativo != null) { fields.push("ativo = ?"); params.push(args._ativo ? 1 : 0); }
      if (!fields.length) return { data: { ok: true }, error: null };
      db.prepare(`UPDATE em_contas SET ${fields.join(", ")} WHERE id = ?`).run(...params, id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "em_conta_excluir") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      db.exec("BEGIN");
      try {
        db.prepare("DELETE FROM em_transacoes WHERE conta_id = ?").run(id);
        db.prepare("DELETE FROM em_alertas WHERE conta_id = ?").run(id);
        db.prepare("DELETE FROM em_contas WHERE id = ?").run(id);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return { data: { ok: true }, error: null };
    }
    if (fn === "em_transacoes_listar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const contaId = String(args._conta_id || "");
      const pagina = parseInt(args._pagina) || 1;
      const porPagina = Math.min(parseInt(args._por_pagina) || 100, 500);
      const offset = (pagina - 1) * porPagina;
      const params = []; let where = "";
      if (contaId && contaId !== "all") { where = " WHERE conta_id = ?"; params.push(contaId); }
      const total = db.prepare(`SELECT COUNT(*) AS c FROM em_transacoes${where}`).get(...params).c;
      const rows = db.prepare(`SELECT * FROM em_transacoes${where} ORDER BY data DESC, criado_em DESC LIMIT ? OFFSET ?`).all(...params, porPagina, offset);
      const totais = db.prepare(`SELECT COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0) AS receitas, COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0) AS despesas FROM em_transacoes${where}`).get(...params);
      return { data: { rows, total, pagina, porPagina, totalPaginas: Math.ceil(total/porPagina), totais }, error: null };
    }
    if (fn === "em_transacao_criar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const contaId = String(args._conta_id || "");
      if (!contaId || !db.prepare("SELECT id FROM em_contas WHERE id = ?").get(contaId)) {
        return { data: null, error: { message: "Conta inválida", code: "BAD_REQUEST" } };
      }
      const id = randomUUID();
      db.prepare("INSERT INTO em_transacoes (id, conta_id, data, descricao, valor, tipo, categoria, documento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
        id, contaId, String(args._data || new Date().toISOString().slice(0,10)),
        String(args._descricao || ""), Number(args._valor) || 0,
        String(args._tipo || "despesa"), String(args._categoria || "outros"),
        String(args._documento || ""), String(args._observacoes || "")
      );
      return { data: { id }, error: null };
    }
    if (fn === "em_transacao_atualizar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "");
      const fields = []; const params = [];
      if (args._data != null) { fields.push("data = ?"); params.push(String(args._data)); }
      if (args._descricao != null) { fields.push("descricao = ?"); params.push(String(args._descricao)); }
      if (args._valor != null) { fields.push("valor = ?"); params.push(Number(args._valor)); }
      if (args._tipo != null) { fields.push("tipo = ?"); params.push(String(args._tipo)); }
      if (args._categoria != null) { fields.push("categoria = ?"); params.push(String(args._categoria)); }
      if (args._conciliado != null) { fields.push("conciliado = ?"); params.push(args._conciliado ? 1 : 0); }
      if (!fields.length) return { data: { ok: true }, error: null };
      db.prepare(`UPDATE em_transacoes SET ${fields.join(", ")} WHERE id = ?`).run(...params, id);
      return { data: { ok: true }, error: null };
    }
    if (fn === "em_transacao_excluir") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      db.prepare("DELETE FROM em_transacoes WHERE id = ?").run(String(args._id || ""));
      return { data: { ok: true }, error: null };
    }
    if (fn === "em_alertas_listar") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const contaId = String(args._conta_id || "");
      const params = []; let where = "";
      if (contaId) { where = " WHERE conta_id = ?"; params.push(contaId); }
      const rows = db.prepare(`SELECT * FROM em_alertas${where} ORDER BY criado_em DESC LIMIT 100`).all(...params);
      return { data: rows, error: null };
    }
    if (fn === "em_alerta_resolver") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      db.prepare("UPDATE em_alertas SET resolvido = 1 WHERE id = ?").run(String(args._id || ""));
      return { data: { ok: true }, error: null };
    }
    if (fn === "em_dashboard") {
      const callerU = db.prepare("SELECT id, ativo FROM usuarios WHERE username = ?").get(String(args._caller || ""));
      if (!callerU || !callerU.ativo) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const ano = String(args._ano || "");
      const whereAno = ano ? " WHERE strftime('%Y', data) = ?" : "";
      const paramsAno = ano ? [ano] : [];
      const totalContas = db.prepare("SELECT COUNT(*) AS c FROM em_contas WHERE ativo = 1").get().c;
      const totalTransacoes = db.prepare(`SELECT COUNT(*) AS c FROM em_transacoes${whereAno}`).get(...paramsAno).c;
      const totalReceitas = db.prepare(`SELECT COALESCE(SUM(valor),0) AS t FROM em_transacoes WHERE tipo='receita'${ano ? " AND strftime('%Y', data) = ?" : ""}`).get(...paramsAno).t;
      const totalDespesas = db.prepare(`SELECT COALESCE(SUM(valor),0) AS t FROM em_transacoes WHERE tipo='despesa'${ano ? " AND strftime('%Y', data) = ?" : ""}`).get(...paramsAno).t;
      const alertasPendentes = db.prepare("SELECT COUNT(*) AS c FROM em_alertas WHERE resolvido = 0").get().c;
      const porCategoria = db.prepare(`SELECT categoria, COUNT(*) AS qtd, SUM(valor) AS total FROM em_transacoes WHERE tipo='despesa'${ano ? " AND strftime('%Y', data) = ?" : ""} GROUP BY categoria ORDER BY total DESC LIMIT 10`).all(...paramsAno);
      return { data: { totalContas, totalTransacoes, totalReceitas, totalDespesas, alertasPendentes, porCategoria }, error: null };
    }

    // ── TELEGRAM ─────────────────────────────────────────────────────────────────
    if (fn === "telegram_rpa_get") {
      const caller = String(args._caller || "").trim();
      const callerU = obterUsuario(db, caller);
      if (!callerU?.ativo || !usuarioTemModulo(db, callerU, "rpas")) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const id = String(args._id || "").trim();
      const row = db.prepare("SELECT id, numero_rpa, nome_prestador, periodo_referencia, valor_bruto, valor_liquido, descricao_servico FROM rpas WHERE id = ?").get(id);
      if (!row) return { data: null, error: { message: "RPA não encontrado", code: "NOT_FOUND" } };
      return { data: row, error: null };
    }

    if (fn === "telegram_credor_mensal_atualizar") {
      const caller = String(args._caller || "").trim();
      const callerU = obterUsuario(db, caller);
      const hasModule = Boolean(callerU?.is_admin || (callerU && db
        .prepare("SELECT 1 FROM usuario_modulos WHERE usuario_id = ? AND modulo_id = ?")
        .get(callerU.id, "credores-fixos")));
      if (!callerU?.ativo || !hasModule) return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      const credorId = String(args._credor_id || "").trim();
      const ano = Number.parseInt(args._ano, 10);
      const mes = Number.parseInt(args._mes, 10);
      const status = String(args._status || "").trim().toLowerCase();
      const valor = Number(args._valor);
      const numeroEmpenho = String(args._numero_empenho || "").trim();
      const observacao = String(args._observacao || "").trim();
      if (!credorId || !Number.isInteger(ano) || ano < 2000 || ano > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) {
        return { data: null, error: { message: "Competência inválida", code: "BAD_REQUEST" } };
      }
      if (!["pendente", "empenhado"].includes(status)) {
        return { data: null, error: { message: "Status inválido", code: "BAD_REQUEST" } };
      }
      if (!Number.isFinite(valor) || valor < 0) {
        return { data: null, error: { message: "Valor inválido", code: "BAD_REQUEST" } };
      }
      if (numeroEmpenho.length > 80 || observacao.length > 500) {
        return { data: null, error: { message: "Texto muito longo", code: "BAD_REQUEST" } };
      }
      const credor = db.prepare("SELECT id FROM credores_fixos WHERE id = ?").get(credorId);
      if (!credor) return { data: null, error: { message: "Credor não encontrado", code: "NOT_FOUND" } };
      const existing = db.prepare("SELECT id FROM empenhos_mensais WHERE credor_id = ? AND ano = ? AND mes = ?").get(credorId, ano, mes);
      const now = nowIso();
      const empenhadoEm = status === "empenhado" ? now : null;
      if (existing) {
        db.prepare("UPDATE empenhos_mensais SET status = ?, valor = ?, numero_empenho = ?, observacao = ?, empenhado_em = ?, updated_at = ? WHERE id = ?")
          .run(status, valor, numeroEmpenho || null, observacao || null, empenhadoEm, now, existing.id);
      } else {
        const id = randomUUID();
        db.prepare("INSERT INTO empenhos_mensais (id, credor_id, ano, mes, status, valor, numero_empenho, observacao, empenhado_em, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(id, credorId, ano, mes, status, valor, numeroEmpenho || null, observacao || null, empenhadoEm, now, now);
      }
      const row = db.prepare("SELECT * FROM empenhos_mensais WHERE credor_id = ? AND ano = ? AND mes = ?").get(credorId, ano, mes);
      return { data: row, error: null };
    }

    if (fn === "telegram_gerar_codigo") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const targetUser = String(args._username || caller).trim().toLowerCase();
      const u = db
        .prepare("SELECT id, username, ativo FROM usuarios WHERE lower(username) = lower(?)")
        .get(targetUser);
      if (!u || !u.ativo) {
        return { data: null, error: { message: "Usuário inválido", code: "BAD_REQUEST" } };
      }
      db.prepare("UPDATE telegram_codigos SET usado = 1 WHERE usuario_id = ? AND usado = 0").run(u.id);
      const codigo = String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
      const expira = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      db.prepare(
        "INSERT INTO telegram_codigos (id, usuario_id, codigo, expira_em) VALUES (?, ?, ?, ?)",
      ).run(randomUUID(), u.id, codigo, expira);
      return { data: { codigo, expira_em: expira, username: u.username }, error: null };
    }

    if (fn === "telegram_consumir_codigo") {
      const codigo = String(args._codigo || "").trim();
      const chatId = String(args._chat_id || "").trim();
      const usernameTg = String(args._username_tg || "").trim() || null;
      if (!/^\d{6}$/.test(codigo) || !chatId) {
        return { data: null, error: { message: "Código ou chat inválido", code: "BAD_REQUEST" } };
      }
      const row = db
        .prepare(
          `SELECT c.id, c.usuario_id, u.username, u.is_admin, u.ativo
           FROM telegram_codigos c
           JOIN usuarios u ON u.id = c.usuario_id
           WHERE c.codigo = ? AND c.usado = 0 AND c.expira_em > datetime('now')`,
        )
        .get(codigo);
      if (!row || !row.ativo) {
        return { data: null, error: { message: "Código inválido ou expirado", code: "INVALID_CODE" } };
      }
      db.prepare("UPDATE telegram_codigos SET usado = 1 WHERE id = ?").run(row.id);
      db.prepare("UPDATE telegram_vinculos SET ativo = 0 WHERE chat_id = ? OR usuario_id = ?").run(
        chatId,
        row.usuario_id,
      );
      const id = randomUUID();
      db.prepare(
        `INSERT INTO telegram_vinculos (id, chat_id, usuario_id, username_tg, ativo, vinculado_em, ultimo_acesso)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      ).run(id, chatId, row.usuario_id, usernameTg);
      return {
        data: {
          username: row.username,
          is_admin: Boolean(row.is_admin),
          vinculo_id: id,
        },
        error: null,
      };
    }

    if (fn === "telegram_desvincular_chat") {
      const chatId = String(args._chat_id || "").trim();
      if (!chatId) return { data: null, error: { message: "chat_id obrigatório", code: "BAD_REQUEST" } };
      db.prepare("UPDATE telegram_vinculos SET ativo = 0 WHERE chat_id = ?").run(chatId);
      return { data: { ok: true }, error: null };
    }

    if (fn === "telegram_listar_vinculos") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const rows = db
        .prepare(
          `SELECT v.id, v.chat_id, v.username_tg, v.ativo, v.vinculado_em, v.ultimo_acesso,
                  u.username, u.is_admin
           FROM telegram_vinculos v
           JOIN usuarios u ON u.id = v.usuario_id
           ORDER BY v.vinculado_em DESC`,
        )
        .all();
      return {
        data: rows.map((r) => ({
          ...r,
          ativo: Boolean(r.ativo),
          is_admin: Boolean(r.is_admin),
        })),
        error: null,
      };
    }

    if (fn === "telegram_desvincular_id") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const id = String(args._id || "").trim();
      db.prepare("UPDATE telegram_vinculos SET ativo = 0 WHERE id = ?").run(id);
      return { data: { ok: true }, error: null };
    }

    if (fn === "telegram_status_runtime") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      try {
        const { getTelegramRuntimeStatus } = await import("./telegram/index.mjs");
        const status = getTelegramRuntimeStatus();
        const rowToken = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_token'").get();
        const rowEnabled = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_enabled'").get();
        const hasDbToken = Boolean(rowToken?.valor && String(rowToken.valor).trim());
        const hasEnvToken = Boolean(String(process.env.TELEGRAM_BOT_TOKEN || "").trim());
        const isDbEnabled = rowEnabled?.valor === "1";
        const isEnvEnabled = String(process.env.TELEGRAM_BOT_ENABLED || "").trim() === "1";
        const isEnabled = isDbEnabled || (rowEnabled?.valor !== "0" && isEnvEnabled);
        return {
          data: {
            ...status,
            hasToken: hasDbToken || hasEnvToken,
            tokenSource: hasDbToken ? "db" : hasEnvToken ? "env" : null,
            enabled: isEnabled,
          },
          error: null,
        };
      } catch (err) {
        const rowToken = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_token'").get();
        const rowEnabled = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_enabled'").get();
        const hasDbToken = Boolean(rowToken?.valor && String(rowToken.valor).trim());
        const hasEnvToken = Boolean(String(process.env.TELEGRAM_BOT_TOKEN || "").trim());
        const isDbEnabled = rowEnabled?.valor === "1";
        const isEnvEnabled = String(process.env.TELEGRAM_BOT_ENABLED || "").trim() === "1";
        const isEnabled = isDbEnabled || (rowEnabled?.valor !== "0" && isEnvEnabled);
        return {
          data: {
            running: false,
            botUsername: null,
            lastError: err?.message || null,
            hasToken: hasDbToken || hasEnvToken,
            tokenSource: hasDbToken ? "db" : hasEnvToken ? "env" : null,
            enabled: isEnabled,
          },
          error: null,
        };
      }
    }

    if (fn === "telegram_testar_token") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const token =
        String(args._token || "").trim() ||
        (() => {
          const row = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'telegram_bot_token'").get();
          return row ? String(row.valor || "").trim() : "";
        })() ||
        String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
      if (!token) return { data: null, error: { message: "Nenhum token fornecido ou configurado", code: "BAD_REQUEST" } };
      try {
        const { testTelegramToken } = await import("./telegram/index.mjs");
        const me = await testTelegramToken(token);
        return { data: me, error: null };
      } catch (e) {
        let msg = e.message || String(e);
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          msg = "Token inválido ou não autorizado pelo Telegram. Verifique se copiou corretamente do @BotFather.";
        }
        return { data: null, error: { message: msg, code: "TELEGRAM" } };
      }
    }

    if (fn === "telegram_reiniciar_bot") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      try {
        const tg = await import("./telegram/index.mjs");
        await tg.stopTelegramBot();
        const r = await tg.startTelegramBot({ db });
        return { data: r, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message || String(e), code: "TELEGRAM" } };
      }
    }

    if (fn === "telegram_salvar_config") {
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } };
      }
      const token = typeof args._token === "string" ? args._token.trim() : null;
      const enabled = args._enabled !== undefined ? (args._enabled === true || args._enabled === "1" ? "1" : "0") : null;
      const iniciar = Boolean(args._iniciar);

      if (token !== null && token !== "") {
        db.prepare("INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES ('telegram_bot_token', ?, datetime('now')) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em").run(token);
      }
      if (enabled !== null) {
        db.prepare("INSERT INTO configuracoes (chave, valor, atualizado_em) VALUES ('telegram_bot_enabled', ?, datetime('now')) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em").run(enabled);
      }

      if (iniciar) {
        try {
          const tg = await import("./telegram/index.mjs");
          await tg.stopTelegramBot();
          const r = await tg.startTelegramBot({ db });
          return { data: { ok: Boolean(r?.ok), username: r?.username || null, reason: r?.reason, error: r?.error }, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message || String(e), code: "TELEGRAM" } };
        }
      } else if (enabled === "0") {
        try {
          const tg = await import("./telegram/index.mjs");
          await tg.stopTelegramBot();
          return { data: { ok: true, stopped: true }, error: null };
        } catch (e) {
          return { data: null, error: { message: e.message || String(e), code: "TELEGRAM" } };
        }
      }

      return { data: { ok: true }, error: null };
    }

    if (fn === "telegram_dossie_fornecedor") {
      const cnpj = String(args._cnpj || "").replace(/\D/g, "");
      if (cnpj.length !== 14) {
        return { data: null, error: { message: "CNPJ inválido (deve conter 14 dígitos)", code: "BAD_REQUEST" } };
      }
      try {
        const { obterDossieFornecedor } = await import("./services/dossieFornecedor.mjs");
        const dossie = await obterDossieFornecedor(db, cnpj, {
          razaoSocial: args._razao_social || "",
          nomeFantasia: args._nome_fantasia || "",
          semCache: Boolean(args._sem_cache),
        });
        return { data: dossie, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message || String(e), code: "DOSSIE_ERROR" } };
      }
    }

    // ── BACKUP / SAÚDE DO SISTEMA ─────────────────────────────────────────────────
    if (fn === "backup_status" || fn === "backup_listar" || fn === "backup_criar" || fn === "backup_excluir" || fn === "backup_integridade" || fn === "backup_enviar_github") {
      const { createBackup, listBackups, getBackupStatus, deleteBackup, integrityCheck, publishBackupToGitHub } = await import("./backup.mjs");
      const caller = String(args._caller || "").trim();
      const adm = obterUsuario(db, caller);
      if (!adm || !adm.is_admin || !adm.ativo) {
        return { data: null, error: { message: "Acesso negado — apenas administradores", code: "FORBIDDEN" } };
      }
      try {
        if (fn === "backup_status") {
          return { data: getBackupStatus(), error: null };
        }
        if (fn === "backup_listar") {
          return { data: listBackups(), error: null };
        }
        if (fn === "backup_criar") {
          try {
            db.exec("PRAGMA wal_checkpoint(PASSIVE);");
          } catch {
            /* checkpoint opcional */
          }
          const result = createBackup();
          try {
            auditar(db, adm.id, "backup_criar", "backup", result.id, { bytes: result.bytes, files: result.files }, args._ip, args._request_id);
          } catch {
            /* auditoria best-effort */
          }
          return { data: result, error: null };
        }
        if (fn === "backup_enviar_github") {
          try {
            db.exec("PRAGMA wal_checkpoint(PASSIVE);");
          } catch {
            /* checkpoint opcional */
          }
          const backup = createBackup();
          const result = await publishBackupToGitHub(backup);
          try {
            auditar(db, adm.id, "backup_enviar_github", "backup", backup.id, { bytes: backup.bytes, branch: result.branch }, args._ip, args._request_id);
          } catch {
            /* auditoria best-effort */
          }
          return { data: result, error: null };
        }
        if (fn === "backup_excluir") {
          const result = deleteBackup(args._id);
          try {
            auditar(db, adm.id, "backup_excluir", "backup", result.id, null, args._ip, args._request_id);
          } catch {
            /* ignore */
          }
          return { data: result, error: null };
        }
        if (fn === "backup_integridade") {
          return { data: integrityCheck(db), error: null };
        }
      } catch (e) {
        return {
          data: null,
          error: {
            message: String(e?.message || e),
            code: e?.code || "BACKUP_ERROR",
          },
        };
      }
    }

    return { data: null, error: { message: `RPC desconhecida: ${fn}`, code: "UNKNOWN_RPC" } };
  } catch (err) {
    return { data: null, error: uniqueError(err) };
  }
}
