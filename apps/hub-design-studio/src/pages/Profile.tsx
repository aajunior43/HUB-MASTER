import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LinkItem } from "@/components/LinkItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeData } from "@/types/theme";
import { Sparkles, ArrowRight } from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
}

interface LinkData {
  id: string;
  title: string;
  url: string;
  position: number;
  is_active: boolean;
}

const Profile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [links, setLinks] = useState<LinkData[]>([]);
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData);

      const { data: linksData } = await supabase
        .from("links")
        .select("*")
        .eq("profile_id", profileData.id)
        .eq("is_active", true)
        .order("position");

      setLinks(linksData || []);

      const { data: themeData } = await supabase
        .from("themes")
        .select("*")
        .eq("profile_id", profileData.id)
        .single();

      setTheme(themeData);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/10">
        <div className="text-center glass-card p-12 rounded-3xl border-2 border-border/50 animate-fade-in">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <h1 className="text-4xl font-bold mb-2 text-foreground">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-6">Este usuário não existe.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground hover-lift transition-all duration-300 font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            Criar meu LinkHub
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const buttonStyle = useMemo((): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      background: theme?.button_color || "rgba(255, 255, 255, 0.1)",
      color: theme?.text_color || "#ffffff",
      fontFamily: theme?.font_family || "inherit",
      backdropFilter: "blur(10px)",
    };

    // Border radius
    if (theme?.border_radius !== undefined) {
      baseStyle.borderRadius = `${theme.border_radius}px`;
    } else {
      const buttonRadius =
        theme?.button_style === "pill"
          ? "9999px"
          : theme?.button_style === "square"
          ? "0px"
          : "12px";
      baseStyle.borderRadius = buttonRadius;
    }

    // Border
    if (theme?.button_border) {
      baseStyle.border = theme.button_border === "none" 
        ? "none" 
        : `2px ${theme.button_border} ${theme?.button_color || "rgba(255, 255, 255, 0.2)"}`;
    } else {
      baseStyle.border = "1px solid rgba(255, 255, 255, 0.2)";
    }

    // Shadow
    if (theme?.button_shadow) {
      baseStyle.boxShadow = theme.button_shadow === "none" 
        ? "none"
        : theme.button_shadow === "soft"
        ? "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        : theme.button_shadow === "medium"
        ? "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        : "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    }

    return baseStyle;
  }, [theme]);

  const getAnimationClass = useCallback(() => {
    if (!theme?.animation_style || theme.animation_style === "none") return "";
    
    const animationMap: Record<string, string> = {
      "hover-scale": "hover-scale",
      "hover-glow": "hover-glow",
      "hover-bounce": "hover-bounce",
      "hover-lift": "hover-lift",
      "hover-rotate": "hover-rotate",
      "hover-slide": "hover-slide",
      "gradient-shift": "gradient-shift",
      "shimmer": "animate-shimmer",
      "breathing": "animate-breathing",
      "magnetic": "animate-magnetic",
      "pulse": "animate-pulse-glow",
      "float": "animate-float",
      "rotate-subtle": "animate-rotate-subtle",
      "slide-in": "animate-slide-in",
      "bounce": "hover:animate-bounce",
      "wiggle": "hover:animate-wiggle"
    };
    
    return animationMap[theme.animation_style] || "";
  }, [theme?.animation_style]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: theme?.background_value || "var(--gradient-primary)",
      }}
    >
      {/* Efeito de brilho no fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_60%)] pointer-events-none" />
      
      <div className="w-full max-w-2xl py-12 relative z-10">
        <div 
          className="text-center mb-12 animate-fade-in" 
          style={{ 
            color: theme?.text_color,
            fontFamily: theme?.font_family || "inherit"
          }}
        >
          <Avatar className="w-32 h-32 mx-auto mb-6 border-4 shadow-2xl hover-lift transition-all duration-300 ring-4 ring-white/20" style={{ borderColor: theme?.button_color }}>
            <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-purple-500/20">
              {profile.display_name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 drop-shadow-lg animate-scale-in">
            {profile.display_name || profile.username}
          </h1>

          {profile.bio && (
            <p className="text-lg md:text-xl opacity-95 max-w-md mx-auto leading-relaxed font-light animate-fade-in">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="space-y-5 px-4">
          {links.map((link, index) => (
            <div
              key={link.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] ${getAnimationClass()} shadow-lg hover:shadow-2xl animate-fade-in`}
              onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
              style={{
                ...buttonStyle,
                animationDelay: `${index * 0.1}s`
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  window.open(link.url, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <div className="p-5 text-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <h3 className="font-bold text-lg md:text-xl relative z-10">
                  {link.title}
                </h3>
              </div>
            </div>
          ))}

          {links.length === 0 && (
            <div className="text-center py-20 glass-card rounded-3xl border-2 border-white/20 animate-fade-in" style={{ color: theme?.text_color }}>
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50 animate-pulse-glow" />
              <p className="text-xl opacity-75 font-light">Nenhum link disponível ainda.</p>
              <p className="text-sm opacity-60 mt-2">Em breve novidades por aqui!</p>
            </div>
          )}
        </div>

        <div className="text-center mt-16 animate-fade-in">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-strong hover-lift transition-all duration-300 font-semibold border-2 border-white/20"
            style={{ color: theme?.text_color }}
          >
            <Sparkles className="w-4 h-4" />
            Crie seu próprio LinkHub
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Profile;
