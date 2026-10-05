import type jsPDF from 'jspdf';

export interface PDFItem {
  codigoItem: string;
  item: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

export interface PDFAnexo {
  name: string;
  url: string;
  type: string; // MIME
}

export interface PDFRequestContext {
  origem: string;
  referencia: string;
}

export interface PDFRequest {
  solicitante: string;
  empresa: string;
  dataSolicitacao: string;
  observacoes: string;
  items: PDFItem[];
  contexto?: PDFRequestContext;
  assinatura?: string | null; // dataURL PNG
  anexos?: PDFAnexo[];
}

/* ============================================================================
   Paleta Emerald Prestige (RGB) e layout
   ============================================================================ */
const EMERALD_DEEP = [6, 78, 59] as const;      // #064E3B
const EMERALD = [13, 122, 95] as const;         // #0D7A5F
const GOLD = [201, 168, 76] as const;           // #C9A84C
const GOLD_SOFT = [245, 240, 224] as const;     // #F5F0E0
const INK = [30, 41, 33] as const;
const MUTED = [110, 120, 115] as const;
const BORDER = [210, 214, 208] as const;
const ZEBRA = [249, 250, 247] as const;
const WHITE = [255, 255, 255] as const;

const PAGE = { w: 210, h: 297, margin: 15 } as const;
const CONTENT_W = PAGE.w - PAGE.margin * 2;

type Cols = {
  idX: number; idW: number;
  itemX: number; itemW: number;
  descX: number; descW: number;
  qtdX: number; qtdW: number;
  valUnitX: number; valUnitW: number;
  valTotX: number; valTotW: number;
};

const buildCols = (items: PDFItem[]): Cols => {
  const idW = items.some((i) => i.codigoItem) ? 18 : 10;
  const qtdW = 14;
  const valUnitW = 30;
  const valTotW = 32;
  const flex = CONTENT_W - idW - qtdW - valUnitW - valTotW;
  const minW = 35;
  const longest = (pick: (i: PDFItem) => string) =>
    Math.max(20, Math.min(200, ...items.map((i) => (pick(i) || '').length)));
  const pesoItem = longest((i) => i.item);
  const pesoDesc = longest((i) => i.descricao);
  const itemW = Math.min(flex - minW, Math.max(minW, Math.round((flex * pesoItem) / (pesoItem + pesoDesc))));
  const descW = flex - itemW;
  const idX = PAGE.margin;
  const itemX = idX + idW;
  const descX = itemX + itemW;
  const qtdX = descX + descW;
  const valUnitX = qtdX + qtdW;
  const valTotX = valUnitX + valUnitW;
  return { idX, idW, itemX, itemW, descX, descW, qtdX, qtdW, valUnitX, valUnitW, valTotX, valTotW };
};

const ROW_MIN_H = 8;
const LINE_HEIGHT_FACTOR = 1.15;
const PT_TO_MM = 25.4 / 72;
const FOOTER_MARGIN = 20;

const brl = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Carrega uma imagem e retorna seu dataURL (ou null em erro). */
export const loadImageAsDataUrl = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

/* ============================================================================
   Cabeçalho institucional
   ============================================================================ */
const drawHeader = (doc: jsPDF, logo: string | null, fontSize: number): number => {
  // Faixa superior esmeralda
  doc.setFillColor(...EMERALD_DEEP);
  doc.rect(0, 0, PAGE.w, 6, 'F');
  // Filete dourado
  doc.setFillColor(...GOLD);
  doc.rect(0, 6, PAGE.w, 1.2, 'F');

  const topY = 14;

  if (logo) doc.addImage(logo, 'PNG', PAGE.margin, topY, 24, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...EMERALD_DEEP);
  doc.text('PREFEITURA MUNICIPAL DE INAJÁ', PAGE.w / 2, topY + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Estado do Paraná', PAGE.w / 2, topY + 11, { align: 'center' });
  doc.text('Av. Antônio Veiga Martins, 80 · CEP: 87670-200', PAGE.w / 2, topY + 16, { align: 'center' });
  doc.text('(44) 3112-4320 · prefeito@inaja.pr.gov.br', PAGE.w / 2, topY + 21, { align: 'center' });

  // Divisor
  const divY = topY + 27;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(PAGE.margin, divY, PAGE.w - PAGE.margin, divY);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(PAGE.margin, divY, PAGE.margin + 40, divY);

  // Título do documento
  const titleY = divY + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize + 2);
  doc.setTextColor(...EMERALD_DEEP);
  doc.text('SOLICITAÇÃO DE AQUISIÇÃO', PAGE.w / 2, titleY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize - 1);
  doc.setTextColor(...MUTED);
  doc.text('DE PRODUTOS OU SERVIÇOS', PAGE.w / 2, titleY + 6, { align: 'center' });

  return titleY + 14;
};

const drawRequestContext = (doc: jsPDF, contexto: PDFRequestContext | undefined, y: number, fontSize: number): number => {
  if (!contexto) return y;

  const h = 10;
  doc.setFillColor(...EMERALD_DEEP);
  doc.rect(PAGE.margin, y, CONTENT_W, h, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize - 2);
  doc.setTextColor(...WHITE);
  doc.text(contexto.origem.toUpperCase(), PAGE.margin + 5, y + 6.4);
  doc.setFont('helvetica', 'normal');
  doc.text(`Referência: ${contexto.referencia}`, PAGE.w - PAGE.margin - 5, y + 6.4, { align: 'right' });

  return y + h + 6;
};

/* ============================================================================
   Bloco de informações do solicitante
   ============================================================================ */
const drawInfoBox = (doc: jsPDF, req: PDFRequest, y: number, fontSize: number): number => {
  const rowH = 7;
  const boxH = 4 * rowH + 4;

  doc.setFillColor(...GOLD_SOFT);
  doc.rect(PAGE.margin, y, CONTENT_W, boxH, 'F');
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(PAGE.margin, y, CONTENT_W, boxH, 'S');
  doc.setFillColor(...EMERALD_DEEP);
  doc.rect(PAGE.margin, y, 2, boxH, 'F');

  doc.setFontSize(fontSize - 2);

  const labelX = PAGE.margin + 6;
  const valueX = PAGE.margin + 34;
  const valueMaxW = CONTENT_W - (valueX - PAGE.margin) - 4;

  const line = (label: string, value: string, ly: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...EMERALD_DEEP);
    doc.text(label, labelX, ly);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    const txt = doc.splitTextToSize(value || '—', valueMaxW)[0];
    doc.text(txt, valueX, ly);
  };

