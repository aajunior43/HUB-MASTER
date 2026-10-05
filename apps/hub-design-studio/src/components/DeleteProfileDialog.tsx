import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteProfileDialogProps {
  profileId: string;
  profileName: string;
  isDefault: boolean;
  onProfileDeleted: () => void;
}

export function DeleteProfileDialog({ 
  profileId, 
  profileName, 
  isDefault,
  onProfileDeleted 
}: DeleteProfileDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (isDefault) {
      toast.error("Não é possível deletar o perfil padrão");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (error) throw error;

      toast.success("Perfil deletado com sucesso");
      onProfileDeleted();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao deletar perfil:", errorMessage);
      toast.error("Erro ao deletar perfil");
    } finally {
      setLoading(false);
    }
  };

  if (isDefault) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="text-muted-foreground"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Perfil Padrão
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="glass-strong">
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso irá permanentemente deletar o perfil{" "}
            <span className="font-semibold text-foreground">"{profileName}"</span> e todos os seus links.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deletando..." : "Deletar Perfil"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}