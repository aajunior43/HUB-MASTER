import React, { useState } from 'react';
import { TaskInput } from '@/components/TaskInput';
import { TaskList } from '@/components/TaskList';
import { TaskProgress } from '@/components/TaskProgress';
import { BackupRestore } from '@/components/BackupRestore';
import { Task } from '@/types/task';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const addTask = (title: string, category: 'trabalho' | 'pessoal' | 'compras') => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
      category,
    };
    setTasks([...tasks, newTask]);
    toast({
      title: "Tarefa adicionada",
      description: title,
    });
  };

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    toast({
      title: "Tarefa removida",
      variant: "destructive",
    });
  };

  const handleRestore = (restoredTasks: Task[]) => {
    setTasks(restoredTasks);
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedTasks = filteredTasks.filter(task => task.completed).length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-bounce-soft"></div>
        <div className="absolute top-40 -left-40 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-40 right-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>
      
      <div className="max-w-2xl mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-6 animate-slide-in-up">
          <div className="flex items-center justify-center space-x-3">
            <Sparkles className="h-10 w-10 text-primary animate-glow" />
            <h1 className="text-5xl font-black gradient-text tracking-tight">
              TaskMaster
            </h1>
            <Sparkles className="h-10 w-10 text-primary animate-glow" />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-xl font-medium">
              Transforme suas ideias em conquistas
            </p>
            <p className="text-muted-foreground/70 text-sm">
              Interface futurística para produtividade máxima
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-6 rounded-2xl transform hover:scale-105 transition-all duration-500 animate-scale-in">
            <TaskInput onAddTask={addTask} />
          </div>
          
          <div className="glass-card p-6 rounded-2xl hover:shadow-2xl transition-all duration-500 animate-scale-in">
            <BackupRestore tasks={tasks} onRestore={handleRestore} />
          </div>
          
          <div className="relative group animate-scale-in">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative glass-card p-4 rounded-2xl">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-primary h-5 w-5 transition-all duration-300 group-hover:scale-110" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar suas conquistas..."
                className="pl-14 bg-transparent border-0 text-lg placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary/50"
              />
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl transform hover:scale-105 transition-all duration-500 animate-scale-in">
            <TaskProgress completed={completedTasks} total={filteredTasks.length} />
          </div>
          
          {filteredTasks.length > 0 ? (
            <div className="glass-card p-6 rounded-2xl transform hover:translate-y-[-4px] transition-all duration-500 animate-scale-in">
              <TaskList
                tasks={filteredTasks}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
              />
            </div>
          ) : (
            <div className="text-center py-16 glass-card rounded-2xl animate-scale-in">
              <div className="space-y-4">
                <div className="mx-auto w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="h-12 w-12 text-primary animate-bounce-soft" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {searchQuery ? "Nenhuma tarefa encontrada" : "Pronto para começar?"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Tente uma busca diferente" : "Sua primeira conquista está a um clique de distância!"}
                </p>
              </div>
            </div>
          )}
        </div>

        <footer className="text-center pt-12 animate-fade-in">
          <div className="glass-card p-6 rounded-2xl">
            <p className="text-primary font-semibold text-lg tracking-wide hover:scale-105 transition-transform duration-300 cursor-default">
              ✨ Criado por Aleksandro Alves ✨
            </p>
            <p className="text-muted-foreground/70 text-sm mt-2">
              Transformando produtividade em arte
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;