import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile?.(".env");

const AUTENTIQUE_URL = "https://api.autentique.com.br/v2/graphql";

export function normalizarTelefoneAutentique(valor) {
  const original = String(valor || "").trim();
  if (!original) return null;
  const internacional = original.startsWith("+") || original.startsWith("00");
  let digits = original.replace(/\D/g, "");
  if (original.startsWith("00")) digits = digits.slice(2);
  if (!internacional && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  else if (!internacional) return null;
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return `+${digits}`;
}

const CREATE_DOCUMENT = `
  mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!, $sandbox: Boolean!) {
    createDocument(document: $document, signers: $signers, file: $file, sandbox: $sandbox) {
      id
      name
      created_at
      files { original signed }
      signatures {
        public_id
        name
        email
        link { short_link }
      }
    }
  }
`;

const GET_ACCOUNT = `
  query CurrentAccount {
    me {
      id
      name
      email
      subscription {
        has_premium_features
        documents
        credits
      }
      organization { id uuid name }
    }
  }
`;

function getDocumentQuery(id) {
  return `
  query GetDocument {
    document(id: ${JSON.stringify(id)}) {
      id
      name
      message
      refusable
      sortable
      stop_on_rejected
      scrolling_required
      ignore_cpf
      deadline_at
      created_at
      files { original signed pades }
      signatures {
        public_id
        name
        email
        delivery_method
        action { name }
        user { name email phone }
        viewed { created_at }
        signed { created_at }
        rejected { created_at }
        link { short_link }
      }
    }
  }
`;
}

function graphqlError(payload, response) {
  const message = payload?.errors?.map((item) => item?.message).filter(Boolean).join("; ")
    || `A plataforma de assinatura respondeu com HTTP ${response.status}.`;
  const error = new Error(message);
  error.code = "AUTENTIQUE_API_ERROR";
  error.statusCode = response.status >= 500 ? 502 : response.status || 400;
  return error;
}

async function requestGraphql(body, token, fetchImpl = fetch) {
  const response = await fetchImpl(AUTENTIQUE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errors?.length) throw graphqlError(payload, response);
  return payload?.data;
}

function tokensDisponiveis(db, tokenId = null) {
  const cadastrados = db
    ? db.prepare("SELECT id, nome, token FROM autentique_tokens WHERE ativo = 1 ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, ultimo_uso_em IS NOT NULL, ultimo_uso_em, ordem, criado_em").all(tokenId || "")
      .map((item) => ({ id: item.id, nome: item.nome, valor: item.token }))
    : [];
  const ambiente = String(process.env.AUTENTIQUE_API_TOKEN || "").trim();
  if (ambiente) cadastrados.push({ id: "env", nome: "Token do servidor", valor: ambiente });
  return cadastrados;
}

function permiteRotacao(error) {
  const texto = String(error?.message || "").toLowerCase();
  return [401, 403, 429].includes(Number(error?.statusCode)) || /(rate.?limit|limite|quota|crédito|credito|credit|unauth|token|subscription|document.*limit)/i.test(texto);
}

async function comRotacao(db, operacao, tokenId = null) {
  const tokens = tokensDisponiveis(db, tokenId);
  if (!tokens.length) {
    const error = new Error("Nenhum token de assinatura ativo. Cadastre um token em Administração > Configurações.");
    error.code = "AUTENTIQUE_NOT_CONFIGURED";
    error.statusCode = 503;
    throw error;
  }
  let ultimoErro;
  for (let indice = 0; indice < tokens.length; indice++) {
    const token = tokens[indice];
    try {
      const resultado = await operacao(token.valor);
      if (db && token.id !== "env") db.prepare("UPDATE autentique_tokens SET ultimo_uso_em = datetime('now'), ultimo_erro = NULL WHERE id = ?").run(token.id);
      return { resultado, tokenId: token.id, tokenNome: token.nome };
    } catch (error) {
      ultimoErro = error;
      if (db && token.id !== "env") db.prepare("UPDATE autentique_tokens SET ultimo_erro = ? WHERE id = ?").run(String(error?.message || error).slice(0, 500), token.id);
      if (!permiteRotacao(error) || indice === tokens.length - 1) throw error;
    }
  }
  throw ultimoErro;
}

export function autentiqueConfigurado(db) {
  return tokensDisponiveis(db).length > 0;
}

export async function criarDocumentoAutentique({ db, nome, mensagem, signatarios, arquivo, mime, sandbox = false, opcoes = {} }, fetchImpl = fetch) {
  return comRotacao(db, async (token) => {
    const form = new FormData();
    form.append("operations", JSON.stringify({
      query: CREATE_DOCUMENT,
      variables: {
        document: {
          name: nome,
          message: mensagem || `Documento para assinatura: ${nome}`,
          whatsapp_template: "STANDARD",
          refusable: opcoes.refusable !== false,
          sortable: opcoes.sortable === true,
          stop_on_rejected: opcoes.stop_on_rejected === true,
          scrolling_required: opcoes.scrolling_required === true,
          ignore_cpf: opcoes.ignore_cpf === true,
          configs: {
            notification_finished: opcoes.notification_finished !== false,
            notification_signed: opcoes.notification_signed !== false,
          },
          locale: { country: "BR", language: "pt-BR" },
        },
        signers: signatarios.map((signatario) => signatario.canal === "whatsapp" || signatario.canal === "sms"
          ? { phone: normalizarTelefoneAutentique(signatario.phone) || signatario.phone, delivery_method: signatario.canal === "sms" ? "DELIVERY_METHOD_SMS" : "DELIVERY_METHOD_WHATSAPP", action: "SIGN" }
          : signatario.canal === "link" ? { name: signatario.nome, delivery_method: "DELIVERY_METHOD_LINK", action: "SIGN" }
            : { email: signatario.email, action: "SIGN" }),
        file: null,
        sandbox: Boolean(sandbox),
      },
    }));
    form.append("map", JSON.stringify({ file: ["variables.file"] }));
    form.append("file", new Blob([arquivo], { type: mime || "application/pdf" }), nome.endsWith(".pdf") ? nome : `${nome}.pdf`);
    const response = await fetchImpl(AUTENTIQUE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.errors?.length) throw graphqlError(payload, response);
    if (!payload?.data?.createDocument?.id) {
      const error = new Error("A plataforma não retornou o identificador do documento.");
      error.code = "AUTENTIQUE_INVALID_RESPONSE";
      error.statusCode = 502;
      throw error;
    }
    return payload.data.createDocument;
  });
}

export async function operarDocumentoAutentique({ db, tokenId, acao, documentoId, dados = {}, fetchImpl = fetch }) {
  return comRotacao(db, async (token) => {
    let query;
    let variables;
    if (acao === "editar") {
      query = `mutation UpdateDocument($id: UUID!, $document: UpdateDocumentInput!) { updateDocument(id: $id, document: $document) { id name message refusable sortable stop_on_rejected scrolling_required deadline_at created_at } }`;
      variables = { id: documentoId, document: dados };
    } else if (acao === "excluir") {
      query = `mutation DeleteDocument($id: UUID!) { deleteDocument(id: $id) }`;
      variables = { id: documentoId };
    } else if (acao === "assinar") {
      query = `mutation SignDocument($id: UUID!) { signDocument(id: $id) }`;
      variables = { id: documentoId };
    } else if (acao === "adicionar_signatario") {
      query = `mutation CreateSigner($documentId: UUID!, $signer: SignerInput!) { createSigner(document_id: $documentId, signer: $signer) { public_id name email delivery_method action { name } link { short_link } created_at } }`;
      variables = { documentId: documentoId, signer: dados };
    } else if (acao === "remover_signatario") {
      query = `mutation DeleteSigner($publicId: UUID!, $documentId: UUID!) { deleteSigner(public_id: $publicId, document_id: $documentId) }`;
      variables = { publicId: dados.public_id, documentId: documentoId };
    } else if (acao === "reenviar") {
      query = `mutation ResendSignatures($publicIds: [UUID!]!) { resendSignatures(public_ids: $publicIds) }`;
      variables = { publicIds: dados.public_ids };
    } else if (acao === "criar_link") {
      query = `mutation CreateSignatureLink($publicId: UUID!) { createLinkToSignature(public_id: $publicId) { short_link } }`;
      variables = { publicId: dados.public_id };
    } else if (acao === "mover_pasta") {
      query = `mutation MoveDocument($documentId: UUID!, $folderId: UUID, $currentFolderId: UUID) { moveDocumentToFolder(document_id: $documentId, folder_id: $folderId, current_folder_id: $currentFolderId) }`;
      variables = { documentId: documentoId, folderId: dados.folder_id || null, currentFolderId: dados.current_folder_id || null };
    } else {
      const error = new Error("Operação de documento inválida.");
      error.statusCode = 400;
      throw error;
    }
    return requestGraphql({ query, variables }, token, fetchImpl);
  }, tokenId);
}

export async function gerenciarPastasAutentique({ db, tokenId, acao, id, nome, fetchImpl = fetch }) {
  return comRotacao(db, async (token) => {
    let query;
    let variables = {};
    if (acao === "listar") {
      query = `query Folders { folders(limit: 60, page: 1, type: DEFAULT) { data { id name slug context path children_counter created_at updated_at } total } }`;
    } else if (acao === "criar") {
      query = `mutation CreateFolder($folder: FolderInput!) { createFolder(folder: $folder) { id name type created_at } }`;
      variables = { folder: { name: nome } };
    } else if (acao === "excluir") {
      query = `mutation DeleteFolder($id: UUID!) { deleteFolder(id: $id) }`;
      variables = { id };
    } else {
      const error = new Error("Operação de pasta inválida.");
      error.statusCode = 400;
      throw error;
    }
    return requestGraphql({ query, variables }, token, fetchImpl);
  }, tokenId);
}

export async function consultarDocumentoAutentique(id, { db, tokenId, fetchImpl = fetch } = {}) {
  const { resultado, ...tokenUsado } = await comRotacao(db, async (token) => {
    const data = await requestGraphql({ query: getDocumentQuery(id) }, token, fetchImpl);
    if (!data?.document) {
      const error = new Error("Documento não encontrado na plataforma de assinatura.");
      error.code = "AUTENTIQUE_DOCUMENT_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    return data.document;
  }, tokenId);
  return { documento: resultado, ...tokenUsado };
}

export async function consultarContaComToken(token, fetchImpl = fetch) {
  const data = await requestGraphql({ query: GET_ACCOUNT }, token, fetchImpl);
  if (!data?.me) throw new Error("Não foi possível identificar a conta vinculada ao token.");
  return data.me;
}

export async function consultarContasAutentique(db, fetchImpl = fetch) {
  const tokens = tokensDisponiveis(db);
  return Promise.all(tokens.map(async (token) => {
    try {
      const conta = await consultarContaComToken(token.valor, fetchImpl);
      return { tokenId: token.id, tokenNome: token.nome, conta, erro: null };
    } catch (error) {
      return { tokenId: token.id, tokenNome: token.nome, conta: null, erro: String(error?.message || error) };
    }
  }));
}

function documentoIdDoWebhook(payload) {
  const evento = payload?.event || payload;
  const dados = evento?.data || {};
  const objeto = dados?.object || dados;
  const documento = objeto?.document ?? dados?.document;
  if (typeof documento === "string") return documento;
  if (documento?.id) return documento.id;
  if (String(evento?.type || "").startsWith("document.")) return objeto?.id || dados?.id || null;
  return null;
}

export async function processarWebhookAutentique(db, payload) {
  const evento = payload?.event || payload;
  const tipo = String(evento?.type || "");
  const documentoId = documentoIdDoWebhook(payload);
  if (!documentoId) return { ignorado: true, motivo: "Documento não identificado" };
  const envio = db.prepare("SELECT * FROM autentique_envios WHERE autentique_id = ?").get(documentoId);
  if (!envio) return { ignorado: true, motivo: "Documento externo ao sistema" };
  if (tipo === "document.deleted") {
    db.prepare("UPDATE autentique_envios SET status = 'excluido', atualizado_em = ? WHERE id = ?").run(new Date().toISOString(), envio.id);
    return { atualizado: true, status: "excluido", envioId: envio.id };
  }
  if (tipo === "signature.delivery_failed") {
    db.prepare("UPDATE autentique_envios SET status = 'falha_entrega', atualizado_em = ? WHERE id = ?").run(new Date().toISOString(), envio.id);
    return { atualizado: true, status: "falha_entrega", envioId: envio.id };
  }
  const { documento, tokenId } = await consultarDocumentoAutentique(documentoId, { db, tokenId: envio.token_id });
  const status = tipo === "document.finished" ? "assinado" : statusDocumentoAutentique(documento);
  const link = documento.signatures?.find((item) => item?.link?.short_link)?.link?.short_link || envio.assinatura_link;
  db.prepare("UPDATE autentique_envios SET status = ?, assinatura_link = ?, token_id = ?, arquivo_original_url = ?, arquivo_assinado_url = ?, atualizado_em = ? WHERE id = ?")
    .run(status, link, tokenId, documento.files?.original || envio.arquivo_original_url, documento.files?.signed || envio.arquivo_assinado_url, new Date().toISOString(), envio.id);
  return { atualizado: true, status, envioId: envio.id };
}

export function statusDocumentoAutentique(documento) {
  const assinaturas = Array.isArray(documento?.signatures) ? documento.signatures : [];
  if (assinaturas.some((item) => item?.rejected?.created_at)) return "recusado";
  if (assinaturas.length > 0 && assinaturas.every((item) => item?.signed?.created_at)) return "assinado";
  if (assinaturas.some((item) => item?.signed?.created_at)) return "parcialmente_assinado";
  if (assinaturas.some((item) => item?.viewed?.created_at)) return "visualizado";
  return "aguardando_assinaturas";
}
