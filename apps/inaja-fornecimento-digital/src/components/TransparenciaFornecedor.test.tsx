import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransparenciaFornecedor } from "./TransparenciaFornecedor";

describe("TransparenciaFornecedor", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          cnpj: "51241038000197",
          consultadoEm: "2026-08-09T21:00:00.000Z",
          tcu: { disponivel: true, consolidada: null, certidoes: [{ emissor: "TCU", tipo: "Inidoneos", descricao: "", situacao: "NADA_CONSTA", dataEmissao: "09/08/2026", observacao: "", link: "" }], inidoneos: [], erros: [] },
          portal: { configurado: true, ceis: [], cnep: [], contratos: [], erros: [] },
          resumo: { status: "regular", tcuOcorrencias: 0, portalOcorrencias: 0, totalOcorrencias: 0, certidoesComOcorrencia: 0, portalConfigurado: true, fontesComErro: 0, mensagem: "Nenhuma ocorrência foi encontrada nas fontes consultadas." },
          fontes: { tcuCertidoes: "https://example.test/tcu", tcuInidoneos: "https://example.test/inidoneos", portalSancoes: "https://example.test/sancoes", portalContratos: "https://example.test/contratos" },
        },
      }),
    })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("consulta automaticamente no cartão de CNPJ e mostra a situação oficial", async () => {
    render(<TransparenciaFornecedor cnpj="51241038000197" nome="Empresa Teste" auto />);
    expect(await screen.findByText("Sem ocorrências")).toBeInTheDocument();
    expect(screen.getByText("Certidões consolidadas — TCU")).toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/transparencia/cnpj?cnpj=51241038000197"), expect.anything()));
  });
});
