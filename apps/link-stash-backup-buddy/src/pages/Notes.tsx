import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/PageHeader';
import ConfirmDialog from '@/components/ConfirmDialog';
import NotesSidebar from '@/components/notes/NotesSidebar';
import NoteEditor from '@/components/notes/NoteEditor';
import { useAsyncList, withToast } from '@/hooks/useAsyncList';
import { useNoteAutosave } from '@/hooks/useNoteAutosave';
import type { Note } from '@/types/entities';

export default function Notes() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: '', content: '' });
  const [toDelete, setToDelete] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    if (!user) return [];
    return withToast<Note[]>(
      supabase
        .from('notes')
        .select('id,title,content,is_pinned,updated_at')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false }),
    );
  }, [user]);

  const { items, setItems, loading, reload } = useAsyncList<Note>({
    fetcher,
    deps: [user?.id],
    enabled: !!user,
  });

  const { savedAt, resetSavedAt } = useNoteAutosave({
    activeId,
    notes: items,
    draft,
    onSaved: (updated) => setItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n))),
  });

  function selectNote(n: Note) {
    setActiveId(n.id);
    setDraft({ title: n.title, content: n.content });
    resetSavedAt();
  }

  async function createNote() {
    if (!user) return;
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: '', content: '' })
      .select('id,title,content,is_pinned,updated_at')
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const created = data as Note;
    setItems((prev) => [created, ...prev]);
    selectNote(created);
  }

  async function togglePin(n: Note) {
    const { error } = await supabase.from('notes').update({ is_pinned: !n.is_pinned }).eq('id', n.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    reload();
  }

  async function confirmDelete() {
    const id = toDelete;
    setToDelete(null);
    if (!id) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setDraft({ title: '', content: '' });
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [items, query]);

  const active = items.find((n) => n.id === activeId) ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageHeader crumb="/ notas" />

      <div className="flex-1 flex min-h-0">
        <NotesSidebar
          notes={filtered}
          loading={loading}
          activeId={activeId}
          query={query}
          onQueryChange={setQuery}
          onSelect={selectNote}
          onCreate={createNote}
        />
        <NoteEditor
          note={active}
          draft={draft}
          savedAt={savedAt}
          onDraftChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onTogglePin={togglePin}
          onDelete={setToDelete}
          onCreate={createNote}
        />
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir esta nota?"
        confirmLabel="Excluir"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
