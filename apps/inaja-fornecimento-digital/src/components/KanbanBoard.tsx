import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Trash2, Pencil, Calendar as CalendarIcon, User, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AttachmentUploader, type Anexo } from "@/components/AttachmentUploader";
import { useAuth } from "@/contexts/AuthContext";

type Status = "todo" | "doing" | "done";
type Prioridade = "baixa" | "media" | "alta";

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  anexos: Anexo[];
  responsavel: string | null;
  prioridade: Prioridade;
  status: Status;
  ordem: number;
  prazo: string | null;
  created_at: string;
  updated_at: string;
}

const RESPONSAVEIS = ["ALEKSANDRO", "LUANA", "MAICON", "TODOS"] as const;

const COLUNAS: { id: Status; titulo: string; accent: string }[] = [
  { id: "todo", titulo: "A Fazer", accent: "border-t-muted-foreground/40" },
  { id: "doing", titulo: "Em Andamento", accent: "border-t-primary" },
  { id: "done", titulo: "Concluído", accent: "border-t-emerald-600" },
];

const PRIO_STYLES: Record<Prioridade, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  alta: "bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200",
};
const ORDEM_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

const emptyForm = (status: Status = "todo") => ({
  titulo: "", descricao: "", anexos: [] as Anexo[], responsavel: "", prioridade: "media" as Prioridade,
  status, prazo: "",
});

