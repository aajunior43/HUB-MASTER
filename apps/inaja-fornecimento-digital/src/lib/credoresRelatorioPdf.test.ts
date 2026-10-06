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

import { gerarRelatorioCredoresPdf } from "./credoresRelatorioPdf";

describe("gerarRelatorioCredoresPdf", () => {
  it("exibe o valor mensal de cada credor, mesmo sem empenho no ano", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;

    await gerarRelatorioCredoresPdf({
      ano: 2026,
      filtroDep: "todos",
      busca: "",
      credores: [{
        id: "avr",
        nome: "AVR SERVICOS ADMINISTRATIVOS LTDA",
        documento: "50.105.570/0001-14",
        departamento: "Administração",
        valor_mensal: 3900,
        descricao: null,
        email: null,
        tipo_valor: "FIXO",
        solicitacao: null,
        pagamento: null,
        obs: null,
      }],
      empenhos: [],
      totalValorMensal: 3900,
    });

    expect(pdfTexts).toContain("VALOR MENSAL");
    expect(pdfTexts).toContain("R$ 3.900,00");
  });

  it("cria uma nova pagina para os totais quando a tabela ocupa o rodape", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;
    const credores = Array.from({ length: 26 }, (_, index) => ({
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

    await gerarRelatorioCredoresPdf({
      ano: 2026,
      filtroDep: "todos",
      busca: "",
      credores,
      empenhos: [],
      totalValorMensal: 2600,
    });

    expect(pdfPages).toBeGreaterThan(1);
    expect(pdfTexts.some((value) => value.startsWith("SOMA MENSAL:"))).toBe(true);
    expect(pdfTexts.some((value) => value.startsWith("EMPENHADO 2026:"))).toBe(true);
  });
});
