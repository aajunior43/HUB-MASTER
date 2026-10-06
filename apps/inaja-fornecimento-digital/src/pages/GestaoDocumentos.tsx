import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Mail, Plus, Inbox, RefreshCw, Send, Reply, Forward,
  Archive, XCircle, Paperclip, Eye, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type Setor = { id: string; nome: string; sigla: string | null; parent_id: string | null; tipo: string };
type TipoDoc = { codigo: string; nome: string; descricao: string | null };
type DocRow = {
  id: string; protocolo: string; tipo_codigo: string; assunto: string;
  status: string; prioridade: string; criado_em: string; autor: string;
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho", em_aberto: "Em aberto", respondido: "Respondido",
  encaminhado: "Encaminhado", arquivado: "Arquivado", cancelado: "Cancelado",
};
const STATUS_COR: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  em_aberto: "bg-secondary/15 text-secondary border border-secondary/30",
  respondido: "bg-primary/10 text-primary border border-primary/20",
  encaminhado: "bg-accent/20 text-foreground border border-accent/40",
  arquivado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/10 text-destructive border border-destructive/20",
};
const PRI_COR: Record<string, string> = {
  baixa: "text-muted-foreground", normal: "text-foreground",
  alta: "text-accent-foreground font-medium", urgente: "text-destructive font-bold",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result || "");
      resolve(result.split(",")[1] || "");
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadAnexo(docId: string, file: File, caller: string) {
  const base64 = await fileToBase64(file);
  const nomeSeguro = file.name.replace(/[\\/]/g, "_").replace(/\.\./g, "_");
  const path = `documentos/${docId}/${Date.now()}-${nomeSeguro}`;
  const up = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, contentBase64: base64, module: "gestao-documentos" }),
  });
  if (!up.ok) throw new Error("Falha no upload do anexo");
  const { error } = await db.rpc("gd_documento_anexar", {
    _caller: caller, _id: docId, _nome: file.name, _caminho: path,
    _tamanho: file.size, _mime: file.type,
  });
  if (error) {
    await fetch("/api/storage/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: [path] }),
    }).catch(() => undefined);
    throw new Error(error.message || "Falha ao registrar anexo");
  }
}

