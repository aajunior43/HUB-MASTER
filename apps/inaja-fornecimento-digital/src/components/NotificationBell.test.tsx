import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const { authMock, rpcMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock() }));
vi.mock("@/integrations/db/client", () => ({ db: { rpc: rpcMock } }));

import { NotificationBell } from "./NotificationBell";

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}{location.search}</output>;
}

describe("NotificationBell", () => {
  beforeEach(() => {
    authMock.mockReturnValue({ user: "ana" });
    rpcMock.mockImplementation(async (fn: string) => {
      if (fn === "gd_notificacoes_listar") {
        return {
          data: {
            rows: [{
              id: "n1", titulo: "Novo pedido", mensagem: "Pedido DOT-1", lida: 0,
              tipo: "pedido_dotacao", ref_tipo: "pedidos_dotacao", ref_id: "p1", ator_id: "u2",
              rota: "/pedidos-dotacao?pedido=p1", prioridade: "alta", lida_em: null, criado_em: "2026-08-09 10:00:00",
            }],
            naoLidas: 3, total: 3, pagina: 1, porPagina: 50, totalPaginas: 1,
          },
          error: null,
        };
      }
      return { data: { ok: true, alteradas: 1 }, error: null };
    });
  });

  it("usa a contagem de nao lidas do servidor e navega pela rota da notificacao", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="*" element={<><NotificationBell variant="onLight" /><CurrentPath /></>} />
        </Routes>
      </MemoryRouter>,
    );

    const bell = await screen.findByRole("button", { name: /3 não lidas/i });
    expect(bell).toBeInTheDocument();
    await user.click(bell);
    expect(screen.getByText("Novo pedido")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Novo pedido/ }));
    await waitFor(() => expect(screen.getByTestId("current-path")).toHaveTextContent("/pedidos-dotacao?pedido=p1"));
    expect(rpcMock).toHaveBeenCalledWith("gd_notificacao_marcar_lida", { _caller: "ana", _id: "n1" });
  });
});
