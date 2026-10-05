import { useCallback, useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { NumberInput } from "@/components/ui/number-input";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import {
  Plus, Pencil, Trash2, Calculator, Loader2, Search, Receipt,
} from "lucide-react";

type Rpa = {
  id: string;
  numero_rpa: string;
  nome_prestador: string;
  cpf_prestador: string;
  endereco_prestador: string;
  descricao_servico: string;
  periodo_referencia: string;
  carga_horaria: string;
  local_execucao: string;
  valor_bruto: number;
  num_dependentes: number;
  pensao_alimenticia: number;
  inss: number;
  iss: number;
  deducao_dependentes: number;
  base_calculo_irrf: number;
  aliquota_irrf: number;
  parcela_deduzir_irrf: number;
  irrf: number;
  valor_liquido: number;
  observacoes: string;
  data_emissao: string;
  criado_em: string;
};

type RpaListaResponse = {
  rows: Rpa[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
};

type TributosCalc = {
  inss: number; iss: number; deducao_dependentes: number;
  base_calculo_irrf: number; aliquota_irrf: number;
  parcela_deduzir_irrf: number; irrf: number; valor_liquido: number;
};

type RpcResponse<T> = { data: T | null; error: { message: string; code?: string } | null };

const formDefault = {
  numero_rpa: "", nome_prestador: "", cpf_prestador: "", endereco_prestador: "",
  descricao_servico: "", periodo_referencia: "", carga_horaria: "", local_execucao: "",
  valor_bruto: 0, num_dependentes: 0, pensao_alimenticia: 0,
  inss: 0, iss: 0, observacoes: "", data_emissao: "",
};

export default function Rpas() {
  const { confirm, confirmElement } = useConfirm();
  const { user } = useAuth();
  const [rpas, setRpas] = useState<Rpa[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Rpa | null>(null);
  const [form, setForm] = useState(formDefault);
  const [tributos, setTributos] = useState<TributosCalc | null>(null);
  const [calculando, setCalculando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("rpas_listar", {
      _caller: user, _pagina: pagina, _por_pagina: 50, _busca: busca,
    }) as unknown as RpcResponse<RpaListaResponse>;
    if (error) {
      setRpas([]);
      setTotal(0);
      toast({ title: "Erro ao carregar RPAs", description: error.message, variant: "destructive" });
    } else if (data) {
      setRpas(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [pagina, busca, user]);

  useEffect(() => { carregar(); }, [carregar]);

  const brl = (v: number) =>
    (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtCpf = (cpf: string) => {
    const d = cpf.replace(/\D/g, "");
    if (d.length !== 11) return cpf;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  };

  const handleCalc = async () => {
    setCalculando(true);
    const { data, error } = await db.rpc("rpas_calcular", {
      _caller: user, _valor_bruto: Number(form.valor_bruto) || 0,
      _num_dependentes: Number(form.num_dependentes) || 0,
      _pensao_alimenticia: Number(form.pensao_alimenticia) || 0,
      _inss: Number(form.inss) || 0,
      _iss: Number(form.iss) || 0,
      _data_emissao: form.data_emissao,
    }) as unknown as RpcResponse<TributosCalc>;
    setCalculando(false);
    if (error) {
      setTributos(null);
      toast({ title: "Erro no cálculo", description: error.message, variant: "destructive" });
    } else if (data) {
      setTributos(data);
    }
  };

  const limparForm = () => {
    setForm(formDefault);
    setTributos(null);
    setEditing(null);
  };

  const abrirEdicao = (rpa: Rpa) => {
    setEditing(rpa);
    setForm({
      numero_rpa: rpa.numero_rpa ?? "",
      nome_prestador: rpa.nome_prestador,
      cpf_prestador: rpa.cpf_prestador,
      endereco_prestador: rpa.endereco_prestador ?? "",
      descricao_servico: rpa.descricao_servico ?? "",
      periodo_referencia: rpa.periodo_referencia ?? "",
      carga_horaria: rpa.carga_horaria ?? "",
      local_execucao: rpa.local_execucao ?? "",
      valor_bruto: rpa.valor_bruto,
      num_dependentes: rpa.num_dependentes,
      pensao_alimenticia: rpa.pensao_alimenticia,
      inss: rpa.inss,
      iss: rpa.iss,
      observacoes: rpa.observacoes ?? "",
      data_emissao: rpa.data_emissao ?? "",
    });
    setTributos({
      inss: rpa.inss, iss: rpa.iss, deducao_dependentes: rpa.deducao_dependentes,
      base_calculo_irrf: rpa.base_calculo_irrf, aliquota_irrf: rpa.aliquota_irrf,
      parcela_deduzir_irrf: rpa.parcela_deduzir_irrf, irrf: rpa.irrf,
      valor_liquido: rpa.valor_liquido,
    });
    setOpenForm(true);
  };

  const salvar = async () => {
    if (!form.nome_prestador.trim()) {
      toast({ title: "Nome do prestador obrigatório", variant: "destructive" });
      return;
    }
    const valores = [form.valor_bruto, form.pensao_alimenticia, form.inss, form.iss].map(Number);
    if (!Number.isFinite(valores[0]) || valores[0] <= 0 || valores.slice(1).some((v) => !Number.isFinite(v) || v < 0)) {
      toast({ title: "Valores inválidos", description: "O valor bruto deve ser maior que zero e os descontos não podem ser negativos.", variant: "destructive" });
      return;
    }
    if (!Number.isInteger(Number(form.num_dependentes)) || Number(form.num_dependentes) < 0) {
      toast({ title: "Número de dependentes inválido", variant: "destructive" });
      return;
    }
    const payload = { ...form, _caller: user };
    if (editing?.id) {
      const { error } = await db.rpc("rpas_atualizar", { ...payload, _id: editing.id }) as unknown as RpcResponse<unknown>;
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "RPA atualizado" });
    } else {
      const { error } = await db.rpc("rpas_criar", payload) as unknown as RpcResponse<unknown>;
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "RPA criado com sucesso" });
    }
    setOpenForm(false);
    limparForm();
    carregar();
  };

  const excluir = async (id: string) => {
    if (!(await confirm({ title: "Excluir RPA", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" }))) return;
    const { error } = await db.rpc("rpas_excluir", { _caller: user, _id: id }) as unknown as RpcResponse<unknown>;
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "RPA excluído" });
    carregar();
  };

  const totalPaginas = Math.ceil(total / 50);

  const formatField = (label: string, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (label === "cpf") {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0,3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
      return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9,11)}`;
    }
    return raw;
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Receipt}
        title="RPA — Recibos de autônomos"
        subtitle="Recibos para autônomos com cálculo de INSS, ISS e IRRF"
        actions={
          <Button onClick={() => { limparForm(); setOpenForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo RPA
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {total} registro{total !== 1 ? "s" : ""}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF ou período..."
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rpas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum RPA encontrado
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº RPA</TableHead>
                        <TableHead>Prestador</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Valor Bruto</TableHead>
                        <TableHead>INSS</TableHead>
                        <TableHead>IRRF</TableHead>
                        <TableHead>Valor Líquido</TableHead>
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rpas.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.numero_rpa || "—"}</TableCell>
                          <TableCell className="font-medium">{r.nome_prestador}</TableCell>
                          <TableCell className="font-mono text-xs">{fmtCpf(r.cpf_prestador)}</TableCell>
                          <TableCell>{r.periodo_referencia || "—"}</TableCell>
                          <TableCell>{brl(r.valor_bruto)}</TableCell>
                          <TableCell>{brl(r.inss)}</TableCell>
                          <TableCell>{brl(r.irrf)}</TableCell>
                          <TableCell className="font-semibold">{brl(r.valor_liquido)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => abrirEdicao(r)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluir(r.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPaginas > 1 && (
                  <div className="flex justify-center items-center gap-2 p-4 border-t">
                    <Button size="sm" variant="outline" disabled={pagina <= 1}
                      onClick={() => setPagina(p => p - 1)}>Anterior</Button>
                    <span className="text-sm text-muted-foreground">
                      Página {pagina} de {totalPaginas}
                    </span>
                    <Button size="sm" variant="outline" disabled={pagina >= totalPaginas}
                      onClick={() => setPagina(p => p + 1)}>Próxima</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openForm} onOpenChange={(v) => { setOpenForm(v); if (!v) limparForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar RPA" : "Novo RPA"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº RPA</Label>
                <Input value={form.numero_rpa} onChange={(e) => setForm({ ...form, numero_rpa: e.target.value })} placeholder="Ex: 001/2026" />
              </div>
              <div className="space-y-2">
                <Label>Data de Emissão</Label>
                <Input type="date" value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Dados do Prestador</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome_prestador} onChange={(e) => setForm({ ...form, nome_prestador: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf_prestador} onChange={(e) => setForm({ ...form, cpf_prestador: formatField("cpf", e.target.value) })} placeholder="000.000.000-00" maxLength={14} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={form.endereco_prestador} onChange={(e) => setForm({ ...form, endereco_prestador: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Dados do Serviço</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Descrição do Serviço</Label>
                  <Textarea value={form.descricao_servico} onChange={(e) => setForm({ ...form, descricao_servico: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Período de Referência</Label>
                  <Input value={form.periodo_referencia} onChange={(e) => setForm({ ...form, periodo_referencia: e.target.value })} placeholder="Ex: Janeiro/2026" />
                </div>
                <div className="space-y-2">
                  <Label>Carga Horária</Label>
                  <Input value={form.carga_horaria} onChange={(e) => setForm({ ...form, carga_horaria: e.target.value })} placeholder="Ex: 40h semanais" />
                </div>
                <div className="space-y-2">
                  <Label>Local de Execução</Label>
                  <Input value={form.local_execucao} onChange={(e) => setForm({ ...form, local_execucao: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Valores e Tributos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor Bruto</Label>
                  <NumberInput min="0.01" step="0.01" value={form.valor_bruto || 0}
                    onValueChange={(v) => setForm({ ...form, valor_bruto: v })} />
                </div>
                <div className="space-y-2">
                  <Label>INSS (R$)</Label>
                  <NumberInput min="0" step="0.01" value={form.inss || 0}
                    onValueChange={(v) => setForm({ ...form, inss: v })} />
                </div>
                <div className="space-y-2">
                  <Label>ISS (R$)</Label>
                  <NumberInput min="0" step="0.01" value={form.iss || 0}
                    onValueChange={(v) => setForm({ ...form, iss: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Nº Dependentes</Label>
                  <NumberInput min="0" step="1" value={form.num_dependentes || 0}
                    onValueChange={(v) => setForm({ ...form, num_dependentes: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Pensão Alimentícia (R$)</Label>
                  <NumberInput min="0" step="0.01" value={form.pensao_alimenticia || 0}
                    onValueChange={(v) => setForm({ ...form, pensao_alimenticia: v })} />
                </div>
                <div className="flex items-end">
                  <Button variant="secondary" onClick={handleCalc} disabled={calculando} className="w-full">
                    {calculando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Calcular
                  </Button>
                </div>
              </div>

              {tributos && (
                <div className="mt-4 p-4 rounded-lg bg-muted/50 border space-y-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado do Cálculo</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">INSS</span>
                      <span className="font-medium">{brl(tributos.inss)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">ISS</span>
                      <span className="font-medium">{brl(tributos.iss)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Dedução Dependentes</span>
                      <span className="font-medium">{brl(tributos.deducao_dependentes)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Base Cálculo IRRF</span>
                      <span className="font-medium">{brl(tributos.base_calculo_irrf)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Alíquota IRRF</span>
                      <span className="font-medium">{tributos.aliquota_irrf}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Parcela Deduzir</span>
                      <span className="font-medium">{brl(tributos.parcela_deduzir_irrf)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">IRRF</span>
                      <span className="font-medium">{brl(tributos.irrf)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Valor Líquido</span>
                      <span className="font-semibold text-lg">{brl(tributos.valor_liquido)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Observações</h4>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenForm(false); limparForm(); }}>Cancelar</Button>
            <Button onClick={salvar}>{editing ? "Atualizar" : "Criar"} RPA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmElement}
    </div>
  );
}
