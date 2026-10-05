import { useCallback, useEffect, useState } from "react";
import { db } from "@/integrations/db/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";
import {
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Database,
  FolderArchive,
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  Github,
} from "lucide-react";

type Status = {
  dataDir: string;
  sqlite: { exists: boolean; bytes: number };
  wal: { exists: boolean; bytes: number };
  shm: { exists: boolean; bytes: number };
  uploads: { files: number; bytes: number };
  backups: {
    total: number;
    bytes: number;
    last: BackupItem | null;
  };
};

type BackupItem = {
  id: string;
  relativePath: string;
  bytes: number;
  hasDb: boolean;
  hasUploads: boolean;
  createdAt: string;
};

type Integridade = { ok: boolean; messages: string[] };

function formatBytes(n: number) {
  if (!n || n < 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatStamp(id: string) {
  const m = id.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})$/);
  if (!m) return id;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
}

export default function Backup() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [lista, setLista] = useState<BackupItem[]>([]);
  const [integridade, setIntegridade] = useState<Integridade | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [st, ls] = await Promise.all([
      db.rpc("backup_status", { _caller: user }) as unknown as {
        data: Status | null;
        error: { message: string } | null;
      },
      db.rpc("backup_listar", { _caller: user }) as unknown as {
        data: BackupItem[] | null;
        error: { message: string } | null;
      },
    ]);
    setLoading(false);
    if (st.error) {
      toast({ title: "Erro ao carregar status", description: st.error.message, variant: "destructive" });
      return;
    }
    if (ls.error) {
      toast({ title: "Erro ao listar backups", description: ls.error.message, variant: "destructive" });
      return;
    }
    setStatus(st.data);
    setLista(ls.data || []);
  }, [user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criar = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = (await db.rpc("backup_criar", { _caller: user })) as unknown as {
      data: BackupItem & { files?: string[]; uploads?: number };
      error: { message: string } | null;
    };
    setBusy(false);
    if (error) {
      toast({ title: "Falha no backup", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Backup criado",
      description: `${data.id} · ${formatBytes(data.bytes)} em data/backups/`,
    });
    await carregar();
  };

  const baixarTudo = () => {
    window.location.assign("/api/backup/download");
  };

  const enviarGithub = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = (await db.rpc("backup_enviar_github", { _caller: user })) as unknown as {
      data: { id: string; branch: string; bytes: number } | null;
      error: { message: string } | null;
    };
    setBusy(false);
    if (error) {
      toast({ title: "Falha ao enviar ao GitHub", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Backup enviado ao GitHub", description: `${data?.id} · branch ${data?.branch}` });
    await carregar();
  };

  const checarIntegridade = async () => {
    if (!user) return;
    setBusy(true);
    const { data, error } = (await db.rpc("backup_integridade", { _caller: user })) as unknown as {
      data: Integridade | null;
      error: { message: string } | null;
    };
    setBusy(false);
    if (error) {
      toast({ title: "Erro na verificação", description: error.message, variant: "destructive" });
      return;
    }
    setIntegridade(data);
    toast({
      title: data?.ok ? "Banco íntegro" : "Problemas no banco",
      description: data?.ok ? "PRAGMA integrity_check: ok" : data?.messages?.join("; "),
      variant: data?.ok ? "default" : "destructive",
    });
  };

  const confirmarExcluir = async () => {
    if (!user || !excluirId) return;
    setBusy(true);
    const { error } = (await db.rpc("backup_excluir", {
      _caller: user,
      _id: excluirId,
    })) as unknown as { error: { message: string } | null };
    setBusy(false);
    setExcluirId(null);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Backup removido", description: excluirId });
    await carregar();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          icon={HardDrive}
          title="Backup"
          subtitle="Banco de dados e anexos"
          username={user}
        />
        <div className="max-w-xl mx-auto px-6 mt-16 text-center text-muted-foreground">
          <LockIcon />
          <p className="mt-4 text-sm">Apenas administradores podem gerenciar backups.</p>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageHeader
        icon={HardDrive}
        title="Backup"
        subtitle="Banco SQLite e anexos do sistema"
        username={user}
        actions={
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={enviarGithub} className="bg-slate-900 text-white hover:bg-slate-800">
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Github className="w-4 h-4 mr-1.5" />}
              Backup no GitHub
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={baixarTudo}>
              <Download className="w-4 h-4 mr-1.5" />
              Baixar tudo
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || loading}
              onClick={() => carregar()}
              className="border-sidebar-primary/40 text-sidebar-foreground hover:bg-sidebar-accent/40"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={criar}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FolderArchive className="w-4 h-4 mr-1.5" />}
              Fazer cópia agora
            </Button>
          </div>
        }
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2 leading-relaxed">
            <p>
              O backup copia <code className="text-xs bg-muted px-1 rounded">data/inaja.sqlite</code> (e arquivos WAL)
              mais a pasta <code className="text-xs bg-muted px-1 rounded">data/uploads/</code> para{" "}
              <code className="text-xs bg-muted px-1 rounded">data/backups/AAAA-MM-DD_HHMMSS/</code>.
            </p>
            <p>
              Também disponível no terminal: <code className="text-xs bg-muted px-1 rounded">npm run backup</code>.
              Guarde uma cópia em pen drive ou rede após o backup.
            </p>
          </CardContent>
        </Card>

        {loading && !status ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando…
          </div>
        ) : status ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Database}
              label="Banco SQLite"
              value={status.sqlite.exists ? formatBytes(status.sqlite.bytes) : "Ausente"}
              hint={status.wal.exists ? `WAL ${formatBytes(status.wal.bytes)}` : "Sem WAL"}
            />
            <StatCard
              icon={FolderArchive}
              label="Anexos (uploads)"
              value={`${status.uploads.files} arquivo(s)`}
              hint={formatBytes(status.uploads.bytes)}
            />
            <StatCard
              icon={HardDrive}
              label="Cópias salvas"
              value={String(status.backups.total)}
              hint={formatBytes(status.backups.bytes)}
            />
            <StatCard
              icon={ShieldCheck}
              label="Última cópia"
              value={status.backups.last ? formatStamp(status.backups.last.id) : "Nenhum"}
              hint={status.backups.last ? formatBytes(status.backups.last.bytes) : "—"}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={checarIntegridade}>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verificar integridade do banco
          </Button>
        </div>

        {integridade && (
          <Card className={integridade.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"}>
            <CardContent className="pt-5 flex items-start gap-3">
              {integridade.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="text-sm space-y-1">
                <p className="font-semibold text-foreground">
                  {integridade.ok ? "Integridade OK" : "Integridade com falhas"}
                </p>
                <ul className="text-muted-foreground list-disc pl-4">
                  {integridade.messages.map((m, i) => (
                    <li key={i} className="font-mono text-xs">{m}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Histórico de cópias</CardTitle>
          </CardHeader>
          <CardContent>
            {lista.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma cópia ainda. Clique em <strong className="text-foreground">Fazer cópia agora</strong>.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {lista.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-foreground">{formatStamp(b.id)}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.relativePath}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {formatBytes(b.bytes)}
                        </Badge>
                        {b.hasDb && (
                          <Badge variant="outline" className="text-[10px]">
                            SQLite
                          </Badge>
                        )}
                        {b.hasUploads && (
                          <Badge variant="outline" className="text-[10px]">
                            uploads
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 self-start sm:self-center"
                      disabled={busy}
                      onClick={() => setExcluirId(b.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AppFooter />

      <AlertDialog open={!!excluirId} onOpenChange={(o) => !o && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cópia de segurança?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove a pasta <span className="font-mono text-foreground">{excluirId}</span> de data/backups/.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExcluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LockIcon() {
  return (
    <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
      <HardDrive className="w-7 h-7 text-muted-foreground" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <p className="font-display font-bold text-lg text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
