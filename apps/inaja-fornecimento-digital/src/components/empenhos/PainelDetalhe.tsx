import { useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { moeda, fmtData } from "@/lib/empenhos";

interface EmpenhoDetalhe {
  nome_credor: string;
  especificacao: string;
  numero_empenho: string;
  ano_empenho: string;
  data: string;
  modalidade: string;
  contrato: string;
  licitacao: string;
  num_processo: string;
  valor_empenhado_bruto: number;
  valor_liquidado_bruto: number;
  valor_baixado_bruto: number;
  saldo_pagar: number;
  saldo_liquidar: number;
  saldo_baixado: number;
  num_natureza_emp: string;
  num_natureza_desp: string;
  num_acao: string;
  num_programa: string;
  num_recurso: string;
  id_credor: string;
}

interface PainelDetalheProps {
  id: string;
  onClose: () => void;
}

export function PainelDetalhe({ id, onClose }: PainelDetalheProps) {
  const { user } = useAuth();
  const [detalhe, setDetalhe] = useState<EmpenhoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setErro(null);
    db.rpc("empenhos_get", { _id: id, _caller: user }).then(({ data, error }) => {
      if (cancelado) return;
      if (error) {
        setErro(error.message || "Erro ao carregar detalhe");
        toast({ title: "Erro ao carregar empenho", description: error.message, variant: "destructive" });
      } else {
        setDetalhe(data as EmpenhoDetalhe);
      }
      setLoading(false);
    });
    return () => {
      cancelado = true;
    };
  }, [id, user]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-display font-bold text-base">Detalhes do Empenho</DialogTitle>
          <DialogDescription className="sr-only">Detalhes financeiros do empenho selecionado.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : erro ? (
          <p className="p-6 text-destructive">{erro}</p>
        ) : detalhe ? (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Credor</p>
              <p className="font-semibold">{detalhe.nome_credor || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Especificação</p>
              <p className="text-sm leading-relaxed">{detalhe.especificacao || "—"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Empenho nº</p>
                <p className="font-semibold">{detalhe.numero_empenho}/{detalhe.ano_empenho}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="font-semibold">{fmtData(detalhe.data)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Modalidade</p>
                <p className="font-semibold text-sm">{detalhe.modalidade || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contrato</p>
                <p className="font-semibold">{detalhe.contrato || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Licitação</p>
                <p className="font-semibold">{detalhe.licitacao || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processo</p>
                <p className="font-semibold">{detalhe.num_processo || "—"}</p>
              </div>
            </div>
            <hr className="border-border" />
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Empenhado", detalhe.valor_empenhado_bruto],
                ["Liquidado", detalhe.valor_liquidado_bruto],
                ["Pago", detalhe.valor_baixado_bruto],
                ["Saldo a Pagar", detalhe.saldo_pagar],
                ["Saldo a Liquidar", detalhe.saldo_liquidar],
                ["Saldo Baixado", detalhe.saldo_baixado],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-bold text-primary">{moeda(val as number)}</p>
                </div>
              ))}
            </div>
            <hr className="border-border" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Natureza Emp.", detalhe.num_natureza_emp],
                ["Natureza Desp.", detalhe.num_natureza_desp],
                ["Ação", detalhe.num_acao],
                ["Programa", detalhe.num_programa],
                ["Recurso", detalhe.num_recurso],
                ["ID Credor", detalhe.id_credor],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-mono text-xs">{val || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="p-6 text-muted-foreground">Não encontrado.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
