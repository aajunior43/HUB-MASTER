
import { Search, Plus, Menu, Hexagon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BackupButtons } from './BackupButtons';
import { ThemeToggle } from './ThemeToggle';
import { Prompt } from '@/types/prompt';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreatePrompt: () => void;
  prompts: Prompt[];
}

export const Header = ({ searchQuery, onSearchChange, onCreatePrompt, prompts }: HeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border/30 shadow-lg animate-slide-down">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo e contador */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg gradient-bg border border-primary/20 flex items-center justify-center animate-glow">
                <Hexagon className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-geometric" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold gradient-text animate-glow">
                {isMobile ? 'PM' : 'Prompt Manager'}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full honey-gradient border border-primary/20 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
              </span>
            </div>
          </div>

          {/* Desktop Layout */}
          {!isMobile && (
            <div className="flex items-center gap-4 flex-1 max-w-3xl animate-slide-up">
              <ThemeToggle />
              <BackupButtons prompts={prompts} />

              <Button 
                onClick={onCreatePrompt}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shrink-0 shadow-lg hover:shadow-xl smooth-transition hover-scale animate-glow border border-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Prompt
              </Button>
            </div>
          )}

          {/* Mobile Layout */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <BackupButtons prompts={prompts} />
              <Button 
                onClick={onCreatePrompt}
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl smooth-transition hover-scale"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile counter - separate row */}
        {isMobile && (
          <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full honey-gradient border border-primary/20 w-fit animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">
              {prompts.length} {prompts.length === 1 ? 'prompt' : 'prompts'}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
