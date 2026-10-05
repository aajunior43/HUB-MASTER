import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellRing, CheckCheck, Loader2, RefreshCw, X } from "lucide-react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";

type Notif = {
  id: string;
  titulo: string;
  mensagem: string | null;
  lida: number;
  tipo: string;
  ref_tipo: string | null;
  ref_id: string | null;
  ator_id: string | null;
  rota: string | null;
  prioridade: "baixa" | "normal" | "alta" | "urgente";
  lida_em: string | null;
  criado_em: string;
};

type NotifResponse = {
  rows?: Notif[];
  naoLidas?: number;
  pagina?: number;
  totalPaginas?: number;
};

function formatarData(value: string) {
  const raw = String(value || "");
  const date = new Date(raw.includes("T") ? raw : `${raw.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function rotaDaNotificacao(notif: Notif) {
  if (notif.rota) return notif.rota;
  if (notif.ref_tipo === "gd_documentos" && notif.ref_id) {
    return `/gestao-documentos?documento=${encodeURIComponent(notif.ref_id)}`;
  }
  if (notif.ref_tipo === "pedidos_dotacao" && notif.ref_id) {
    return `/pedidos-dotacao?pedido=${encodeURIComponent(notif.ref_id)}`;
  }
  if (notif.ref_tipo === "tarefas" && notif.ref_id) {
    return `/tarefas?tarefa=${encodeURIComponent(notif.ref_id)}`;
  }
  return null;
}

const prioridadeLabel: Record<Notif["prioridade"], string> = {
  baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente",
};

export function NotificationBell({ variant = "onDark" }: { variant?: "onDark" | "onLight" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [aberto, setAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (page = 1, append = false) => {
    if (!user) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    const { data, error } = await db.rpc("gd_notificacoes_listar", {
      _caller: user, _pagina: page, _por_pagina: 50,
    });
    if (requestId !== requestRef.current) return;
    if (error || !data) {
      setErro(error?.message || "Não foi possível carregar as notificações.");
      if (!append) setNotifs([]);
      setLoading(false);
      return;
    }
    const response = data as NotifResponse;
    const rows = Array.isArray(response.rows) ? response.rows : [];
    setNotifs((current) => {
      const merged = append ? [...current, ...rows] : rows;
      return [...new Map(merged.map((item) => [item.id, item])).values()];
    });
    setNaoLidas(Number(response.naoLidas) || 0);
    setPagina(Number(response.pagina) || page);
    setTotalPaginas(Math.max(1, Number(response.totalPaginas) || 1));
    setErro(null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    requestRef.current += 1;
    setNotifs([]);
    setNaoLidas(0);
    setPagina(1);
    setTotalPaginas(1);
    setErro(null);
    if (!user) return undefined;

    const atualizar = () => {
      if (document.visibilityState === "visible") void carregar(1, false);
    };
    void carregar(1, false);
    const interval = window.setInterval(atualizar, 20_000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [carregar, user]);

  useEffect(() => {
    if (!aberto) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAberto(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [aberto]);

  const marcarLida = async (notif: Notif) => {
    if (!notif.lida) {
      const { error } = await db.rpc("gd_notificacao_marcar_lida", { _caller: user, _id: notif.id });
      if (error) {
        setErro(error.message || "Não foi possível marcar a notificação como lida.");
        return;
      }
      setNotifs((current) => current.map((item) => item.id === notif.id ? { ...item, lida: 1 } : item));
      setNaoLidas((current) => Math.max(0, current - 1));
    }
    setAberto(false);
    const rota = rotaDaNotificacao(notif);
    if (rota) navigate(rota);
  };

  const marcarTodasLidas = async () => {
    if (!naoLidas) return;
    const { error } = await db.rpc("gd_notificacoes_marcar_todas_lidas", { _caller: user });
    if (error) {
      setErro(error.message || "Não foi possível atualizar as notificações.");
      return;
    }
    setNotifs((current) => current.map((item) => ({ ...item, lida: 1 })));
    setNaoLidas(0);
  };

  const tone = variant === "onLight"
    ? "text-foreground/70 hover:text-foreground hover:bg-muted"
    : "text-sidebar-primary hover:bg-white/10";

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setAberto((current) => !current)}
        aria-label={`Notificações${naoLidas ? ` (${naoLidas} não lidas)` : ""}`}
        aria-expanded={aberto}
        aria-controls="notifications-menu"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full ${tone}`}
      >
        {naoLidas ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white" title={`${naoLidas} não lidas`}>
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div id="notifications-menu" role="dialog" aria-label="Notificações" className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notificações</p>
              <p className="text-xs text-muted-foreground">{naoLidas ? `${naoLidas} não lidas` : "Tudo em dia"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => void marcarTodasLidas()} disabled={!naoLidas || loading} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40" aria-label="Marcar todas como lidas" title="Marcar todas como lidas">
                <CheckCheck className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={() => setAberto(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fechar notificações">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          {erro && (
            <div className="flex items-center justify-between gap-2 border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs text-destructive" role="alert">
              <span>{erro}</span>
              <button type="button" onClick={() => void carregar(1, false)} className="shrink-0 rounded p-1 hover:bg-destructive/10" aria-label="Tentar novamente">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}

          <div className="max-h-[min(26rem,60vh)] overflow-y-auto">
            {loading && !notifs.length ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
            ) : !notifs.length ? (
              <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação.</p>
            ) : notifs.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => void marcarLida(notif)}
                className={`flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${notif.lida ? "opacity-65" : "bg-primary/[0.035]"} ${notif.prioridade === "urgente" ? "border-l-4 border-l-destructive" : notif.prioridade === "alta" ? "border-l-4 border-l-amber-500" : ""}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.lida ? "bg-muted-foreground/30" : "bg-primary"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium leading-snug">{notif.titulo}</span>
                    {notif.prioridade !== "normal" && <span className="shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">{prioridadeLabel[notif.prioridade]}</span>}
                  </span>
                  {notif.mensagem && <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{notif.mensagem}</span>}
                  <span className="mt-1.5 block text-[10px] text-muted-foreground">{formatarData(notif.criado_em)}</span>
                </span>
              </button>
            ))}
          </div>

          {pagina < totalPaginas && (
            <button type="button" onClick={() => void carregar(pagina + 1, true)} disabled={loading} className="flex w-full items-center justify-center gap-2 border-t border-border px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/40 disabled:opacity-50">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Carregar mais
            </button>
          )}
        </div>
      )}
    </div>
  );
}
