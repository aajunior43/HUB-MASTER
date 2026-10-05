import { calcularIss } from "./calculadoras";

describe("calcularIss", () => {
  it("calcula o desconto de 5% e o valor líquido", () => {
    expect(calcularIss(100)).toEqual({ base: 100, desconto: 5, liquido: 95 });
  });

  it("arredonda desconto e líquido em centavos", () => {
    expect(calcularIss(123.45)).toEqual({ base: 123.45, desconto: 6.17, liquido: 117.28 });
  });

  it("não permite base negativa", () => {
    expect(calcularIss(-10)).toEqual({ base: 0, desconto: 0, liquido: 0 });
  });
});
