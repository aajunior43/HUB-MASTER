import { FileText, Moon, Sun, Monitor, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { theme, setTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-4 w-4" strokeWidth={3} />;
      case 'dark': return <Moon className="h-4 w-4" strokeWidth={3} />;
      default: return <Monitor className="h-4 w-4" strokeWidth={3} />;
    }
  };

  return (
    <header className="border-b-[3px] border-foreground bg-background sticky top-0 z-50 h-16">
      <div className="container mx-auto px-4 sm:px-6 h-full">
        <div className="flex items-center justify-between h-full gap-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary brutal-border flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
              </div>
              <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
                Renomeador<span className="text-primary">AI</span>
              </h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 brutal-border bg-card text-foreground text-xs font-black uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={3} />
              ADM
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 brutal-border bg-card flex items-center justify-center hover:bg-secondary transition-colors">
                  {getThemeIcon()}
                  <span className="sr-only">Alternar tema</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 brutal-border brutal-shadow rounded-none bg-card">
                <DropdownMenuItem onClick={() => setTheme('light')} className="font-bold uppercase text-xs">
                  <Sun className="mr-2 h-4 w-4" strokeWidth={3} /> Claro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="font-bold uppercase text-xs">
                  <Moon className="mr-2 h-4 w-4" strokeWidth={3} /> Escuro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="font-bold uppercase text-xs">
                  <Monitor className="mr-2 h-4 w-4" strokeWidth={3} /> Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
