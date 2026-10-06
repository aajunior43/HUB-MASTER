import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { LinkItem } from "@/components/LinkItem";
import { LinksList } from "@/components/LinksList";
import { ProfileSelector } from "@/components/ProfileSelector";
import { toast } from "sonner";
import { LogOut, ExternalLink, Upload, Keyboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeData } from "@/types/theme";

// Lazy loading para componentes pesados
const AddLinkDialog = lazy(() => import("@/components/AddLinkDialog").then(module => ({ default: module.AddLinkDialog })));
const ThemeCustomizer = lazy(() => import("@/components/ThemeCustomizer").then(module => ({ default: module.ThemeCustomizer })));
const KeyboardShortcuts = lazy(() => import("@/components/KeyboardShortcuts").then(module => ({ default: module.KeyboardShortcuts })));

interface ProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  user_id: string;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

interface LinkData {
  id: string;
  title: string;
  url: string;
  position: number;
  is_active?: boolean;
  profile_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const addLinkDialogRef = useRef<{ openDialog: () => void }>(null);
  const updateProfileRef = useRef<() => void>(() => {});

  // Memoizar sensors para evitar recriação desnecessária
  const sensors = useMemo(() => useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  ), []);

  // Atalhos de teclado
  const keyboardShortcuts = useMemo(() => [
    {
      key: 'n',
      ctrlKey: true,
      callback: () => {
        // Abrir dialog de adicionar link
        const event = new CustomEvent('openAddLinkDialog');
        window.dispatchEvent(event);
      },
      description: 'Adicionar novo link'
    },
    {
      key: 's',
      ctrlKey: true,
      callback: () => {
        updateProfileRef.current();
      },
      description: 'Salvar perfil'
    },
    {
      key: '?',
      callback: () => {
        setShowShortcuts(true);
      },
      description: 'Mostrar atalhos'
    },
    {
      key: 'Escape',
      callback: () => {
        setShowShortcuts(false);
      },
      description: 'Fechar atalhos'
    }
  ], []);

  // Atalhos de teclado
  useKeyboardShortcuts(keyboardShortcuts);

  const loadUserProfiles = useCallback(async (userId: string) => {
    try {
      // Carregar todos os perfis do usuário (versão compatível)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId);

      if (profilesError) throw profilesError;

      setAllProfiles(profilesData || []);

      // Carregar o perfil padrão ou o primeiro disponível
      const defaultProfile = profilesData?.find(p => p.is_default) || profilesData?.[0];
      if (defaultProfile) {
        await loadSpecificProfile(defaultProfile);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao carregar perfis:", errorMessage);
      toast.error("Erro ao carregar perfis");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    await loadUserProfiles(session.user.id);
  }, [navigate, loadUserProfiles]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loadSpecificProfile = useCallback(async (profileData: ProfileData) => {
    try {
      setProfile(profileData);
      setDisplayName(profileData.display_name || "");
      setBio(profileData.bio || "");
      setAvatarUrl(profileData.avatar_url || "");

      const { data: linksData } = await supabase
        .from("links")
        .select("*")
        .eq("profile_id", profileData.id)
        .order("position");

      setLinks(linksData || []);

      const { data: themeData } = await supabase
        .from("themes")
        .select("*")
        .eq("profile_id", profileData.id)
        .maybeSingle();

      setTheme(themeData || {
        background_type: 'gradient',
        background_value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        button_style: 'rounded',
        button_color: '#667eea',
        text_color: '#ffffff',
        font_family: 'inter'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao carregar dados do perfil:", errorMessage);
      toast.error("Erro ao carregar dados do perfil");
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  }, [navigate]);

  const saveProfile = useCallback(async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Perfil salvo com sucesso!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao salvar perfil:", errorMessage);
      toast.error("Erro ao salvar perfil");
    }
  }, [profile, displayName, bio, avatarUrl]);

  const updateProfile = useCallback(async () => {
    await saveProfile();
  }, [saveProfile]);

  // Keep updateProfile ref in sync
  useEffect(() => {
    updateProfileRef.current = updateProfile;
  }, [updateProfile]);

  const addLink = useCallback(async (title: string, url: string) => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("links")
        .insert({
          title,
          url,
          profile_id: profile.id,
          position: links.length,
        })
        .select()
        .single();

      if (error) throw error;

      setLinks([...links, data]);
      
      toast.success("Link adicionado com sucesso!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao adicionar link:", errorMessage);
      toast.error(`Erro ao adicionar link: ${errorMessage}`);
    }
  }, [profile, links]);

  const updateLink = useCallback(async (linkId: string, title: string, url: string) => {
    try {
      // Validação básica
      if (!title.trim() || !url.trim()) {
        toast.error("Título e URL são obrigatórios");
        return;
      }

      const { error } = await supabase
        .from("links")
        .update({
          title: title.trim(),
          url: url.trim(),
        })
        .eq("id", linkId);

      if (error) throw error;

      // Atualizar a lista local
      setLinks(links.map(link => 
        link.id === linkId 
          ? { ...link, title: title.trim(), url: url.trim() }
          : link
      ));

      toast.success("Link atualizado com sucesso!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao atualizar link:", errorMessage);
      toast.error(`Erro ao atualizar link: ${errorMessage}`);
    }
  }, [links]);

  const deleteLink = useCallback(async (linkId: string) => {
    try {
      const { error } = await supabase.from("links").delete().eq("id", linkId);

      if (error) throw error;

      setLinks(links.filter((link) => link.id !== linkId));
      toast.success("Link removido!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao remover link:", errorMessage);
      toast.error("Erro ao remover link");
    }
  }, [links]);

  const updateTheme = useCallback(async (newTheme: ThemeData) => {
    if (!profile?.id) {
      toast.error("Perfil não encontrado");
      return;
    }

    try {
      const updatedTheme = { ...newTheme };
      
      // Verifica se o tema existe
      const { data: existingTheme } = await supabase
        .from("themes")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (existingTheme) {
        // Atualiza tema existente
        const { error } = await supabase
          .from("themes")
          .update(updatedTheme)
          .eq("profile_id", profile.id);

        if (error) throw error;
      } else {
        // Cria novo tema
        const { error } = await supabase
          .from("themes")
          .insert({
            profile_id: profile.id,
            ...updatedTheme
          });

        if (error) throw error;
      }

      setTheme({ ...theme, ...updatedTheme });
      toast.success("Tema atualizado!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao atualizar tema:", errorMessage);
      toast.error(`Erro ao atualizar tema: ${errorMessage}`);
    }
  }, [profile, theme]);

  const uploadAvatar = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      toast.success("Avatar enviado!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao enviar avatar:", errorMessage);
      toast.error("Erro ao enviar avatar");
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = links.findIndex((link) => link.id === active.id);
      const newIndex = links.findIndex((link) => link.id === over?.id);

      const newLinks = arrayMove(links, oldIndex, newIndex);
      setLinks(newLinks);

      // Atualizar posições no banco de dados
      try {
        const updates = newLinks.map((link, index) => ({
          id: link.id,
          position: index,
        }));

        for (const update of updates) {
          await supabase
            .from("links")
            .update({ position: update.position })
            .eq("id", update.id);
        }

        toast.success("Ordem dos links atualizada!");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
        console.error("Erro ao atualizar ordem:", errorMessage);
        toast.error("Erro ao atualizar ordem dos links");
        // Reverter mudanças em caso de erro
        if (profile) await loadSpecificProfile(profile);
      }
    }
  }, [links, profile, loadSpecificProfile]);

  // Memoizar lista de links para evitar re-renderizações desnecessárias
  const memoizedLinks = useMemo(() => links, [links]);

  // Memoizar IDs dos links para o SortableContext
  const linkIds = useMemo(() => links.map(link => link.id), [links]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold gradient-text mb-2 holographic">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie seus perfis e links de forma profissional
            </p>
          </div>
          <div className="flex gap-3">
            {profile && (
              <Button
                variant="outline"
                onClick={() => window.open(`/${profile.username}`, "_blank", "noopener,noreferrer")}
                className="glass-card border-border hover-lift group"
              >
                <ExternalLink className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
                Ver Perfil
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="glass-card border-border hover-lift group"
            >
              <LogOut className="h-4 w-4 mr-2 group-hover:-rotate-12 transition-transform" />
              Sair
            </Button>
          </div>
        </div>

        <ProfileSelector
          profiles={allProfiles}
          currentProfile={profile}
          onProfileSelect={loadSpecificProfile}
          onProfilesUpdate={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) await loadUserProfiles(session.user.id);
          }}
        />

        <Tabs defaultValue="profile" className="space-y-6 animate-fade-in">
          <TabsList className="grid w-full grid-cols-3 glass-card border border-border/50 p-1">
            <TabsTrigger 
              value="profile"
              className="data-[state=active]:gradient-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg"
            >
              Perfil
            </TabsTrigger>
            <TabsTrigger 
              value="links"
              className="data-[state=active]:gradient-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg"
            >
              Links
            </TabsTrigger>
            <TabsTrigger 
              value="theme"
              className="data-[state=active]:gradient-primary data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg"
            >
              Tema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 animate-fade-in">
            <Card className="p-8 glass-card border-border/50 space-y-8 hover-lift">
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-primary/50 group-hover:border-primary transition-all shadow-lg hover-glow">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold gradient-text">
                          {displayName?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 gradient-primary rounded-full p-3 cursor-pointer hover-scale shadow-lg group">
                      <Upload className="h-4 w-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-foreground">@{profile?.username}</p>
                    <p className="text-sm text-muted-foreground">
                      🔗 {window.location.origin}/{profile?.username}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="displayName" className="text-base font-medium">Nome de Exibição</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu Nome"
                    className="glass-card border-border/50 focus:border-primary transition-all h-12 text-base"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="bio" className="text-base font-medium">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte um pouco sobre você..."
                    className="glass-card border-border/50 focus:border-primary transition-all min-h-[120px] text-base resize-none"
                  />
                </div>

                <Button 
                  onClick={updateProfile} 
                  className="gradient-primary hover-lift w-full md:w-auto px-8 h-12 text-base font-medium shadow-lg"
                >
                  💾 Salvar Perfil
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-6 animate-fade-in">
            <Card className="p-6 glass-card border-border/50 hover-lift">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold gradient-text">Seus Links</h2>
                  <p className="text-sm text-muted-foreground mt-1">Arraste para reordenar</p>
                </div>
                <Suspense fallback={<Button disabled>Carregando...</Button>}>
                  <AddLinkDialog onAdd={addLink} />
                </Suspense>
              </div>
            </Card>

            <LinksList
              links={memoizedLinks}
              onDragEnd={handleDragEnd}
              onDeleteLink={deleteLink}
              onEditLink={updateLink}
              theme={theme}
              sensors={sensors}
            />
          </TabsContent>

          <TabsContent value="theme" className="animate-fade-in">
            {theme && (
              <Suspense fallback={
                <Card className="p-12 glass-card border-border/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </Card>
              }>
                <ThemeCustomizer theme={theme} onUpdate={updateTheme} />
              </Suspense>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <Suspense fallback={null}>
        <KeyboardShortcuts 
          isOpen={showShortcuts} 
          onClose={() => setShowShortcuts(false)} 
        />
      </Suspense>
    </div>
  );
};

export default Dashboard;
