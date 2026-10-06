import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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

interface AddLinkDialogProps {
  onAdd: (title: string, url: string) => void;
}

export const AddLinkDialog = ({ onAdd }: AddLinkDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleOpenDialog = () => {
      setOpen(true);
    };

    document.addEventListener('openAddLinkDialog', handleOpenDialog);
    
    return () => {
      document.removeEventListener('openAddLinkDialog', handleOpenDialog);
    };
  }, []);

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
      await onAdd(titleStr.trim(), validation.normalizedUrl!);

      setTitle("");
      setUrl("");
      setOpen(false);
      toast.success("Link adicionado com sucesso!");
    } catch (error) {
      toast.error("Erro ao adicionar link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary hover-lift shadow-lg group">
          <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
          Adicionar Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl gradient-text">✨ Adicionar Novo Link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-base font-medium">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meu Site"
              required
              className="glass-card border-border/50 focus:border-primary h-11 text-base"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="url" className="text-base font-medium">URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://meusite.com"
              required
              className="glass-card border-border/50 focus:border-primary h-11 text-base"
            />
          </div>
          <Button type="submit" className="w-full gradient-primary hover-lift h-11 text-base font-medium shadow-lg" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Adicionando...
              </>
            ) : (
              "✅ Adicionar"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
