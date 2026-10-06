import { MESES, MESES_NOMES, brl, type EmpenhoMensal } from "@/lib/empenhos";
import { empenhoDe, totalEmpenhadoAno } from "@/lib/credoresHelpers";
import type { CredorFixo } from "@/types/credor";

export async function exportarCredoresExcel(opts: {
  ano: number;
  credores: CredorFixo[];
  empenhos: EmpenhoMensal[];
}): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const { ano, credores, empenhos } = opts;

  const rows = credores.map((c) => {
    const base: Record<string, string | number> = {
      Credor: c.nome,
      Documento: c.documento || "",
      Departamento: c.departamento,
      "Valor mensal": Number(c.valor_mensal) || 0,
      Descrição: c.descricao || "",
    };
    MESES.forEach((m, i) => {
      const e = empenhoDe(empenhos, c.id, i + 1);
      base[m] = e?.status === "empenhado" ? "Empenhado" : "Pendente";
      base[`Valor ${m}`] = e?.valor != null ? Number(e.valor) : "";
      base[`Nº emp. ${m}`] = e?.numero_empenho || "";
    });
    base[`Total empenhado ${ano}`] = totalEmpenhadoAno(empenhos, c.id);
    return base;
  });

  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Credor: "(vazio)" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Credores ${ano}`);

  const resumo = [
    { Campo: "Ano", Valor: ano },
    { Campo: "Credores", Valor: credores.length },
    { Campo: "Soma mensal", Valor: brl(credores.reduce((s, c) => s + Number(c.valor_mensal || 0), 0)) },
    {
      Campo: `Empenhado ${ano}`,
      Valor: brl(credores.reduce((s, c) => s + totalEmpenhadoAno(empenhos, c.id), 0)),
    },
    { Campo: "Gerado em", Valor: new Date().toLocaleString("pt-BR") },
    { Campo: "Meses", Valor: MESES_NOMES.join(", ") },
  ];
  const ws2 = XLSX.utils.json_to_sheet(resumo);
  XLSX.utils.book_append_sheet(wb, ws2, "Resumo");

  XLSX.writeFile(wb, `credores-fixos-${ano}.xlsx`);
}
