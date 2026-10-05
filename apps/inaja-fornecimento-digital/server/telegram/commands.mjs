import { bold, code, escHtml, formatBytes, inlineKeyboard, truncate } from "./format.mjs";
import { consumeInputRequest, createInputRequest, telegramInteractions, trustedTelegramRpc } from "./interactions.mjs";
import { getBackupStatus } from "../backup.mjs";
import { cmdBackupAsk, cmdBackups, cmdIntegridade, handleBackupCallback } from "./commands-backup.mjs";
import {
  cmdCalendario,
  cmdCnpj,
  cmdCredoresFixos,
  cmdDocumentos,
  cmdEmpenhoGet,
  cmdEmpenhos,
  cmdExtrato,
  cmdTarefas,
  cmdMural,
  cmdPrazos,
  cmdPrazosResumo,
  cmdRamais,
  cmdRpas,
  cmdSolicitacoes,
  handleDataCallback,
  handleDataInput,
} from "./commands-data.mjs";

const INPUT_TTL_MS = 120_000;

export async function handleCommand(ctx) {
  if (ctx.callbackData) return handleCallback(ctx, ctx.callbackData);
  const raw = (ctx.text || "").trim();
  if (!ctx.user && /^\d{6}$/.test(raw)) {
    const pairing = consumeInputRequest(telegramInteractions, ctx, raw, (value) => value);
    if (pairing.ok && pairing.kind === "pairing") return cmdVincular(ctx, [raw]);
  }
  if (ctx.user && raw !== "/start") {
    const input = consumeInputRequest(telegramInteractions, ctx, raw, (value) => value);
    if (input.ok) {
      const dataInput = await handleDataInput(ctx, input);
      if (dataInput) return dataInput;
      if (input.kind === "cnpj") return cmdCnpj(ctx, [input.value]);
      if (input.kind === "ramais_busca") return cmdRamais(ctx, input.value, 1);
      return cmdEmpenhoGet(ctx, [input.value]);
    }
  }
  return cmdMenu(ctx);
}

async function handleCallback(ctx, data) {
  if (data === "menu") return cmdMenu(ctx);
  if (data === "menu:vinculo") return cmdVinculoInfo(ctx);
  if (data === "menu:ajuda") return cmdAjuda(ctx);
  if (data === "menu:status") return cmdStatus(ctx);
  if (data === "menu:tarefas") return cmdTarefas(ctx);
  if (data === "menu:prazos") return cmdPrazos(ctx);
  if (data === "menu:prazos-resumo") return cmdPrazosResumo(ctx);
  if (data === "menu:mural") return cmdMural(ctx);
  if (data === "menu:empenhos") return cmdEmpenhos(ctx);
  if (data === "menu:empenho") return cmdPromptInput(ctx, "empenho");
  if (data === "menu:credores") return cmdCredoresFixos(ctx);
  if (data === "menu:cnpj") return cmdPromptInput(ctx, "cnpj");
  if (data === "menu:calendario") return cmdCalendario(ctx, []);
  if (data === "menu:extrato") return cmdExtrato(ctx);
  if (data === "menu:rpas") return cmdRpas(ctx);
  if (data === "menu:solicitacoes") return cmdSolicitacoes(ctx);
  if (data === "menu:documentos") return cmdDocumentos(ctx);
  if (data === "menu:ramais") return cmdRamais(ctx, "", 1);
  if (data === "menu:ramais:buscar") return cmdPromptInput(ctx, "ramais_busca");
  if (data.startsWith("menu:ramais:p:")) {
    const parts = data.slice("menu:ramais:p:".length).split(":");
    const pag = parseInt(parts[0], 10) || 1;
    const filtro = parts.slice(1).join(":");
    return cmdRamais(ctx, filtro, pag);
  }
  if (data === "menu:eu") return cmdEu(ctx);
  if (data === "menu:desvincular") return cmdDesvincular(ctx);
  if (data === "menu:backup") return cmdBackupAsk(ctx);
  if (data === "menu:backups") return cmdBackups(ctx);
  if (data === "menu:integridade") return cmdIntegridade(ctx);
  if (data.startsWith("backup:")) return handleBackupCallback(ctx, data);
  if (data.startsWith("tg4:") || data.startsWith("tg4p:") || data.startsWith("tg4c:")) {
    const handled = await handleDataCallback(ctx, data);
    if (handled) return handled;
  }
  if (data === "noop") return { text: null };
  return { text: "Ação expirada. Abra o menu novamente." };
}

function cmdMenu(ctx) {
  const rows = [
    [{ text: "Vínculo", data: "menu:vinculo" }, { text: "Status", data: "menu:status" }],
    [{ text: "Tarefas", data: "menu:tarefas" }, { text: "Prazos", data: "menu:prazos" }],
    [{ text: "Resumo prazos", data: "menu:prazos-resumo" }, { text: "Mural", data: "menu:mural" }],
    [{ text: "Ajuda", data: "menu:ajuda" }],
    [{ text: "Empenhos", data: "menu:empenhos" }, { text: "Consultar empenho", data: "menu:empenho" }],
    [{ text: "Credores fixos", data: "menu:credores" }, { text: "Extratos", data: "menu:extrato" }],
    [{ text: "Calendário", data: "menu:calendario" }, { text: "RPAs", data: "menu:rpas" }],
    [{ text: "Solicitações", data: "menu:solicitacoes" }, { text: "Documentos", data: "menu:documentos" }],
    [{ text: "Consultar CNPJ", data: "menu:cnpj" }, { text: "📞 Ramais", data: "menu:ramais" }],
  ];
  if (ctx.user?.isAdmin) {
    rows.push([{ text: "Backup", data: "menu:backup" }, { text: "Backups locais", data: "menu:backups" }]);
    rows.push([{ text: "Integridade", data: "menu:integridade" }]);
  }
  return {
    text: ctx.user ? `Olá, ${bold(ctx.user.username)}. Escolha uma opção:` : `${bold("Inajá Fornecimento Digital")}\n\nUse Vínculo para conectar sua conta e depois escolha uma opção.`,
    reply_markup: inlineKeyboard(rows),
    edit: Boolean(ctx.callbackId),
  };
}

