import type { EmpenhoMensal } from "@/lib/empenhos";

export type CredorFixo = {
  id: string;
  nome: string;
  documento: string | null;
  departamento: string;
  valor_mensal: number;
  descricao: string | null;
  email: string | null;
  tipo_valor: string | null;
  solicitacao: string | null;
  pagamento: string | null;
  obs: string | null;
};

export type EmpenhoCredor = EmpenhoMensal;

export type FiltrosCredores = {
  busca: string;
  filtroDep: string;
  filtroStatus: string;
};
