import { useState, useEffect, useCallback } from "react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ScrollText } from "lucide-react";

interface SuperlogRow {
  id: string;
  criado_em: string;
  username: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  detalhes: string | null;
  ip: string | null;
}

function fmtArgs(args: string | null) {
  if (!args) return "";
  try {
    const value = JSON.parse(args);
    if (!value || typeof value !== "object") return String(value);
    return Object.entries(value)
      .map(([key, item]) => `${key}=${typeof item === "string" ? item : JSON.stringify(item)}`)
      .join(" · ");
  } catch {
    return args;
  }
}

function requestIdFromDetails(details: string | null) {
  if (!details) return "";
  try {
    const value = JSON.parse(details) as { request_id?: unknown };
    return typeof value.request_id === "string" ? value.request_id : "";
  } catch {
    return "";
  }
}

export default function Superlog() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SuperlogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [acao, setAcao] = useState("");
  const [acaoInput, setAcaoInput] = useState("");
  const [usuario, setUsuario] = useState("");
  const [usuarioInput, setUsuarioInput] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const fetchRows = useCallback(() => {
    setLoading(true);
    db.rpc("gd_superlog_listar", {
      _caller: user,
      _busca: busca,
      _acao: acao,
      _usuario: usuario,
      _de: de,
      _ate: ate,
      _pagina: pagina,
      _por_pagina: 30,
    }).then(({ data, error }) => {
      if (error) {
        toast({ title: "Erro ao carregar superlog", description: error.message, variant: "destructive" });
        setRows([]);
      } else if (data) {
        const value = data as { rows: SuperlogRow[]; total: number; pagina: number };
        setRows(value.rows);
        setTotal(value.total);
        setPagina(value.pagina);
      }
    }).catch((error) => {
      toast({ title: "Erro ao carregar superlog", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
      setRows([]);
    }).finally(() => setLoading(false));
  }, [user, pagina, busca, acao, usuario, de, ate]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const totalPaginas = Math.max(1, Math.ceil(total / 30));
  const aplicarFiltros = () => {
    setBusca(buscaInput);
    setAcao(acaoInput);
    setUsuario(usuarioInput);
    setPagina(1);
  };
  const limparFiltros = () => {
    setBusca("");
    setAcao("");
    setUsuario("");
    setBuscaInput("");
    setAcaoInput("");
    setUsuarioInput("");
    setDe("");
    setAte("");
    setPagina(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={ScrollText}
        title="Auditoria do sistema"
        subtitle="Registro de todas as ações"
        username={user}
      />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-[2] min-w-[220px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Busca</label>
            <Input
              value={buscaInput}
              onChange={(event) => setBuscaInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && aplicarFiltros()}
              placeholder="ação, entidade, ID ou detalhe"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ação</label>
            <Input
              value={acaoInput}
              onChange={(event) => setAcaoInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && aplicarFiltros()}
              placeholder="ex.: gd_documento_criar"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário</label>
            <Input
              value={usuarioInput}
              onChange={(event) => setUsuarioInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && aplicarFiltros()}
              placeholder="ex.: aleksandro"
              className="h-8 text-xs"
            />
          </div>
          <div className="min-w-[145px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">De</label>
            <Input type="date" value={de} onChange={(event) => { setDe(event.target.value); setPagina(1); }} className="h-8 text-xs" />
          </div>
          <div className="min-w-[145px]">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Até</label>
            <Input type="date" value={ate} onChange={(event) => { setAte(event.target.value); setPagina(1); }} className="h-8 text-xs" />
          </div>
          <Button size="sm" className="h-8" onClick={aplicarFiltros}>Filtrar</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={limparFiltros}>Limpar</Button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm">
              <caption className="sr-only">Registro de auditoria do sistema</caption>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Data/Hora", "Usuário", "Ação", "Entidade", "IP", "Correlação", "Detalhes"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">Nenhum registro.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{row.criado_em}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{row.username || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">{row.acao}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{row.entidade}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">{row.ip || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-muted-foreground">{requestIdFromDetails(row.detalhes) || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px] truncate">{fmtArgs(row.detalhes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">Página {pagina} de {totalPaginas} · {total} registros</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((value) => value - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((value) => value + 1)}>Próxima</Button>
          </div>
        </div>
      </div>

      <footer className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground py-6">
        Desenvolvido por <span className="text-primary font-bold">DEV ALEKSANDRO ALVES</span>
      </footer>
    </div>
  );
}
