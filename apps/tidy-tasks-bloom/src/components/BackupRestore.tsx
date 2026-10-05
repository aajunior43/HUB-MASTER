import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Task } from '@/types/task';

interface BackupRestoreProps {
  tasks: Task[];
  onRestore: (tasks: Task[]) => void;
}

export const BackupRestore: React.FC<BackupRestoreProps> = ({ tasks, onRestore }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const tasksJson = JSON.stringify(tasks, null, 2);
    const blob = new Blob([tasksJson], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarefas-backup-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Backup realizado com sucesso!",
      description: "Suas tarefas foram salvas em um arquivo de texto.",
    });
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const restoredTasks = JSON.parse(content) as Task[];
        onRestore(restoredTasks);
        toast({
          title: "Tarefas restauradas com sucesso!",
          description: `${restoredTasks.length} tarefas foram importadas.`,
        });
      } catch (error) {
        toast({
          title: "Erro ao restaurar tarefas",
          description: "O arquivo selecionado não é válido.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold gradient-text">Gerenciamento de Dados</h3>
        <p className="text-muted-foreground text-sm mt-1">Proteja e restaure suas conquistas</p>
      </div>
      
      <div className="flex gap-4 justify-center">
        <Button
          variant="outline"
          size="lg"
          className="bg-transparent border-2 border-primary/30 hover:border-primary hover:bg-primary/10 transition-all duration-300 group"
          onClick={handleBackup}
        >
          <Download className="h-5 w-5 mr-3 group-hover:animate-bounce-soft" />
          <span className="font-semibold">Exportar Backup</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="bg-transparent border-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 transition-all duration-300 group"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-5 w-5 mr-3 group-hover:animate-bounce-soft" />
          <span className="font-semibold">Importar Dados</span>
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleRestore}
          accept=".txt"
          className="hidden"
        />
      </div>
    </div>
  );
};