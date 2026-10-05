import { type LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  username?: string | null;
  backTo?: string;
  maxWidth?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  username,
  backTo = "/",
  maxWidth = "max-w-7xl",
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="relative z-40 border-b border-sidebar-border bg-sidebar shadow-[0_2px_14px_hsl(var(--sidebar-background)/0.18)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-sidebar-primary" aria-hidden />
      <div className={`relative ${maxWidth} mx-auto flex items-center gap-2 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5`}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(backTo)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground -ml-2 shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl border border-sidebar-primary/40 bg-sidebar-accent flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-sidebar-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold leading-none text-sidebar-foreground sm:text-lg">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-sidebar-primary sm:text-[10px] sm:tracking-widest">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}

        {username && <ChangePasswordDialog className="border-sidebar-primary/60 bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80" />}

        <NotificationBell />

        <ThemeToggle />

        {username && (
          <span className="hidden sm:inline text-xs uppercase tracking-widest text-sidebar-primary font-semibold shrink-0">
            {username}
          </span>
        )}
      </div>
    </header>
  );
}
