// Lista modelos disponíveis para uma chave BYOK do cofre.
// Descriptografa a chave e consulta o endpoint /models do provedor.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    { name: 'AES-GCM', iv: b64decode(iv) }, key, b64decode(ciphertext),
  );
  return new TextDecoder().decode(pt);
}

type Provider = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'opencode';

// Modelos de CHAT (exclui embeddings, tts, whisper, image, moderation...).
function isChatModel(id: string): boolean {
  const s = id.toLowerCase();
  if (/(embedding|whisper|tts|audio|image|dall-e|moderation|realtime|search|vision-preview)/.test(s)) return false;
  return true;
}

async function listOpenAI(apiKey: string, baseUrl = 'https://api.openai.com/v1'): Promise<string[]> {
  const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const ids: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
  return ids.filter(isChatModel).sort();
}

async function listOpenRouter(apiKey: string): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return (data.data ?? []).map((m: { id: string }) => m.id).filter(isChatModel).sort();
}

async function listAnthropic(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return (data.data ?? []).map((m: { id: string }) => m.id).sort();
}

async function listGoogle(apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return (data.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m: { name: string }) => m.name.replace(/^models\//, ''))
    .filter(isChatModel)
    .sort();
}

async function listModels(provider: Provider, apiKey: string): Promise<string[]> {
  switch (provider) {
    case 'openai': return listOpenAI(apiKey);
    case 'openrouter': return listOpenRouter(apiKey);
    case 'anthropic': return listAnthropic(apiKey);
    case 'google': return listGoogle(apiKey);
    case 'opencode': return listOpenAI(apiKey, 'https://opencode.ai/zen/v1');
    default: throw new Error(`Provider não suportado: ${provider}`);
  }
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
    const { data: claims } = await supabase.auth.getClaims(token);
    if (!claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;
    const { provider, vault_item_id } = await req.json();
    if (!provider || !vault_item_id) throw new Error('provider e vault_item_id obrigatórios');

    const { data: item, error } = await admin
      .from('vault_items').select('ciphertext, iv')
      .eq('id', vault_item_id).eq('user_id', userId).single();
    if (error || !item) throw new Error('Chave não encontrada no cofre');
    const apiKey = await decryptValue(item.ciphertext, item.iv);
    const models = await listModels(provider as Provider, apiKey);
    return new Response(JSON.stringify({ models }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
