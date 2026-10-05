import { loadImageAsDataUrl } from "@/lib/pdfGenerator";

type LicitacaoTcePr = {
  id: string;
  chave_externa: string;
  orgao_nome: string | null;
  codigo_ibge: string | null;
  municipio: string | null;
  ano: number | null;
  processo: string | null;
  edital: string | null;
  modalidade: string | null;
  tipo_avaliacao: string | null;
  objeto: string | null;
  data_abertura: string | null;
  data_publicacao: string | null;
  valor_referencia: number;
  data_cancelamento: string | null;
  situacao: string;
  pncp_encontrado?: number;
};

type ObraTcePr = {
  id: string;
  chave_externa: string;
  id_intervencao: string;
  orgao_nome: string | null;
  codigo_ibge: string | null;
  municipio: string | null;
  ano: number | null;
  tipo_intervencao: string | null;
  nome_intervencao: string | null;
  tipo_obra: string | null;
  objeto: string | null;
  valor: number;
  data_inicio: string | null;
  prazo_execucao: number | null;
  regime: string | null;
  situacao: string;
  percentual_fisico: number | null;
  ultimo_acompanhamento: string | null;
  observacao_ultimo_acompanhamento: string | null;
};

type PendenciasTcePr = {
  semPncp: (LicitacaoTcePr & { edital: string | null })[];
  pncpSemTce: { id: string; numero: string | null; ano: number | null; processo: string | null; objeto: string | null; valor: number; data_publicacao: string | null; situacao: string | null; fornecedor_nome: string | null }[];
  obrasParalisadas: ObraTcePr[];
  obrasSemAcompanhamento: ObraTcePr[];
  totais: { semPncp: number; pncpSemTce: number; obrasParalisadas: number; obrasSemAcompanhamento: number };
};

