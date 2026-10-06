import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Minus, FileText, Eye, User, Building2, Calendar,
  FileEdit, FileType2, FileSpreadsheet, Paperclip, PenTool, Trash2,
} from "lucide-react";
import { ComboboxInput } from "@/components/ComboboxInput";
import { SignaturePad } from "@/components/SignaturePad";
import { AttachmentUploader, type Anexo } from "@/components/AttachmentUploader";
import { NumberInput } from "@/components/ui/number-input";
import { moeda } from "@/lib/empenhos";
import type { SolicitationFormData, SolicitationItem } from "@/types/solicitacao";
import { FieldGroup, ActionTile } from "./SolicitacaoUtils";

type Item = SolicitationItem;
type FormData = SolicitationFormData;

export interface FormViewProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  items: Item[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, field: keyof Item, value: string | number) => void;
  clearForm: () => void | Promise<void>;
  getTotalGeral: () => number;
  onPreview: () => void;
  onExportPDF: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
  savedSolicitantes: string[];
  savedEmpresas: string[];
  savedObservacoes: string[];
  assinatura: string | null;
  setAssinatura: (v: string | null) => void;
  anexos: Anexo[];
  setAnexos: (v: Anexo[]) => void;
  preservedAttachmentPaths: string[];
  exportingPDF: boolean;
  exportingDoc?: boolean;
  incluirItens: boolean;
  setIncluirItens: (v: boolean) => void;
}

