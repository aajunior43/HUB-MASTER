import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Obras from "./Obras";

const { toastMock } = vi.hoisted(() => ({ toastMock: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: "admin", isAdmin: true }),
}));

vi.mock("@/components/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

vi.mock("@/components/AppFooter", () => ({
  AppFooter: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: toastMock,
  useToast: () => ({ toast: toastMock }),
}));

const mockObras = [
  {
    id: "obra-1",
    chave_externa: "tce-123",
    id_intervencao: "INT-001",
    orgao_nome: "Município de Inajá",
    codigo_ibge: "4110300",
    municipio: "Inajá",
    ano: 2026,
    tipo_intervencao: "Construção",
    nome_intervencao: "Reforma da Unidade Básica de Saúde",
    tipo_obra: "Edificação de Saúde",
    objeto: "Reforma geral e ampliação da UBS Central",
    valor: 450000,
    data_inicio: "2026-02-01",
    prazo_execucao: 180,
    regime: "Empreitada por Preço Global",
    situacao: "Em acompanhamento",
    percentual_fisico: 65.5,
    ultimo_acompanhamento: "2026-03-01",
    observacao_ultimo_acompanhamento: "Alvenaria e cobertura concluídas",
  },
  {
    id: "obra-2",
    chave_externa: "tce-456",
    id_intervencao: "INT-002",
    orgao_nome: "Município de Inajá",
    codigo_ibge: "4110300",
    municipio: "Inajá",
    ano: 2025,
    tipo_intervencao: "Pavimentação",
    nome_intervencao: "Pavimentação Asfáltica da Rua Paraná",
    tipo_obra: "Vias Públicas",
    objeto: "Pavimentação com CBUQ e drenagem pluvial",
    valor: 820000,
    data_inicio: "2025-05-10",
    prazo_execucao: 120,
    regime: "Empreitada por Preço Unitário",
    situacao: "Paralisada",
    percentual_fisico: 30,
    ultimo_acompanhamento: "2025-08-15",
    observacao_ultimo_acompanhamento: "Aguardando aditivo de reequilíbrio",
  },
];

let statusPayload: Record<string, unknown>;
let syncPayload: Record<string, unknown>;

function respostaStatus() {
  return new Response(
    JSON.stringify({ data: statusPayload, error: null }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

beforeEach(() => {
  toastMock.mockClear();
  statusPayload = {
    config: { cnpj: "76970318000167", ibge: "4110300", anos: [2026, 2025], intervaloHoras: 24 },
    anosObras: [2026, 2024],
    resumo: {
      licitacoes: 5,
      valor_licitacoes: 1000000,
      obras: 2,
      valor_obras: 1270000,
      obras_paralisadas: 1,
      obras_sem_acompanhamento: 0,
    },
    ultima: { status: "concluido", iniciado_em: "2026-03-05T10:00:00Z", finalizado_em: "2026-03-05T10:02:00Z", erros: "" },
    isAdmin: true,
    sincronizacaoAutomatica: false,
  };
  syncPayload = { status: "concluido", totais: { obras: 2, acompanhamentos: 1 }, erros: [] };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes("/api/tce-pr/status")) {
        return respostaStatus();
      }

      if (urlStr.includes("/api/tce-pr/detalhe?tipo=obra")) {
        return new Response(
          JSON.stringify({
            data: {
              ...mockObras[0],
              raw: {},
              acompanhamentos: [
                {
                  id: "acomp-1",
                  origem: "Fiscalização Municipal",
                  numero: "01/2026",
                  data: "2026-03-01",
                  tipo: "Medição Mensal",
                  responsavel: "Engenheiro Fiscal",
                  tipo_documento_responsavel: "CREA",
                  documento_responsavel: "123456",
                  observacao: "Execução dentro do cronograma previsto",
                  tipo_medicao: "Física",
                  percentual_fisico: 65.5,
                  motivo_paralisacao: null,
                },
              ],
            },
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.includes("/api/tce-pr/sincronizar") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ data: syncPayload, error: null }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (urlStr.includes("/api/tce-pr/obras")) {
        return new Response(
          JSON.stringify({
            data: {
              rows: mockObras,
              total: 2,
              pagina: 1,
              porPagina: 30,
            },
            error: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ data: null, error: { message: "Rota não encontrada" } }), { status: 404 });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderizarObras() {
  return render(
    <MemoryRouter>
      <Obras />
    </MemoryRouter>
  );
}

describe("Página de Controle de Obras", () => {
  it("renderiza o cabeçalho, indicadores executivos e a listagem de obras", async () => {
    renderizarObras();

    expect(screen.getByRole("heading", { name: "Controle de Obras Municipais" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Reforma da Unidade Básica de Saúde")).toBeInTheDocument();
      expect(screen.getByText("Pavimentação Asfáltica da Rua Paraná")).toBeInTheDocument();
    });

    expect(screen.getByText("Total de Obras Registradas")).toBeInTheDocument();
    expect(screen.getByText("Obras Paralisadas")).toBeInTheDocument();
    expect(screen.getByText("65,5%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("mapeia situação 'Em acompanhamento' como badge Em andamento e paralisada como badge Paralisada", async () => {
    renderizarObras();

    await waitFor(() => {
      expect(screen.getByText("Reforma da Unidade Básica de Saúde")).toBeInTheDocument();
    });

    expect(screen.getByText("Em andamento")).toBeInTheDocument();
    expect(screen.getByText("Paralisada")).toBeInTheDocument();
  });

  it("popula o filtro de exercício com a união dos anos das obras e do config", async () => {
    const user = userEvent.setup();
    renderizarObras();

    await waitFor(() => {
      expect(screen.getByText("Reforma da Unidade Básica de Saúde")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: "Filtrar por exercício" }));

    expect(await screen.findByRole("option", { name: "Ano 2026" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ano 2025" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ano 2024" })).toBeInTheDocument();
  });

  it("usa os anos das obras carregadas como fallback quando status não traz anos", async () => {
    statusPayload.anosObras = [];
    (statusPayload.config as Record<string, unknown>).anos = [];
    const user = userEvent.setup();
    renderizarObras();

    await waitFor(() => {
      expect(screen.getByText("Reforma da Unidade Básica de Saúde")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: "Filtrar por exercício" }));

    expect(await screen.findByRole("option", { name: "Ano 2026" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ano 2025" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Ano 2024" })).not.toBeInTheDocument();
  });

  it("exibe status e resumo de erros da última sincronização no banner", async () => {
    statusPayload.ultima = {
      status: "parcial",
      iniciado_em: "2026-03-05T10:00:00Z",
      finalizado_em: "2026-03-05T10:02:00Z",
      erros: JSON.stringify([
        "licitações 2026: TCE-PR respondeu HTTP 503",
        "obras: TCE-PR respondeu HTTP 504",
        "acompanhamentos: TCE-PR respondeu HTTP 503",
      ]),
    };
    renderizarObras();

    await waitFor(() => {
      expect(screen.getByText("Concluída com erros parciais")).toBeInTheDocument();
    });
    expect(screen.getByText(/licitações 2026: TCE-PR respondeu HTTP 503 · obras: TCE-PR respondeu HTTP 504/)).toBeInTheDocument();
    expect(screen.getByText(/\(\+1\)/)).toBeInTheDocument();
  });

  it("permite filtrar obras por texto de busca", async () => {
    const user = userEvent.setup();
    renderizarObras();

    await waitFor(() => {
      expect(screen.getByText("Reforma da Unidade Básica de Saúde")).toBeInTheDocument();
    });

    const inputBusca = screen.getByPlaceholderText(/Buscar por nome da obra/i);
    await user.type(inputBusca, "Pavimentação");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("busca=Pavimenta"),
        expect.anything()
      );
    });
  });

  it("abre o diálogo de detalhes com histórico de medições ao clicar em uma obra", async () => {
    const user = userEvent.setup();
    renderizarObras();

    await waitFor(() => {
      expect(screen.getByText("Reforma da Unidade Básica de Saúde")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Reforma da Unidade Básica de Saúde"));

    await waitFor(() => {
      expect(screen.getByText(/Histórico de Acompanhamentos e Vistorias/i)).toBeInTheDocument();
      expect(screen.getByText("Medição Mensal")).toBeInTheDocument();
      expect(screen.getByText("Execução dentro do cronograma previsto")).toBeInTheDocument();
    });
  });

  it("mostra toast de sucesso quando a sincronização conclui sem erros", async () => {
    const user = userEvent.setup();
    renderizarObras();

    const btnSincronizar = await screen.findByRole("button", { name: /Sincronizar TCE-PR/i });
    await user.click(btnSincronizar);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Sincronização concluída" })
      );
    });
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("mostra toast de erro quando a sincronização falha parcial ou totalmente", async () => {
    syncPayload = {
      status: "parcial",
      totais: { obras: 2, acompanhamentos: 0 },
      erros: ["licitações 2026: TCE-PR respondeu HTTP 503"],
    };
    const user = userEvent.setup();
    renderizarObras();

    const btnSincronizar = await screen.findByRole("button", { name: /Sincronizar TCE-PR/i });
    await user.click(btnSincronizar);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Sincronização parcial",
          description: expect.stringContaining("TCE-PR respondeu HTTP 503"),
          variant: "destructive",
        })
      );
    });

    toastMock.mockClear();
    syncPayload = { status: "erro", totais: { obras: 0, acompanhamentos: 0 }, erros: ["obras: TCE-PR respondeu HTTP 500"] };

    await user.click(await screen.findByRole("button", { name: /Sincronizar TCE-PR/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Falha na sincronização",
          description: expect.stringContaining("obras: TCE-PR respondeu HTTP 500"),
          variant: "destructive",
        })
      );
    });
  });

  it("permite acionar o botão de sincronização com o TCE-PR", async () => {
    const user = userEvent.setup();
    renderizarObras();

    const btnSincronizar = await screen.findByRole("button", { name: /Sincronizar TCE-PR/i });
    expect(btnSincronizar).toBeInTheDocument();

    await user.click(btnSincronizar);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tce-pr/sincronizar"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
