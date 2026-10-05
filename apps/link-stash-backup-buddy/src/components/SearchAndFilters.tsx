
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SearchAndFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: 'date' | 'title' | 'domain';
  sortOrder: 'asc' | 'desc';
  onSortChange: (by: 'date' | 'title' | 'domain') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export const SearchAndFilters = ({
  searchTerm, onSearchChange, sortBy, sortOrder,
  onSortChange, onSortOrderChange, showFilters, onToggleFilters
}: SearchAndFiltersProps) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar links..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button variant={showFilters ? 'default' : 'outline'} onClick={onToggleFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <span className="text-sm font-black">Ordenar:</span>
              
              <div className="flex gap-2">
                <Button variant={sortBy === 'date' ? 'default' : 'outline'} size="sm" onClick={() => onSortChange('date')}>
                  Data
                </Button>
                <Button variant={sortBy === 'title' ? 'default' : 'outline'} size="sm" onClick={() => onSortChange('title')}>
                  Título
                </Button>
                <Button variant={sortBy === 'domain' ? 'default' : 'outline'} size="sm" onClick={() => onSortChange('domain')}>
                  Domínio
                </Button>
              </div>

              <Button variant="outline" size="sm" onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}>
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                <span className="ml-2">{sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
