import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type HealthStatus = 'healthy' | 'broken' | 'redirected' | 'unknown';
type HealthResult = {
  link_id: string;
  status: HealthStatus;
  status_code: number | null;
  final_url: string | null;
  reason: string | null;
  latency_ms: number;
  checked_at: string;
};

function isUnsafeHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === 'localhost'
    || host === '0.0.0.0'
    || host === '::1'
    || host.endsWith('.local')
    || /^127\./.test(host)
    || /^10\./.test(host)
    || /^192\.168\./.test(host)
    || /^169\.254\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

async function inspectUrl(linkId: string, rawUrl: string): Promise<HealthResult> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  let current = new URL(rawUrl);
  if (!['http:', 'https:'].includes(current.protocol) || isUnsafeHost(current.hostname)) {
    return { link_id: linkId, status: 'unknown', status_code: null, final_url: null, reason: 'URL não permitida', latency_ms: 0, checked_at: checkedAt };
  }

  try {
    let redirected = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      let response: Response;
      try {
        response = await fetch(current, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: { 'User-Agent': 'JR-Links-Health/1.0' },
        });
        if (response.status === 405 || response.status === 403) {
          response = await fetch(current, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'User-Agent': 'JR-Links-Health/1.0', Range: 'bytes=0-1024' },
          });
        }
      } finally {
        clearTimeout(timer);
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) break;
        const next = new URL(location, current);
        if (!['http:', 'https:'].includes(next.protocol) || isUnsafeHost(next.hostname)) {
          throw new Error('Redirecionamento não permitido');
        }
        current = next;
        redirected = true;
        continue;
      }

      const healthy = response.status >= 200 && response.status < 400;
      return {
        link_id: linkId,
        status: healthy ? (redirected ? 'redirected' : 'healthy') : 'broken',
        status_code: response.status,
        final_url: current.toString(),
        reason: healthy ? null : `HTTP ${response.status}`,
        latency_ms: Date.now() - started,
        checked_at: checkedAt,
      };
    }
    throw new Error('Muitos redirecionamentos');
  } catch (error) {
    return {
      link_id: linkId,
      status: 'broken',
      status_code: null,
      final_url: current.toString(),
      reason: error instanceof Error ? error.message : 'Falha de rede',
      latency_ms: Date.now() - started,
      checked_at: checkedAt,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Não autenticado');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims?.sub) throw new Error('Sessão inválida');
    const userId = String(claims.claims.sub);
    const body = await req.json();
    const ids = Array.isArray(body?.link_ids)
      ? body.link_ids.map(String).slice(0, 50)
      : [];
    if (ids.length === 0) throw new Error('Selecione ao menos um link');

    const { data: links, error } = await supabase
      .from('links')
      .select('id,url')
      .eq('user_id', userId)
      .in('id', ids);
    if (error) throw error;

    const results: HealthResult[] = [];
    for (let i = 0; i < (links ?? []).length; i += 5) {
      results.push(...await Promise.all(
        (links ?? []).slice(i, i + 5).map((link) => inspectUrl(link.id, link.url)),
      ));
    }
    const rows = results.map((result) => ({ ...result, user_id: userId }));
    const { error: upsertError } = await supabase.from('link_health').upsert(rows, { onConflict: 'link_id' });
    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
