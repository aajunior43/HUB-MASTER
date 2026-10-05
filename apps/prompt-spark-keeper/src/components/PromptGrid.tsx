
import { Prompt } from '@/types/prompt';
import { PromptCard } from './PromptCard';
import { FileX } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PromptGridSkeleton, CenteredLoader } from './LoadingStates';
import { EnhancedCard } from './ui/enhanced-card';

interface PromptGridProps {
  prompts: Prompt[];
  onEditPrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
  onViewPrompt: (prompt: Prompt) => void;
  loading?: boolean;
}

export const PromptGrid = ({ prompts, onEditPrompt, onDeletePrompt, onViewPrompt, loading }: PromptGridProps) => {
  const isMobile = useIsMobile();

  if (loading) {
    return <PromptGridSkeleton />;
  }

  if (prompts.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center py-16 sm:py-24">
          <EnhancedCard variant="glass" className="max-w-md text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/30 rounded-full flex items-center justify-center mb-4 sm:mb-6 animate-pulse mx-auto">
              <FileX className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold gradient-text mb-2">
              Nenhum prompt encontrado
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Não encontramos prompts que correspondam aos seus critérios de busca. 
              Tente ajustar os filtros ou criar um novo prompt.
            </p>
          </EnhancedCard>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6">
      <div className={`grid gap-4 sm:gap-6 ${
        isMobile 
          ? 'grid-cols-1' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }`}>
        {prompts.map((prompt, index) => (
          <div 
            key={prompt.id}
            className="animate-fade-in hover-scale"
            style={{ 
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'both'
            }}
          >
            <PromptCard
              prompt={prompt}
              onEdit={onEditPrompt}
              onDelete={onDeletePrompt}
              onView={onViewPrompt}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
