import { loadImageAsDataUrl } from "@/lib/pdfGenerator";

type RegistroPncp = {
  id: string;
  tipo: string;
  chave_pncp: string;
  titulo: string | null;
  objeto: string | null;
  numero: string | null;
  ano: number | null;
  processo: string | null;
  modalidade: string | null;
  situacao: string | null;
  valor: number;
  fornecedor_nome: string | null;
  fornecedor_cnpj: string | null;
  data_publicacao: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  url: string | null;
};

type PendenciasPncp = {
  empenhos: { id: string; numero_empenho: string; ano_empenho: number; licitacao: string; nome_credor: string; valor_empenhado_bruto: number }[];
  semVinculo: RegistroPncp[];
  vencendo: RegistroPncp[];
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

const NOMES_ABAS: Record<string, string> = {
  contratacao: "Contratações Públicas",
  contrato: "Contratos e Empenhos",
  ata: "Atas de Registro de Preço",
  pca: "Plano de Contratações Anual (PCA)",
  pendencias: "Conferências e Pendências",
};

export async function exportarPncpExcel(opts: {
  tab: string;
  registros: RegistroPncp[];
  pendencias: PendenciasPncp | null;
  busca: string;
  total: number;
}): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const wb = XLSX.utils.book_new();
  const { tab, registros, pendencias, busca, total } = opts;
  const tituloAba = NOMES_ABAS[tab] || "PNCP";

  if (tab === "pendencias" && pendencias) {
    const vencendoRows = pendencias.vencendo.map(item => ({
      "Número / Chave": item.numero || item.chave_pncp,
      Objeto: item.objeto || item.titulo || "—",
      Fornecedor: item.fornecedor_nome || "—",
      "CNPJ Fornecedor": item.fornecedor_cnpj || "—",
      "Vencimento": formatarData(item.vigencia_fim),
      "Valor (R$)": Number(item.valor) || 0,
      Link: item.url || "",
    }));
    const wsVencendo = XLSX.utils.json_to_sheet(vencendoRows.length ? vencendoRows : [{ Mensagem: "Nenhum contrato a vencer" }]);
    XLSX.utils.book_append_sheet(wb, wsVencendo, "Contratos a Vencer");

    const empRows = pendencias.empenhos.map(item => ({
      "Número Empenho": item.numero_empenho,
      Ano: item.ano_empenho,
      Licitação: item.licitacao || "—",
      Credor: item.nome_credor || "—",
      "Valor (R$)": Number(item.valor_empenhado_bruto) || 0,
    }));
    const wsEmp = XLSX.utils.json_to_sheet(empRows.length ? empRows : [{ Mensagem: "Todos os empenhos conferidos" }]);
    XLSX.utils.book_append_sheet(wb, wsEmp, "Empenhos sem Vínculo");

    const semVincRows = pendencias.semVinculo.map(item => ({
      "Número / Chave": item.numero || item.chave_pncp,
      Tipo: item.tipo,
      Ano: item.ano || "—",
      Objeto: item.objeto || item.titulo || "—",
      "Valor (R$)": Number(item.valor) || 0,
      "Data Publicação": formatarData(item.data_publicacao),
      Link: item.url || "",
    }));
    const wsSemVinc = XLSX.utils.json_to_sheet(semVincRows.length ? semVincRows : [{ Mensagem: "Nenhuma publicação pendente" }]);
    XLSX.utils.book_append_sheet(wb, wsSemVinc, "Publicações sem Vínculo");
  } else {
    const rows = registros.map(item => ({
      "Número / Chave": item.numero || item.chave_pncp,
      Ano: item.ano || "—",
      Tipo: item.tipo,
      Processo: item.processo || "—",
      Modalidade: item.modalidade || "—",
      Situação: item.situacao || "—",
      Objeto: item.objeto || item.titulo || "—",
      Fornecedor: item.fornecedor_nome || "—",
      "CNPJ Fornecedor": item.fornecedor_cnpj || "—",
      "Valor (R$)": Number(item.valor) || 0,
      "Publicação": formatarData(item.data_publicacao),
      "Início Vigência": formatarData(item.vigencia_inicio),
      "Fim Vigência": formatarData(item.vigencia_fim),
      Link: item.url || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Mensagem: "Nenhum registro encontrado" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Registros");
  }

  const somaValores = registros.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const resumo = [
    { Campo: "Módulo", Valor: "PNCP — Portal Nacional de Contratações Públicas" },
    { Campo: "Seção / Categoria", Valor: tituloAba },
    { Campo: "Filtro de busca", Valor: busca || "(todos)" },
    { Campo: "Registros exportados", Valor: tab === "pendencias" ? "Relatório de pendências" : registros.length },
    { Campo: "Total cadastrado", Valor: total },
    { Campo: "Soma dos valores (exportados)", Valor: formatarMoeda(somaValores) },
    { Campo: "Data da exportação", Valor: new Date().toLocaleString("pt-BR") },
    { Campo: "Órgão emissor", Valor: "Prefeitura Municipal de Inajá — PR" },
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  XLSX.writeFile(wb, `pncp-${tab}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportarPncpPdf(opts: {
  tab: string;
  registros: RegistroPncp[];
  pendencias: PendenciasPncp | null;
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

  doc.setProperties({
    title: `Relatório PNCP - ${NOMES_ABAS[opts.tab] || opts.tab}`,
    author: "Prefeitura Municipal de Inajá",
    subject: "Contratações Públicas - PNCP",
  });

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
  doc.text(`PNCP — ${NOMES_ABAS[opts.tab] || opts.tab} · Filtro: ${opts.busca || "Todos"}`, W - M, 14, { align: "right" });
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, W - M, 19, { align: "right" });

  doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...C.deep);
  doc.text(`RELATÓRIO: ${NOMES_ABAS[opts.tab]?.toUpperCase() || opts.tab.toUpperCase()}`, M, y);
  y += 5;

  if (opts.tab === "pendencias" && opts.pendencias) {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...C.deep);
    doc.text("1. Contratos próximos do vencimento", M, y);
    y += 5;
    if (opts.pendencias.vencendo.length === 0) {
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...C.textMuted);
      doc.text("Nenhum contrato próximo do vencimento.", M, y);
      y += 6;
    } else {
      for (const item of opts.pendencias.vencendo) {
        novaPaginaSeNecessario(8);
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...C.textDark);
        doc.text(`${item.numero || item.chave_pncp} — ${item.objeto || item.titulo || "—"} (${item.fornecedor_nome || "Fornecedor não informado"}) · Vence em ${formatarData(item.vigencia_fim)} · ${formatarMoeda(item.valor)}`, M, y);
        y += 5;
      }
      y += 2;
    }

    novaPaginaSeNecessario(15);
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...C.deep);
    doc.text("2. Empenhos locais sem vínculo no PNCP", M, y);
    y += 5;
    if (opts.pendencias.empenhos.length === 0) {
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...C.textMuted);
      doc.text("Todos os empenhos estão conferidos.", M, y);
      y += 6;
    } else {
      for (const item of opts.pendencias.empenhos) {
        novaPaginaSeNecessario(8);
        doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...C.textDark);
        doc.text(`Empenho ${item.numero_empenho}/${item.ano_empenho} — Licitação: ${item.licitacao || "—"} · Credor: ${item.nome_credor || "—"} · ${formatarMoeda(item.valor_empenhado_bruto)}`, M, y);
        y += 5;
      }
    }
  } else {
    doc.setFillColor(...C.bgHeader);
    doc.rect(M, y, L, 6, "F");
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.textDark);
    doc.text("Número / Ano", M + 2, y + 4.2);
    doc.text("Processo / Modalidade", M + 35, y + 4.2);
    doc.text("Objeto", M + 80, y + 4.2);
    doc.text("Fornecedor", M + 175, y + 4.2);
    doc.text("Publicação", M + 225, y + 4.2);
    doc.text("Valor (R$)", W - M - 2, y + 4.2, { align: "right" });
    y += 7.5;

    let soma = 0;
    for (let i = 0; i < opts.registros.length; i++) {
      const item = opts.registros[i];
      soma += Number(item.valor || 0);
      novaPaginaSeNecessario(8);
      if (i % 2 === 1) {
        doc.setFillColor(...C.zebra);
        doc.rect(M, y - 1, L, 6.5, "F");
      }
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textDark);
      doc.text(`${item.numero || item.chave_pncp?.slice(0, 16)}/${item.ano || "—"}`, M + 2, y + 3.2);
      doc.text(`${item.processo || "—"} · ${item.modalidade || item.tipo || "—"}`.slice(0, 26), M + 35, y + 3.2);
      const objClip = doc.splitTextToSize(item.objeto || item.titulo || "—", 92);
      doc.text(objClip[0] || "—", M + 80, y + 3.2);
      doc.text((item.fornecedor_nome || "—").slice(0, 32), M + 175, y + 3.2);
      doc.text(formatarData(item.data_publicacao), M + 225, y + 3.2);
      doc.text(formatarMoeda(item.valor), W - M - 2, y + 3.2, { align: "right" });

      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.2);
      doc.line(M, y + 5.5, W - M, y + 5.5);
      y += 6.5;
    }

    novaPaginaSeNecessario(10);
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...C.deep);
    doc.text(`Total de registros: ${opts.registros.length} · Soma total: ${formatarMoeda(soma)}`, W - M - 2, y + 4, { align: "right" });
  }

  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(M, H - 10, W - M, H - 10);
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.textMuted);
    doc.text("Prefeitura Municipal de Inajá — PR · Sistema Integrado de Compras e Contratos Públicos", M, H - 6.5);
    doc.text(`Página ${p} de ${paginas}`, W - M, H - 6.5, { align: "right" });
  }

  doc.save(`pncp-${opts.tab}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
