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
    { name: 'AES-GCM', iv: b64decode(iv) }, key, b64decode(ciphertext),
  );
  return new TextDecoder().decode(pt);
}

// ---- Perplexity ----
type PplxMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type Citation = string | { url?: string; title?: string };

async function pplx(apiKey: string, model: string, messages: PplxMessage[], extra: Record<string, unknown> = {}) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, ...extra }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.error || `HTTP ${res.status}`);
  const content: string = data.choices?.[0]?.message?.content ?? '';
  const citations: Citation[] = data.citations ?? data.search_results ?? [];
  return { content, citations };
}

function extractJsonArray(text: string): string[] {
  const cleaned = text.replace(/```json\s*|\s*```/g, '');
  const m = cleaned.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const arr = JSON.parse(m[0]);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x.trim()).slice(0, 6) : [];
  } catch { return []; }
}

function dedupeCitations(all: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of all) {
    const url = typeof c === 'string' ? c : c?.url ?? '';
    const key = url || JSON.stringify(c);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
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
    const query = String(body?.query ?? '').trim();
    const vaultItemId = String(body?.vault_item_id ?? '').trim();
    const mode = (body?.mode as string) || 'deep';
    const recency = body?.recency as string | undefined;
    const area = (body?.area as string) || 'geral';
    const language = (body?.language as string) || 'pt-BR';
    const minSources = Math.max(1, Math.min(30, Number(body?.min_sources) || 6));
    const preferOfficial = !!body?.prefer_official;
    const preferPdf = !!body?.prefer_pdf;
    const domains: string[] = Array.isArray(body?.domains)
      ? body.domains.map((d: unknown) => String(d).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter(Boolean).slice(0, 10)
      : [];
    const followupContext = String(body?.followup_context ?? '').trim().slice(0, 12000);

    if (!query || !vaultItemId) throw new Error('query e vault_item_id obrigatórios');
    if (query.length > 4000) throw new Error('query muito longa');

    const { data: item, error: itemErr } = await admin
      .from('vault_items').select('ciphertext, iv')
      .eq('id', vaultItemId).eq('user_id', userId).single();
    if (itemErr || !item) throw new Error('Chave Perplexity não encontrada no cofre');
    const apiKey = await decryptValue(item.ciphertext, item.iv);

    const searchExtra: Record<string, unknown> = {};
    if (recency) searchExtra.search_recency_filter = recency;
    if (domains.length > 0) searchExtra.search_domain_filter = domains;

    const areaHint: Record<string, string> = {
      geral: 'temas gerais',
      juridica: 'temas jurídicos (priorize legislação, jurisprudência, doutrina e fontes oficiais como planalto.gov.br, stf.jus.br, stj.jus.br)',
      cientifica: 'temas científicos (priorize artigos peer-reviewed, PubMed, Nature, Science, arXiv, Scielo)',
      saude: 'temas de saúde (priorize OMS, Ministério da Saúde, Anvisa, UpToDate, artigos revisados)',
      financeira: 'temas financeiros (priorize CVM, BCB, SEC, relatórios de empresas, Bloomberg, Reuters)',
      politica: 'temas políticos (contraste múltiplas fontes, separe fatos de opiniões)',
      tecnologia: 'temas de tecnologia (priorize docs oficiais, RFCs, papers, changelogs)',
      administracao_publica: 'administração pública (priorize diários oficiais, portais gov.br, TCU, CGU)',
    };

    const rules = `REGRAS DE TRANSPARÊNCIA E RIGOR (obrigatórias):
- Área: ${areaHint[area] ?? 'temas gerais'}.
- Idioma do relatório: ${language}. Fontes podem estar em outros idiomas.
- Meta mínima de fontes distintas: ${minSources}.
${preferOfficial ? '- PRIORIZE fortemente fontes oficiais, primárias, governamentais, acadêmicas e institucionais.\n' : ''}${preferPdf ? '- Quando possível, PRIORIZE documentos PDF (leis, papers, relatórios).\n' : ''}${domains.length ? `- Priorize preferencialmente estes domínios: ${domains.join(', ')}.\n` : ''}- NUNCA invente links, dados, leis, números, nomes ou citações.
- NUNCA cite fontes que não foram efetivamente consultadas.
- Se faltar dado, escreva "Dados insuficientes" — não preencha lacunas com suposições.
- Separe claramente FATO / INTERPRETAÇÃO / ESTIMATIVA / OPINIÃO.
- Aponte divergências entre fontes; não as oculte.
- Informe o grau de confiança (Alto/Médio/Baixo) das conclusões-chave.
- Em temas médicos, jurídicos, financeiros ou administrativos, inclua ao final um aviso recomendando conferir as fontes e consultar um profissional.`;

    // --- Quick e Reasoning: chamada única ---
    if (mode === 'quick' || mode === 'reasoning') {
      const model = mode === 'quick' ? 'sonar' : 'sonar-reasoning-pro';
      const sys = `Você é um pesquisador rigoroso. Responda em ${language}, em markdown estruturado com seções (## Resumo Executivo, ## Resposta Direta, ## Contexto, ## Principais Descobertas, ## Fontes), citando inline como [1][2].\n\n${rules}`;
      const userMsg = followupContext
        ? `CONTEXTO DA PESQUISA ANTERIOR:\n${followupContext}\n\n---\n\nPERGUNTA COMPLEMENTAR: ${query}`
        : query;
      const { content, citations } = await pplx(apiKey, model, [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ], searchExtra);
      return new Response(JSON.stringify({ content, citations, model, steps: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // --- Deep: pipeline plan → parallel search → synthesize ---
    const planSubject = followupContext
      ? `CONTEXTO PRÉVIO:\n${followupContext}\n\n---\nPERGUNTA COMPLEMENTAR: ${query}`
      : query;

    const plan = await pplx(apiKey, 'sonar', [
      { role: 'system', content: `Você é um planejador de pesquisa. Decomponha o tópico em 4 a 6 sub-perguntas específicas, complementares e independentes que juntas cubram o assunto com profundidade. Considere a área: ${areaHint[area] ?? 'geral'}. Retorne APENAS um array JSON de strings, sem markdown, sem comentários. Exemplo: ["pergunta 1","pergunta 2"]` },
      { role: 'user', content: planSubject },
    ]);
    let subQueries = extractJsonArray(plan.content);
    if (subQueries.length === 0) subQueries = [query];

    const subResults = await Promise.all(
      subQueries.map(async (q) => {
        try {
          const r = await pplx(apiKey, 'sonar', [
            { role: 'system', content: `Pesquisador focado em ${areaHint[area] ?? 'temas gerais'}. Responda em ${language}, direto ao ponto, com fatos, números e datas quando possível. Máx. 450 palavras. Cite inline [1][2]. Nunca invente dados.` },
            { role: 'user', content: q },
          ], searchExtra);
          return { question: q, answer: r.content, citations: r.citations };
        } catch (e) {
          return { question: q, answer: `[erro: ${(e as Error).message}]`, citations: [] as Citation[] };
        }
      }),
    );

    const allCitations = dedupeCitations(subResults.flatMap((s) => s.citations));

    const context = subResults
      .map((s, i) => `### Sub-pergunta ${i + 1}: ${s.question}\n\n${s.answer}`)
      .join('\n\n---\n\n');

    const synthesis = await pplx(apiKey, 'sonar-reasoning-pro', [
      { role: 'system', content: `Você é um analista sênior produzindo um RELATÓRIO DE PESQUISA PROFUNDA em ${language}. Use as descobertas dos sub-agentes abaixo como matéria-prima principal, complemente com busca web quando necessário e produza um relatório extenso, rigoroso e bem estruturado em markdown com esta estrutura EXATA:

# {Título}
## 🎯 Resumo Executivo
(3-5 bullets com as descobertas-chave)
## ✅ Resposta Direta
## 📌 Contextualização
## 🧪 Metodologia
(como a pesquisa foi conduzida, ferramentas, filtros aplicados)
## 🔍 Principais Descobertas
(sub-seções por tema, com bullets, dados, exemplos e citações inline [1][2])
## 📊 Dados Relevantes
## ⚖️ Comparação entre Fontes
## ❗ Divergências Encontradas
## 🧠 Análise Crítica
(prós/contras, controvérsias, lacunas, vieses das fontes; separe FATO/INTERPRETAÇÃO/ESTIMATIVA/OPINIÃO)
## 🧭 Conclusão
## 🎯 Grau de Confiança
(Alto / Médio / Baixo — justifique)
## ⚠️ Limitações
## 🚀 Recomendações
## 📚 Fontes Consultadas
(liste todas com [n] Título — domínio — data quando possível)

${rules}` },
      { role: 'user', content: `TÓPICO ORIGINAL: ${query}\n\n---\n\nDESCOBERTAS DOS SUB-AGENTES:\n\n${context}` },
    ], searchExtra);

    const finalCitations = dedupeCitations([...synthesis.citations, ...allCitations]);


    return new Response(JSON.stringify({
      content: synthesis.content,
      citations: finalCitations,
      model: 'sonar-deep-research (pipeline)',
      steps: subResults.map((s) => ({ role: s.question, task: s.question, result: s.answer })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
