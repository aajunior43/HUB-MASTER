import { Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Prompt } from '@/types/entities';

interface Props {
  prompt: Prompt;
  onCopy: (content: string) => void;
  onEdit: (p: Prompt) => void;
  onDelete: (id: string) => void;
}

export default function PromptCard({ prompt, onCopy, onEdit, onDelete }: Props) {
  return (
    <li className="rounded-2xl border border-foreground/10 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{prompt.title}</span>
            {prompt.target_model && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {prompt.target_model}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap font-mono">
            {prompt.content}
          </p>
          {prompt.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-2">
              {prompt.tags.map((t) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Copiar" onClick={() => onCopy(prompt.content)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Editar" onClick={() => onEdit(prompt)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Excluir" onClick={() => onDelete(prompt.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
