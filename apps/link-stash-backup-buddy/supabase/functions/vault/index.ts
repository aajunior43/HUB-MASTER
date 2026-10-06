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

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function encryptValue(plaintext: string) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return { ciphertext: b64encode(ct), iv: b64encode(iv.buffer) };
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
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const action = body?.action as string;

    if (action === 'create') {
      const { name, service, notes, value } = body;
      if (!name || !value) throw new Error('name e value obrigatórios');
      const { ciphertext, iv } = await encryptValue(String(value));
      const { data, error } = await admin.from('vault_items').insert({
        user_id: userId,
        name: String(name).slice(0, 200),
        service: service ? String(service).slice(0, 120) : null,
        notes: notes ? String(notes).slice(0, 2000) : null,
        ciphertext, iv,
      }).select('id, name, service, notes, created_at, updated_at').single();
      if (error) throw error;
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      const { id, name, service, notes, value } = body;
      if (!id) throw new Error('id obrigatório');
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = String(name).slice(0, 200);
      if (service !== undefined) patch.service = service ? String(service).slice(0, 120) : null;
      if (notes !== undefined) patch.notes = notes ? String(notes).slice(0, 2000) : null;
      if (value !== undefined && value !== '') {
        const enc = await encryptValue(String(value));
        patch.ciphertext = enc.ciphertext;
        patch.iv = enc.iv;
      }
      const { data, error } = await admin.from('vault_items')
        .update(patch).eq('id', id).eq('user_id', userId)
        .select('id, name, service, notes, created_at, updated_at').single();
      if (error) throw error;
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reveal') {
      const { id } = body;
      if (!id) throw new Error('id obrigatório');
      const { data, error } = await admin.from('vault_items')
        .select('ciphertext, iv').eq('id', id).eq('user_id', userId).single();
      if (error) throw error;
      const value = await decryptValue(data.ciphertext, data.iv);
      return new Response(JSON.stringify({ value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'site.create') {
      const { name, url, username, password } = body;
      if (!name || !password) throw new Error('name e password obrigatórios');
      const { ciphertext, iv } = await encryptValue(String(password));
      const { data, error } = await admin.from('site_credentials').insert({
        user_id: userId,
        name: String(name).slice(0, 200),
        url: url ? String(url).slice(0, 500) : null,
        username: username ? String(username).slice(0, 200) : null,
        ciphertext, iv,
      }).select('id, name, url, username, created_at, updated_at').single();
      if (error) throw error;
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'site.update') {
      const { id, name, url, username, password } = body;
      if (!id) throw new Error('id obrigatório');
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = String(name).slice(0, 200);
      if (url !== undefined) patch.url = url ? String(url).slice(0, 500) : null;
      if (username !== undefined) patch.username = username ? String(username).slice(0, 200) : null;
      if (password !== undefined && password !== '') {
        const enc = await encryptValue(String(password));
        patch.ciphertext = enc.ciphertext;
        patch.iv = enc.iv;
      }
      const { data, error } = await admin.from('site_credentials')
        .update(patch).eq('id', id).eq('user_id', userId)
        .select('id, name, url, username, created_at, updated_at').single();
      if (error) throw error;
      return new Response(JSON.stringify({ item: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'site.reveal') {
      const { id } = body;
      if (!id) throw new Error('id obrigatório');
      const { data, error } = await admin.from('site_credentials')
        .select('ciphertext, iv').eq('id', id).eq('user_id', userId).single();
      if (error) throw error;
      const value = await decryptValue(data.ciphertext, data.iv);
      return new Response(JSON.stringify({ value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
