import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataPaginationProps {
  pagina: number;
  totalPaginas: number;
  total?: number;
  onPagina: (pagina: number) => void;
  className?: string;
}

export function DataPagination({ pagina, totalPaginas, total, onPagina, className }: DataPaginationProps) {
  if (totalPaginas <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-2 flex-wrap ${className ?? ""}`}>
      <p className="text-xs text-muted-foreground">
        Página {pagina} de {totalPaginas}
        {typeof total === "number" && ` · ${total.toLocaleString("pt-BR")} registros`}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pagina <= 1}
          onClick={() => onPagina(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pagina >= totalPaginas}
          onClick={() => onPagina(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
