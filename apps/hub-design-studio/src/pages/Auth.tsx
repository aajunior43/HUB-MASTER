import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { Card } from "@/components/ui/card";

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/10"></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/3 left-1/3 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl animate-breathing"></div>
      </div>

      <Card className="w-full max-w-md p-8 glass-strong border-border/50 hover-lift relative z-10 shadow-glow">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-4xl font-bold gradient-text-holographic mb-2">LinkHub</h1>
          <p className="text-lg text-muted-foreground">Entre ou crie sua conta grátis</p>
        </div>
        <AuthForm onSuccess={() => navigate("/dashboard")} />
      </Card>
    </div>
  );
};

export default Auth;
