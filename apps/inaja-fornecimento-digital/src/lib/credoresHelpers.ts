import { MESES, MESES_NOMES, type EmpenhoMensal } from "@/lib/empenhos";
import type { PDFRequest } from "@/lib/pdfGenerator";
import type { CredorFixo, FiltrosCredores } from "@/types/credor";

export function empenhoDe(
  empenhos: EmpenhoMensal[],
  credorId: string,
  mes: number,
): EmpenhoMensal | undefined {
  return empenhos.find((x) => x.credor_id === credorId && x.mes === mes);
}

export function totalEmpenhadoAno(
  empenhos: EmpenhoMensal[],
  credorId: string,
): number {
  return MESES.reduce((sum, _, i) => {
    const e = empenhoDe(empenhos, credorId, i + 1);
    return sum + (e?.status === "empenhado" ? Number(e.valor ?? 0) : 0);
  }, 0);
}

export function valorCredorNoDocumento(
  credor: CredorFixo,
  empenho?: EmpenhoMensal,
): number {
  const tipoValor = (credor.tipo_valor || "FIXO")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const valor = tipoValor === "VARIAVEL"
    ? empenho?.valor ?? credor.valor_mensal
    : credor.valor_mensal;
  return Number(valor) || 0;
}

export function filtrarCredores(
  credores: CredorFixo[],
  empenhos: EmpenhoMensal[],
  filtros: FiltrosCredores,
): CredorFixo[] {
  const q = filtros.busca.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  return credores.filter((c) => {
    if (filtros.filtroDep !== "todos" && c.departamento !== filtros.filtroDep) return false;
    if (q) {
      const nome = (c.nome || "").toLowerCase();
      const doc = (c.documento || "").toLowerCase();
      const docDigits = doc.replace(/\D/g, "");
      const desc = (c.descricao || "").toLowerCase();
      const matchTexto = nome.includes(q) || doc.includes(q) || desc.includes(q);
      const matchDoc = qDigits.length >= 3 && docDigits.includes(qDigits);
      if (!matchTexto && !matchDoc) return false;
    }
    if (filtros.filtroStatus !== "todos") {
      const anyMes = Array.from({ length: 12 }, (_, i) => empenhoDe(empenhos, c.id, i + 1));
      const temPendente = anyMes.some((e) => !e || e.status === "pendente");
      const temEmpenhado = anyMes.some((e) => e?.status === "empenhado");
      if (filtros.filtroStatus === "pendente" && !temPendente) return false;
      if (filtros.filtroStatus === "empenhado" && !temEmpenhado) return false;
    }
    return true;
  });
}

export function montarSolicitacao(
  c: CredorFixo,
  mesRef: number,
  anoRef: number,
  opts: {
    anoEmpenhos: number;
    empenhos: EmpenhoMensal[];
  },
): { request: PDFRequest; valor: number; mes: number; mesNome: string; dataStr: string } {
  const mes = Math.min(12, Math.max(1, mesRef));
  const mesNome = MESES_NOMES[mes - 1];
  const empMes =
    anoRef === opts.anoEmpenhos ? empenhoDe(opts.empenhos, c.id, mes) : undefined;
  const valor = valorCredorNoDocumento(c, empMes);
  const dataStr = new Date().toLocaleDateString("pt-BR");
  const empresa = c.documento
    ? `${c.nome} (CNPJ/CPF: ${c.documento})`
    : c.nome;
  const itemNome = (c.descricao || "Serviço mensal").trim() || "Serviço mensal";
  const items = [{
    codigoItem: "",
    item: itemNome,
    descricao: `Serviço mensal — ${mesNome}/${anoRef}`,
    quantidade: 1,
    valorUnitario: valor,
  }];
  const observacoes = [
    `Referência: ${mesNome}/${anoRef}`,
    empMes?.numero_empenho ? `Empenho: ${empMes.numero_empenho}` : null,
    c.obs?.trim() || null,
  ].filter(Boolean).join("\n");
  const request: PDFRequest = {
    solicitante: c.departamento,
    empresa,
    dataSolicitacao: dataStr,
    observacoes,
    items,
    contexto: {
      origem: "Credor fixo - solicitação mensal",
      referencia: `${mesNome}/${anoRef}`,
    },
  };
  return { request, valor, mes, mesNome, dataStr };
}

export function nomeArquivoCredor(nome: string): string {
  return nome.replace(/[^\wÀ-ÿ]+/gi, "_").replace(/^_|_$/g, "") || "credor";
}
