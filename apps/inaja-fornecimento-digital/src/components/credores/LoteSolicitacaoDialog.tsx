import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Files, Loader2 } from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { MESES_NOMES, brl, type EmpenhoMensal } from "@/lib/empenhos";
import { empenhoDe, valorCredorNoDocumento } from "@/lib/credoresHelpers";
import type { CredorFixo } from "@/types/credor";

export function LoteSolicitacaoDialog({
  open, credores, anoPadrao, filtroDep, empenhos, carregarEmpenhosAno, onClose, onGerar,
}: {
  open: boolean;
  credores: CredorFixo[];
  anoPadrao: number;
  filtroDep: string;
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
    if (open) {
      setMes(new Date().getMonth() + 1);
      setAnoRef(anoPadrao);
      setGerando(false);
      setEmpenhosPreview(empenhos);
      setErroPreview(false);
    }
  }, [open, anoPadrao, empenhos]);

  useEffect(() => {
    if (!open) return;
    let ativo = true;
    setCarregandoPreview(true);
    setErroPreview(false);
    carregarEmpenhosAno(anoRef)
      .then((dados) => { if (ativo) setEmpenhosPreview(dados); })
      .catch(() => { if (ativo) { setEmpenhosPreview([]); setErroPreview(true); } })
      .finally(() => { if (ativo) setCarregandoPreview(false); });
    return () => { ativo = false; };
  }, [anoRef, carregarEmpenhosAno, open]);

  const totalPreview = useMemo(
    () => credores.reduce(
      (s, c) => s + valorCredorNoDocumento(c, empenhoDe(empenhosPreview, c.id, mes)),
      0,
    ),
    [credores, empenhosPreview, mes],
  );

  const confirmar = async () => {
    if (credores.length === 0) return;
    setGerando(true);
    try {
      await onGerar(mes, anoRef);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitações em lote</DialogTitle>
          <DialogDescription>Gera um PDF com os credores atualmente filtrados.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gera um PDF com uma solicitação por página, usando os credores
            atualmente filtrados na lista
            {filtroDep !== "todos" ? ` (departamento: ${filtroDep})` : ""}.
          </p>
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
              <Label htmlFor="lote-ano">Ano</Label>
              <NumberInput
                id="lote-ano"
                value={anoRef}
                onValueChange={(v) => setAnoRef(v || anoPadrao)}
              />
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Credores no lote: </span>
              <span className="font-semibold text-primary">{credores.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Soma dos valores do mês: </span>
              <span className="font-semibold text-emerald">
                {carregandoPreview ? "Carregando..." : brl(totalPreview)}
              </span>
            </div>
            <div className="text-muted-foreground">
              Referência: {MESES_NOMES[mes - 1]}/{anoRef}
            </div>
          </div>
          {erroPreview && <p className="text-xs text-destructive">Não foi possível carregar os empenhos desse ano.</p>}
          {credores.length > 0 && (
            <div className="max-h-36 overflow-y-auto rounded-md border text-xs">
              <ul className="divide-y">
                {credores.slice(0, 40).map((c) => (
                  <li key={c.id} className="px-3 py-1.5 flex justify-between gap-2">
                    <span className="truncate font-medium">{c.nome}</span>
                    <span className="text-muted-foreground shrink-0">
                      {brl(valorCredorNoDocumento(c, empenhoDe(empenhosPreview, c.id, mes)))}
                    </span>
                  </li>
                ))}
                {credores.length > 40 && (
                  <li className="px-3 py-1.5 text-muted-foreground">
                    + {credores.length - 40} outros
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={gerando}>Cancelar</Button>
          <Button onClick={confirmar} disabled={gerando || carregandoPreview || erroPreview || credores.length === 0}>
            {gerando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Files className="w-4 h-4 mr-2" />}
            Gerar PDF do lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
