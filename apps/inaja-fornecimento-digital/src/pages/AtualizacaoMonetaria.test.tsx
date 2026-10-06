import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AtualizacaoMonetaria from "./AtualizacaoMonetaria";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    expect(url).toContain("/api/bcb/calcular?");
    return new Response(JSON.stringify({ data: {
      serie: { id: "ipca", codigo: "433", nome: "IPCA", periodicidade: "mensal", unidade: "percentual ao mês", descricao: "", fonte: "https://bcb.gov.br" },
      dataInicial: "2024-01-01",
      dataFinal: "2024-02-29",
      principal: 1000,
      fator: 1.0302,
      percentualAcumulado: 3.02,
      valorAtualizado: 1030.2,
      acrescimo: 30.2,
      observacoesAplicadas: 2,
      fonte: "https://api.bcb.gov.br",
      consultadoEm: "2026-08-09T00:00:00.000Z",
      emCache: false,
    }, error: null }), { status: 200 });
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe("AtualizacaoMonetaria", () => {
  it("envia os filtros e mostra o resultado oficial", async () => {
    render(<AtualizacaoMonetaria />);
    fireEvent.change(screen.getByLabelText("Valor inicial"), { target: { value: "1.000,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular atualização" }));
    await waitFor(() => expect(screen.getByText("IPCA")).toBeInTheDocument());
    expect(screen.getByText("R$ 1.030,20")).toBeInTheDocument();
    expect(screen.getByText("3,0200%")).toBeInTheDocument();
    expect(screen.getByText("2 observações")).toBeInTheDocument();
  });
});
