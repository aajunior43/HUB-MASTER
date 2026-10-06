import { randomUUID } from "node:crypto";
import { PORTAL_URL, chavePortalTransparencia } from "./transparencia.mjs";

const IBGE_INAJA = "4110300";

function digitos(v) {
  return String(v || "").replace(/\D/g, "");
}

function valor(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function consultarBeneficiosPorMunicipio(tipo, mesAno, codigoIbge = IBGE_INAJA, opcoes = {}) {
  const fetchImpl = opcoes.fetchImpl || fetch;
  const apiKey = opcoes.apiKey;
  if (!apiKey) {
    return null;
  }

  // rotas oficiais do Portal da Transparência:
  // /bolsa-familia-por-municipio?mesAno=YYYYMM&codigoIbge=4110300&pagina=1
  // /bpc-por-municipio?mesAno=YYYYMM&codigoIbge=4110300&pagina=1
  // /auxilio-brasil-por-municipio?mesAno=YYYYMM&codigoIbge=4110300&pagina=1
  const rota = tipo === "bpc"
    ? "bpc-por-municipio"
    : tipo === "auxilio-gas"
      ? "auxilio-gas-por-municipio"
      : "bolsa-familia-por-municipio";

  const url = `${PORTAL_URL}/${rota}?mesAno=${mesAno}&codigoIbge=${codigoIbge}&pagina=1`;

  try {
    const res = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "chave-api-dados": apiKey,
        "User-Agent": "Sistema-Prefeitura-Inaja/1.0",
      },
      signal: AbortSignal.timeout(opcoes.timeoutMs || 15_000),
    });
    if (!res.ok) {
      throw new Error(`Portal da Transparência respondeu HTTP ${res.status}`);
    }
    const json = await res.json();
    const rows = Array.isArray(json) ? json : json?.data || [];
    return rows[0] || null;
  } catch (e) {
    if (opcoes.ignorarErro) return null;
    throw e;
  }
}

export async function sincronizarBeneficiosSociais(db, opcoes = {}) {
  const apiKey = opcoes.apiKey !== undefined ? opcoes.apiKey : chavePortalTransparencia(db);
  if (!apiKey) {
    return {
      recebidos: 0,
      status: "parcial",
      erros: ["Chave do Portal da Transparência não configurada."],
    };
  }

  const tipos = ["bolsa-familia", "bpc", "auxilio-gas"];
  const d = new Date();
  const mesAtual = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  d.setMonth(d.getMonth() - 1);
  const mesAnterior = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const meses = opcoes.meses || [mesAtual, mesAnterior];

  let totalSalvo = 0;
  const erros = [];

  for (const mes of meses) {
    for (const tipo of tipos) {
      try {
        const item = await consultarBeneficiosPorMunicipio(tipo, mes, IBGE_INAJA, { ...opcoes, apiKey });
        if (item) {
          const quant = Number(item.quantidadeBeneficiados || item.quantidadeBeneficiarios || item.qtdeBeneficiarios || 0);
          const valTotal = valor(item.valor || item.valorTotal || item.valorBeneficio || 0);
          const municipioNome = String(item.municipio?.nomeIBGE || item.municipio || "INAJÁ").toUpperCase();
          const uf = String(item.municipio?.uf?.sigla || item.uf || "PR").toUpperCase();

          db.prepare("DELETE FROM beneficios_sociais WHERE mes_ano = ? AND tipo = ? AND codigo_ibge = ?").run(mes, tipo, IBGE_INAJA);

          const stmt = db.prepare(`
            INSERT INTO beneficios_sociais (
              id, mes_ano, tipo, codigo_ibge, municipio, uf,
              quantidade_beneficiarios, valor_total, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(randomUUID(), mes, tipo, IBGE_INAJA, municipioNome, uf, quant, valTotal, JSON.stringify(item));
          totalSalvo += 1;
        }
      } catch (e) {
        erros.push(`${tipo} (${mes}): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return {
    recebidos: totalSalvo,
    status: erros.length === 0 ? "sucesso" : totalSalvo > 0 ? "parcial" : "falha",
    erros,
  };
}
