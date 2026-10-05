import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskProgressProps {
  completed: number;
  total: number;
}

export const TaskProgress: React.FC<TaskProgressProps> = ({ completed, total }) => {
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold gradient-text">Progresso Épico</h3>
        <p className="text-muted-foreground">Acompanhe sua jornada de conquistas</p>
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
        <div className="relative glass-card p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-full transition-all duration-500",
                percentage === 100 ? "bg-green-500/20 animate-glow" : "bg-primary/20"
              )}>
                <CheckCircle2 className={cn(
                  "h-6 w-6 transition-all duration-500",
                  percentage === 100 ? "text-green-400" : "text-primary"
                )} />
              </div>
              <div>
                <span className="text-lg font-semibold text-foreground">
                  {completed} de {total} conquistas
                </span>
                <p className="text-sm text-muted-foreground">
                  {percentage === 100 ? "Missão cumprida!" : "Continue assim!"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={cn(
                "text-3xl font-black transition-all duration-500",
                percentage === 100 ? "text-green-400 animate-glow" : "text-primary"
              )}>
                {percentage}%
              </span>
            </div>
          </div>
          
          <div className="relative">
            <Progress 
              value={percentage} 
              className="h-4 bg-muted/30 rounded-full overflow-hidden"
            />
            {percentage > 0 && (
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full animate-shimmer" 
                   style={{ width: `${percentage}%` }}>
              </div>
            )}
          </div>
          
          <div className="text-center mt-6">
            {percentage === 100 ? (
              <div className="space-y-2">
                <p className="text-xl font-bold text-green-400 animate-bounce-soft">
                  🎉 Parabéns! Todas as conquistas foram alcançadas! 🎉
                </p>
                <p className="text-muted-foreground">
                  Você é imparável!
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Faltam <span className="font-semibold text-primary">{total - completed}</span> {total - completed === 1 ? 'conquista' : 'conquistas'} para a vitória total!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};