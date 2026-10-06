import React, { useMemo } from 'react';
import { X, Globe } from 'lucide-react';

interface DomainFilterChipsProps {
  links: { url: string }[];
  activeDomain: string;
  onDomainChange: (domain: string) => void;
}

export const DomainFilterChips: React.FC<DomainFilterChipsProps> = ({
  links, activeDomain, onDomainChange,
}) => {
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach(link => {
      try {
        const domain = new URL(link.url.startsWith('http') ? link.url : `https://${link.url}`).hostname.replace('www.', '');
        counts[domain] = (counts[domain] || 0) + 1;
      } catch { /* skip */ }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [links]);

  if (domainCounts.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
      {activeDomain && (
        <button
          onClick={() => onDomainChange('')}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-md border-2 border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_hsl(var(--foreground))] shrink-0 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_hsl(var(--foreground))] transition-all"
        >
          {activeDomain}
          <X className="h-3 w-3" />
        </button>
      )}
      {!activeDomain && domainCounts.map(([domain, count], index) => (
        <button
          key={domain}
          onClick={() => onDomainChange(domain)}
          className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md border-2 border-foreground/20 bg-card hover:border-foreground hover:bg-accent/10 hover:shadow-[2px_2px_0px_0px_hsl(var(--foreground))] hover:-translate-y-0.5 transition-all shrink-0 ${index >= 5 ? 'hidden sm:inline-flex' : ''}`}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
            alt=""
            className="w-3.5 h-3.5 rounded-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="truncate max-w-[100px]">{domain}</span>
          <span className="text-muted-foreground bg-muted px-1 rounded text-[10px]">{count}</span>
        </button>
      ))}
    </div>
  );
};
