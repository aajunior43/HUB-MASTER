import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import Extratos from "./Extratos";

const mockRpc = vi.fn();

vi.mock("@/integrations/db/client", () => ({
  db: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Extratos />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function createDefaultMock() {
  return (fn: string) => {
    switch (fn) {
      case "usuario_validar_sessao":
        return Promise.resolve({ data: { valido: true }, error: null });
      case "usuario_modulos_disponiveis":
        return Promise.resolve({
          data: [{ modulo_id: "extratos", is_admin: true, mostrar_bloqueados: false }],
          error: null,
        });
      case "em_contas_listar":
        return Promise.resolve({
          data: [{
            id: "conta-1", nome: "Banco do Brasil", banco: "BB", tipo: "corrente",
            saldo_inicial: 0, ativo: 1, saldo_calculado: 0, criado_em: "2026-01-01",
          }],
          error: null,
        });
      case "em_dashboard":
        return Promise.resolve({
          data: {
            totalContas: 0, totalTransacoes: 0, totalReceitas: 0, totalDespesas: 0,
            alertasPendentes: 0, porCategoria: [],
          },
          error: null,
        });
      case "em_transacoes_listar":
        return Promise.resolve({
          data: {
            rows: [], total: 0, pagina: 1, porPagina: 50, totalPaginas: 0,
            totais: { receitas: 0, despesas: 0 },
          },
          error: null,
        });
      case "em_alertas_listar":
        return Promise.resolve({ data: [], error: null });
      default:
        return Promise.resolve({ data: null, error: { message: `unexpected rpc: ${fn}` } });
    }
  };
}

beforeEach(() => {
  localStorage.setItem("prefeitura_user", "testuser");
  localStorage.setItem("prefeitura_is_admin", "true");
  localStorage.setItem("prefeitura_modulos", '["extratos"]');
  mockRpc.mockImplementation(createDefaultMock());
});

afterEach(() => {
  localStorage.clear();
});

describe("Extratos", () => {
  it("renders the header", async () => {
    renderPage();
    await waitFor(() => expect(screen.queryByText("Carregando...")).not.toBeInTheDocument());
    expect(screen.getByText("Extratos bancários")).toBeInTheDocument();
  });

  it("shows loading state initially then renders dashboard", async () => {
    renderPage();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Painel")).toBeInTheDocument();
    });
  });
});