export const FormView = ({
  formData, setFormData, items, addItem, removeItem, updateItem,
  clearForm, getTotalGeral, onPreview, onExportPDF, onExportWord, onExportExcel,
  savedSolicitantes, savedEmpresas,
  assinatura, setAssinatura, anexos, setAnexos, preservedAttachmentPaths, exportingPDF, exportingDoc,
  incluirItens, setIncluirItens,
}: FormViewProps) => (

  <div className="max-w-7xl mx-auto animate-fade-in">
    <div className="mb-5 sm:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-primary leading-tight">Nova Solicitação de Aquisição</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Preencha os dados institucionais e os itens desejados.</p>
      </div>
    </div>

    <div className="grid grid-cols-12 gap-4 sm:gap-6">
      {/* Dados da Solicitação */}
      <Card className="col-span-12 lg:col-span-8 rounded-2xl border-border/60 shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-card to-muted/40 flex items-center gap-2">
          <div className="w-1 h-6 bg-accent rounded-full" />
          <h3 className="font-display font-bold text-primary uppercase tracking-wide text-sm">
            Dados da Solicitação
          </h3>
        </div>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <FieldGroup label="Nome do Solicitante" icon={<User className="w-3.5 h-3.5" />} id="solicitante">
            <ComboboxInput
              id="solicitante"
              value={formData.nomeSolicitante}
              onChange={(v) => setFormData({ ...formData, nomeSolicitante: v })}
              options={savedSolicitantes}
              placeholder="Digite ou escolha um solicitante salvo"
              emptyMessage="Nenhum solicitante salvo"
            />
          </FieldGroup>

          <FieldGroup label="Empresa / Credor Fixo" icon={<Building2 className="w-3.5 h-3.5" />} id="empresa">
            <ComboboxInput
              id="empresa"
              value={formData.nomeEmpresa}
              onChange={(v) => setFormData({ ...formData, nomeEmpresa: v })}
              options={savedEmpresas}
              placeholder="Digite ou selecione um credor fixo"
              emptyMessage="Nenhum credor fixo cadastrado"
            />
          </FieldGroup>

          <FieldGroup label="Data da Solicitação" icon={<Calendar className="w-3.5 h-3.5" />} id="data">
            <Input
              id="data"
              value={formData.dataSolicitacao}
              onChange={(e) => setFormData({ ...formData, dataSolicitacao: e.target.value })}
              className="h-11 bg-muted/40 border-border focus-visible:ring-accent"
            />
          </FieldGroup>

          <div className="md:col-span-2">
            <FieldGroup label="Observações Gerais" icon={<FileEdit className="w-3.5 h-3.5" />} id="observacoes">
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Detalhes adicionais, finalidade da aquisição..."
                className="min-h-[110px] bg-muted/40 border-border focus-visible:ring-accent resize-none"
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      {/* Ações do Sistema */}
      <Card className="col-span-12 lg:col-span-4 rounded-2xl bg-gradient-emerald text-primary-foreground shadow-elevated border-0 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-accent/10 blur-2xl" aria-hidden />
        <div className="absolute bottom-0 inset-x-0 h-1 bg-accent" aria-hidden />
        <CardContent className="p-4 sm:p-6 relative">
          <h3 className="font-display font-bold uppercase tracking-wide text-sm mb-4 sm:mb-5 text-accent flex items-center gap-2">
            <span className="w-1 h-5 bg-accent rounded-full" />
            Ações do Sistema
          </h3>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <ActionTile icon={Eye} label="Visualizar" onClick={onPreview} tone="secondary" />
            <ActionTile
              icon={FileText}
              label="PDF"
              onClick={onExportPDF}
              tone="accent"
              disabled={exportingPDF}
            />
            <ActionTile icon={FileType2} label="Word" onClick={onExportWord} tone="secondary" disabled={exportingDoc} />
            <ActionTile icon={FileSpreadsheet} label="Excel" onClick={onExportExcel} tone="secondary" disabled={exportingDoc} />
            <ActionTile icon={Trash2} label="Limpar" onClick={() => void clearForm()} tone="destructive" className="col-span-2" />
          </div>
        </CardContent>
      </Card>

      {/* Anexos + Assinatura */}
      <Card className="col-span-12 lg:col-span-6 rounded-2xl border-border/60 shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-card to-muted/40 flex items-center gap-2">
          <div className="w-1 h-6 bg-accent rounded-full" />
          <h3 className="font-display font-bold text-primary uppercase tracking-wide text-sm flex items-center gap-2">
            <Paperclip className="w-4 h-4" /> Anexos
          </h3>
        </div>
        <CardContent className="p-4 sm:p-6">
          <AttachmentUploader scope="solicitacoes" value={anexos} onChange={setAnexos} preservePaths={preservedAttachmentPaths} />
        </CardContent>
      </Card>

      <Card className="col-span-12 lg:col-span-6 rounded-2xl border-border/60 shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-border/60 bg-gradient-to-r from-card to-muted/40 flex items-center gap-2">
          <div className="w-1 h-6 bg-accent rounded-full" />
          <h3 className="font-display font-bold text-primary uppercase tracking-wide text-sm flex items-center gap-2">
            <PenTool className="w-4 h-4" /> Assinatura Digital
          </h3>
        </div>
        <CardContent className="p-4 sm:p-6">
          <SignaturePad value={assinatura} onChange={setAssinatura} />
        </CardContent>
      </Card>

      {/* Itens da Solicitação */}
      <Card className="col-span-12 rounded-2xl border-border/60 shadow-card overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border/60 bg-gradient-to-r from-card to-muted/40 flex justify-between items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-6 bg-primary rounded-full shrink-0" />
            <h3 className="font-display font-bold text-primary uppercase tracking-wide text-xs sm:text-sm truncate">
              Itens da Solicitação
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer select-none px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted transition-colors">
              <input
                type="checkbox"
                checked={incluirItens}
                onChange={(e) => setIncluirItens(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span>Incluir itens e valores</span>
            </label>
            {incluirItens && (
              <Button onClick={addItem} size="sm" className="bg-primary text-accent hover:bg-primary/90 font-semibold shrink-0">
                <Plus className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Adicionar Item</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            )}
          </div>
        </div>

        {!incluirItens && (
          <div className="p-6 text-center text-sm text-muted-foreground bg-muted/20">
            Esta solicitação será gerada <strong className="text-primary">sem tabela de itens nem valores</strong>. Ative a opção acima se precisar incluí-los.
          </div>
        )}

        {incluirItens && <>

        {/* Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[860px] text-left border-collapse">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Cód.</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Item</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Descrição</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest">Qtd</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right">Valor Unit.</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right">Total</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-xs text-muted-foreground">
                    {String(index + 1).padStart(3, "0")}
                  </td>
                  <td className="px-3 py-2 w-28">
                    <Input
                      value={item.codigoItem}
                      onChange={(e) => updateItem(item.id, "codigoItem", e.target.value)}
                      placeholder="ID"
                      className="h-9 bg-transparent border-border/60 focus-visible:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.item}
                      onChange={(e) => updateItem(item.id, "item", e.target.value)}
                      placeholder="Ex.: Papel A4"
                      className="h-9 bg-transparent border-border/60 focus-visible:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.descricao}
                      onChange={(e) => updateItem(item.id, "descricao", e.target.value)}
                      placeholder="Descrição detalhada"
                      className="h-9 bg-transparent border-border/60 focus-visible:ring-accent"
                    />
                  </td>
                  <td className="px-3 py-2 w-24">
                    <NumberInput
                      min="0.01"
                      value={item.quantidade}
                      onValueChange={(v) => updateItem(item.id, "quantidade", v)}
                      placeholder="Qtd"
                      className="h-9 bg-transparent border-border/60 focus-visible:ring-accent text-center"
                    />
                  </td>
                  <td className="px-3 py-2 w-32">
                    <NumberInput
                      min="0"
                      step="0.01"
                      value={item.valorUnitario}
                      onValueChange={(v) => updateItem(item.id, "valorUnitario", v)}
                      placeholder="0,00"
                      className="h-9 bg-transparent border-border/60 focus-visible:ring-accent text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-display font-bold text-primary tabular-nums">
                    {moeda(item.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      onClick={() => removeItem(item.id)}
                      size="icon"
                      variant="ghost"
                      disabled={items.length === 1}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                      aria-label="Remover item"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/60 border-t-2 border-accent">
                <td colSpan={6} className="px-4 py-4 text-right font-display font-bold text-primary uppercase tracking-wider text-sm">
                  Total Geral
                </td>
                <td className="px-4 py-4 text-right font-display font-extrabold text-lg text-gradient-gold tabular-nums">
                  {moeda(getTotalGeral())}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile */}
        <div className="lg:hidden p-4 space-y-3">
          {items.map((item, index) => (
            <Card key={item.id} className="border-border/60 shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent uppercase tracking-widest">
                    Item {String(index + 1).padStart(3, "0")}
                  </span>
                  <Button
                    onClick={() => removeItem(item.id)}
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    aria-label="Remover item"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
                <Input value={item.codigoItem} onChange={(e) => updateItem(item.id, "codigoItem", e.target.value)} placeholder="ID do item" className="bg-muted/40" />
                <Input value={item.item} onChange={(e) => updateItem(item.id, "item", e.target.value)} placeholder="Nome do item" className="bg-muted/40" />
                <Input value={item.descricao} onChange={(e) => updateItem(item.id, "descricao", e.target.value)} placeholder="Descrição" className="bg-muted/40" />
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput min="0.01" value={item.quantidade} onValueChange={(v) => updateItem(item.id, "quantidade", v)} placeholder="Qtd" className="bg-muted/40" />
                  <NumberInput min="0" step="0.01" value={item.valorUnitario} onValueChange={(v) => updateItem(item.id, "valorUnitario", v)} placeholder="Valor unit." className="bg-muted/40" />
                </div>
                <div className="bg-muted/60 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Total</span>
                  <span className="font-display font-bold text-primary tabular-nums">{moeda(item.valorTotal)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          <div className="bg-gradient-emerald text-primary-foreground rounded-2xl p-4 flex justify-between items-center shadow-elevated">
            <span className="font-display uppercase tracking-widest text-sm">Total Geral</span>
            <span className="font-display font-extrabold text-xl text-accent tabular-nums">{moeda(getTotalGeral())}</span>
          </div>
        </div>
        </>}
      </Card>

    </div>
  </div>
);
