import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { GlowCard } from '@/components/ui/spotlight-card';
import { Eye, EyeOff, Link2, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateLoginForm = () => {
    const e: Record<string, string> = {};
    if (!loginEmail) e.loginEmail = 'Email é obrigatório';
    else if (!validateEmail(loginEmail)) e.loginEmail = 'Email inválido';
    if (!loginPassword) e.loginPassword = 'Senha é obrigatória';
    else if (loginPassword.length < 6) e.loginPassword = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateSignupForm = () => {
    const e: Record<string, string> = {};
    if (!signupFullName) e.signupFullName = 'Nome é obrigatório';
    else if (signupFullName.length < 2) e.signupFullName = 'Mínimo 2 caracteres';
    if (!signupEmail) e.signupEmail = 'Email é obrigatório';
    else if (!validateEmail(signupEmail)) e.signupEmail = 'Email inválido';
    if (!signupPassword) e.signupPassword = 'Senha é obrigatória';
    else if (signupPassword.length < 6) e.signupPassword = 'Mínimo 6 caracteres';
    if (!signupConfirmPassword) e.signupConfirmPassword = 'Confirme a senha';
    else if (signupPassword !== signupConfirmPassword) e.signupConfirmPassword = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) return;
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (!error) navigate('/');
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupForm()) return;
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupFullName);
    if (!error) {
      setIsLogin(true);
      setSignupFullName(''); setSignupEmail(''); setSignupPassword(''); setSignupConfirmPassword('');
    }
    setLoading(false);
  };

  const switchMode = (toLogin: boolean) => {
    if (isLogin === toLogin) return;
    setLoginEmail(''); setLoginPassword('');
    setSignupFullName(''); setSignupEmail(''); setSignupPassword(''); setSignupConfirmPassword('');
    setErrors({});
    setIsLogin(toLogin);
  };

  const inputBase =
    'w-full h-12 pl-11 pr-4 bg-background text-sm font-medium text-foreground placeholder:text-muted-foreground/70 outline-none neo-inset focus:ring-2 focus:ring-primary/50 transition-all';
  const iconClass =
    'absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none';
  const labelClass =
    'block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2 font-mono';
  const errorClass =
    'flex items-center gap-1.5 text-destructive text-[11px] font-medium mt-2';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" aria-hidden />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" aria-hidden />

      <div className="w-full max-w-[420px] relative pop-in">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl neo-accent flex items-center justify-center mb-4">
            <Link2 className="w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            JR Links
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide">
            {isLogin ? 'Acesse sua biblioteca' : 'Crie sua conta'}
          </p>
        </div>

        {/* Card neomórfico */}
        <GlowCard customSize glowColor="gold" className="p-2">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl neo-inset mb-6">
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all font-mono ${
                isLogin
                  ? 'neo-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all font-mono ${
                !isLogin
                  ? 'neo-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Form */}
          <div className="px-5 pb-5">
            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={labelClass} htmlFor="loginEmail">Email</label>
                  <div className="group relative">
                    <Mail className={iconClass} strokeWidth={2.25} />
                    <input
                      id="loginEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  {errors.loginEmail && (
                    <p className={errorClass}><AlertCircle className="w-3 h-3" /> {errors.loginEmail}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass} htmlFor="loginPassword">Senha</label>
                  <div className="group relative">
                    <Lock className={iconClass} strokeWidth={2.25} />
                    <input
                      id="loginPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`${inputBase} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.loginPassword && (
                    <p className={errorClass}><AlertCircle className="w-3 h-3" /> {errors.loginPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl neo-accent font-mono text-sm font-bold uppercase tracking-widest neo-press disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando</> : '→ Acessar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className={labelClass} htmlFor="signupFullName">Nome</label>
                  <div className="group relative">
                    <User className={iconClass} strokeWidth={2.25} />
                    <input
                      id="signupFullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  {errors.signupFullName && (
                    <p className={errorClass}><AlertCircle className="w-3 h-3" /> {errors.signupFullName}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass} htmlFor="signupEmail">Email</label>
                  <div className="group relative">
                    <Mail className={iconClass} strokeWidth={2.25} />
                    <input
                      id="signupEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  {errors.signupEmail && (
                    <p className={errorClass}><AlertCircle className="w-3 h-3" /> {errors.signupEmail}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass} htmlFor="signupPassword">Senha</label>
                  <div className="group relative">
                    <Lock className={iconClass} strokeWidth={2.25} />
                    <input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={`${inputBase} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.signupPassword && (
                    <p className={errorClass}><AlertCircle className="w-3 h-3" /> {errors.signupPassword}</p>
                  )}
                </div>

                <div>
                  <label className={labelClass} htmlFor="signupConfirmPassword">Confirmar</label>
                  <div className="group relative">
                    <Lock className={iconClass} strokeWidth={2.25} />
                    <input
                      id="signupConfirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repita a senha"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  {errors.signupConfirmPassword && (
                    <p className={errorClass}><AlertCircle className="w-3 h-3" /> {errors.signupConfirmPassword}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl neo-accent font-mono text-sm font-bold uppercase tracking-widest neo-press disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando</> : '→ Criar Conta'}
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-xs text-muted-foreground">
              {isLogin ? 'Sem conta?' : 'Já tem conta?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(!isLogin)}
                className="text-primary font-semibold hover:underline underline-offset-4"
              >
                {isLogin ? 'Criar agora' : 'Entrar'}
              </button>
            </p>
          </div>
        </GlowCard>

        <p className="mt-6 text-center text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/60">
          © {new Date().getFullYear()} · meus_links
        </p>
      </div>
    </div>
  );
};

export default Auth;
