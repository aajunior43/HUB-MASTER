import { describe, expect, it } from "vitest";
import {
  empenhoDe,
  filtrarCredores,
  montarSolicitacao,
  nomeArquivoCredor,
  totalEmpenhadoAno,
} from "./credoresHelpers";
import type { CredorFixo } from "@/types/credor";
import type { EmpenhoMensal } from "./empenhos";

const credor = (over: Partial<CredorFixo> = {}): CredorFixo => ({
  id: "c1",
  nome: "EMPASOFT",
  documento: "12.345.678/0001-90",
  departamento: "Administração",
  valor_mensal: 1000,
  descricao: "Licença de software",
  email: null,
  tipo_valor: "FIXO",
  solicitacao: "05",
  pagamento: "10",
  obs: "Contrato anual",
  ...over,
});

const emp = (over: Partial<EmpenhoMensal> = {}): EmpenhoMensal => ({
  id: "e1",
  credor_id: "c1",
  ano: 2026,
  mes: 3,
  status: "empenhado",
  valor: 1200,
  numero_empenho: "2026/001",
  observacao: null,
  empenhado_em: "2026-03-01",
  ...over,
});

describe("empenhoDe / totalEmpenhadoAno", () => {
  it("localiza empenho por credor e mês", () => {
    const list = [emp({ mes: 1 }), emp({ id: "e2", mes: 3, valor: 500 })];
    expect(empenhoDe(list, "c1", 3)?.valor).toBe(500);
    expect(empenhoDe(list, "c1", 2)).toBeUndefined();
  });

  it("soma apenas meses empenhados", () => {
    const list = [
      emp({ id: "a", mes: 1, valor: 100, status: "empenhado" }),
      emp({ id: "b", mes: 2, valor: 200, status: "pendente" }),
      emp({ id: "c", mes: 3, valor: 300, status: "empenhado" }),
    ];
    expect(totalEmpenhadoAno(list, "c1")).toBe(400);
  });
});

describe("filtrarCredores", () => {
  const lista = [
    credor({ id: "1", nome: "Alpha", departamento: "Saúde", documento: "111", descricao: "Manutenção predial" }),
    credor({ id: "2", nome: "Beta Soft", departamento: "Administração", documento: "22.333.444/0001-55", descricao: "Sistemas" }),
  ];

  it("filtra por departamento", () => {
    const r = filtrarCredores(lista, [], { busca: "", filtroDep: "Saúde", filtroStatus: "todos" });
    expect(r).toHaveLength(1);
    expect(r[0].nome).toBe("Alpha");
  });

  it("filtra por nome e CNPJ (dígitos)", () => {
    expect(filtrarCredores(lista, [], { busca: "soft", filtroDep: "todos", filtroStatus: "todos" })[0].id).toBe("2");
    expect(filtrarCredores(lista, [], { busca: "22333", filtroDep: "todos", filtroStatus: "todos" })[0].id).toBe("2");
  });

  it("filtra por status empenhado", () => {
    const empenhos = [emp({ credor_id: "1", mes: 1, status: "empenhado" })];
    const r = filtrarCredores(lista, empenhos, { busca: "", filtroDep: "todos", filtroStatus: "empenhado" });
    expect(r.map((c) => c.id)).toEqual(["1"]);
  });
});

describe("montarSolicitacao", () => {
  it("monta PDFRequest de credor fixo com o valor mensal atual", () => {
    const { request, valor, mesNome } = montarSolicitacao(
      credor({ nome: "G FOUR", valor_mensal: 9776.6 }),
      3,
      2026,
      { anoEmpenhos: 2026, empenhos: [emp({ valor: 4215 })] },
    );
    expect(mesNome).toBe("Março");
    expect(valor).toBe(9776.6);
    expect(request.solicitante).toBe("Administração");
    expect(request.empresa).toContain("G FOUR");
    expect(request.empresa).toContain("12.345.678/0001-90");
    expect(request.items[0].valorUnitario).toBe(9776.6);
    expect(request.contexto).toEqual({
      origem: "Credor fixo - solicitação mensal",
      referencia: "Março/2026",
    });
    expect(request.observacoes).toContain("Março/2026");
    expect(request.observacoes).toContain("2026/001");
    expect(request.observacoes).toContain("Contrato anual");
  });

  it("mantém o valor específico do mês para credor variável", () => {
    const { valor, request } = montarSolicitacao(
      credor({ valor_mensal: 0, tipo_valor: "VARIÁVEL" }),
      3,
      2026,
      { anoEmpenhos: 2026, empenhos: [emp({ valor: 1200 })] },
    );
    expect(valor).toBe(1200);
    expect(request.items[0].valorUnitario).toBe(1200);
  });

  it("usa valor_mensal quando não há empenho no ano", () => {
    const { valor } = montarSolicitacao(credor({ valor_mensal: 999 }), 5, 2025, {
      anoEmpenhos: 2026,
      empenhos: [emp()],
    });
    expect(valor).toBe(999);
  });
});

describe("nomeArquivoCredor", () => {
  it("sanitiza nome para arquivo", () => {
    expect(nomeArquivoCredor("L. RICARDO DE MAGALHÃES")).toMatch(/L_RICARDO/);
  });
});
