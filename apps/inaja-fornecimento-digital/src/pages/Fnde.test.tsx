import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Fnde from "./Fnde";

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
  useToast: () => ({ toast: toastMock }),
}));

describe("Página Fnde", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza cabeçalho e cards com sucesso", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/fnde/status")) {
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            resumo: { total: 2, valor_total: 150000 },
            porPrograma: [{ programa: "PNAE", total: 1, valor: 80000 }],
            anos: [2026],
            urls: { portal: "https://www.fnde.gov.br", liberacoes: "https://www.fnde.gov.br" },
            isAdmin: true,
          },
        }), { status: 200 }));
      }
      if (url.includes("/api/fnde/repasses")) {
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            rows: [
              {
                id: "1",
                ano: 2026,
                programa: "PNAE",
                acao: "Alimentação Escolar",
                numero_processo: "123",
                entidade: "Prefeitura",
                cnpj_entidade: "76970318000167",
                escola: "Escola Municipal",
                valor_pago: 80000,
                data_pagamento: "2026-03-01",
                numero_ordem_bancaria: "2026OB01",
                sincronizado_em: "2026-03-01",
              },
            ],
            total: 1,
            pagina: 1,
            porPagina: 30,
          },
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
    });

    render(
      <MemoryRouter>
        <Fnde />
      </MemoryRouter>
    );

    expect(screen.getByText("FNDE — Recursos da Educação")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("PNAE").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Alimentação Escolar")).toBeInTheDocument();
      expect(screen.getByText("R$ 150.000,00")).toBeInTheDocument();
    });
  });
});
