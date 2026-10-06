import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload } from "lucide-react";
import { Subscription } from "@/types/subscription";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";

interface ExportImportProps {
  subscriptions: Subscription[];
  onImport: (subscriptions: Subscription[]) => void;
}

export function ExportImport({ subscriptions, onImport }: ExportImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);


  const exportToJSON = () => {
    const dataStr = JSON.stringify(subscriptions, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `assinaturas-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída!",
      description: `${subscriptions.length} assinaturas foram exportadas para JSON.`,
    });
  };

  const importFromJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content) as Subscription[];
        
        // Validate the imported data structure
        if (!Array.isArray(importedData)) {
          throw new Error("Formato inválido: esperado um array de assinaturas.");
        }

        const validSubscriptions = importedData.filter(item => 
          item.id && item.name && item.price !== undefined && item.renewalDate && item.category
        );

        if (validSubscriptions.length === 0) {
          throw new Error("Nenhuma assinatura válida encontrada no arquivo.");
        }

        const normalized = validSubscriptions.map((s) => ({
          ...s,
          billingPeriod: (s as any).billingPeriod ?? 'mensal',
        }));

        onImport(normalized);
        
        toast({
          title: "Importação concluída!",
          description: `${normalized.length} assinaturas foram importadas com sucesso.`,
        });

        if (validSubscriptions.length < importedData.length) {
          toast({
            title: "Aviso",
            description: `${importedData.length - validSubscriptions.length} itens foram ignorados por dados inválidos.`,
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro na importação",
          description: error instanceof Error ? error.message : "Arquivo JSON inválido.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };





  return (
    <div className="space-y-4">
      {/* Export/Import Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={exportToJSON}
          variant="outline"
          className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300 py-3 px-5 font-medium"
          disabled={subscriptions.length === 0}
        >
          <Download className="h-4 w-4" />
          Exportar JSON ({subscriptions.length})
        </Button>


        
        <div className="flex items-center gap-2">
          <Label htmlFor="import-file" className="sr-only">
            Importar arquivo JSON
          </Label>
          <Input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importFromJSON}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-300 py-3 px-5 font-medium"
          >
            <Upload className="h-4 w-4" />
            Importar Arquivo
          </Button>
        </div>


      </div>


    </div>
  );
}