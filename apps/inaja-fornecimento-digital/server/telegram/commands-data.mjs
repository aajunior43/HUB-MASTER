import { inlineKeyboard } from "./format.mjs";
import { consumeConfirmation, consumePageCallback, telegramInteractions } from "./interactions.mjs";
import { expiredConfirmation, confirmationPayload, temModulo } from "./commands-data-common.mjs";
import { cmdTarefas, executeTarefaMutation, handleTarefaCallback, handleTarefaInput } from "./commands-data-tarefas.mjs";
import { cmdMural, executeMuralMutation, handleMuralCallback, handleMuralInput } from "./commands-data-mural.mjs";
import { cmdPrazos, executePrazoMutation, handlePrazoCallback, handlePrazoInput } from "./commands-data-prazos.mjs";
import { cmdCalendario, executeCalendarioMutation, handleCalendarioCallback, handleCalendarioInput } from "./commands-data-calendario.mjs";
import { cmdCredoresFixos, cmdEmpenhos, cmdRpas, cmdSolicitacoes, executeFinancialMutation, handleFinancialCallback, handleFinancialInput } from "./commands-financial.mjs";

export { cmdTarefas } from "./commands-data-tarefas.mjs";
export { cmdMural } from "./commands-data-mural.mjs";
export { cmdPrazos, cmdPrazosResumo } from "./commands-data-prazos.mjs";
export { cmdCalendario } from "./commands-data-calendario.mjs";
export { cmdCnpj, cmdDocumentos, cmdRamais } from "./commands-data-misc.mjs";
export { cmdCredoresFixos, cmdEmpenhoGet, cmdEmpenhos, cmdExtrato, cmdRpas, cmdSolicitacoes } from "./commands-financial.mjs";

export async function handleDataInput(ctx, input) {
  if (!input?.ok || !String(input.kind || "").startsWith("tg4_")) return null;
  const handlers = [handleTarefaInput, handleMuralInput, handlePrazoInput, handleCalendarioInput, handleFinancialInput];
  for (const handler of handlers) {
    const result = handler(ctx, input);
    if (result) return result;
  }
  return { text: "Entrada expirada. Abra o menu novamente." };
}

export async function handleDataCallback(ctx, data) {
  if (data.startsWith("tg4p:")) return handlePageCallback(ctx, data);
  if (data.startsWith("tg4c:")) return handleConfirmCallback(ctx, data);
  const handlers = [handleTarefaCallback, handleMuralCallback, handlePrazoCallback, handleCalendarioCallback, handleFinancialCallback];
  for (const handler of handlers) {
    const result = await handler(ctx, data);
    if (result) return result;
  }
  return null;
}

async function handlePageCallback(ctx, data) {
  const page = consumePageCallback(telegramInteractions, ctx, data);
  if (!page.ok) return { text: "Página expirada. Abra o menu novamente.", edit: true };
  if (page.action === "tarefas") return cmdTarefas(ctx, page.page);
  if (page.action === "prazos") return cmdPrazos(ctx, page.page);
  if (page.action === "mural") return cmdMural(ctx, page.page);
  if (page.action === "calendario") return cmdCalendario(ctx, [], page.page);
  if (page.action === "fincred") return cmdCredoresFixos(ctx, page.page);
  if (page.action === "finemp") return cmdEmpenhos(ctx, page.page);
  if (page.action === "finrpa") return cmdRpas(ctx, page.page);
  if (page.action === "finsol") return cmdSolicitacoes(ctx, page.page);
  return { text: "Página expirada. Abra o menu novamente.", edit: true };
}

async function handleConfirmCallback(ctx, data) {
  const payload = confirmationPayload(data);
  const confirmation = consumeConfirmation(telegramInteractions, ctx, data);
  if (!confirmation.ok || confirmation.action !== "tg4") return expiredConfirmation();
  if (confirmation.decision === "cancel") return { text: "Operação cancelada.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
  if (!payload?.op) return expiredConfirmation();
  if (payload.moduleId && !temModulo(ctx, payload.moduleId)) return { text: `Sem permissão no módulo ${payload.moduleId}.` };
  return executeMutation(ctx, payload);
}

async function executeMutation(ctx, payload) {
  const handlers = [executeTarefaMutation, executeMuralMutation, executePrazoMutation, executeCalendarioMutation, executeFinancialMutation];
  for (const handler of handlers) {
    const result = await handler(ctx, payload);
    if (result) return result;
  }
  return { text: "Operação desconhecida.", edit: true, reply_markup: inlineKeyboard([]), skipLog: true };
}
