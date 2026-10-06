import { useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import type { CredorFixo } from "@/types/credor";

export type CredorFixoResumo = Pick<
  CredorFixo,
  "id" | "nome" | "documento" | "departamento" | "valor_mensal"
>;

/** Lista leve de credores (autocomplete em Solicitações). Mantido separado da página completa. */
export function useCredoresFixos() {
  const [credores, setCredores] = useState<CredorFixoResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      const { data, error } = await db
        .from<CredorFixoResumo>("credores_fixos")
        .select("id, nome, documento, departamento, valor_mensal")
        .order("nome");
      if (!ativo) return;
      if (error) {
        setCredores([]);
      } else {
        setCredores(data ?? []);
      }
      setLoading(false);
    };
    carregar();
    const canal = db.channel("credores-fixos-form");
    canal.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "credores_fixos" },
      () => carregar(),
    );
    return () => {
      ativo = false;
      db.removeChannel(canal);
    };
  }, []);

  const nomes = credores.map((c) => c.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return { credores, nomes, loading };
}
