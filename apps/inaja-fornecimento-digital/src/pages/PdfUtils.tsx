import { useEffect, useRef, useState, type DragEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import {
  ArrowDown, ArrowUp, CheckCircle2, FileArchive, FileText, Files, FolderOpen, GripVertical,
  Info, Loader2, Merge, RotateCw, Shield, Split, Trash2, Upload, X,
} from "lucide-react";
import {
  compactarPdf, compactarPdfNoServidorLocal, contarPaginas, downloadPdfBytes, extrairPaginas, fileToArrayBuffer, mesclarPdfs,
  parsePaginasInput, protegerPdf,
} from "@/lib/pdfUtils";

type PdfArquivo = { id: string; file: File; buffer: ArrayBuffer; paginas: number };

const isPdf = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export default function PdfUtils() {
  const { user } = useAuth();
  const [tab, setTab] = useState("mesclar");

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={Files} title="Ferramentas PDF" subtitle="Organize, extraia e proteja documentos com segurança" username={user} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><CheckCircle2 className="h-4 w-4" /> Processamento local</div>
              <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">Tudo que você precisa para preparar seus PDFs</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Seus arquivos são processados localmente, sem enviar dados para a internet. Combine documentos, reorganize páginas, extraia trechos e gere cópias protegidas com segurança.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:gap-3"><Stat icon={FileText} value="PDF" label="Formato" /><Stat icon={Shield} value="Local" label="Privacidade" /><Stat icon={FileArchive} value="4" label="Ferramentas" /></div>
          </div>
        </section>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 bg-muted/60 p-1 sm:w-fit sm:grid-cols-4">
            <TabsTrigger value="mesclar"><Merge /> Mesclar</TabsTrigger><TabsTrigger value="dividir"><Split /> Páginas</TabsTrigger><TabsTrigger value="comprimir"><FileArchive /> Comprimir</TabsTrigger><TabsTrigger value="proteger"><Shield /> Proteger</TabsTrigger>
          </TabsList>
          <TabsContent value="mesclar"><AbaMesclar /></TabsContent>
          <TabsContent value="dividir"><AbaDividir /></TabsContent>
          <TabsContent value="comprimir"><AbaComprimir /></TabsContent>
          <TabsContent value="proteger"><AbaProteger /></TabsContent>
        </Tabs>
      </main>
      <footer className="py-6 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Documentos processados com segurança no ambiente local</footer>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof FileText; value: string; label: string }) {
  return <div className="rounded-xl border bg-background/70 px-3 py-2"><Icon className="mx-auto mb-1 h-4 w-4 text-primary" /><div className="font-semibold">{value}</div><div className="text-muted-foreground">{label}</div></div>;
}

function Dropzone({ multiple, onFiles }: { multiple?: boolean; onFiles: (files: FileList | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    onFiles(event.dataTransfer.files?.length ? event.dataTransfer.files : null);
  };
  return <button type="button" onClick={() => ref.current?.click()} onDragEnter={(event) => { event.preventDefault(); event.stopPropagation(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "copy"; setDragging(true); }} onDragLeave={handleDragLeave} onDrop={handleDrop} aria-label={`Solte ${multiple ? "um ou mais PDFs" : "um PDF"} ou clique para selecionar`} className={`group w-full rounded-xl border-2 border-dashed p-7 text-center transition hover:border-primary/60 hover:bg-primary/5 ${dragging ? "border-primary bg-primary/10 ring-2 ring-primary/25" : "border-border bg-muted/20"}`}>
    <Upload className="mx-auto mb-3 h-7 w-7 text-primary transition group-hover:-translate-y-0.5" /><span className="block font-medium">Clique para selecionar {multiple ? "um ou mais PDFs" : "um PDF"}</span><span className="mt-1 block text-xs text-muted-foreground">PDF · processamento local · sem limite de envio</span>
    <input ref={ref} type="file" accept=".pdf,application/pdf" multiple={multiple} className="hidden" onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
  </button>;
}

function PdfPreview({ arquivo }: { arquivo: PdfArquivo }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const nextUrl = URL.createObjectURL(new Blob([arquivo.buffer], { type: "application/pdf" }));
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [arquivo]);
  return <div className="mt-5 overflow-hidden rounded-xl border bg-muted/20"><div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-medium"><FileText className="h-4 w-4 text-primary" /> Visualização do PDF <span className="ml-auto text-xs font-normal text-muted-foreground">Use os controles do navegador para ampliar</span></div>{url && <iframe src={url} title={`Visualização de ${arquivo.file.name}`} className="h-[520px] w-full bg-white sm:h-[620px]" />}</div>;
}

function usePdfLoader() {
  const [loading, setLoading] = useState(false);
  const load = async (file: File) => { if (!isPdf(file)) throw new Error(`${file.name} não é um PDF válido`); const buffer = await fileToArrayBuffer(file); return { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, buffer, paginas: await contarPaginas(buffer) }; };
  return { loading, setLoading, load };
}

function AbaMesclar() {
  const [arquivos, setArquivos] = useState<PdfArquivo[]>([]); const { loading, setLoading, load } = usePdfLoader();
  const adicionar = async (files: FileList | null) => { if (!files) return; try { const novos = await Promise.all(Array.from(files).map(load)); setArquivos((prev) => [...prev, ...novos]); } catch (e) { toast({ title: "Não foi possível ler o arquivo", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } };
  const move = (index: number, direction: -1 | 1) => setArquivos((prev) => { const next = [...prev]; const target = index + direction; if (target < 0 || target >= next.length) return prev; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const merge = async () => { if (arquivos.length < 2) return toast({ title: "Adicione pelo menos 2 PDFs", variant: "destructive" }); setLoading(true); try { downloadPdfBytes(await mesclarPdfs(arquivos.map((a) => a.buffer)), "documento-mesclado.pdf"); toast({ title: "PDF mesclado com sucesso" }); } catch (e) { toast({ title: "Erro ao mesclar", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } finally { setLoading(false); } };
  return <ToolLayout icon={Merge} title="Mesclar e organizar" description="Junte vários documentos em um único PDF e defina a ordem das páginas."><Dropzone multiple onFiles={adicionar} />{arquivos.length > 0 && <div className="mt-5 space-y-2"><div className="flex items-center justify-between text-sm"><span className="font-medium">Arquivos na fila</span><Badge variant="secondary">{arquivos.length} arquivos · {arquivos.reduce((sum, a) => sum + a.paginas, 0)} páginas</Badge></div>{arquivos.map((a, i) => <div key={a.id} className="flex items-center gap-3 rounded-xl border bg-card p-3"><GripVertical className="h-4 w-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i + 1}. {a.file.name}</p><p className="text-xs text-muted-foreground">{a.paginas} páginas · {formatBytes(a.file.size)}</p></div><Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Mover para cima"><ArrowUp /></Button><Button size="icon" variant="ghost" disabled={i === arquivos.length - 1} onClick={() => move(i, 1)} aria-label="Mover para baixo"><ArrowDown /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => setArquivos((prev) => prev.filter((item) => item.id !== a.id))} aria-label="Remover arquivo"><Trash2 /></Button></div>)}</div>}{arquivos[0] && <PdfPreview arquivo={arquivos[0]} />}<Button onClick={merge} disabled={arquivos.length < 2 || loading} className="mt-5 w-full">{loading ? <Loader2 className="animate-spin" /> : <Merge />} Mesclar PDFs</Button></ToolLayout>;
}

function AbaDividir() {
  const [arquivo, setArquivo] = useState<PdfArquivo | null>(null); const [paginasInput, setPaginasInput] = useState(""); const { loading, setLoading, load } = usePdfLoader();
  const selecionar = async (files: FileList | null) => { if (!files?.[0]) return; try { setArquivo(await load(files[0])); setPaginasInput(""); } catch (e) { toast({ title: "Não foi possível ler o PDF", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } };
  const selecionarPaginas = (paginas: number[]) => setPaginasInput(paginas.join(","));
  const togglePagina = (pagina: number) => { const atuais = parsePaginasInput(paginasInput); selecionarPaginas(atuais.includes(pagina) ? atuais.filter((item) => item !== pagina) : [...atuais, pagina].sort((a, b) => a - b)); };
  const extract = async () => { if (!arquivo) return toast({ title: "Selecione um PDF", variant: "destructive" }); const paginas = parsePaginasInput(paginasInput); if (!paginas.length) return toast({ title: "Selecione as páginas", description: "Marque as páginas ou informe um intervalo.", variant: "destructive" }); setLoading(true); try { downloadPdfBytes(await extrairPaginas(arquivo.buffer, paginas), `paginas-${arquivo.file.name}`); toast({ title: "Páginas extraídas com sucesso" }); } catch (e) { toast({ title: "Erro ao extrair páginas", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } finally { setLoading(false); } };
  const paginasSelecionadas = parsePaginasInput(paginasInput);
  const atalhos = (filtro: (pagina: number) => boolean) => selecionarPaginas(Array.from({ length: arquivo?.paginas || 0 }, (_, index) => index + 1).filter(filtro));
  const inverterSelecao = () => selecionarPaginas(Array.from({ length: arquivo?.paginas || 0 }, (_, index) => index + 1).filter((pagina) => !paginasSelecionadas.includes(pagina)));
  const resumoSelecao = paginasSelecionadas.length ? paginasSelecionadas.join(", ") : "Nenhuma página selecionada";
  return <ToolLayout icon={Split} title="Extrair páginas" description="Marque somente as páginas que deseja levar para um novo PDF."><Dropzone onFiles={selecionar} />{arquivo && <><PdfPreview arquivo={arquivo} /><div className="mt-5 rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-primary" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{arquivo.file.name}</p><p className="text-xs text-muted-foreground">{arquivo.paginas} páginas · {formatBytes(arquivo.file.size)}</p></div><Button size="icon" variant="ghost" onClick={() => setArquivo(null)} aria-label="Remover PDF"><X /></Button></div><div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><Label>Páginas para extrair</Label><p className="mt-1 text-xs text-muted-foreground">Clique nos números para montar seu novo PDF.</p></div><Badge variant="secondary">{paginasSelecionadas.length} de {arquivo.paginas} selecionada(s)</Badge></div><div className="mt-3 grid max-h-48 grid-cols-5 gap-2 overflow-y-auto rounded-xl border bg-background p-3 sm:grid-cols-8 md:grid-cols-10">{Array.from({ length: arquivo.paginas }, (_, index) => { const pagina = index + 1; const selecionada = paginasSelecionadas.includes(pagina); return <button key={pagina} type="button" onClick={() => togglePagina(pagina)} aria-pressed={selecionada} aria-label={`Página ${pagina}${selecionada ? ", selecionada" : ""}`} className={`relative rounded-lg border px-2 py-2 text-sm font-semibold transition ${selecionada ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:border-primary/60 hover:bg-primary/5"}`}>{pagina}{selecionada && <CheckCircle2 className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-background text-primary" />}</button>; })}</div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => selecionarPaginas(Array.from({ length: arquivo.paginas }, (_, index) => index + 1))}>Selecionar todas</Button><Button type="button" size="sm" variant="outline" onClick={() => atalhos((pagina) => pagina % 2 === 0)}>Páginas pares</Button><Button type="button" size="sm" variant="outline" onClick={() => atalhos((pagina) => pagina % 2 !== 0)}>Páginas ímpares</Button><Button type="button" size="sm" variant="ghost" onClick={inverterSelecao}>Inverter</Button><Button type="button" size="sm" variant="ghost" onClick={() => selecionarPaginas([])}>Limpar</Button></div><div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Ordem do novo PDF:</span> {resumoSelecao}</div><Label htmlFor="paginas" className="mt-5 block">Ou informe por intervalo</Label><Input id="paginas" value={paginasInput} onChange={(e) => setPaginasInput(e.target.value)} placeholder="Ex: 1, 3, 5-8" className="mt-2" /><p className="mt-2 text-xs text-muted-foreground">A ordem do novo PDF seguirá a ordem das páginas selecionadas.</p></div><Button onClick={extract} disabled={loading || !paginasSelecionadas.length} className="mt-5 w-full">{loading ? <Loader2 className="animate-spin" /> : <Split />} Criar novo PDF com {paginasSelecionadas.length || "as páginas"}</Button></div></>}</ToolLayout>;
}

function AbaComprimir() {
  const [arquivo, setArquivo] = useState<PdfArquivo | null>(null); const [nivel, setNivel] = useState<"equilibrada" | "maxima">("equilibrada"); const { loading, setLoading, load } = usePdfLoader();
  const selecionar = async (files: FileList | null) => { if (!files?.[0]) return; try { setArquivo(await load(files[0])); } catch (e) { toast({ title: "Não foi possível ler o PDF", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } };
  const compress = async () => { if (!arquivo) return toast({ title: "Selecione um PDF", variant: "destructive" }); setLoading(true); try { let bytes: Uint8Array; try { bytes = await compactarPdfNoServidorLocal(arquivo.buffer, nivel); } catch { bytes = await compactarPdf(arquivo.buffer, nivel); } const reducao = Math.max(0, Math.round((1 - bytes.byteLength / arquivo.file.size) * 100)); downloadPdfBytes(bytes, `compactado-${arquivo.file.name}`); toast({ title: "PDF compactado com sucesso", description: reducao > 0 ? `Redução aproximada de ${reducao}%.` : "O PDF já estava otimizado; o arquivo foi reorganizado sem aumentar o tamanho." }); } catch (e) { toast({ title: "Erro ao compactar", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } finally { setLoading(false); } };
  return <ToolLayout icon={FileArchive} title="Comprimir PDF" description="Os dois níveis reprocessam as páginas localmente. O modo máximo usa qualidade menor e pode remover a seleção de texto para obter a maior redução."><Dropzone onFiles={selecionar} />{arquivo && <><PdfPreview arquivo={arquivo} /><div className="mt-5 rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-3"><FileArchive className="h-8 w-8 text-primary" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{arquivo.file.name}</p><p className="text-xs text-muted-foreground">{arquivo.paginas} páginas · {formatBytes(arquivo.file.size)}</p></div><Button size="icon" variant="ghost" onClick={() => setArquivo(null)} aria-label="Remover PDF"><X /></Button></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setNivel("equilibrada")} className={`rounded-xl border p-4 text-left transition ${nivel === "equilibrada" ? "border-primary bg-primary/10" : "hover:border-primary/50"}`}><span className="block font-medium">Equilibrada</span><span className="mt-1 block text-xs text-muted-foreground">Boa leitura, com compressão de imagens.</span></button><button type="button" onClick={() => setNivel("maxima")} className={`rounded-xl border p-4 text-left transition ${nivel === "maxima" ? "border-primary bg-primary/10" : "hover:border-primary/50"}`}><span className="block font-medium">Máxima</span><span className="mt-1 block text-xs text-muted-foreground">Maior redução, convertendo as páginas para JPEG.</span></button></div><Button onClick={compress} disabled={loading} className="mt-5 w-full">{loading ? <Loader2 className="animate-spin" /> : <FileArchive />} Comprimir e baixar PDF</Button></div></>}</ToolLayout>;
}

function AbaProteger() {
  const [arquivo, setArquivo] = useState<PdfArquivo | null>(null); const [senha, setSenha] = useState(""); const [confirmacao, setConfirmacao] = useState(""); const { loading, setLoading, load } = usePdfLoader();
  const selecionar = async (files: FileList | null) => { if (!files?.[0]) return; try { setArquivo(await load(files[0])); } catch (e) { toast({ title: "Não foi possível ler o PDF", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } };
  const protect = async () => { if (!arquivo) return toast({ title: "Selecione um PDF", variant: "destructive" }); if (senha.length < 4) return toast({ title: "Senha muito curta", description: "Use pelo menos 4 caracteres.", variant: "destructive" }); if (senha !== confirmacao) return toast({ title: "As senhas não conferem", variant: "destructive" }); setLoading(true); try { downloadPdfBytes(await protegerPdf(arquivo.buffer, senha), `protegido-${arquivo.file.name}`); toast({ title: "PDF protegido com sucesso" }); } catch (e) { toast({ title: "Erro ao proteger", description: e instanceof Error ? e.message : String(e), variant: "destructive" }); } finally { setLoading(false); } };
  return <ToolLayout icon={Shield} title="Proteger com senha" description="Crie uma cópia protegida do documento. A senha e o arquivo ficam somente no seu dispositivo."><Dropzone onFiles={selecionar} />{arquivo && <><PdfPreview arquivo={arquivo} /><div className="mt-5 rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-3"><Shield className="h-8 w-8 text-primary" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{arquivo.file.name}</p><p className="text-xs text-muted-foreground">{arquivo.paginas} páginas · {formatBytes(arquivo.file.size)}</p></div><Button size="icon" variant="ghost" onClick={() => setArquivo(null)} aria-label="Remover PDF"><X /></Button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="senha">Nova senha</Label><Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 4 caracteres" className="mt-2" autoComplete="new-password" /></div><div><Label htmlFor="confirmacao">Confirmar senha</Label><Input id="confirmacao" type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder="Repita a senha" className="mt-2" autoComplete="new-password" /></div></div><Button onClick={protect} disabled={loading || senha.length < 4 || senha !== confirmacao} className="mt-5 w-full">{loading ? <Loader2 className="animate-spin" /> : <Shield />} Baixar PDF protegido</Button></div></>}</ToolLayout>;
}

function ToolLayout({ icon: Icon, title, description, children }: { icon: typeof Merge; title: string; description: string; children: React.ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]"><Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-6 w-6" /></div><div><CardTitle className="text-xl">{title}</CardTitle><CardDescription className="mt-2 leading-6">{description}</CardDescription></div></div></CardHeader><CardContent className="p-5 sm:p-6">{children}</CardContent></Card><aside className="space-y-4"><Card><CardContent className="p-5"><div className="mb-3 flex items-center gap-2 font-semibold"><Info className="h-4 w-4 text-primary" /> Dicas rápidas</div><ul className="space-y-3 text-sm leading-5 text-muted-foreground"><li>• O processamento acontece no ambiente local, sem enviar os arquivos para a internet.</li><li>• Feche o arquivo se ele estiver aberto em outro programa.</li><li>• Sempre guarde uma cópia do documento original.</li></ul></CardContent></Card><Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><div className="flex items-start gap-3"><FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Os arquivos gerados são baixados automaticamente para a pasta padrão do seu navegador.</p></div></CardContent></Card></aside></div>;
}
