import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  AuthProvider,
  parseModulosDisponiveis,
  RequireModulo,
  RequireAdmin,
} from "./AuthContext";
import { db } from "@/integrations/db/client";

vi.mock("@/integrations/db/client", () => ({
  db: {
    rpc: vi.fn((fn: string) => {
      if (fn === "usuario_validar_sessao") {
        return Promise.resolve({ data: { valido: true, username: "luana" }, error: null });
      }
      if (fn === "usuario_modulos_disponiveis") {
        return Promise.resolve({ data: [{ modulo_id: "solicitacoes", is_admin: false, mostrar_bloqueados: false }], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
  },
}));

function renderWithAuth(
  ui: React.ReactNode,
  opts: {
    user?: string;
    isAdmin?: boolean;
    modulos?: string[];
    initialPath?: string;
    serverSession?: boolean;
  } = {},
) {
  const {
    user = "luana",
    isAdmin = false,
    modulos = ["solicitacoes"],
    initialPath = "/",
    serverSession = true,
  } = opts;

  vi.mocked(db.rpc).mockImplementation((fn: string) => {
    if (fn === "usuario_validar_sessao") {
      return Promise.resolve(serverSession
        ? { data: { valido: true, username: user }, error: null }
        : { data: null, error: { message: "Acesso negado", code: "FORBIDDEN" } });
    }
    if (fn === "usuario_modulos_disponiveis") {
      return Promise.resolve({ data: [{ modulo_id: modulos[0] ?? null, is_admin: isAdmin, mostrar_bloqueados: false }], error: null });
    }
    return Promise.resolve({ data: true, error: null });
  });

  localStorage.setItem("prefeitura_user", user);
  localStorage.setItem("prefeitura_is_admin", String(isAdmin));
  localStorage.setItem("prefeitura_modulos", JSON.stringify(modulos));
  localStorage.setItem("prefeitura_mostrar_bloqueados", "false");

  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <Routes>
          <Route path="/" element={<div data-testid="hub">Hub</div>} />
          <Route path="/login" element={<div data-testid="login">Login</div>} />
          <Route path="/empenhos" element={ui} />
          <Route path="/admin" element={ui} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("parseModulosDisponiveis", () => {
  it("rejeita null e lista vazia", () => {
    expect(parseModulosDisponiveis(null).ok).toBe(false);
    expect(parseModulosDisponiveis([]).ok).toBe(false);
  });

  it("extrai módulos e filtra null", () => {
    const r = parseModulosDisponiveis([
      { modulo_id: null, is_admin: true, mostrar_bloqueados: false },
    ]);
    expect(r.ok).toBe(true);
    expect(r.isAdmin).toBe(true);
    expect(r.modulos).toEqual([]);
  });

  it("lista módulos liberados", () => {
    const r = parseModulosDisponiveis([
      { modulo_id: "empenhos", is_admin: false, mostrar_bloqueados: true },
      { modulo_id: "solicitacoes", is_admin: false, mostrar_bloqueados: true },
    ]);
    expect(r.modulos).toEqual(["empenhos", "solicitacoes"]);
    expect(r.mostrarBloqueados).toBe(true);
  });
});

describe("RequireModulo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redireciona para hub quando módulo não liberado", async () => {
    renderWithAuth(
      <RequireModulo modulo="empenhos">
        <div data-testid="page">Empenhos</div>
      </RequireModulo>,
      { modulos: ["solicitacoes"], initialPath: "/empenhos" },
    );
    await waitFor(() => expect(screen.getByTestId("hub")).toBeInTheDocument());
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });

  it("renderiza página quando módulo liberado", async () => {
    renderWithAuth(
      <RequireModulo modulo="empenhos">
        <div data-testid="page">Empenhos</div>
      </RequireModulo>,
      { modulos: ["empenhos", "solicitacoes"], initialPath: "/empenhos" },
    );
    await waitFor(() => expect(screen.getByTestId("page")).toBeInTheDocument());
  });

  it("admin acessa módulo mesmo sem ele na lista", async () => {
    renderWithAuth(
      <RequireModulo modulo="empenhos">
        <div data-testid="page">Empenhos</div>
      </RequireModulo>,
      { isAdmin: true, modulos: ["solicitacoes"], initialPath: "/empenhos" },
    );
    await waitFor(() => expect(screen.getByTestId("page")).toBeInTheDocument());
  });
});

describe("RequireAdmin", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("bloqueia não-admin", async () => {
    renderWithAuth(
      <RequireAdmin>
        <div data-testid="page">Admin</div>
      </RequireAdmin>,
      { isAdmin: false, modulos: [], initialPath: "/admin" },
    );
    await waitFor(() => expect(screen.getByTestId("hub")).toBeInTheDocument());
  });

  it("permite admin", async () => {
    renderWithAuth(
      <RequireAdmin>
        <div data-testid="page">Admin</div>
      </RequireAdmin>,
      { isAdmin: true, modulos: [], initialPath: "/admin" },
    );
    await waitFor(() => expect(screen.getByTestId("page")).toBeInTheDocument());
  });

  it("ignora localStorage forjado quando não há sessão HTTP válida", async () => {
    renderWithAuth(
      <RequireAdmin>
        <div data-testid="page">Admin</div>
      </RequireAdmin>,
      { isAdmin: true, modulos: ["tarefas"], initialPath: "/admin", serverSession: false },
    );

    await waitFor(() => expect(screen.getByTestId("login")).toBeInTheDocument());
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(localStorage.getItem("prefeitura_user")).toBeNull();
    expect(localStorage.getItem("prefeitura_is_admin")).toBeNull();
  });
});
