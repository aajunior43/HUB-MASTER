import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { createUuid } from "@/lib/uuid";
import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  File,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  Loader2,
  Paperclip,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

type Pasta = { id: string; nome: string; criado_por: string };
type Arquivo = {
  id: string;
  nome_original: string;
  caminho: string;
  preview_caminho: string | null;
  mime: string | null;
  tamanho: number | null;
  criado_por: string;
  criado_em?: string;
};
type Conteudo = {
  pastas: Pasta[];
  arquivos: Arquivo[];
  totalBytes?: number;
  totalArquivos?: number;
  totalPastas?: number;
};

type TipoOrdenacao = "nome_asc" | "nome_desc" | "data_desc" | "data_asc" | "tamanho_desc" | "tamanho_asc";
type ModoVisualizacao = "lista" | "grade";

function urlArquivo(caminho: string) {
  return `/api/files/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

function tamanho(bytes: number | null | undefined) {
  if (!bytes) return "0 B";
  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  return `${(bytes / 1024 ** indice).toFixed(indice ? 1 : 0)} ${unidades[indice]}`;
}

function formatarData(iso?: string) {
  if (!iso) return "";
  try {
    const data = new Date(iso);
    return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

async function extrairContextoParaNome(arquivo: Arquivo) {
  try {
    const url = urlArquivo(arquivo.caminho);
    const arquivoResposta = await fetch(url);
    if (!arquivoResposta.ok) return "";
    const blob = await arquivoResposta.blob();
    if (!blob.size || blob.size > 20 * 1024 * 1024) return "";
    const base64 = await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result).split(",")[1] || "");
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(blob);
    });
    const extracaoResposta = await fetch("/api/ia/extrair-documento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: arquivo.nome_original, mime: arquivo.mime, contentBase64: base64 }),
    });
    if (!extracaoResposta.ok) return "";
    const resultado = (await extracaoResposta.json()) as { data?: { texto?: string } };
    return String(resultado.data?.texto || "").slice(0, 12000);
  } catch {
    return "";
  }
}

export default function Arquivos() {
  const { user, isAdmin } = useAuth();
  const { confirm, confirmElement } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pastaAtual, setPastaAtual] = useState<string | null>(null);
  const [caminho, setCaminho] = useState<Array<{ id: string; nome: string }>>([]);
  const [conteudo, setConteudo] = useState<Conteudo>({ pastas: [], arquivos: [] });
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pastaAlvoUpload, setPastaAlvoUpload] = useState<string | null>(null);
  const [novaPasta, setNovaPasta] = useState(false);
  const [nomePasta, setNomePasta] = useState("");
  const [pastaRenomeando, setPastaRenomeando] = useState<Pasta | null>(null);
  const [novoNomePasta, setNovoNomePasta] = useState("");
  const [salvandoNomePasta, setSalvandoNomePasta] = useState(false);

  const [arquivoRenomeandoIa, setArquivoRenomeandoIa] = useState<Arquivo | null>(null);
  const [arquivoRenomeandoManual, setArquivoRenomeandoManual] = useState<Arquivo | null>(null);
  const [nomeSugerido, setNomeSugerido] = useState("");
  const [novoNomeManual, setNovoNomeManual] = useState("");
  const [gerandoNome, setGerandoNome] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [arquivoVisualizando, setArquivoVisualizando] = useState<Arquivo | null>(null);

  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>("data_desc");
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>("lista");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const carregar = useCallback(async (id = pastaAtual) => {
    setCarregando(true);
    const { data, error } = await db.rpc("gd_arquivos_listar", { _caller: user, _pasta_id: id });
    if (error) {
      setConteudo({ pastas: [], arquivos: [] });
      toast({ title: "Não foi possível carregar arquivos", description: error.message, variant: "destructive" });
    } else {
      setConteudo((data as Conteudo) || { pastas: [], arquivos: [] });
    }
    setCarregando(false);
  }, [pastaAtual, user]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const abrirPasta = (pasta: Pasta) => {
    setPastaAtual(pasta.id);
    setCaminho((atual) => {
      const indiceExistente = atual.findIndex((item) => item.id === pasta.id);
      return indiceExistente >= 0 ? atual.slice(0, indiceExistente + 1) : [...atual, { id: pasta.id, nome: pasta.nome }];
    });
  };

  const navegar = (indice: number) => {
    const destino = indice < 0 ? null : caminho[indice].id;
    setPastaAtual(destino);
    setCaminho((atual) => atual.slice(0, indice + 1));
  };

  const criarPasta = async () => {
    const nome = nomePasta.trim();
    if (!nome) return;
    const { error } = await db.rpc("gd_pasta_criar", { _caller: user, _nome: nome, _parent_id: pastaAtual });
    if (error) {
      toast({ title: "Não foi possível criar a pasta", description: error.message, variant: "destructive" });
    } else {
      setNovaPasta(false);
      setNomePasta("");
      void carregar();
    }
  };

  const renomearPasta = async () => {
    if (!pastaRenomeando || !novoNomePasta.trim()) return;
    setSalvandoNomePasta(true);
    const { error } = await db.rpc("gd_pasta_renomear", { _caller: user, _id: pastaRenomeando.id, _nome: novoNomePasta.trim() });
    setSalvandoNomePasta(false);
    if (error) {
      toast({ title: "Não foi possível renomear a pasta", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pasta renomeada" });
    setPastaRenomeando(null);
    setNovoNomePasta("");
    void carregar();
  };

  const enviarArquivos = async (arquivos: FileList | null, pastaDestino = pastaAtual) => {
    if (!arquivos?.length || enviando) return;
    setEnviando(true);
    try {
      for (const arquivo of Array.from(arquivos)) {
        const nomeSeguro = arquivo.name.replace(/[\\/]/g, "_");
        const path = `arquivos/${pastaDestino || "raiz"}/${Date.now()}-${createUuid()}-${nomeSeguro}`;
        let caminhoEnviado = "";
        let previewPath: string | null = null;
        try {
          const upload = await db.storage.from("uploads").upload(path, arquivo, {
            contentType: arquivo.type || "application/octet-stream",
            module: "gestao-documentos",
          });
          if (upload.error) throw new Error(upload.error.message);
          caminhoEnviado = path;
          previewPath = (upload.data as { previewPath?: string | null } | null)?.previewPath || null;
          const { error } = await db.rpc("gd_arquivo_registrar", {
            _caller: user,
            _pasta_id: pastaDestino,
            _nome: arquivo.name,
            _caminho: path,
            _preview_caminho: previewPath,
            _mime: arquivo.type,
            _tamanho: arquivo.size,
          });
          if (error) throw new Error(error.message);
        } catch (error) {
          if (caminhoEnviado) {
            try {
              await db.storage.from("uploads").remove([caminhoEnviado, ...(previewPath ? [previewPath] : [])]);
            } catch {
              // Mantém erro original
            }
          }
          throw error;
        }
      }
      toast({ title: "Arquivo(s) enviado(s)" });
      void carregar();
    } catch (error) {
      toast({ title: "Falha no envio", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setEnviando(false);
      setPastaAlvoUpload(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const excluirPasta = async (id: string) => {
    if (!isAdmin) return;
    if (!(await confirm({ title: "Excluir pasta", description: "Somente pastas vazias podem ser excluídas. Continuar?", confirmLabel: "Excluir" }))) return;
    const { error } = await db.rpc("gd_pasta_excluir", { _caller: user, _id: id });
    if (error) toast({ title: "Não foi possível excluir a pasta", description: error.message, variant: "destructive" });
    else void carregar();
  };

  const excluirArquivo = async (id: string) => {
    if (!isAdmin) return;
    if (!(await confirm({ title: "Excluir arquivo", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" }))) return;
    const { error } = await db.rpc("gd_arquivo_excluir", { _caller: user, _id: id });
    if (error) toast({ title: "Não foi possível excluir o arquivo", description: error.message, variant: "destructive" });
    else void carregar();
  };

  const sugerirNomeComIa = async (arquivo: Arquivo) => {
    setArquivoRenomeandoIa(arquivo);
    setNomeSugerido(arquivo.nome_original);
    setGerandoNome(true);
    const extensao = arquivo.nome_original.includes(".") ? arquivo.nome_original.slice(arquivo.nome_original.lastIndexOf(".")) : "";
    const contexto = await extrairContextoParaNome(arquivo);
    const { data, error } = await db.rpc("ia_chat", {
      _caller: user,
      _messages: [
        {
          role: "system",
          content: "Você organiza arquivos administrativos. Sugira um nome curto, claro e profissional para o arquivo com base no conteúdo fornecido. Não invente informações. Preserve obrigatoriamente a extensão original. Retorne somente o nome do arquivo, sem explicação, aspas ou Markdown.",
        },
        {
          role: "user",
          content: `Nome atual: ${arquivo.nome_original}\nTipo: ${arquivo.mime || "não informado"}\nExtensão obrigatória: ${extensao || "sem extensão"}${contexto ? `\nConteúdo extraído do arquivo:\n${contexto}` : "\nNão foi possível extrair o conteúdo; use apenas os metadados disponíveis."}`,
        },
      ],
      _temperatura: 0.2,
      _max_tokens: 80,
      _cache: false,
    });
    setGerandoNome(false);
    if (error) {
      toast({ title: "Não foi possível gerar um nome", description: error.message, variant: "destructive" });
      return;
    }
    const sugestao = String((data as { text?: string } | null)?.text || "").trim().split(/\r?\n/)[0].replace(/^["'`]+|["'`]+$/g, "").replace(/[\\/]/g, "_");
    if (sugestao) setNomeSugerido(sugestao);
  };

  const salvarRenomeacaoIa = async () => {
    if (!arquivoRenomeandoIa || !nomeSugerido.trim()) return;
    setSalvandoNome(true);
    const { error } = await db.rpc("gd_arquivo_renomear", { _caller: user, _id: arquivoRenomeandoIa.id, _nome: nomeSugerido.trim() });
    setSalvandoNome(false);
    if (error) {
      toast({ title: "Não foi possível renomear o arquivo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Arquivo renomeado com sucesso" });
    setArquivoRenomeandoIa(null);
    void carregar();
  };

  const abrirRenomeacaoManual = (arquivo: Arquivo) => {
    setArquivoRenomeandoManual(arquivo);
    setNovoNomeManual(arquivo.nome_original);
  };

  const salvarRenomeacaoManual = async () => {
    if (!arquivoRenomeandoManual || !novoNomeManual.trim()) return;
    setSalvandoNome(true);
    const { error } = await db.rpc("gd_arquivo_renomear", { _caller: user, _id: arquivoRenomeandoManual.id, _nome: novoNomeManual.trim() });
    setSalvandoNome(false);
    if (error) {
      toast({ title: "Não foi possível renomear o arquivo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Arquivo renomeado com sucesso" });
    setArquivoRenomeandoManual(null);
    setNovoNomeManual("");
    void carregar();
  };

  const copiarLinkArquivo = async (arquivo: Arquivo) => {
    const url = `${window.location.origin}${urlArquivo(arquivo.caminho)}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopiadoId(arquivo.id);
      toast({ title: "Link copiado", description: "O link de acesso ao arquivo foi copiado para a área de transferência." });
      setTimeout(() => setCopiadoId((atual) => (atual === arquivo.id ? null : atual)), 2000);
    } catch {
      toast({ title: "Não foi possível copiar o link", variant: "destructive" });
    }
  };

  const termoBusca = busca.trim().toLowerCase();

  const pastasFiltradas = useMemo(() => {
    let resultado = conteudo.pastas;
    if (termoBusca) {
      resultado = resultado.filter((p) => p.nome.toLowerCase().includes(termoBusca) || p.criado_por.toLowerCase().includes(termoBusca));
    }
    return [...resultado].sort((a, b) => {
      if (ordenacao === "nome_desc") return b.nome.localeCompare(a.nome, "pt-BR");
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [conteudo.pastas, termoBusca, ordenacao]);

  const arquivosFiltrados = useMemo(() => {
    let resultado = conteudo.arquivos;
    if (termoBusca) {
      resultado = resultado.filter(
        (a) =>
          a.nome_original.toLowerCase().includes(termoBusca) ||
          a.criado_por.toLowerCase().includes(termoBusca) ||
          (a.mime && a.mime.toLowerCase().includes(termoBusca))
      );
    }
    return [...resultado].sort((a, b) => {
      if (ordenacao === "nome_asc") return a.nome_original.localeCompare(b.nome_original, "pt-BR");
      if (ordenacao === "nome_desc") return b.nome_original.localeCompare(a.nome_original, "pt-BR");
      if (ordenacao === "tamanho_desc") return (b.tamanho || 0) - (a.tamanho || 0);
      if (ordenacao === "tamanho_asc") return (a.tamanho || 0) - (b.tamanho || 0);
      if (ordenacao === "data_asc") return String(a.criado_em || "").localeCompare(String(b.criado_em || ""));
      return String(b.criado_em || "").localeCompare(String(a.criado_em || ""));
    });
  }, [conteudo.arquivos, termoBusca, ordenacao]);

  const temFiltroAtivo = Boolean(termoBusca);
  const temItensGerais = conteudo.pastas.length > 0 || conteudo.arquivos.length > 0;
  const temItensFiltrados = pastasFiltradas.length > 0 || arquivosFiltrados.length > 0;

  const totalBytesAtual = useMemo(() => {
    return conteudo.arquivos.reduce((acc, curr) => acc + (curr.tamanho || 0), 0);
  }, [conteudo.arquivos]);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={Folder} title="Arquivos" subtitle="Organize pastas e compartilhe documentos com a equipe" />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Arquivos nesta pasta</p>
              <p className="text-lg font-bold text-foreground">{conteudo.arquivos.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Folder className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Pastas nesta pasta</p>
              <p className="text-lg font-bold text-foreground">{conteudo.pastas.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Espaço nesta pasta</p>
              <p className="text-lg font-bold text-foreground">{tamanho(totalBytesAtual)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-muted-foreground">
            <button
              type="button"
              className={`rounded px-1.5 py-0.5 transition-colors hover:text-primary ${caminho.length === 0 ? "font-bold text-foreground" : ""}`}
              onClick={() => navegar(-1)}
            >
              Arquivos
            </button>
            {caminho.map((item, indice) => (
              <span key={item.id} className="flex items-center">
                <span className="mx-1 text-muted-foreground/60">/</span>
                <button
                  type="button"
                  className={`rounded px-1.5 py-0.5 transition-colors hover:text-primary ${indice === caminho.length - 1 ? "font-bold text-foreground" : ""}`}
                  onClick={() => navegar(indice)}
                >
                  {item.nome}
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={inputRef} className="hidden" type="file" multiple onChange={(event) => void enviarArquivos(event.target.files)} />
            <Button variant="outline" size="sm" onClick={() => setNovaPasta(true)}>
              <FolderPlus className="mr-1.5 h-4 w-4" />
              Nova pasta
            </Button>
            <Button size="sm" disabled={enviando} onClick={() => inputRef.current?.click()}>
              {enviando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              Enviar arquivos
            </Button>
          </div>
        </div>

        {temItensGerais && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar arquivos ou pastas por nome, tipo ou autor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 pr-8"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  aria-label="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ordenar:</span>
              </div>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as TipoOrdenacao)}
                className="h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Ordenar arquivos"
              >
                <option value="data_desc">Mais recentes</option>
                <option value="data_asc">Mais antigos</option>
                <option value="nome_asc">Nome (A - Z)</option>
                <option value="nome_desc">Nome (Z - A)</option>
                <option value="tamanho_desc">Maior tamanho</option>
                <option value="tamanho_asc">Menor tamanho</option>
              </select>

              <div className="flex items-center rounded-md border border-input p-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant={modoVisualizacao === "lista" ? "secondary" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setModoVisualizacao("lista")}
                  aria-label="Visualização em lista"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant={modoVisualizacao === "grade" ? "secondary" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setModoVisualizacao("grade")}
                  aria-label="Visualização em grade"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>

              {temFiltroAtivo && (
                <Button variant="ghost" size="sm" onClick={() => setBusca("")} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        )}

        <Card className="shadow-sm">
          <CardContent
            className={`p-3 transition-colors sm:p-5 ${pastaAlvoUpload === "__pasta_atual__" ? "bg-primary/5 ring-2 ring-inset ring-primary/30" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setPastaAlvoUpload("__pasta_atual__");
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) setPastaAlvoUpload(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setPastaAlvoUpload(null);
              void enviarArquivos(event.dataTransfer.files);
            }}
          >
            {carregando ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : temItensFiltrados ? (
              <div className="space-y-6">
                {pastasFiltradas.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pastas ({pastasFiltradas.length})</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {pastasFiltradas.map((pasta) => (
                        <div
                          key={pasta.id}
                          className={`group flex min-w-0 items-start justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 ${
                            pastaAlvoUpload === pasta.id ? "border-primary bg-primary/10 ring-2 ring-primary/20" : ""
                          }`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            event.dataTransfer.dropEffect = "copy";
                            setPastaAlvoUpload(pasta.id);
                          }}
                          onDragLeave={(event) => {
                            event.stopPropagation();
                            if (!event.currentTarget.contains(event.relatedTarget as Node)) setPastaAlvoUpload(null);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setPastaAlvoUpload(null);
                            void enviarArquivos(event.dataTransfer.files, pasta.id);
                          }}
                        >
                          <button type="button" className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => abrirPasta(pasta)}>
                            <Folder className="mt-0.5 h-6 w-6 shrink-0 text-amber-500" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">{pasta.nome}</span>
                              <span className="mt-1 block truncate text-xs text-muted-foreground">Criada por {pasta.criado_por}</span>
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {(isAdmin || pasta.criado_por === user) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label={`Renomear pasta ${pasta.nome}`}
                                onClick={() => {
                                  setPastaRenomeando(pasta);
                                  setNovoNomePasta(pasta.nome);
                                }}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                aria-label={`Excluir pasta ${pasta.nome}`}
                                onClick={() => void excluirPasta(pasta.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {arquivosFiltrados.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Arquivos ({arquivosFiltrados.length})</h2>
                    {modoVisualizacao === "lista" ? (
                      <div className="divide-y divide-border rounded-lg border border-border bg-card">
                        {arquivosFiltrados.map((arquivo) => (
                          <div key={arquivo.id} className="group flex flex-wrap items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-muted/30">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <a
                                className="flex min-w-0 flex-1 items-center gap-3 text-foreground hover:text-primary transition-colors"
                                href={urlArquivo(arquivo.caminho)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {arquivo.preview_caminho ? (
                                  <img
                                    className="h-10 w-10 shrink-0 rounded border object-cover"
                                    src={urlArquivo(arquivo.preview_caminho)}
                                    alt={`Prévia de ${arquivo.nome_original}`}
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border bg-primary/5 text-primary">
                                    <File className="h-5 w-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate font-medium text-sm">{arquivo.nome_original}</span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {tamanho(arquivo.tamanho)} · {arquivo.criado_por}
                                    {arquivo.criado_em ? ` · ${formatarData(arquivo.criado_em)}` : ""}
                                  </span>
                                </div>
                              </a>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={`Copiar link de ${arquivo.nome_original}`}
                                onClick={() => void copiarLinkArquivo(arquivo)}
                              >
                                {copiadoId === arquivo.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={`Visualizar ${arquivo.nome_original}`}
                                onClick={() => setArquivoVisualizando(arquivo)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                asChild
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                aria-label={`Baixar ${arquivo.nome_original}`}
                              >
                                <a href={urlArquivo(arquivo.caminho)} download={arquivo.nome_original}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              {(isAdmin || arquivo.criado_por === user) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  aria-label={`Renomear ${arquivo.nome_original}`}
                                  onClick={() => abrirRenomeacaoManual(arquivo)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {(isAdmin || arquivo.criado_por === user) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                  aria-label={`Sugerir nome com IA para ${arquivo.nome_original}`}
                                  onClick={() => void sugerirNomeComIa(arquivo)}
                                >
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  aria-label={`Excluir arquivo ${arquivo.nome_original}`}
                                  onClick={() => void excluirArquivo(arquivo.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {arquivosFiltrados.map((arquivo) => (
                          <div
                            key={arquivo.id}
                            className="group flex flex-col justify-between rounded-lg border border-border bg-card p-3 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/30"
                          >
                            <div className="flex items-start gap-3">
                              {arquivo.preview_caminho ? (
                                <img
                                  className="h-12 w-12 shrink-0 rounded border object-cover"
                                  src={urlArquivo(arquivo.preview_caminho)}
                                  alt={`Prévia de ${arquivo.nome_original}`}
                                />
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border bg-primary/5 text-primary">
                                  <File className="h-6 w-6" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground" title={arquivo.nome_original}>
                                  {arquivo.nome_original}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">{tamanho(arquivo.tamanho)}</p>
                                <p className="truncate text-[11px] text-muted-foreground">Por {arquivo.criado_por}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label={`Copiar link de ${arquivo.nome_original}`}
                                onClick={() => void copiarLinkArquivo(arquivo)}
                              >
                                {copiadoId === arquivo.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label={`Visualizar ${arquivo.nome_original}`}
                                onClick={() => setArquivoVisualizando(arquivo)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                asChild
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label={`Baixar ${arquivo.nome_original}`}
                              >
                                <a href={urlArquivo(arquivo.caminho)} download={arquivo.nome_original}>
                                  <Download className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              {(isAdmin || arquivo.criado_por === user) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  aria-label={`Renomear ${arquivo.nome_original}`}
                                  onClick={() => abrirRenomeacaoManual(arquivo)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(isAdmin || arquivo.criado_por === user) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                  aria-label={`Sugerir nome com IA para ${arquivo.nome_original}`}
                                  onClick={() => void sugerirNomeComIa(arquivo)}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  aria-label={`Excluir arquivo ${arquivo.nome_original}`}
                                  onClick={() => void excluirArquivo(arquivo.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : temFiltroAtivo ? (
              <EmptyState
                icon={Search}
                title="Nenhum item encontrado"
                description={`Não encontramos nenhum arquivo ou pasta correspondente à busca "${busca}".`}
                actionLabel="Limpar busca"
                onAction={() => setBusca("")}
              />
            ) : (
              <EmptyState
                icon={Paperclip}
                title="Esta pasta está vazia"
                description="Crie uma nova pasta ou envie arquivos em PDF, Word, imagens e planilhas para organizar."
                actionLabel="Enviar arquivos"
                onAction={() => inputRef.current?.click()}
              />
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={novaPasta} onOpenChange={setNovaPasta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={nomePasta}
            onChange={(event) => setNomePasta(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void criarPasta();
            }}
            placeholder="Nome da pasta"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaPasta(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void criarPasta()}>Criar pasta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pastaRenomeando)}
        onOpenChange={(open) => {
          if (!open && !salvandoNomePasta) setPastaRenomeando(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
            <DialogDescription>Digite o novo nome para esta pasta.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={novoNomePasta}
            disabled={salvandoNomePasta}
            onChange={(event) => setNovoNomePasta(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void renomearPasta();
            }}
            placeholder="Novo nome da pasta"
          />
          <DialogFooter>
            <Button variant="outline" disabled={salvandoNomePasta} onClick={() => setPastaRenomeando(null)}>
              Cancelar
            </Button>
            <Button disabled={salvandoNomePasta || !novoNomePasta.trim()} onClick={() => void renomearPasta()}>
              {salvandoNomePasta && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(arquivoRenomeandoManual)}
        onOpenChange={(open) => {
          if (!open && !salvandoNome) setArquivoRenomeandoManual(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear arquivo</DialogTitle>
            <DialogDescription>Digite o novo nome para o arquivo.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={novoNomeManual}
            disabled={salvandoNome}
            onChange={(event) => setNovoNomeManual(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void salvarRenomeacaoManual();
            }}
            placeholder="Nome do arquivo"
          />
          <DialogFooter>
            <Button variant="outline" disabled={salvandoNome} onClick={() => setArquivoRenomeandoManual(null)}>
              Cancelar
            </Button>
            <Button disabled={salvandoNome || !novoNomeManual.trim()} onClick={() => void salvarRenomeacaoManual()}>
              {salvandoNome && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(arquivoRenomeandoIa)}
        onOpenChange={(open) => {
          if (!open && !salvandoNome) setArquivoRenomeandoIa(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear arquivo com IA</DialogTitle>
            <DialogDescription>Revise a sugestão da inteligência artificial antes de salvar.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={nomeSugerido}
            disabled={gerandoNome || salvandoNome}
            onChange={(event) => setNomeSugerido(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void salvarRenomeacaoIa();
            }}
          />
          {gerandoNome && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando conteúdo e gerando sugestão...
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={salvandoNome} onClick={() => setArquivoRenomeandoIa(null)}>
              Cancelar
            </Button>
            <Button disabled={gerandoNome || salvandoNome || !nomeSugerido.trim()} onClick={() => void salvarRenomeacaoIa()}>
              {salvandoNome && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(arquivoVisualizando)}
        onOpenChange={(open) => {
          if (!open) setArquivoVisualizando(null);
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{arquivoVisualizando?.nome_original}</DialogTitle>
            <DialogDescription>Prévia do arquivo sem sair do sistema.</DialogDescription>
          </DialogHeader>
          {arquivoVisualizando && (
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              {arquivoVisualizando.preview_caminho || arquivoVisualizando.mime?.startsWith("image/") ? (
                <img
                  className="mx-auto max-h-[65vh] max-w-full object-contain"
                  src={urlArquivo(arquivoVisualizando.preview_caminho || arquivoVisualizando.caminho)}
                  alt={`Prévia de ${arquivoVisualizando.nome_original}`}
                />
              ) : arquivoVisualizando.mime === "application/pdf" || arquivoVisualizando.nome_original.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  className="h-[65vh] w-full bg-white"
                  src={urlArquivo(arquivoVisualizando.caminho)}
                  title={`Prévia de ${arquivoVisualizando.nome_original}`}
                />
              ) : (
                <div className="p-10 text-center text-sm text-muted-foreground">Não há prévia disponível para este tipo de arquivo.</div>
              )}
            </div>
          )}
          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            {arquivoVisualizando && (
              <>
                <Button variant="outline" size="sm" onClick={() => void copiarLinkArquivo(arquivoVisualizando)}>
                  {copiadoId === arquivoVisualizando.id ? <Check className="mr-1.5 h-4 w-4 text-emerald-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  Copiar link
                </Button>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={urlArquivo(arquivoVisualizando.caminho)} download={arquivoVisualizando.nome_original}>
                      <Download className="mr-1.5 h-4 w-4" />
                      Baixar
                    </a>
                  </Button>
                  <Button asChild size="sm">
                    <a href={urlArquivo(arquivoVisualizando.caminho)} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Abrir original
                    </a>
                  </Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmElement}
    </div>
  );
}
