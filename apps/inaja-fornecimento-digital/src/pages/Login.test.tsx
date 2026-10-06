import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";
import { AuthProvider } from "@/contexts/AuthContext";

vi.mock("@/integrations/db/client", () => ({
  db: {
    rpc: vi.fn((fn: string) => {
      if (fn === "usuario_validar_sessao") {
        return Promise.resolve({ data: null, error: null });
      }
      if (fn === "usuario_login") {
        return Promise.resolve({
          data: { ok: true, precisa_criar: false, bloqueado: false, bloqueadoPor: 0, tentativasRestantes: 5 },
          error: null,
        });
      }
      if (fn === "usuario_modulos_disponiveis") {
        return Promise.resolve({
          data: [{ modulo_id: "solicitacoes", is_admin: true, mostrar_bloqueados: true }],
          error: null,
        });
      }
      return Promise.resolve({ data: true, error: null });
    }),
  },
}));

describe("Página de Login", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renderiza os elementos principais da tela de login", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Prefeitura Municipal de Inajá/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Acesse o sistema/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Usuário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Entrar/i })).toBeInTheDocument();
  });

  it("valida formulário quando campos estão vazios", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const btnEntrar = screen.getByRole("button", { name: /^Entrar/i });
    fireEvent.click(btnEntrar);

    await waitFor(() => {
      expect(screen.getByText(/Digite seu usuário/i)).toBeInTheDocument();
    });
  });

  it("permite navegar para recuperação de senha", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const linkEsqueci = screen.getByRole("button", { name: /Esqueci minha senha/i });
    fireEvent.click(linkEsqueci);

    await waitFor(() => {
      expect(screen.getByText(/Informe seu usuário para recuperar a senha/i)).toBeInTheDocument();
    });
  });
});
