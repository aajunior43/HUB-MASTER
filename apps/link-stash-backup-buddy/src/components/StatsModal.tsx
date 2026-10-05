import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart2, Link2, Star, Archive, Pin } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';

interface Link {
  id: string; url: string; created_at: string; is_favorite: boolean;
  is_archived: boolean; is_pinned: boolean; category_id?: string | null; tagIds?: string[];
  deleted_at?: string | null;
}

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  links: Link[];
}

const getDomain = (url: string) => {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
};

const Bar = ({ label, value, max, color = 'bg-accent' }: { label: string; value: number; max: number; color?: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-[11px] font-bold text-muted-foreground w-28 truncate shrink-0">{label}</span>
    <div className="flex-1 bg-muted rounded-sm h-4 overflow-hidden border border-foreground/10">
      <div className={`h-full ${color} transition-all`} style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
    <span className="text-[11px] font-black w-6 text-right shrink-0">{value}</span>
  </div>
);

export const StatsModal = ({ open, onClose, links }: StatsModalProps) => {
  const { categories } = useCategories();
  const active = links.filter(l => !l.is_archived && !l.deleted_at);

  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {};
    const now = Date.now();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now - i * 7 * 86400_000);
      weeks[`S${8 - i}`] = 0;
    }
    links.forEach(l => {
      const age = (now - new Date(l.created_at).getTime()) / 86400_000;
      const weekIdx = Math.floor(age / 7);
      if (weekIdx < 8) {
        const key = `S${8 - weekIdx}`;
        if (key in weeks) weeks[key]++;
      }
    });
    return Object.entries(weeks);
  }, [links]);

  const topDomains = useMemo(() => {
    const counts: Record<string, number> = {};
    active.forEach(l => { const d = getDomain(l.url); counts[d] = (counts[d] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [active]);

  const catData = useMemo(() => {
    const counts: Record<string, number> = { 'Sem categoria': 0 };
    active.forEach(l => {
      const cat = categories.find(c => c.id === l.category_id);
      const key = cat?.name ?? 'Sem categoria';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return Object.entries(counts).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [active, categories]);

  const maxWeek = Math.max(...weeklyData.map(([, v]) => v), 1);
  const maxDomain = Math.max(...topDomains.map(([, v]) => v), 1);
  const maxCat = Math.max(...catData.map(([, v]) => v), 1);

  const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
    <div className={`p-3 border-2 border-foreground rounded-lg bg-card shadow-[2px_2px_0px_0px_hsl(var(--foreground))]`}>
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black leading-none">{value}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent" /> Estatísticas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard icon={Link2} label="Total" value={links.length} color="text-foreground" />
            <StatCard icon={Link2} label="Ativos" value={active.length} color="text-primary" />
            <StatCard icon={Star} label="Favoritos" value={links.filter(l => l.is_favorite).length} color="text-yellow-500" />
            <StatCard icon={Archive} label="Arquivados" value={links.filter(l => l.is_archived).length} color="text-muted-foreground" />
          </div>

          {/* Weekly */}
          {weeklyData.some(([, v]) => v > 0) && (
            <div className="space-y-2">
              <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Links por semana</p>
              <div className="space-y-1.5">
                {weeklyData.map(([label, value]) => (
                  <Bar key={label} label={label} value={value} max={maxWeek} color="bg-primary" />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top domains */}
            {topDomains.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Top domínios</p>
                <div className="space-y-1.5">
                  {topDomains.map(([d, v]) => <Bar key={d} label={d} value={v} max={maxDomain} color="bg-accent" />)}
                </div>
              </div>
            )}

            {/* Categories */}
            {catData.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Categorias</p>
                <div className="space-y-1.5">
                  {catData.map(([c, v]) => <Bar key={c} label={c} value={v} max={maxCat} color="bg-secondary" />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