export function KanbanBoard() {
  const { confirm, confirmElement } = useConfirm();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tarefaRef = searchParams.get("tarefa");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [dragId, setDragId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fetchAll = async () => {
    const { data, error } = await db
      .from<Tarefa>("tarefas")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar tarefas", description: error.message, variant: "destructive" });
    } else {
      setTarefas(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const channel = db
      .channel("tarefas-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tarefas" }, () => fetchAll())
      .subscribe();
    return () => db.removeChannel(channel);
  }, []);

  useEffect(() => {
    if (!tarefaRef || !tarefas.some((tarefa) => tarefa.id === tarefaRef)) return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(`tarefa-${tarefaRef}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tarefaRef, tarefas]);

  const ehMinha = (t: Tarefa) =>
    t.status !== "done" && !!user && (t.responsavel ?? "").trim().toLowerCase() === user.trim().toLowerCase();

  const openNew = (status: Status) => {
    setEditing(null);
    setForm(emptyForm(status));
    setDialogOpen(true);
  };

  const openEdit = (t: Tarefa) => {
    setEditing(t);
    setForm({
      titulo: t.titulo, descricao: t.descricao ?? "", responsavel: t.responsavel ?? "",
      anexos: t.anexos ?? [], prioridade: t.prioridade, status: t.status, prazo: t.prazo ?? "",
    });
    setDialogOpen(true);
  };

  const fecharDialog = async () => {
    const originais = new Set((editing?.anexos || []).map((anexo) => anexo.path));
    const pendentes = form.anexos.filter((anexo) => !originais.has(anexo.path)).map((anexo) => anexo.path);
    if (pendentes.length) {
      const { error } = await db.storage.from("solicitacao-anexos").remove(pendentes);
      if (error) toast({ title: "Falha ao limpar anexos", description: error.message, variant: "destructive" });
    }
    setDialogOpen(false);
  };

  const salvar = async () => {
    if (salvando) return;
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSalvando(true);
    const payload = {
      titulo: form.titulo.trim(), descricao: form.descricao.trim() || null,
      anexos: form.anexos,
      responsavel: form.responsavel.trim() || null, prioridade: form.prioridade,
      status: form.status, prazo: form.prazo || null,
    };
    if (editing) {
      const { error } = await db.from("tarefas").update(payload).eq("id", editing.id);
      if (error) {
        setSalvando(false);
        return toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
      toast({ title: "Tarefa atualizada" });
    } else {
      const maxOrdem = Math.max(0, ...tarefas.filter(t => t.status === form.status).map(t => t.ordem));
      const { error } = await db.from("tarefas").insert({ ...payload, ordem: maxOrdem + 1 });
      if (error) {
        setSalvando(false);
        return toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
      toast({ title: "Tarefa criada" });
    }
    setSalvando(false);
    setDialogOpen(false);
    await fetchAll();
  };

  const excluir = async (id: string) => {
    if (!(await confirm({ title: "Excluir tarefa", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" }))) return;
    const { error } = await db.from("tarefas").delete().eq("id", id);
    if (error) return toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    toast({ title: "Tarefa excluída" });
    await fetchAll();
  };

  const onDrop = async (status: Status) => {
    if (!dragId) return;
    const t = tarefas.find(x => x.id === dragId);
    setDragId(null);
    if (!t || t.status === status) return;
    const statusAnterior = t.status;
    setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
    const { error } = await db.from("tarefas").update({ status }).eq("id", t.id);
    if (error) {
      setTarefas(prev => prev.map(x => x.id === t.id ? { ...x, status: statusAnterior } : x));
      toast({ title: "Erro ao mover tarefa", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">Organize as demandas da prefeitura em um quadro Kanban.</p>
        <div className="flex gap-2">
          <Button onClick={() => openNew("todo")}>
            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUNAS.map(col => {
          const itens = tarefas.filter(t => t.status === col.id).sort((a, b) => {
            if (col.id !== "todo") return 0;
            return Number(ehMinha(b)) - Number(ehMinha(a)) || ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || a.ordem - b.ordem;
          });
          return (
            <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(col.id)}
              className={`rounded-xl bg-muted/30 border-t-4 ${col.accent} p-3 min-h-[400px]`}>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{col.titulo}</h3>
                  <Badge variant="secondary">{itens.length}</Badge>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Nova tarefa em ${col.titulo}`} onClick={() => openNew(col.id)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {loading && <p className="text-sm text-muted-foreground px-1">Carregando…</p>}
                {!loading && itens.length === 0 && <p className="text-xs text-muted-foreground px-1 italic">Sem tarefas</p>}
                {itens.map(t => {
                  const prioridadeAlta = t.prioridade === "alta" && t.status !== "done";
                  const minha = ehMinha(t);
                  return <Card key={t.id} id={`tarefa-${t.id}`} draggable onDragStart={() => setDragId(t.id)}
                    className={`relative overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${prioridadeAlta ? "border-red-500/50 bg-red-500/[0.035] shadow-md shadow-red-500/10 ring-1 ring-red-500/15" : minha ? "border-primary/60 bg-primary/[0.06] shadow-md shadow-primary/10 ring-1 ring-primary/30" : ""} ${tarefaRef === t.id ? "ring-2 ring-primary ring-offset-2" : ""}`}>
                    {prioridadeAlta && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" aria-hidden />}
                    {!prioridadeAlta && minha && <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />}
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">{minha && <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary"><User className="h-3 w-3" />Sua tarefa</p>}<h4 className="font-medium text-sm leading-snug">{t.titulo}</h4>{prioridadeAlta && <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400"><AlertTriangle className="h-3 w-3" />Prioridade alta</p>}</div>
                        <Badge className={`${PRIO_STYLES[t.prioridade]} shrink-0 text-[10px] uppercase`}>{t.prioridade}</Badge>
                      </div>
                      {t.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.descricao}</p>
                      )}
                      {t.anexos?.length > 0 && (
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {t.anexos.map((anexo) => (
                            <a key={anexo.path} href={anexo.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-full">
                              {anexo.name}
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                        {t.responsavel && <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.responsavel}</span>}
                        {t.prazo && <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{format(new Date(t.prazo + "T00:00:00"), "dd/MM/yyyy")}</span>}
                      </div>
                      <div className="flex justify-end gap-1 pt-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Editar ${t.titulo}`} onClick={() => openEdit(t)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Excluir ${t.titulo}`} onClick={() => void excluir(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); else void fecharDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
            <DialogDescription>Campos do quadro de demandas da prefeitura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label htmlFor="tarefa-titulo">Título</Label><Input id="tarefa-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label htmlFor="tarefa-descricao">Descrição</Label><Textarea id="tarefa-descricao" rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label>Anexos</Label><AttachmentUploader scope="tarefas" value={form.anexos} onChange={(anexos) => setForm({ ...form, anexos })} preservePaths={(editing?.anexos || []).map((anexo) => anexo.path)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="tarefa-responsavel">Responsável</Label><Select value={form.responsavel || undefined} onValueChange={(v) => setForm({ ...form, responsavel: v })}>
                <SelectTrigger id="tarefa-responsavel"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{RESPONSAVEIS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select></div>
              <div><Label htmlFor="tarefa-prazo">Prazo</Label><Input id="tarefa-prazo" type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></div>
              <div><Label htmlFor="tarefa-prioridade">Prioridade</Label><Select value={form.prioridade} onValueChange={(v: Prioridade) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger id="tarefa-prioridade"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent>
              </Select></div>
              <div><Label htmlFor="tarefa-status">Status</Label><Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
                <SelectTrigger id="tarefa-status"><SelectValue /></SelectTrigger>
                <SelectContent>{COLUNAS.map(c => <SelectItem key={c.id} value={c.id}>{c.titulo}</SelectItem>)}</SelectContent>
              </Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => void fecharDialog()}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={salvando}>{salvando ? "Salvando..." : (editing ? "Salvar" : "Criar")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmElement}

    </div>
  );
}
