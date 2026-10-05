import { useState } from 'react';
import { Plus, Trash2, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

const colorOptions = [
  { name: 'VERDE', value: 'green' },
  { name: 'AZUL', value: 'blue' },
  { name: 'CIANO', value: 'cyan' },
  { name: 'AMARELO', value: 'yellow' },
  { name: 'MAGENTA', value: 'magenta' },
  { name: 'VERMELHO', value: 'red' },
  { name: 'LARANJA', value: 'orange' },
  { name: 'ROXO', value: 'purple' },
  { name: 'ROSA', value: 'pink' },
  { name: 'LIMA', value: 'lime' },
  { name: 'ÍNDIGO', value: 'indigo' },
  { name: 'TURQUESA', value: 'teal' },
  { name: 'CINZA', value: 'gray' },
  { name: 'BRANCO', value: 'white' },
];

interface CategoryManagerProps {
  onClose: () => void;
}

export const CategoryManager = ({ onClose }: CategoryManagerProps) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState('green');
  const { categories, addCategory, removeCategory } = useCategories();
  const { toast } = useToast();

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "ERRO",
        description: "Nome da categoria é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
      toast({
        title: "ERRO",
        description: "Categoria já existe.",
        variant: "destructive",
      });
      return;
    }

    addCategory(newCategoryName, selectedColor);
    setNewCategoryName('');
    toast({
      title: "CATEGORIA CRIADA!",
      description: `Categoria ${newCategoryName.toUpperCase()} adicionada.`,
    });
  };

  const handleRemoveCategory = (id: string, name: string) => {
    removeCategory(id);
    toast({
      title: "CATEGORIA REMOVIDA",
      description: `${name} foi excluída.`,
    });
  };

  const getCategoryColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500/20 text-green-400 border-green-400/50',
      blue: 'bg-blue-500/20 text-blue-400 border-blue-400/50',
      cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50',
      yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/50',
      magenta: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-400/50',
      red: 'bg-red-500/20 text-red-400 border-red-400/50',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-400/50',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-400/50',
      pink: 'bg-pink-500/20 text-pink-400 border-pink-400/50',
      lime: 'bg-lime-500/20 text-lime-400 border-lime-400/50',
      indigo: 'bg-indigo-500/20 text-indigo-400 border-indigo-400/50',
      teal: 'bg-teal-500/20 text-teal-400 border-teal-400/50',
      gray: 'bg-gray-500/20 text-gray-400 border-gray-400/50',
      white: 'bg-white/20 text-white border-white/50',
    };
    return colorMap[color] || colorMap.green;
  };

  return (
    <Card className="bg-black border-green-400 animate-scale-in shadow-2xl shadow-green-400/20">
      <CardHeader className="border-b border-green-400/30">
        <CardTitle className="font-mono text-lg text-green-400 flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            C:\CONFIG&gt;  GERENCIAR CATEGORIAS
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-green-400 hover:bg-green-400/10 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Add New Category */}
        <div className="space-y-4 p-4 border border-green-400/30 rounded bg-black/50">
          <Label className="font-mono text-green-400 text-sm">C:\CONFIG&gt;  NOVA CATEGORIA</Label>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="category-name" className="font-mono text-green-300 text-xs">NOME:</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="DIGITE O NOME..."
                className="bg-black border-green-400/50 text-green-400 font-mono focus:border-green-400"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
            
            <div>
              <Label className="font-mono text-green-300 text-xs">COR:</Label>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <Button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={`h-8 w-full font-mono text-xs border transition-all ${
                      selectedColor === color.value 
                        ? getCategoryColorClass(color.value) + ' ring-2 ring-green-400'
                        : getCategoryColorClass(color.value) + ' opacity-60'
                    }`}
                    title={color.name}
                  >
                    {color.name.charAt(0)}
                  </Button>
                ))}
              </div>
            </div>
            
            <Button
              onClick={handleAddCategory}
              className="w-full bg-green-600 hover:bg-green-700 text-black font-mono border border-green-400"
            >
              <Plus className="mr-2 h-4 w-4" />
              [CRIAR CATEGORIA]
            </Button>
          </div>
        </div>

        {/* Existing Categories */}
        <div className="space-y-3">
          <Label className="font-mono text-green-400 text-sm">C:\CONFIG&gt;  CATEGORIAS EXISTENTES</Label>
          
          {categories.length === 0 ? (
            <div className="text-center py-6 border border-green-400/30 rounded bg-black/50">
              <p className="text-green-300/70 font-mono text-sm">
                NENHUMA CATEGORIA CRIADA
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border border-green-400/30 rounded bg-black/30"
                >
                  <Badge className={`font-mono ${getCategoryColorClass(category.color)}`}>
                    {category.name}
                  </Badge>
                  
                  <Button
                    onClick={() => handleRemoveCategory(category.id, category.name)}
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10 font-mono h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
