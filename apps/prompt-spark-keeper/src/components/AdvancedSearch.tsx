import { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, Tag, Type, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Prompt } from '@/types/prompt';

interface SearchFilters {
  query: string;
  category: string;
  tags: string[];
  contentLength: [number, number];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  sortBy: 'date' | 'title' | 'category' | 'length';
  sortOrder: 'asc' | 'desc';
}

interface AdvancedSearchProps {
  prompts: Prompt[];
  onFilterChange: (filteredPrompts: Prompt[]) => void;
  onSimpleSearch: (query: string) => void;
  categories: string[];
}

export const AdvancedSearch = ({ 
  prompts, 
  onFilterChange, 
  onSimpleSearch,
  categories 
}: AdvancedSearchProps) => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    tags: [],
    contentLength: [0, 10000],
    dateRange: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Extrair todas as tags únicas
  const allTags = Array.from(
    new Set(prompts.flatMap(prompt => prompt.tags || []))
  ).sort();

  // Calcular range de comprimento do conteúdo
  const contentLengths = prompts.map(p => p.content.length);
  const minLength = Math.min(...contentLengths, 0);
  const maxLength = Math.max(...contentLengths, 10000);

  useEffect(() => {
    if (!isAdvancedMode) {
      // Modo simples - apenas busca por texto
      onSimpleSearch(filters.query);
      return;
    }

    // Modo avançado - aplicar todos os filtros
    let filtered = [...prompts];

    // Filtro por texto
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(prompt =>
        prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.category?.toLowerCase().includes(query) ||
        prompt.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filtro por categoria
    if (filters.category !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === filters.category);
    }

    // Filtro por tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(prompt =>
        filters.tags.every(tag => prompt.tags?.includes(tag))
      );
    }

    // Filtro por tamanho do conteúdo
    filtered = filtered.filter(prompt => {
      const length = prompt.content.length;
      return length >= filters.contentLength[0] && length <= filters.contentLength[1];
    });

    // Filtro por data
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let dateThreshold: Date;
      
      switch (filters.dateRange) {
        case 'today':
          dateThreshold = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          dateThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = new Date(0);
      }

      filtered = filtered.filter(prompt => 
        new Date(prompt.updated_at) >= dateThreshold
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'length':
          aValue = a.content.length;
          bValue = b.content.length;
          break;
        default: // date
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    onFilterChange(filtered);
  }, [filters, prompts, isAdvancedMode, onFilterChange, onSimpleSearch]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: 'all',
      tags: [],
      contentLength: [minLength, maxLength],
      dateRange: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const addTag = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      updateFilter('tags', [...filters.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateFilter('tags', filters.tags.filter(t => t !== tag));
  };

  const hasActiveFilters = 
    filters.query ||
    filters.category !== 'all' ||
    filters.tags.length > 0 ||
    filters.contentLength[0] !== minLength ||
    filters.contentLength[1] !== maxLength ||
    filters.dateRange !== 'all';

  return (
    <div className="space-y-4">
      {/* Barra de busca principal */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary/70" />
          <Input
            placeholder="Buscar prompts..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10 glass-effect border-primary/20 focus:border-primary/50"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`border-primary/30 hover:honey-gradient ${
                isAdvancedMode || hasActiveFilters ? 'bg-primary/10 border-primary/50' : ''
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-4 w-4 p-0 text-xs bg-primary text-primary-foreground">
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 glass-effect" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros Avançados</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                  className="text-xs"
                >
                  {isAdvancedMode ? 'Modo Simples' : 'Modo Avançado'}
                </Button>
              </div>

              {isAdvancedMode && (
                <>
                  {/* Categoria */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Type className="w-3 h-3" />
                      Categoria
                    </Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) => updateFilter('category', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Tags
                    </Label>
                    
                    {/* Tags selecionadas */}
                    {filters.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {filters.tags.map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-primary/20 text-primary cursor-pointer"
                            onClick={() => removeTag(tag)}
                          >
                            {tag}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Seletor de tags */}
                    <Select onValueChange={addTag}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Adicionar tag..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allTags
                          .filter(tag => !filters.tags.includes(tag))
                          .map(tag => (
                            <SelectItem key={tag} value={tag}>
                              {tag}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tamanho do conteúdo */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Tamanho do conteúdo
                    </Label>
                    <div className="px-2">
                      <Slider
                        value={filters.contentLength}
                        onValueChange={(value) => updateFilter('contentLength', value)}
                        max={maxLength}
                        min={minLength}
                        step={100}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.contentLength[0]} chars</span>
                        <span>{filters.contentLength[1]} chars</span>
                      </div>
                    </div>
                  </div>

                  {/* Período */}
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Período
                    </Label>
                    <Select
                      value={filters.dateRange}
                      onValueChange={(value) => updateFilter('dateRange', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer período</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Última semana</SelectItem>
                        <SelectItem value="month">Último mês</SelectItem>
                        <SelectItem value="year">Último ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ordenação */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Ordenar por</Label>
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value) => updateFilter('sortBy', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="title">Título</SelectItem>
                          <SelectItem value="category">Categoria</SelectItem>
                          <SelectItem value="length">Tamanho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Direção</Label>
                      <Select
                        value={filters.sortOrder}
                        onValueChange={(value) => updateFilter('sortOrder', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Desc</SelectItem>
                          <SelectItem value="asc">Asc</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* Botões */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="flex-1 text-xs"
                >
                  Limpar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Indicadores de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Filtros ativos:</span>
          
          {filters.category !== 'all' && (
            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
              Categoria: {filters.category}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('category', 'all')}
              />
            </Badge>
          )}
          
          {filters.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs bg-accent/10 border-accent/30">
              Tag: {tag}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => removeTag(tag)}
              />
            </Badge>
          ))}
          
          {filters.dateRange !== 'all' && (
            <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">
              Período: {filters.dateRange}
              <X 
                className="w-3 h-3 ml-1 cursor-pointer" 
                onClick={() => updateFilter('dateRange', 'all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};