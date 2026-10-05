import { randomUUID } from "node:crypto";

const FNDE_DADOS_URL = "https://www.fnde.gov.br/olinda-ide/servico/DADOS_ABERTOS_SISTEMAS/versao/v1.0/odata";
const CNPJ_INAJA = "76970318000167";

function digitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function valor(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const FNDE_URLS = Object.freeze({
  portal: "https://www.fnde.gov.br/programas",
  liberacoes: "https://www.fnde.gov.br/programas/programas-do-livro/consultas/liberacao-de-recursos",
});

export function normalizarRepasseFnde(item) {
  const ano = Number(item?.Nu_Ano || item?.ano || item?.ano_exercicio || new Date().getFullYear());
  const programa = String(item?.Ds_Programa || item?.programa || item?.no_programa || "OUTROS").trim();
  const acao = String(item?.Ds_Acao || item?.acao || item?.no_acao || "").trim() || null;
  const entidade = String(item?.No_Entidade || item?.entidade || item?.no_razao_social || "PREFEITURA MUNICIPAL DE INAJA").trim();
  const cnpjEntidade = digitos(item?.Nu_Cgc_Entidade || item?.cnpj || CNPJ_INAJA) || CNPJ_INAJA;
  const escola = String(item?.No_Escola || item?.escola || "").trim() || null;
  const valorPago = valor(item?.Vl_Pago || item?.valor || item?.vl_total_pago || 0);
  const dataPagamento = String(item?.Dt_Pagamento || item?.data || item?.dt_ordem_bancaria || "").trim() || null;
  const numeroProcesso = String(item?.Nu_Processo || item?.processo || "").trim() || null;
  const ordemBancaria = String(item?.Nu_Ordem_Bancaria || item?.ordem_bancaria || "").trim() || null;

  return {
    id: randomUUID(),
    ano,
    programa,
    acao,
    numero_processo: numeroProcesso,
    entidade,
    cnpj_entidade: cnpjEntidade,
    escola,
    valor_pago: valorPago,
    data_pagamento: dataPagamento,
    numero_ordem_bancaria: ordemBancaria,
    raw_json: JSON.stringify(item),
  };
}

export async function consultarRepassesFnde(ano, opcoes = {}) {
  const fetchImpl = opcoes.fetchImpl || fetch;
  const anoConsulta = Number(ano) || new Date().getFullYear();
  const url = `${FNDE_DADOS_URL}/RepassesEducacaoBasica(Nu_Ano=${anoConsulta})?$format=json&$top=100`;

  try {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": "Sistema-Prefeitura-Inaja/1.0" },
      signal: AbortSignal.timeout(opcoes.timeoutMs || 15_000),
    });
    if (!res.ok) {
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        throw new Error(`Portal de Dados Abertos do FNDE temporariamente indisponível ou em manutenção (HTTP ${res.status}).`);
      }
      throw new Error(`FNDE respondeu HTTP ${res.status}`);
    }
    const contentType = String(res.headers?.get?.("content-type") || "");
    if (contentType.includes("text/html")) {
      throw new Error("Portal de Dados Abertos do FNDE exigiu autenticação interna ou retornou página não compatível.");
    }
    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("Formato de resposta inválido devolvido pelo servidor do FNDE.");
    }
    const rows = Array.isArray(json?.value) ? json.value : [];
    return rows.map(normalizarRepasseFnde);
  } catch (erro) {
    if (opcoes.ignorarErro) return [];
    throw erro;
  }
}

export async function sincronizarFnde(db, opcoes = {}) {
  const anos = opcoes.anos || [new Date().getFullYear(), new Date().getFullYear() - 1];
  let totalSalvo = 0;
  const erros = [];

  for (const ano of anos) {
    try {
      const repasses = await consultarRepassesFnde(ano, opcoes);
      if (repasses.length > 0) {
        db.prepare("DELETE FROM fnde_repasses WHERE ano = ?").run(ano);
        const stmt = db.prepare(`
          INSERT INTO fnde_repasses (
            id, ano, programa, acao, numero_processo, entidade, cnpj_entidade,
            escola, valor_pago, data_pagamento, numero_ordem_bancaria, raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const r of repasses) {
          stmt.run(
            r.id, r.ano, r.programa, r.acao, r.numero_processo, r.entidade,
            r.cnpj_entidade, r.escola, r.valor_pago, r.data_pagamento,
            r.numero_ordem_bancaria, r.raw_json
          );
          totalSalvo += 1;
        }
      }
    } catch (e) {
      erros.push(`Ano ${ano}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    recebidos: totalSalvo,
    status: erros.length === 0 ? "sucesso" : totalSalvo > 0 ? "parcial" : "falha",
    erros,
  };
}
