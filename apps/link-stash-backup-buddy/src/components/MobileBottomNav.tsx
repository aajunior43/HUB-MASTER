import { Grid3X3, List, AlignJustify, Star, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  showArchive: boolean;
  onShowAll: () => void;
  showOnlyFavorites: boolean;
  onToggleFavorites: () => void;
  onAddLink: () => void;
  viewMode: 'grid' | 'list' | 'compact';
  onToggleView: () => void;
  activeCount: number;
}

export const MobileBottomNav = ({
  showArchive, onShowAll,
  showOnlyFavorites, onToggleFavorites,
  onAddLink, viewMode, onToggleView,
  activeCount,
}: MobileBottomNavProps) => {
  const tab = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number) => (
    <button
      onClick={onClick}
      className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
    >
      <span className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-black leading-none rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-[9px] font-black tracking-wide leading-none">{label}</span>
      {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b-full" />}
    </button>
  );

  const viewIcon = viewMode === 'grid' ? <List className="h-4 w-4" /> : viewMode === 'list' ? <AlignJustify className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />;
  const viewLabel = viewMode === 'grid' ? 'Lista' : viewMode === 'list' ? 'Comp.' : 'Grade';

  return (
    <nav className="mobile-bottom-nav md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border/25 flex items-stretch h-14 shadow-[0_-8px_20px_hsl(var(--neo-dark)/0.65),inset_0_1px_0_hsl(var(--neo-light)/0.25)]">
      {tab(!showArchive && !showOnlyFavorites, onShowAll, <Grid3X3 className="h-4 w-4" />, 'Links', activeCount)}
      {tab(!showArchive && showOnlyFavorites, onToggleFavorites, <Star className={cn('h-4 w-4', !showArchive && showOnlyFavorites ? 'fill-current' : '')} />, 'Favs')}
      <div className="flex items-center justify-center px-2">
        <button onClick={onAddLink} aria-label="Adicionar link"
          className="mobile-add-button w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(var(--primary-glow))] to-accent text-accent-foreground shadow-neo flex items-center justify-center active:scale-95 active:shadow-neo-inset transition-all">
          <Plus className="h-5 w-5" strokeWidth={3} />
        </button>
      </div>
      {tab(false, onToggleView, viewIcon, viewLabel)}
    </nav>
  );
};
