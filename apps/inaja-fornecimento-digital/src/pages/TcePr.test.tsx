import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: "admin" }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/AppFooter", () => ({ AppFooter: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import TcePr from "./TcePr";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const caminho = url.replace("/api/tce-pr", "");
    const data = caminho === "/status"
      ? { config: { cnpj: "76970318000167", ibge: "4110300", anos: [2026], intervaloHoras: 24 }, resumo: { licitacoes: 2, valor_licitacoes: 1000, obras: 1, valor_obras: 5000, obras_paralisadas: 0, obras_sem_acompanhamento: 0 }, ultima: null, isAdmin: true, sincronizacaoAutomatica: false }
      : { rows: [], total: 0, pagina: 1, porPagina: 30 };
    return new Response(JSON.stringify({ data, error: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TcePr", () => {
  it("carrega o painel e mostra o estado vazio da fonte oficial", async () => {
    render(<MemoryRouter><TcePr /></MemoryRouter>);
    expect(screen.getByText("TCE-PR — Dados abertos")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Nenhuma licitação do TCE-PR encontrada.")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Licitações" })).toBeInTheDocument();
    expect(screen.getAllByText("Obras municipais").length).toBeGreaterThan(0);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
