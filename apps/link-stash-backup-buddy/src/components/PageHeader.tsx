import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  /** Rota do botão "voltar". Default: "/". */
  backTo?: string;
  /** Sub-rota exibida em fonte mono (ex.: "/ notas"). */
  crumb?: string;
  /** Ações à direita (botões, badges, etc.). */
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão das sub-páginas (Notes, Prompts, Reminders, Vault).
 * Mantém a mesma marca "MEUS LINKS" + breadcrumb usada nas páginas atuais.
 */
export default function PageHeader({ backTo = '/', crumb, actions }: PageHeaderProps) {
  return (
    <header className="h-12 border-b border-foreground/10 bg-card/80 backdrop-blur flex items-center gap-2 px-4 shrink-0">
      <Link
        to={backTo}
        className="h-7 w-7 flex items-center justify-center rounded hover:bg-foreground/5"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <span className="font-mono font-black tracking-wide text-sm">MEUS LINKS</span>
      {crumb && <span className="text-[11px] text-muted-foreground font-mono">{crumb}</span>}
      <div className="flex-1" />
      {actions}
    </header>
  );
}
