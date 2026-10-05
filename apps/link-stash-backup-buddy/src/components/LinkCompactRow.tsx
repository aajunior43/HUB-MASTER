import { memo, useState, type MouseEvent } from 'react';
import { ExternalLink, Trash2, Edit, Check, Star, Copy, Archive, RotateCcw, AlertTriangle, Pin, PinOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCategories } from '@/hooks/useCategories';
import { useFavorites } from '@/hooks/useFavorites';
import { FaviconIcon } from './FaviconIcon';
import { getDomainCached, formatDateCached } from '@/lib/linkUtils';
import { cn } from '@/lib/utils';

interface Link {
  id: string; title: string; url: string; createdAt: string;
  categoryId?: string; description?: string | null; is_pinned?: boolean;
}

interface Props {
  link: Link; onRemove: (id: string) => void; onEdit: (link: Link) => void;
  onUpdate: (linkId: string, updates: { description?: string }) => void;
  onArchive?: (id: string) => void; onUnarchive?: (id: string) => void;
  onPin?: (id: string) => void; onUnpin?: (id: string) => void;
  isSelected?: boolean; isSelectionMode?: boolean; onToggleSelection?: () => void;
  isBroken?: boolean; isArchived?: boolean;
}

export const LinkCompactRow = memo(({
  link, onRemove, onEdit, onArchive, onUnarchive, onPin, onUnpin,
  isSelected = false, isSelectionMode = false, onToggleSelection,
  isBroken = false, isArchived = false,
}: Props) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { categories } = useCategories();
  const { isFavorite, toggleFavorite } = useFavorites();

  const category = categories.find(c => c.id === link.categoryId);
  const linkIsFavorite = isFavorite(link.id);
  const isNew = Date.now() - new Date(link.createdAt).getTime() < 24 * 60 * 60 * 1000;

  const getCategoryDot = (color: string) => {
    const map: Record<string, string> = {
      green: 'bg-green-400', blue: 'bg-blue-400', yellow: 'bg-yellow-400',
      red: 'bg-red-400', purple: 'bg-purple-400', pink: 'bg-pink-400',
      cyan: 'bg-cyan-400', orange: 'bg-orange-400',
    };
    return map[color] || 'bg-gray-400';
  };

  const handleVisit = () => {
    if (isSelectionMode && onToggleSelection) { onToggleSelection(); return; }
    let u = link.url;
    if (!u.startsWith('http')) u = 'https://' + u;
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handlePin = (e: MouseEvent) => {
    e.stopPropagation();
    if (link.is_pinned && onUnpin) onUnpin(link.id);
    else if (!link.is_pinned && onPin) onPin(link.id);
  };

  const handleArchive = (e: MouseEvent) => {
    e.stopPropagation();
    if (isArchived && onUnarchive) onUnarchive(link.id);
    else if (!isArchived && onArchive) onArchive(link.id);
  };

  return (
    <div
      onClick={isSelectionMode ? onToggleSelection : undefined}
      className={cn(
        'link-surface link-surface--compact group flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-border/25 bg-card shadow-neo-sm hover:border-primary/20 hover:-translate-y-0.5 hover:shadow-neo transition-all duration-200 cursor-pointer',
        isSelected && 'bg-accent/20 border-primary',
        linkIsFavorite && 'border-l-2 border-l-accent',
        isBroken && 'border-l-2 border-l-destructive',
        link.is_pinned && 'border-l-2 border-l-primary',
        isSelectionMode && 'cursor-pointer',
      )}
    >
      {isSelectionMode && (
        <div className={`w-3.5 h-3.5 rounded border-2 border-foreground flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary' : 'bg-background'}`}>
          {isSelected && <Check className="h-2 w-2 text-primary-foreground" />}
        </div>
      )}

      <div className="relative shrink-0">
        <FaviconIcon url={link.url} size={14} className="w-4 h-4 rounded shrink-0" />
        {isBroken && <AlertTriangle className="absolute -top-1 -right-1 h-2.5 w-2.5 text-destructive fill-destructive/20" />}
      </div>

      {category && <div className={`w-1 h-4 rounded-full shrink-0 ${getCategoryDot(category.color)}`} />}

      <span
        onClick={isSelectionMode ? undefined : handleVisit}
        className="flex-1 min-w-0 text-[12px] font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
      >
        {link.title}
      </span>

      {isNew && <span className="text-[8px] font-black bg-green-400 text-white px-1 py-0.5 rounded leading-none shrink-0">N</span>}
      {linkIsFavorite && <Star className="h-2.5 w-2.5 text-accent fill-accent shrink-0" />}
      {link.is_pinned && <Pin className="h-2.5 w-2.5 text-primary fill-primary/20 shrink-0" />}

      <span className="hidden sm:block text-[10px] text-muted-foreground font-medium shrink-0 w-24 text-right truncate">
        {getDomainCached(link.url)}
      </span>
      <span className="hidden md:block text-[10px] text-muted-foreground font-medium shrink-0 w-20 text-right">
        {formatDateCached(link.createdAt)}
      </span>

      {!isSelectionMode && (
        <div className="flex items-center gap-0.5 shrink-0 pl-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(link.id); }}
            aria-label={linkIsFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title={linkIsFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={`h-7 w-7 rounded-lg p-0 ${linkIsFavorite ? 'text-accent bg-accent/10' : 'text-muted-foreground'}`}
          >
            <Star className={`h-3.5 w-3.5 ${linkIsFavorite ? 'fill-current' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleVisit(); }}
            aria-label={`Abrir ${link.title}`}
            title="Abrir link"
            className="h-7 w-7 rounded-lg p-0 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Mais ações para ${link.title}`}
                title="Mais ações"
                className="h-7 w-7 rounded-lg p-0 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(onPin || onUnpin) && (
                <DropdownMenuItem onClick={handlePin}>
                  {link.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  {link.is_pinned ? 'Desafixar' : 'Fixar no topo'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar URL'}
              </DropdownMenuItem>
              {!isArchived && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(link); }}>
                  <Edit className="h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              {(onArchive || onUnarchive) && (
                <DropdownMenuItem onClick={handleArchive}>
                  {isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  {isArchived ? 'Restaurar' : 'Arquivar'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>Excluir "<span className="font-bold">{link.title}</span>"?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => { onRemove(link.id); setShowDeleteDialog(false); }} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
});
LinkCompactRow.displayName = 'LinkCompactRow';
