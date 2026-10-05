import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Star, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CreateProfileDialog } from "./CreateProfileDialog";
import { DeleteProfileDialog } from "./DeleteProfileDialog";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileSelectorProps {
  profiles: Profile[];
  currentProfile: Profile | null;
  onProfileSelect: (profile: Profile) => void;
  onProfilesUpdate: () => void;
}

export function ProfileSelector({ 
  profiles, 
  currentProfile, 
  onProfileSelect, 
  onProfilesUpdate 
}: ProfileSelectorProps) {
  if (!currentProfile || profiles.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 glass hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <User className="h-5 w-5" />
            Meus Perfis
          </CardTitle>
          <CreateProfileDialog 
            userId={currentProfile.user_id} 
            onProfileCreated={onProfilesUpdate}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Perfil atual */}
        <div className="p-4 rounded-lg bg-secondary/50 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentProfile.avatar_url ? (
                <img 
                  src={currentProfile.avatar_url} 
                  alt={currentProfile.display_name || currentProfile.username}
                  className="w-12 h-12 rounded-full border-2 border-primary"
                />
              ) : (
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-lg">
                    {currentProfile.display_name || currentProfile.username}
                  </p>
                  {currentProfile.is_default && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      <Star className="h-3 w-3 mr-1" />
                      Padrão
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{currentProfile.username}</p>
              </div>
            </div>
            
            {profiles.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hover-scale">
                    Trocar
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 glass-strong">
                  <DropdownMenuLabel>Selecionar Perfil</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {profiles.map((profile) => (
                    <DropdownMenuItem
                      key={profile.id}
                      onClick={() => onProfileSelect(profile)}
                      className="cursor-pointer"
                      disabled={profile.id === currentProfile.id}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {profile.display_name || profile.username}
                            </p>
                            {profile.is_default && (
                              <Star className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            @{profile.username}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Lista de todos os perfis */}
        {profiles.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Todos os Perfis ({profiles.length})
            </p>
            <div className="grid gap-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-3 rounded-lg border transition-all ${
                    profile.id === currentProfile.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {profile.display_name || profile.username}
                          </p>
                          {profile.is_default && (
                            <Star className="h-3 w-3 text-primary fill-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{profile.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {profile.id !== currentProfile.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onProfileSelect(profile)}
                          className="hover-scale"
                        >
                          Selecionar
                        </Button>
                      )}
                      <DeleteProfileDialog
                        profileId={profile.id}
                        profileName={profile.display_name || profile.username}
                        isDefault={profile.is_default || false}
                        onProfileDeleted={onProfilesUpdate}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}