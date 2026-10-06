import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const { authMock, fromMock, toastMock, rows, updates } = vi.hoisted(() => ({
  authMock: vi.fn(),
  fromMock: vi.fn(),
  toastMock: vi.fn(),
  rows: [] as Array<Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock() }));
vi.mock("@/hooks/use-toast", () => ({ toast: toastMock, useToast: () => ({ toast: toastMock }) }));
vi.mock("@/integrations/db/client", () => ({
  db: {
    from: (table: string) => fromMock(table),
    rpc: vi.fn().mockResolvedValue({ data: { rows: [] }, error: null }),
    storage: { from: () => ({ remove: vi.fn().mockResolvedValue({ data: null, error: null }) }) },
  },
}));

import PedidosDotacao from "./PedidosDotacao";

function makeBuilder(data: Array<Record<string, unknown>>) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockResolvedValue({ data, error: null });
  builder.update.mockImplementation((payload: Record<string, unknown>) => {
    updates.push(payload);
    return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });
  builder.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
  builder.insert.mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
  return builder;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PedidosDotacao />
    </MemoryRouter>,
  );
}

function pedido(status: string) {
  return {
    id: "pedido-1",
    protocolo: "DOT-2026-0001",
    solicitante: "solicitante",
    secretaria: "Saúde",
    descricao: "Compra de insumos",
    valor_solicitado: 100,
    status,
    dotacao: status === "aprovado" ? "12.345.678" : undefined,
    ficha: "123",
    saldo_disponivel: 250,
    valor_aprovado: 100,
    resposta_contador: status === "enviado" ? undefined : "Resultado registrado.",
    respondido_por: status === "enviado" ? undefined : "contador",
    respondido_em: status === "enviado" ? undefined : "2026-08-09T12:00:00.000Z",
    anexos: [],
    created_at: "2026-08-09T10:00:00.000Z",
  };
}

beforeEach(() => {
  rows.splice(0, rows.length, pedido("enviado"));
  updates.splice(0, updates.length);
  authMock.mockReturnValue({ user: "solicitante", isAdmin: false, isContador: false });
  fromMock.mockImplementation((table: string) => makeBuilder(table === "pedidos_dotacao_historico" ? [] : rows));
  toastMock.mockClear();
});

describe("PedidosDotacao", () => {
  it("exibe as quatro fases e os quatro resultados da terceira fase", async () => {
    renderPage();

    expect(await screen.findByText("Fluxo do pedido")).toBeInTheDocument();
    expect(screen.getByText(/1\. Pedido realizado/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Procurando dotação/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Dotação passada/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Conclusão/)).toBeInTheDocument();
    expect(screen.getAllByText("Aprovada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Não aprovada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sem saldo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aguardando suplementação").length).toBeGreaterThan(0);
  });

  it("avança o pedido para a fase de procura da dotação", async () => {
    authMock.mockReturnValue({ user: "contador", isAdmin: false, isContador: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Procurar dotação/i }));
    await waitFor(() => expect(updates).toContainEqual({ status: "procurando_dotacao", resposta_contador: "A contabilidade iniciou a procura da dotação." }));
  });

  it("permite ao solicitante dar conclusão após a aprovação", async () => {
    rows.splice(0, rows.length, pedido("aprovado"));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Dar conclusão/i }));
    await waitFor(() => expect(updates).toContainEqual({ status: "concluido" }));
  });

  it("exibe estado vazio e botão de limpar filtros quando não houver correspondências", async () => {
    rows.splice(0, rows.length);
    renderPage();

    expect(await screen.findByText("Nenhum pedido de dotação encontrado")).toBeInTheDocument();
  });
});
