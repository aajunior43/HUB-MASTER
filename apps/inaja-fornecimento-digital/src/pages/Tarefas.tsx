import { KanbanSquare } from "lucide-react";
import { KanbanBoard } from "@/components/KanbanBoard";
import { PageHeader } from "@/components/PageHeader";
import { AppFooter } from "@/components/AppFooter";

export default function TarefasPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={KanbanSquare}
        title="Mural de tarefas"
        subtitle="Quadro Kanban de demandas"
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <KanbanBoard />
      </main>
      <AppFooter />
    </div>
  );
}
