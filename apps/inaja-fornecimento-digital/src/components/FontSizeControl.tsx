import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Type, RotateCcw } from "lucide-react";

interface FontSizeControlProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
}

export const FontSizeControl = ({ fontSize, onFontSizeChange }: FontSizeControlProps) => (
  <Card className="rounded-2xl border-border/60 shadow-card">
    <CardHeader className="pb-3">
      <CardTitle className="text-primary text-sm font-display flex items-center gap-2">
        <span className="w-1 h-5 bg-accent rounded-full" />
        <Type className="h-4 w-4" />
        Tamanho da Fonte
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Tamanho atual</span>
          <span className="text-primary font-display font-bold text-lg">{fontSize}pt</span>
        </div>
        <Slider
          value={[fontSize]}
          onValueChange={(value) => onFontSizeChange(value[0])}
          max={18}
          min={8}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
          <span>8pt</span>
          <span>18pt</span>
        </div>
      </div>
      <Button
        onClick={() => onFontSizeChange(12)}
        size="sm"
        variant="outline"
        className="w-full border-border text-primary hover:bg-emerald-soft"
      >
        <RotateCcw className="mr-2 h-3 w-3" />
        Resetar
      </Button>
    </CardContent>
  </Card>
);
