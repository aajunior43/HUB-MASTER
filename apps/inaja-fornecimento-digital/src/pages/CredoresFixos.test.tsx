import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------- Mocks ----------
const { toastMock, navigateMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: toastMock, useToast: () => ({ toast: toastMock }) }));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

type Row = Record<string, unknown>;
type MockError = { message: string } | null;
type QueryResult = { data: Row[]; error: MockError };
type MutationResult = { data: null; error: MockError };

interface MockBuilder extends PromiseLike<QueryResult> {
  select: () => MockBuilder;
  order: () => Promise<QueryResult>;
  eq: (col: string, val: unknown) => MockBuilder & PromiseLike<QueryResult>;
  insert: (payload: Row) => Promise<MutationResult>;
  update: (payload: Row) => {
    eq: (col: string, val: unknown) => Promise<MutationResult>;
  };
  delete: () => {
    eq: (col: string, val: unknown) => Promise<MutationResult>;
  };
  _then?: () => Promise<QueryResult>;
}

const mockStore: { credores: Row[]; empenhos: Row[]; solicitacoes: Row[] } = {
  credores: [], empenhos: [], solicitacoes: [],
};
const lastOp: { table?: string; op?: string; payload?: Row; eqs?: Row } = {};
const inserts: { table: string; payload: Row }[] = [];
const mockErrors: {
  query: Record<string, string | undefined>;
  insert: Record<string, string | undefined>;
} = { query: {}, insert: {} };
const queryDelays: Record<string, number | undefined> = {};

async function queryResult(table: string, data: Row[]): Promise<QueryResult> {
  const delay = queryDelays[table] ?? 0;
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  const message = mockErrors.query[table];
  return { data: message ? [] : data, error: message ? { message } : null };
}

async function findDepartamentoTrigger() {
  return screen.getByRole("combobox", { name: /Filtrar por departamento/i });
}

function tableKey(table: string): keyof typeof mockStore {
  if (table === "credores_fixos") return "credores";
  if (table === "empenhos_mensais") return "empenhos";
  if (table === "solicitacoes") return "solicitacoes";
  return "credores";
}

