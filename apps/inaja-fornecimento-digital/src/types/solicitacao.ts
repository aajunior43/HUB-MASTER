import type { Anexo } from "@/components/AttachmentUploader";

export interface SolicitationItem {
  id: string;
  codigoItem: string;
  item: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface SolicitationFormData {
  nomeSolicitante: string;
  nomeEmpresa: string;
  dataSolicitacao: string;
  observacoes: string;
}

export interface SolicitationRecord {
  id: string;
  solicitante: string;
  empresa: string;
  data_solicitacao: string;
  observacoes: string | null;
  valor_total: number;
  items: SolicitationItem[];
  assinatura: string | null;
  anexos: Anexo[] | null;
  created_at?: string;
}

export interface DuplicatePayload {
  formData: SolicitationFormData;
  items: SolicitationItem[];
}