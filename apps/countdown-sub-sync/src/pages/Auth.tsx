import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Erro de login',
            description: 'Email ou senha incorretos.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      toast({
        title: 'Sucesso!',
        description: 'Login realizado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Conta já existe',
            description: 'Este email já está cadastrado. Tente fazer login.',
            variant: 'destructive',
          });
        } else if (error.message.includes('Password should be at least')) {
          toast({
            title: 'Senha muito fraca',
            description: 'A senha deve ter pelo menos 6 caracteres.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro',
            description: error.message,
            variant: 'destructive',
          });
        }
        return;
      }

      toast({
        title: 'Cadastro realizado!',
        description: 'Verifique seu email para confirmar a conta.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Starfield Background */}
      <div className="absolute inset-0">
        {/* Stars */}
        {Array.from({ length: 200 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.8 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s infinite alternate`
            }}
          />
        ))}
        
        {/* Meteors */}
         {Array.from({ length: 1 }).map((_, i) => {
           const directions = [
             { movementAngle: 225, tailAngle: 45 },   // Movimento: ↙️ (225°) → Cauda: ↗️ (45°)
             { movementAngle: 315, tailAngle: 135 },  // Movimento: ↖️ (315°) → Cauda: ↘️ (135°)
             { movementAngle: 135, tailAngle: 315 },  // Movimento: ↘️ (135°) → Cauda: ↖️ (315°)
             { movementAngle: 45, tailAngle: 225 }    // Movimento: ↗️ (45°) → Cauda: ↙️ (225°)
           ];
           const direction = directions[Math.floor(Math.random() * directions.length)];
           const tailAngle = direction.tailAngle + (Math.random() - 0.5) * 10; // Pequena variação
           
           return (
             <div
               key={`meteor-${i}`}
               className="absolute"
               style={{
                 width: '100px',
                 height: '1px',
                 background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.2) 70%, rgba(255,255,255,0.4) 90%, rgba(255,255,255,0.6) 100%)',
                 borderRadius: '0.5px',
                 boxShadow: '0 0 4px 0.5px rgba(255,255,255,0.2), 0 0 8px 1px rgba(255,255,255,0.05)',
                 animation: `meteor-0 ${Math.random() * 20 + 30}s linear infinite`,
                 animationDelay: `${Math.random() * 25}s`,
                 transform: `rotate(${tailAngle}deg)`,
                 filter: 'blur(0.2px)'
               }}
             />
           );
         })}
      </div>
      
      {/* X-style Login Container */}
      <div className="relative w-full max-w-md bg-black/80 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Entrar no Sistema
            </h1>
            <p className="text-gray-400 text-sm">Gerencie suas assinaturas</p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex mb-6 bg-gray-900/50 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('signin')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'signin' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'signup' 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>
          
          <div className="w-full">
            {activeTab === 'signin' && (
               <div>
                <form onSubmit={handleSignIn} className="space-y-6">
                 <div className="space-y-4">
                   <div>
                     <input
                       type="email"
                       placeholder="Email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       required
                       className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                     />
                   </div>
                   <div className="relative">
                     <input
                       type={showPassword ? 'text' : 'password'}
                       placeholder="Senha"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       required
                       className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all pr-12"
                     />
                     <button
                       type="button"
                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                       onClick={() => setShowPassword(!showPassword)}
                     >
                       {showPassword ? (
                         <EyeOff className="h-5 w-5" />
                       ) : (
                         <Eye className="h-5 w-5" />
                       )}
                     </button>
                   </div>
                 </div>
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   {loading ? 'Entrando...' : 'Entrar'}
                 </button>
               </form>
               </div>
             )}
            
            {activeTab === 'signup' && (
               <div>
               <form onSubmit={handleSignUp} className="space-y-6">
                 <div className="space-y-4">
                   <div>
                     <input
                       type="email"
                       placeholder="Email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       required
                       className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                     />
                   </div>
                   <div className="relative">
                     <input
                       type={showPassword ? 'text' : 'password'}
                       placeholder="Senha (mínimo 6 caracteres)"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       required
                       minLength={6}
                       className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all pr-12"
                     />
                     <button
                       type="button"
                       className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                       onClick={() => setShowPassword(!showPassword)}
                     >
                       {showPassword ? (
                         <EyeOff className="h-5 w-5" />
                       ) : (
                         <Eye className="h-5 w-5" />
                       )}
                     </button>
                   </div>
                 </div>
                 <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                 >
                   {loading ? 'Criando conta...' : 'Criar conta'}
                 </button>
               </form>
               </div>
             )}
          </div>
          
        </div>
      </div>
      
      {/* CSS Animations */}
       <style>{`
         @keyframes twinkle {
           0% { opacity: 0.2; transform: scale(1); }
           50% { opacity: 1; transform: scale(1.2); }
           100% { opacity: 0.2; transform: scale(1); }
         }
         
         @keyframes meteor-0 {
           0% {
             transform: translateX(-20vw) translateY(-20vh);
             opacity: 0;
           }
           3% {
             opacity: 0.6;
           }
           97% {
             opacity: 0.6;
           }
           100% {
             transform: translateX(120vw) translateY(120vh);
             opacity: 0;
           }
         }
       `}</style>
    </div>
  );
};

export default Auth;