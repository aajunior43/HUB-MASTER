import { type Dispatch, type SetStateAction } from "react";
import { type LucideIcon } from "lucide-react";

export interface PageTab<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface PageTabsProps<T extends string> {
  tabs: PageTab<T>[];
  value: T;
  onChange: Dispatch<SetStateAction<T>>;
  className?: string;
}

export function PageTabs<T extends string>({ tabs, value, onChange, className }: PageTabsProps<T>) {
  return (
    <div role="tablist" className={`flex gap-1 p-1 rounded-xl bg-muted/50 border border-border w-fit mb-8 flex-wrap ${className ?? ""}`}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" /> {t.label}
          </button>
        );
      })}
    </div>
  );
}
