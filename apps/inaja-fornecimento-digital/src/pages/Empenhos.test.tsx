import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------- Mocks ----------
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

// Mock do db.rpc: armazena handler por fn name para os testes controlarem.
const rpcHandlers: Record<string, () => unknown> = {};
const rpcCalls: Array<{ fn: string; args: unknown }> = [];
const rpcMock = vi.fn((fn: string, args: unknown) => {
  rpcCalls.push({ fn, args });
  if (rpcHandlers[fn]) return Promise.resolve(rpcHandlers[fn]());
  return Promise.resolve({ data: null, error: null });
});
vi.mock("@/integrations/db/client", () => ({
  db: { rpc: (fn: string, args: unknown) => rpcMock(fn, args) },
}));

// After mocks
import Empenhos from "./Empenhos";
import { parseCSV } from "./Empenhos";

// Estado padrão: admin logado.
function authAdmin() {
  useAuthMock.mockReturnValue({
    user: "admin",
    isAdmin: true,
    modulosLiberados: ["empenhos"],
    mostrarBloqueados: false,
    temModulo: (id: string) => id === "empenhos",
    login: vi.fn(),
    logout: vi.fn(),
  });
}
function authComum() {
  useAuthMock.mockReturnValue({
    user: "comum",
    isAdmin: false,
    modulosLiberados: ["empenhos"],
    mostrarBloqueados: false,
    temModulo: (id: string) => id === "empenhos",
    login: vi.fn(),
    logout: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Empenhos />
    </MemoryRouter>
  );
}

beforeEach(() => {
  toastMock.mockClear();
  navigateMock.mockClear();
  rpcMock.mockClear();
  rpcCalls.length = 0;
  for (const k of Object.keys(rpcHandlers)) delete rpcHandlers[k];
  authAdmin();
});

// Helper para upload: define .files manualmente (já que userEvent.upload
// nem sempre applica o FileList em inputs hidden no jsdom) e dispara o change.
function uploadFile(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    value: [file],
    configurable: true,
    writable: false,
  });
  fireEvent.change(input);
}

function setRpc(fn: string, data: unknown, error: unknown = null) {
  rpcHandlers[fn] = () => ({ data, error });
}
function setRpcOnce(fn: string, data: unknown, error: unknown = null, calls = 1) {
  let n = 0;
  rpcHandlers[fn] = () => {
    n++;
    if (n > calls) return { data: null, error: null };
    return { data, error };
  };
}

// ---------- parseCSV (unitário) ----------
describe("parseCSV", () => {
  it("faz parse básico de uma linha sem aspas", () => {
    const text = "idEntidade;nomeEntidade;valorEmpenhadoBruto\n1;PM;1.234,56";
    const rows = parseCSV(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].idEntidade).toBe("1");
    expect(rows[0].nomeEntidade).toBe("PM");
    expect(rows[0].valorEmpenhadoBruto).toBe("1.234,56");
  });

  it("respeita campos com aspas contendo ; e \\n", () => {
    const text = 'idEntidade;especificacao\n1;"Aquisição de; algo\ncontinua aqui"';
    const rows = parseCSV(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].especificacao).toContain(";");
    expect(rows[0].especificacao).toContain("continua aqui");
  });

  it("linha extraaldora com aspas desbalanceada junta próxima linha", () => {
    const text = 'idEntidade;especificacao\n1;"campo aberto\n2;fechado';
    const rows = parseCSV(text);
    // Linha 2 tem aspa abrindo, linha 3 fecha → juntam-se
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].especificacao).toContain("aberto");
  });

  it("retorna array vazio para texto vazio", () => {
    expect(parseCSV("")).toEqual([]);
  });

  it("preserva colunas desconhecidas pelo camelMap sob seu próprio nome", () => {
    const text = "colunaNova;idEntidade\nxyz;1";
    const rows = parseCSV(text);
    expect(rows[0].colunaNova).toBe("xyz");
    expect(rows[0].idEntidade).toBe("1");
  });
});

