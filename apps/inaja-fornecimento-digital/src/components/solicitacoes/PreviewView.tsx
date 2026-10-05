import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, ArrowLeft, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { moeda } from "@/lib/empenhos";
import type { SolicitationFormData, SolicitationItem } from "@/types/solicitacao";

interface PreviewViewProps {
  formData: SolicitationFormData;
  items: SolicitationItem[];
  fontSize: number;
  getTotalGeral: () => number;
  onBack: () => void;
  onExportPDF: () => void;
  onExportPDFAssinado?: () => void;
  onExportWord: () => void;
  onExportExcel: () => void;
  incluirItens: boolean;
  exportingPDF: boolean;
  exportingDoc?: boolean;
}

export const PreviewView = ({
  formData, items, fontSize, getTotalGeral, onBack, onExportPDF, onExportPDFAssinado, onExportWord, onExportExcel, incluirItens, exportingPDF, exportingDoc,
}: PreviewViewProps) => (
  <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
    <div className="flex flex-col sm:flex-row justify-between gap-3">
      <Button onClick={onBack} variant="outline" className="border-primary/30 text-primary hover:bg-emerald-soft">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Formulário
      </Button>
      <div className="flex flex-wrap gap-2">
        {onExportPDFAssinado && (
          <Button onClick={onExportPDFAssinado} disabled={exportingPDF} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <ShieldCheck className="mr-2 h-4 w-4" /> PDF assinado
          </Button>
        )}
        <Button onClick={onExportPDF} disabled={exportingPDF} variant="outline" className="border-primary/30 text-primary hover:bg-emerald-soft">
          <Download className="mr-2 h-4 w-4" /> PDF rascunho
        </Button>
        <Button onClick={onExportWord} disabled={exportingDoc} variant="outline" className="border-primary/30 text-primary hover:bg-emerald-soft">
          <Download className="mr-2 h-4 w-4" /> Word
        </Button>
        <Button onClick={onExportExcel} disabled={exportingDoc} variant="outline" className="border-primary/30 text-primary hover:bg-emerald-soft">
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>
    </div>

    <Card className="bg-card text-card-foreground shadow-elevated border-border max-w-4xl mx-auto">
      <CardContent className="p-4 sm:p-6 md:p-8" style={{ fontSize: `${fontSize}px` }}>
        <div className="text-center mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-3">
            <img src="/brasao.png" alt="Brasão" className="h-14 w-14 sm:h-16 sm:w-16 shrink-0" />
            <div className="text-center sm:text-left min-w-0">
              <h1 style={{ fontSize: `${fontSize + 4}px` }} className="font-display font-bold text-primary leading-tight">PREFEITURA MUNICIPAL DE INAJÁ</h1>
              <p style={{ fontSize: `${fontSize - 2}px` }} className="text-muted-foreground break-words">Av. Antônio Veiga Martins, 80 · CEP: 87670-200</p>
              <p style={{ fontSize: `${fontSize - 2}px` }} className="text-muted-foreground break-words">(44) 3112-4320 · prefeito@inaja.pr.gov.br</p>
            </div>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-accent to-transparent my-4" />
          <h2 style={{ fontSize: `${fontSize + 2}px` }} className="font-display font-bold text-primary leading-tight">
            SOLICITAÇÃO DE AQUISIÇÃO DE PRODUTOS OU SERVIÇOS
          </h2>
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 border border-border rounded-lg p-4 bg-muted/30">
          <p><strong>Solicitante:</strong> {formData.nomeSolicitante || "—"}</p>
          <p><strong>Empresa:</strong> {formData.nomeEmpresa || "—"}</p>
          <p><strong>Data:</strong> {formData.dataSolicitacao}</p>
        </div>

        {incluirItens && (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse border border-primary" style={{ fontSize: `${fontSize - 2}px` }}>
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="border border-primary p-2 text-left">ITEM</th>
                  <th className="border border-primary p-2 text-left">ID</th>
                  <th className="border border-primary p-2 text-left">DESCRIÇÃO</th>
                  <th className="border border-primary p-2 text-center">QTD</th>
                  <th className="border border-primary p-2 text-right">V. UNIT.</th>
                  <th className="border border-primary p-2 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="border border-border p-2">{it.item}</td>
                    <td className="border border-border p-2">{it.codigoItem || "—"}</td>
                    <td className="border border-border p-2">{it.descricao}</td>
                    <td className="border border-border p-2 text-center">{it.quantidade}</td>
                    <td className="border border-border p-2 text-right tabular-nums">{moeda(it.valorUnitario)}</td>
                    <td className="border border-border p-2 text-right tabular-nums">{moeda(it.valorTotal)}</td>
                  </tr>
                ))}
                <tr className="bg-muted font-bold">
                  <td className="border border-primary p-2" colSpan={5}>TOTAL GERAL</td>
                  <td className="border border-primary p-2 text-right text-accent tabular-nums">{moeda(getTotalGeral())}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {formData.observacoes && (
          <div className="mb-8">
            <h3 className="font-display font-bold mb-2 text-primary">OBSERVAÇÕES</h3>
            <p className="text-justify border border-border p-3 bg-muted/30 rounded">{formData.observacoes}</p>
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="border-b-2 border-primary w-72 mx-auto mb-2" />
          <p className="font-semibold text-primary">Assinatura do Solicitante</p>
          <p className="mt-6 text-muted-foreground">Inajá — PR, {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</p>
        </div>
      </CardContent>
    </Card>
  </div>
);
