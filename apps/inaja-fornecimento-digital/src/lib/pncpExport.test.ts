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

import { exportarPncpExcel, exportarPncpPdf } from "./pncpExport";

describe("pncpExport", () => {
  const mockRegistros = [
    {
      id: "reg-1",
      tipo: "contratacao",
      chave_pncp: "chave-12345",
      titulo: "Pregão 01",
      objeto: "Aquisição de pneus",
      numero: "01/2026",
      ano: 2026,
      processo: "10/2026",
      modalidade: "Pregão",
      situacao: "Homologado",
      valor: 80000,
      fornecedor_nome: "Pneus do Paraná Ltda",
      fornecedor_cnpj: "12345678000199",
      data_publicacao: "2026-02-01",
      vigencia_inicio: null,
      vigencia_fim: null,
      url: null,
    },
  ];

  it("exporta relatório Excel do PNCP", async () => {
    writtenFiles.length = 0;
    await exportarPncpExcel({
      tab: "contratacao",
      registros: mockRegistros,
      pendencias: null,
      busca: "",
      total: 1,
    });
    expect(writtenFiles.length).toBe(1);
    expect(writtenFiles[0].filename).toContain("pncp-contratacao");
    const book = writtenFiles[0].book as { SheetNames: string[] };
    expect(book.SheetNames).toContain("Registros");
    expect(book.SheetNames).toContain("Resumo");
  });

  it("exporta relatório PDF do PNCP", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;
    await exportarPncpPdf({
      tab: "contratacao",
      registros: mockRegistros,
      pendencias: null,
      busca: "",
      total: 1,
    });
    expect(pdfTexts.some((t) => t.includes("PREFEITURA MUNICIPAL DE INAJÁ"))).toBe(true);
    expect(pdfTexts.some((t) => t.includes("PNCP"))).toBe(true);
  });
});
