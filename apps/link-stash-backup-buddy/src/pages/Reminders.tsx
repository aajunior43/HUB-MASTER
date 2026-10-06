import { useCallback, useMemo, useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import ReminderForm, { type ReminderFormValues } from '@/components/reminders/ReminderForm';
import ReminderRow from '@/components/reminders/ReminderRow';
import { useAsyncList, withToast } from '@/hooks/useAsyncList';
import { daysUntilNext } from '@/lib/date';
import type { Reminder } from '@/types/entities';

export default function Reminders() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    if (!user) return [];
    return withToast<Reminder[]>(
      supabase
        .from('payment_reminders')
        .select('id,name,amount,last_paid_at,interval_days,notes')
        .order('last_paid_at', { ascending: false }),
    );
  }, [user]);

  const { items, loading, reload } = useAsyncList<Reminder>({
    fetcher,
    deps: [user?.id],
    enabled: !!user,
  });

  async function handleCreate(values: ReminderFormValues) {
    if (!user) return;
    const { error } = await supabase.from('payment_reminders').insert({
      user_id: user.id,
      name: values.name.trim(),
      amount: values.amount ? Number(values.amount) : null,
      last_paid_at: values.last_paid_at,
      interval_days: Number(values.interval_days) || 30,
      notes: values.notes.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Lembrete criado');
    setShowForm(false);
    reload();
  }

  async function markPaid(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('payment_reminders').update({ last_paid_at: today }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marcado como pago hoje');
    reload();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from('payment_reminders').delete().eq('id', toDelete);
    setToDelete(null);
    if (error) { toast.error(error.message); return; }
    reload();
  }

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => daysUntilNext(a.last_paid_at, a.interval_days).diff - daysUntilNext(b.last_paid_at, b.interval_days).diff,
      ),
    [items],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader crumb="/ pagamentos" />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-mono font-black text-xl tracking-tight flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Contagem regressiva
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Assinaturas e pagamentos recorrentes</p>
          </div>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>

        {showForm && <ReminderForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-foreground/10 rounded-2xl">
            <p className="text-sm text-muted-foreground">Nenhum lembrete ainda.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((r) => (
              <ReminderRow key={r.id} reminder={r} onMarkPaid={markPaid} onDelete={setToDelete} />
            ))}
          </ul>
        )}
      </main>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir este lembrete?"
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
