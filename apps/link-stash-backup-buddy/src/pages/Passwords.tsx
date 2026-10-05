import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Eye, EyeOff, Copy, Trash2, Lock, ArrowLeft, Pencil, ExternalLink, User,
} from 'lucide-react';

interface SiteCredential {
  id: string;
  name: string;
  url: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = { name: '', url: '', username: '', password: '' };

export default function Passwords() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<SiteCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string | undefined>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_credentials')
      .select('id, name, url, username, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setItems((data ?? []) as SiteCredential[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const callVault = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('vault', { body });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, unknown>;
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (item: SiteCredential) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      url: item.url ?? '',
      username: item.username ?? '',
      password: '',
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    if (!editingId && !form.password.trim()) { toast({ title: 'Senha obrigatória', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      await callVault({
        action: editingId ? 'site.update' : 'site.create',
        id: editingId ?? undefined,
        name: form.name.trim(),
        url: form.url.trim() || null,
        username: form.username.trim() || null,
        password: form.password ? form.password : undefined,
      });
      toast({ title: editingId ? 'Atualizada' : 'Credencial salva' });
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  const reveal = async (id: string) => {
    if (revealed[id]) { setRevealed((r) => ({ ...r, [id]: undefined })); return; }
    setBusyId(id);
    try {
      const res = await callVault({ action: 'site.reveal', id });
      setRevealed((r) => ({ ...r, [id]: (res as { value: string }).value }));
    } catch (e) {
      toast({ title: 'Erro ao revelar', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const copyPassword = async (id: string) => {
    setBusyId(id);
    try {
      const res = await callVault({ action: 'site.reveal', id });
      await navigator.clipboard.writeText((res as { value: string }).value);
      toast({ title: 'Senha copiada' });
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const copyText = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: `${label} copiado` }); }
    catch { toast({ title: 'Erro ao copiar', variant: 'destructive' }); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta credencial? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('site_credentials').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { setItems((it) => it.filter((x) => x.id !== id)); toast({ title: 'Removida' }); }
  };

  const normalizeUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-12 border-b border-foreground/10 bg-card/80 backdrop-blur flex items-center gap-2 px-3">
        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
          <RouterLink to="/" title="Voltar"><ArrowLeft className="h-4 w-4" /></RouterLink>
        </Button>
        <Lock className="h-4 w-4 text-primary shrink-0" />
        <h1 className="font-mono font-black tracking-wide text-sm truncate min-w-0">COFRE DE SENHAS</h1>
        <div className="flex-1" />
        <Button onClick={openCreate} size="sm" className="h-7 gap-1 text-[11px] font-black shrink-0">
          <Plus className="h-3.5 w-3.5" /> NOVA
        </Button>
      </header>

      <button
        onClick={openCreate}
        aria-label="Nova credencial"
        className="md:hidden fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" strokeWidth={3} />
      </button>


      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma credencial salva. Adicione sua primeira senha de site.</p>
              <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova credencial</Button>
            </CardContent>
          </Card>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm font-black truncate">{item.name}</CardTitle>
                  {item.url && (
                    <a
                      href={normalizeUrl(item.url)}
                      target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 truncate max-w-full"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(item)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(item.id)} title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {item.username && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="flex-1 font-mono text-xs bg-muted/40 rounded px-2 py-1.5 truncate">{item.username}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(item.username!, 'Usuário')} title="Copiar usuário">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <code className="flex-1 font-mono text-xs bg-muted/40 rounded px-2 py-1.5 truncate">
                  {revealed[item.id] ?? '••••••••••••••••••••'}
                </code>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busyId === item.id} onClick={() => reveal(item.id)} title={revealed[item.id] ? 'Ocultar' : 'Revelar'}>
                  {revealed[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busyId === item.id} onClick={() => copyPassword(item.id)} title="Copiar senha">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
            <DialogDescription>
              A senha é criptografada no servidor. Deixe em branco para manter a senha atual ao editar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: GitHub pessoal" maxLength={200} />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">URL do site</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="github.com" maxLength={500} />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Usuário / Email</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="voce@email.com" maxLength={200} autoComplete="off" />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                Senha {editingId && <span className="text-muted-foreground/70">(deixe vazio para manter)</span>}
              </label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
