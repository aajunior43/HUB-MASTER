import { useState } from 'react';
import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Minus, FileText, Download, Trash2, Eye, User, Building2, Calendar,
  FileEdit, FileType2, FileSpreadsheet, ChevronLeft, LayoutGrid, Archive, Package, Settings, ArrowLeft, History, Search, PenTool, Paperclip
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { createUuid } from "@/lib/uuid";
import type { WorkSheet, Range } from "xlsx-js-style";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { AppSidebar } from "@/components/AppSidebar";
import { FontSizeControl } from "@/components/FontSizeControl";
import { TemplateManager } from "@/components/TemplateManager";
import { DataManager } from "@/components/DataManager";
import { BatchRequestManager } from "@/components/BatchRequestManager";
import { HistoryView, type DuplicatePayload } from "@/components/HistoryView";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ComboboxInput } from "@/components/ComboboxInput";
import { SignaturePad } from "@/components/SignaturePad";
import { AttachmentUploader, type Anexo } from "@/components/AttachmentUploader";

import { useAuth } from "@/contexts/AuthContext";

import { TemplateData } from "@/hooks/useTemplates";
import { useBatchRequest } from "@/hooks/useBatchRequest";
import { useDataManager } from "@/hooks/useDataManager";
import { useCredoresFixos } from "@/hooks/useCredoresFixos";
import { useConfirm } from "@/components/ConfirmDialog";
import { moeda } from "@/lib/empenhos";
import { generateRequestPDF, generateRequestPDFBlob, generateBatchPDF } from "@/lib/pdfGenerator";

import { db } from "@/integrations/db/client";
import type { SolicitationFormData, SolicitationItem } from "@/types/solicitacao";
import { FormView } from "@/components/solicitacoes/FormView";
import { PreviewView } from "@/components/solicitacoes/PreviewView";
import { ViewHeader } from "@/components/solicitacoes/SolicitacaoUtils";


type Item = SolicitationItem;
type FormData = SolicitationFormData;

type View = 'form' | 'batch' | 'history' | 'data' | 'templates' | 'settings';

const makeId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? createUuid()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptyItem = (): Item => ({
  id: makeId(),
  codigoItem: '',
  item: '',
  descricao: '',
  quantidade: 0,
  valorUnitario: 0,
  valorTotal: 0,
});

