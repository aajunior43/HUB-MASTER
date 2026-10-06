import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { NumberInput } from "@/components/ui/number-input";
import { DEPARTAMENTOS } from "@/lib/empenhos";
import type { CredorFixo } from "@/types/credor";

export function CredorForm({
  open, credor, onClose, onSave,
}: {
  open: boolean;
  credor: CredorFixo | null;
  onClose: () => void;
  onSave: (data: Partial<CredorFixo>) => void;
}) {
  const [form, setForm] = useState<Partial<CredorFixo>>({});
  useEffect(() => {
    setForm(credor ?? { departamento: "Administração", valor_mensal: 0, tipo_valor: "FIXO" });
  }, [credor, open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{credor ? "Editar Credor" : "Novo Credor"}</DialogTitle>
          <DialogDescription>Dados do credor recorrente e do valor mensal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>CNPJ/CPF</Label>
            <Input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          </div>
          <div>
            <Label>Departamento</Label>
            <Select value={form.departamento} onValueChange={(v) => setForm({ ...form, departamento: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTAMENTOS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="credor-valor-mensal">Valor mensal (R$)</Label>
            <NumberInput id="credor-valor-mensal" step="0.01" min="0" value={form.valor_mensal ?? 0}
              onValueChange={(v) => setForm({ ...form, valor_mensal: v })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo Valor</Label>
              <Select value={form.tipo_valor || "FIXO"} onValueChange={(v) => setForm({ ...form, tipo_valor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXO">Fixo</SelectItem>
                  <SelectItem value="VARIÁVEL">Variável</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dia Solicitação</Label>
              <Input type="number" min="1" max="31" step="1" value={form.solicitacao ?? ""} onChange={(e) => setForm({ ...form, solicitacao: e.target.value })} />
            </div>
            <div>
              <Label>Dia Pagamento</Label>
              <Input type="number" min="1" max="31" step="1" value={form.pagamento ?? ""} onChange={(e) => setForm({ ...form, pagamento: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Observação</Label>
            <Input value={form.obs ?? ""} onChange={(e) => setForm({ ...form, obs: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