  const startY = y + 6;
  line('Solicitante:', req.solicitante, startY);
  line('Empresa:', req.empresa, startY + rowH);
  line('Data:', req.dataSolicitacao, startY + rowH * 2);
  line('Município:', 'Inajá — PR', startY + rowH * 3);

  return y + boxH + 6;
};

/* ============================================================================
   Tabela de itens
   ============================================================================ */
const drawTableHeader = (doc: jsPDF, COLS: Cols, y: number, fontSize: number): number => {
  const h = 9;
  doc.setFillColor(...EMERALD_DEEP);
  doc.rect(PAGE.margin, y, CONTENT_W, h, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize - 3);
  doc.setTextColor(...WHITE);

  const ty = y + h / 2 + 1.6;
  doc.text('ID', COLS.idX + COLS.idW / 2, ty, { align: 'center' });
  doc.text('ITEM', COLS.itemX + 2, ty);
  doc.text('DESCRIÇÃO', COLS.descX + 2, ty);
  doc.text('QTD', COLS.qtdX + COLS.qtdW / 2, ty, { align: 'center' });
  doc.text('VALOR UNIT.', COLS.valUnitX + COLS.valUnitW - 2, ty, { align: 'right' });
  doc.text('VALOR TOTAL', COLS.valTotX + COLS.valTotW - 2, ty, { align: 'right' });

  return y + h;
};

