import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Globe2,
  Link2,
  Pencil,
  Plus,
  Search,
  Signal,
  Trash2,
} from "lucide-react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { createUuid } from "@/lib/uuid";

type Site = {
  id: string;
  titulo: string;
  url: string;
  descricao?: string;
  categoria: string;
  ordem?: number;
  created_at: string;
};

type StatusSite = "acessivel" | "desconhecido" | "indefinido";

const normalizarUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

const dadosDaUrl = (url: string) => {
  const endereco = normalizarUrl(url);
  try {
    const { hostname } = new URL(endereco);
    return {
      endereco,
      dominio: hostname.replace(/^www\./i, ""),
      favicon: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(endereco)}&sz=64`,
    };
  } catch {
    return { endereco, dominio: url, favicon: "" };
  }
};

const podeExpirar = (url: string) =>
  /powerbi\.com/i.test(url) || /disablecdnExpiration/i.test(url);

export default function SitesUteis() {
  const { user, isAdmin } = useAuth();
  const { confirm, confirmElement } = useConfirm();
  const [sites, setSites] = useState<Site[]>([]);
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, StatusSite>>({});
  const [verificando, setVerificando] = useState<Record<string, boolean>>({});
  const carregar = useCallback(async () => {
    const r = await db
      .from<Site>("sites_uteis")
      .select("*")
      .order("ordem")
      .order("titulo");
    if (r.error)
      toast({
        title: "Erro ao carregar sites",
        description: r.error.message,
        variant: "destructive",
      });
    else setSites(r.data || []);
  }, []);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  const camposDoFormulario = (f: FormData) => ({
    titulo: String(f.get("titulo") || "").trim(),
    url: String(f.get("url") || "").trim(),
    descricao: String(f.get("descricao") || "").trim(),
    categoria: String(f.get("categoria") || "Geral").trim() || "Geral",
  });

  const salvar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) {
      toast({ title: "Apenas administradores podem gerenciar sites úteis.", variant: "destructive" });
      return;
    }
    const campos = camposDoFormulario(new FormData(e.currentTarget));
    if (!campos.titulo || !campos.url) return;
    const r = await db
      .from("sites_uteis")
      .insert({
        id: createUuid(),
        titulo: campos.titulo,
        url: normalizarUrl(campos.url),
        descricao: campos.descricao,
        categoria: campos.categoria,
        ordem: (sites[sites.length - 1]?.ordem ?? sites.length) + 1,
        criado_por: user,
      });
    if (r.error)
      toast({
        title: "Erro ao salvar",
        description: r.error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Site adicionado" });
      setNovo(false);
      void carregar();
    }
  };

  const editar = async (e: React.FormEvent<HTMLFormElement>, site: Site) => {
    e.preventDefault();
    if (!isAdmin) {
      toast({ title: "Apenas administradores podem gerenciar sites úteis.", variant: "destructive" });
      return;
    }
    const campos = camposDoFormulario(new FormData(e.currentTarget));
    if (!campos.titulo || !campos.url) return;
    await db
      .from("sites_uteis")
      .update({
        titulo: campos.titulo,
        url: normalizarUrl(campos.url),
        descricao: campos.descricao,
        categoria: campos.categoria,
        criado_por: user,
      })
      .eq("id", site.id);
    toast({ title: "Site atualizado" });
    setEditando(null);
    void carregar();
  };

  const excluir = async (id: string) => {
    if (!(await confirm({ title: "Remover site útil", description: "Esta ação não pode ser desfeita.", confirmLabel: "Remover" }))) return;
    const r = await db.from("sites_uteis").delete().eq("id", id);
    if (r.error)
      toast({
        title: "Erro ao remover",
        description: r.error.message,
        variant: "destructive",
      });
    else void carregar();
  };

  const mover = async (site: Site, direcao: -1 | 1) => {
    const idx = sites.findIndex((s) => s.id === site.id);
    const vizinho = sites[idx + direcao];
    if (!vizinho) return;
    const atualA = site.ordem ?? idx + 1;
    const atualB = vizinho.ordem ?? idx + 1 + direcao;
    const rA = await db
      .from("sites_uteis")
      .update({ ordem: atualB })
      .eq("id", site.id);
    const rB = await db
      .from("sites_uteis")
      .update({ ordem: atualA })
      .eq("id", vizinho.id);
    if (rA.error || rB.error)
      toast({
        title: "Erro ao reordenar",
        description: rA.error?.message || rB.error?.message,
        variant: "destructive",
      });
    void carregar();
  };

  const verificar = async (site: Site) => {
    const siteUrl = dadosDaUrl(site.url);
    setVerificando((v) => ({ ...v, [site.id]: true }));
    let novoStatus: StatusSite = "desconhecido";
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      await fetch(siteUrl.endereco, { mode: "no-cors", signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timer);
      novoStatus = "acessivel";
    } catch {
      novoStatus = "desconhecido";
    }
    setStatus((s) => ({ ...s, [site.id]: novoStatus }));
    setVerificando((v) => ({ ...v, [site.id]: false }));
  };

  const badgeStatus = (site: Site) => {
    const st = status[site.id];
    if (st === "acessivel")
      return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Acessível</Badge>;
    if (st === "desconhecido")
      return <Badge variant="outline" className="text-muted-foreground">Desconhecido</Badge>;
    return null;
  };

  const filtrados = sites.filter((s) =>
    `${s.titulo} ${s.descricao || ""} ${s.categoria}`
      .toLowerCase()
      .includes(busca.toLowerCase()),
  );
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Link2}
        title="Sites úteis"
        subtitle="Portais e sistemas de acesso rápido"
        username={user}
        actions={
          isAdmin ? (
            <Button onClick={() => setNovo(true)}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar site
            </Button>
          ) : undefined
        }
      />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {novo && (
          <form
            onSubmit={salvar}
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <h2 className="mb-5 text-lg font-semibold">Adicionar site útil</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Nome do site *</Label>
                <Input
                  name="titulo"
                  required
                  placeholder="Portal do Tribunal de Contas"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input name="categoria" placeholder="Portais oficiais" />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço *</Label>
                <Input
                  name="url"
                  type="url"
                  required
                  placeholder="https://www.exemplo.gov.br"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  name="descricao"
                  rows={2}
                  placeholder="Para que este site é utilizado?"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <Button type="submit">Salvar site</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNovo(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar sites..."
          />
        </div>
        {filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            Nenhum site cadastrado.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((s) => {
              const site = dadosDaUrl(s.url);
              const emEdicao = editando === s.id;
              return emEdicao ? (
                <form
                  key={s.id}
                  onSubmit={(e) => editar(e, s)}
                  className="rounded-xl border border-primary/50 bg-card p-5 shadow-sm"
                >
                  <h2 className="mb-5 text-lg font-semibold">Editar site útil</h2>
                  <div className="grid gap-3">
                    <div>
                      <Label>Nome do site *</Label>
                      <Input name="titulo" required defaultValue={s.titulo} />
                    </div>
                    <div>
                      <Label>Endereço *</Label>
                      <Input name="url" type="url" required defaultValue={s.url} />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Input name="categoria" defaultValue={s.categoria} />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea name="descricao" rows={2} defaultValue={s.descricao || ""} />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button type="submit">Salvar</Button>
                    <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <article
                key={s.id}
                className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                {podeExpirar(s.url) && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      URL temporária do Power BI — pode estar expirada. Admin: verifique e atualize o endereço do painel.
                    </span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {site.favicon ? <img src={site.favicon} alt="" className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{s.titulo}</h2>
                      <p className="truncate text-xs text-muted-foreground">{site.dominio}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{s.categoria}</Badge>
                </div>
                {s.descricao ? (
                  <p className="mt-3 min-h-10 flex-1 text-sm text-muted-foreground">
                    {s.descricao}
                  </p>
                ) : (
                  <div className="min-h-10 flex-1" />
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {badgeStatus(s)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!!verificando[s.id]}
                    onClick={() => verificar(s)}
                    className="h-6 px-2 text-xs text-muted-foreground"
                  >
                    <Signal className="mr-1 h-3 w-3" />
                    {verificando[s.id] ? "Verificando..." : "Verificar"}
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => window.open(site.endereco, "_blank", "noopener,noreferrer")}
                  >
                    Abrir <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" aria-label="Editar site" onClick={() => setEditando(s.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mover para cima"
                        disabled={s.id === sites[0]?.id}
                        onClick={() => mover(s, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Mover para baixo"
                        disabled={s.id === sites[sites.length - 1]?.id}
                        onClick={() => mover(s, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Remover site" onClick={() => excluir(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </article>
              );
            })}
          </div>
        )}
      </main>
      <AppFooter />
      {confirmElement}
    </div>
  );
}
