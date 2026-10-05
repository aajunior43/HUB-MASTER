import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/number-input";
import { MESES } from "@/lib/empenhos";
import type { CredorFixo, EmpenhoCredor } from "@/types/credor";

export function EmpenhoDialog({
  data, empenho, onClose, onSave,
}: {
  data: { credor: CredorFixo; mes: number } | null;
  empenho?: EmpenhoCredor;
  onClose: () => void;
  onSave: (dados: Partial<EmpenhoCredor>) => void;
}) {
  const [numero, setNumero] = useState("");
  const [valor, setValor] = useState(0);
  const [obs, setObs] = useState("");
  const [erroValor, setErroValor] = useState<string | null>(null);
  useEffect(() => {
    setNumero(empenho?.numero_empenho ?? "");
    setValor(Number(empenho?.valor ?? data?.credor.valor_mensal ?? 0));
    setObs(empenho?.observacao ?? "");
    setErroValor(null);
  }, [data, empenho]);

  if (!data) return null;

  const validar = (): boolean => {
    if (!Number.isFinite(valor) || isNaN(valor)) {
      setErroValor("Valor inválido");
      return false;
    }
    if (valor < 0) {
      setErroValor("Valor não pode ser negativo");
      return false;
    }
    setErroValor(null);
    return true;
  };

  const submeter = (status: "pendente" | "empenhado") => {
    if (!validar()) return;
    onSave({ status, numero_empenho: numero, valor, observacao: obs });
  };

  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {data.credor.nome} — {MESES[data.mes - 1]}
          </DialogTitle>
          <DialogDescription>Empenho do credor para o mês selecionado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nº do empenho</Label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="empenho-valor">Valor</Label>
            <NumberInput
              id="empenho-valor"
              step="0.01"
              min="0"
              value={valor}
              onValueChange={(n) => {
                setValor(n);
                if (!Number.isFinite(n) || isNaN(n)) setErroValor("Valor inválido");
                else if (n < 0) setErroValor("Valor não pode ser negativo");
                else setErroValor(null);
              }}
            />
            {erroValor && (
              <p className="text-xs text-destructive mt-1" role="alert">{erroValor}</p>
            )}
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {empenho?.status === "empenhado" && (
            <Button variant="outline" onClick={() => submeter("pendente")}>
              Marcar como pendente
            </Button>
          )}
          <Button onClick={() => submeter("empenhado")}>
            Confirmar empenho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
