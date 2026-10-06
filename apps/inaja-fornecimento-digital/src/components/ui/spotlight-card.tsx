import type { CSSProperties, ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: "blue" | "purple" | "green" | "red" | "orange";
  size?: "sm" | "md" | "lg";
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

const sizeMap = {
  sm: "w-48 h-64",
  md: "w-64 h-80",
  lg: "w-80 h-96",
};

export function GlowCard({
  children,
  className = "",
  glowColor = "green",
  size = "md",
  width,
  height,
  customSize = false,
  onClick,
  ariaLabel,
}: GlowCardProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;
  const glowClass = {
    green: "from-emerald-500/20 via-emerald-500/5",
    blue: "from-sky-500/20 via-sky-500/5",
    purple: "from-violet-500/20 via-violet-500/5",
    orange: "from-amber-500/20 via-amber-500/5",
    red: "from-rose-500/20 via-rose-500/5",
  }[glowColor];

  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      aria-label={ariaLabel}
      style={style}
      className={`${customSize ? "" : sizeMap[size]} relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-card ${onClick ? "cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/35 hover:bg-card hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" : ""} ${className}`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${glowClass} to-transparent blur-2xl transition-transform duration-500 ${onClick ? "group-hover:scale-125" : ""}`} aria-hidden />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" aria-hidden />
      {children}
    </div>
  );
}
