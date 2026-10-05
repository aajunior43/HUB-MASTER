import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskInputProps {
  onAddTask: (title: string, category: 'trabalho' | 'pessoal' | 'compras') => void;
}

export const TaskInput: React.FC<TaskInputProps> = ({ onAddTask }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'trabalho' | 'pessoal' | 'compras'>('pessoal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask(title.trim(), category);
      setTitle('');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold gradient-text text-center">Nova Conquista</h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 flex gap-3">
          <div className="flex-1 relative group">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva sua próxima conquista..."
              className="bg-transparent border-2 border-primary/30 focus:border-primary text-lg h-12 placeholder:text-muted-foreground/50 focus-visible:ring-0 hover:border-primary/50 transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-md -z-10 group-hover:from-primary/10 group-hover:to-purple-500/10 transition-all duration-300"></div>
          </div>
          <Select value={category} onValueChange={(value: any) => setCategory(value)}>
            <SelectTrigger className="w-[150px] bg-transparent border-2 border-primary/30 focus:border-primary h-12 hover:border-primary/50 transition-all duration-300">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="glass-card border-primary/30">
              <SelectItem value="trabalho" className="hover:bg-primary/20">💼 Trabalho</SelectItem>
              <SelectItem value="pessoal" className="hover:bg-primary/20">👤 Pessoal</SelectItem>
              <SelectItem value="compras" className="hover:bg-primary/20">🛒 Compras</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          type="submit" 
          size="icon" 
          className="h-12 w-12 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};