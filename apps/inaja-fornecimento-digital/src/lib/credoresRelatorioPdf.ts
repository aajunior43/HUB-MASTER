import { MESES, brl, type EmpenhoMensal } from "@/lib/empenhos";
import { loadImageAsDataUrl } from "@/lib/pdfGenerator";
import { empenhoDe, totalEmpenhadoAno } from "@/lib/credoresHelpers";
import type { CredorFixo } from "@/types/credor";

export type RelatorioCredoresOpts = {
  ano: number;
  filtroDep: string;
  busca: string;
  credores: CredorFixo[];
  empenhos: EmpenhoMensal[];
  totalValorMensal: number;
};

export async function gerarRelatorioCredoresPdf(opts: RelatorioCredoresOpts): Promise<void> {
  const { ano, filtroDep, busca, credores, empenhos, totalValorMensal } = opts;
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 12;
  const pw = W - 2 * M;

  const C = {
    deep: [6, 78, 59] as [number, number, number],
    gold: [201, 168, 76] as [number, number, number],
    goldSoft: [245, 240, 224] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    dark: [30, 41, 33] as [number, number, number],
    muted: [110, 120, 115] as [number, number, number],
    border: [210, 214, 208] as [number, number, number],
    zebra: [249, 250, 247] as [number, number, number],
  };

  doc.setProperties({
    title: "Relatório de Credores Fixos",
    subject: "Credores Fixos – Prefeitura Municipal de Inajá",
    author: "Prefeitura Municipal de Inajá – PR",
    creator: "Sistema de Credores Fixos – PMI",
  });

  const logo =
    await loadImageAsDataUrl("/brasao.png");

  const col = {
    nome: { x: M, w: 46 },
    dep: { x: M + 46, w: 30 },
    mes0: M + 76,
    mesW: 6.2,
    mensal: { x: M + 76 + 12 * 6.2, w: 28 },
  };

  const clip = (text: string, maxW: number) => {
    const lines = doc.splitTextToSize(text || "—", maxW);
    return Array.isArray(lines) ? lines[0] : String(text || "—");
  };

  const cellText = (
    text: string,
    x: number,
    w: number,
    y: number,
    align: "left" | "right" | "center" = "left",
  ) => {
    const t = clip(text, w - 1.5);
    if (align === "right") doc.text(t, x + w - 0.8, y, { align: "right" });
    else if (align === "center") doc.text(t, x + w / 2, y, { align: "center" });
    else doc.text(t, x + 0.8, y);
  };

  function drawPageHeader(): number {
    doc.setFillColor(...C.deep);
    doc.rect(0, 0, W, 6, "F");
    doc.setFillColor(...C.gold);
    doc.rect(0, 6, W, 1.2, "F");

    const topY = 12;
    if (logo) {
      try {
        doc.addImage(logo, "PNG", M, topY, 16, 16);
      } catch { /* ignore */ }
    }

    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...C.deep);
    doc.text("PREFEITURA MUNICIPAL DE INAJÁ", W / 2, topY + 4.5, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...C.muted);
    doc.text("Estado do Paraná · Credores Fixos Mensais", W / 2, topY + 10, { align: "center" });

    const divY = topY + 18;
    doc.setDrawColor(...C.border).setLineWidth(0.3);
    doc.line(M, divY, W - M, divY);
    doc.setDrawColor(...C.gold).setLineWidth(0.8);
    doc.line(M, divY, M + 32, divY);

    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...C.deep);
    doc.text("RELATÓRIO DE CREDORES FIXOS", W / 2, divY + 7, { align: "center" });
    return divY + 12;
  }

  function stampFooters() {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      const fy = H - 10;
      doc.setDrawColor(...C.gold).setLineWidth(0.4);
      doc.line(M, fy - 4, W - M, fy - 4);
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...C.muted);
      doc.text(
        `Prefeitura Municipal de Inajá — gerado em ${new Date().toLocaleDateString("pt-BR")} · ✓ empenhado · · pendente`,
        M,
        fy,
      );
      doc.text(`Página ${i} de ${total}`, W - M, fy, { align: "right" });
    }
  }

  function drawTableHeader(startY: number): number {
    const headH = 9;
    doc.setFillColor(...C.deep);
    doc.rect(M, startY, pw, headH, "F");
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(...C.white);
    const ty = startY + 5.8;
    cellText("CREDOR", col.nome.x, col.nome.w, ty);
    cellText("DEPTO", col.dep.x, col.dep.w, ty);
    MESES.forEach((m, i) => {
      cellText(m, col.mes0 + i * col.mesW, col.mesW, ty, "center");
    });
    cellText("VALOR MENSAL", col.mensal.x, col.mensal.w, ty, "right");
    return startY + headH;
  }

  let y = drawPageHeader();

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...C.dark);
  const meta = [
    `Ano: ${ano}`,
    filtroDep !== "todos" ? `Depto: ${filtroDep}` : null,
    busca.trim() ? `Busca: "${busca.trim()}"` : null,
    `${credores.length} credor(es)`,
  ].filter(Boolean).join("  ·  ");
  doc.text(meta, M, y);
  y += 4;

  y = drawTableHeader(y);

  const linhaH = 8.5;
  const pageBottom = H - 18;
  credores.forEach((c, idx) => {
    if (y + linhaH > pageBottom) {
      doc.addPage();
      y = drawPageHeader();
      y = drawTableHeader(y);
    }
    if (idx % 2 === 1) {
      doc.setFillColor(...C.zebra);
      doc.rect(M, y, pw, linhaH, "F");
    }
    const ty = y + 5.6;
    doc.setTextColor(...C.dark);
    doc.setFont("helvetica", "bold").setFontSize(7);
    cellText(c.nome, col.nome.x, col.nome.w, ty);
    doc.setFont("helvetica", "normal").setFontSize(6.5);
    cellText(c.departamento, col.dep.x, col.dep.w, ty);
    for (let i = 0; i < 12; i++) {
      const e = empenhoDe(empenhos, c.id, i + 1);
      const mark = e?.status === "empenhado" ? "✓" : "·";
      doc.setFont("helvetica", "bold").setFontSize(8);
      doc.setTextColor(...(e?.status === "empenhado" ? C.deep : C.muted));
      cellText(mark, col.mes0 + i * col.mesW, col.mesW, ty, "center");
    }
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.dark);
    cellText(brl(c.valor_mensal), col.mensal.x, col.mensal.w, ty, "right");
    y += linhaH;
    doc.setDrawColor(...C.border).setLineWidth(0.15);
    doc.line(M, y, W - M, y);
  });

  y += 3;
  const totH = 11;
  if (y + totH >= pageBottom) {
    doc.addPage();
    y = drawPageHeader();
  }
  doc.setFillColor(...C.goldSoft);
  doc.rect(M, y, pw, totH, "F");
  doc.setDrawColor(...C.gold).setLineWidth(0.5);
  doc.rect(M, y, pw, totH, "S");
  doc.setFillColor(...C.deep);
  doc.rect(M, y, 2, totH, "F");
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...C.deep);
  const ty = y + 7;
  doc.text(`SOMA MENSAL: ${brl(totalValorMensal)}`, M + 5, ty);
  doc.text(
    `EMPENHADO ${ano}: ${brl(credores.reduce((s, c) => s + totalEmpenhadoAno(empenhos, c.id), 0))}`,
    W - M - 2,
    ty,
    { align: "right" },
  );

  stampFooters();
  doc.save(`credores-fixos-${ano}.pdf`);
}