function cmdVinculoInfo(ctx) {
  if (ctx.user) {
    return {
      text: `Vinculado como ${bold(ctx.user.username)}.`,
      edit: true,
      reply_markup: inlineKeyboard([[{ text: "Minha sessão", data: "menu:eu" }, { text: "Desvincular", data: "menu:desvincular" }], [{ text: "Voltar", data: "menu" }]]),
    };
  }
  createInputRequest(telegramInteractions, ctx, { kind: "pairing", fields: ["codigo"], ttlMs: INPUT_TTL_MS });
  return { text: "No Admin do sistema, gere o código Telegram e envie somente os seis dígitos nesta conversa.", edit: true, reply_markup: inlineKeyboard([[{ text: "Voltar", data: "menu" }]]) };
}

function cmdPromptInput(ctx, kind) {
  if (!ctx.user) return { text: "Vincule esta conversa pelo Admin do sistema." };
  createInputRequest(telegramInteractions, ctx, { kind, fields: [kind], ttlMs: INPUT_TTL_MS });
  const label = kind === "cnpj" ? "CNPJ" : kind === "ramais_busca" ? "nome do setor, pessoa ou número do ramal" : "identificador do empenho";
  return { text: `Envie somente o ${label} nesta conversa nos próximos dois minutos.`, edit: true, reply_markup: inlineKeyboard([[{ text: "Cancelar", data: "menu" }]]) };
}

function cmdAjuda(ctx) {
  return { text: `${bold("Como usar")}\n\nEscolha uma opção pelos botões do menu.\nVínculo conecta sua conta; Status mostra a saúde do sistema; os demais botões exibem os dados permitidos para seu perfil.`, reply_markup: inlineKeyboard([[{ text: "Voltar ao menu", data: "menu" }]]), edit: Boolean(ctx.callbackId) };
}

async function cmdVincular(ctx, args) {
  if (ctx.user) return { text: `Já vinculado como ${bold(ctx.user.username)}. Consulte sua conta pelo botão Vínculo no menu.` };
  const codigo = String(args[0] || "").trim();
  if (!/^\d{6}$/.test(codigo)) return { text: "Informe somente o código de seis dígitos gerado no Admin do sistema." };
  const r = await trustedTelegramRpc(ctx, "telegram_consumir_codigo", { _codigo: codigo, _chat_id: String(ctx.chatId), _username_tg: ctx.fromUsername || "" }, { allowUnlinked: true });
  if (r.error) return { text: `Falha: ${escHtml(r.error.message)}` };
  const menu = cmdMenu({ ...ctx, user: { username: r.data.username, isAdmin: r.data.is_admin } });
  return { ...menu, text: `✅ Vinculado como ${bold(r.data.username)}.\n\nEscolha uma opção pelos botões abaixo.` };
}

async function cmdDesvincular(ctx) {
  if (!ctx.user) return { text: "Nenhum vínculo ativo." };
  const r = await trustedTelegramRpc(ctx, "telegram_desvincular_chat", { _chat_id: String(ctx.chatId) });
  return r.error ? { text: escHtml(r.error.message) } : { text: "Vínculo removido. No Admin do sistema, gere um novo código para reconectar." };
}

function cmdEu(ctx) {
  if (!ctx.user) return { text: "Não vinculado. No Admin do sistema, gere um código para conectar esta conversa." };
  const mods = (ctx.modulos || []).length ? ctx.modulos.map((m) => code(m)).join(", ") : "(nenhum — admin vê tudo)";
  return { text: `${bold("Sessão")}\nUsuário: ${code(ctx.user.username)}\nAdmin: ${ctx.user.isAdmin ? "sim" : "não"}\nChat: ${code(ctx.chatId)}\nMódulos: ${mods}` };
}

function cmdStatus(ctx) {
  if (!ctx.user) return { text: "Vincule esta conversa pelo Admin do sistema para consultar o status." };
  try {
    const st = getBackupStatus();
    const last = st.backups.last;
    return { text: truncate(`${bold("Status do sistema")}\n\nSQLite: ${st.sqlite.exists ? formatBytes(st.sqlite.bytes) : "ausente"}\nUploads: ${st.uploads.files} arquivo(s) (${formatBytes(st.uploads.bytes)})\nBackups: ${st.backups.total} (${formatBytes(st.backups.bytes)})\nÚltimo backup: ${last ? code(last.id) : "nenhum"}\nBot: online`) };
  } catch (e) {
    return { text: `Erro status: ${escHtml(e.message)}` };
  }
}
