import { moeda } from "@/lib/empenhos";

type BarColor = "primary" | "emerald" | "blue";

const barColors: Record<BarColor, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald",
  blue: "bg-blue-500 dark:bg-blue-400",
};

interface BarraSimplesProps {
  label: string;
  value: number;
  max: number;
  cor?: BarColor;
  valueLabel?: string;
}

export function BarraSimples({ label, value, max, cor = "primary", valueLabel }: BarraSimplesProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground truncate max-w-[60%]">{label}</span>
        <span className="font-semibold">{valueLabel ?? moeda(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColors[cor]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
