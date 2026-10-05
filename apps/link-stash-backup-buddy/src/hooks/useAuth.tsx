import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // O listener já dispara INITIAL_SESSION, então basta um único ponto de verdade.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        title: 'ERRO DE LOGIN',
        description:
          error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos.'
            : error.message,
        variant: 'destructive',
      });
      return { error };
    }
    toast({ title: 'LOGIN REALIZADO!', description: 'Bem-vindo de volta.' });
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName ?? '' },
      },
    });
    if (error) {
      const already =
        error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('registered');
      toast({
        title: already ? 'EMAIL JÁ CADASTRADO' : 'ERRO NO CADASTRO',
        description: already
          ? 'Este email já possui uma conta. Faça login.'
          : error.message,
        variant: 'destructive',
      });
      return { error };
    }
    toast({ title: 'CONTA CRIADA!', description: 'Verifique seu email para confirmar.' });
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    if (error) {
      toast({ title: 'ERRO AO SAIR', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'LOGOUT REALIZADO', description: 'Até logo!' });
    }
  };


  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
