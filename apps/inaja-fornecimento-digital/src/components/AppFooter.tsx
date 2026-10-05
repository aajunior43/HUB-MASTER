import { ArrowUpRight, Mail, MessageCircle, ShieldCheck } from "lucide-react";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10 overflow-hidden border-t-2 border-sidebar-primary bg-sidebar text-sidebar-foreground">
      <div className="pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full bg-sidebar-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-16 -bottom-20 h-52 w-52 rounded-full bg-sidebar-accent/70 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-7">
        <div className="grid gap-7 sm:grid-cols-[1.35fr_0.9fr] sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sidebar-primary/60 bg-sidebar-foreground/10 p-1.5 shadow-lg shadow-black/20">
              <img
                src="/brasao.png"
                alt="Brasão da Prefeitura de Inajá"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sidebar-primary">
                Prefeitura Municipal de
              </p>
              <p className="font-display text-xl font-bold tracking-tight text-sidebar-foreground">
                Inajá · Paraná
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-sidebar-foreground/90">
                <ShieldCheck className="h-3.5 w-3.5 text-sidebar-primary" />
                Sistema institucional de gestão municipal
              </div>
            </div>
          </div>

          <div className="sm:justify-self-end">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-sidebar-primary">
              Suporte técnico
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="mailto:aajunior43@gmail.com"
                className="inline-flex items-center gap-2 rounded-lg border border-sidebar-foreground/40 bg-sidebar-foreground/10 px-3 py-2 text-sm font-medium text-sidebar-foreground transition hover:border-sidebar-primary hover:bg-sidebar-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
              >
                <Mail className="h-3.5 w-3.5 text-sidebar-primary" />
                E-mail
              </a>
              <a
                href="https://wa.me/5544991842415"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-sidebar-primary px-3 py-2 text-sm font-semibold text-sidebar-primary-foreground transition hover:bg-sidebar-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-sidebar-foreground/25 pt-4 text-xs text-sidebar-foreground/85 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Prefeitura Municipal de Inajá · PR</span>
          <span>
            Desenvolvido por <span className="font-semibold text-sidebar-foreground">Aleksandro Alves</span>
          </span>
          <span className="uppercase tracking-[0.1em] text-sidebar-foreground/75">
            Gestão · transparência · eficiência
          </span>
        </div>
      </div>
    </footer>
  );
}
