import { useCallback, useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Pencil, Trash2, Megaphone, MessageSquare, Loader2, Send,
} from "lucide-react";

type Recado = {
  id: string;
  titulo: string;
  conteudo: string;
  autor: string;
  destinatario: string;
  prioridade: string;
  categoria: string;
  status: string;
  cor: string;
  criado_em: string;
  atualizado_em: string;
  comentarios: number;
};

type Comentario = {
  id: string;
  recado_id: string;
  autor: string;
  texto: string;
  criado_em: string;
};

const STATUS_OPCOES = [
  { value: "a_fazer", label: "A fazer" },
  { value: "andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
];

const PRIORIDADE_OPCOES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

const CATEGORIA_OPCOES = [
  { value: "tarefa", label: "Tarefa" },
  { value: "comunicado", label: "Comunicado" },
  { value: "aviso", label: "Aviso" },
  { value: "lembrete", label: "Lembrete" },
  { value: "outro", label: "Outro" },
];

const COR_OPCOES = [
  { value: "yellow", label: "Amarelo" },
  { value: "green", label: "Verde" },
  { value: "blue", label: "Azul" },
  { value: "red", label: "Vermelho" },
  { value: "purple", label: "Roxo" },
];

const corBorda: Record<string, string> = {
  yellow: "border-l-yellow-400",
  green: "border-l-green-500",
  blue: "border-l-blue-500",
  red: "border-l-red-500",
  purple: "border-l-purple-500",
};

const corBadge: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700/50",
  green: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/50",
  blue: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700/50",
  red: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700/50",
  purple: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700/50",
};

const prioridadeBadge = (p: string) => {
  if (p === "alta") return <Badge variant="destructive">Alta</Badge>;
  if (p === "media") return <Badge className="bg-amber-500">Média</Badge>;
  return <Badge variant="outline">Baixa</Badge>;
};

const statusLabel = (s: string) => {
  const found = STATUS_OPCOES.find(o => o.value === s);
  return found ? found.label : s;
};

