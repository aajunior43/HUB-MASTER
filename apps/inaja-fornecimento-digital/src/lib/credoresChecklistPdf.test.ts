import { describe, expect, it, vi } from "vitest";

const pdfTexts: string[] = [];
let pdfPages = 1;

class PdfStub {
  setFillColor() { return this; }
  rect() { return this; }
  setFont() { return this; }
  setFontSize() { return this; }
  setTextColor() { return this; }
  setDrawColor() { return this; }
  setLineWidth() { return this; }
  line() { return this; }
  addImage() { return this; }
  setProperties() { return this; }
  splitTextToSize(value: string) { return [value]; }
  text(value: string) { pdfTexts.push(value); return this; }
  getNumberOfPages() { return pdfPages; }
  setPage() { return this; }
  addPage() { pdfPages += 1; return this; }
  save() { return this; }
}

vi.mock("jspdf", () => ({ default: PdfStub }));
vi.mock("@/lib/pdfGenerator", () => ({ loadImageAsDataUrl: vi.fn().mockResolvedValue(null) }));

import { gerarChecklistCredoresPdf } from "./credoresChecklistPdf";

describe("gerarChecklistCredoresPdf", () => {
  it("exibe o valor mensal atual do credor fixo", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;

    await gerarChecklistCredoresPdf({
      ano: 2026,
      mes: 7,
      filtroDep: "todos",
      busca: "",
      credores: [{
        id: "g-four",
        nome: "G FOUR",
        documento: "10.192.962/0001-43",
        departamento: "Administração",
        valor_mensal: 9776.6,
        descricao: "INTERNET",
        email: null,
        tipo_valor: "FIXO",
        solicitacao: null,
        pagamento: null,
        obs: null,
      }],
      empenhos: [{
        id: "emp-julho",
        credor_id: "g-four",
        ano: 2026,
        mes: 7,
        status: "empenhado",
        valor: 4215,
        numero_empenho: null,
        observacao: null,
        empenhado_em: "2026-07-01",
      }],
    });

    expect(pdfTexts.some((value) => value.includes("9.776,60"))).toBe(true);
    expect(pdfTexts.some((value) => value.includes("4.215,00"))).toBe(false);
  });

  it("cria uma pagina de resumo quando os totais nao cabem apos as fichas", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;
    const credores = Array.from({ length: 6 }, (_, index) => ({
      id: `c${index}`,
      nome: `Credor ${index}`,
      documento: null,
      departamento: "Administracao",
      valor_mensal: 100,
      descricao: null,
      email: null,
      tipo_valor: "FIXO",
      solicitacao: null,
      pagamento: null,
      obs: null,
    }));

    await gerarChecklistCredoresPdf({
      ano: 2026,
      mes: 7,
      filtroDep: "todos",
      busca: "credor",
      credores,
      empenhos: [],
    });

    expect(pdfPages).toBe(2);
    expect(pdfTexts.some((value) => value.startsWith("CREDORES: 6"))).toBe(true);
    expect(pdfTexts.some((value) => value.startsWith("TOTAL EMPENHADO:"))).toBe(true);
  });
});
