import { describe, expect, it, vi } from "vitest";
import type { DossieFornecedorData } from "@/types/dossie";

const pdfTexts: string[] = [];
let pdfPages = 1;

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

import { gerarPdfDossie } from "./dossiePdf";

describe("gerarPdfDossie", () => {
  it("monta o PDF com cabeçalho, diagnóstico e dados do fornecedor", async () => {
    pdfTexts.length = 0;
    pdfPages = 1;

    const mockDossie: DossieFornecedorData = {
      cnpj: "51241038000197",
      cnpjFormatado: "51.241.038/0001-97",
      geradoEm: "2026-09-07T12:00:00.000Z",
      diagnostico: {
        nivelRisco: "BAIXO",
        status: "Regular",
        apto: true,
        pontosAtencao: [],
        pontosPositivos: ["Sem ocorrências no TCU"],
      },
      cadastral: {
        cnpj: "51241038000197",
        razao_social: "Empresa Teste Ltda",
        nome_fantasia: "Empresa Teste",
        situacao: "Ativa",
        data_situacao: "2020-01-01",
        data_abertura: "2015-05-10",
        natureza_juridica: "Sociedade Limitada",
        capital_social: "R$ 100.000,00",
        porte: "Demais",
        simples: "Não",
        mei: "Não",
        matriz: "Matriz",
        endereco: "Rua Principal, 100",
        cnae_principal: "62.01-5-01",
        cnaes_secundarios: [],
        socios: [{ nome: "João Silva", qualificacao: "Sócio-Administrador" }],
        telefones: ["(44) 3444-1234"],
        emails: ["contato@teste.com"],
        fonte: "BrasilAPI",
      },
      transparencia: {
        consultadoEm: "2026-09-07T12:00:00.000Z",
        tcu: {
          disponivel: true,
          consolidada: null,
          certidoes: [{ emissor: "TCU", tipo: "Inidôneos", descricao: "", situacao: "NADA_CONSTA", dataEmissao: "", observacao: "", link: "" }],
          inidoneos: [],
          erros: [],
        },
        portal: {
          configurado: true,
          ceis: [],
          cnep: [],
          contratos: [],
          erros: [],
        },
        resumo: {
          status: "regular",
          tcuOcorrencias: 0,
          portalOcorrencias: 0,
          totalOcorrencias: 0,
          certidoesComOcorrencia: 0,
          portalConfigurado: true,
          fontesComErro: 0,
          mensagem: "Regular",
        },
        fontes: {
          tcuCertidoes: "",
          tcuInidoneos: "",
          portalSancoes: "",
          portalContratos: "",
        },
      },
      pncp: {
        total: 1,
        valorTotal: 50000,
        registros: [{
          id: "pncp-1",
          tipo: "contratacao",
          chave_pncp: "chave-123",
          titulo: "Pregão",
          objeto: "Fornecimento de materiais",
          numero: "01/2026",
          ano: 2026,
          processo: "10/2026",
          modalidade: "Pregão Eletrônico",
          situacao: "Homologado",
          valor: 50000,
          fornecedor_nome: "Empresa Teste Ltda",
          data_publicacao: "2026-01-10",
          vigencia_inicio: null,
          vigencia_fim: null,
          url: null,
        }],
      },
      municipio: {
        totalEmpenhos: 2,
        totalEmpenhado: 35000,
        totalLiquidado: 35000,
        totalPago: 30000,
        saldoPagar: 5000,
        primeiroAno: 2025,
        ultimoAno: 2026,
        anos: [2026, 2025],
        ultimosEmpenhos: [{
          id: "emp-1",
          numero_empenho: "150",
          ano_empenho: 2026,
          tipo_empenho: "Ordinário",
          modalidade: "Pregão",
          data: "2026-02-15",
          especificacao: "Material elétrico",
          valor_empenhado_bruto: 20000,
          valor_liquidado_bruto: 20000,
          saldo_pagar: 0,
          nome_credor: "Empresa Teste Ltda",
          id_credor: "51241038000197",
        }],
        credorFixo: null,
      },
    };

    await gerarPdfDossie(mockDossie);

    expect(pdfTexts.some((t) => t.includes("PREFEITURA MUNICIPAL DE INAJÁ"))).toBe(true);
    expect(pdfTexts.some((t) => t.includes("51.241.038/0001-97"))).toBe(true);
    expect(pdfTexts.some((t) => t.includes("Empresa Teste Ltda"))).toBe(true);
    expect(pdfTexts.some((t) => t.includes("DIAGNÓSTICO: RISCO BAIXO"))).toBe(true);
  });
});