const drawItemRow = (
  doc: jsPDF, COLS: Cols, y: number, item: PDFItem, index: number, fontSize: number
): number => {
  doc.setFontSize(fontSize - 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);

  const idLines = doc.splitTextToSize(item.codigoItem || '—', COLS.idW - 3);
  const itemLines = doc.splitTextToSize(item.item || '—', COLS.itemW - 4);
  const descLines = doc.splitTextToSize(item.descricao || '—', COLS.descW - 4);
  const lines = Math.max(idLines.length, itemLines.length, descLines.length, 1);
  const lineH = (fontSize - 4) * LINE_HEIGHT_FACTOR * PT_TO_MM;
  const rowH = Math.max(ROW_MIN_H, lines * lineH + 4);

  // Zebra
  if (index % 2 === 1) {
    doc.setFillColor(...ZEBRA);
    doc.rect(PAGE.margin, y, CONTENT_W, rowH, 'F');
  }

  // Bordas verticais suaves
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(PAGE.margin, y + rowH, PAGE.margin + CONTENT_W, y + rowH);

  const valorTotal = item.quantidade * item.valorUnitario;
  const textY = y + 5;

  doc.text(idLines, COLS.idX + COLS.idW / 2, textY, { align: 'center' });
  doc.text(itemLines, COLS.itemX + 2, textY);
  doc.text(descLines, COLS.descX + 2, textY);
  doc.text(String(item.quantidade), COLS.qtdX + COLS.qtdW / 2, textY, { align: 'center' });
  doc.text(brl(item.valorUnitario), COLS.valUnitX + COLS.valUnitW - 2, textY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(brl(valorTotal), COLS.valTotX + COLS.valTotW - 2, textY, { align: 'right' });

  return y + rowH;
};

const drawTotalRow = (doc: jsPDF, COLS: Cols, y: number, total: number, fontSize: number): number => {
  const h = 11;
  // Fundo creme para toda a linha
  doc.setFillColor(...GOLD_SOFT);
  doc.rect(PAGE.margin, y, CONTENT_W, h, 'F');
  // Borda dourada
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(PAGE.margin, y, CONTENT_W, h, 'S');
  // Barra esmeralda
  doc.setFillColor(...EMERALD_DEEP);
  doc.rect(PAGE.margin, y, 2, h, 'F');

  const ty = y + h / 2 + 1.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize - 1);
  doc.setTextColor(...EMERALD_DEEP);
  doc.text('TOTAL GERAL', COLS.valUnitX + COLS.valUnitW - 2, ty, { align: 'right' });

  doc.setFontSize(fontSize + 1);
  doc.setTextColor(...EMERALD_DEEP);
  doc.text(brl(total), COLS.valTotX + COLS.valTotW - 2, ty, { align: 'right' });

  return y + h;
};

/* ============================================================================
   Observações e assinatura
   ============================================================================ */
const drawObservacoes = (doc: jsPDF, y: number, texto: string, fontSize: number): number => {
  doc.setFontSize(fontSize - 2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...EMERALD_DEEP);
  doc.text('OBSERVAÇÕES', PAGE.margin, y);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(PAGE.margin, y + 1.5, PAGE.margin + 30, y + 1.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...INK);
  doc.setFontSize(fontSize - 3);
  const linhas = doc.splitTextToSize(texto, CONTENT_W - 6);
  const boxH = Math.max(16, linhas.length * 4.4 + 6);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.setFillColor(252, 252, 250);
  doc.rect(PAGE.margin, y + 4, CONTENT_W, boxH, 'FD');
  doc.text(linhas, PAGE.margin + 3, y + 10);

  return y + 4 + boxH;
};

const drawSignature = (
  doc: jsPDF,
  y: number,
  dataSolicitacao: string,
  fontSize: number,
  assinatura?: string | null,
) => {
  const cx = PAGE.w / 2;
  if (assinatura) {
    try {
      doc.addImage(assinatura, 'PNG', cx - 40, y - 18, 80, 20);
    } catch { /* ignora imagem inválida */ }
  }
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(cx - 45, y, cx + 45, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize - 2);
  doc.setTextColor(...EMERALD_DEEP);
  doc.text('Assinatura do Solicitante', cx, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize - 3);
  doc.setTextColor(...MUTED);
  doc.text(`Inajá — PR, ${dataSolicitacao}`, cx, y + 10, { align: 'center' });
};

/* ============================================================================
   Anexos: imagens embutidas + lista de PDFs
   ============================================================================ */
const drawAnexos = async (
  doc: jsPDF,
  anexos: PDFAnexo[],
  fontSize: number,
  logo: string | null,
) => {
  if (!anexos.length) return;
  const imagens = anexos.filter((a) => a.type.startsWith('image/'));
  const pdfs = anexos.filter((a) => a.type === 'application/pdf');
  const outros = anexos.filter((a) => !a.type.startsWith('image/') && a.type !== 'application/pdf');

  // Uma imagem por página, centralizada
  for (const img of imagens) {
    const dataUrl = await loadImageAsDataUrl(img.url);
    if (!dataUrl) continue;
    doc.addPage();
    let y = drawHeader(doc, logo, fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize - 1);
    doc.setTextColor(...EMERALD_DEEP);
    doc.text(`Anexo: ${img.name}`, PAGE.margin, y);
    y += 4;
    const maxW = CONTENT_W;
    const maxH = PAGE.h - y - FOOTER_MARGIN - 5;
    // Descobrir proporção
    const tmp = new Image();
    tmp.src = dataUrl;
    await new Promise((r) => { tmp.onload = r; tmp.onerror = r; });
    const ratio = tmp.width && tmp.height ? tmp.width / tmp.height : 1;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    const x = PAGE.margin + (CONTENT_W - w) / 2;
    try { doc.addImage(dataUrl, 'PNG', x, y, w, h); } catch { /* ignora */ }
  }

  // Página final: lista de PDFs e outros
  const restantes = [...pdfs, ...outros];
  if (restantes.length) {
    doc.addPage();
    let y = drawHeader(doc, logo, fontSize);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(...EMERALD_DEEP);
    doc.text('Documentos Anexados', PAGE.margin, y);
    y += 6;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(PAGE.margin, y - 2, PAGE.margin + 45, y - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize - 3);
    doc.setTextColor(...INK);
    restantes.forEach((a, i) => {
      const line = `${String(i + 1).padStart(2, '0')}. ${a.name}`;
      doc.text(line, PAGE.margin, y + 4);
      doc.setTextColor(...EMERALD);
      doc.textWithLink('Abrir/baixar', PAGE.margin + CONTENT_W - 30, y + 4, { url: a.url });
      doc.setTextColor(...INK);
      y += 7;
      if (y > PAGE.h - FOOTER_MARGIN - 10) {
        doc.addPage();
        y = drawHeader(doc, logo, fontSize);
      }
    });
  }
};

