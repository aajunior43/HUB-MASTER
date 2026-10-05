import { bold, code, formatBytes, inlineKeyboard } from "./format.mjs";
import { logTelegram } from "./session.mjs";
import { consumeConfirmation, createConfirmation, telegramInteractions } from "./interactions.mjs";
import {
  createBackup,
  createEncryptedBackupArchive,
  integrityCheck,
  listBackups,
  removeEncryptedBackupArchive,
} from "../backup.mjs";

const BACKUP_PASSWORD_KEY = "backup_telegram_senha";
const BACKUP_CONFIRM_TTL_MS = 120_000;

function expiredBackupConfirmation() {
  return { text: "Confirmação expirada. Abra Backup no menu novamente.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}

export function cmdBackupAsk(ctx) {
  if (!ctx.user?.isAdmin) return { text: "Apenas administradores." };
  const confirmation = createConfirmation(telegramInteractions, ctx, { action: "backup", prefix: "backup", ttlMs: BACKUP_CONFIRM_TTL_MS });
  return {
    text: "Criar o backup local e enviar o arquivo criptografado para esta conversa?",
    reply_markup: inlineKeyboard([[{ text: "Confirmar", data: confirmation.confirm }, { text: "Cancelar", data: confirmation.cancel }]]),
    edit: Boolean(ctx.callbackId),
  };
}

export async function handleBackupCallback(ctx, data) {
  const confirmation = consumeConfirmation(telegramInteractions, ctx, data);
  if (!confirmation.ok || confirmation.action !== "backup") return expiredBackupConfirmation();
  if (confirmation.decision === "cancel") return { text: "Backup cancelado.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  return deliverBackup(ctx);
}

async function deliverBackup(ctx) {
  if (!ctx.user?.isAdmin) return { text: "Apenas administradores." };
  let archive = null;
  const backupOps = ctx.backupOps || { createBackup, createEncryptedBackupArchive, removeEncryptedBackupArchive };
  try {
    const localBackup = backupOps.createBackup();
    const passwordRow = ctx.db.prepare("SELECT valor FROM configuracoes WHERE chave = ? AND length(trim(valor)) > 0").get(BACKUP_PASSWORD_KEY);
    const password = typeof passwordRow?.valor === "string" ? passwordRow.valor : "";
    if (!password) return { text: "Backup local criado, mas a senha do arquivo criptografado ainda não está configurada no Admin.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
    archive = await backupOps.createEncryptedBackupArchive({ password, id: localBackup.id });
    const delivery = await ctx.client.sendDocument(ctx.chatId, archive.path, { caption: `Backup ${localBackup.id} criptografado (AES-256).` });
    logTelegram(ctx.db, { chatId: ctx.chatId, usuarioId: ctx.user.usuarioId, comando: "backup_telegram_enviado", args: { messageId: delivery.messageId, document: delivery.document }, ok: true });
    return { text: `${bold("Backup enviado")}\nID: ${code(localBackup.id)}\nArquivo: ${code(archive.name)}\nTamanho: ${formatBytes(archive.bytes)}`, edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  } catch {
    return { text: "Não foi possível enviar o backup criptografado. O backup local foi preservado.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  } finally {
    if (archive) {
      try {
        backupOps.removeEncryptedBackupArchive(archive);
      } catch {}
    }
  }
}

export function cmdBackups(ctx) {
  if (!ctx.user?.isAdmin) return { text: "Apenas administradores." };
  const list = listBackups().slice(0, 10);
  if (!list.length) return { text: "Nenhum backup em data/backups/." };
  return { text: bold("Últimos backups") + "\n\n" + list.map((b, i) => `${i + 1}. ${code(b.id)} — ${formatBytes(b.bytes)}${b.hasDb ? " · db" : ""}${b.hasUploads ? " · uploads" : ""}`).join("\n") };
}

export function cmdIntegridade(ctx) {
  if (!ctx.user?.isAdmin) return { text: "Apenas administradores." };
  const r = integrityCheck(ctx.db);
  return { text: (r.ok ? "✅ Integridade OK" : "⚠️ Problemas no banco") + "\n" + r.messages.map((m) => code(m)).join("\n") };
}
