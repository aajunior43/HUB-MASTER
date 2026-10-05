import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DateFilter = 'all' | 'week' | 'month' | '3months';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FilterPanelProps {
  categories: Category[];
  tags?: Tag[];
  selectedCategoryId: string | null;
  selectedTagId?: string;
  onCategoryChange: (categoryId: string | null) => void;
  onTagChange?: (tagId: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
}

const DATE_FILTER_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: '3months', label: 'Últimos 3 meses' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  categories,
  tags = [],
  selectedCategoryId,
  selectedTagId = '',
  onCategoryChange,
  onTagChange,
  dateFilter,
  onDateFilterChange,
}) => {
  return (
    <div className="border border-border/30 rounded-2xl bg-card shadow-neo p-3 space-y-3">
      {/* Date filter */}
      <div>
        <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">
          Período
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DATE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDateFilterChange(opt.value)}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-bold border border-border/30 transition-all',
                dateFilter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-neo-inset'
                  : 'bg-card text-foreground shadow-neo-sm hover:border-primary/30',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div>
          <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">
            Categoria
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onCategoryChange(null)}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-bold border border-border/30 transition-all',
                selectedCategoryId === null
                  ? 'bg-primary text-primary-foreground shadow-neo-inset'
                  : 'bg-card text-foreground shadow-neo-sm hover:border-primary/30',
              )}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(selectedCategoryId === cat.id ? null : cat.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-bold border border-border/30 transition-all',
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-primary-foreground shadow-neo-inset'
                    : 'bg-card text-foreground shadow-neo-sm hover:border-primary/30',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && onTagChange && (
        <div>
          <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-2">
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onTagChange('')}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-bold border border-border/30 transition-all',
                !selectedTagId ? 'bg-primary text-primary-foreground shadow-neo-inset' : 'bg-card text-foreground shadow-neo-sm',
              )}
            >
              Todas
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagChange(selectedTagId === tag.id ? '' : tag.id)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-bold border transition-all',
                  selectedTagId === tag.id ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground shadow-neo-sm',
                )}
                style={{ borderColor: tag.color }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
