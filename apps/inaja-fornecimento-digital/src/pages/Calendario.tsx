import { useCallback, useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { ptBR } from "date-fns/locale";
import {
  Plus, Pencil, Trash2, CalendarDays, DollarSign, Briefcase, Sun, FileText, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";

type Evento = {
  id: string;
  data: string;
  tipo: "PAYMENT" | "COMMITMENT" | "HOLIDAY" | "NOTE";
  texto: string;
  descricao: string;
  criado_em: string;
};

type CalendarioData = {
  eventos: Evento[];
  overrides: string[];
  regras: { chave: string; valor: string }[];
};

const TIPO_CONFIG: Record<string, { label: string; color: string; hex: string; icon: typeof DollarSign }> = {
  PAYMENT:    { label: "Pagamento",  color: "bg-emerald-500", hex: "#10b981", icon: DollarSign },
  COMMITMENT: { label: "Compromisso", color: "bg-blue-500", hex: "#3b82f6", icon: Briefcase },
  HOLIDAY:    { label: "Feriado",    color: "bg-red-500", hex: "#ef4444", icon: Sun },
  NOTE:       { label: "Nota",       color: "bg-amber-500", hex: "#f59e0b", icon: FileText },
};

const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function Calendario() {
  const { confirm, confirmElement } = useConfirm();
  const { user } = useAuth();
  const [data, setData] = useState<CalendarioData | null>(null);
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [eventosDoDia, setEventosDoDia] = useState<Evento[]>([]);
  const [openDia, setOpenDia] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Evento | null>(null);
  const [formData, setFormData] = useState("");
  const [formTipo, setFormTipo] = useState<"PAYMENT">();
  const [formTexto, setFormTexto] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: d, error } = await db.rpc("calendario_listar", { _caller: user, _mes: mes }) as unknown as { data: CalendarioData | null; error: { message: string } | null };
    if (error || !d) {
      setErro(error?.message || "Não foi possível carregar o calendário.");
    } else {
      setErro(null);
      setData(d);
    }
    setLoading(false);
  }, [mes, user]);

  useEffect(() => { carregar(); }, [carregar]);

  const eventosPorData = new Map<string, Evento[]>();
  data?.eventos?.forEach((e) => {
    const existentes = eventosPorData.get(e.data) || [];
    existentes.push(e);
    eventosPorData.set(e.data, existentes);
  });

  const modifiers: Record<string, Date[]> = {};
  const modifierStyles: Record<string, React.CSSProperties> = {};
  for (const [dt, evts] of eventosPorData) {
    const date = parseDate(dt);
    modifiers[dt] = [date];
    const tipos = [...new Set(evts.map((e) => e.tipo))];
    const colors = tipos.map((t) => TIPO_CONFIG[t]?.hex || "#9ca3af");
    modifierStyles[dt] = {
      border: "2px solid transparent",
      borderImage: `linear-gradient(135deg, ${colors.join(", ")}) 1`,
    };
  }

  const abrirDia = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const dt = formatDate(date);
    setEventosDoDia(eventosPorData.get(dt) || []);
    setOpenDia(true);
  };

  const mesAnterior = () => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const mesSeguinte = () => {
    const [y, m] = mes.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const abrirFormNovo = (data?: string) => {
    setEditing(null);
    setFormData(data || formatDate(new Date()));
    setFormTipo("PAYMENT");
    setFormTexto("");
    setFormDescricao("");
    setOpenForm(true);
  };

  const abrirFormEditar = (e: Evento) => {
    setEditing(e);
    setFormData(e.data);
    setFormTipo(e.tipo as "PAYMENT");
    setFormTexto(e.texto);
    setFormDescricao(e.descricao || "");
    setOpenForm(true);
  };

  const salvar = async () => {
    if (salvando) return;
    if (!formTexto.trim()) {
      toast({ title: "Texto obrigatório", variant: "destructive" });
      return;
    }
    setSalvando(true);
    if (editing) {
      const { error } = await db.rpc("calendario_evento_atualizar", {
        _caller: user, _id: editing.id, _data: formData, _tipo: formTipo, _texto: formTexto.trim(), _descricao: formDescricao.trim(),
      }) as unknown as { error: { message: string } | null };
      setSalvando(false);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Evento atualizado" });
    } else {
      const { error } = await db.rpc("calendario_evento_criar", {
        _caller: user, _data: formData, _tipo: formTipo, _texto: formTexto.trim(), _descricao: formDescricao.trim(),
      }) as unknown as { error: { message: string } | null };
      setSalvando(false);
      if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
      toast({ title: "Evento criado" });
    }
    setOpenForm(false);
    carregar();
    if (selectedDate) abrirDia(selectedDate);
  };

  const excluir = async (id: string) => {
    if (!(await confirm({ title: "Excluir evento", description: "Esta ação não pode ser desfeita.", confirmLabel: "Excluir" }))) return;
    const { error } = await db.rpc("calendario_evento_excluir", { _caller: user, _id: id }) as unknown as { error: { message: string } | null };
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Evento excluído" });
    carregar();
    if (selectedDate) abrirDia(selectedDate);
  };

  const countPorTipo = (tipo: string) =>
    (data?.eventos || []).filter((e) => e.tipo === tipo && e.data.startsWith(mes)).length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={CalendarDays}
        title="Calendário municipal"
        subtitle="Eventos, pagamentos, feriados e compromissos"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(TIPO_CONFIG).map(([tipo, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card key={tipo} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => abrirFormNovo(formatDate(new Date()))}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${cfg.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                    <p className="text-lg font-bold">{countPorTipo(tipo)}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={mesAnterior}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <CardTitle className="text-lg">
                {new Date(parseInt(mes.split("-")[0]), parseInt(mes.split("-")[1]) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={mesSeguinte}>
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : erro ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-destructive">{erro}</p>
                <Button variant="outline" size="sm" onClick={() => void carregar()}>Tentar novamente</Button>
              </div>
            ) : (
              <Calendar
                locale={ptBR}
                month={new Date(parseInt(mes.split("-")[0]), parseInt(mes.split("-")[1]) - 1)}
                onMonthChange={(d) => setMes(formatDate(d).slice(0, 7))}
                mode="single"
                selected={selectedDate}
                onSelect={abrirDia}
                modifiers={modifiers}
                modifiersStyles={modifierStyles}
                className="mx-auto"
              />
            )}
          </CardContent>
        </Card>

        {data?.overrides && data.overrides.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dias com Override ({data.overrides.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {data.overrides.map((ov) => (
                  <Badge key={ov} variant="outline" className="text-xs">
                    {parseDate(ov).toLocaleDateString("pt-BR")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={openDia} onOpenChange={setOpenDia}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </DialogTitle>
            <DialogDescription>Eventos cadastrados para esta data.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {eventosDoDia.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento neste dia</p>
            )}
            {eventosDoDia.map((ev) => {
              const cfg = TIPO_CONFIG[ev.tipo];
              const Icon = cfg?.icon || FileText;
              return (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className={`w-8 h-8 rounded-full ${cfg?.color || "bg-muted-foreground/40"} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{ev.texto}</p>
                        <Badge variant="outline" className="text-[10px] mt-1">{cfg?.label || ev.tipo}</Badge>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Editar ${ev.texto}`} onClick={() => { setOpenDia(false); abrirFormEditar(ev); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Excluir ${ev.texto}`} onClick={() => excluir(ev.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {ev.descricao && <p className="text-xs text-muted-foreground mt-1">{ev.descricao}</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDia(false)}>Fechar</Button>
            <Button onClick={() => { setOpenDia(false); abrirFormNovo(selectedDate ? formatDate(selectedDate) : undefined); }}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            <DialogDescription>Preencha os dados do evento no calendário municipal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="evento-data">Data</Label>
              <Input id="evento-data" type="date" value={formData} onChange={(e) => setFormData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-tipo">Tipo</Label>
              <Select value={formTipo} onValueChange={(v) => setFormTipo(v as "PAYMENT")}>
                <SelectTrigger id="evento-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-titulo">Título *</Label>
              <Input id="evento-titulo" value={formTexto} onChange={(e) => setFormTexto(e.target.value)} placeholder="Descrição curta do evento" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evento-descricao">Descrição</Label>
              <Textarea id="evento-descricao" value={formDescricao} onChange={(e) => setFormDescricao(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={() => void salvar()} disabled={salvando}>{salvando ? "Salvando..." : (editing ? "Salvar" : "Criar")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmElement}
    </div>
  );
}
