import { describe, expect, it, vi } from "vitest";

const pdfTexts: string[] = [];
let pdfPages = 1;
const writtenFiles: { filename: string; book: unknown }[] = [];

class PdfStub {
  setFillColor() { return this; }
  rect() { return this; }
  roundedRect() { return this; }
  setFont() { return this; }
  setFontSize() { return this; }
  setTextColor() { return this; }
  setDrawColor() { return this; }
  setLineWidth() { return this; }
  line() { return this; }
  addImage() { return this; }
  setProperties() { return this; }
  splitTextToSize(value: string) { return [value]; }
  text(value: string | string[]) {
    if (Array.isArray(value)) pdfTexts.push(...value);
    else pdfTexts.push(value);
    return this;
  }
  getNumberOfPages() { return pdfPages; }
  setPage() { return this; }
  addPage() { pdfPages += 1; return this; }
  save() { return this; }
}

vi.mock("jspdf", () => ({ default: PdfStub }));
vi.mock("@/lib/pdfGenerator", () => ({ loadImageAsDataUrl: vi.fn().mockResolvedValue(null) }));

const mockXlsx = {
  utils: {
    book_new: () => ({ Sheets: {}, SheetNames: [] }),
    json_to_sheet: (data: unknown) => ({ data }),
    book_append_sheet: (wb: { SheetNames: string[] }, ws: unknown, name: string) => {
      wb.SheetNames.push(name);
    },
  },
  writeFile: (book: unknown, filename: string) => {
    writtenFiles.push({ filename, book });
  },
};

vi.mock("xlsx-js-style", () => ({
  default: mockXlsx,
  utils: mockXlsx.utils,
  writeFile: mockXlsx.writeFile,
}));

import { exportarTcePrExcel, exportarTcePrPdf } from "./tceprExport";

describe("tceprExport", () => {
  const mockLicitacoes = [
    {
      id: "lic-1",
      chave_externa: "ext-1",
      orgao_nome: "Município de Inajá",
      codigo_ibge: "4110300",
      municipio: "Inajá",
      ano: 2026,
      processo: "05/2026",
      edital: "01/2026",
      modalidade: "Pregão Eletrônico",
      tipo_avaliacao: "Menor Preço",
      objeto: "Contratação de serviços de engenharia",
      data_abertura: "2026-03-01",
      data_publicacao: "2026-02-15",
      valor_referencia: 150000,
      data_cancelamento: null,
      situacao: "Em andamento",
      pncp_encontrado: 1,
    },
  ];

  it("exporta relatório Excel do TCE-PR", async () => {
    writtenFiles.length = 0;
    await exportarTcePrExcel({
      tab: "licitacoes",
      licitacoes: mockLicitacoes,
      obras: [],
      pendencias: null,
      ano: "2026",
      busca: "",
      total: 1,
    });
    expect(writtenFiles.length).toBe(1);
    expect(writtenFiles[0].filename).toContain("tcepr-licitacoes");
    const book = writtenFiles[0].book as { SheetNames: string[] };
    expect(book.SheetNames).toContain("Licitações");
    expect(book.SheetNames).toContain("Resumo");
  });

  it("exporta relatório PDF do TCE-PR", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;
    await exportarTcePrPdf({
      tab: "licitacoes",
      licitacoes: mockLicitacoes,
      obras: [],
      pendencias: null,
      ano: "2026",
      busca: "",
      total: 1,
    });
    expect(pdfTexts.some((t) => t.includes("PREFEITURA MUNICIPAL DE INAJÁ"))).toBe(true);
    expect(pdfTexts.some((t) => t.includes("TCE-PR"))).toBe(true);
  });
});
