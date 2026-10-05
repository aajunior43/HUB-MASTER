import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowLeft, Download, Database, Package, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Todas as tabelas do usuário. RLS garante que só retorna dados do próprio user.
const TABLES = [
  { name: 'links', label: 'Meus Links' },
  { name: 'folders', label: 'Pastas' },
  { name: 'tags', label: 'Tags' },
  { name: 'link_tags', label: 'Vínculos Link↔Tag' },
  { name: 'categories', label: 'Categorias' },
  { name: 'notes', label: 'Notas' },
  { name: 'ai_prompts', label: 'Prompts de IA' },
  { name: 'payment_reminders', label: 'Lembretes de Pagamento' },
  { name: 'vault_items', label: 'Cofre de Chaves (descriptografado)' },
  { name: 'site_credentials', label: 'Senhas de Sites (descriptografado)' },
  { name: 'api_keys', label: 'API Keys' },
  { name: 'profiles', label: 'Perfil' },
] as const;

type TableName = typeof TABLES[number]['name'];

function download(filename: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [counts, setCounts] = useState<Partial<Record<TableName, number>>>({});
  const [selected, setSelected] = useState<Set<TableName>>(() => new Set(TABLES.map((t) => t.name)));

  const toggle = (t: TableName) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  const selectAll = () => setSelected(new Set(TABLES.map((t) => t.name)));
  const selectNone = () => setSelected(new Set());

  const fetchDecrypted = async (): Promise<{ vault_items: unknown[]; site_credentials: unknown[] }> => {
    const { data, error } = await supabase.functions.invoke('backup-decrypt', { body: {} });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as { vault_items: unknown[]; site_credentials: unknown[] };
  };

  const fetchTable = async (t: TableName): Promise<Record<string, unknown>[]> => {
    if (t === 'vault_items' || t === 'site_credentials') {
      const dec = await fetchDecrypted();
      return (dec[t] ?? []) as Record<string, unknown>[];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(t).select('*');
    if (error) throw new Error(`${t}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  };

  const downloadOne = async (t: TableName, format: 'json' | 'csv') => {
    setBusy(t);
    try {
      const rows = await fetchTable(t);
      setCounts((c) => ({ ...c, [t]: rows.length }));
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === 'json') {
        download(`${t}_${stamp}.json`, JSON.stringify(rows, null, 2));
      } else {
        download(`${t}_${stamp}.csv`, toCSV(rows), 'text/csv');
      }
      toast({ title: `${t} exportado`, description: `${rows.length} registro(s)` });
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const downloadBundle = async (tables: TableName[], filenamePrefix: string) => {
    if (tables.length === 0) {
      toast({ title: 'Selecione ao menos uma tabela', variant: 'destructive' });
      return;
    }
    setBusy('__bundle__');
    try {
      const bundle: Record<string, unknown> = {
        _meta: {
          user_id: user?.id,
          email: user?.email,
          exported_at: new Date().toISOString(),
          app: 'Meus Links',
          version: 1,
          tables,
        },
      };
      const newCounts: Partial<Record<TableName, number>> = { ...counts };
      const needsDecrypt = tables.includes('vault_items') || tables.includes('site_credentials');
      let decrypted: { vault_items: unknown[]; site_credentials: unknown[] } | null = null;
      if (needsDecrypt) {
        try { decrypted = await fetchDecrypted(); } catch (e) {
          toast({ title: 'Aviso', description: `Falha ao descriptografar: ${(e as Error).message}`, variant: 'destructive' });
        }
      }
      for (const name of tables) {
        try {
          let rows: Record<string, unknown>[];
          if ((name === 'vault_items' || name === 'site_credentials') && decrypted) {
            rows = (decrypted[name] ?? []) as Record<string, unknown>[];
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).from(name).select('*');
            if (error) throw new Error(error.message);
            rows = (data ?? []) as Record<string, unknown>[];
          }
          bundle[name] = rows;
          newCounts[name] = rows.length;
        } catch (e) {
          bundle[name] = { error: (e as Error).message };
          newCounts[name] = 0;
        }
      }
      setCounts(newCounts);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      download(`${filenamePrefix}_${stamp}.json`, JSON.stringify(bundle, null, 2));
      toast({ title: 'Backup baixado', description: `${tables.length} tabela(s)` });
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 h-12 border-b border-foreground/10 bg-card/80 backdrop-blur flex items-center gap-2 px-3">
        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
          <RouterLink to="/" title="Voltar"><ArrowLeft className="h-4 w-4" /></RouterLink>
        </Button>
        <Database className="h-4 w-4 text-primary" />
        <h1 className="font-mono font-black tracking-wide text-sm">ADM · BACKUP</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl neo-accent flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base sm:text-lg tracking-tight">Backup</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Marque as tabelas que deseja incluir e baixe em um único JSON. Cofre e Senhas
                    saem <strong>descriptografados</strong> — guarde o arquivo em local muito seguro.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => downloadBundle(Array.from(selected), 'meuslinks_backup')}
                  disabled={!!busy || selected.size === 0}
                  className="flex-1 min-w-[180px]"
                >
                  {busy === '__bundle__'
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Empacotando…</>
                    : <><Download className="h-4 w-4 mr-2" /> Baixar seleção ({selected.size})</>}
                </Button>
                <Button
                  onClick={() => downloadBundle(TABLES.map((t) => t.name), 'meuslinks_backup_completo')}
                  disabled={!!busy}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" /> Todos juntos
                </Button>
              </div>
              <div className="flex gap-2 text-[11px]">
                <button onClick={selectAll} className="text-primary hover:underline" disabled={!!busy}>Marcar tudo</button>
                <span className="text-muted-foreground">·</span>
                <button onClick={selectNone} className="text-primary hover:underline" disabled={!!busy}>Desmarcar tudo</button>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 font-semibold mb-3 px-1">
              Tabelas
            </h3>
            <div className="grid gap-2">
              {TABLES.map((t) => (
                <Card key={t.name}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.name)}
                      onChange={() => toggle(t.name)}
                      disabled={!!busy}
                      className="h-4 w-4 accent-primary shrink-0"
                      aria-label={`Selecionar ${t.name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-primary uppercase tracking-wide">{t.name}</div>
                      <div className="text-sm truncate">{t.label}</div>
                      {counts[t.name] !== undefined && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {counts[t.name]} registro(s)
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => downloadOne(t.name, 'json')}
                      disabled={!!busy}
                      className="h-8 gap-1 text-[11px]"
                    >
                      {busy === t.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      JSON
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => downloadOne(t.name, 'csv')}
                      disabled={!!busy}
                      className="h-8 gap-1 text-[11px]"
                    >
                      <Download className="h-3 w-3" /> CSV
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
