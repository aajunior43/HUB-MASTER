import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ModuleHub from "./ModuleHub";

describe("ModuleHub", () => {
  it("não renderiza a previsão do tempo", () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider attribute="class">
          <ModuleHub />
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(/previsão do tempo/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Previsão do tempo")).not.toBeInTheDocument();
  });
});