// ---------- Dashboard ----------
describe("Empenhos – Dashboard", () => {
  it("mostra empty state quando não há dados importados", async () => {
    setRpc("empenhos_stats", {
      totais: { total_registros: 0, total_empenhado: 0, total_liquidado: 0, total_pago: 0, total_saldo_pagar: 0 },
      porModalidade: [], porNatureza: [], topCredores: [],
    });
    renderPage();
    expect(await screen.findByText(/Nenhum dado importado ainda/i)).toBeInTheDocument();
  });

  it("mostra totais e cartões de stat quando há dados", async () => {
    setRpc("empenhos_stats", {
      totais: { total_registros: 3, total_empenhado: 1000, total_liquidado: 500, total_pago: 200, total_saldo_pagar: 300 },
      porModalidade: [{ modalidade: "Dispensa", qtd: 2, total: 700 }],
      porNatureza: [{ natureza: "4490", qtd: 1, total: 300 }],
      topCredores: [{ nome_credor: "Fornecedor X", qtd: 1, total: 1000 }],
    });
    renderPage();
    expect(await screen.findByText(/Total Empenhado/i)).toBeInTheDocument();
    expect(screen.getByText(/3 registros importados/i)).toBeInTheDocument();
  });

  it("mostra mensagem de erro e dispara toast quando RPC falha", async () => {
    setRpc("empenhos_stats", null, { message: "Falha no banco" });
    renderPage();
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/dashboard/i) }));
    });
    expect(await screen.findByText(/Falha no banco/i)).toBeInTheDocument();
  });
});

// ---------- Tabela ----------
describe("Empenhos – Tabela com filtros", () => {
  it("carrega filtros e linhas na montagem e exibe linhas", async () => {
    const row = {
      id: "1_1000_2026/1", numero_empenho: "2026/1", ano_empenho: 2026, data: "05/01/2026",
      nome_credor: "Fornecedor X", modalidade: "Dispensa", especificacao: "Material",
      num_natureza_desp: "4490", valor_empenhado_bruto: 1234.56, valor_liquidado_bruto: 1000,
      valor_baixado_bruto: 500, saldo_pagar: 734.56,
    };
    setRpc("empenhos_filtros_disponiveis", { modalidades: ["Dispensa"], naturezas: [], anos: [2026], tipos: [], recursos: [], programas: [], acoes: [], despesas: [] });
    setRpc("empenhos_listar", { rows: [row], total: 1, totalPaginas: 1 });

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Empenhos/i }));

    expect(await screen.findByText("Fornecedor X")).toBeInTheDocument();
    expect(screen.getByText(/1 registros/i)).toBeInTheDocument();
    expect(rpcCalls.find((c) => c.fn === "empenhos_filtros_disponiveis")).toBeTruthy();
  });

  it("mostra toast de erro quando empenhos_listar falha", async () => {
    setRpc("empenhos_filtros_disponiveis", { modalidades: [], naturezas: [], anos: [], tipos: [], recursos: [], programas: [], acoes: [], despesas: [] });
    setRpc("empenhos_listar", null, { message: "Falha ao listar" });
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Empenhos/i }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/carregar empenhos/i) }));
    });
  });

  it("abre o painel de detalhe ao clicar em uma linha", async () => {
    const row = {
      id: "1_1000_2026/1", numero_empenho: "2026/1", ano_empenho: 2026, data: "05/01/2026",
      nome_credor: "Fornecedor X", modalidade: "Dispensa", especificacao: "Material",
      num_natureza_desp: "4490", valor_empenhado_bruto: 1234.56, valor_liquidado_bruto: 1000,
      valor_baixado_bruto: 500, saldo_pagar: 734.56,
    };
    const detalhe = {
      ...row,
      contrato: "", licitacao: "", num_processo: "001/2026",
      num_acao: "100", num_programa: "001", num_recurso: "1",
      num_natureza_emp: "3", id_credor: "99", saldo_liquidar: 500, saldo_baixado: 0,
      especificacao: "Material detalhado",
    };
    setRpc("empenhos_filtros_disponiveis", { modalidades: [], naturezas: [], anos: [], tipos: [], recursos: [], programas: [], acoes: [], despesas: [] });
    setRpc("empenhos_listar", { rows: [row], total: 1, totalPaginas: 1 });
    setRpc("empenhos_get", detalhe);

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Empenhos/i }));
    const rowEl = await screen.findByText("Fornecedor X");
    await user.click(rowEl.closest("tr")!);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Material detalhado/i)).toBeInTheDocument();
    expect(within(dialog).getByText("Fornecedor X")).toBeInTheDocument();
  });

  it("é ativável por teclado (Enter) e abre o painel", async () => {
    const row = {
      id: "1_1000_2026/1", numero_empenho: "2026/1", ano_empenho: 2026, data: "05/01/2026",
      nome_credor: "Fornecedor X", modalidade: "Dispensa", especificacao: "Material",
      num_natureza_desp: "4490", valor_empenhado_bruto: 1234.56, valor_liquidado_bruto: 1000,
      valor_baixado_bruto: 500, saldo_pagar: 734.56,
    };
    const detalhe = { ...row, contrato: "", licitacao: "", num_processo: "", num_acao: "", num_programa: "", num_recurso: "", num_natureza_emp: "", id_credor: "", saldo_liquidar: 0, saldo_baixado: 0 };
    setRpc("empenhos_filtros_disponiveis", { modalidades: [], naturezas: [], anos: [], tipos: [], recursos: [], programas: [], acoes: [], despesas: [] });
    setRpc("empenhos_listar", { rows: [row], total: 1, totalPaginas: 1 });
    setRpc("empenhos_get", detalhe);

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Empenhos/i }));
    const rowEl = (await screen.findByText("Fornecedor X")).closest("tr")!;
    rowEl.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("mostra estado vazio com botão de limpar quando filtros não retornam dados", async () => {
    setRpc("empenhos_filtros_disponiveis", { modalidades: [], naturezas: [], anos: [2026], tipos: [], recursos: [], programas: [], acoes: [], despesas: [] });
    setRpc("empenhos_listar", { rows: [], total: 0, totalPaginas: 1 });

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Empenhos/i }));

    expect(await screen.findByText("Nenhum empenho encontrado")).toBeInTheDocument();
  });
});