const formatData = (s: string) => {
  if (!s) return "—";
  const d = new Date(s + (s.includes("T") ? "" : "T00:00:00"));
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function Mural() {
  const { confirm, confirmElement } = useConfirm();
  const { user, isAdmin } = useAuth();
  const [recados, setRecados] = useState<Recado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>("all");
  const [openForm, setOpenForm] = useState(false);
  const [openDetalhes, setOpenDetalhes] = useState(false);
  const [selectedRecado, setSelectedRecado] = useState<Recado | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState("");
  const [editingRecado, setEditingRecado] = useState<Recado | null>(null);
  const [formTitulo, setFormTitulo] = useState("");
  const [formConteudo, setFormConteudo] = useState("");
  const [formDestinatario, setFormDestinatario] = useState("Todos");
  const [formPrioridade, setFormPrioridade] = useState("media");
  const [formCategoria, setFormCategoria] = useState("tarefa");
  const [formCor, setFormCor] = useState("yellow");

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.rpc("mural_listar", { _caller: user }) as unknown as { data: Recado[] | null; error: { message: string } | null };
    if (!error && data) {
      let lista = data;
      if (filtroStatus !== "todos") lista = lista.filter(r => r.status === filtroStatus);
      if (filtroPrioridade !== "all") lista = lista.filter(r => r.prioridade === filtroPrioridade);
      setRecados(lista);
    }
    setLoading(false);
  }, [filtroStatus, filtroPrioridade, user]);

  useEffect(() => { carregar(); }, [carregar]);

  const carregarComentarios = async (recadoId: string) => {
    const { data } = await db.rpc("mural_comentarios_listar", { _caller: user, _recado_id: recadoId }) as unknown as { data: Comentario[] | null };
    setComentarios(data ?? []);
  };

  const abrirDetalhes = (r: Recado) => {
    setSelectedRecado(r);
    setOpenDetalhes(true);
    carregarComentarios(r.id);
  };

  const abrirNovo = () => {
    setEditingRecado(null);
    setFormTitulo("");
    setFormConteudo("");
    setFormDestinatario("Todos");
    setFormPrioridade("media");
    setFormCategoria("tarefa");
    setFormCor("yellow");
    setOpenForm(true);
  };

  const abrirEditar = (r: Recado) => {
    setEditingRecado(r);
    setFormTitulo(r.titulo);
    setFormConteudo(r.conteudo);
    setFormDestinatario(r.destinatario);
    setFormPrioridade(r.prioridade);
    setFormCategoria(r.categoria);
    setFormCor(r.cor);
    setOpenDetalhes(false);
    setOpenForm(true);
  };

  const salvar = async () => {
    if (!formTitulo.trim() || !formConteudo.trim()) {
      toast({ title: "Título e conteúdo obrigatórios", variant: "destructive" });
      return;
    }
    if (editingRecado) {
      const { error } = await db.rpc("mural_atualizar", {
        _caller: user, _id: editingRecado.id, _titulo: formTitulo.trim(), _conteudo: formConteudo.trim(),
        _prioridade: formPrioridade, _cor: formCor,
      }) as unknown as { error: { message: string } | null };
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Recado atualizado" });
    } else {
      const { error } = await db.rpc("mural_criar", {
        _caller: user, _titulo: formTitulo.trim(), _conteudo: formConteudo.trim(),
        _destinatario: formDestinatario, _prioridade: formPrioridade,
        _categoria: formCategoria, _status: "a_fazer", _cor: formCor,
        _autor: user,
      }) as unknown as { error: { message: string } | null };
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Recado criado" });
    }
    setOpenForm(false);
    carregar();
  };

  const alterarStatus = async (id: string, status: string) => {
    const { error } = await db.rpc("mural_atualizar", { _caller: user, _id: id, _status: status }) as unknown as { error: { message: string } | null };
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    carregar();
    if (selectedRecado?.id === id) setSelectedRecado(prev => prev ? { ...prev, status } : null);
  };

  const excluir = async (id: string) => {
    if (!(await confirm({ title: "Excluir recado", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" }))) return;
    const { error } = await db.rpc("mural_excluir", { _caller: user, _id: id }) as unknown as { error: { message: string } | null };
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Recado excluído" });
    setOpenDetalhes(false);
    carregar();
  };

  const enviarComentario = async () => {
    if (!novoComentario.trim() || !selectedRecado) return;
    const { error } = await db.rpc("mural_comentario_criar", {
      _caller: user, _recado_id: selectedRecado.id, _texto: novoComentario.trim(), _autor: user,
    }) as unknown as { error: { message: string } | null };
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNovoComentario("");
    carregarComentarios(selectedRecado.id);
    carregar();
  };

  const excluirComentario = async (id: string) => {
    if (!(await confirm({ title: "Excluir comentário", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" }))) return;
    await db.rpc("mural_comentario_excluir", { _caller: user, _id: id });
    if (selectedRecado) carregarComentarios(selectedRecado.id);
  };

  const podeEditar = (recado: Recado) => isAdmin || recado.autor === user;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader icon={Megaphone} title="Mural de recados" subtitle="Recados, comunicados e avisos da prefeitura" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold mr-1">Status:</span>
                {["todos", "a_fazer", "andamento", "concluido"].map(s => (
                  <Button key={s} variant={filtroStatus === s ? "default" : "outline"} size="sm" onClick={() => setFiltroStatus(s)}>
                    {s === "todos" ? "Todos" : statusLabel(s)}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {PRIORIDADE_OPCOES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={abrirNovo}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Recado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : recados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum recado encontrado</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recados.map((r) => (
              <Card
                key={r.id}
                className={`border-l-4 ${corBorda[r.cor] || "border-l-yellow-400"} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => abrirDetalhes(r)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm leading-tight truncate flex-1">{r.titulo}</h3>
                    {prioridadeBadge(r.prioridade)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{r.conteudo}</p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium">{r.autor}</span>
                      <span>•</span>
                      <span>{r.destinatario}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{statusLabel(r.status)}</Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {r.comentarios}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecado ? "Editar Recado" : "Novo Recado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea value={formConteudo} onChange={(e) => setFormConteudo(e.target.value)} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destinatário</Label>
                <Input value={formDestinatario} onChange={(e) => setFormDestinatario(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={formPrioridade} onValueChange={setFormPrioridade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPCOES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formCategoria} onValueChange={setFormCategoria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_OPCOES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <Select value={formCor} onValueChange={setFormCor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COR_OPCOES.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editingRecado ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDetalhes} onOpenChange={setOpenDetalhes}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedRecado && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-lg">{selectedRecado.titulo}</DialogTitle>
                  {prioridadeBadge(selectedRecado.prioridade)}
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedRecado.autor}</span>
                  <span>→</span>
                  <span>{selectedRecado.destinatario}</span>
                  <span>•</span>
                  <span>{formatData(selectedRecado.criado_em)}</span>
                  <Badge variant="outline" className="text-[10px]">{selectedRecado.categoria}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  {STATUS_OPCOES.map(s => (
                    <Button
                      key={s.value}
                      variant={selectedRecado.status === s.value ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => alterarStatus(selectedRecado.id, s.value)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>

                <p className="text-sm whitespace-pre-wrap">{selectedRecado.conteudo}</p>

                {podeEditar(selectedRecado) && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => abrirEditar(selectedRecado)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => excluir(selectedRecado.id)}>
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" /> Comentários ({comentarios.length})
                  </h4>
                  <div className="space-y-3 mb-4">
                    {comentarios.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
                    ) : (
                      comentarios.map(c => (
                        <div key={c.id} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold">{c.autor}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">{formatData(c.criado_em)}</span>
                              {(isAdmin || c.autor === user) && (
                                <button className="text-destructive text-[10px] hover:underline" onClick={() => excluirComentario(c.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs mt-1">{c.texto}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escreva um comentário..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") enviarComentario(); }}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={enviarComentario} disabled={!novoComentario.trim()}>
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {confirmElement}
    </div>
  );
}
