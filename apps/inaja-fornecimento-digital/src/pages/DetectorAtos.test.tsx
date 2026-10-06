import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: "aleksandro" }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => <><h1>{title}</h1>{actions}</> }));
vi.mock("@/components/AppFooter", () => ({ AppFooter: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import DetectorAtos from "./DetectorAtos";

const respostas = {
  "/health": { status: "ok", ok: true, bot_vivo: false, pendentes_ocr: 2, pendentes_elegiveis: 2, fila_proximo_ciclo: 2, jobs_rodando: 0, web_ultimo: "2026-08-02T10:00:00", bot_ultimo: "2026-08-02T10:00:00", problemas: [], auto_process: false, modo: "sob_demanda", ia_config_source: "prefeitura", deteccao_em_execucao: false, analise_em_execucao: false },
  "/edicoes": [{ id: 9, titulo: "Edição 100", data_publicacao: "2026-08-02", url: "https://example.com/edicao", ocr_processado: 0, tem_inaja: 0, publicacoes_count: 0, mencoes_count: 0, ultimo_status: null, ultima_etapa: null }],
  "/publicacoes": [{ id: 1, edicao_id: 9, pagina: 3, categoria: "publicacao_oficial", orgao: "Prefeitura de Inajá", tipo: "Decreto", numero: "12/2026", data_documento: "2026-08-01", assunto: "Nomeação de servidor", valor: null, trecho: "Fica nomeado o servidor.", edicao_titulo: "Edição 100", data_publicacao: "2026-08-02", url: "https://example.com/edicao" }],
  "/graficos/por-mes": [{ mes: "2026-08", total: 1, com_inaja: 1 }],
  "/graficos/por-tipo": [{ tipo: "Decreto", total: 1 }],
  "/automacao": { status: "ativo" },
  "/executar": { status: "started", message: "Detecção iniciada. Nenhuma edição será processada automaticamente." },
  "/edicoes/9/processar": { status: "started", message: "Processamento da edição selecionada iniciado." },
};

function renderPage() {
  return render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><DetectorAtos /></MemoryRouter>);
}

let liveStatusCalls = 0;

beforeEach(() => {
  liveStatusCalls = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const caminho = url.replace("/api/detector-atos", "");
    if (caminho === "/edicoes/9/live-status") {
      liveStatusCalls += 1;
      const data = liveStatusCalls === 1
        ? { edicao_id: 9, jobs: [], has_running: false, current: null }
        : { edicao_id: 9, jobs: [{ id: 10, etapa: "detectando publicações", status: "concluido", mensagem: "1 publicação, 0 menções", progress_current: 100, progress_total: 100 }], has_running: false, current: null };
      return new Response(JSON.stringify({ data, error: null }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ data: respostas[caminho as keyof typeof respostas], error: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DetectorAtos", () => {
  it("organiza as edições detectadas por ano, mês, semana e dia", async () => {
    renderPage();
    expect(screen.getByText("Detector de Atos")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Detector pronto para consulta")).toBeInTheDocument());
    expect(screen.getByText("agosto de 2026")).toBeInTheDocument();
    expect(screen.getByText("Semana 1")).toBeInTheDocument();
    expect(screen.getByText("domingo, 02 de agosto")).toBeInTheDocument();
    expect(screen.getByText("Edição 100")).toBeInTheDocument();
  });

  it("exibe a publicação retornada pelo serviço", async () => {
    const usuario = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Edição 100")).toBeInTheDocument());
    await usuario.click(screen.getByRole("tab", { name: "Publicações" }));
    expect(screen.getByText("Decreto nº 12/2026")).toBeInTheDocument();
    expect(screen.getByText("Prefeitura de Inajá")).toBeInTheDocument();
  });

  it("detecta edições sem iniciar o processamento", async () => {
    const usuario = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Detector pronto para consulta")).toBeInTheDocument());
    await usuario.click(screen.getByRole("button", { name: "Detectar edições" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/detector-atos/executar", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/detector-atos/health").length).toBeGreaterThan(1), { timeout: 3000 });
    expect(screen.getByRole("tab", { name: "Edições" })).toHaveAttribute("aria-selected", "true");
  });

  it("processa somente a edição escolhida", async () => {
    const usuario = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText("Edição 100")).toBeInTheDocument());
    await usuario.click(screen.getByRole("button", { name: "Processar edição" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/detector-atos/edicoes/9/processar", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(liveStatusCalls).toBeGreaterThan(1), { timeout: 3000 });
    await waitFor(() => expect(screen.getByText("Processamento finalizado")).toBeInTheDocument());
    expect(screen.getByText("Linha do tempo")).toBeInTheDocument();
    expect(screen.getByText("Registro das atividades")).toBeInTheDocument();
    expect(screen.getAllByText("1 publicação, 0 menções").length).toBeGreaterThan(0);
  });

  it("mostra orientação quando o serviço está fora do ar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: null, error: { message: "O serviço Detector de Atos está indisponível" } }), { status: 503, headers: { "Content-Type": "application/json" } })));
    renderPage();
    await waitFor(() => expect(screen.getByText("Serviço do detector indisponível")).toBeInTheDocument());
    expect(screen.getByText("Inicie o sistema pelo modo integrado e tente atualizar novamente.")).toBeInTheDocument();
  });
});
