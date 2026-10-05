import { useMemo } from 'react';
import type { DateFilter } from '@/components/FilterPanel';
import { getLinkDomain, type Link } from '@/types/link';

interface FilterState {
  searchTerm: string;
  showOnlyFavorites: boolean;
  domainFilter: string;
  selectedCategoryId: string | null;
  dateFilter: DateFilter;
  showArchive: boolean;
  showTrash: boolean;
  selectedTagId: string;
  selectedFolderId?: string | null;
  sortBy: 'date' | 'title' | 'domain';
  sortOrder: 'asc' | 'desc';
}

const DATE_MS: Record<DateFilter, number | null> = {
  all: null,
  week: 7 * 86400000,
  month: 30 * 86400000,
  '3months': 90 * 86400000,
};

/**
 * Aplica filtros + ordenação sobre a lista de links.
 * Todos os campos de estado combinados com early returns para reduzir complexidade.
 */
export function useFilteredLinks(links: Link[], state: FilterState): Link[] {
  const {
    searchTerm, showOnlyFavorites, domainFilter, selectedCategoryId,
    dateFilter, showArchive, showTrash, selectedTagId, selectedFolderId, sortBy, sortOrder,
  } = state;

  return useMemo(() => {
    const window = DATE_MS[dateFilter];
    const threshold = window === null ? null : Date.now() - window;
    const search = searchTerm.toLowerCase();
    const domain = domainFilter.toLowerCase();

    const passes = (link: Link): boolean => {
      if (showTrash) return !!link.deleted_at;
      if (link.deleted_at) return false;
      if (showOnlyFavorites && !link.is_favorite) return false;
      if (domain && getLinkDomain(link.url).toLowerCase() !== domain) return false;
      if (selectedCategoryId !== null && link.category_id !== selectedCategoryId) return false;
      if (threshold !== null && new Date(link.created_at).getTime() < threshold) return false;
      if (showArchive !== (link.is_archived ?? false)) return false;
      if (selectedTagId && !(link.tagIds ?? []).includes(selectedTagId)) return false;
      if (selectedFolderId && link.folder_id !== selectedFolderId) return false;
      if (search) {
        const hay =
          link.title.toLowerCase().includes(search) ||
          link.url.toLowerCase().includes(search) ||
          (link.description ?? '').toLowerCase().includes(search);
        if (!hay) return false;
      }
      return true;
    };

    const compare = (a: Link, b: Link): number => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'domain') return getLinkDomain(a.url).localeCompare(getLinkDomain(b.url));
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    };

    const dir = sortOrder === 'asc' ? 1 : -1;
    return links.filter(passes).sort((a, b) => compare(a, b) * dir);
  }, [links, searchTerm, showOnlyFavorites, domainFilter, selectedCategoryId,
      dateFilter, showArchive, showTrash, selectedTagId, selectedFolderId, sortBy, sortOrder]);
}
