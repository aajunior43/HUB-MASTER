import { MESES_NOMES, brl, type EmpenhoMensal } from "@/lib/empenhos";
import { loadImageAsDataUrl } from "@/lib/pdfGenerator";
import { empenhoDe, valorCredorNoDocumento } from "@/lib/credoresHelpers";
import type { CredorFixo } from "@/types/credor";

export type ChecklistCredoresOpts = {
  ano: number;
  mes: number;
  filtroDep: string;
  busca: string;
  credores: CredorFixo[];
  empenhos: EmpenhoMensal[];
};

export async function gerarChecklistCredoresPdf(opts: ChecklistCredoresOpts): Promise<void> {
  const { ano, mes, filtroDep, busca, credores, empenhos } = opts;
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
    title: "Checklist de Checkout — Credores Fixos",
    subject: "Credores Fixos – Prefeitura Municipal de Inajá",
    author: "Prefeitura Municipal de Inajá – PR",
    creator: "Sistema de Credores Fixos – PMI",
  });

  const logo =
    await loadImageAsDataUrl("/brasao.png");

  const mesNome = MESES_NOMES[Math.min(12, Math.max(1, mes)) - 1];

  const lista = credores
    .map((c) => ({ c, e: empenhoDe(empenhos, c.id, mes) }))
    .sort((a, b) => a.c.nome.localeCompare(b.c.nome));

  const empenhados = lista.filter((x) => x.e?.status === "empenhado");
  const pendentes = lista.filter((x) => !x.e || x.e.status !== "empenhado");

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

  function drawPageHeader(subtitulo: string): number {
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
    doc.text("CHECKLIST DE CHECKOUT — EMPENHADOS DO MÊS", W / 2, divY + 7, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...C.muted);
    doc.text(subtitulo, W / 2, divY + 12, { align: "center" });
    return divY + 18;
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
        `Prefeitura Municipal de Inajá — checklist gerado em ${new Date().toLocaleDateString("pt-BR")}`,
        M,
        fy,
      );
      doc.text(`Página ${i} de ${total}`, W - M, fy, { align: "right" });
    }
  }

  function drawFicha(
    c: CredorFixo,
    e: EmpenhoMensal | undefined,
    y: number,
  ): number {
    const cardH = 32;
    const empenhado = e?.status === "empenhado";
    doc.setFillColor(...(empenhado ? C.zebra : [255, 255, 255] as [number, number, number]));
    doc.rect(M, y, pw, cardH, "F");
    doc.setDrawColor(...C.border).setLineWidth(0.3);
    doc.rect(M, y, pw, cardH, "S");
    doc.setFillColor(...(empenhado ? C.deep : C.muted));
    doc.rect(M, y, 2, cardH, "F");

    const lx = M + 4;
    const rx = M + pw / 2;
    const row1 = y + 6;
    const row2 = y + 13;
    const row3 = y + 20;
    const row4 = y + 27;

    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...C.deep);
    cellText(c.nome, lx, pw / 2 - 6, row1);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...C.muted);
    cellText(`Depto: ${c.departamento}`, rx, pw / 2 - 6, row1);

    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.dark);
    doc.text("Nº Empenho:", lx, row2);
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...C.deep);
    cellText(e?.numero_empenho || "—", lx + 22, pw / 2 - 28, row2);

    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...C.dark);
    doc.text("Valor:", rx, row2);
    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...C.gold);
    cellText(brl(valorCredorNoDocumento(c, e)), rx + 14, pw / 2 - 20, row2);

    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...C.muted);
    cellText(`Doc: ${c.documento || "—"}`, lx, pw / 2 - 6, row3);
    cellText(`Solicitação dia: ${c.solicitacao ?? "—"}`, rx, pw / 2 - 6, row3);

    doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...C.muted);
    cellText(`Obs: ${(c.obs || e?.observacao || "—")}`, lx, pw / 2 - 6, row4);

    doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(...C.dark);
    const cbX = rx;
    const cbY = row4 - 2.2;
    doc.setDrawColor(...C.dark).setLineWidth(0.3);
    doc.rect(cbX, cbY, 3, 3, "S");
    doc.text("Conferido", cbX + 4.5, row4);
    doc.text("Assinatura: _______________________", cbX + 30, row4);

    return y + cardH + 3;
  }

  let y = drawPageHeader(
    `${mesNome}/${ano} · ${lista.length} credor(es) · ${empenhados.length} empenhado(s) · ${pendentes.length} pendente(s)`,
  );

  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...C.dark);
  const meta = [
    filtroDep !== "todos" ? `Depto: ${filtroDep}` : null,
    busca.trim() ? `Busca: "${busca.trim()}"` : null,
  ].filter(Boolean).join("  ·  ");
  if (meta) {
    doc.text(meta, M, y);
    y += 4;
  }

  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...C.deep);
  doc.text("FICHA DE DOTAÇÃO — preencher no ato do checkout", M, y);
  y += 3;

  const totalEmpenhado = lista.reduce(
    (s, x) => s + (x.e?.status === "empenhado" ? valorCredorNoDocumento(x.c, x.e) : 0),
    0,
  );

  for (const { c, e } of lista) {
    if (y + 35 > H - 18) {
      doc.addPage();
      y = drawPageHeader(`${mesNome}/${ano} · continuação`);
      y += 3;
    }
    y = drawFicha(c, e, y);
  }

  if (lista.length === 0) {
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...C.muted);
    doc.text("Nenhum credor para os filtros atuais.", M, y + 4);
    y += 10;
  }

  y += 3;
  const totH = 11;
  if (y + totH >= H - 18) {
    doc.addPage();
    y = drawPageHeader(`${mesNome}/${ano} · resumo`);
  }
  doc.setFillColor(...C.goldSoft);
  doc.rect(M, y, pw, totH, "F");
  doc.setDrawColor(...C.gold).setLineWidth(0.5);
  doc.rect(M, y, pw, totH, "S");
  doc.setFillColor(...C.deep);
  doc.rect(M, y, 2, totH, "F");
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...C.deep);
  const ty = y + 7;
  doc.text(
    `CREDORES: ${lista.length}  ·  EMPENHADO: ${empenhados.length}  ·  PENDENTE: ${pendentes.length}`,
    M + 5,
    ty,
  );
  doc.text(`TOTAL EMPENHADO: ${brl(totalEmpenhado)}`, W - M - 2, ty, { align: "right" });

  stampFooters();
  const mesStr = String(Math.min(12, Math.max(1, mes))).padStart(2, "0");
  doc.save(`checklist-checkout-${mesStr}-${ano}.pdf`);
}