function formatarMoeda(valor?: number | null): string {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(dataIso?: string | null): string {
  if (!dataIso) return "—";
  const [dataPart] = dataIso.split("T");
  const partes = dataPart.split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataIso;
}

export async function exportarTcePrExcel(opts: {
  tab: string;
  licitacoes: LicitacaoTcePr[];
  obras: ObraTcePr[];
  pendencias: PendenciasTcePr | null;
  ano: string;
  busca: string;
  total: number;
}): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const wb = XLSX.utils.book_new();
  const { tab, licitacoes, obras, pendencias, ano, busca, total } = opts;

  if (tab === "licitacoes") {
    const rows = licitacoes.map(item => ({
      "Processo": item.processo || "—",
      "Edital": item.edital || "—",
      "Ano": item.ano || "—",
      "Município": item.municipio || "—",
      "Modalidade": item.modalidade || "—",
      "Avaliação": item.tipo_avaliacao || "—",
      "Objeto": item.objeto || "—",
      "Data Publicação": formatarData(item.data_publicacao),
      "Data Abertura": formatarData(item.data_abertura),
      "Valor Referência (R$)": Number(item.valor_referencia) || 0,
      "Situação": item.situacao || "—",
      "PNCP": item.pncp_encontrado ? "Conferida" : "Revisar",
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Mensagem: "Nenhuma licitação encontrada" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Licitações");
  } else if (tab === "obras") {
    const rows = obras.map(item => ({
      "Intervenção": item.nome_intervencao || item.id_intervencao || "—",
      "Ano": item.ano || "—",
      "Município": item.municipio || "—",
      "Tipo Obra": item.tipo_obra || item.tipo_intervencao || "—",
      "Objeto": item.objeto || "—",
      "Regime": item.regime || "—",
      "Situação": item.situacao,
      "% Físico": item.percentual_fisico !== null ? Number(item.percentual_fisico) : "",
      "Valor (R$)": Number(item.valor) || 0,
      "Data Início": formatarData(item.data_inicio),
      "Prazo (dias)": item.prazo_execucao || "",
      "Último Acompanhamento": formatarData(item.ultimo_acompanhamento),
      "Obs Último Acompanhamento": item.observacao_ultimo_acompanhamento || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Mensagem: "Nenhuma obra encontrada" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Obras");
  } else if (tab === "pendencias" && pendencias) {
    const semPncpRows = pendencias.semPncp.map(item => ({
      "Processo / Edital": item.processo || item.edital || "—",
      "Ano": item.ano || "—",
      "Modalidade": item.modalidade || "—",
      "Objeto": item.objeto || "—",
      "Valor Referência (R$)": Number(item.valor_referencia) || 0,
    }));
    const ws1 = XLSX.utils.json_to_sheet(semPncpRows.length ? semPncpRows : [{ Mensagem: "Nenhuma licitação pendente" }]);
    XLSX.utils.book_append_sheet(wb, ws1, "TCE sem PNCP");

    const pncpSemTceRows = pendencias.pncpSemTce.map(item => ({
      "Número / Processo": item.numero || item.processo || "—",
      "Ano": item.ano || "—",
      "Objeto": item.objeto || "—",
      "Valor (R$)": Number(item.valor) || 0,
      "Publicação": formatarData(item.data_publicacao),
      "Fornecedor": item.fornecedor_nome || "—",
    }));
    const ws2 = XLSX.utils.json_to_sheet(pncpSemTceRows.length ? pncpSemTceRows : [{ Mensagem: "Nenhuma publicação pendente" }]);
    XLSX.utils.book_append_sheet(wb, ws2, "PNCP sem TCE");

    const paralisadasRows = pendencias.obrasParalisadas.map(item => ({
      "Intervenção / Nome": item.nome_intervencao || item.objeto || "—",
      "Município": item.municipio || "—",
      "Ano": item.ano || "—",
      "% Físico": item.percentual_fisico !== null ? Number(item.percentual_fisico) : "",
      "Valor (R$)": Number(item.valor) || 0,
      "Último Registro": formatarData(item.ultimo_acompanhamento),
    }));
    const ws3 = XLSX.utils.json_to_sheet(paralisadasRows.length ? paralisadasRows : [{ Mensagem: "Nenhuma obra paralisada" }]);
    XLSX.utils.book_append_sheet(wb, ws3, "Obras Paralisadas");
  }

  const resumo = [
    { Campo: "Módulo", Valor: "TCE-PR — Dados Abertos e Obras" },
    { Campo: "Aba", Valor: tab === "licitacoes" ? "Licitações" : tab === "obras" ? "Obras Municipais" : "Conferências" },
    { Campo: "Exercício / Ano", Valor: ano },
    { Campo: "Filtro de busca", Valor: busca || "(todos)" },
    { Campo: "Total de registros", Valor: total },
    { Campo: "Data de emissão", Valor: new Date().toLocaleString("pt-BR") },
    { Campo: "Órgão emissor", Valor: "Prefeitura Municipal de Inajá — PR" },
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  XLSX.writeFile(wb, `tcepr-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportarTcePrPdf(opts: {
  tab: string;
  licitacoes: LicitacaoTcePr[];
  obras: ObraTcePr[];
  pendencias: PendenciasTcePr | null;
  ano: string;
  busca: string;
  total: number;
}): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297;
  const H = 210;
  const M = 12;
  const L = W - 2 * M;
  let y = 36;

  const C = {
    deep: [6, 78, 59] as [number, number, number],
    gold: [201, 168, 76] as [number, number, number],
    textDark: [30, 41, 33] as [number, number, number],
    textMuted: [95, 105, 100] as [number, number, number],
    border: [215, 220, 215] as [number, number, number],
    bgHeader: [240, 245, 242] as [number, number, number],
    zebra: [250, 252, 251] as [number, number, number],
  };

  const novaPaginaSeNecessario = (altura = 10) => {
    if (y + altura < H - 15) return;
    doc.addPage();
    y = 20;
  };

  const brasao = await loadImageAsDataUrl("/brasao.png");

  doc.setFillColor(...C.deep);
  doc.rect(0, 0, W, 22, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 22, W, 1.2, "F");

  if (brasao) {
    try {
      doc.addImage(brasao, "PNG", M, 2.5, 38, 17);
    } catch {
      // brasao opcional
    }
  }

  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(255, 255, 255);
  doc.text("PREFEITURA MUNICIPAL DE INAJÁ — ESTADO DO PARANÁ", W - M, 9, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(240, 240, 240);
  doc.text(`TCE-PR · ${opts.tab.toUpperCase()} · Ano: ${opts.ano} · Busca: ${opts.busca || "Todos"}`, W - M, 14, { align: "right" });
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, W - M, 19, { align: "right" });

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...C.deep);
  doc.text(`RELATÓRIO TCE-PR: ${opts.tab === "licitacoes" ? "LICITAÇÕES PÚBLICAS" : opts.tab === "obras" ? "OBRAS MUNICIPAIS" : "CONFERÊNCIAS E PENDÊNCIAS"}`, M, y);
  y += 6;

  if (opts.tab === "licitacoes") {
    doc.setFillColor(...C.bgHeader);
    doc.rect(M, y, L, 6, "F");
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.textDark);
    doc.text("Processo / Edital", M + 2, y + 4.2);
    doc.text("Ano / Município", M + 45, y + 4.2);
    doc.text("Modalidade", M + 85, y + 4.2);
    doc.text("Objeto", M + 130, y + 4.2);
    doc.text("Publicação", M + 215, y + 4.2);
    doc.text("Valor Ref. (R$)", W - M - 2, y + 4.2, { align: "right" });
    y += 7.5;

    let soma = 0;
    for (let i = 0; i < opts.licitacoes.length; i++) {
      const item = opts.licitacoes[i];
      soma += Number(item.valor_referencia || 0);
      novaPaginaSeNecessario(8);
      if (i % 2 === 1) {
        doc.setFillColor(...C.zebra);
        doc.rect(M, y - 1, L, 6.5, "F");
      }
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textDark);
      doc.text(`${item.processo || item.edital || "—"}`.slice(0, 24), M + 2, y + 3.2);
      doc.text(`${item.ano || "—"} · ${item.municipio || "—"}`.slice(0, 22), M + 45, y + 3.2);
      doc.text((item.modalidade || "—").slice(0, 24), M + 85, y + 3.2);
      const objClip = doc.splitTextToSize(item.objeto || "—", 80);
      doc.text(objClip[0] || "—", M + 130, y + 3.2);
      doc.text(formatarData(item.data_publicacao || item.data_abertura), M + 215, y + 3.2);
      doc.text(formatarMoeda(item.valor_referencia), W - M - 2, y + 3.2, { align: "right" });

      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(M, y + 5.5, W - M, y + 5.5);
      y += 6.5;
    }

    novaPaginaSeNecessario(10);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...C.deep);
    doc.text(`Total licitações: ${opts.licitacoes.length} · Valor referencial total: ${formatarMoeda(soma)}`, W - M - 2, y + 4, { align: "right" });
  } else if (opts.tab === "obras") {
    doc.setFillColor(...C.bgHeader);
    doc.rect(M, y, L, 6, "F");
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.textDark);
    doc.text("Intervenção / Objeto", M + 2, y + 4.2);
    doc.text("Município / Ano", M + 115, y + 4.2);
    doc.text("Situação / % Físico", M + 160, y + 4.2);
    doc.text("Último Registro", M + 210, y + 4.2);
    doc.text("Valor (R$)", W - M - 2, y + 4.2, { align: "right" });
    y += 7.5;

    let soma = 0;
    for (let i = 0; i < opts.obras.length; i++) {
      const item = opts.obras[i];
      soma += Number(item.valor || 0);
      novaPaginaSeNecessario(8);
      if (i % 2 === 1) {
        doc.setFillColor(...C.zebra);
        doc.rect(M, y - 1, L, 6.5, "F");
      }
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textDark);
      const nomeClip = doc.splitTextToSize(item.nome_intervencao || item.objeto || "—", 108);
      doc.text(nomeClip[0] || "—", M + 2, y + 3.2);
      doc.text(`${item.municipio || "—"} / ${item.ano || "—"}`.slice(0, 24), M + 115, y + 3.2);
      doc.text(`${item.situacao} (${item.percentual_fisico !== null ? `${item.percentual_fisico}%` : "—"})`, M + 160, y + 3.2);
      doc.text(formatarData(item.ultimo_acompanhamento), M + 210, y + 3.2);
      doc.text(formatarMoeda(item.valor), W - M - 2, y + 3.2, { align: "right" });

      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(M, y + 5.5, W - M, y + 5.5);
      y += 6.5;
    }

    novaPaginaSeNecessario(10);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...C.deep);
    doc.text(`Total de obras: ${opts.obras.length} · Valor total: ${formatarMoeda(soma)}`, W - M - 2, y + 4, { align: "right" });
  } else if (opts.tab === "pendencias" && opts.pendencias) {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...C.deep);
    doc.text(`1. Licitações TCE-PR sem correspondência no PNCP (${opts.pendencias.semPncp.length})`, M, y);
    y += 5;
    for (const item of opts.pendencias.semPncp.slice(0, 8)) {
      novaPaginaSeNecessario(7);
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...C.textDark);
      doc.text(`• ${item.processo || item.edital || "Sem edital"} (${item.ano}) — ${item.objeto || "—"} · ${formatarMoeda(item.valor_referencia)}`, M + 2, y);
      y += 4.5;
    }
    y += 3;

    novaPaginaSeNecessario(15);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...C.deep);
    doc.text(`2. Obras municipais paralisadas (${opts.pendencias.obrasParalisadas.length})`, M, y);
    y += 5;
    for (const item of opts.pendencias.obrasParalisadas.slice(0, 8)) {
      novaPaginaSeNecessario(7);
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...C.textDark);
      doc.text(`• ${item.nome_intervencao || item.objeto || "Obra"} (${item.municipio}) — ${item.percentual_fisico || 0}% físico · ${formatarMoeda(item.valor)}`, M + 2, y);
      y += 4.5;
    }
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(M, H - 10, W - M, H - 10);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textMuted);
    doc.text("Prefeitura Municipal de Inajá — PR · Sistema Integrado do Tribunal de Contas do Estado do Paraná", M, H - 6.5);
    doc.text(`Página ${p} de ${paginas}`, W - M, H - 6.5, { align: "right" });
  }

  doc.save(`tcepr-${opts.tab}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
