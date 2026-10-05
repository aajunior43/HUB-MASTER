import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BeneficiosSociais from "./BeneficiosSociais";

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
  useToast: () => ({ toast: toastMock }),
}));

describe("Página BeneficiosSociais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza cabeçalho e tabela de benefícios com sucesso", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/api/beneficios-sociais/status")) {
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            configurado: true,
            resumo: { registros: 1, valor_total: 285000, beneficiarios_total: 420 },
            porTipo: [{ tipo: "bolsa-familia", registros: 1, valor_total: 285000, max_beneficiarios: 420 }],
            meses: ["202602"],
            isAdmin: true,
          },
        }), { status: 200 }));
      }
      if (url.includes("/api/beneficios-sociais/historico")) {
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            rows: [
              {
                id: "1",
                mes_ano: "202602",
                tipo: "bolsa-familia",
                codigo_ibge: "4110300",
                municipio: "INAJÁ",
                uf: "PR",
                quantidade_beneficiarios: 420,
                valor_total: 285000,
                sincronizado_em: "2026-03-01",
              },
            ],
          },
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ data: null }), { status: 200 }));
    });

    render(
      <MemoryRouter>
        <BeneficiosSociais />
      </MemoryRouter>
    );

    expect(screen.getByText("Benefícios Sociais — Assistência e Cidadania")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Bolsa Família")).toBeInTheDocument();
      expect(screen.getByText("INAJÁ - PR")).toBeInTheDocument();
      expect(screen.getAllByText("R$ 285.000,00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("420").length).toBeGreaterThanOrEqual(1);
    });
  });
});
