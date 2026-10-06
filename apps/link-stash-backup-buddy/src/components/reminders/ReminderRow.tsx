import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { daysUntilNext } from '@/lib/date';
import { REMINDER_WARN_DAYS } from '@/lib/constants';
import type { Reminder } from '@/types/entities';

interface Props {
  reminder: Reminder;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ReminderRow({ reminder, onMarkPaid, onDelete }: Props) {
  const { diff, nextDate } = daysUntilNext(reminder.last_paid_at, reminder.interval_days);
  const overdue = diff < 0;
  const soon = diff >= 0 && diff <= REMINDER_WARN_DAYS;
  const color = overdue ? 'text-destructive' : soon ? 'text-yellow-400' : 'text-primary';

  return (
    <li className="rounded-2xl border border-foreground/10 bg-card p-4 flex items-center gap-4">
      <div className="text-center shrink-0 w-16">
        <div className={`font-mono font-black text-2xl leading-none ${color}`}>
          {overdue ? `+${Math.abs(diff)}` : diff}
        </div>
        <div className="text-[10px] uppercase text-muted-foreground mt-1">
          {overdue ? 'atrasado' : 'dias'}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate">{reminder.name}</span>
          {reminder.amount != null && (
            <span className="text-xs font-mono text-muted-foreground">R$ {reminder.amount.toFixed(2)}</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          Próx: {nextDate.toLocaleDateString('pt-BR')} · a cada {reminder.interval_days}d
        </div>
        {reminder.notes && <div className="text-[11px] text-muted-foreground mt-1 truncate">{reminder.notes}</div>}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Marcar como pago hoje" onClick={() => onMarkPaid(reminder.id)}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Excluir" onClick={() => onDelete(reminder.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
