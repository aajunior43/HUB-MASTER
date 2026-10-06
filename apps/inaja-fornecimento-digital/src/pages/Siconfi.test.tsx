import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: "admin" }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/AppFooter", () => ({ AppFooter: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import Siconfi from "./Siconfi";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const caminho = url.replace("/api/siconfi", "");
    const data = caminho === "/status"
      ? { config: { ibge: "4110300", anos: [2025], intervaloHoras: 24 }, totais: { rreo: 1, rgf: 1, dca: 0, entregas: 1 }, cobertura: [], ultima: null, isAdmin: true, sincronizacaoAutomatica: false }
      : caminho.startsWith("/indicadores")
        ? {
          ano: 2025,
          anosDisponiveis: [2025],
          periodoRreo: 6,
          periodoRgf: 3,
          rreo: { receitaTotal: { valor: 1234.5, coluna: "Até o bimestre", conta: "Receita", cod_conta: "TotalReceitas", anexo: "RREO-Anexo 01", periodo: 6, exercicio: 2025 }, despesaEmpenhada: null, despesaPaga: null, rcl: null, saude: null, educacao: null },
          rgf: { pessoalPercentual: { valor: 48, coluna: "%", conta: "Pessoal", cod_conta: "DTP", anexo: "RGF-Anexo 06", periodo: 3, exercicio: 2025 }, pessoalValor: null, limitePessoal: null, limiteAlerta: null, dividaPercentual: null, caixaLiquida: null, restosPagar: null },
          alertas: [],
          cobertura: [],
          fonte: "https://www.tesourotransparente.gov.br/consultas/consultas-siconfi",
        }
        : { rows: [], total: 0, pagina: 1, porPagina: 30 };
    return new Response(JSON.stringify({ data, error: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Siconfi", () => {
  it("carrega indicadores fiscais e tabs de demonstrativos", async () => {
    render(<MemoryRouter><Siconfi /></MemoryRouter>);
    expect(screen.getByText("SICONFI - Indicadores fiscais")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Receita total realizada")).toBeInTheDocument());
    expect(screen.getByText("R$ 1.234,50")).toBeInTheDocument();
    expect(screen.getByText("Despesa com pessoal")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "RREO" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Entregas" })).toBeInTheDocument();
  });
});
