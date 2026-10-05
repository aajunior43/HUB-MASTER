import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: "admin" }) }));
vi.mock("@/components/PageHeader", () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock("@/components/AppFooter", () => ({ AppFooter: () => null }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import ComprasGov from "./ComprasGov";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const data = url.includes("/catalogo")
      ? { tipo: "material", itens: [{ tipo: "material", codigo: "244072", descricao: "Papel sulfite A4", grupo: "Papelaria", classe: "Papel", pdm: null, status: "ATIVO", sustentavel: null, ncm: "48025610" }], pagina: 1, total: 1, totalPaginas: 1, paginasRestantes: 0, filtros: { busca: "papel", codigo: "" }, fonte: "https://dadosabertos.compras.gov.br/modulo-material/4_consultarItemMaterial", consultadoEm: "2026-08-10T12:00:00.000Z", emCache: false, configuracao: { fonte: "https://www.gov.br/compras", swagger: "https://dadosabertos.compras.gov.br/swagger-ui/index.html", cacheMinutos: 15 } }
      : { tipo: "material", codigo: "244072", rows: [{ tipo: "material", idCompra: "1", idItemCompra: "1", forma: "Pregão", modalidade: "Pregão eletrônico", criterioJulgamento: null, numeroItemCompra: "1", descricaoItem: "Papel sulfite A4", codigoItemCatalogo: "244072", unidade: "Resma", quantidade: 10, precoUnitario: 10, percentualMaiorDesconto: null, fornecedor: "Fornecedor A", fornecedorCnpj: null, codigoUasg: "160001", nomeUasg: "UASG A", codigoMunicipio: "4110300", municipio: "Inajá", estado: "PR", codigoOrgao: null, nomeOrgao: "Órgão federal", poder: null, esfera: null, dataCompra: "2026-01-10", dataResultado: "2026-01-10" }, { tipo: "material", idCompra: "2", idItemCompra: "1", forma: "Pregão", modalidade: "Pregão eletrônico", criterioJulgamento: null, numeroItemCompra: "1", descricaoItem: "Papel sulfite A4", codigoItemCatalogo: "244072", unidade: "Resma", quantidade: 10, precoUnitario: 20, percentualMaiorDesconto: null, fornecedor: "Fornecedor B", fornecedorCnpj: null, codigoUasg: "160002", nomeUasg: "UASG B", codigoMunicipio: "4110300", municipio: "Inajá", estado: "PR", codigoOrgao: null, nomeOrgao: "Órgão federal", poder: null, esfera: null, dataCompra: "2026-02-10", dataResultado: "2026-02-10" }], pagina: 1, total: 2, totalPaginas: 1, resumo: { totalRegistros: 2, comPreco: 2, minimo: 10, mediana: 15, media: 15, maximo: 20 }, fonte: "https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial", consultadoEm: "2026-08-10T12:00:00.000Z", emCache: false };
    return new Response(JSON.stringify({ data, error: null }), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("ComprasGov", () => {
  it("pesquisa catálogo, seleciona item e mostra comparação de preços", async () => {
    render(<MemoryRouter><ComprasGov /></MemoryRouter>);
    expect(screen.getByText("Compras.gov.br — Pesquisa de preços")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/papel sulfite/i), { target: { value: "papel" } });
    fireEvent.click(screen.getByRole("button", { name: /pesquisar/i }));
    await waitFor(() => expect(screen.getByText("Papel sulfite A4")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /244072 papel sulfite a4/i }));
    await waitFor(() => expect(screen.getByText("Resumo da amostra consultada")).toBeInTheDocument());
    expect(screen.getAllByText("R$ 15,00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fornecedor A")).toBeInTheDocument();
  });
});
