const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const QWEN_ENDPOINT_PADRAO = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const STEPFUN_ENDPOINT_PADRAO = "https://api.stepfun.ai/step_plan/v1/chat/completions";
const CACHE_TTL = 600_000; // 10 min

let _cache = new Map();
function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key, value) {
  if (_cache.size > 512) _cache.clear();
  _cache.set(key, { ts: Date.now(), value });
}

function extrairJson(texto) {
  const trimmed = texto.trim();
  // Tenta parse direto
  try { return JSON.parse(trimmed); } catch { /* fallback */ }
  // Tenta extrair ```json ... ```
  const m = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) try { return JSON.parse(m[1].trim()); } catch { /* fallback */ }
  // Tenta achar { } no texto
  const obj = trimmed.match(/\{[\s\S]*\}/);
  if (obj) try { return JSON.parse(obj[0]); } catch { /* fallback */ }
  return null;
}

function config(db, chave) {
  return String(db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave)?.valor || "").trim();
}

function endpointQwen(valor) {
  const informado = String(valor || QWEN_ENDPOINT_PADRAO).trim().replace(/\/+$/, "");
  const completo = informado.endsWith("/chat/completions") ? informado : `${informado}/chat/completions`;
  let url;
  try { url = new URL(completo); } catch { throw new Error("Endpoint do Qwen Cloud inválido."); }
  const hostPermitido = ["dashscope.aliyuncs.com", "dashscope-intl.aliyuncs.com", "dashscope-us.aliyuncs.com"].includes(url.hostname)
    || url.hostname.endsWith(".maas.aliyuncs.com");
  if (url.protocol !== "https:" || !hostPermitido || !url.pathname.endsWith("/chat/completions")) {
    throw new Error("Use um endpoint HTTPS oficial do Alibaba Cloud Model Studio.");
  }
  return url.toString();
}

function endpointStepFun(valor) {
  const informado = String(valor || STEPFUN_ENDPOINT_PADRAO).trim().replace(/\/+$/, "");
  const completo = informado.endsWith("/chat/completions") ? informado : `${informado}/chat/completions`;
  let url;
  try { url = new URL(completo); } catch { throw new Error("Endpoint da StepFun inválido."); }
  if (url.protocol !== "https:" || url.hostname !== "api.stepfun.ai" || !url.pathname.endsWith("/chat/completions")) {
    throw new Error("Use um endpoint HTTPS oficial da StepFun.");
  }
  return url.toString();
}

function resolverProvedor(db, model, provedorForcado) {
  const provedor = (provedorForcado || config(db, "api_ia_provedor") || process.env.IA_PROVIDER || "openrouter").toLowerCase();
  if (provedor === "qwen") {
    const apiKey = config(db, "api_qwen_key") || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || "";
    if (!apiKey) throw new Error("Chave do Qwen Cloud não configurada. Vá em Admin > Configurações.");
    return {
      nome: "Qwen Cloud",
      id: "qwen",
      apiKey,
      endpoint: endpointQwen(config(db, "api_qwen_endpoint") || process.env.QWEN_ENDPOINT),
      modelName: model || config(db, "api_qwen_modelo") || process.env.QWEN_MODEL || "qwen-plus",
    };
  }
  if (provedor === "stepfun") {
    const apiKey = config(db, "api_stepfun_key") || process.env.STEP_API_KEY || process.env.STEPFUN_API_KEY || "";
    if (!apiKey) throw new Error("Chave da StepFun não configurada. Vá em Admin > Configurações.");
    return {
      nome: "StepFun",
      id: "stepfun",
      apiKey,
      endpoint: endpointStepFun(config(db, "api_stepfun_endpoint") || process.env.STEPFUN_ENDPOINT),
      modelName: model || config(db, "api_stepfun_modelo") || process.env.STEPFUN_MODEL || "step-3.5-flash",
    };
  }
  if (provedor !== "openrouter") throw new Error("Provedor de IA inválido. Escolha OpenRouter, Qwen Cloud ou StepFun.");
  const apiKey = config(db, "api_openrouter_key") || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("Chave OpenRouter não configurada. Vá em Admin > Configurações.");
  return {
    nome: "OpenRouter",
    id: "openrouter",
    apiKey,
    endpoint: OPENROUTER_ENDPOINT,
    modelName: model || config(db, "api_openrouter_modelo") || "opencode-go/deepseek-v4-flash",
  };
}

export async function listarModelosIA({ db, provider }) {
  const provedor = resolverProvedor(db, undefined, provider);
  const endpointPrincipal = provedor.id === "openrouter"
    ? "https://openrouter.ai/api/v1/models?output_modalities=text"
    : provedor.endpoint.replace(/\/chat\/completions\/?$/, "/models");
  const endpoints = provedor.id === "stepfun" && endpointPrincipal.includes("/step_plan/v1/models")
    ? [endpointPrincipal, "https://api.stepfun.ai/v1/models"]
    : [endpointPrincipal];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    let resposta; let ultimoDetalhe = "";
    for (const endpoint of endpoints) {
      resposta = await fetch(endpoint, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provedor.apiKey}` },
        signal: ctrl.signal,
      });
      if (resposta.ok) break;
      ultimoDetalhe = await resposta.text().catch(() => "");
    }
    if (!resposta?.ok) {
      throw new Error(`${provedor.nome} ${resposta?.status || ""}: ${ultimoDetalhe.slice(0, 300)}`);
    }
    const json = await resposta.json();
    const itens = Array.isArray(json.data) ? json.data : [];
    const modelos = itens
      .filter((item) => item && typeof item.id === "string")
      .filter((item) => !Array.isArray(item.architecture?.output_modalities) || item.architecture.output_modalities.includes("text"))
      .filter((item) => provedor.id !== "stepfun" || !/(?:tts|speech|audio|asr|image-gen|video|music)/i.test(item.id))
      .map((item) => ({
        id: item.id,
        nome: String(item.name || item.id),
        contexto: Number(item.context_length || item.top_provider?.context_length || 0) || null,
        proprietario: item.owned_by ? String(item.owned_by) : null,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return { provider: provedor.id, modelos, total: modelos.length };
  } finally {
    clearTimeout(timer);
  }
}

export async function iaChat({ db, messages, model, temperatura = 0.3, maxTokens = 2048, cache = true }) {
  const provedor = resolverProvedor(db, model);
  const { apiKey, endpoint, modelName } = provedor;

  const cacheKey = cache ? JSON.stringify({ messages, provider: provedor.id, model: modelName }) : null;
  if (cache && cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached) return { ...cached, cached: true };
  }

  const body = {
    model: modelName,
    messages,
    temperature: temperatura,
    max_tokens: maxTokens,
  };

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(provedor.id === "openrouter" ? {
            "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://localhost",
            "X-Title": "Prefeitura Inajá",
          } : {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`${provedor.nome} ${res.status}: ${errBody.slice(0, 300)}`);
      }
      const d = await res.json();
      const text = d.choices?.[0]?.message?.content || "";
      const usage = d.usage || {};
      const result = { text, model: d.model || modelName, provider: provedor.id, usage, cached: false };
      if (cache && cacheKey) cacheSet(cacheKey, result);
      return result;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error(`Falha na comunicação com ${provedor.nome}`);
}

export async function iaChatJSON({ db, system, user, model, temperatura = 0.3, maxTokens = 2048 }) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const result = await iaChat({ db, messages, model, temperatura, maxTokens });
  const json = extrairJson(result.text);
  if (!json) throw new Error("Resposta da IA não contém JSON válido");
  return { ...result, json };
}
