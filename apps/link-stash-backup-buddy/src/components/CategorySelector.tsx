
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';

interface CategorySelectorProps {
  selectedCount: number;
  onCategorySelect: (categoryId: string) => void;
  onClose: () => void;
}

export const CategorySelector = ({ selectedCount, onCategorySelect, onClose }: CategorySelectorProps) => {
  const { categories } = useCategories();

  const getCategoryColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500/20 text-green-400 border-green-400/50 hover:bg-green-500/30',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-400/50 hover:bg-blue-500/30',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50 hover:bg-cyan-500/30',
      yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50 hover:bg-yellow-500/30',
      magenta: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-400/50 hover:bg-fuchsia-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-400/50 hover:bg-red-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-400/50 hover:bg-orange-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-400/50 hover:bg-purple-500/30',
      pink: 'bg-pink-500/20 text-pink-400 border-pink-400/50 hover:bg-pink-500/30',
      lime: 'bg-lime-500/20 text-lime-400 border-lime-400/50 hover:bg-lime-500/30',
      indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-400/50 hover:bg-indigo-500/30',
      teal: 'bg-teal-500/20 text-teal-400 border-teal-400/50 hover:bg-teal-500/30',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-400/50 hover:bg-gray-500/30',
      white: 'bg-white/20 text-white border-white/50 hover:bg-white/30',
    };
    return colorMap[color] || colorMap.green;
  };

  return (
    <Card className="bg-black border-green-400 animate-scale-in shadow-2xl shadow-green-400/20">
      <CardHeader className="border-b border-green-400/30">
        <CardTitle className="font-mono text-lg text-green-400 flex items-center">
          <Tag className="h-5 w-5 mr-2" />
          C:\BULK{'>'}  CATEGORIZAR {selectedCount} ITEM{selectedCount !== 1 ? 'S' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {categories.length === 0 ? (
          <div className="text-center py-6 border border-green-400/30 rounded bg-black/50">
            <p className="text-green-300/70 font-mono text-sm">
              ERRO: NENHUMA CATEGORIA DISPONÍVEL
            </p>
            <p className="text-green-600/70 font-mono text-xs mt-2">
              CRIE UMA CATEGORIA PRIMEIRO
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                variant="outline"
                className={`font-mono border transition-colors ${getCategoryColorClass(category.color)}`}
              >
                {category.name}
              </Button>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 pt-2 border-t border-green-400/30">
          <Button
            onClick={() => onCategorySelect('')}
            variant="outline"
            className="flex-1 border-gray-400/50 text-gray-400 hover:bg-gray-400/10 bg-black font-mono"
          >
            [REMOVER CATEGORIA]
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="border-green-400 text-green-400 hover:bg-green-400/10 bg-black font-mono"
          >
            [ESC] CANCELAR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
