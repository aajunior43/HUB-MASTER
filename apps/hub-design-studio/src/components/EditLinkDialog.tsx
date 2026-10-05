import { useState, useEffect } from "react";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { validateAndNormalizeUrl } from "@/utils/urlValidation";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface EditLinkDialogProps {
  link: {
    id: string;
    title: string;
    url: string;
  };
  onEdit: (id: string, title: string, url: string) => void;
  trigger?: React.ReactNode;
}

export const EditLinkDialog = ({ link, onEdit, trigger }: EditLinkDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(link.title || "");
  const [url, setUrl] = useState(link.url || "");
  const [isLoading, setIsLoading] = useState(false);

  // Atualizar os valores quando o link mudar
  useEffect(() => {
    setTitle(link.title || "");
    setUrl(link.url || "");
  }, [link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Garantir que title e url sejam strings
    const titleStr = String(title || "");
    const urlStr = String(url || "");
    
    if (!titleStr.trim()) {
      toast.error("Por favor, preencha o título do link");
      return;
    }

    const validation = validateAndNormalizeUrl(urlStr);
    
    if (!validation.isValid) {
      toast.error(validation.error || "URL inválida");
      return;
    }

    setIsLoading(true);
    
    try {
      await onEdit(link.id, titleStr.trim(), validation.normalizedUrl!);

      setOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Resetar valores para os originais
    setTitle(link.title);
    setUrl(link.url);
    setOpen(false);
  };

  const triggerElement = trigger || (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
      <Edit className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Editar Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meu Site"
              required
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://meusite.com"
              required
              className="bg-secondary border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 gradient-primary hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};