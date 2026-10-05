import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  ChevronRight,
  Command,
  Database,
  KeyRound,
  Link2,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  StickyNote,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useHubCounts, type HubCounts } from '@/hooks/useHubCounts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Tool {
  to: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  hue: number;
  countKey?: keyof HubCounts;
  unit?: string;
  featured?: boolean;
}

interface ToolGroup {
  label: string;
  glyph: string;
  tools: Tool[];
}

const groups: ToolGroup[] = [
  {
    label: 'Organizar',
    glyph: '𓋴',
    tools: [
      { to: '/links', title: 'Meus Links', desc: 'Salve, organize e encontre seus links', icon: Link2, hue: 42, countKey: 'links', unit: 'links', featured: true },
      { to: '/vault', title: 'Cofre de Chaves', desc: 'API keys e tokens criptografados', icon: KeyRound, hue: 42, countKey: 'vault', unit: 'chaves' },
      { to: '/passwords', title: 'Cofre de Senhas', desc: 'Credenciais criptografadas', icon: Lock, hue: 42, countKey: 'passwords', unit: 'senhas' },
    ],
  },
  {
    label: 'Pessoal',
    glyph: '𓇳',
    tools: [
      { to: '/reminders', title: 'Pagamentos', desc: 'Contagem regressiva de assinaturas', icon: CalendarClock, hue: 42, countKey: 'reminders', unit: 'lembretes' },
      { to: '/prompts', title: 'Prompts de IA', desc: 'Biblioteca pessoal de prompts', icon: Wand2, hue: 42, countKey: 'prompts', unit: 'prompts' },
      { to: '/notes', title: 'Bloco de Notas', desc: 'Notas rápidas com autosave', icon: StickyNote, hue: 42, countKey: 'notes', unit: 'notas' },
      { to: '/chat', title: 'Chat LLM (BYOK)', desc: 'Deep Research e sub-agentes', icon: MessageSquare, hue: 170 },
    ],
  },
  {
    label: 'Administração',
    glyph: '𓊪',
    tools: [
      { to: '/admin', title: 'Backup', desc: 'Baixe todos os seus dados (JSON/CSV)', icon: Database, hue: 42 },
    ],
  },
];

const MYSTIC_PHRASES = [
  'Que Rá ilumine seu caminho hoje.',
  'Sob o olhar de Hórus, tudo se organiza.',
  'Que Anúbis proteja seus segredos.',
  'A eternidade se constrói em pequenos gestos.',
];

