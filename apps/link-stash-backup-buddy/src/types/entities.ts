// Tipos compartilhados das entidades do banco — evita `interface` duplicada em cada página.
import type { Tables } from '@/integrations/supabase/types';

export type Note = Pick<Tables<'notes'>, 'id' | 'title' | 'content' | 'is_pinned' | 'updated_at'>;

export type Reminder = Pick<
  Tables<'payment_reminders'>,
  'id' | 'name' | 'amount' | 'last_paid_at' | 'interval_days' | 'notes'
>;

export type Prompt = Pick<
  Tables<'ai_prompts'>,
  'id' | 'title' | 'content' | 'target_model' | 'tags' | 'updated_at'
>;
