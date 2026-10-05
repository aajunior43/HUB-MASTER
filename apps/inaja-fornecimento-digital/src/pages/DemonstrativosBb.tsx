import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Download, ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";

type Arquivo = { nome: string; path: string; tipo: string; criadoEm?: string };
type Resultado = { beneficiario: string; periodo: { inicio: string; fim: string }; registros: number; arquivos: Arquivo[] };
const paraInputData = (data: Date) => data.toISOString().slice(0, 10);
const hoje = new Date();
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const anos = Array.from({ length: 8 }, (_, indice) => String(hoje.getFullYear() - indice));

export default function DemonstrativosBb() {
  const navigate = useNavigate();
  const { confirm, confirmElement } = useConfirm();
  const [beneficiario, setBeneficiario] = useState("INAJÁ - PR");
  const [inicio, setInicio] = useState(paraInputData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)));
  const [fim, setFim] = useState(paraInputData(hoje));
  const [mesCompetencia, setMesCompetencia] = useState(String(hoje.getMonth()));
  const [anoCompetencia, setAnoCompetencia] = useState(String(hoje.getFullYear()));
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [aba, setAba] = useState("consulta");
  const [buscaArquivo, setBuscaArquivo] = useState("");
  const carregarHistorico = async () => { const resposta = await fetch("/api/demonstrativos-bb/arquivos", { credentials: "same-origin" }); const json = await resposta.json(); if (resposta.ok) setArquivos(json.data || []); else toast({ title: "Não foi possível carregar o histórico", description: json.error?.message || "Tente novamente.", variant: "destructive" }); };
  useEffect(() => { void carregarHistorico(); }, []);
  const abrirArquivo = (arquivo: Arquivo) => window.open(`/api/files/${arquivo.path}`, "_blank", "noopener");
  const aplicarCompetencia = (mes: string, ano: string) => {
    setMesCompetencia(mes); setAnoCompetencia(ano);
    const inicioMes = new Date(Number(ano), Number(mes), 1);
    const fimMes = new Date(Number(ano), Number(mes) + 1, 0);
    setInicio(paraInputData(inicioMes)); setFim(paraInputData(fimMes));
  };
  const removerLote = async (itens: Arquivo[]) => {
    if (!(await confirm({ title: "Apagar arquivos da consulta", description: "Essa ação não pode ser desfeita.", confirmLabel: "Apagar" }))) return;
    const resposta = await fetch("/api/demonstrativos-bb/remover", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: itens.map((item) => item.path) }) });
    if (resposta.ok) { setResultado(null); await carregarHistorico(); }
    else setErro("Não foi possível apagar os arquivos. Tente novamente.");
  };
  const lotes = useMemo(() => {
    const termo = buscaArquivo.trim().toLocaleLowerCase("pt-BR");
    const grupos = new Map<string, Arquivo[]>();
    arquivos.filter((arquivo) => !termo || arquivo.nome.toLocaleLowerCase("pt-BR").includes(termo)).forEach((arquivo) => {
      const chave = arquivo.nome.replace(/-arquivos-completos\.zip$|\.(pdf|docx|xlsx|csv|txt)$/i, "");
      grupos.set(chave, [...(grupos.get(chave) || []), arquivo]);
    });
    return [...grupos.entries()].map(([nome, itens]) => ({ nome, itens })).sort((a, b) => (b.itens[0]?.criadoEm || "").localeCompare(a.itens[0]?.criadoEm || ""));
  }, [arquivos, buscaArquivo]);

  const consultar = async () => {
    setErro(""); setResultado(null);
    const dias = (new Date(`${fim}T00:00:00`).valueOf() - new Date(`${inicio}T00:00:00`).valueOf()) / 86400000;
    if (!beneficiario.trim()) return setErro("Informe o beneficiário.");
    if (dias < 0 || dias > 31) return setErro("O período precisa ter até 31 dias.");
    setCarregando(true);
    try {
      const resposta = await fetch("/api/demonstrativos-bb/baixar", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beneficiario, dataInicio: inicio, dataFim: fim }) });
      const json = await resposta.json();
      if (!resposta.ok || json.error) throw new Error(json.error?.message || "Não foi possível gerar os arquivos.");
      setResultado(json.data); await carregarHistorico(); setAba("arquivos");
    } catch (motivo) { setErro(motivo instanceof Error ? motivo.message : "Não foi possível gerar os arquivos."); } finally { setCarregando(false); }
  };

  return <div className="min-h-screen bg-background text-foreground"><PageHeader icon={Download} title="Demonstrativos BB" subtitle="Arrecadação federal · Banco do Brasil" />
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10"><Button variant="ghost" size="sm" className="-ml-2 mb-5" onClick={() => navigate("/prestacao-contas")}><ArrowLeft className="mr-1.5 h-4 w-4" />Prestação de contas</Button>
      <div className="mb-6 max-w-3xl"><h2 className="font-display text-2xl font-bold tracking-tight">Consulta e download automático</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Consulta a fonte oficial do Banco do Brasil e guarda os demonstrativos em PDF, Word, Excel, CSV e TXT. Você também pode baixar tudo em um único arquivo ZIP.</p></div>
      <Tabs value={aba} onValueChange={setAba}><TabsList className="mb-5 h-auto w-full justify-start gap-1 overflow-x-auto sm:w-auto"><TabsTrigger value="consulta">Nova consulta</TabsTrigger><TabsTrigger value="arquivos">Arquivos gerados <Badge variant="secondary" className="ml-2 px-1.5 py-0">{lotes.length}</Badge></TabsTrigger></TabsList>
        <TabsContent value="consulta"><Card><CardHeader><CardTitle className="text-lg">Período da consulta</CardTitle><CardDescription>Escolha uma competência para preencher o mês inteiro automaticamente ou ajuste as datas abaixo.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-primary/15 bg-primary/[0.03] p-4 sm:col-span-3"><p className="mb-3 text-sm font-semibold">Competência mensal</p><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Mês</Label><Select value={mesCompetencia} onValueChange={(valor) => aplicarCompetencia(valor, anoCompetencia)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{meses.map((mes, indice) => <SelectItem key={mes} value={String(indice)}>{mes}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Ano</Label><Select value={anoCompetencia} onValueChange={(valor) => aplicarCompetencia(mesCompetencia, valor)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{anos.map((ano) => <SelectItem key={ano} value={ano}>{ano}</SelectItem>)}</SelectContent></Select></div></div></div><div className="space-y-2 sm:col-span-3"><Label htmlFor="beneficiario">Beneficiário</Label><Input id="beneficiario" value={beneficiario} onChange={(event) => setBeneficiario(event.target.value)} placeholder="Ex.: INAJÁ - PR" /></div><div className="space-y-2"><Label htmlFor="inicio">Data inicial</Label><Input id="inicio" type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="fim">Data final</Label><Input id="fim" type="date" value={fim} onChange={(event) => setFim(event.target.value)} /></div><div className="flex items-end"><Button className="w-full" onClick={consultar} disabled={carregando}>{carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}{carregando ? "Consultando..." : "Gerar demonstrativos"}</Button></div></div>{erro && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>}</CardContent></Card></TabsContent>
        <TabsContent value="arquivos"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-display text-xl font-semibold">Arquivos gerados</h3><p className="mt-1 text-sm text-muted-foreground">Cada cartão reúne todos os formatos da mesma consulta, incluindo Excel e ZIP.</p></div><div className="flex gap-2"><Input value={buscaArquivo} onChange={(event) => setBuscaArquivo(event.target.value)} placeholder="Filtrar por período" className="w-full sm:w-52" /><Button variant="outline" size="sm" onClick={() => void carregarHistorico()}>Atualizar</Button></div></div>{resultado && <Card className="mb-4 border-primary/25"><CardContent className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">Última consulta: {resultado.beneficiario}</p><p className="text-sm text-muted-foreground">{resultado.registros} linhas encontradas</p></div><Badge variant="secondary"><CalendarDays className="mr-1.5 h-3.5 w-3.5" />{resultado.periodo.inicio} a {resultado.periodo.fim}</Badge></CardContent></Card>}<div className="grid gap-3">{lotes.map((lote) => <Card key={lote.nome}><CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate font-medium">{lote.nome.replace(/^demonstrativo-daf-/, "Demonstrativo DAF · ").replace(/-a-/, " até ")}</p><p className="text-xs text-muted-foreground">Gerado em {lote.itens[0]?.criadoEm ? new Date(lote.itens[0].criadoEm).toLocaleString("pt-BR") : "agora"}</p></div></div><div className="flex flex-wrap gap-2">{["PDF", "DOCX", "XLSX", "CSV", "TXT", "ZIP"].map((tipo) => { const arquivo = lote.itens.find((item) => item.tipo === tipo); const rotulo = tipo === "DOCX" ? "Word" : tipo === "XLSX" ? "Excel" : tipo === "ZIP" ? "Baixar tudo" : tipo; return arquivo ? <Button key={tipo} size="sm" variant={tipo === "ZIP" ? "default" : "outline"} onClick={() => abrirArquivo(arquivo)}><ExternalLink className="mr-1.5 h-3.5 w-3.5" />{rotulo}</Button> : null; })}<Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void removerLote(lote.itens)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Apagar</Button></div></CardContent></Card>)}{!lotes.length && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhum arquivo encontrado para este filtro.</CardContent></Card>}</div></TabsContent>
      </Tabs>
    </main><AppFooter />
    {confirmElement}
  </div>;
}
