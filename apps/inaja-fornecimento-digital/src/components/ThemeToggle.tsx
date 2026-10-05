import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, ChevronDown, Coins, Contrast, Landmark, Moon, Music2, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const TEMA_INAJA = "inaja";
export const TEMA_INAJA_ESCURO = "inaja-escuro";
export const TEMA_ALTO_CONTRASTE = "alto-contraste";
export const TEMA_SPOTIFY = "spotify";
export const TEMA_INSTITUCIONAL_GOV = "institucional-gov";
export const TEMA_TESOURO = "tesouro";
export const TEMA_VERDE_CINZA = "verde-cinza";

const TEMAS = [
  [TEMA_INAJA, "Inajá", "Claro institucional", Sun],
  [TEMA_INAJA_ESCURO, "Inajá escuro", "Azul-carvão e verde-água", Moon],
  [TEMA_ALTO_CONTRASTE, "Alto contraste", "Preto, branco e azul", Contrast],
  [TEMA_SPOTIFY, "Spotify", "Carvão, verde e alto contraste", Music2],
  [TEMA_INSTITUCIONAL_GOV, "Institucional Gov", "Azul gov.br e amarelo", Landmark],
  [TEMA_TESOURO, "Tesouro", "Dourado e creme institucional", Coins],
  [TEMA_VERDE_CINZA, "Verde e cinza", "Azul-acinzentado e verde-menta", Palette],
] as const;

type TemaId = (typeof TEMAS)[number][0];

function normalizarTema(tema: string | undefined): TemaId {
  if (tema === TEMA_INAJA_ESCURO || tema === "dark") return TEMA_INAJA_ESCURO;
  if (tema === TEMA_ALTO_CONTRASTE) return TEMA_ALTO_CONTRASTE;
  if (tema === TEMA_SPOTIFY) return TEMA_SPOTIFY;
  if (tema === TEMA_INSTITUCIONAL_GOV) return TEMA_INSTITUCIONAL_GOV;
  if (tema === TEMA_TESOURO) return TEMA_TESOURO;
  if (tema === TEMA_VERDE_CINZA) return TEMA_VERDE_CINZA;
  return TEMA_INAJA;
}

export function ThemeToggle({ variant = "onDark" }: { variant?: "onDark" | "onLight" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !theme) return;
    const normalizado = normalizarTema(theme);
    if (normalizado !== theme) setTheme(normalizado);
  }, [mounted, setTheme, theme]);
  const atual = normalizarTema(theme ?? resolvedTheme);
  const temaAtual = TEMAS.find(([id]) => id === atual) ?? TEMAS[0];
  const [idAtual, nomeAtual, , IconAtual] = temaAtual;
  const tone = variant === "onLight" ? "text-foreground hover:text-foreground hover:bg-muted" : "text-sidebar-primary hover:text-sidebar-foreground hover:bg-white/10";
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label={`Tema atual: ${nomeAtual}. Abrir lista de temas`} title={`Tema: ${nomeAtual}`} className={`${tone} shrink-0 gap-1.5`}>{mounted ? <IconAtual className="h-4 w-4" /> : <Sun className="h-4 w-4" />}<span className="hidden max-w-[6.5rem] truncate text-[10px] font-semibold uppercase tracking-wider lg:inline">{nomeAtual}</span><ChevronDown className="h-3 w-3 opacity-70" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-56"><DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Escolher tema</DropdownMenuLabel><DropdownMenuSeparator />{TEMAS.map(([id, nome, descricao, Icon]) => <DropdownMenuItem key={id} onClick={() => setTheme(id)} className="cursor-pointer gap-2"><Icon className="h-4 w-4 shrink-0 text-primary" /><span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-medium leading-tight">{nome}</span><span className="text-[11px] leading-tight text-muted-foreground">{descricao}</span></span>{id === idAtual ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
