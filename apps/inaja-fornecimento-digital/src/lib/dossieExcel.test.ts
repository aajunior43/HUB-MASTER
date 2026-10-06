import { describe, expect, it, vi } from "vitest";
import type { DossieFornecedorData } from "@/types/dossie";

const writtenFiles: { filename: string; book: unknown }[] = [];

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

import { exportarDossieExcel } from "./dossieExcel";

describe("exportarDossieExcel", () => {
  it("gera o arquivo Excel com as abas corretas do dossiê", async () => {
    writtenFiles.length = 0;

    const mockDossie: DossieFornecedorData = {
      cnpj: "51241038000197",
      cnpjFormatado: "51.241.038/0001-97",
      geradoEm: "2026-09-07T12:00:00.000Z",
      diagnostico: {
        nivelRisco: "BAIXO",
        status: "Regular",
        apto: true,
        pontosAtencao: [],
        pontosPositivos: ["Sem sanções ativas"],
      },
      cadastral: {
        cnpj: "51241038000197",
        razao_social: "Empresa Teste Ltda",
        nome_fantasia: "Empresa Teste",
        situacao: "Ativa",
        data_situacao: "2020-01-01",
        data_abertura: "2015-05-10",
        natureza_juridica: "LTDA",
        capital_social: "R$ 50.000,00",
        porte: "ME",
        simples: "Sim",
        mei: "Não",
        matriz: "Matriz",
        endereco: "Rua A",
        cnae_principal: "1234",
        cnaes_secundarios: [],
        socios: [],
        telefones: [],
        emails: [],
        fonte: "BrasilAPI",
      },
      transparencia: {
        consultadoEm: "2026-09-07T12:00:00.000Z",
        tcu: {
          disponivel: true,
          consolidada: null,
          certidoes: [],
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
        valorTotal: 10000,
        registros: [{
          id: "1",
          tipo: "contratacao",
          chave_pncp: "c1",
          titulo: "T",
          objeto: "O",
          numero: "1",
          ano: 2026,
          processo: "P",
          modalidade: "M",
          situacao: "S",
          valor: 10000,
          fornecedor_nome: "F",
          data_publicacao: "2026-01-01",
          vigencia_inicio: null,
          vigencia_fim: null,
          url: null,
        }],
      },
      municipio: {
        totalEmpenhos: 1,
        totalEmpenhado: 5000,
        totalLiquidado: 5000,
        totalPago: 5000,
        saldoPagar: 0,
        primeiroAno: 2026,
        ultimoAno: 2026,
        anos: [2026],
        ultimosEmpenhos: [{
          id: "e1",
          numero_empenho: "10",
          ano_empenho: 2026,
          tipo_empenho: "Ord",
          modalidade: "Mod",
          data: "2026-01-10",
          especificacao: "Esp",
          valor_empenhado_bruto: 5000,
          valor_liquidado_bruto: 5000,
          saldo_pagar: 0,
          nome_credor: "Empresa Teste Ltda",
          id_credor: "51241038000197",
        }],
        credorFixo: null,
      },
    };

    await exportarDossieExcel(mockDossie);

    expect(writtenFiles.length).toBe(1);
    expect(writtenFiles[0].filename).toBe("dossie-fornecedor-51241038000197.xlsx");
    const book = writtenFiles[0].book as { SheetNames: string[] };
    expect(book.SheetNames).toContain("Resumo");
    expect(book.SheetNames).toContain("Dados Cadastrais");
    expect(book.SheetNames).toContain("Sanções e TCU");
    expect(book.SheetNames).toContain("Contratações PNCP");
    expect(book.SheetNames).toContain("Empenhos Inajá");
  });
});