// ─── Painel de detalhes (history + anexos + ações) ────────────────────────────
function PainelDetalhe({ id, onClose }: { id: string; onClose: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<{
    doc: Record<string, unknown>;
    destinatarios: { setor_id: string; setor_nome: string; tipo: string }[];
    tramitacoes: Record<string, unknown>[];
    anexos: { id: string; nome_original: string; mime: string | null; tamanho: number | null; criado_em: string }[];
    permissoes: { pode_finalizar: boolean; pode_anexar: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [setores, setSetores] = useState<Setor[]>([]);
  const [paraSetor, setParaSetor] = useState("");
  const [editando, setEditando] = useState(false);
  const [tipos, setTipos] = useState<TipoDoc[]>([]);
  const [eTipo, setETipo] = useState("");
  const [eAssunto, setEAssunto] = useState("");
  const [eConteudo, setEConteudo] = useState("");
  const [ePrioridade, setEPrioridade] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [agindo, setAgindo] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    db.rpc("gd_documento_get", { _id: id, _caller: user }).then(({ data: d, error }) => {
      if (error) {
        setErro(error.message || "Erro ao carregar");
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setData(d as typeof data);
      }
      setLoading(false);
    });
    db.rpc("gd_setores_listar", { _caller: user }).then(({ data: s }) => {
      if (s) setSetores(s as Setor[]);
    });
    db.rpc("gd_tipos_listar", { _caller: user }).then(({ data: t }) => {
      if (t) setTipos(t as TipoDoc[]);
    });
  }, [id, user]);

  useEffect(() => { carregar(); }, [carregar]);

  const acao = async (fn: string, extra: Record<string, unknown> = {}) => {
    if (agindo) return;
    setAgindo(true);
    const { error } = await db.rpc(fn, { _id: id, _caller: user, _observacao: obs, ...extra });
    setAgindo(false);
    if (error) {
      toast({ title: "Ação falhou", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ação registrada" });
      setObs("");
      carregar();
    }
  };

  const onAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAnexo(id, file, user || "");
      toast({ title: "Anexo adicionado" });
      carregar();
    } catch (err) {
      toast({ title: "Falha no anexo", description: String((err as Error).message), variant: "destructive" });
    }
    e.target.value = "";
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (erro || !data) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <p className="p-6 text-destructive">{erro || "Não encontrado"}</p>
        </DialogContent>
      </Dialog>
    );
  }

  const doc = data.doc as Record<string, string>;
  const status = doc.status as string;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="sticky top-0 bg-card border-b border-border px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-display font-bold text-base">
            {doc.protocolo}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {status === "rascunho" && !editando && (
              <Button size="sm" variant="outline" onClick={() => {
                setETipo(String(doc.tipo_codigo));
                setEAssunto(String(doc.assunto));
                setEConteudo(String(doc.conteudo || ""));
                setEPrioridade(String(doc.prioridade || "normal"));
                setEditando(true);
              }}>
                Editar rascunho
              </Button>
            )}
            <Badge className={STATUS_COR[status]}>{STATUS_LABEL[status] || status}</Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {editando ? (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Editando rascunho</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
                  <select value={eTipo} onChange={(e) => setETipo(e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs">
                    {tipos.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
                  <select value={ePrioridade} onChange={(e) => setEPrioridade(e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs">
                    {["baixa", "normal", "alta", "urgente"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assunto</label>
                <Input value={eAssunto} onChange={(e) => setEAssunto(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conteúdo</label>
                <Textarea value={eConteudo} onChange={(e) => setEConteudo(e.target.value)} className="min-h-[160px]" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => {
                  if (!eAssunto.trim()) {
                    toast({ title: "Assunto obrigatório", variant: "destructive" });
                    return;
                  }
                  setSalvandoEdit(true);
                  db.rpc("gd_documento_atualizar", {
                    _caller: user, _id: id, _tipo: eTipo, _assunto: eAssunto,
                    _conteudo: eConteudo, _prioridade: ePrioridade,
                  }).then(({ error }) => {
                    setSalvandoEdit(false);
                    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
                    else { toast({ title: "Rascunho atualizado" }); setEditando(false); carregar(); }
                  });
                }} disabled={salvandoEdit}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={salvandoEdit}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Assunto</p>
                <p className="font-semibold">{doc.assunto}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-semibold">{String(doc.tipo_codigo).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <p className={`font-semibold ${PRI_COR[doc.prioridade as string] || ""}`}>{doc.prioridade}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Conteúdo</p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{doc.conteudo || "—"}</p>
              </div>
            </>
          )}

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Destinatários</p>
            <div className="flex flex-wrap gap-1">
              {data.destinatarios.map((d) => (
                <Badge key={d.setor_id} variant="outline" className="text-[10px]">
                  {d.setor_nome}{d.tipo === "cc" ? " (CC)" : ""}
                </Badge>
              ))}
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Histórico de tramitação</p>
            <ol className="space-y-2 text-sm">
              {data.tramitacoes.map((t, i) => (
                <li key={String(t.id)} className="border-l-2 border-border pl-3">
                  <span className="font-semibold capitalize">{String(t.acao)}</span>
                  {t.de_setor_nome ? (
                    <span className="text-muted-foreground"> — {String(t.de_setor_nome)} → {String(t.para_setor_nome) || "—"}</span>
                  ) : null}
                  {t.de_usuario ? <span className="text-muted-foreground"> por {String(t.de_usuario)}</span> : null}
                  <p className="text-xs text-muted-foreground">{String(t.criado_em)}</p>
                  {t.observacao ? <p className="text-xs">{String(t.observacao)}</p> : null}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Anexos</p>
            <ul className="space-y-1 text-sm">
              {data.anexos.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span>{a.nome_original}</span>
                  <span className="text-xs text-muted-foreground">
                    {a.tamanho ? `${Math.round(a.tamanho / 1024)} KB` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {data.permissoes.pode_anexar && (
              <label className="inline-flex items-center gap-2 mt-2 text-xs text-primary cursor-pointer">
                <Paperclip className="w-4 h-4" /> Anexar arquivo
                <input type="file" className="hidden" onChange={onAnexo} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" />
              </label>
            )}
          </div>

          <hr className="border-border" />

          {status !== "rascunho" && status !== "arquivado" && status !== "cancelado" && (
            <div className="space-y-3">
              <Textarea
                placeholder="Observação da ação (opcional)"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => acao("gd_documento_responder")} disabled={!user || agindo}>
                  <Reply className="w-4 h-4 mr-1" /> Responder
                </Button>
                <div className="flex items-center gap-1">
                  <select
                    value={paraSetor}
                    onChange={(e) => setParaSetor(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background text-xs px-2"
                  >
                    <option value="">Encaminhar para...</option>
                    {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => paraSetor && acao("gd_documento_encaminhar", { _para_setor: paraSetor })} disabled={!paraSetor || agindo}>
                    <Forward className="w-4 h-4 mr-1" /> Encaminhar
                  </Button>
                </div>
                {data.permissoes.pode_finalizar && (
                  <>
                    <Button size="sm" variant="outline" disabled={agindo} onClick={() => acao("gd_documento_arquivar")}>
                      <Archive className="w-4 h-4 mr-1" /> Arquivar
                    </Button>
                    <Button size="sm" variant="outline" disabled={agindo} className="text-red-500" onClick={() => acao("gd_documento_cancelar")}>
                      <XCircle className="w-4 h-4 mr-1" /> Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Aba Caixa de Entrada ───────────────────────────────────────────────────────
function AbaCaixa({ documentoInicial }: { documentoInicial?: string | null }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [status, setStatus] = useState("");
  const [apenasMeus, setApenasMeus] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(documentoInicial || null);
  const [filtrosSalvos, setFiltrosSalvos] = useState<{ id: string; nome: string; filtros: Record<string, unknown> }[]>([]);
  const [filtroSel, setFiltroSel] = useState("");

  useEffect(() => {
    if (documentoInicial) setDetalheId(documentoInicial);
  }, [documentoInicial]);

  useEffect(() => {
    db.rpc("gd_filtros_listar", { _caller: user }).then(({ data }) => {
      if (data) setFiltrosSalvos(data as { id: string; nome: string; filtros: Record<string, unknown> }[]);
    });
  }, [user]);

  const fetchRows = useCallback(() => {
    setLoading(true);
    db.rpc("gd_documento_listar", {
      _caller: user, _pagina: pagina, _busca: busca, _status: status, _apenas_meus: apenasMeus, _por_pagina: 20,
    }).then(({ data, error }) => {
      if (error) {
        toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
        setRows([]);
      } else if (data) {
        const d = data as { rows: DocRow[]; total: number; pagina: number };
        setRows(d.rows);
        setTotal(d.total);
        setPagina(d.pagina);
      }
      setLoading(false);
    });
  }, [user, pagina, busca, status, apenasMeus]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const aplicarFiltro = (id: string) => {
    setFiltroSel(id);
    const f = filtrosSalvos.find((x) => x.id === id);
    if (!f) return;
    const fl = f.filtros as { busca?: string; status?: string; apenas_meus?: boolean };
    setBusca(fl.busca || "");
    setBuscaInput(fl.busca || "");
    setStatus(fl.status || "");
    setApenasMeus(Boolean(fl.apenas_meus));
    setPagina(1);
  };

  const salvarFiltro = async () => {
    const nome = window.prompt("Nome do filtro");
    if (!nome) return;
    const { error } = await db.rpc("gd_filtro_salvar", {
      _caller: user, _nome: nome, _filtros: { busca, status, apenas_meus: apenasMeus },
    });
    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Filtro salvo" });
      db.rpc("gd_filtros_listar", { _caller: user }).then(({ data }) => {
        if (data) setFiltrosSalvos(data as { id: string; nome: string; filtros: Record<string, unknown> }[]);
      });
    }
  };

  const excluirFiltro = async (id: string) => {
    const { error } = await db.rpc("gd_filtro_excluir", { _caller: user, _id: id });
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else {
      setFiltrosSalvos((l) => l.filter((x) => x.id !== id));
      if (filtroSel === id) setFiltroSel("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buscar</label>
          <div className="flex gap-1.5">
            <Input
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setBusca(buscaInput), setPagina(1))}
              placeholder="Assunto ou protocolo"
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" onClick={() => { setBusca(buscaInput); setPagina(1); }}>Buscar</Button>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPagina(1); }}
            className="block w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground pb-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={apenasMeus}
            onChange={(e) => { setApenasMeus(e.target.checked); setPagina(1); }}
          />
          Apenas meus
        </label>
        <div className="flex items-center gap-1.5">
          <select
            value={filtroSel}
            onChange={(e) => aplicarFiltro(e.target.value)}
            className="h-8 rounded-md border border-input bg-background text-xs px-2"
          >
            <option value="">Filtros salvos…</option>
            {filtrosSalvos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          {filtroSel && (
            <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive" onClick={() => excluirFiltro(filtroSel)}>
              <XCircle className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8" onClick={salvarFiltro}>Salvar filtro</Button>
        </div>
        <Button size="sm" variant="outline" onClick={fetchRows}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm">
            <caption className="sr-only">Caixa de entrada de documentos</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Protocolo", "Tipo", "Assunto", "Status", "Prioridade", "Autor", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground">Nenhum documento.</td></tr>
              ) : rows.map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir documento ${r.protocolo}`}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setDetalheId(r.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetalheId(r.id); } }}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{r.protocolo}</td>
                  <td className="px-4 py-3 text-xs uppercase">{r.tipo_codigo}</td>
                  <td className="px-4 py-3 max-w-[280px] truncate">{r.assunto}</td>
                  <td className="px-4 py-3"><Badge className={STATUS_COR[r.status]}>{STATUS_LABEL[r.status]}</Badge></td>
                  <td className={`px-4 py-3 text-xs ${PRI_COR[r.prioridade] || ""}`}>{r.prioridade}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.autor}</td>
                  <td className="px-4 py-3"><Eye className="w-4 h-4 text-muted-foreground" aria-hidden /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Página {pagina} de {Math.ceil(total / 20) || 1}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
          <Button size="sm" variant="outline" disabled={pagina >= Math.ceil(total / 20)} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
        </div>
      </div>

      {detalheId && <PainelDetalhe id={detalheId} onClose={() => setDetalheId(null)} />}
    </div>
  );
}

// ─── Aba Novo Documento ──────────────────────────────────────────────────────────
function AbaNovo() {
  const { user } = useAuth();
  const [tipos, setTipos] = useState<TipoDoc[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [tipo, setTipo] = useState("");
  const [assunto, setAssunto] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [prioridade, setPrioridade] = useState("normal");
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [tags, setTags] = useState("");
  const [mencoes, setMencoes] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    db.rpc("gd_tipos_listar", { _caller: user }).then(({ data }) => data && setTipos(data as TipoDoc[]));
    db.rpc("gd_setores_listar", { _caller: user }).then(({ data }) => data && setSetores(data as Setor[]));
  }, [user]);

  const toggle = (lista: string[], set: (v: string[]) => void, id: string) =>
    set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  const enviar = async (rascunho: boolean) => {
    if (!tipo) { toast({ title: "Escolha o tipo", variant: "destructive" }); return; }
    if (!assunto.trim()) { toast({ title: "Assunto obrigatório", variant: "destructive" }); return; }
    setSalvando(true);
    const splitList = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await db.rpc("gd_documento_criar", {
      _caller: user, _tipo: tipo, _assunto: assunto, _conteudo: conteudo,
      _prioridade: prioridade, _tags: splitList(tags), _mencoes: splitList(mencoes),
    });
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      setSalvando(false);
      return;
    }
    const id = (data as { id: string }).id;
    if (!rascunho) {
      const { error: e2 } = await db.rpc("gd_documento_enviar", {
        _caller: user, _id: id, _destinatarios: destinatarios, _cc: cc, _observacao: "",
      });
      if (e2) {
        toast({ title: "Criado, mas falhou ao enviar", description: e2.message, variant: "destructive" });
        setSalvando(false);
        return;
      }
      toast({ title: "Documento enviado", description: `Protocolo ${(data as { protocolo: string }).protocolo}` });
    } else {
      toast({ title: "Rascunho salvo", description: `Protocolo ${(data as { protocolo: string }).protocolo}` });
    }
    setSalvando(false);
    setAssunto(""); setConteudo(""); setDestinatarios([]); setCc([]); setTipo(""); setTags(""); setMencoes("");
  };

  const CheckList = ({ titulo, lista, set, marcados }: { titulo: string; lista: Setor[]; set: (v: string[]) => void; marcados: string[] }) => (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto border border-border rounded-md p-2">
        {lista.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={marcados.includes(s.id)}
              onChange={() => toggle(marcados, set, s.id)}
            />
            {s.nome}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs">
            <option value="">Selecione...</option>
            {tipos.map((t) => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
          <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-xs">
            {["baixa", "normal", "alta", "urgente"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assunto</label>
        <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Assunto do documento" />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conteúdo</label>
        <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} className="min-h-[160px]" placeholder="Texto do documento..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags (separadas por vírgula)</label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="contrato, 2026, licitação" className="text-xs" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Menções (usuários, vírgula)</label>
          <Input value={mencoes} onChange={(e) => setMencoes(e.target.value)} placeholder="maria, joao" className="text-xs" />
        </div>
      </div>

      <CheckList titulo="Destinatários (Para)" lista={setores} set={setDestinatarios} marcados={destinatarios} />
      <CheckList titulo="Cópia (CC)" lista={setores} set={setCc} marcados={cc} />

      <div className="flex gap-3">
        <Button onClick={() => enviar(false)} disabled={salvando || !user}>
          <Send className="w-4 h-4 mr-1" /> Enviar
        </Button>
        <Button variant="outline" onClick={() => enviar(true)} disabled={salvando || !user}>
          Salvar rascunho
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────────
type Tab = "caixa" | "novo";

export default function GestaoDocumentos() {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const documentoRef = searchParams.get("documento");
  const [tab, setTab] = useState<Tab>("caixa");

  const tabs: { id: Tab; label: string; icon: typeof Inbox }[] = [
    { id: "caixa", label: "Caixa de entrada", icon: Inbox },
    { id: "novo", label: "Novo documento", icon: Plus },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Inbox}
        title="Gestão de documentos"
        subtitle="Comunicação interna e tramitação"
        username={user}
      />

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>
          {isAdmin && (
            <a href="/superlog" className="text-xs uppercase tracking-widest text-sidebar-primary font-semibold hover:underline">
              Auditoria →
            </a>
          )}
        </div>

        <div className="pb-16">
          {tab === "caixa" && <AbaCaixa documentoInicial={documentoRef} />}
          {tab === "novo" && <AbaNovo />}
        </div>
      </div>

      <footer className="text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground py-6">
        Desenvolvido por <span className="text-primary font-bold">DEV ALEKSANDRO ALVES</span>
      </footer>
    </div>
  );
}
