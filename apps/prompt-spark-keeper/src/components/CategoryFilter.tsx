
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const CategoryFilter = ({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const isMobile = useIsMobile();
  const allCategories = ['all', ...categories];
  
  const getCategoryLabel = (category: string) => {
    return category === 'all' ? 'Todas' : category;
  };

  const getCategoryCount = () => {
    return allCategories.length;
  };

  return (
    <div className="border-b border-border bg-muted/10 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3 sm:py-4">
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            {isMobile ? 'Filtros:' : 'Categorias:'}
          </span>
          
          {isMobile && getCategoryCount() > 4 ? (
            <ScrollArea className="flex-1">
              <div className="flex gap-2 pb-2">
                {allCategories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "secondary"}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 whitespace-nowrap ${
                      selectedCategory === category 
                        ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md'
                    }`}
                    onClick={() => onCategoryChange(category)}
                  >
                    {getCategoryLabel(category)}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-wrap gap-2 flex-1">
              {allCategories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "secondary"}
                  className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                    selectedCategory === category 
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105 animate-pulse' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md'
                  }`}
                  onClick={() => onCategoryChange(category)}
                >
                  {getCategoryLabel(category)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
