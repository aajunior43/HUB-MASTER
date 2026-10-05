import { Pin, PinOff, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Note } from '@/types/entities';

interface Props {
  note: Note | null;
  draft: { title: string; content: string };
  savedAt: Date | null;
  onDraftChange: (patch: Partial<{ title: string; content: string }>) => void;
  onTogglePin: (n: Note) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export default function NoteEditor({
  note,
  draft,
  savedAt,
  onDraftChange,
  onTogglePin,
  onDelete,
  onCreate,
}: Props) {
  if (!note) {
    return (
      <section className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-muted-foreground">
          <StickyNote className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Selecione ou crie uma nota</p>
          <Button size="sm" className="mt-4" onClick={onCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nova nota
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 p-3 border-b border-foreground/10">
        <Input
          value={draft.title}
          onChange={(e) => onDraftChange({ title: e.target.value })}
          placeholder="Título da nota"
          className="border-0 bg-transparent focus-visible:ring-0 text-base font-semibold px-0"
        />
        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
          {savedAt ? `salvo ${savedAt.toLocaleTimeString()}` : ''}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onTogglePin(note)}
          title={note.is_pinned ? 'Desafixar' : 'Fixar'}
        >
          {note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => onDelete(note.id)}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={draft.content}
        onChange={(e) => onDraftChange({ content: e.target.value })}
        placeholder="Escreva sua nota..."
        className="flex-1 border-0 rounded-none bg-transparent focus-visible:ring-0 resize-none font-mono text-sm p-4"
      />
    </section>
  );
}
