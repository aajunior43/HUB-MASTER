import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, Palette, Sparkles, Zap, Star, Globe, Heart, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Array<{ id: number; left: string; delay: string; duration: string; size: string }>>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Gerar partículas flutuantes
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${15 + Math.random() * 10}s`,
      size: `${2 + Math.random() * 4}px`
    }));
    setParticles(newParticles);

    // Rastrear posição do mouse para efeito parallax
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background with Parallax */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/10 transition-transform duration-1000"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
        }}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl animate-breathing"></div>
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute bg-gradient-to-r from-primary/30 to-pink-500/30 rounded-full"
            style={{
              left: particle.left,
              width: particle.size,
              height: particle.size,
              animation: `float-up ${particle.duration} linear infinite`,
              animationDelay: particle.delay
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block mb-4 animate-scale-in">
              <span className="px-6 py-3 rounded-full glass-strong text-sm font-semibold flex items-center gap-2 mx-auto w-fit border-2 border-white/10 shadow-lg">
                <Sparkles className="w-4 h-4 animate-pulse-glow" />
                A melhor plataforma de links do Brasil
                <Star className="w-4 h-4 animate-pulse-glow" />
              </span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-extrabold gradient-text-holographic leading-tight">
              Todos os seus links
              <br />
              <span className="text-4xl md:text-6xl">em um só lugar</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Crie múltiplos perfis de links personalizáveis e profissionais em segundos. 
              Personalize com temas espetaculares e conquiste seu público.
            </p>

            <div className="flex items-center justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">Rápido</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-sm">Global</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Heart className="w-5 h-5 text-pink-400" />
                <span className="text-sm">Amado por milhares</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-8 animate-fade-in">
            <Button 
              onClick={() => navigate("/auth")} 
              size="lg"
              className="relative overflow-hidden group gradient-primary hover:opacity-90 text-lg px-10 py-7 hover-lift shadow-2xl border-2 border-white/20"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Começar Agora Grátis
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.open("/exemplo", "_blank")}
              className="border-border text-lg px-10 py-7 glass hover:scale-105 transition-all duration-300 border-2 border-white/20 hover:border-white/40"
            >
              Ver Demonstração
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4 animate-fade-in">
            <h2 className="text-4xl md:text-6xl font-bold gradient-text">
              Recursos Incríveis
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para criar uma presença online profissional
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-10 glass hover-lift border-border/50 group transition-all duration-300 rounded-3xl hover:border-primary/50">
              <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Link className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 gradient-text">Múltiplos Perfis</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Crie várias árvores de links diferentes para propósitos distintos. Trabalho, pessoal, projetos.
              </p>
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <span>Perfis Ilimitados</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>

            <Card className="p-10 glass hover-lift border-border/50 group transition-all duration-300 rounded-3xl hover:border-purple-400/50">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Palette className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Personalização Total</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Escolha entre dezenas de gradientes, cores, fontes, estilos de botões e efeitos visuais incríveis.
              </p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold">
                <span>50+ Temas</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>

            <Card className="p-10 glass hover-lift border-border/50 group transition-all duration-300 rounded-3xl hover:border-pink-400/50">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles className="h-8 w-8 text-white animate-pulse-glow" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-red-400">Design Moderno</h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Interface elegante com efeitos glassmorfismo, animações suaves e design responsivo impecável.
              </p>
              <div className="flex items-center gap-2 text-pink-400 text-sm font-semibold">
                <span>15+ Animações</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 glass-strong border-border/50 rounded-3xl animate-fade-in border-2">
            <div className="flex flex-col md:flex-row items-center justify-around gap-8">
              <div className="text-center group">
                <div className="text-5xl md:text-6xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">10K+</div>
                <div className="text-muted-foreground font-medium">Usuários Ativos</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl md:text-6xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">50K+</div>
                <div className="text-muted-foreground font-medium">Links Criados</div>
              </div>
              <div className="text-center group">
                <div className="text-5xl md:text-6xl font-bold gradient-text mb-2 group-hover:scale-110 transition-transform">99.9%</div>
                <div className="text-muted-foreground font-medium">Uptime</div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="p-16 glass-strong border-border/50 hover-lift relative overflow-hidden rounded-3xl border-2">
            <div className="absolute inset-0 bg-gradient-primary opacity-5"></div>
            <div className="relative z-10 space-y-6 animate-fade-in">
              <h2 className="text-4xl md:text-6xl font-bold gradient-text-holographic mb-4">
                Pronto para começar?
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Crie múltiplos perfis de links personalizados em menos de 2 minutos!
              </p>
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg"
                className="gradient-primary hover:opacity-90 text-xl px-12 py-8 hover-lift shadow-glow group"
              >
                <Sparkles className="h-6 w-6 mr-2" />
                Criar Meus Perfis Agora
                <ArrowRight className="h-6 w-6 ml-2 group-hover:translate-x-2 transition-transform" />
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-muted-foreground border-t border-border/30 relative z-10">
        <p className="font-medium">© 2025 LinkHub. Crie quantos perfis de links você precisar.</p>
      </footer>
    </div>
  );
};

export default Index;
