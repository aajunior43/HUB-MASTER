import React from 'react';
import { Task } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Briefcase, User, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'trabalho':
      return <Briefcase className="h-4 w-4 text-blue-500" />;
    case 'compras':
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    default:
      return <User className="h-4 w-4 text-purple-500" />;
  }
};

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold gradient-text text-center">Suas Conquistas</h3>
      <TransitionGroup className="space-y-3">
        {tasks.map((task) => (
          <CSSTransition key={task.id} timeout={500} classNames="task">
            <div className={cn(
              "group relative overflow-hidden rounded-xl border transition-all duration-500 hover:scale-105",
              task.completed 
                ? "border-green-500/30 bg-green-500/10" 
                : "border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5"
            )}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "relative",
                    task.completed && "animate-bounce-soft"
                  )}>
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => onToggleTask(task.id)}
                      className="h-6 w-6 border-2 border-primary data-[state=checked]:bg-primary transition-all duration-300"
                    />
                    {task.completed && (
                      <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30"></div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg transition-all duration-300",
                      task.completed ? "bg-green-500/20" : "bg-primary/20"
                    )}>
                      {getCategoryIcon(task.category)}
                    </div>
                    <span
                      className={cn(
                        "text-lg font-medium transition-all duration-300",
                        task.completed && "line-through text-muted-foreground",
                        !task.completed && "text-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                    {task.completed && (
                      <span className="text-green-400 font-semibold text-sm">✓ Concluída!</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-muted-foreground hover:text-destructive hover:bg-destructive/20 hover:scale-110"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CSSTransition>
        ))}
      </TransitionGroup>
    </div>
  );
};