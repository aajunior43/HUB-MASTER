import { useState, memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette, Sparkles, Settings, Eye } from "lucide-react";
import { useThemePresets } from "@/hooks/useThemePresets";
import { ThemeData } from "@/types/theme";

interface ThemeCustomizerProps {
  theme: ThemeData;
  onUpdate: (theme: ThemeData) => void;
}

export const ThemeCustomizer = memo(function ThemeCustomizer({ theme, onUpdate }: ThemeCustomizerProps) {
  const { 
    loadCategory, 
    getGradientsByCategory, 
    getSolidColors, 
    categories, 
    loadedCategories,
    isLoading 
  } = useThemePresets();
  
  const [localTheme, setLocalTheme] = useState({
    ...theme,
    button_shadow: theme.button_shadow || "none",
    button_border: theme.button_border || "none",
    animation_style: theme.animation_style || "none",
    border_radius: theme.border_radius || 8,
  });

  const handleUpdate = useCallback((key: string, value: string | number) => {
    setLocalTheme(prev => {
      const newTheme = { ...prev, [key]: value };
      onUpdate(newTheme);
      return newTheme;
    });
  }, [onUpdate]);

  const ThemePreview = useCallback(({ background, name }: { background: string; name: string }) => (
    <div
      className="w-full h-16 rounded-lg border-2 border-border/20 cursor-pointer hover:border-primary/50 transition-all duration-200 relative overflow-hidden group"
      style={{ background }}
      onClick={() => handleUpdate("background_value", background)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleUpdate("background_value", background);
        }
      }}
    >
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200" />
      <div className="absolute bottom-1 left-1 right-1">
        <Badge variant="secondary" className="text-xs bg-black/50 text-white border-none">
          {name}
        </Badge>
      </div>
    </div>
  ), [handleUpdate]);

  const CategorySection = useCallback(({ category, title }: { category: string; title: string }) => {
    const gradients = getGradientsByCategory(category);
    const solids = category === 'solid' ? getSolidColors() : [];
    const presets = category === 'solid' ? solids : gradients;

    if (!loadedCategories.includes(category)) {
      return (
        <div>
          <Label className="text-sm font-medium mb-3 block">{title}</Label>
          <Button 
            variant="outline" 
            onClick={() => loadCategory(category)}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Carregando..." : `Carregar ${title}`}
          </Button>
        </div>
      );
    }

    return (
      <div>
        <Label className="text-sm font-medium mb-3 block">{title}</Label>
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset) => (
            <ThemePreview key={preset.value} background={preset.value} name={preset.name} />
          ))}
        </div>
      </div>
    );
  }, [getGradientsByCategory, getSolidColors, loadedCategories, isLoading, loadCategory, ThemePreview]);

  return (
    <Card className="p-6 glass border-border/50">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Personalização Avançada</h3>
      </div>

      <Tabs defaultValue="backgrounds" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="backgrounds" className="flex items-center gap-1">
            <Palette className="h-4 w-4" />
            Fundos
          </TabsTrigger>
          <TabsTrigger value="buttons" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            Botões
          </TabsTrigger>
          <TabsTrigger value="effects" className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Efeitos
          </TabsTrigger>
          <TabsTrigger value="typography" className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            Texto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backgrounds" className="space-y-4">
          <CategorySection category="vibrant" title="Gradientes Vibrantes" />
          <CategorySection category="luxury" title="Temas Premium & Luxo" />
          <CategorySection category="dark" title="Temas Escuros" />
          <CategorySection category="soft" title="Tons Suaves" />
          <CategorySection category="warm" title="Tons Quentes" />
          <CategorySection category="solid" title="Cores Sólidas" />
        </TabsContent>

        <TabsContent value="buttons" className="space-y-4">
          <div className="space-y-2">
            <Label>Estilo dos Botões</Label>
            <Select
              value={localTheme.button_style}
              onValueChange={(value) => handleUpdate("button_style", value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounded">Arredondado</SelectItem>
                <SelectItem value="square">Quadrado</SelectItem>
                <SelectItem value="pill">Pílula</SelectItem>
                <SelectItem value="sharp">Pontiagudo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Raio da Borda ({localTheme.border_radius}px)</Label>
            <Slider
              value={[localTheme.border_radius]}
              onValueChange={(value) => handleUpdate("border_radius", value[0])}
              max={50}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor dos Botões</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localTheme.button_color}
                onChange={(e) => handleUpdate("button_color", e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={localTheme.button_color}
                onChange={(e) => handleUpdate("button_color", e.target.value)}
                className="flex-1 bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Borda dos Botões</Label>
            <Select
              value={localTheme.button_border}
              onValueChange={(value) => handleUpdate("button_border", value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Borda</SelectItem>
                <SelectItem value="1px solid #ffffff30">Borda Sutil</SelectItem>
                <SelectItem value="2px solid #ffffff50">Borda Média</SelectItem>
                <SelectItem value="3px solid #ffffff70">Borda Forte</SelectItem>
                <SelectItem value="2px solid currentColor">Borda Colorida</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="effects" className="space-y-4">
          <div className="space-y-2">
            <Label>Sombra dos Botões</Label>
            <Select
              value={localTheme.button_shadow}
              onValueChange={(value) => handleUpdate("button_shadow", value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Sombra</SelectItem>
                <SelectItem value="0 2px 4px rgba(0,0,0,0.1)">Sombra Sutil</SelectItem>
                <SelectItem value="0 4px 8px rgba(0,0,0,0.15)">Sombra Média</SelectItem>
                <SelectItem value="0 8px 16px rgba(0,0,0,0.2)">Sombra Forte</SelectItem>
                <SelectItem value="0 12px 24px rgba(0,0,0,0.25)">Sombra Profunda</SelectItem>
                <SelectItem value="0 0 20px rgba(255,255,255,0.3)">Brilho Suave</SelectItem>
                <SelectItem value="0 0 30px rgba(255,255,255,0.5)">Brilho Intenso</SelectItem>
                <SelectItem value="0 0 40px rgba(138, 43, 226, 0.6)">Brilho Roxo</SelectItem>
                <SelectItem value="0 0 40px rgba(0, 191, 255, 0.6)">Brilho Azul</SelectItem>
                <SelectItem value="0 0 40px rgba(255, 20, 147, 0.6)">Brilho Rosa</SelectItem>
                <SelectItem value="0 0 40px rgba(50, 205, 50, 0.6)">Brilho Verde</SelectItem>
                <SelectItem value="inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 8px rgba(0,0,0,0.15)">Sombra Interna</SelectItem>
                <SelectItem value="0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.05)">Sombra Flutuante</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Animação</Label>
            <Select
              value={localTheme.animation_style}
              onValueChange={(value) => handleUpdate("animation_style", value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Animação</SelectItem>
                <SelectItem value="hover-scale">Escala no Hover</SelectItem>
                <SelectItem value="hover-glow">Brilho no Hover</SelectItem>
                <SelectItem value="hover-bounce">Bounce no Hover</SelectItem>
                <SelectItem value="pulse">Pulsação</SelectItem>
                <SelectItem value="hover-lift">Elevação no Hover</SelectItem>
                <SelectItem value="hover-rotate">Rotação Sutil</SelectItem>
                <SelectItem value="hover-slide">Deslizamento</SelectItem>
                <SelectItem value="gradient-shift">Mudança de Gradiente</SelectItem>
                <SelectItem value="shimmer">Efeito Shimmer</SelectItem>
                <SelectItem value="breathing">Respiração</SelectItem>
                <SelectItem value="magnetic">Efeito Magnético</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <div className="space-y-2">
            <Label>Cor do Texto</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={localTheme.text_color}
                onChange={(e) => handleUpdate("text_color", e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={localTheme.text_color}
                onChange={(e) => handleUpdate("text_color", e.target.value)}
                className="flex-1 bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Família da Fonte</Label>
            <Select
              value={localTheme.font_family}
              onValueChange={(value) => handleUpdate("font_family", value)}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter (Moderno)</SelectItem>
                <SelectItem value="roboto">Roboto (Clássico)</SelectItem>
                <SelectItem value="playfair">Playfair Display (Elegante)</SelectItem>
                <SelectItem value="mono">JetBrains Mono (Código)</SelectItem>
                <SelectItem value="poppins">Poppins (Amigável)</SelectItem>
                <SelectItem value="montserrat">Montserrat (Profissional)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
});

ThemeCustomizer.displayName = 'ThemeCustomizer';
