import { useMemo } from 'react';
import { getLinkDomain, type Link } from '@/types/link';

/** Contadores derivados da lista de links (favoritos, arquivados, ativos, lixeira, top domínios). */
export function useLinkCounts(links: Link[]) {
  return useMemo(() => {
    let favoriteCount = 0;
    let archivedCount = 0;
    let activeCount = 0;
    let trashCount = 0;
    const domainCounts: Record<string, number> = {};

    for (const l of links) {
      if (l.deleted_at) {
        trashCount++;
        continue;
      }
      if (l.is_favorite) favoriteCount++;
      if (l.is_archived) {
        archivedCount++;
        continue;
      }
      activeCount++;
      const d = getLinkDomain(l.url);
      domainCounts[d] = (domainCounts[d] ?? 0) + 1;
    }

    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { favoriteCount, archivedCount, activeCount, trashCount, topDomains };
  }, [links]);
}
