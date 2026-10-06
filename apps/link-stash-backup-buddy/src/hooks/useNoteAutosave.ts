import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants';
import type { Note } from '@/types/entities';

interface Params {
  activeId: string | null;
  notes: Note[];
  draft: { title: string; content: string };
  onSaved: (updated: Note) => void;
}

/**
 * Autosave debounced. Só grava quando o draft difere da nota persistida
 * — evita escritas fantasmas ao apenas trocar de nota.
 */
export function useNoteAutosave({ activeId, notes, draft, onSaved }: Params) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!activeId) return;
    const current = notes.find((n) => n.id === activeId);
    if (!current) return;
    if (current.title === draft.title && current.content === draft.content) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('notes')
        .update({ title: draft.title, content: draft.content })
        .eq('id', activeId);
      if (error) {
        toast.error(error.message);
        return;
      }
      setSavedAt(new Date());
      onSaved({ ...current, title: draft.title, content: draft.content });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, draft.title, draft.content]);

  const resetSavedAt = () => setSavedAt(null);
  return { savedAt, resetSavedAt };
}
