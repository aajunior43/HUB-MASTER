import React from 'react';
import { Plus, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EnhancedEmptyStateProps {
  onAddLink: () => void;
  onImportBackup: () => void;
}

export const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  onAddLink,
  onImportBackup,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center pop-in">
      {/* Decorative icon stack */}
      <div className="relative mb-6">
        <div className="absolute -top-2 -left-3 w-12 h-12 bg-secondary border-2 border-foreground rounded-lg shadow-[3px_3px_0px_0px_hsl(var(--foreground))] rotate-[-8deg]" />
        <div className="absolute -top-1 left-2 w-12 h-12 bg-primary border-2 border-foreground rounded-lg shadow-[3px_3px_0px_0px_hsl(var(--foreground))] rotate-[6deg]" />
        <div className="relative w-16 h-16 bg-accent border-2 border-foreground shadow-[4px_4px_0px_0px_hsl(var(--foreground))] rounded-lg flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-accent-foreground" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="text-2xl font-black mb-2 text-foreground tracking-tight">
        Sua biblioteca está vazia
      </h2>
      <p className="text-muted-foreground text-sm font-bold mb-6 max-w-xs">
        Salve seu primeiro link e comece a organizar seus favoritos como um profissional
      </p>

      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
        <Button onClick={onAddLink} className="bg-accent text-accent-foreground flex-1 wiggle-on-hover">
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar Link
        </Button>
        <Button onClick={onImportBackup} variant="outline" className="flex-1">
          <Upload className="mr-1.5 h-4 w-4" /> Importar
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground font-bold">
        <span className="inline-flex items-center gap-1">
          <kbd className="bg-card px-1.5 py-0.5 rounded border-2 border-foreground/20 text-[10px] font-black shadow-[1px_1px_0px_0px_hsl(var(--foreground)/0.2)]">Ctrl+N</kbd>
          adicionar
        </span>
        <span className="text-foreground/30">•</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="bg-card px-1.5 py-0.5 rounded border-2 border-foreground/20 text-[10px] font-black shadow-[1px_1px_0px_0px_hsl(var(--foreground)/0.2)]">Ctrl+K</kbd>
          buscar
        </span>
      </div>
    </div>
  );
};

export default EnhancedEmptyState;
