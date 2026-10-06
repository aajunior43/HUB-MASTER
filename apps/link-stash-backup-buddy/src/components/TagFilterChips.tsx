import { memo } from 'react';
import { Tag } from '@/hooks/useTags';

interface Link { tagIds?: string[] }

interface TagFilterChipsProps {
  links: Link[];
  allTags: Tag[];
  activeTagId: string;
  onTagChange: (tagId: string) => void;
}

export const TagFilterChips = memo(({ links, allTags, activeTagId, onTagChange }: TagFilterChipsProps) => {
  const tagCounts = new Map<string, number>();
  links.forEach(l => l.tagIds?.forEach(id => tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1)));

  const usedTags = allTags.filter(t => tagCounts.has(t.id));
  if (usedTags.length === 0) return null;

  return (
    <div className="flex flex-nowrap gap-1.5 shrink-0">
      {usedTags.map((tag, index) => {
        const isActive = activeTagId === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => onTagChange(isActive ? '' : tag.id)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black border-2 transition-all shrink-0 ${index >= 4 ? 'hidden sm:inline-flex' : ''} ${
              isActive
                ? 'border-foreground bg-foreground text-background shadow-[1px_1px_0px_0px_hsl(var(--background))]'
                : 'border-foreground/20 bg-card hover:border-foreground/50 text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
            {tag.name}
            <span className={`text-[10px] font-normal ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>
              {tagCounts.get(tag.id)}
            </span>
          </button>
        );
      })}
    </div>
  );
});
TagFilterChips.displayName = 'TagFilterChips';
