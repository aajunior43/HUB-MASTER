
import { memo, useState, useRef, type MouseEvent, type KeyboardEvent } from 'react';
import { ExternalLink, Trash2, Calendar, Edit, Check, Star, Copy, Archive, RotateCcw, AlertTriangle, Pin, PinOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader } from '@/components/ui/card';
import { GlowCard } from '@/components/ui/spotlight-card';
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

interface Link {
  id: string; title: string; url: string; createdAt: string;
  categoryId?: string; description?: string | null;
  is_archived?: boolean; is_pinned?: boolean;
}

interface LinkCardProps {
  link: Link; onRemove: (id: string) => void; onEdit: (link: Link) => void;
  onUpdate: (linkId: string, updates: { description?: string; title?: string }) => void;
  onArchive?: (id: string) => void; onUnarchive?: (id: string) => void;
  onPin?: (id: string) => void; onUnpin?: (id: string) => void;
  isSelected?: boolean; isSelectionMode?: boolean; onToggleSelection?: () => void;
  isBroken?: boolean; isArchived?: boolean;
}

const isNewLink = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;

export const LinkCard = memo(({
  link, onRemove, onEdit, onUpdate, onArchive, onUnarchive, onPin, onUnpin,
  isSelected = false, isSelectionMode = false, onToggleSelection,
  isBroken = false, isArchived = false,
}: LinkCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(link.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { categories } = useCategories();
  const { isFavorite, toggleFavorite } = useFavorites();

  const category = categories.find(cat => cat.id === link.categoryId);
  const linkIsFavorite = isFavorite(link.id);
  const isNew = isNewLink(link.createdAt);

  const getCategoryStripClass = (color: string) => {
    const map: Record<string, string> = {
      green: 'bg-green-400', blue: 'bg-blue-400', yellow: 'bg-yellow-400',
      red: 'bg-red-400', purple: 'bg-purple-400', pink: 'bg-pink-400',
      cyan: 'bg-cyan-400', orange: 'bg-orange-400',
    };
    return map[color] || 'bg-gray-400';
  };

  const handleVisit = () => {
    if (editingTitle) return;
    if (isSelectionMode && onToggleSelection) { onToggleSelection(); return; }
    let u = link.url;
    if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
    window.open(u, '_blank', 'noopener,noreferrer');
  };

  const handleTitleDoubleClick = (e: MouseEvent) => {
    if (isSelectionMode) return;
    e.stopPropagation();
    setTitleDraft(link.title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 10);
  };

  const commitTitle = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft.trim() !== link.title) {
      onUpdate(link.id, { title: titleDraft.trim() });
    } else {
      setTitleDraft(link.title);
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commitTitle();
    if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(link.title); }
  };

  const handleDelete = () => { onRemove(link.id); setShowDeleteDialog(false); };
  const handleToggleFavorite = (e: MouseEvent) => { e.stopPropagation(); toggleFavorite(link.id); };
  const handleCopy = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(link.url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
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
    <GlowCard customSize glowColor="gold" className={`link-surface link-surface--grid group h-full flex flex-col overflow-hidden bg-card border-border/25 shadow-neo hover:border-primary/25 hover:-translate-y-0.5 hover:shadow-neo-glow transition-all duration-200 ${
      isSelected ? 'bg-accent/20 ring-2 ring-primary' : ''
    } ${linkIsFavorite ? 'border-accent' : ''} ${isSelectionMode ? 'cursor-pointer' : ''} ${
      isBroken ? 'border-destructive/60' : ''
    } ${link.is_pinned ? 'ring-1 ring-primary/40' : ''}`}>

      {category && <div className={`h-1 shrink-0 ${getCategoryStripClass(category.color)}`} />}

      <CardHeader className="pb-2 px-4 pt-3.5 cursor-pointer" onClick={isSelectionMode ? onToggleSelection : handleVisit}>
        <div className="flex items-start gap-3 min-w-0">
          {isSelectionMode && (
            <div className={`w-4 h-4 mt-1 rounded border-2 border-foreground flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary' : 'bg-background'}`}>
              {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
            </div>
          )}
          <div className="relative shrink-0">
            <FaviconIcon url={link.url} className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-foreground/20 shrink-0" size={40} />
            {isBroken && <AlertTriangle className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-destructive fill-destructive/20" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1 min-w-0">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={handleTitleKeyDown}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 w-full text-sm sm:text-sm font-black bg-background border-b-2 border-primary outline-none leading-tight font-sans"
                  autoFocus
                />
              ) : (
                <h3
                  className="flex-1 min-w-0 w-full text-base sm:text-sm font-bold text-foreground leading-snug line-clamp-2 break-words font-sans"
                  onDoubleClick={handleTitleDoubleClick}
                  title="Clique duplo para editar"
                >
                  {link.title}
                </h3>
              )}
              {isNew && !isArchived && (
                <span className="shrink-0 text-[8px] font-black bg-green-400 text-white px-1 py-0.5 rounded leading-none mt-0.5">NOVO</span>
              )}
              {linkIsFavorite && <Star className="h-3 w-3 text-accent fill-accent flex-shrink-0 mt-0.5" />}
            </div>
            <span className="text-sm sm:text-xs font-medium text-muted-foreground truncate block mt-1 font-sans">
              {getDomainCached(link.url)}
            </span>
            {link.description && (
              <p className="text-sm sm:text-xs text-muted-foreground mt-1 line-clamp-1 font-normal leading-snug font-sans">{link.description}</p>
            )}
          </div>

          {!isSelectionMode && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleToggleFavorite}
                className={`hidden sm:flex h-7 w-7 p-0 ${linkIsFavorite ? 'text-accent' : 'text-muted-foreground'}`}
                aria-label={linkIsFavorite ? 'Remover favorito' : 'Favoritar'}>
                <Star className={`h-3.5 w-3.5 ${linkIsFavorite ? 'fill-current' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={e => e.stopPropagation()}
                    className="h-7 w-7 p-0 text-muted-foreground" aria-label="Mais ações">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={e => e.stopPropagation()} className="w-44">
                  {(onPin || onUnpin) && (
                    <DropdownMenuItem onClick={handlePin}>
                      {link.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      {link.is_pinned ? 'Desafixar' : 'Fixar no topo'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleCopy}>
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar URL'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(link); }}>
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                  {(onArchive || onUnarchive) && (
                    <DropdownMenuItem onClick={handleArchive}>
                      {isArchived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {isArchived ? 'Restaurar' : 'Arquivar'}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={e => { e.stopPropagation(); setShowDeleteDialog(true); }}
                    className="text-destructive focus:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mover para Lixeira</AlertDialogTitle>
                    <AlertDialogDescription>
                      "<span className="font-bold">{link.title}</span>" será movido para a lixeira. Você pode desfazer em 5 segundos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-3 mt-auto" onClick={isSelectionMode ? onToggleSelection : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-muted-foreground font-medium">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{formatDateCached(link.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            {!isSelectionMode && (
              <Button onClick={handleVisit} size="sm" className="bg-accent text-accent-foreground text-xs h-7 px-2.5 gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="sm:hidden">Abrir</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </GlowCard>
  );
});
LinkCard.displayName = 'LinkCard';
