import React from "react";

export const FieldGroup = ({ label, icon, id, children }: { label: string; icon: React.ReactNode; id: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-secondary flex items-center gap-1.5">
      {icon}
      {label}
    </label>
    {children}
  </div>
);

export interface ActionTileProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone: "accent" | "secondary" | "destructive";
  className?: string;
  disabled?: boolean;
}

export const ActionTile = ({ icon: Icon, label, onClick, tone, className = "", disabled = false }: ActionTileProps) => {
  const toneMap = {
    accent: "bg-accent/15 border-accent/40 text-accent hover:bg-accent/25",
    secondary: "bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground/90 hover:bg-primary-foreground/10",
    destructive: "bg-destructive/20 border-destructive/40 text-destructive-foreground hover:bg-destructive/30",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border
        transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50
        ${toneMap[tone]} ${className}
      `}
    >
      <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
      <span className="text-[11px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
};

export const ViewHeader = ({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) => (
  <div className="flex items-start gap-3 sm:gap-4">
    <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-emerald text-primary-foreground flex items-center justify-center shadow-card">
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
    </div>
    <div className="min-w-0">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-primary leading-tight">{title}</h2>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">{subtitle}</p>
    </div>
  </div>
);