function builderFor(table: string): MockBuilder {
  const key = tableKey(table);
  const filters: Row = {};
  const chain: MockBuilder = {
    select: () => chain,
    order: () => queryResult(table, mockStore[key]),
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      chain._then = () => queryResult(
        table,
        mockStore[key].filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v)),
      );
      return {
        ...chain,
        then: (resolve) => chain._then!().then(resolve),
      };
    },
    insert: (payload: Row) => {
      lastOp.table = table; lastOp.op = "insert"; lastOp.payload = payload;
      inserts.push({ table, payload });
      const message = mockErrors.insert[table];
      if (!message) mockStore[key].push({ id: `id-${mockStore[key].length + 1}`, ...payload });
      return Promise.resolve({ data: null, error: message ? { message } : null });
    },
    update: (payload: Row) => {
      lastOp.table = table; lastOp.op = "update"; lastOp.payload = payload;
      return {
        eq: (col: string, val: unknown) => {
          const row = mockStore[key].find((r) => r[col] === val);
          if (row) Object.assign(row, payload);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    delete: () => {
      lastOp.table = table; lastOp.op = "delete";
      return {
        eq: (col: string, val: unknown) => {
          const idx = mockStore[key].findIndex((r) => r[col] === val);
          if (idx >= 0) mockStore[key].splice(idx, 1);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    then: (resolve) => queryResult(table, mockStore[key]).then(resolve),
  };
  return chain;
}

vi.mock("@/integrations/db/client", () => ({
  db: {
    from: (table: string) => builderFor(table),
    rpc: (fn: string) => Promise.resolve({
      data: fn === "credores_fixos_disponiveis_importar"
        ? { total_disponiveis: 0, total_existentes: 0 }
        : fn === "credores_fixos_importar_do_empenho"
          ? { inseridos: 0, total_disponiveis: 0 }
          : null,
      error: null,
    }),
  },
}));

// After mocks
import CredoresFixos from "./CredoresFixos";

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CredoresFixos />
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockStore.credores = [];
  mockStore.empenhos = [];
  mockStore.solicitacoes = [];
  inserts.length = 0;
  lastOp.table = undefined;
  lastOp.op = undefined;
  lastOp.payload = undefined;
  for (const key of Object.keys(mockErrors.query)) delete mockErrors.query[key];
  for (const key of Object.keys(mockErrors.insert)) delete mockErrors.insert[key];
  for (const key of Object.keys(queryDelays)) delete queryDelays[key];
  toastMock.mockClear();
  navigateMock.mockClear();
});

describe("CredoresFixos – fluxo principal", () => {
  it("mostra estado vazio quando não há credores", async () => {
    renderPage();
    expect(await screen.findByText(/Nenhum credor cadastrado/i)).toBeInTheDocument();
  });

  it("lista credores existentes com valor formatado em BRL", async () => {
    mockStore.credores.push({
      id: "c1", nome: "Fornecedor A", documento: "12.345.678/0001-00",
      departamento: "Saúde", valor_mensal: 1500, descricao: null,
    });
    renderPage();
    expect(await screen.findByText("Fornecedor A")).toBeInTheDocument();
    expect(screen.getByText("Saúde")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s?1\.500,00/).length).toBeGreaterThan(0);
  });

  it("valida nome obrigatório ao criar credor", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Novo Credor/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Salvar/i }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/obrigatório/i) })
      );
    });
    expect(lastOp.op).not.toBe("insert");
  });

  it("cria um novo credor com sucesso", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Novo Credor/i }));
    const dialog = await screen.findByRole("dialog");
    const textboxes = within(dialog).getAllByRole("textbox");
    await user.type(textboxes[0], "Fornecedor Novo"); // Nome
    const valor = within(dialog).getByLabelText("Valor mensal (R$)");
    await user.clear(valor);
    await user.type(valor, "2500");
    await user.click(within(dialog).getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(lastOp).toMatchObject({ table: "credores_fixos", op: "insert" });
      expect(lastOp.payload).toMatchObject({ nome: "Fornecedor Novo", valor_mensal: 2500 });
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/salvo/i) })
    );
  });

  it("filtra credores por departamento", async () => {
    mockStore.credores.push(
      { id: "c1", nome: "Alpha Saúde", departamento: "Saúde", valor_mensal: 100 },
      { id: "c2", nome: "Beta Educação", departamento: "Educação", valor_mensal: 200 },
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alpha Saúde");
    await screen.findByText("Beta Educação");

    // abrir o Select "Departamento"
    const triggerDep = await findDepartamentoTrigger();
    await user.click(triggerDep);
    await user.click(await screen.findByRole("option", { name: "Saúde" }));

    await waitFor(() => {
      expect(screen.queryByText("Beta Educação")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Alpha Saúde")).toBeInTheDocument();
  });

  it("marca empenho com um clique (tick) sem abrir diálogo", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 1000 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");

    const pendentes = screen.getAllByTitle(/Pendente/i);
    await user.click(pendentes[0]);

    await waitFor(() => {
      expect(lastOp).toMatchObject({ table: "empenhos_mensais", op: "insert" });
      expect(lastOp.payload).toMatchObject({
        credor_id: "c1", status: "empenhado", valor: 1000,
      });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abre diálogo de detalhes com botão direito no mês", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 1000 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");

    const pendentes = screen.getAllByTitle(/Pendente/i);
    fireEvent.contextMenu(pendentes[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Fornecedor A/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Confirmar empenho/i })).toBeInTheDocument();
  });

  it("confirma empenho com número no diálogo de detalhes", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 1000 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");
    fireEvent.contextMenu(screen.getAllByTitle(/Pendente/i)[0]);

    const dialog = await screen.findByRole("dialog");
    const textboxes = within(dialog).getAllByRole("textbox");
    await user.type(textboxes[0], "2026/001"); // Nº do empenho
    await user.click(within(dialog).getByRole("button", { name: /Confirmar empenho/i }));

    await waitFor(() => {
      expect(lastOp).toMatchObject({ table: "empenhos_mensais", op: "insert" });
      expect(lastOp.payload).toMatchObject({
        credor_id: "c1", status: "empenhado", numero_empenho: "2026/001", valor: 1000,
      });
    });
  });

  it("exclui credor após confirmação", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 100 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");

    const row = screen.getByText("Fornecedor A").closest("tr")!;
    const deleteBtn = within(row).getAllByRole("button").at(-1)!;
    await user.click(deleteBtn);

    const alertDialog = await screen.findByRole("alertdialog");
    await user.click(within(alertDialog).getByRole("button", { name: /Excluir/i }));

    await waitFor(() => {
      expect(lastOp).toMatchObject({ table: "credores_fixos", op: "delete" });
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/excluído/i) })
    );
  });

  it("cancela exclusão quando o usuário recusa a confirmação", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 100 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");
    const row = screen.getByText("Fornecedor A").closest("tr")!;
    await user.click(within(row).getAllByRole("button").at(-1)!);

    const alertDialog = await screen.findByRole("alertdialog");
    await user.click(within(alertDialog).getByRole("button", { name: /Cancelar/i }));

    expect(lastOp.op).not.toBe("delete");
  });

  it("navega de volta ao clicar em Voltar", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Voltar/i }));
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("gera PDF sem erros", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 100 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");
    await user.click(screen.getByRole("button", { name: /Relatório PDF/i }));
    const jspdf = await import("jspdf") as unknown as { __saveMock: ReturnType<typeof vi.fn> };
    await waitFor(() => expect(jspdf.__saveMock).toHaveBeenCalled());
  });

  it("abre diálogo de solicitação com mês de referência e gera PDF", async () => {
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    mockStore.credores.push({
      id: "c1", nome: "G FOUR", departamento: "Administração", valor_mensal: 9776.6,
      descricao: "Internet", tipo_valor: "FIXO",
    });
    mockStore.empenhos.push({
      id: "e1", credor_id: "c1", ano: anoAtual, mes: mesAtual,
      status: "empenhado", valor: 4215, numero_empenho: null,
      observacao: null, empenhado_em: new Date().toISOString(),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("G FOUR");

    await user.click(screen.getByRole("button", { name: /Gerar solicitação PDF/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Imprimir solicitação/i)).toBeInTheDocument();
    expect(within(dialog).getByText("G FOUR")).toBeInTheDocument();
    expect(within(dialog).getByText(/Valor no PDF/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/R\$\s*9\.776,60/)).toBeInTheDocument();

    const comboboxes = within(dialog).getAllByRole("combobox");
    await user.click(comboboxes[0]);
    await user.click(await screen.findByRole("option", { name: "Março" }));

    await user.click(within(dialog).getByRole("button", { name: /Gerar PDF/i }));

    const jspdf = await import("jspdf") as unknown as { __saveMock: ReturnType<typeof vi.fn> };
    await waitFor(() => {
      expect(jspdf.__saveMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/Solicitação gerada/i),
          description: expect.stringMatching(/Março/i),
        }),
      );
    });
    expect(inserts.find((item) => item.table === "solicitacoes")?.payload)
      .toMatchObject({ valor_total: 9776.6 });
  });

  it("cancela impressão de solicitação sem gerar PDF", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 100 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");

    await user.click(screen.getByRole("button", { name: /Gerar solicitação PDF/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /Cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Imprimir solicitação/i)).not.toBeInTheDocument();
    });
  });

  it("filtra credores por busca de nome e CNPJ", async () => {
    mockStore.credores.push(
      { id: "c1", nome: "Alpha Saúde", documento: "12.345.678/0001-00", departamento: "Saúde", valor_mensal: 100 },
      { id: "c2", nome: "Beta Educação", documento: "98.765.432/0001-11", departamento: "Educação", valor_mensal: 200 },
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alpha Saúde");
    await screen.findByText("Beta Educação");

    await user.type(screen.getByPlaceholderText(/Nome, CNPJ ou descrição/i), "Beta");
    await waitFor(() => {
      expect(screen.queryByText("Alpha Saúde")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Beta Educação")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/Nome, CNPJ ou descrição/i));
    await user.type(screen.getByPlaceholderText(/Nome, CNPJ ou descrição/i), "12345678");
    await waitFor(() => {
      expect(screen.getByText("Alpha Saúde")).toBeInTheDocument();
      expect(screen.queryByText("Beta Educação")).not.toBeInTheDocument();
    });
  });

  it("gera solicitações em lote com os credores filtrados", async () => {
    mockStore.credores.push(
      { id: "c1", nome: "Alpha Saúde", departamento: "Saúde", valor_mensal: 1000, descricao: "Serviço A" },
      { id: "c2", nome: "Beta Educação", departamento: "Educação", valor_mensal: 2000 },
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Alpha Saúde");

    const triggerDep = await findDepartamentoTrigger();
    await user.click(triggerDep);
    await user.click(await screen.findByRole("option", { name: "Saúde" }));
    await waitFor(() => {
      expect(screen.queryByText("Beta Educação")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Solicitações em lote/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Solicitações em lote/i)).toBeInTheDocument();
    expect(within(dialog).getByText("Alpha Saúde")).toBeInTheDocument();
    expect(within(dialog).getByText(/Credores no lote/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /Gerar PDF do lote/i }));

    const jspdf = await import("jspdf") as unknown as { __saveMock: ReturnType<typeof vi.fn> };
    await waitFor(() => {
      expect(jspdf.__saveMock).toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringMatching(/Lote gerado/i) }),
      );
    });
    expect(inserts.some((i) => i.table === "solicitacoes")).toBe(true);
  });

  it("avisa quando o PDF foi gerado mas o historico nao foi salvo", async () => {
    mockStore.credores.push({
      id: "c1", nome: "Fornecedor A", departamento: "Saude", valor_mensal: 100,
      tipo_valor: "FIXO",
    });
    mockErrors.insert.solicitacoes = "falha no banco";
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");

    await user.click(screen.getByRole("button", { name: /Gerar solicita/i }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: /Gerar PDF/i })).toBeEnabled());
    await user.click(within(dialog).getByRole("button", { name: /Gerar PDF/i }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringMatching(/sem salvar no hist/i),
      variant: "destructive",
    })));
    expect(mockStore.solicitacoes).toHaveLength(0);
  });

  it("carrega o empenho do ano escolhido para credor variavel", async () => {
    const anoAtual = new Date().getFullYear();
    const anoAnterior = anoAtual - 1;
    const mesAtual = new Date().getMonth() + 1;
    mockStore.credores.push({
      id: "c1", nome: "Variavel", departamento: "Saude", valor_mensal: 0,
      tipo_valor: "VARIAVEL",
    });
    mockStore.empenhos.push({
      id: "e1", credor_id: "c1", ano: anoAnterior, mes: mesAtual,
      status: "empenhado", valor: 1234.56, numero_empenho: "2025/42",
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Variavel");
    await user.click(screen.getByRole("button", { name: /Gerar solicita/i }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: String(anoAnterior) } });
    expect(await within(dialog).findByText(/R\$\s*1\.234,56/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /Gerar PDF/i }));

    await waitFor(() => {
      expect(inserts.find((item) => item.table === "solicitacoes")?.payload)
        .toMatchObject({ valor_total: 1234.56 });
    });
  });

  it("mostra no lote o valor especifico do mes para credor variavel", async () => {
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;
    mockStore.credores.push({
      id: "c1", nome: "Variavel", departamento: "Saude", valor_mensal: 0,
      tipo_valor: "VARIAVEL",
    });
    mockStore.empenhos.push({
      id: "e1", credor_id: "c1", ano: anoAtual, mes: mesAtual,
      status: "empenhado", valor: 2345.67,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Variavel");
    await user.click(screen.getByRole("button", { name: /Solicita.*em lote/i }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(within(dialog).getAllByText(/R\$\s*2\.345,67/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("limpa empenhos do ano anterior quando a nova consulta falha", async () => {
    const anoAtual = new Date().getFullYear();
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saude", valor_mensal: 500 });
    mockStore.empenhos.push({
      id: "e1", credor_id: "c1", ano: anoAtual, mes: 1,
      status: "empenhado", valor: 500,
    });
    renderPage();
    await screen.findByRole("checkbox", { name: /^Jan.*Empenhado$/i });

    mockErrors.query.empenhos_mensais = "consulta indisponivel";
    fireEvent.change(screen.getByLabelText("Ano"), { target: { value: String(anoAtual + 1) } });

    await screen.findByText(`Empenhado em ${anoAtual + 1}`);
    await screen.findByRole("checkbox", { name: /^Jan.*Pendente$/i });
    expect(screen.queryByRole("checkbox", { name: /^Jan.*Empenhado$/i })).not.toBeInTheDocument();
  });

  it("bloqueia segundo clique enquanto o empenho ainda esta recarregando", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saude", valor_mensal: 500 });
    renderPage();
    await screen.findByText("Fornecedor A");
    queryDelays.empenhos_mensais = 150;
    const tick = screen.getAllByTitle(/Pendente/i)[0];

    fireEvent.click(tick);
    await waitFor(() => expect(inserts.filter((item) => item.table === "empenhos_mensais")).toHaveLength(1));
    fireEvent.click(tick);

    await screen.findByRole("checkbox", { name: /^Jan.*Empenhado$/i });
    expect(inserts.filter((item) => item.table === "empenhos_mensais")).toHaveLength(1);
  });

  it("rejeita valor negativo, email invalido e dias fora de 1 a 31", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Novo Credor/i }));
    const dialog = await screen.findByRole("dialog");
    const nome = within(dialog).getAllByRole("textbox")[0];
    const valorMensal = within(dialog).getByLabelText("Valor mensal (R$)");
    const dias = within(dialog).getAllByRole("spinbutton");
    const email = dialog.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(nome, "Fornecedor Invalido");

    fireEvent.change(valorMensal, { target: { value: "-1" } });
    await user.click(within(dialog).getByRole("button", { name: /Salvar/i }));
    expect(toastMock).toHaveBeenLastCalledWith(expect.objectContaining({ title: expect.stringMatching(/Valor mensal inv/i) }));

    fireEvent.change(valorMensal, { target: { value: "10" } });
    fireEvent.change(email, { target: { value: "email-invalido" } });
    await user.click(within(dialog).getByRole("button", { name: /Salvar/i }));
    expect(toastMock).toHaveBeenLastCalledWith(expect.objectContaining({ title: expect.stringMatching(/Email inv/i) }));

    fireEvent.change(email, { target: { value: "teste@exemplo.com" } });
    fireEvent.change(dias[0], { target: { value: "32" } });
    await user.click(within(dialog).getByRole("button", { name: /Salvar/i }));
    expect(toastMock).toHaveBeenLastCalledWith(expect.objectContaining({ title: expect.stringMatching(/Dia inv/i) }));
    expect(inserts.filter((item) => item.table === "credores_fixos")).toHaveLength(0);
  });

  // ── EmpenhoDialog: validação + fluxo update (toggle off) ──────────────────

  it("mostra erro de validação para valor negativo no diálogo de empenho", async () => {
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 1000 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");
    fireEvent.contextMenu(screen.getAllByTitle(/Pendente/i)[0]);

    const dialog = await screen.findByRole("dialog");
    const valorInput = within(dialog).getByLabelText("Valor");
    // user.type não aceita "-" em input[type=number]; dispara change direto.
    fireEvent.change(valorInput, { target: { value: "-50" } });

    await user.click(within(dialog).getByRole("button", { name: /Confirmar empenho/i }));

    await waitFor(() => {
      expect(within(dialog).getByText(/não pode ser negativo/i)).toBeInTheDocument();
    });
    // Não persiste: nenhum insert/update deve ter sido feito
    expect(lastOp.op).not.toBe("insert");
    expect(lastOp.op).not.toBe("update");
  });

  it("toggle empenhado → pendente com um clique no tick", async () => {
    const ano = new Date().getFullYear();
    mockStore.credores.push({ id: "c1", nome: "Fornecedor A", departamento: "Saúde", valor_mensal: 500 });
    mockStore.empenhos.push({
      id: "e1", credor_id: "c1", ano, mes: 1, status: "empenhado",
      valor: 500, numero_empenho: "2026/1", observacao: "", empenhado_em: new Date().toISOString(),
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Fornecedor A");

    await user.click(screen.getAllByTitle(/Empenhado/i)[0]);

    await waitFor(() => {
      expect(lastOp).toMatchObject({ table: "empenhos_mensais", op: "update" });
      expect(lastOp.payload).toMatchObject({ status: "pendente" });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
