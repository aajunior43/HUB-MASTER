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
async function decryptValue(key: CryptoKey, ciphertext: string, iv: string): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64decode(iv) }, key, b64decode(ciphertext),
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
    const key = await getKey();

    const { data: vaultRows, error: vErr } = await admin
      .from('vault_items')
      .select('id, name, service, notes, ciphertext, iv, created_at, updated_at')
      .eq('user_id', userId);
    if (vErr) throw new Error(`vault_items: ${vErr.message}`);

    const { data: credRows, error: cErr } = await admin
      .from('site_credentials')
      .select('id, name, url, username, ciphertext, iv, created_at, updated_at')
      .eq('user_id', userId);
    if (cErr) throw new Error(`site_credentials: ${cErr.message}`);

    const vault_items = await Promise.all((vaultRows ?? []).map(async (r) => {
      let value = '';
      try { value = await decryptValue(key, r.ciphertext, r.iv); }
      catch (e) { value = `[erro ao decriptar: ${(e as Error).message}]`; }
      return { id: r.id, name: r.name, service: r.service, notes: r.notes, value, created_at: r.created_at, updated_at: r.updated_at };
    }));

    const site_credentials = await Promise.all((credRows ?? []).map(async (r) => {
      let password = '';
      try { password = await decryptValue(key, r.ciphertext, r.iv); }
      catch (e) { password = `[erro ao decriptar: ${(e as Error).message}]`; }
      return { id: r.id, name: r.name, url: r.url, username: r.username, password, created_at: r.created_at, updated_at: r.updated_at };
    }));

    return new Response(JSON.stringify({ vault_items, site_credentials }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