const drawFooter = (doc: jsPDF, pageIndex: number, totalPages: number) => {
  const y = PAGE.h - 10;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(PAGE.margin, y - 4, PAGE.w - PAGE.margin, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Prefeitura Municipal de Inajá — Documento gerado eletronicamente',
    PAGE.margin, y);
  doc.text(`Página ${pageIndex} de ${totalPages}`,
    PAGE.w - PAGE.margin, y, { align: 'right' });
};

/* ============================================================================
   Render de uma solicitação
   ============================================================================ */
export const renderRequestOnPDF = async (
  doc: jsPDF,
  request: PDFRequest,
  logo: string | null,
  fontSize: number
): Promise<void> => {
  let y = drawHeader(doc, logo, fontSize);
  y = drawRequestContext(doc, request.contexto, y, fontSize);
  y = drawInfoBox(doc, request, y, fontSize);

  const temItens = request.items && request.items.length > 0;
  if (temItens) {
    const cols = buildCols(request.items);
    y = drawTableHeader(doc, cols, y, fontSize);
    request.items.forEach((item, index) => {
      if (y > PAGE.h - FOOTER_MARGIN - 40) {
        doc.addPage();
        y = drawHeader(doc, logo, fontSize);
        y = drawTableHeader(doc, cols, y, fontSize);
      }
      y = drawItemRow(doc, cols, y, item, index, fontSize);
    });

    const total = request.items.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
    if (y > PAGE.h - FOOTER_MARGIN - 60) {
      doc.addPage();
      y = drawHeader(doc, logo, fontSize);
    }
    y = drawTotalRow(doc, cols, y, total, fontSize);
    y += 10;
  }


  if (request.observacoes) {
    if (y > PAGE.h - FOOTER_MARGIN - 45) {
      doc.addPage();
      y = drawHeader(doc, logo, fontSize);
    }
    y = drawObservacoes(doc, y, request.observacoes, fontSize);
  }

  if (y > PAGE.h - FOOTER_MARGIN - 30) {
    doc.addPage();
    y = drawHeader(doc, logo, fontSize);
  }
  drawSignature(doc, y + 22, request.dataSolicitacao, fontSize, request.assinatura);

  if (request.anexos && request.anexos.length) {
    await drawAnexos(doc, request.anexos, fontSize, logo);
  }
};

const stampFooters = (doc: jsPDF) => {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total);
  }
};

const LOGO_PATH = '/brasao.png';

/** Gera e salva o PDF de uma única solicitação. */
export const generateRequestPDF = async (
  request: PDFRequest,
  fontSize: number,
  filename: string
): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadImageAsDataUrl(LOGO_PATH);
  await renderRequestOnPDF(doc, request, logo, fontSize);
  stampFooters(doc);
  doc.save(filename);
};

/** Gera e retorna o PDF como Blob (para envio por e-mail, etc.). */
export const generateRequestPDFBlob = async (
  request: PDFRequest,
  fontSize: number,
): Promise<Blob> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadImageAsDataUrl(LOGO_PATH);
  await renderRequestOnPDF(doc, request, logo, fontSize);
  stampFooters(doc);
  return doc.output('blob');
};

/** Gera e salva um PDF com várias solicitações (uma por página). */
export const generateBatchPDF = async (
  requests: PDFRequest[],
  fontSize: number,
  filename: string
): Promise<void> => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadImageAsDataUrl(LOGO_PATH);
  for (let i = 0; i < requests.length; i++) {
    if (i > 0) doc.addPage();
    await renderRequestOnPDF(doc, requests[i], logo, fontSize);
  }
  stampFooters(doc);
  doc.save(filename);
};

