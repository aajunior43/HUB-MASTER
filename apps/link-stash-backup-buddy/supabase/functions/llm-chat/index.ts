import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ---- crypto ----
async function getKey(): Promise<CryptoKey> {
  const master = Deno.env.get('VAULT_MASTER_KEY');
  if (!master) throw new Error('VAULT_MASTER_KEY not set');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(master));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function decryptValue(ciphertext: string, iv: string): Promise<string> {
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(iv) },
    key,
    b64decode(ciphertext),
  );
  return new TextDecoder().decode(pt);
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type Provider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'opencode';

async function callOpenAICompatible(
  baseUrl: string, apiKey: string, model: string, messages: ChatMessage[],
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...extraHeaders },
    body: JSON.stringify({ model, messages, stream: false }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content ?? '';
}

async function callAnthropic(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n') || undefined;
  const chat = messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: chat }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? '';
}

async function callGoogle(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const systemInstruction = messages.filter((m) => m.role === 'system').map((m) => ({ text: m.content }));
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(systemInstruction.length ? { systemInstruction: { parts: systemInstruction } } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

async function callLLM(provider: Provider, apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  switch (provider) {
    case 'openai': return callOpenAICompatible('https://api.openai.com/v1', apiKey, model, messages);
    case 'openrouter': return callOpenAICompatible('https://openrouter.ai/api/v1', apiKey, model, messages, {
      'HTTP-Referer': 'https://meuslinksjr.lovable.app', 'X-Title': 'Meus Links',
    });
    case 'anthropic': return callAnthropic(apiKey, model, messages);
    case 'google': return callGoogle(apiKey, model, messages);
    case 'opencode': return callOpenAICompatible('https://opencode.ai/zen/v1', apiKey, model, messages);
    default: throw new Error(`Provider não suportado: ${provider}`);
  }
}

// ---- Orquestração: delegação a sub-agentes ----
const ORCHESTRATOR_SYSTEM = `Você é um AGENTE ORQUESTRADOR. Antes de responder, decida se a tarefa do usuário se beneficia de ser dividida em subtarefas paralelas executadas por sub-agentes especializados.

RESPONDA APENAS EM JSON VÁLIDO, sem markdown, no formato:
{"subtasks":[{"role":"papel curto do sub-agente","task":"instrução completa e autocontida"}]}

Regras:
- Máximo 5 subtarefas. Cada uma independente (não pode depender do resultado de outra).
- Se a tarefa é simples/direta, retorne {"subtasks":[]} e o orquestrador responderá sozinho.
- Cada "task" deve ser autocontida (o sub-agente NÃO vê o histórico).`;

function extractJson(text: string): { subtasks: { role: string; task: string }[] } {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return { subtasks: [] };
  try {
    const parsed = JSON.parse(match[0]);
    const arr = Array.isArray(parsed?.subtasks) ? parsed.subtasks : [];
    return { subtasks: arr.filter((s: { role?: string; task?: string }) => s?.role && s?.task).slice(0, 5) };
  } catch { return { subtasks: [] }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const provider = body?.provider as Provider;
    const model = String(body?.model ?? '').trim();
    const vaultItemId = String(body?.vault_item_id ?? '').trim();
    const messages = body?.messages as ChatMessage[];
    const orchestrate: boolean = !!body?.orchestrate;

    if (!provider || !model || !vaultItemId || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('provider, model, vault_item_id e messages são obrigatórios');
    }
    if (messages.length > 100) throw new Error('Muitas mensagens');

    const { data: item, error: itemErr } = await admin
      .from('vault_items').select('ciphertext, iv')
      .eq('id', vaultItemId).eq('user_id', userId).single();
    if (itemErr || !item) throw new Error('Chave não encontrada no cofre');
    const apiKey = await decryptValue(item.ciphertext, item.iv);

    // --- modo simples ---
    if (!orchestrate) {
      const reply = await callLLM(provider, apiKey, model, messages);
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- modo orquestrador ---
    // 1) plano
    const planMessages: ChatMessage[] = [
      { role: 'system', content: ORCHESTRATOR_SYSTEM },
      ...messages.filter((m) => m.role !== 'system'),
    ];
    const planRaw = await callLLM(provider, apiKey, model, planMessages);
    const { subtasks } = extractJson(planRaw);

    // 2) sub-agentes em paralelo
    const subResults = await Promise.all(
      subtasks.map(async (s) => {
        try {
          const out = await callLLM(provider, apiKey, model, [
            { role: 'system', content: `Você é um sub-agente especializado: ${s.role}. Responda de forma direta, factual e concisa. Foque APENAS na tarefa recebida.` },
            { role: 'user', content: s.task },
          ]);
          return { role: s.role, task: s.task, result: out };
        } catch (e) {
          return { role: s.role, task: s.task, result: `[erro: ${(e as Error).message}]` };
        }
      }),
    );

    // 3) síntese (ou resposta direta se sem subtarefas)
    let reply: string;
    if (subResults.length === 0) {
      reply = await callLLM(provider, apiKey, model, messages);
    } else {
      const context = subResults
        .map((r, i) => `## Sub-agente ${i + 1} — ${r.role}\nTarefa: ${r.task}\n\nResultado:\n${r.result}`)
        .join('\n\n---\n\n');
      reply = await callLLM(provider, apiKey, model, [
        ...messages,
        { role: 'system', content: `Você delegou subtarefas para sub-agentes. Use os resultados abaixo para produzir a resposta final ao usuário. Sintetize com clareza, cite as contribuições quando útil, e não repita o raciocínio de delegação.\n\n${context}` },
      ]);
    }

    return new Response(JSON.stringify({ reply, subtasks: subResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