// ---------- Importar ----------
describe("Empenhos – Aba Importar", () => {
  it("esconde aba Importar para não-admin", async () => {
    authComum();
    renderPage();
    await screen.findByText(/Nenhum dado importado ainda/i);
    const tabs = screen.queryAllByRole("tab", { name: /Importar CSV/i });
    expect(tabs.length).toBe(0);
  });

  it("exibe aba Importar para admin", async () => {
    renderPage();
    const tab = await screen.findByRole("tab", { name: /Importar CSV/i });
    expect(tab).toBeInTheDocument();
  });

  it("recusa arquivo não-CSV com toast", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Importar CSV/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(["foo,bar"], "planilha.xlsx", { type: "application/vnd.ms-excel" });
    uploadFile(input, file);
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/inválido/i) }));
    });
  });

  it("importa via modo substituir passando _caller admin e _finalizar no último chunk", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Importar CSV/i }));

    // CSV mínimo parseável (2 linhas).
    const csv = "idEntidade;nomeEntidade;idEmpenho;numeroEmpenho;anoEmpenho;tipoEmpenho;modalidade;especificacao;data;valorEmpenhadoBruto;saldoPagar\n" +
                "1;PM;1000;2026/1;2026;Original;Dispensa;Material;05/01/26;1.234,56;734,56\n" +
                "1;PM;1001;2026/2;2026;Original;Dispensa;Material2;06/01/26;2.000,00;0,00\n";
    const file = new File([csv], "Relação de Empenho.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    uploadFile(input, file);

    // jsdom FileReader é assíncrono: drena microtasks/macrotasks.
    await waitFor(() => expect(screen.getByText(/2 registros detectados/i)).toBeInTheDocument(), { timeout: 2000 });

    setRpc("empenhos_importar", { inseridos: 2, finalizado: true });

    await user.click(screen.getByRole("button", { name: /Substituir a base/i }));
    await user.click(await screen.findByRole("button", { name: /^Substituir base$/i }));

    await waitFor(() => {
      const calls = rpcCalls.filter((c) => c.fn === "empenhos_importar");
      expect(calls.length).toBeGreaterThan(0);
      const ultimo = calls[calls.length - 1];
      expect(ultimo.args).toMatchObject({ _caller: "admin", _modo: "substituir" });
      expect((ultimo.args as Record<string, unknown>)._finalizar).toBe(true);
    });
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/concluída/i) }));
    });
  });

  it("mostra toast de erro e para ao receber error do backend (não substitui banco)", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("tab", { name: /Importar CSV/i }));

    const csv = "idEntidade;nomeEntidade;idEmpenho;numeroEmpenho;anoEmpenho;tipoEmpenho;modalidade;especificacao;data;valorEmpenhadoBruto;saldoPagar\n" +
                "1;PM;1000;2026/1;2026;Original;Dispensa;Material;05/01/26;1.234,56;734,56\n";
    const file = new File([csv], "Relação de Empenho.csv", { type: "text/csv" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    uploadFile(input, file);
    await waitFor(() => expect(screen.getByText(/1 registros detectados/i)).toBeInTheDocument(), { timeout: 2000 });

    setRpc("empenhos_importar", null, { message: "Acesso negado", code: "FORBIDDEN" });

    await user.click(screen.getByRole("button", { name: /Substituir a base/i }));
    await user.click(await screen.findByRole("button", { name: /^Substituir base$/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: expect.stringMatching(/Erro na importação/i),
        variant: "destructive",
      }));
    });
    // Não mostra toast de sucesso
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: expect.stringMatching(/concluída/i) }));
  });
});

// ---------- Header ----------
describe("Empenhos – Header", () => {
  it("navega de volta ao clicar em Voltar", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Voltar/i }));
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("mostra nome do usuário no header", async () => {
    renderPage();
    expect(await screen.findByText("admin")).toBeInTheDocument();
  });
});
