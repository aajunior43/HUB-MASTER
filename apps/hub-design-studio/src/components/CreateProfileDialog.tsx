import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateProfileDialogProps {
  userId: string;
  onProfileCreated: () => void;
}

export function CreateProfileDialog({ userId, onProfileCreated }: CreateProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!username.trim()) {
      toast.error("Username é obrigatório");
      return;
    }

    // Validação de username: apenas letras, números, hífens e underscores
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      toast.error("Username deve conter apenas letras, números, hífens e underscores");
      return;
    }

    setLoading(true);
    try {
      // Criar perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          username: username.toLowerCase().trim(),
          display_name: displayName.trim() || username.trim(),
          bio: bio.trim() || null,
          is_default: false,
        })
        .select()
        .single();

      if (profileError) {
        if (profileError.code === '23505') {
          toast.error("Este username já está em uso. Escolha outro.");
        } else {
          throw profileError;
        }
        return;
      }

      // Criar tema padrão para o perfil
      const { error: themeError } = await supabase
        .from("themes")
        .insert({
          profile_id: profileData.id,
          background_type: 'gradient',
          background_value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          button_style: 'rounded',
          button_color: '#667eea',
          text_color: '#ffffff',
          font_family: 'inter',
        });

      if (themeError) throw themeError;

      toast.success("Novo perfil criado com sucesso! 🎉");
      setOpen(false);
      setUsername("");
      setDisplayName("");
      setBio("");
      onProfileCreated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao criar perfil:", errorMessage);
      toast.error("Erro ao criar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary hover:opacity-90 hover-lift">
          <Plus className="h-4 w-4 mr-2" />
          Criar Novo Perfil
          <Sparkles className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-strong">
        <DialogHeader>
          <DialogTitle className="gradient-text text-2xl">Criar Novo Perfil</DialogTitle>
          <DialogDescription>
            Crie um novo perfil de links. Você pode ter múltiplos perfis para diferentes propósitos!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-foreground">
              Username *
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="meuperfil"
              className="bg-secondary border-border"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Seu perfil será acessível em: /{username.toLowerCase()}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-foreground">
              Nome de Exibição
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Meu Nome"
              className="bg-secondary border-border"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-foreground">
              Bio
            </Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Uma breve descrição sobre você..."
              className="bg-secondary border-border"
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || !username.trim()}
            className="gradient-primary hover:opacity-90"
          >
            {loading ? "Criando..." : "Criar Perfil"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}