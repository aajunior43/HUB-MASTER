import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Arquivos from "./Arquivos";

const { toastMock, navigateMock, useAuthMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: toastMock, useToast: () => ({ toast: toastMock }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => useAuthMock() }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const rpcHandlers: Record<string, () => unknown> = {};
const rpcCalls: Array<{ fn: string; args: unknown }> = [];
const rpcMock = vi.fn((fn: string, args: unknown) => {
  rpcCalls.push({ fn, args });
  if (rpcHandlers[fn]) return Promise.resolve(rpcHandlers[fn]());
  return Promise.resolve({ data: null, error: null });
});

vi.mock("@/integrations/db/client", () => ({
  db: {
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { previewPath: null }, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  },
}));

function authAdmin() {
  useAuthMock.mockReturnValue({
    user: "admin",
    isAdmin: true,
    modulosLiberados: ["gestao-documentos"],
    mostrarBloqueados: false,
    temModulo: () => true,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Arquivos />
    </MemoryRouter>
  );
}

describe("Arquivos page", () => {
  beforeEach(() => {
    toastMock.mockClear();
    navigateMock.mockClear();
    rpcMock.mockClear();
    rpcCalls.length = 0;
    for (const k of Object.keys(rpcHandlers)) delete rpcHandlers[k];
    authAdmin();
  });

  it("renderiza cabeçalho e estado vazio quando não há pastas ou arquivos", async () => {
    rpcHandlers["gd_arquivos_listar"] = () => ({
      data: { pastas: [], arquivos: [], totalBytes: 0, totalArquivos: 0, totalPastas: 0 },
      error: null,
    });

    renderPage();

    expect(await screen.findByText("Esta pasta está vazia")).toBeInTheDocument();
    expect(screen.getByText("Arquivos nesta pasta")).toBeInTheDocument();
    expect(screen.getByText("Pastas nesta pasta")).toBeInTheDocument();
    expect(screen.getByText("Espaço nesta pasta")).toBeInTheDocument();
  });

  it("lista pastas e arquivos e permite busca textual", async () => {
    const mockPastas = [{ id: "pasta-1", nome: "Contratos 2026", criado_por: "admin" }];
    const mockArquivos = [
      {
        id: "arq-1",
        nome_original: "contrato_prestacao.pdf",
        caminho: "arquivos/raiz/contrato_prestacao.pdf",
        preview_caminho: null,
        mime: "application/pdf",
        tamanho: 2048,
        criado_por: "admin",
        criado_em: "2026-03-01T10:00:00Z",
      },
      {
        id: "arq-2",
        nome_original: "relatorio_mensal.xlsx",
        caminho: "arquivos/raiz/relatorio_mensal.xlsx",
        preview_caminho: null,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        tamanho: 4096,
        criado_por: "gestor",
        criado_em: "2026-03-02T10:00:00Z",
      },
    ];

    rpcHandlers["gd_arquivos_listar"] = () => ({
      data: { pastas: mockPastas, arquivos: mockArquivos, totalBytes: 6144, totalArquivos: 2, totalPastas: 1 },
      error: null,
    });

    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Contratos 2026")).toBeInTheDocument();
    expect(screen.getByText("contrato_prestacao.pdf")).toBeInTheDocument();
    expect(screen.getByText("relatorio_mensal.xlsx")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar arquivos ou pastas/i);
    await user.type(searchInput, "relatorio");

    expect(screen.getByText("relatorio_mensal.xlsx")).toBeInTheDocument();
    expect(screen.queryByText("contrato_prestacao.pdf")).not.toBeInTheDocument();
    expect(screen.queryByText("Contratos 2026")).not.toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: "Limpar busca" });
    await user.click(clearButton);

    expect(screen.getByText("contrato_prestacao.pdf")).toBeInTheDocument();
    expect(screen.getByText("Contratos 2026")).toBeInTheDocument();
  });

  it("abre modal e renomeia arquivo manualmente", async () => {
    const mockArquivos = [
      {
        id: "arq-1",
        nome_original: "doc_original.pdf",
        caminho: "arquivos/raiz/doc_original.pdf",
        preview_caminho: null,
        mime: "application/pdf",
        tamanho: 1024,
        criado_por: "admin",
        criado_em: "2026-03-01T10:00:00Z",
      },
    ];

    rpcHandlers["gd_arquivos_listar"] = () => ({
      data: { pastas: [], arquivos: mockArquivos },
      error: null,
    });

    rpcHandlers["gd_arquivo_renomear"] = () => ({
      data: { id: "arq-1", nome_original: "doc_atualizado.pdf" },
      error: null,
    });

    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("doc_original.pdf")).toBeInTheDocument();

    const btnRenomear = screen.getByRole("button", { name: "Renomear doc_original.pdf" });
    await user.click(btnRenomear);

    expect(screen.getByText("Renomear arquivo")).toBeInTheDocument();
    const inputNome = screen.getByDisplayValue("doc_original.pdf");
    await user.clear(inputNome);
    await user.type(inputNome, "doc_atualizado.pdf");

    const btnSalvar = screen.getByRole("button", { name: "Salvar" });
    await user.click(btnSalvar);

    await waitFor(() => {
      const call = rpcCalls.find((c) => c.fn === "gd_arquivo_renomear");
      expect(call).toBeDefined();
      expect(call?.args).toMatchObject({ _id: "arq-1", _nome: "doc_atualizado.pdf" });
    });
  });

  it("permite copiar link de acesso ao arquivo", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeTextMock);

    const mockArquivos = [
      {
        id: "arq-1",
        nome_original: "oficio.pdf",
        caminho: "arquivos/raiz/oficio.pdf",
        preview_caminho: null,
        mime: "application/pdf",
        tamanho: 1024,
        criado_por: "admin",
        criado_em: "2026-03-01T10:00:00Z",
      },
    ];

    rpcHandlers["gd_arquivos_listar"] = () => ({
      data: { pastas: [], arquivos: mockArquivos },
      error: null,
    });

    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("oficio.pdf")).toBeInTheDocument();

    const btnCopiar = screen.getByRole("button", { name: "Copiar link de oficio.pdf" });
    await user.click(btnCopiar);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("/api/files/arquivos/raiz/oficio.pdf"));
    });
  });

  it("permite ordenar arquivos por nome e por tamanho", async () => {
    const mockArquivos = [
      {
        id: "arq-1",
        nome_original: "b_documento.pdf",
        caminho: "arquivos/raiz/b_documento.pdf",
        preview_caminho: null,
        mime: "application/pdf",
        tamanho: 5000,
        criado_por: "admin",
        criado_em: "2026-03-01T10:00:00Z",
      },
      {
        id: "arq-2",
        nome_original: "a_documento.pdf",
        caminho: "arquivos/raiz/a_documento.pdf",
        preview_caminho: null,
        mime: "application/pdf",
        tamanho: 1000,
        criado_por: "admin",
        criado_em: "2026-03-02T10:00:00Z",
      },
    ];

    rpcHandlers["gd_arquivos_listar"] = () => ({
      data: { pastas: [], arquivos: mockArquivos },
      error: null,
    });

    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("b_documento.pdf")).toBeInTheDocument();

    const selectOrdenacao = screen.getByLabelText("Ordenar arquivos");
    await user.selectOptions(selectOrdenacao, "nome_asc");

    expect(screen.getByText("a_documento.pdf")).toBeInTheDocument();
    expect(screen.getByText("b_documento.pdf")).toBeInTheDocument();

    const btnGrade = screen.getByLabelText("Visualização em grade");
    await user.click(btnGrade);
    expect(screen.getAllByText("Por admin")).toHaveLength(2);
  });
});
