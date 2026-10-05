import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FileText, Loader2 } from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { MESES_NOMES, brl, type EmpenhoMensal } from "@/lib/empenhos";
import { empenhoDe, valorCredorNoDocumento } from "@/lib/credoresHelpers";
import type { CredorFixo } from "@/types/credor";

export function SolicitacaoDialog({
  credor, anoPadrao, empenhos, carregarEmpenhosAno, onClose, onGerar,
}: {
  credor: CredorFixo | null;
  anoPadrao: number;
  empenhos: EmpenhoMensal[];
  carregarEmpenhosAno: (ano: number) => Promise<EmpenhoMensal[]>;
  onClose: () => void;
  onGerar: (mes: number, ano: number) => void | Promise<void>;
}) {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anoRef, setAnoRef] = useState(anoPadrao);
  const [gerando, setGerando] = useState(false);
  const [empenhosPreview, setEmpenhosPreview] = useState(empenhos);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [erroPreview, setErroPreview] = useState(false);

  useEffect(() => {
    if (credor) {
      setMes(new Date().getMonth() + 1);
      setAnoRef(anoPadrao);
      setGerando(false);
      setEmpenhosPreview(empenhos);
      setErroPreview(false);
    }
  }, [credor, anoPadrao, empenhos]);

  useEffect(() => {
    if (!credor) return;
    let ativo = true;
    setCarregandoPreview(true);
    setErroPreview(false);
    carregarEmpenhosAno(anoRef)
      .then((dados) => { if (ativo) setEmpenhosPreview(dados); })
      .catch(() => { if (ativo) { setEmpenhosPreview([]); setErroPreview(true); } })
      .finally(() => { if (ativo) setCarregandoPreview(false); });
    return () => { ativo = false; };
  }, [anoRef, carregarEmpenhosAno, credor]);

  if (!credor) return null;

  const emp = empenhoDe(empenhosPreview, credor.id, mes);
  const valorPreview = valorCredorNoDocumento(credor, emp);

  const confirmar = async () => {
    setGerando(true);
    try {
      await onGerar(mes, anoRef);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={!!credor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir solicitação</DialogTitle>
          <DialogDescription>Gera o PDF do mês para este credor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary">{credor.nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {credor.departamento}
              {credor.descricao ? ` · ${credor.descricao}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mês de referência</Label>
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES_NOMES.map((nome, i) => (
                    <SelectItem key={nome} value={String(i + 1)}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="solic-ano">Ano</Label>
              <NumberInput
                id="solic-ano"
                value={anoRef}
                onValueChange={(v) => setAnoRef(v || anoPadrao)}
              />
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Valor no PDF: </span>
            <span className="font-semibold text-emerald">
              {carregandoPreview ? "Carregando..." : brl(valorPreview)}
            </span>
            <span className="text-muted-foreground"> · {MESES_NOMES[mes - 1]}/{anoRef}</span>
          </div>
          {erroPreview && <p className="text-xs text-destructive">Não foi possível carregar os empenhos desse ano.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={gerando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={gerando || carregandoPreview || erroPreview}>
            {gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