function greetingFor(hour: number) {
  if (hour < 5) return 'Boa madrugada';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function ToolCard({ tool, counts }: { tool: Tool; counts: HubCounts }) {
  const Icon = tool.icon;
  const count = tool.countKey ? counts[tool.countKey] : undefined;

  return (
    <Link
      to={tool.to}
      className={[
        'group relative flex items-center gap-4 rounded-[var(--radius)] outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'glow-card active:scale-[0.985] transition-all duration-200',
        tool.featured ? 'p-5 sm:p-6 min-h-[112px] sm:col-span-2' : 'p-4 sm:p-5 min-h-[84px]',
      ].join(' ')}
      style={{ ['--hue' as string]: String(tool.hue) }}
      aria-label={tool.title}
    >
      <div
        className={[
          'shrink-0 rounded-2xl flex items-center justify-center neo-accent',
          tool.featured ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-12 h-12 sm:w-14 sm:h-14',
        ].join(' ')}
      >
        <Icon className={tool.featured ? 'h-6 w-6 sm:h-7 sm:w-7' : 'h-5 w-5 sm:h-6 sm:w-6'} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className={[
            'font-display leading-tight tracking-tight text-foreground',
            tool.featured ? 'text-lg sm:text-xl' : 'text-base sm:text-lg',
          ].join(' ')}>
            {tool.title}
          </h2>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">
              {count} {tool.unit}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-[13px] text-muted-foreground mt-1 leading-snug line-clamp-2">
          {tool.desc}
        </p>
      </div>

      <ChevronRight
        className="h-4 w-4 text-muted-foreground/60 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}

function HieroglyphDivider({ label, glyph }: { label: string; glyph: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 sm:mb-5 px-1">
      <span aria-hidden className="text-primary/60 text-lg leading-none" style={{ fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif" }}>
        {glyph}
      </span>
      <h3 className="text-[10px] uppercase tracking-[0.28em] text-primary/80 font-semibold font-display">
        {label}
      </h3>
      <div
        className="flex-1 h-px"
        style={{
          background: 'linear-gradient(90deg, hsl(var(--primary) / 0.5), transparent)',
        }}
      />
    </div>
  );
}

export default function Hub() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { counts } = useHubCounts();
  const [cmdOpen, setCmdOpen] = useState(false);

  const hour = new Date().getHours();
  const greeting = greetingFor(hour);
  const displayName = useMemo(() => {
    const raw = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'Viajante';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [user]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allTools = groups.flatMap((g) => g.tools);
  const quickActions = [
    { label: 'Novo link', to: '/links', icon: Plus },
    { label: 'Nova nota', to: '/notes', icon: StickyNote },
    { label: 'Abrir chat', to: '/chat', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden">
      {/* HEADER */}
      <header
        className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto max-w-4xl h-14 px-3 sm:px-4 flex items-center gap-2 sm:gap-3">
          <div
            className="w-9 h-9 rounded-xl neo-accent flex items-center justify-center text-lg leading-none"
            style={{ fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif" }}
            aria-label="Meus Links"
            title="Meus Links"
          >
            𓂀
          </div>
          <div className="min-w-0 leading-tight">
            <div className="font-display text-[13px] tracking-tight">Meus Links</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">hub</div>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => setCmdOpen(true)}
            className="hidden sm:flex h-9 items-center gap-2 px-3 rounded-full neo-sm bg-card/60 text-muted-foreground hover:text-foreground transition"
            aria-label="Buscar (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-[11px]">Buscar…</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-background/60 border border-border/60">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
          <button
            onClick={() => setCmdOpen(true)}
            className="sm:hidden h-9 w-9 rounded-full neo-sm bg-card/60 flex items-center justify-center"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>

          <Button
            onClick={signOut}
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full hover:bg-card/60"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main
        className="mx-auto max-w-4xl px-3 sm:px-4 pt-6 sm:pt-10 pb-16 relative z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4rem)' }}
      >
        {/* HERO — cartouche */}
        <section className="mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-3 text-base sm:text-xl tracking-[0.08em] text-primary/90 font-bold font-display">
            <span
              aria-hidden
              style={{ fontFamily: "'Noto Sans Egyptian Hieroglyphs', serif" }}
              className="text-2xl sm:text-3xl leading-none text-primary/80"
            >
              𓋹
            </span>
            <span>{greeting}, <strong className="text-foreground">{displayName}</strong></span>
          </div>

          {/* filete dourado */}
          <div
            aria-hidden
            className="mt-4 h-px w-32"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--primary-glow)), hsl(var(--primary) / 0))',
              boxShadow: '0 0 10px hsl(var(--primary) / 0.5)',
            }}
          />

          {/* QUICK ACTIONS */}
          <div className="mt-5 flex flex-wrap gap-2">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.label}
                  to={a.to}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full neo-sm bg-card/60 text-[11px] uppercase tracking-[0.16em] text-primary/90 hover:text-primary hover:bg-card transition font-display"
                >
                  <Icon className="h-3 w-3" />
                  {a.label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* GRUPOS */}
        <div className="space-y-10 sm:space-y-12">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <HieroglyphDivider label={group.label} glyph={group.glyph} />
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {group.tools.map((tool) => (
                  <ToolCard key={tool.title} tool={tool} counts={counts} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* ⌘K PALETTE */}
      <CommandPalette
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        quickActions={quickActions}
        tools={allTools}
        onPick={(to) => { setCmdOpen(false); navigate(to); }}
      />
    </div>
  );
}

interface QuickAction { label: string; to: string; icon: React.ComponentType<{ className?: string }> }

function CommandPalette({
  open, onOpenChange, quickActions, tools, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quickActions: QuickAction[];
  tools: Tool[];
  onPick: (to: string) => void;
}) {
  const [q, setQ] = useState('');
  useEffect(() => { if (!open) setQ(''); }, [open]);
  const norm = q.trim().toLowerCase();
  const filteredActions = norm ? quickActions.filter((a) => a.label.toLowerCase().includes(norm)) : quickActions;
  const filteredTools = norm
    ? tools.filter((t) => (t.title + ' ' + t.desc).toLowerCase().includes(norm))
    : tools;
  const nothing = filteredActions.length === 0 && filteredTools.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="p-3 border-b border-border/60">
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ferramentas, ações…"
            className="h-9 bg-transparent border-0 focus-visible:ring-0 shadow-none"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {nothing && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</div>
          )}
          {filteredActions.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-display">
                Ações rápidas
              </div>
              {filteredActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() => onPick(a.to)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-card/60 text-left text-sm"
                  >
                    <Icon className="h-4 w-4 text-primary/80" />
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}
          {filteredTools.length > 0 && (
            <div>
              <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-display">
                Ferramentas
              </div>
              {filteredTools.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.title}
                    onClick={() => onPick(t.to)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-card/60 text-left"
                  >
                    <Icon className="h-4 w-4 text-primary/80 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
