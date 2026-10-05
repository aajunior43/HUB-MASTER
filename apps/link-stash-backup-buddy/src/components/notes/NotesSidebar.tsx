import { Pin, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Note } from '@/types/entities';

interface Props {
  notes: Note[];
  loading: boolean;
  activeId: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (n: Note) => void;
  onCreate: () => void;
}

export default function NotesSidebar({
  notes,
  loading,
  activeId,
  query,
  onQueryChange,
  onSelect,
  onCreate,
}: Props) {
  return (
    <aside className="w-64 sm:w-72 border-r border-foreground/10 bg-card/40 flex flex-col min-h-0">
      <div className="p-3 flex items-center gap-2 border-b border-foreground/10">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button size="sm" className="h-8 w-8 p-0" onClick={onCreate} title="Nova nota">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ul className="flex-1 overflow-auto">
        {loading ? (
          <li className="p-4 text-xs text-muted-foreground">Carregando...</li>
        ) : notes.length === 0 ? (
          <li className="p-4 text-xs text-muted-foreground text-center">
            {query ? 'Nenhum resultado.' : 'Sem notas ainda.'}
          </li>
        ) : (
          notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => onSelect(n)}
                className={`w-full text-left px-3 py-2.5 border-b border-foreground/5 hover:bg-foreground/5 transition ${
                  activeId === n.id ? 'bg-foreground/5' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {n.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                  <span className="font-semibold text-sm truncate">
                    {n.title.trim() || 'Sem título'}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {n.content.split('\n')[0] || 'Vazio'}
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
