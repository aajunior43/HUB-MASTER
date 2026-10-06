import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface ReminderFormValues {
  name: string;
  amount: string;
  last_paid_at: string;
  interval_days: string;
  notes: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const emptyReminderForm = (): ReminderFormValues => ({
  name: '',
  amount: '',
  last_paid_at: todayIso(),
  interval_days: '30',
  notes: '',
});

interface Props {
  onSubmit: (values: ReminderFormValues) => Promise<void> | void;
  onCancel: () => void;
}

export default function ReminderForm({ onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<ReminderFormValues>(emptyReminderForm);
  const set = <K extends keyof ReminderFormValues>(k: K, v: ReminderFormValues[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(form);
    setForm(emptyReminderForm());
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-foreground/10 bg-card p-4 mb-6 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome *</Label>
          <Input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Netflix, aluguel..." />
        </div>
        <div>
          <Label className="text-xs">Valor (opcional)</Label>
          <Input type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="39.90" />
        </div>
        <div>
          <Label className="text-xs">Último pagamento</Label>
          <Input type="date" required value={form.last_paid_at} onChange={(e) => set('last_paid_at', e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Intervalo (dias)</Label>
          <Input type="number" min="1" required value={form.interval_days} onChange={(e) => set('interval_days', e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Notas</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm">Salvar</Button>
      </div>
    </form>
  );
}
