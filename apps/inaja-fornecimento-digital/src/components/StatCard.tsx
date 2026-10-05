import { type LucideIcon } from "lucide-react";

type StatCardVariant = "primary" | "success" | "warning" | "info" | "danger";

const variantClasses: Record<StatCardVariant, { container: string; icon: string }> = {
  primary: { container: "bg-primary/10 text-primary", icon: "text-primary" },
  success: { container: "bg-emerald/10 text-emerald", icon: "text-emerald" },
  warning: { container: "bg-gold/10 text-gold", icon: "text-gold" },
  info: { container: "bg-sky-500/10 text-sky-500 dark:text-sky-400", icon: "text-sky-500 dark:text-sky-400" },
  danger: { container: "bg-destructive/10 text-destructive", icon: "text-destructive" },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  variant?: StatCardVariant;
}

export function StatCard({ label, value, icon: Icon, variant = "primary" }: StatCardProps) {
  const styles = variantClasses[variant];
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${styles.container}`}>
        <Icon className={`w-6 h-6 ${styles.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
        <p className="text-lg sm:text-xl font-bold font-display whitespace-nowrap leading-tight">{value}</p>
      </div>
    </div>
  );
}
