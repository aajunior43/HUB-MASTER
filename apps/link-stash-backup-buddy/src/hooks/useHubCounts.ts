import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HubCounts {
  links: number;
  vault: number;
  passwords: number;
  notes: number;
  reminders: number;
  prompts: number;
}

const EMPTY: HubCounts = { links: 0, vault: 0, passwords: 0, notes: 0, reminders: 0, prompts: 0 };

export function useHubCounts() {
  const [counts, setCounts] = useState<HubCounts>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) { setLoading(false); return; }

      const q = (table: 'links' | 'vault_items' | 'site_credentials' | 'notes' | 'payment_reminders' | 'ai_prompts') =>
        supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', uid);

      const [links, vault, pwd, notes, rem, prompts] = await Promise.all([
        q('links'), q('vault_items'), q('site_credentials'), q('notes'), q('payment_reminders'), q('ai_prompts'),
      ]);
      if (!alive) return;
      setCounts({
        links: links.count ?? 0,
        vault: vault.count ?? 0,
        passwords: pwd.count ?? 0,
        notes: notes.count ?? 0,
        reminders: rem.count ?? 0,
        prompts: prompts.count ?? 0,
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  return { counts, loading };
}
