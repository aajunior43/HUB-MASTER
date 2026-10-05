import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Eye, EyeOff, Copy, Trash2, KeyRound, ArrowLeft, Pencil } from 'lucide-react';

interface VaultItem {
  id: string;
  name: string;
  service: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = { name: '', service: '', notes: '', value: '' };

export default function Vault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<VaultItem[]>([]);
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
      .from('vault_items')
      .select('id, name, service, notes, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setItems(data as VaultItem[]);
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
  const openEdit = (item: VaultItem) => {
    setEditingId(item.id);
    setForm({ name: item.name, service: item.service ?? '', notes: item.notes ?? '', value: '' });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    if (!editingId && !form.value.trim()) { toast({ title: 'Valor obrigatório', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      await callVault({
        action: editingId ? 'update' : 'create',
        id: editingId ?? undefined,
        name: form.name.trim(),
        service: form.service.trim() || null,
        notes: form.notes.trim() || null,
        value: form.value ? form.value : undefined,
      });
      toast({ title: editingId ? 'Atualizado' : 'Chave salva' });
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
      const res = await callVault({ action: 'reveal', id });
      setRevealed((r) => ({ ...r, [id]: (res as { value: string }).value }));
    } catch (e) {
      toast({ title: 'Erro ao revelar', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const copy = async (id: string) => {
    setBusyId(id);
    try {
      const res = await callVault({ action: 'reveal', id });
      await navigator.clipboard.writeText((res as { value: string }).value);
      toast({ title: 'Copiado para a área de transferência' });
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusyId(null); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta chave? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('vault_items').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { setItems((it) => it.filter((x) => x.id !== id)); toast({ title: 'Removido' }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-12 border-b border-foreground/10 bg-card/80 backdrop-blur flex items-center gap-2 px-3">
        <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
          <RouterLink to="/" title="Voltar"><ArrowLeft className="h-4 w-4" /></RouterLink>
        </Button>
        <KeyRound className="h-4 w-4 text-primary" />
        <h1 className="font-mono font-black tracking-wide text-sm">COFRE DE CHAVES</h1>
        <div className="flex-1" />
        <Button onClick={openCreate} size="sm" className="h-7 gap-1 text-[11px] font-black">
          <Plus className="h-3.5 w-3.5" /> NOVA
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && items.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <KeyRound className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma chave salva. Adicione sua primeira API key ou token.</p>
              <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova chave</Button>
            </CardContent>
          </Card>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-black truncate">{item.name}</CardTitle>
                  {item.service && <p className="text-[11px] text-muted-foreground truncate">{item.service}</p>}
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
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-muted/40 rounded px-2 py-1.5 truncate">
                  {revealed[item.id] ?? '••••••••••••••••••••'}
                </code>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busyId === item.id} onClick={() => reveal(item.id)} title={revealed[item.id] ? 'Ocultar' : 'Revelar'}>
                  {revealed[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={busyId === item.id} onClick={() => copy(item.id)} title="Copiar">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              {item.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar chave' : 'Nova chave'}</DialogTitle>
            <DialogDescription>
              O valor é criptografado no servidor. Deixe em branco para manter o valor atual ao editar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: OpenAI produção" maxLength={200} />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Serviço</label>
              <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="Ex: OpenAI, GitHub, Stripe" maxLength={120} />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                Valor {editingId && <span className="text-muted-foreground/70">(deixe vazio para manter)</span>}
              </label>
              <Input type="password" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="sk-..." autoComplete="new-password" />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase tracking-wide text-muted-foreground">Notas</label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={2000} placeholder="Escopos, ambiente, referências…" />
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
