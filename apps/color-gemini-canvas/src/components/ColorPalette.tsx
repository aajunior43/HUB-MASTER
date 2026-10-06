
import { useState } from 'react';
import { Copy, Download, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export interface Color {
  nome: string;
  hex: string;
  rgb: string;
}

interface ColorPaletteProps {
  colors: Color[];
  imageName?: string;
}

export function ColorPalette({ colors, imageName }: ColorPaletteProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number, type: 'hex' | 'rgb') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success(`${type.toUpperCase()} copiado: ${text}`);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadPalette = () => {
    const paletteData = {
      imageName: imageName || 'palette',
      extractedAt: new Date().toISOString(),
      totalColors: colors.length,
      colors: colors
    };
    
    const blob = new Blob([JSON.stringify(paletteData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palette-${imageName || 'colors'}-${colors.length}cores.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Paleta baixada com sucesso!');
  };

  if (colors.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      <Card className="p-8 shadow-card border-0 bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Palette className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Paleta Extraída
              </h2>
              <p className="text-muted-foreground text-lg">
                {colors.length} cores dominantes encontradas
              </p>
            </div>
          </div>
          <Button 
            onClick={downloadPalette}
            variant="outline"
            className="gap-2 h-12 px-6 hover:shadow-soft transition-all duration-200"
          >
            <Download className="h-5 w-5" />
            Baixar JSON
          </Button>
        </div>

        <div className={`grid gap-6 ${
          colors.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
          colors.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
        }`}>
          {colors.map((color, index) => (
            <Card 
              key={index} 
              className="p-6 shadow-card border-0 bg-card/80 backdrop-blur-sm animate-scale-in hover:shadow-soft transition-all duration-300 hover:scale-[1.02]"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div 
                className="w-full h-24 rounded-xl mb-4 shadow-inner border border-border/20 transition-transform duration-200 hover:scale-[1.05]"
                style={{ backgroundColor: color.hex }}
              />
              
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-lg leading-tight">
                  {color.nome}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                    <span className="text-sm text-muted-foreground font-mono">
                      {color.hex}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(color.hex, index, 'hex')}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
                    <span className="text-sm text-muted-foreground font-mono">
                      rgb({color.rgb})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`rgb(${color.rgb})`, index, 'rgb')}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