const Solicitacoes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { confirm, confirmElement } = useConfirm();

  const [formData, setFormData] = useState<FormData>({
    nomeSolicitante: '',
    nomeEmpresa: '',
    dataSolicitacao: format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
    observacoes: '',
  });

  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [showPreview, setShowPreview] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [activeView, setActiveView] = useState<View>('form');
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [incluirItens, setIncluirItens] = useState(true);
  const [anexosPersistidos, setAnexosPersistidos] = useState<string[]>([]);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [exportandoDoc, setExportandoDoc] = useState(false);
  const exportandoPdfRef = useRef(false);
  const exportandoDocRef = useRef(false);

  useEffect(() => {
    const empresa = (location.state as { empresaCnpj?: { nome: string; cnpj: string; endereco: string } } | null)?.empresaCnpj;
    if (!empresa) return;
    setFormData((atual) => ({ ...atual, nomeEmpresa: empresa.nome, observacoes: [atual.observacoes, `CNPJ: ${empresa.cnpj}`, empresa.endereco].filter(Boolean).join("\n") }));
    toast({ title: "Empresa preenchida", description: "Os dados da consulta de CNPJ foram adicionados à solicitação." });
    navigate("/solicitacoes", { replace: true, state: {} });
  }, [location.state, navigate]);
  

  const {
    processedRequests,
    processBatchRequests,
    exportBatchToJSON,
    clearProcessedRequests,
    getRequestSummary,
  } = useBatchRequest();


  const dataManager = useDataManager();
  const { nomes: credoresFixosNomes } = useCredoresFixos();

  const addItem = () => setItems([...items, emptyItem()]);

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((it) => it.id !== id));
  };

  const limparFormulario = async () => {
    if (!(await confirm({ title: "Limpar formulário", description: "Os dados preenchidos e a assinatura serão descartados. Anexos ainda não salvos serão removidos.", confirmLabel: "Limpar" }))) return;
    await clearForm();
  };

  const limparLote = async () => {
    if (!(await confirm({ title: "Limpar lote", description: `Remover as ${processedRequests.length} solicitações processadas?`, confirmLabel: "Limpar" }))) return;
    clearProcessedRequests();
  };

  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(items.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, [field]: value };
      if (field === 'quantidade' || field === 'valorUnitario') {
        next.valorTotal = Number(next.quantidade) * Number(next.valorUnitario);
      }
      return next;
    }));
  };

  const clearForm = async () => {
    const pendentes = anexos.filter((a) => !anexosPersistidos.includes(a.path)).map((a) => a.path);
    if (pendentes.length) {
      const { error } = await db.storage.from('solicitacao-anexos').remove(pendentes);
      if (error) {
        toast({ title: 'Falha ao limpar anexos', description: error.message, variant: 'destructive' });
        return;
      }
    }
    setFormData({
      nomeSolicitante: '',
      nomeEmpresa: '',
      dataSolicitacao: format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
      observacoes: '',
    });
    setItems([emptyItem()]);
    setAssinatura(null);
    setAnexos([]);
    setAnexosPersistidos([]);
    setIncluirItens(true);
    toast({ title: 'Formulário limpo', description: 'Todos os campos foram resetados.' });
  };

  const effectiveItems = incluirItens ? items : [];
  const getTotalGeral = () => effectiveItems.reduce((t, i) => t + i.valorTotal, 0);


  const handleLoadTemplate = (template: TemplateData) => {
    setFormData(template.formData);
    setItems(template.items);
    toast({
      title: 'Modelo carregado',
      description: `O modelo "${template.name}" foi aplicado com sucesso!`,
    });
  };

  const handleDuplicate = (payload: DuplicatePayload) => {
    setFormData({
      ...payload.formData,
      dataSolicitacao: format(new Date(), 'dd/MM/yyyy', { locale: ptBR }),
    });
    setItems(
      payload.items.length > 0
        ? payload.items.map((it) => ({ ...it, id: makeId() }))
        : [emptyItem()]
    );
    setActiveView('form');
    setShowPreview(false);
    setAnexos([]);
    setAnexosPersistidos([]);
    toast({ title: 'Solicitação duplicada', description: 'Os dados foram carregados no formulário.' });
  };

  const handleBatchProcess = (batchRequests: Parameters<typeof processBatchRequests>[0]) => {
    processBatchRequests(batchRequests);
  };

  const buildRequestPayload = () => ({
    solicitante: formData.nomeSolicitante,
    empresa: formData.nomeEmpresa,
    dataSolicitacao: formData.dataSolicitacao,
    observacoes: formData.observacoes,
    items: effectiveItems,
    assinatura,
    anexos,
  });

  const validarSolicitacao = () => {
    if (!formData.nomeSolicitante.trim() || !formData.nomeEmpresa.trim() || !formData.dataSolicitacao.trim()) {
      toast({ title: 'Dados obrigatórios', description: 'Informe solicitante, empresa e data.', variant: 'destructive' });
      return false;
    }
    if (incluirItens) {
      const invalido = items.some((item) =>
        !item.item.trim()
        || !Number.isFinite(Number(item.quantidade))
        || Number(item.quantidade) <= 0
        || !Number.isFinite(Number(item.valorUnitario))
        || Number(item.valorUnitario) < 0
        || !Number.isFinite(Number(item.valorTotal))
        || Number(item.valorTotal) < 0
      );
      if (invalido) {
        toast({ title: 'Item inválido', description: 'Preencha o nome, uma quantidade maior que zero e valores não negativos.', variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const salvarHistoricoSolicitacao = async () => {
    const { error } = await db.from('solicitacoes').insert({
      solicitante: formData.nomeSolicitante,
      empresa: formData.nomeEmpresa,
      data_solicitacao: formData.dataSolicitacao,
      observacoes: formData.observacoes,
      items: effectiveItems,
      valor_total: getTotalGeral(),
      assinatura,
      anexos,
    });
    if (error) {
      toast({ title: 'PDF baixado, mas o histórico não foi salvo', description: error.message, variant: 'destructive' });
      return false;
    }
    setAnexosPersistidos(anexos.map((a) => a.path));
    return true;
  };

  /** PDF simples. */
  const exportToPDF = async () => {
    if (exportandoPdfRef.current || !validarSolicitacao()) return;
    exportandoPdfRef.current = true;
    setExportandoPdf(true);
    try {
      await generateRequestPDF(
        buildRequestPayload(),
        fontSize,
        `Solicitacao_Aquisicao_${formData.dataSolicitacao.replace(/\//g, '')}.pdf`,
      );
      const historicoSalvo = await salvarHistoricoSolicitacao();
      if (historicoSalvo) toast({ title: 'PDF exportado', description: 'Arquivo baixado e solicitação salva no banco!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao exportar PDF', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      exportandoPdfRef.current = false;
      setExportandoPdf(false);
    }
  };

  const exportBatchToPDF = async () => {
    if (processedRequests.length === 0) {
      toast({
        title: 'Nenhuma solicitação',
        description: 'Não há solicitações processadas para exportar.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await generateBatchPDF(
        processedRequests.map((r) => ({
          solicitante: r.solicitante,
          empresa: r.empresa,
          dataSolicitacao: r.dataSolicitacao,
          observacoes: r.observacoes,
          items: r.items.map((it) => ({ codigoItem: it.codigoItem || "", item: it.item, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario })),
        })),
        fontSize,
        `Lote_Solicitacoes_${format(new Date(), 'ddMMyyyy')}.pdf`
      );
      toast({
        title: 'PDF do lote exportado',
        description: `${processedRequests.length} solicitações foram exportadas para PDF!`,
      });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao exportar lote', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const exportToWord = async () => {
    if (exportandoDocRef.current || !validarSolicitacao()) return;
    exportandoDocRef.current = true;
    setExportandoDoc(true);
    try {
      const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle, TextRun, ImageRun } = await import('docx');
      const { saveAs } = await import('file-saver');
      const getImageBuffer = async (src: string): Promise<Uint8Array | null> => {
        try {
          const res = await fetch(src);
          if (!res.ok) throw new Error();
          return new Uint8Array(await res.arrayBuffer());
        } catch { return null; }
      };
      const logoBuffer = await getImageBuffer('/brasao.png');

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
          children: [
            new Paragraph({
              children: [
                ...(logoBuffer ? [
                  new ImageRun({ data: logoBuffer, transformation: { width: 80, height: 80 }, type: 'png' }),
                  new TextRun({ text: '     ' }),
                ] : []),
                new TextRun({ text: 'PREFEITURA MUNICIPAL DE INAJÁ', bold: true, size: Math.round(fontSize * 1.5), color: '064E3B' }),
              ],
              alignment: AlignmentType.CENTER, spacing: { after: 300 },
            }),
            new Paragraph({ text: 'Av. Antônio Veiga Martins, 80 - CEP: 87670-200', alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
            new Paragraph({ text: 'Telefone: (44) 3112-4320 | E-mail: prefeito@inaja.pr.gov.br', alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
            new Paragraph({
              children: [new TextRun({ text: 'SOLICITAÇÃO DE AQUISIÇÃO DE PRODUTOS OU SERVIÇOS', bold: true, size: Math.round(fontSize * 1.2), color: '064E3B' })],
              alignment: AlignmentType.CENTER, spacing: { after: 600 },
            }),
            new Paragraph({ children: [new TextRun({ text: 'Solicitante: ', bold: true, size: fontSize }), new TextRun({ text: formData.nomeSolicitante, size: fontSize })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Empresa: ', bold: true, size: fontSize }), new TextRun({ text: formData.nomeEmpresa, size: fontSize })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Data: ', bold: true, size: fontSize }), new TextRun({ text: formData.dataSolicitacao, size: fontSize })], spacing: { after: 400 } }),
            ...(incluirItens ? [new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: '064E3B' },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: '064E3B' },
                left: { style: BorderStyle.SINGLE, size: 4, color: '064E3B' },
                right: { style: BorderStyle.SINGLE, size: 4, color: '064E3B' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'C9A84C' },
                insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'C9A84C' },
              },
              rows: [
                new TableRow({
                  children: ['ITEM', 'ID', 'DESCRIÇÃO', 'QTD', 'VALOR UNIT.', 'VALOR TOTAL'].map((label) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: Math.round(fontSize * 0.8), color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                      shading: { fill: '064E3B' },
                    })
                  ),
                }),
                ...items.map((it) => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.item, size: Math.round(fontSize * 0.75) })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.codigoItem, size: Math.round(fontSize * 0.75) })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.descricao, size: Math.round(fontSize * 0.75) })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: it.quantidade.toString(), size: Math.round(fontSize * 0.75) })], alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: moeda(it.valorUnitario), size: Math.round(fontSize * 0.75) })], alignment: AlignmentType.RIGHT })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: moeda(it.valorTotal), size: Math.round(fontSize * 0.75) })], alignment: AlignmentType.RIGHT })] }),
                  ],
                })),
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL GERAL:', bold: true, size: Math.round(fontSize * 0.8) })], alignment: AlignmentType.RIGHT })], columnSpan: 4, shading: { fill: 'F5F0E0' } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: moeda(getTotalGeral()), bold: true, size: Math.round(fontSize * 0.8), color: 'C9A84C' })], alignment: AlignmentType.RIGHT })], shading: { fill: 'F5F0E0' } }),
                  ],
                }),
              ],
            })] : []),
            new Paragraph({ text: '', spacing: { after: 400 } }),
            ...(formData.observacoes ? [
              new Paragraph({ children: [new TextRun({ text: 'OBSERVAÇÕES:', bold: true, size: fontSize })], spacing: { after: 200 } }),
              new Paragraph({ children: [new TextRun({ text: formData.observacoes, size: Math.round(fontSize * 0.8) })], spacing: { after: 400 } }),
            ] : []),
            new Paragraph({ text: '', spacing: { after: 800 } }),
            new Paragraph({ children: [new TextRun({ text: '_'.repeat(50), size: fontSize })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Assinatura do Solicitante', size: Math.round(fontSize * 0.75) })], alignment: AlignmentType.CENTER }),
            new Paragraph({ text: '', spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: `Inajá - PR, ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, size: Math.round(fontSize * 0.75) })], alignment: AlignmentType.CENTER }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Solicitacao_Aquisicao_${formData.dataSolicitacao.replace(/\//g, '')}.docx`);
      toast({ title: 'Word exportado', description: 'O arquivo foi baixado com sucesso!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao exportar Word', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      exportandoDocRef.current = false;
      setExportandoDoc(false);
    }
  };

  const exportToExcel = async () => {
    if (exportandoDocRef.current || !validarSolicitacao()) return;
    exportandoDocRef.current = true;
    setExportandoDoc(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const EMERALD = 'FF064E3B';
    const GOLD = 'FFC9A84C';
    const GOLD_SOFT = 'FFF5F0E0';
    const WHITE = 'FFFFFFFF';
    const INK = 'FF1E2921';
    const ZEBRA = 'FFF9FAF7';
    const BORDER_COLOR = 'FFD2D6D0';

    const thin = { style: 'thin', color: { rgb: BORDER_COLOR } };
    const allBorders = { top: thin, bottom: thin, left: thin, right: thin };
    const brl = '"R$" #,##0.00;[Red]("R$" #,##0.00);"-"';

    const titleStyle = {
      font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: WHITE } },
      fill: { fgColor: { rgb: EMERALD } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    const subtitleStyle = {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: EMERALD } },
      fill: { fgColor: { rgb: GOLD_SOFT } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'medium', color: { rgb: GOLD } } },
    };
    const infoLabelStyle = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: EMERALD } },
      fill: { fgColor: { rgb: GOLD_SOFT } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: allBorders,
    };
    const infoValueStyle = {
      font: { name: 'Calibri', sz: 11, color: { rgb: INK } },
      alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
      border: allBorders,
    };
    const tableHeaderStyle = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: WHITE } },
      fill: { fgColor: { rgb: EMERALD } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: allBorders,
    };
    const cellBase = (align: string, zebra: boolean, bold = false) => ({
      font: { name: 'Calibri', sz: 10, color: { rgb: INK }, bold },
      fill: zebra ? { fgColor: { rgb: ZEBRA } } : undefined,
      alignment: { horizontal: align, vertical: 'center', wrapText: true },
      border: allBorders,
    });
    const totalLabelStyle = {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: EMERALD } },
      fill: { fgColor: { rgb: GOLD_SOFT } },
      alignment: { horizontal: 'right', vertical: 'center', indent: 1 },
      border: { ...allBorders, top: { style: 'medium', color: { rgb: GOLD } } },
    };
    const totalValueStyle = {
      font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: EMERALD } },
      fill: { fgColor: { rgb: GOLD_SOFT } },
      alignment: { horizontal: 'right', vertical: 'center', indent: 1 },
      border: { ...allBorders, top: { style: 'medium', color: { rgb: GOLD } } },
      numFmt: brl,
    };
    const obsLabelStyle = {
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: EMERALD } },
      fill: { fgColor: { rgb: GOLD_SOFT } },
      alignment: { horizontal: 'left', vertical: 'top', indent: 1 },
      border: allBorders,
    };
    const obsTextStyle = {
      font: { name: 'Calibri', sz: 10, color: { rgb: INK } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
      border: allBorders,
    };

    const ws: WorkSheet = {};
    const merges: Range[] = [];
    const rows: { hpt: number }[] = [];

    type CellStyle = Record<string, unknown>;
    const setCell = (addr: string, value: string | number, style: CellStyle, type: 's' | 'n' = 's') => {
      ws[addr] = { v: value, t: type, s: style };
      if (type === 'n' && style?.numFmt) ws[addr].z = style.numFmt;
    };

    // Row 1: title
    setCell('A1', 'PREFEITURA MUNICIPAL DE INAJÁ', titleStyle);
    for (let c = 1; c < 5; c++) ws[XLSX.utils.encode_cell({ r: 0, c })] = { v: '', t: 's', s: titleStyle };
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
    rows[0] = { hpt: 28 };

    // Row 2: subtitle
    setCell('A2', 'SOLICITAÇÃO DE AQUISIÇÃO DE PRODUTOS OU SERVIÇOS', subtitleStyle);
    for (let c = 1; c < 5; c++) ws[XLSX.utils.encode_cell({ r: 1, c })] = { v: '', t: 's', s: subtitleStyle };
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });
    rows[1] = { hpt: 22 };

    // Row 3: spacer
    rows[2] = { hpt: 6 };

    // Info rows (4-6)
    const info: [string, string][] = [
      ['Solicitante:', formData.nomeSolicitante || '—'],
      ['Empresa:', formData.nomeEmpresa || '—'],
      ['Data:', formData.dataSolicitacao || '—'],
    ];
    info.forEach(([label, value], i) => {
      const r = 3 + i;
      setCell(XLSX.utils.encode_cell({ r, c: 0 }), label, infoLabelStyle);
      setCell(XLSX.utils.encode_cell({ r, c: 1 }), value, infoValueStyle);
      for (let c = 2; c < 5; c++) ws[XLSX.utils.encode_cell({ r, c })] = { v: '', t: 's', s: infoValueStyle };
      merges.push({ s: { r, c: 1 }, e: { r, c: 4 } });
      rows[r] = { hpt: 20 };
    });

    let currentRow = 7;
    rows[6] = { hpt: 6 };

    if (incluirItens) {
      const headers = ['ITEM', 'ID', 'DESCRIÇÃO', 'QTD', 'VALOR UNIT.', 'VALOR TOTAL'];
      headers.forEach((h, c) => setCell(XLSX.utils.encode_cell({ r: currentRow, c }), h, tableHeaderStyle));
      rows[currentRow] = { hpt: 24 };
      currentRow++;

      items.forEach((it, idx) => {
        const zebra = idx % 2 === 1;
        setCell(XLSX.utils.encode_cell({ r: currentRow, c: 0 }), it.item, cellBase('center', zebra));
        setCell(XLSX.utils.encode_cell({ r: currentRow, c: 1 }), it.codigoItem, cellBase('center', zebra));
        setCell(XLSX.utils.encode_cell({ r: currentRow, c: 2 }), it.descricao, cellBase('left', zebra));
        setCell(XLSX.utils.encode_cell({ r: currentRow, c: 3 }), it.quantidade, cellBase('center', zebra), 'n');
        const unitStyle = { ...cellBase('right', zebra), numFmt: brl };
        setCell(XLSX.utils.encode_cell({ r: currentRow, c: 4 }), it.valorUnitario, unitStyle, 'n');
        const totStyle = { ...cellBase('right', zebra, true), numFmt: brl };
        setCell(XLSX.utils.encode_cell({ r: currentRow, c: 5 }), it.valorTotal, totStyle, 'n');
        rows[currentRow] = { hpt: 22 };
        currentRow++;
      });

      // Total row
      setCell(XLSX.utils.encode_cell({ r: currentRow, c: 0 }), '', totalLabelStyle);
      setCell(XLSX.utils.encode_cell({ r: currentRow, c: 1 }), '', totalLabelStyle);
      setCell(XLSX.utils.encode_cell({ r: currentRow, c: 2 }), '', totalLabelStyle);
      setCell(XLSX.utils.encode_cell({ r: currentRow, c: 3 }), '', totalLabelStyle);
      setCell(XLSX.utils.encode_cell({ r: currentRow, c: 4 }), 'TOTAL GERAL:', totalLabelStyle);
      setCell(XLSX.utils.encode_cell({ r: currentRow, c: 5 }), getTotalGeral(), totalValueStyle, 'n');
      merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
      rows[currentRow] = { hpt: 26 };
      currentRow += 2;
    }

    // Observações
    setCell(XLSX.utils.encode_cell({ r: currentRow, c: 0 }), 'OBSERVAÇÕES', obsLabelStyle);
    for (let c = 1; c < 5; c++) ws[XLSX.utils.encode_cell({ r: currentRow, c })] = { v: '', t: 's', s: obsLabelStyle };
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    rows[currentRow] = { hpt: 22 };
    currentRow++;
    setCell(XLSX.utils.encode_cell({ r: currentRow, c: 0 }), formData.observacoes || '—', obsTextStyle);
    for (let c = 1; c < 5; c++) ws[XLSX.utils.encode_cell({ r: currentRow, c })] = { v: '', t: 's', s: obsTextStyle };
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 4 } });
    rows[currentRow] = { hpt: 60 };

    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: currentRow, c: 5 } });
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 48 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
    ];
    ws['!rows'] = rows;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitação');
    XLSX.writeFile(wb, `Solicitacao_Aquisicao_${formData.dataSolicitacao.replace(/\//g, '')}.xlsx`);
    toast({ title: 'Excel exportado', description: 'O arquivo foi baixado com sucesso!' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao exportar Excel', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      exportandoDocRef.current = false;
      setExportandoDoc(false);
    }
  };

  const protocolNumber = `#${format(new Date(), 'yyyy')}-${String(items.length).padStart(4, '0')}`;

  return (
    <SidebarProvider defaultOpen={true}>
      <GlobalSearch
        solicitantes={dataManager.savedData.solicitantes}
        empresas={dataManager.savedData.empresas}
        fontSize={fontSize}
        onPickSolicitante={(nome) => { setFormData((p) => ({ ...p, nomeSolicitante: nome })); setActiveView('form'); setShowPreview(false); }}
        onPickEmpresa={(nome) => { setFormData((p) => ({ ...p, nomeEmpresa: nome })); setActiveView('form'); setShowPreview(false); }}
        onDuplicate={handleDuplicate}
      />
      <div className="min-h-screen w-full flex bg-background font-sans text-foreground">
        <AppSidebar activeView={activeView} onNavigate={setActiveView} />


        <SidebarInset className="flex-1 flex flex-col min-w-0 w-full">
          {/* Top header */}
          <header role="banner" className="sticky top-0 z-30 h-14 sm:h-16 bg-card/95 backdrop-blur-sm border-b border-border/60 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-8 shadow-card">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-1 h-9 px-2 rounded-lg text-primary hover:bg-emerald-soft shrink-0"
              title="Voltar à página principal"
              aria-label="Voltar à página principal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">Início</span>
            </button>
            <SidebarTrigger className="text-primary hover:bg-emerald-soft shrink-0" />
            <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-sm sm:text-base md:text-lg text-primary truncate leading-tight">
                Sistema de Solicitação de Aquisição
              </h1>
              <p className="text-[11px] text-muted-foreground hidden sm:block truncate">
                Prefeitura Municipal de Inajá — Estado do Paraná
              </p>
            </div>
            <NotificationBell variant="onLight" />
            <ThemeToggle variant="onLight" />
            <button
              type="button"
              onClick={() => {
                const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                window.dispatchEvent(ev);
              }}
              className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg border border-border/60 bg-muted/40 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
              title="Busca global"
              aria-label="Abrir busca global"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-background border border-border/60 text-[10px] font-mono">Ctrl K</kbd>
            </button>
            <div className="hidden lg:flex flex-col items-end shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Protocolo</p>
              <p className="font-display font-bold text-primary">{protocolNumber}</p>
            </div>
          </header>


          <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto overflow-x-hidden">
            {activeView === 'form' && !showPreview && (
              <FormView
                formData={formData}
                setFormData={setFormData}
                items={items}
                addItem={addItem}
                removeItem={removeItem}
                updateItem={updateItem}
                clearForm={limparFormulario}
                getTotalGeral={getTotalGeral}
                onPreview={() => { if (validarSolicitacao()) setShowPreview(true); }}
                onExportPDF={exportToPDF}
                onExportWord={exportToWord}
                onExportExcel={exportToExcel}
                savedSolicitantes={dataManager.savedData.solicitantes}
                savedEmpresas={credoresFixosNomes}
                savedObservacoes={dataManager.savedData.observacoes}

                assinatura={assinatura}
                setAssinatura={setAssinatura}
                anexos={anexos}
                setAnexos={setAnexos}
                preservedAttachmentPaths={anexosPersistidos}
                exportingPDF={exportandoPdf}
                exportingDoc={exportandoDoc}
                incluirItens={incluirItens}
                setIncluirItens={setIncluirItens}
              />

            )}

            {activeView === 'form' && showPreview && (
              <PreviewView
                formData={formData}
                items={incluirItens ? items : []}
                fontSize={fontSize}
                getTotalGeral={getTotalGeral}
                onBack={() => setShowPreview(false)}
                onExportPDF={exportToPDF}
                onExportWord={exportToWord}
                onExportExcel={exportToExcel}
                incluirItens={incluirItens}
                exportingPDF={exportandoPdf}
                exportingDoc={exportandoDoc}

              />
            )}

            {activeView === 'batch' && (
              <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
                <ViewHeader
                  icon={LayoutGrid}
                  title="Solicitação em Lote"
                  subtitle="Processe múltiplas solicitações de uma vez a partir de um arquivo .txt estruturado."
                />
                <BatchRequestManager onProcessBatch={handleBatchProcess} />

                {processedRequests.length > 0 && (
                  <Card className="rounded-2xl border-border/60 shadow-card">
                    <CardContent className="p-6 space-y-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-6 bg-accent rounded-full" />
                        <h3 className="font-display font-bold text-primary">
                          Solicitações Processadas ({processedRequests.length})
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Solicitações', value: getRequestSummary().totalRequests, tint: 'bg-emerald-soft text-emerald-deep' },
                          { label: 'Valor Total', value: moeda(getRequestSummary().totalValue), tint: 'bg-gold-soft text-primary' },
                          { label: 'Solicitantes', value: getRequestSummary().uniqueSolicitantes, tint: 'bg-emerald-soft text-emerald-deep' },
                          { label: 'Empresas', value: getRequestSummary().uniqueEmpresas, tint: 'bg-gold-soft text-primary' },
                        ].map((s) => (
                          <div key={s.label} className={`${s.tint} rounded-xl p-4 text-center`}>
                            <div className="text-xl font-display font-bold">{s.value}</div>
                            <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={exportBatchToPDF} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Download className="mr-2 h-4 w-4" /> Gerar Lote PDF
                        </Button>
                        <Button onClick={exportBatchToJSON} variant="outline" className="border-primary/30 text-primary hover:bg-emerald-soft">
                          <Download className="mr-2 h-4 w-4" /> Exportar JSON
                        </Button>
                        <Button onClick={limparLote} variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Limpar Lote
                        </Button>
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                        {processedRequests.map((r) => (
                          <div key={r.id} className="bg-muted/40 p-3 rounded-lg border-l-4 border-accent flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-primary text-sm">{r.solicitante} — {r.empresa}</div>
                              <div className="text-xs text-muted-foreground">{r.items.length} itens · {moeda(r.valorTotal)}</div>
                            </div>
                            <div className="text-[11px] text-muted-foreground">{r.dataSolicitacao}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}





            {activeView === 'history' && (
              <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                <ViewHeader icon={History} title="Histórico de Solicitações" subtitle="Consulte, filtre e reimprima solicitações salvas no banco." />
                <HistoryView fontSize={fontSize} onDuplicate={handleDuplicate} />
              </div>
            )}

            {activeView === 'data' && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <ViewHeader icon={Archive} title="Dados Salvos" subtitle="Guarde solicitantes, empresas e observações. Tudo em JSON — nada fica no servidor." />
                <DataManager
                  onSelectSolicitante={(nome) => setFormData((p) => ({ ...p, nomeSolicitante: nome }))}
                  onSelectEmpresa={(empresa) => setFormData((p) => ({ ...p, nomeEmpresa: empresa }))}
                  onSelectObservacao={(observacao) => setFormData((p) => ({ ...p, observacoes: observacao }))}
                  currentSolicitante={formData.nomeSolicitante}
                  currentEmpresa={formData.nomeEmpresa}
                  currentObservacao={formData.observacoes}
                  dataManager={dataManager}
                />
              </div>
            )}

            {activeView === 'templates' && (
              <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                <ViewHeader icon={Package} title="Modelos" subtitle="Salve o formulário atual como modelo e recupere-o quando precisar." />
                <TemplateManager formData={formData} items={items} onLoadTemplate={handleLoadTemplate} />
              </div>
            )}

            {activeView === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <ViewHeader icon={Settings} title="Preferências" subtitle="Ajuste tamanho de fonte do documento gerado." />
                <FontSizeControl fontSize={fontSize} onFontSizeChange={setFontSize} />
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
      {confirmElement}


    </SidebarProvider>
  );
};

export default Solicitacoes;

