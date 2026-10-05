
import { memo, useState, type MouseEvent } from 'react';
import { ExternalLink, Trash2, Calendar, Edit, Check, Star, Copy, Archive, RotateCcw, AlertTriangle, Pin, PinOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
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
  categoryId?: string; description?: string; is_pinned?: boolean;
}

interface LinkListItemProps {
  link: Link; onRemove: (id: string) => void; onEdit: (link: Link) => void;
  onUpdate: (linkId: string, updates: { description?: string }) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  isSelected?: boolean; isSelectionMode?: boolean; onToggleSelection?: () => void;
  isBroken?: boolean;
  isArchived?: boolean;
}

const isNewLink = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;

export const LinkListItem = memo(({
  link, onRemove, onEdit, onUpdate,
  onArchive, onUnarchive, onPin, onUnpin,
  isSelected = false, isSelectionMode = false, onToggleSelection,
  isBroken = false, isArchived = false,
}: LinkListItemProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const { categories } = useCategories();
  const { isFavorite, toggleFavorite } = useFavorites();

  const category = categories.find(cat => cat.id === link.categoryId);
  const linkIsFavorite = isFavorite(link.id);
  const isNew = isNewLink(link.createdAt);

  const formatDate = formatDateCached;
  const getDomain = getDomainCached;

  const getCategoryColor = (color: string) => {
    const map: Record<string, string> = {
      green: 'bg-accent text-accent-foreground',
      blue: 'bg-secondary text-secondary-foreground',
      yellow: 'bg-accent text-accent-foreground',
      red: 'bg-destructive text-destructive-foreground',
      purple: 'bg-primary text-primary-foreground',
      pink: 'bg-primary text-primary-foreground',
    };
    return map[color] || 'bg-muted text-foreground';
  };

  const handleVisit = () => {
    if (isSelectionMode && onToggleSelection) { onToggleSelection(); return; }
    let urlToOpen = link.url;
    if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://')) urlToOpen = 'https://' + urlToOpen;
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = () => { onRemove(link.id); setShowDeleteDialog(false); };
  const handleEdit = () => { onEdit(link); };
  const handleToggleFavorite = (e: MouseEvent) => { e.stopPropagation(); toggleFavorite(link.id); };

  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleArchive = (e: MouseEvent) => {
    e.stopPropagation();
    if (isArchived && onUnarchive) onUnarchive(link.id);
    else if (!isArchived && onArchive) onArchive(link.id);
  };

  const handlePin = (e: MouseEvent) => {
    e.stopPropagation();
    if (link.is_pinned && onUnpin) onUnpin(link.id);
    else if (!link.is_pinned && onPin) onPin(link.id);
  };

  return (
    <div className={cn(
      'link-surface link-surface--list group flex flex-wrap items-center gap-3 sm:gap-4 p-3.5 border border-border/25 rounded-2xl bg-card shadow-neo-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-neo min-h-[72px]',
      isSelected && 'bg-accent/20 ring-2 ring-primary',
      linkIsFavorite && 'border-accent',
      isSelectionMode && 'cursor-pointer',
      isBroken && 'border-destructive/60',
      link.is_pinned && 'border-l-4 border-l-primary',
    )}
    onClick={isSelectionMode ? onToggleSelection : undefined}>

      {isSelectionMode && (
        <div className={`w-5 h-5 rounded border-2 border-foreground flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-primary' : 'bg-background'
        }`}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}

      <div className="relative shrink-0">
        <FaviconIcon url={link.url} className="w-8 h-8 border border-border/70 rounded-lg shadow-sm" />
        {isBroken && (
          <AlertTriangle className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-destructive fill-destructive/20" />
        )}
      </div>

        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
          <h3 className="text-foreground truncate text-base font-semibold tracking-wide">{link.title}</h3>
          {isNew && !isArchived && <span className="text-[8px] font-black bg-green-400 text-white px-1 py-0.5 rounded leading-none shrink-0">NOVO</span>}
          {link.is_pinned && <Pin className="h-3.5 w-3.5 text-primary fill-primary/20 flex-shrink-0" />}
          {linkIsFavorite && <Star className="h-4 w-4 text-accent fill-accent flex-shrink-0" />}
          {category && (
            <Badge className={getCategoryColor(category.color)}>{category.name}</Badge>
          )}
        </div>
        {link.description && (
          <p className="mt-1 text-sm text-muted-foreground font-normal line-clamp-2">{link.description}</p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground font-bold">
          <span className="truncate">{getDomain(link.url)}</span>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(link.createdAt)}
          </div>
        </div>
      </div>

      {!isSelectionMode && (
        <div className="flex w-full justify-end items-center gap-1.5 pt-2.5 mt-1 border-t border-border/60 sm:w-auto sm:justify-start sm:pt-0 sm:mt-0 sm:border-0 shrink-0">
          {!isArchived && (onPin || onUnpin) && (
            <Button variant="ghost" size="sm" onClick={handlePin}
              className={`hidden sm:flex h-7 w-7 p-0 ${link.is_pinned ? 'text-primary' : 'text-muted-foreground'}`}
              title={link.is_pinned ? 'Desafixar' : 'Fixar no topo'}>
              {link.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </Button>
          )}
          {!isArchived && (
            <Button variant="ghost" size="sm" onClick={handleToggleFavorite}
              aria-label={linkIsFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className={`h-7 w-7 p-0 ${linkIsFavorite ? 'text-accent' : 'text-muted-foreground'}`}>
              <Star className={`h-4 w-4 ${linkIsFavorite ? 'fill-accent' : ''}`} />
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={handleCopy} className="hidden sm:flex h-7 w-7 p-0 text-muted-foreground" title="Copiar URL">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>

          {(onArchive || onUnarchive) && (
            <Button variant="ghost" size="sm" onClick={handleArchive} className="hidden sm:flex h-7 w-7 p-0 text-muted-foreground" title={isArchived ? 'Restaurar' : 'Arquivar'}>
              {isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
          )}

          {!isArchived && (
            <Button variant="ghost" size="sm" onClick={handleEdit} aria-label="Editar link" className="hidden sm:flex h-7 w-7 p-0">
              <Edit className="h-4 w-4" />
            </Button>
          )}

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Excluir link" className="hidden sm:flex text-destructive h-7 w-7 p-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Excluir "<span className="font-bold">{link.title}</span>"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="sm:hidden h-8 w-8 p-0" aria-label="Mais ações">
                <MoreVertical className="h-4 w-4" />
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
                <DropdownMenuItem onClick={handleEdit}>
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
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleVisit} size="sm" className="bg-accent text-accent-foreground text-sm h-8 px-3">
            <ExternalLink className="h-4 w-4 sm:mr-1" />
            <span>Abrir</span>
          </Button>
        </div>
      )}
    </div>
  );
});
LinkListItem.displayName = 'LinkListItem';
