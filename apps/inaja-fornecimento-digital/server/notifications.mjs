// Camada de notificação abstrata do módulo de Gestão de Documentos.
//
// O projeto usa notificação in-app (polling) hoje. Para plugar e-mail no
// futuro, basta implementar um objeto que satisfaça `EmailProvider` (ex: com
// nodemailer) e trocar a instância exportada em `emailProvider`.
import { logger } from "./logger.mjs";

/**
 * @typedef {Object} EmailProvider
 * @property {(to: string, titulo: string, mensagem: string) => Promise<void>} send
 */

// Stub: não envia e-mail de fato. Se GD_EMAIL_FROM estiver definido no .env,
// registra no console (ponto de integração para SMTP real).
let transporter;
async function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GD_SMTP_HOST || !process.env.GD_EMAIL_FROM) return null;
  const nodemailer = (await import("nodemailer")).default;
  transporter = nodemailer.createTransport({
    host: process.env.GD_SMTP_HOST,
    port: Number(process.env.GD_SMTP_PORT || 587),
    secure: String(process.env.GD_SMTP_SECURE || "").toLowerCase() === "true",
    auth: process.env.GD_SMTP_USER ? { user: process.env.GD_SMTP_USER, pass: process.env.GD_SMTP_PASS } : undefined,
  });
  return transporter;
}

export const emailProvider = {
  /** @type {EmailProvider["send"]} */
  async send(to, titulo, mensagem) {
    const smtp = await getTransporter();
    if (!smtp) return;
    await smtp.sendMail({ from: process.env.GD_EMAIL_FROM, to, subject: titulo, text: mensagem });
  },
};

// Dispara webhooks configurados (fire-and-forget, fora da transação do RPC).
// Chamado via queueMicrotask para não bloquear a resposta da RPC.
export function dispararWebhooks(db, evento, payload) {
  try {
    const hooks = db
      .prepare("SELECT id, url FROM gd_webhooks WHERE evento = ? AND ativo = 1")
      .all(evento);
    for (const h of hooks) {
      fetch(h.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evento, payload }),
      }).then((response) => {
        if (!response.ok) logger.warn("webhook.delivery.rejected", { webhookId: h.id, event: evento, statusCode: response.status });
      }).catch((error) => logger.error("webhook.delivery.failed", { webhookId: h.id, event: evento, error }));
    }
  } catch (error) {
    logger.error("webhook.load.failed", { event: evento, error });
  }
}
