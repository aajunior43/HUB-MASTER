import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: "admin" }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/AppFooter", () => ({ AppFooter: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import SaudePublica from "./SaudePublica";

const registro = {
  codigoCnes: "2754304",
  codigoEstabelecimentoSaude: "4110302754304",
  cnpjEntidade: "76970318000167",
  razaoSocial: "PM DE INAJA",
  nomeFantasia: "UNIDADE DE ATENCAO PRIMARIA",
  naturezaOrganizacaoEntidade: null,
  naturezaJuridica: "1244",
  tipoGestao: "M",
  nivelHierarquia: null,
  esferaAdministrativa: "MUNICIPAL",
  codigoTipoUnidade: 2,
  cep: "87670215",
  logradouro: "RUA SAO TOME",
  numero: "181",
  complemento: null,
  bairro: "CENTRO",
  telefone: "4434401155",
  email: "saude@inaja.pr.gov.br",
  latitude: -22.75,
  longitude: -52.19,
  codigoUf: 41,
  codigoMunicipio: "411030",
  codigoAtividadeEnsino: null,
  codigoTurnoAtendimento: "03",
  descricaoTurnoAtendimento: "MANHÃ E TARDE",
  atendeAmbulatorialSus: true,
  atendeAmbulatorialSusTexto: "SIM",
  capacidades: { centroCirurgico: false, centroObstetrico: false, centroNeonatal: false, atendimentoHospitalar: false, servicoApoio: true, atendimentoAmbulatorial: true },
  motivoDesabilitacao: null,
  ativo: true,
  dataAtualizacao: "2026-06-09",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const caminho = url.replace("/api/saude/cnes", "");
    if (caminho === "/tipos") return new Response(JSON.stringify({ data: { tipos: [{ codigo: 2, descricao: "CENTRO DE SAUDE/UNIDADE BASICA" }], configuracao: { cacheMinutos: 10, fonte: "", consulta: "" } }, error: null }), { status: 200 });
    const detalhe = caminho.includes("cnes=2754304");
    const data = {
      modo: detalhe ? "detalhe" : "lista",
      registro: detalhe ? registro : null,
      registros: [registro],
      pagina: 1,
      limite: 20,
      temMais: false,
      resumo: { unidades: 1, ativas: 1, inativas: 0, municipais: 1, atendimentoAmbulatorial: 1, atendimentoHospitalar: 0, centroCirurgico: 0, centroObstetrico: 0, centroNeonatal: 0 },
      filtros: { cnes: detalhe ? "2754304" : null, codigoMunicipio: "411030", codigoUf: null, codigoTipoUnidade: null, status: "1", busca: "" },
      fonte: "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos",
      consultadoEm: "2026-08-09T00:00:00.000Z",
      emCache: false,
      configuracao: { cacheMinutos: 10, fonte: "", consulta: "" },
    };
    return new Response(JSON.stringify({ data, error: null }), { status: 200 });
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("SaudePublica", () => {
  it("carrega a rede municipal e abre o detalhe do estabelecimento", async () => {
    render(<MemoryRouter><SaudePublica /></MemoryRouter>);
    expect(screen.getByText("Saúde pública — CNES")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("UNIDADE DE ATENCAO PRIMARIA")).toBeInTheDocument());
    const campoMunicipio = screen.getByLabelText("Código do município");
    fireEvent.blur(campoMunicipio);
    expect(vi.mocked(globalThis.fetch).mock.calls.every(([url]) => !String(url).startsWith("/api/ibge"))).toBe(true);
    expect(screen.getByText("Unidades encontradas")).toBeInTheDocument();
    expect(screen.getByText("CENTRO DE SAUDE/UNIDADE BASICA")).toBeInTheDocument();

    fireEvent.click(screen.getByText("UNIDADE DE ATENCAO PRIMARIA"));
    await waitFor(() => expect(screen.getByText("Capacidades registradas")).toBeInTheDocument());
    expect(screen.getByText("CNPJ da entidade")).toBeInTheDocument();
    expect(screen.getAllByText("Atendimento ambulatorial").length).toBeGreaterThan(0);
  });
});
