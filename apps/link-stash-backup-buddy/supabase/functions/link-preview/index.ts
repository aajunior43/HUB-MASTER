const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const decode = (value: string) => value
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

const meta = (html: string, key: string) => {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean);
};

function unsafeHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '::1' || host.endsWith('.local')
    || /^(127|10)\./.test(host) || /^192\.168\./.test(host)
    || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!req.headers.get('Authorization')?.startsWith('Bearer ')) throw new Error('Não autenticado');
    const { url: rawUrl } = await req.json();
    const url = new URL(String(rawUrl ?? ''));
    if (!['http:', 'https:'].includes(url.protocol) || unsafeHost(url.hostname)) throw new Error('URL não permitida');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'JR-Links-Preview/1.0', Accept: 'text/html' },
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) throw new Error('A página não é HTML');
    const html = (await response.text()).slice(0, 600_000);
    const title = meta(html, 'og:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const description = meta(html, 'og:description') || meta(html, 'description');
    const image = meta(html, 'og:image');
    return new Response(JSON.stringify({
      title: title ? decode(title.trim()).slice(0, 200) : null,
      description: description ? decode(description.trim()).slice(0, 500) : null,
      image: image ? new URL(image, response.url).toString() : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
